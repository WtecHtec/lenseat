import React from 'react';
import { ArrowLeft, Film, Pause, Play, Stamp, Volume2, VolumeX } from 'lucide-react';
import { SeatData, StreamResource, ViewMode } from '../types/cinema';
import { StreamPlaybackStatus } from '../utils/hlsScreenPlayer';

interface ImmersiveHudDockProps {
  activeSeat: SeatData;
  activeStream: StreamResource;
  streamStatus: StreamPlaybackStatus;
  isMuted: boolean;
  isPaused: boolean;
  viewMode: ViewMode;
  onReturnToPlanar: () => void;
  onOpenStreamModal: () => void;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onOpenStampModal: () => void;
}

export const ImmersiveHudDock: React.FC<ImmersiveHudDockProps> = ({
  activeSeat,
  activeStream,
  streamStatus,
  isMuted,
  isPaused,
  viewMode,
  onReturnToPlanar,
  onOpenStreamModal,
  onToggleMute,
  onTogglePause,
  onOpenStampModal,
}) => {
  const isImmersiveVisible =
    viewMode === 'immersive-3d' || viewMode === 'transitioning-to-3d';

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-20 transition-all duration-500 ${
        isImmersiveVisible
          ? 'opacity-45 hover:opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-8 pointer-events-none'
      }`}
    >
      {/* Low-luminance minimalist floating capsule so the bright cinema screen stays dominant */}
      <div className="flex items-center gap-4 px-5 py-2 rounded-full bg-[#050608]/90 border border-white/10 shadow-2xl">
        {/* Back to 2D Seat Map */}
        <button
          onClick={onReturnToPlanar}
          className="flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>选座</span>
        </button>

        <span className="h-3 w-[1px] bg-white/10" aria-hidden="true" />

        {/* Current Seat Coordinate */}
        <span className="font-mono text-xs font-medium text-neutral-300 tabular-nums whitespace-nowrap shrink-0">
          {activeSeat.rowLabel}排{String(activeSeat.seatNumber).padStart(2, '0')}座
        </span>

        <span className="h-3 w-[1px] bg-white/10" aria-hidden="true" />

        {/* M3U8 Playback & Source Controls (Pure Icon-Only for Play & Volume) */}
        <div className="flex items-center gap-2">
          <button
            onClick={onTogglePause}
            title={isPaused ? '播放影片' : '暂停影片'}
            aria-label={isPaused ? '播放影片' : '暂停影片'}
            className="p-1.5 rounded-full text-neutral-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {isPaused ? (
              <Play className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onToggleMute}
            title={isMuted ? '开启声音' : '静音'}
            aria-label={isMuted ? '开启声音' : '静音'}
            className={`p-1.5 rounded-full transition-colors cursor-pointer ${
              isMuted
                ? 'text-neutral-500 hover:text-white hover:bg-white/10'
                : 'text-[#E29B66] hover:bg-white/10'
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onOpenStreamModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/12 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0 max-w-[180px]"
          >
            <Film className="w-3 h-3 text-[#C87D46] shrink-0" />
            <span className="truncate">{activeStream.title.split('·')[0]}</span>
            {streamStatus === 'loading' && (
              <span className="text-[10px] text-neutral-500 shrink-0">加载中</span>
            )}
          </button>
        </div>

        <span className="h-3 w-[1px] bg-white/10" aria-hidden="true" />

        {/* Minimalist Icon-Only Commemorative Stamp Trigger */}
        <button
          onClick={onOpenStampModal}
          title="打卡集邮"
          aria-label="打卡集邮"
          className="w-7 h-7 rounded-full bg-[#C87D46]/90 hover:bg-[#C87D46] text-neutral-950 flex items-center justify-center transition-colors cursor-pointer shrink-0"
        >
          <Stamp className="w-3.5 h-3.5 stroke-[2.2]" />
        </button>
      </div>
    </div>
  );
};
