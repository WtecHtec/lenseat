import { MovieInfo } from '../types/cinema';

export interface ScreenBounceColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Renders a clean, uniform widescreen cinema projection backdrop onto the 2D canvas
 * while an M3U8 stream is buffering, with zero circular/semi-circular cutout masks.
 */
export function renderMovieFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsed: number,
  _movie: MovieInfo,
  isPlaying: boolean
): ScreenBounceColor {
  const t = isPlaying ? elapsed : 2.0;

  ctx.save();

  // Smooth, full-bleed widescreen cinema gradient (no circular or semi-circular masks)
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, '#07090E');
  bgGrad.addColorStop(0.5, '#111622');
  bgGrad.addColorStop(1, '#080A0F');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle horizontal anamorphic light sweep across the widescreen canvas
  const sweepX = ((Math.sin(t * 0.65) + 1) * 0.5) * width;
  const sweepGrad = ctx.createLinearGradient(sweepX - 360, 0, sweepX + 360, 0);
  sweepGrad.addColorStop(0, 'rgba(200, 125, 70, 0)');
  sweepGrad.addColorStop(0.5, 'rgba(200, 125, 70, 0.14)');
  sweepGrad.addColorStop(1, 'rgba(200, 125, 70, 0)');
  ctx.fillStyle = sweepGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural framing border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 32, width - 72, height - 64);

  // Minimalist Center Typography while HLS stream buffers
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(226, 155, 102, 0.75)';
  ctx.font = '500 15px "JetBrains Mono", monospace';
  ctx.fillText('AETHER LASER PROJECTION · 2.35:1 SCOPE', width * 0.5, height * 0.46);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.font = '600 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('正在连接高清 M3U8 院线流媒体...', width * 0.5, height * 0.54);

  ctx.restore();

  return { r: 0.42, g: 0.36, b: 0.30 };
}
