export type SeatTier = 'standard' | 'prime' | 'vip';
export type SeatStatus = 'available' | 'occupied' | 'selected';

export interface SeatData {
  id: string;
  rowIndex: number;
  rowLabel: string;
  colIndex: number;
  seatNumber: number;
  tier: SeatTier;
  status: SeatStatus;
  price: number;
  worldPos: {
    x: number;
    y: number;
    z: number;
  };
  eyePos: {
    x: number;
    y: number;
    z: number;
  };
  metrics: {
    distanceToScreen: number;
    horizontalFov: number;
    verticalAngle: number;
    offAxisAngle: number;
    acousticScore: number;
    visualScore: number;
    ratingLabel: string;
  };
}

export interface MovieInfo {
  id: string;
  title: string;
  enTitle: string;
  director: string;
  duration: string;
  format: string;
  soundFormat: string;
  showtime: string;
  hallName: string;
  aspectRatioLabel: string;
  basePrice: number;
  themeColor: string;
  accentHex: string;
  synopsis: string;
  scenePreset: 'interstellar_horizon' | 'cyber_metropolis' | 'deep_ocean_abyss' | 'dune_solaris';
  m3u8Url?: string;
}

export type StreamCategory =
  | 'featured'
  | 'cantonese'
  | 'mandarin'
  | 'movies'
  | 'animation'
  | 'custom';

export interface StreamResource {
  id: string;
  title: string;
  subtitle: string;
  category: StreamCategory;
  m3u8Url: string;
  backupUrls?: string[];
  resolution?: string;
  languageTag?: string;
  isLive?: boolean;
  logo?: string;
}

export type ViewMode = 'planar' | 'transitioning-to-3d' | 'immersive-3d' | 'transitioning-to-2d';

export type LightingPreset = 'selection' | 'cinema_dark' | 'ambient_glow';
