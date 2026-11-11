import Hls from 'hls.js';
import { ScreenBounceColor } from './screenRenderer';
import { getApiUrl } from '../services/apiConfig';

export type StreamPlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export class HlsScreenPlayer {
  public video: HTMLVideoElement;
  private hls: Hls | null = null;
  public status: StreamPlaybackStatus = 'idle';
  public errorMessage: string = '';
  public currentUrl: string = '';
  public preferredMuted: boolean = false;
  private candidates: string[] = [];
  private candidateIndex: number = 0;
  private watchdogTimer: number | null = null;
  private lastBounceColor: ScreenBounceColor = { r: 0.45, g: 0.48, b: 0.55 };
  private sampleCanvas: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D;
  private onStatusChange?: (status: StreamPlaybackStatus, msg?: string) => void;
  private onMuteChange?: (isMuted: boolean) => void;
  private gestureUnlockHandler: () => void;

  constructor(
    onStatusChange?: (status: StreamPlaybackStatus, msg?: string) => void,
    onMuteChange?: (isMuted: boolean) => void
  ) {
    this.onStatusChange = onStatusChange;
    this.onMuteChange = onMuteChange;

    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.playsInline = true;
    v.loop = true;
    v.muted = false;
    v.volume = 0.85;
    v.preload = 'auto';
    this.video = v;

    // Tiny 8x4 canvas to sample average RGB color from the real video frame for 3D theater bounce light
    this.sampleCanvas = document.createElement('canvas');
    this.sampleCanvas.width = 8;
    this.sampleCanvas.height = 4;
    this.sampleCtx = this.sampleCanvas.getContext('2d', { willReadFrequently: true })!;

    this.video.addEventListener('playing', () => {
      this.clearWatchdog();
      this.setStatus('playing');
      this.notifyMuteState(this.video.muted);
    });
    this.video.addEventListener('pause', () => {
      if (this.status === 'playing') {
        this.setStatus('paused');
      }
    });
    this.video.addEventListener('waiting', () => {
      if (this.status !== 'error') {
        this.setStatus('loading');
      }
    });

    // Synchronously unlock audio on the HTMLVideoElement during any native user pointer/key gesture
    // so subsequent async HLS manifest switches play audio immediately without browser autoplay blocks.
    this.gestureUnlockHandler = () => {
      if (!this.preferredMuted && this.video.muted) {
        this.video.muted = false;
        this.video.volume = 0.85;
        this.notifyMuteState(false);
        if (this.video.paused && this.status !== 'paused') {
          this.video.play().catch(() => {});
        }
      }
    };
    window.addEventListener('pointerdown', this.gestureUnlockHandler, { capture: true });
    window.addEventListener('keydown', this.gestureUnlockHandler, { capture: true });
  }

  private clearWatchdog() {
    if (this.watchdogTimer !== null) {
      window.clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private setStatus(s: StreamPlaybackStatus, msg: string = '') {
    this.status = s;
    this.errorMessage = msg;
    if (this.onStatusChange) {
      this.onStatusChange(s, msg);
    }
  }

  private notifyMuteState(muted: boolean) {
    if (this.onMuteChange) {
      this.onMuteChange(muted);
    }
  }

  /**
   * Loads a primary M3U8 URL along with optional backup URLs.
   * Uses our backend /api/hls-proxy so http:// IPTV streams, sub-playlists, and .ts segments
   * play without Mixed-Content or CORS blocks, and auto-switches to backup lines on timeout.
   */
  public loadStream(url: string, backupUrls: string[] = []) {
    if (!url) return;

    const allUrls = [url, ...backupUrls].filter(Boolean);
    const expandedCandidates: string[] = [];

    for (const raw of allUrls) {
      if (raw.startsWith('/api/hls-proxy')) {
        expandedCandidates.push(getApiUrl(raw));
      } else if (raw.includes('/api/hls-proxy')) {
        expandedCandidates.push(raw);
      } else {
        expandedCandidates.push(getApiUrl(`/api/hls-proxy?url=${encodeURIComponent(raw)}`));
        if (raw.startsWith('https://')) {
          expandedCandidates.push(raw);
        }
      }
    }

    this.candidates = expandedCandidates;
    this.candidateIndex = 0;
    this.loadCandidateAt(0);
  }

  private tryNextCandidate() {
    this.clearWatchdog();
    if (this.candidateIndex + 1 < this.candidates.length) {
      this.candidateIndex += 1;
      this.loadCandidateAt(this.candidateIndex);
    } else {
      this.setStatus('error', '当前频道所有备线均响应超时，请切换其他片源');
    }
  }

  private loadCandidateAt(index: number) {
    const finalUrl = this.candidates[index];
    if (!finalUrl) return;

    this.currentUrl = finalUrl;
    this.setStatus('loading');
    this.clearWatchdog();

    // Watchdog: if stream hasn't started playing within 8.5s, auto-switch to next backup line
    this.watchdogTimer = window.setTimeout(() => {
      if (this.status !== 'playing' && this.video.readyState < 2) {
        this.tryNextCandidate();
      }
    }, 8500);

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();

    // Restore user's desired mute preference before loading the new stream
    this.video.muted = this.preferredMuted;
    this.video.volume = 0.85;

    // Direct MP4 / WebM stream support
    if (/\.(mp4|webm)(\?.*)?$/i.test(finalUrl)) {
      this.video.src = finalUrl;
      this.safePlay();
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        manifestLoadingTimeOut: 7500,
        manifestLoadingMaxRetry: 1,
        levelLoadingTimeOut: 7500,
        fragLoadingTimeOut: 9000,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });
      this.hls = hls;

      hls.loadSource(finalUrl);
      hls.attachMedia(this.video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (this.video.duration && isFinite(this.video.duration) && this.video.duration > 60) {
          this.video.currentTime = 12;
        }
        this.safePlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.tryNextCandidate();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              this.tryNextCandidate();
              break;
          }
        }
      });
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = finalUrl;
      this.video.addEventListener(
        'loadedmetadata',
        () => {
          this.safePlay();
        },
        { once: true }
      );
      this.video.addEventListener(
        'error',
        () => {
          this.tryNextCandidate();
        },
        { once: true }
      );
    } else {
      this.setStatus('error', '当前浏览器不支持 HLS 流媒体');
    }
  }

  /**
   * Attempts to play with the user's preferred audio state (`preferredMuted`).
   * If the browser blocks unmuted autoplay prior to user interaction,
   * it falls back to muted playback until the user clicks anywhere or toggles the volume icon.
   */
  public safePlay() {
    this.video.muted = this.preferredMuted;
    const playPromise = this.video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.notifyMuteState(this.video.muted);
        })
        .catch(() => {
          this.video.muted = true;
          this.notifyMuteState(true);
          this.video.play().catch(() => {
            this.setStatus('paused');
          });
        });
    }
  }

  public togglePlay(): boolean {
    if (this.video.paused) {
      this.safePlay();
      return true;
    } else {
      this.video.pause();
      return false;
    }
  }

  public setMuted(muted: boolean) {
    this.preferredMuted = muted;
    this.video.muted = muted;
    if (!muted) {
      this.video.volume = 0.85;
      if (this.video.paused && this.status !== 'idle') {
        this.video.play().catch(() => {});
      }
    }
    this.notifyMuteState(this.video.muted);
  }

  public seek(seconds: number) {
    if (isFinite(this.video.duration) && this.video.duration > 0) {
      this.video.currentTime = Math.max(0, Math.min(this.video.duration, seconds));
    }
  }

  /**
   * Renders the current <video> frame onto the 3D screen's 2D canvas and extracts
   * the real-time average RGB bounce color to illuminate the dark cinema auditorium.
   */
  public drawToScreenCanvas(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): ScreenBounceColor | null {
    if (
      this.video.readyState < 2 ||
      this.video.videoWidth === 0 ||
      this.status === 'error'
    ) {
      return null;
    }

    try {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      const vw = this.video.videoWidth;
      const vh = this.video.videoHeight;
      const videoAspect = vw / vh;
      const canvasAspect = width / height;

      let drawW = width;
      let drawH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspect > canvasAspect) {
        drawW = width;
        drawH = width / videoAspect;
        offsetY = (height - drawH) * 0.5;
      } else {
        drawW = height * videoAspect;
        drawH = height;
        offsetX = (width - drawW) * 0.5;
      }

      ctx.drawImage(this.video, offsetX, offsetY, drawW, drawH);
    } catch {
      return null;
    }

    // Separate try/catch for pixel sampling so a CORS-tainted fallback stream NEVER overwrites the drawn video frame!
    try {
      this.sampleCtx.drawImage(this.video, 0, 0, 8, 4);
      const data = this.sampleCtx.getImageData(0, 0, 8, 4).data;
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      const pixels = 32;
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i + 1];
        bSum += data[i + 2];
      }

      this.lastBounceColor = {
        r: Math.min(1, (rSum / (pixels * 255)) * 1.35 + 0.04),
        g: Math.min(1, (gSum / (pixels * 255)) * 1.35 + 0.04),
        b: Math.min(1, (bSum / (pixels * 255)) * 1.35 + 0.04),
      };
    } catch {
      // Keep lastBounceColor if pixel read is restricted
    }

    return this.lastBounceColor;
  }

  public dispose() {
    window.removeEventListener('pointerdown', this.gestureUnlockHandler, { capture: true });
    window.removeEventListener('keydown', this.gestureUnlockHandler, { capture: true });
    this.clearWatchdog();
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
  }
}
