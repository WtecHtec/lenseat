/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { Server, Stamp } from 'lucide-react';
import { generateAuditoriumSeats, MOVIES } from './data/cinemaData';
import { FEATURED_M3U8_STREAMS } from './services/m3u8Service';
import { MovieInfo, SeatData, StreamResource, ViewMode } from './types/cinema';
import { CinemaViewport3D } from './components/CinemaViewport3D';
import { PlanarSeatMap } from './components/PlanarSeatMap';
import { ImmersiveHudDock } from './components/ImmersiveHudDock';
import { M3U8SourceModal } from './components/M3U8SourceModal';
import { CommemorativeStampModal } from './components/CommemorativeStampModal';
import { ApiConfigModal } from './components/ApiConfigModal';
import { StreamPlaybackStatus } from './utils/hlsScreenPlayer';
import { soundEngine } from './utils/soundEffects';

export default function App() {
  const [selectedMovie] = useState<MovieInfo>(MOVIES[0]);
  const [seats] = useState<SeatData[]>(() =>
    generateAuditoriumSeats(MOVIES[0].basePrice)
  );

  // Active M3U8 Stream Resource (defaults to Cantonese RTHK 31 stream)
  const [activeStream, setActiveStream] = useState<StreamResource>(
    FEATURED_M3U8_STREAMS[0]
  );
  const [streamStatus, setStreamStatus] = useState<StreamPlaybackStatus>('idle');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState<boolean>(false);
  const [isStampModalOpen, setIsStampModalOpen] = useState<boolean>(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);

  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const defaultSeat = useMemo(
    () => seats.find((s) => s.id === 'F-08') || seats[Math.floor(seats.length / 2)],
    [seats]
  );

  const [activeSeat, setActiveSeat] = useState<SeatData>(defaultSeat);
  const [selectedSeatIds, setSelectedSeatIds] = useState<Set<string>>(
    () => new Set(['F-08'])
  );

  const [viewMode, setViewMode] = useState<ViewMode>('planar');

  // Enter 3D Immersive Seat View with silky Bezier camera flight
  const handleEnter3DView = useCallback(
    (targetSeat?: SeatData) => {
      const seatToEnter = targetSeat || activeSeat;
      setActiveSeat(seatToEnter);
      setSelectedSeatIds(new Set([seatToEnter.id]));
      soundEngine.playCameraDiveTo3D();
      setViewMode('transitioning-to-3d');
    },
    [activeSeat]
  );

  // Return to 2D Planar Seat Selection
  const handleReturnToPlanar = useCallback(() => {
    if (viewMode === 'planar') return;
    soundEngine.playReturnTo2D();
    setViewMode('transitioning-to-2d');
  }, [viewMode]);

  // Clicking any seat on the 2D Planar Map selects it and immediately glides into its 3D POV
  const handleClickSeatOnPlanar = useCallback((seat: SeatData) => {
    if (seat.status === 'occupied') return;
    soundEngine.playSeatClick(true);
    setActiveSeat(seat);
    setSelectedSeatIds(new Set([seat.id]));
    soundEngine.playCameraDiveTo3D();
    setViewMode('transitioning-to-3d');
  }, []);

  // Clicking a 3D seat mesh directly inside the 3D theater glides to that seat
  const handleSelectSeatIn3D = useCallback((seat: SeatData) => {
    setActiveSeat(seat);
    setSelectedSeatIds(new Set([seat.id]));
  }, []);

  const is3DActive =
    viewMode === 'immersive-3d' || viewMode === 'transitioning-to-3d';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#020203] select-none">
      {/* Minimalist 3-Zone Top Bar (auto-dims in 3D cinema mode so only the screen shines) */}
      <header
        className={`fixed top-0 inset-x-0 h-16 z-30 flex items-center justify-between gap-8 px-8 border-b transition-all duration-500 ${
          is3DActive
            ? 'bg-transparent border-transparent opacity-30 hover:opacity-100'
            : 'bg-[#08090C]/90 border-white/8 opacity-100'
        }`}
      >
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            handleReturnToPlanar();
          }}
          className="text-base font-semibold font-display tracking-[0.18em] text-white whitespace-nowrap shrink-0"
        >
          AETHER
        </a>

        {/* Zone 2: Minimalist Navigation Links */}
        <nav className="flex items-center gap-8 text-xs font-medium tracking-wide text-neutral-400">
          <button
            onClick={handleReturnToPlanar}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
              !is3DActive
                ? 'text-white border-[#C87D46]'
                : 'border-transparent hover:text-white'
            }`}
          >
            平面选座
          </button>
          <button
            onClick={() => handleEnter3DView(activeSeat)}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b ${
              is3DActive
                ? 'text-[#E29B66] border-[#C87D46]'
                : 'border-transparent hover:text-white'
            }`}
          >
            3D 观影视角 ({activeSeat.rowLabel}·{String(activeSeat.seatNumber).padStart(2, '0')})
          </button>
          <button
            onClick={() => setIsStreamModalOpen(true)}
            className="py-1 border-b border-transparent hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            切换片源 ({activeStream.title.split('·')[0].trim()})
          </button>
        </nav>

        {/* Zone 3: Minimalist Header Actions (API Config & Commemorative Stamp) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsApiModalOpen(true)}
            title="服务端 API 配置 (CORS / 独立运行)"
            aria-label="服务端 API 配置"
            className="w-8 h-8 text-neutral-200 bg-white/8 hover:bg-[#C87D46] hover:text-neutral-950 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <Server className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsStampModalOpen(true)}
            title="打卡集邮"
            aria-label="打卡集邮"
            className="w-8 h-8 text-neutral-200 bg-white/8 hover:bg-[#C87D46] hover:text-neutral-950 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          >
            <Stamp className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Pre-Warmed Photorealistic 3D Auditorium & Live M3U8 Screen Projection */}
      <CinemaViewport3D
        seats={seats}
        activeSeat={activeSeat}
        selectedSeatIds={selectedSeatIds}
        viewMode={viewMode}
        movie={selectedMovie}
        activeStream={activeStream}
        isMuted={isMuted}
        isPaused={isPaused}
        onStreamStatusChange={(status) => setStreamStatus(status)}
        onMuteStateChange={(muted) => setIsMuted(muted)}
        onScreenCanvasReady={(canvas) => {
          screenCanvasRef.current = canvas;
        }}
        onSelectSeatIn3D={handleSelectSeatIn3D}
        onTransitionComplete={(targetMode) => setViewMode(targetMode)}
      />

      {/* Step 1: Minimalist 2D Planar Seat Selection */}
      <PlanarSeatMap
        seats={seats}
        activeSeat={activeSeat}
        selectedSeatIds={selectedSeatIds}
        viewMode={viewMode}
        movie={{
          ...selectedMovie,
          title: activeStream.title,
        }}
        onClickSeat={handleClickSeatOnPlanar}
        onEnter3DView={handleEnter3DView}
      />

      {/* Step 2: Auto-Dimming Minimalist Floating Capsule in 3D View */}
      <ImmersiveHudDock
        activeSeat={activeSeat}
        activeStream={activeStream}
        streamStatus={streamStatus}
        isMuted={isMuted}
        isPaused={isPaused}
        viewMode={viewMode}
        onReturnToPlanar={handleReturnToPlanar}
        onOpenStreamModal={() => setIsStreamModalOpen(true)}
        onToggleMute={() => setIsMuted((m) => !m)}
        onTogglePause={() => setIsPaused((p) => !p)}
        onOpenStampModal={() => setIsStampModalOpen(true)}
      />

      {/* M3U8 Stream Repository & Custom HLS URL Modal */}
      <M3U8SourceModal
        isOpen={isStreamModalOpen}
        activeStream={activeStream}
        onSelectStream={(stream) => {
          setActiveStream(stream);
          setIsPaused(false);
          setIsMuted(false);
        }}
        onClose={() => setIsStreamModalOpen(false)}
      />

      {/* Commemorative Postage Stamp Studio & High-Res PNG Download Modal */}
      <CommemorativeStampModal
        isOpen={isStampModalOpen}
        activeSeat={activeSeat}
        activeStream={activeStream}
        getScreenSnapshot={() => screenCanvasRef.current}
        onClose={() => setIsStampModalOpen(false)}
      />

      {/* Backend API Configuration & CORS Modal */}
      <ApiConfigModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
      />
    </div>
  );
}
