import { MovieInfo, SeatData, SeatTier } from '../types/cinema';

export const MOVIES: MovieInfo[] = [
  {
    id: 'movie-1',
    title: '星际彼岸：光年回响',
    enTitle: 'BEYOND THE EVENT HORIZON',
    director: 'Denis Villeneuve / 克里斯托弗·诺兰 联合监制',
    duration: '156 分钟',
    format: 'IMAX 新一代激光 3D',
    soundFormat: 'Dolby Atmos 128声道全景声',
    showtime: '今晚 20:30',
    hallName: '1号 苍穹巨幕激光厅 (22m 弧形幕)',
    aspectRatioLabel: '1.90 : 1 IMAX 满屏画幅',
    basePrice: 88,
    themeColor: 'amber',
    accentHex: '#F59E0B',
    synopsis: '人类首艘曲率科考舰穿越人马座A*视界边缘，在引力透镜折射的高维时空中寻找文明留存的最后坐标。',
    scenePreset: 'interstellar_horizon',
  },
  {
    id: 'movie-2',
    title: '新东京2099：霓虹雨夜',
    enTitle: 'NEO-TOKYO: RAIN OF TITANIUM',
    director: '押井守 / 丹尼斯·维伦纽瓦 视觉顾问',
    duration: '132 分钟',
    format: 'Cinity 4K 120帧 高动态',
    soundFormat: 'Dolby Atmos 沉浸声场',
    showtime: '今晚 21:15',
    hallName: '1号 苍穹巨幕激光厅 (22m 弧形幕)',
    aspectRatioLabel: '2.39 : 1 宽银幕变形镜头',
    basePrice: 82,
    themeColor: 'cyan',
    accentHex: '#06B6D4',
    synopsis: '在全息巨构建筑与悬浮车流交织的垂直都市底层，一名记忆修复师偶然解码了整座城市人工气候中枢的底层密钥。',
    scenePreset: 'cyber_metropolis',
  },
  {
    id: 'movie-3',
    title: '深渊纪元：万米荧光海',
    enTitle: 'ABYSSAL LUMINESCENCE',
    director: 'James Cameron 深海摄影团队',
    duration: '140 分钟',
    format: 'IMAX 3D 原生双机拍摄',
    soundFormat: 'DTS:X 临境音',
    showtime: '今晚 22:00',
    hallName: '1号 苍穹巨幕激光厅 (22m 弧形幕)',
    aspectRatioLabel: '1.90 : 1 IMAX 满屏画幅',
    basePrice: 85,
    themeColor: 'emerald',
    accentHex: '#10B981',
    synopsis: '深入马里亚纳海沟11,000米热液喷口，见证地球最古老的生物发光生态群落与史前地质脉动。',
    scenePreset: 'deep_ocean_abyss',
  },
  {
    id: 'movie-4',
    title: '沙丘纪年：赤道烈阳',
    enTitle: 'CHRONICLES OF THE DUNE SEA',
    director: 'Greig Fraser 摄影指导作品',
    duration: '164 分钟',
    format: 'IMAX 70mm 胶片转制激光',
    soundFormat: '12声道 IMAX 定制音响',
    showtime: '明日 19:45',
    hallName: '1号 苍穹巨幕激光厅 (22m 弧形幕)',
    aspectRatioLabel: '1.43 : 1 史诗画幅',
    basePrice: 95,
    themeColor: 'rose',
    accentHex: '#F43F5E',
    synopsis: '横跨赤道亿万平方公里的琥珀沙海之上，风暴与星际香料采掘舰队在双日落晖下展开关乎星球命运的对决。',
    scenePreset: 'dune_solaris',
  },
];

// Screen geometry constants in 3D theater space (meters)
export const SCREEN_CONFIG = {
  width: 21.0,          // 21 meters wide IMAX screen
  height: 9.2,          // 9.2 meters tall
  centerZ: -12.2,       // Z position of screen center
  centerY: 4.5,         // Y height of screen center
  curveRadius: 28.0,    // Mild cylindrical curve radius for wrap-around immersion
};

// Pre-seeded occupied seats for realistic theater atmosphere
const OCCUPIED_SEAT_IDS = new Set([
  'B-06', 'B-07',
  'C-05', 'C-08', 'C-09',
  'D-04', 'D-05', 'D-10',
  'E-06', 'E-07', 'E-11', 'E-12',
  'F-04', 'F-05', 'F-09',
  'G-07', 'G-08', 'G-12',
  'H-02', 'H-03', 'H-06',
  'I-08', 'I-09',
]);

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
export const TOTAL_ROWS = ROW_LABELS.length; // 9 rows
export const SEATS_PER_ROW = 14;             // 14 seats per row (1..3, aisle, 4..11, aisle, 12..14)

/**
 * Generates the complete auditorium seat map with exact 3D stadium coordinates
 * and real optical/acoustic engineering calculations relative to the curved screen.
 */
