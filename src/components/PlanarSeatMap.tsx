import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { MovieInfo, SeatData, ViewMode } from '../types/cinema';

interface PlanarSeatMapProps {
  seats: SeatData[];
  activeSeat: SeatData;
  selectedSeatIds: Set<string>;
  viewMode: ViewMode;
  movie: MovieInfo;
  onClickSeat: (seat: SeatData) => void;
  onEnter3DView: (seat?: SeatData) => void;
}

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

export const PlanarSeatMap: React.FC<PlanarSeatMapProps> = ({
  seats,
  activeSeat,
  selectedSeatIds,
  viewMode,
  movie,
  onClickSeat,
  onEnter3DView,
}) => {
  const isVisible = viewMode === 'planar';
  const isHidden = viewMode === 'immersive-3d';

  // Dynamic transform origin centered on the chosen seat for a seamless zoom-into-3D transition
  const originXPercent = Math.round(((activeSeat.colIndex + 0.5) / 14) * 100);
  const originYPercent = Math.round(((activeSeat.rowIndex + 1.5) / 11) * 100);

  const rows: SeatData[][] = ROW_LABELS.map((_, rIdx) =>
    seats.filter((s) => s.rowIndex === rIdx)
  );

  return (
    <div
      className={`fixed inset-x-0 top-16 bottom-0 z-10 flex flex-col items-center justify-between px-6 py-8 bg-[#08090C]/92 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        isVisible
          ? 'opacity-100 scale-100 pointer-events-auto'
          : isHidden
          ? 'opacity-0 scale-125 pointer-events-none invisible'
          : 'opacity-0 scale-115 pointer-events-none'
      }`}
      style={{
        transformOrigin: `${originXPercent}% ${originYPercent}%`,
      }}
    >
      {/* Top: Minimalist Curved Screen Arc */}
      <div className="w-full max-w-2xl flex flex-col items-center pt-1">
        <svg
          viewBox="0 0 680 44"
          className="w-full h-11 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="minimalScreenArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.04)" />
              <stop offset="25%" stopColor="rgba(217, 154, 108, 0.55)" />
              <stop offset="50%" stopColor="rgba(255, 245, 235, 0.95)" />
              <stop offset="75%" stopColor="rgba(217, 154, 108, 0.55)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0.04)" />
            </linearGradient>
          </defs>
          <path
            d="M 40 30 Q 340 -6 640 30"
            fill="none"
            stroke="url(#minimalScreenArc)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
        <span className="text-[11px] font-mono tracking-[0.28em] text-neutral-500 mt-1">
          SCREEN
        </span>
      </div>

      {/* Center: Sculptural Minimalist Seat Matrix */}
      <div className="flex flex-col gap-2.5 items-center my-auto">
        {rows.map((rowSeats, rIdx) => {
          const rowLabel = ROW_LABELS[rIdx];
          return (
            <div key={rowLabel} className="flex items-center gap-4">
              <span className="w-4 text-right text-[11px] font-mono text-neutral-600 tabular-nums">
                {rowLabel}
              </span>

              <div className="flex items-center gap-2">
                {rowSeats.map((seat) => {
                  const isOccupied = seat.status === 'occupied';
                  const isSelected =
                    selectedSeatIds.has(seat.id) || activeSeat.id === seat.id;

                  const aisleMargin =
                    seat.seatNumber === 3 || seat.seatNumber === 11
                      ? 'mr-6'
                      : '';

                  return (
                    <button
                      key={seat.id}
                      disabled={isOccupied}
                      onClick={() => onClickSeat(seat)}
                      title={`${seat.rowLabel}排 ${String(seat.seatNumber).padStart(2, '0')}座`}
                      className={`group relative w-8 h-8 sm:w-9 sm:h-8.5 flex flex-col items-center justify-center transition-all duration-200 ${aisleMargin} ${
                        isOccupied
                          ? 'cursor-not-allowed opacity-25'
                          : 'cursor-pointer hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Realistic Top-Down Luxury Armchair Silhouette */}
                      <span
                        className={`w-full h-full rounded-t-[9px] rounded-b-[4px] border flex flex-col items-center justify-between pt-1 pb-1 transition-all duration-200 ${
                          isOccupied
                            ? 'bg-[#141519] border-white/5 text-transparent'
                            : isSelected
                            ? 'bg-[#C87D46] border-[#F3C69F] text-neutral-950 shadow-[0_0_20px_rgba(200,125,70,0.45)] scale-105'
                            : 'bg-[#26201D] border-white/12 text-neutral-400 group-hover:bg-[#382E29] group-hover:border-[#C87D46]/60 group-hover:text-neutral-200'
                        }`}
                      >
                        {/* Top Bolster / Headrest Seam */}
                        <span
                          className={`w-5 h-[2px] rounded-full ${
                            isSelected
                              ? 'bg-neutral-950/40'
                              : 'bg-white/15 group-hover:bg-white/30'
                          }`}
                        />
                        <span className="text-[10px] font-mono font-medium leading-none tabular-nums">
                          {String(seat.seatNumber).padStart(2, '0')}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <span className="w-4 text-left text-[11px] font-mono text-neutral-600 tabular-nums">
                {rowLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom: Ultra-Clean Legend & Single-Line Floating Action Bar */}
      <div className="w-full max-w-2xl flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/8">
        <div className="flex items-center gap-6 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-t-[4px] rounded-b-[2px] bg-[#26201D] border border-white/15 inline-block" />
            <span>可选</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-t-[4px] rounded-b-[2px] bg-[#C87D46] border border-[#F3C69F] inline-block" />
            <span className="text-neutral-200">当前座位</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-t-[4px] rounded-b-[2px] bg-[#141519] border border-white/5 opacity-35 inline-block" />
            <span>已售</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs text-neutral-400">
            <span>{movie.title.split('：')[0]}</span>
            <span className="mx-2 text-neutral-600" aria-hidden="true">·</span>
            <span className="font-mono text-white font-medium tabular-nums">
              {activeSeat.rowLabel}排 {String(activeSeat.seatNumber).padStart(2, '0')}座
            </span>
          </div>

          <button
            onClick={() => onEnter3DView(activeSeat)}
            className="px-4 py-2 rounded-full bg-[#C87D46] hover:bg-[#D68B54] text-neutral-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>进入 3D 观影视角</span>
            <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
  );
};