export function generateAuditoriumSeats(basePrice: number = 88): SeatData[] {
  const seats: SeatData[] = [];

  for (let r = 0; r < TOTAL_ROWS; r++) {
    const rowLabel = ROW_LABELS[r];
    // Stadium stepped elevation: front row A is at z = -4.2m, y = 0.2m
    // Back row I is at z = +8.6m, y = 4.55m
    const zBase = -4.2 + r * 1.6;
    // Slight parabolic step rise (steeper in the back for zero head occlusion)
    const yBase = 0.2 + r * 0.42 + Math.pow(r, 1.35) * 0.05;

    // Determine tier: Rows E, F, G center are Prime ("黄金视听区"); Row F/G center is VIP/Emperor
    for (let c = 0; c < SEATS_PER_ROW; c++) {
      const seatNumber = c + 1;
      const paddedNum = String(seatNumber).padStart(2, '0');
      const id = `${rowLabel}-${paddedNum}`;

      // Calculate horizontal X coordinate with two aisles (after seat 3 and after seat 11)
      // Center of row is between seat 7 and seat 8 (c = 6.5)
      const normalizedCol = c - (SEATS_PER_ROW - 1) / 2; // -6.5 to +6.5
      let aisleOffset = 0;
      if (seatNumber <= 3) aisleOffset = -0.85;
      else if (seatNumber >= 12) aisleOffset = 0.85;

      const seatSpacing = 1.04; // 1.04m wide luxury cinema chairs
      const x = normalizedCol * seatSpacing + aisleOffset;

      // Subtle curved row arc so outer seats angle slightly toward screen center
      const rowCurveZOffset = -Math.pow(x * 0.12, 2) * 0.45;
      const z = zBase + rowCurveZOffset;
      const y = yBase;

      // Seated viewer head/eye position: slightly above the backrest at the headrest crown
      const eyeX = x;
      const eyeY = y + 1.16;
      const eyeZ = z + 0.04;

      // Calculate real optical & acoustic metrics relative to SCREEN_CONFIG
      const dx = eyeX - 0;
      const dy = SCREEN_CONFIG.centerY - eyeY;
      const dz = eyeZ - SCREEN_CONFIG.centerZ;
      const distanceToScreen = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Horizontal field of view subtended by the 21m screen
      const leftEdgeX = -SCREEN_CONFIG.width / 2;
      const rightEdgeX = SCREEN_CONFIG.width / 2;
      const angleLeft = Math.atan2(leftEdgeX - eyeX, dz);
      const angleRight = Math.atan2(rightEdgeX - eyeX, dz);
      const horizontalFov = Math.round(((angleRight - angleLeft) * 180) / Math.PI);

      // Vertical elevation angle to screen center
      const verticalAngle = Number(
        ((Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * 180) / Math.PI).toFixed(1)
      );

      // Off-axis horizontal angle
      const offAxisAngle = Number(
        ((Math.atan2(Math.abs(dx), dz) * 180) / Math.PI).toFixed(1)
      );

      // Acoustic sweet spot is centered around Row E/F (r = 4..5), center seats (seat 6..9)
      const rowIdealDist = Math.abs(r - 4.6) / 4.5;
      const colIdealDist = Math.abs(normalizedCol) / 6.5;
      const acousticRaw = 100 - (rowIdealDist * 22 + colIdealDist * 26);
      const acousticScore = Math.max(68, Math.min(99, Math.round(acousticRaw)));

      // Visual score balances optimal FOV (36°–54° THX/SMPTE spec) and low vertical neck strain
      const fovDiff = Math.abs(horizontalFov - 48);
      const neckPenalty = Math.max(0, Math.abs(verticalAngle - 4) * 1.4);
      const visualRaw = 100 - fovDiff * 0.7 - neckPenalty - colIdealDist * 14;
      const visualScore = Math.max(65, Math.min(99, Math.round(visualRaw)));

      // Determine Seat Tier and price
      let tier: SeatTier = 'standard';
      let price = basePrice;
      let ratingLabel = '标准观影区';

      const isCenterBlock = seatNumber >= 4 && seatNumber <= 11;
      const isCoreCenter = seatNumber >= 6 && seatNumber <= 9;

      if ((r === 4 || r === 5) && isCoreCenter) {
        tier = 'vip';
        price = basePrice + 20;
        ratingLabel = '黄金皇帝位 · THX 声学中心';
      } else if (r >= 3 && r <= 6 && isCenterBlock) {
        tier = 'prime';
        price = basePrice + 10;
        ratingLabel = '优选视听区 · 满屏视野';
      } else if (r <= 1) {
        ratingLabel = '巨幕近景 · 震撼包裹感';
      } else if (r >= 7) {
        ratingLabel = '后排高地 · 全景平视区';
      } else {
        ratingLabel = '侧翼宽敞区 · 进出便捷';
      }

      const status = OCCUPIED_SEAT_IDS.has(id) ? 'occupied' : 'available';

      seats.push({
        id,
        rowIndex: r,
        rowLabel,
        colIndex: c,
        seatNumber,
        tier,
        status,
        price,
        worldPos: { x, y, z },
        eyePos: { x: eyeX, y: eyeY, z: eyeZ },
        metrics: {
          distanceToScreen: Number(distanceToScreen.toFixed(1)),
          horizontalFov,
          verticalAngle,
          offAxisAngle,
          acousticScore,
          visualScore,
          ratingLabel,
        },
      });
    }
  }

  return seats;
}
