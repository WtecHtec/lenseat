import React, { useEffect, useRef, useState } from 'react';
import { Download, Sparkles, Stamp, X } from 'lucide-react';
import { SeatData, StreamResource } from '../types/cinema';

interface CommemorativeStampModalProps {
  isOpen: boolean;
  activeSeat: SeatData;
  activeStream: StreamResource;
  getScreenSnapshot: () => HTMLCanvasElement | null;
  onClose: () => void;
}

type StampThemeId = 'obsidian_gold' | 'hongkong_film' | 'museum_ivory';

interface StampTheme {
  id: StampThemeId;
  label: string;
  paperBg: string;
  innerCardBg: string;
  borderPrimary: string;
  borderSecondary: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  sealColor: string;
  accentColor: string;
}

const STAMP_THEMES: StampTheme[] = [
  {
    id: 'obsidian_gold',
    label: '黑曜暗金',
    paperBg: '#121318',
    innerCardBg: '#0B0C10',
    borderPrimary: '#C87D46',
    borderSecondary: 'rgba(200, 125, 70, 0.35)',
    textPrimary: '#F5F2EB',
    textSecondary: '#E29B66',
    textMuted: '#8A847C',
    sealColor: '#D97706',
    accentColor: '#C87D46',
  },
  {
    id: 'hongkong_film',
    label: '港风胶片',
    paperBg: '#1B1110',
    innerCardBg: '#120A09',
    borderPrimary: '#E15B48',
    borderSecondary: 'rgba(225, 91, 72, 0.35)',
    textPrimary: '#FDE8D7',
    textSecondary: '#F59E0B',
    textMuted: '#A67C72',
    sealColor: '#EF4444',
    accentColor: '#E15B48',
  },
  {
    id: 'museum_ivory',
    label: '典藏棉纸',
    paperBg: '#F4EFE6',
    innerCardBg: '#EBE4D8',
    borderPrimary: '#2B2522',
    borderSecondary: 'rgba(43, 37, 34, 0.25)',
    textPrimary: '#1A1615',
    textSecondary: '#8C4A27',
    textMuted: '#6E655E',
    sealColor: '#B93829',
    accentColor: '#8C4A27',
  },
];

export const CommemorativeStampModal: React.FC<CommemorativeStampModalProps> = ({
  isOpen,
  activeSeat,
  activeStream,
  getScreenSnapshot,
  onClose,
}) => {
  const stampCanvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTheme, setSelectedTheme] = useState<StampTheme>(STAMP_THEMES[0]);
  const [customNote, setCustomNote] = useState<string>('银幕微光，独坐暗场听风');

  // Render the high-resolution perforated commemorative postage stamp onto the canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = stampCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 900;
    const H = 1200;
    canvas.width = W;
    canvas.height = H;

    // 1. Studio Dark Backdrop around the perforated stamp
    ctx.fillStyle = '#060709';
    ctx.fillRect(0, 0, W, H);

    const padX = 72;
    const padY = 68;
    const stampW = W - padX * 2;
    const stampH = H - padY * 2;

    // 2. Draw Perforated Postage Stamp Silhouette with Drop Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 18;

    ctx.fillStyle = selectedTheme.paperBg;
    ctx.fillRect(padX, padY, stampW, stampH);
    ctx.restore();

    // Punch circular postage perforations (齿孔) along all 4 edges
    ctx.save();
    ctx.fillStyle = '#060709';
    const holeRadius = 11;
    const stepX = 38;
    const stepY = 38;

    // Top & Bottom edge perforations
    for (let x = padX + stepX / 2; x < padX + stampW; x += stepX) {
      ctx.beginPath();
      ctx.arc(x, padY, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, padY + stampH, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left & Right edge perforations
    for (let y = padY + stepY / 2; y < padY + stampH; y += stepY) {
      ctx.beginPath();
      ctx.arc(padX, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(padX + stampW, y, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Subtle organic paper grain texture overlay
    ctx.save();
    ctx.fillStyle =
      selectedTheme.id === 'museum_ivory'
        ? 'rgba(0, 0, 0, 0.018)'
        : 'rgba(255, 255, 255, 0.015)';
    for (let i = 0; i < 1800; i++) {
      const gx = padX + 20 + ((i * 173.3) % (stampW - 40));
      const gy = padY + 20 + ((i * 293.7) % (stampH - 40));
      ctx.fillRect(gx, gy, 1.5, 1.5);
    }
    ctx.restore();

    // 3. Double Engraved Inner Stamp Frame
    const innerPad = 36;
    const frameX = padX + innerPad;
    const frameY = padY + innerPad;
    const frameW = stampW - innerPad * 2;
    const frameH = stampH - innerPad * 2;

    ctx.strokeStyle = selectedTheme.borderPrimary;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(frameX, frameY, frameW, frameH);

    ctx.strokeStyle = selectedTheme.borderSecondary;
    ctx.lineWidth = 1;
    ctx.strokeRect(frameX + 8, frameY + 8, frameW - 16, frameH - 16);

    // 4. Top Stamp Header: Country/Theater Post & Seat Denomination
    const contentX = frameX + 34;
    const contentW = frameW - 68;
    const headerY = frameY + 52;

    ctx.fillStyle = selectedTheme.textMuted;
    ctx.font = '500 17px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('AETHER CINEMA POST · 观影纪念邮票', contentX, headerY);

    ctx.fillStyle = selectedTheme.textPrimary;
    ctx.font = '700 32px "Outfit", sans-serif';
    ctx.fillText('CHINA · 影院光影志', contentX, headerY + 42);

    // Top-Right Postage Denomination: Seat Coordinate (e.g., F·08)
    const seatCode = `${activeSeat.rowLabel}·${String(activeSeat.seatNumber).padStart(2, '0')}`;
    ctx.textAlign = 'right';
    ctx.fillStyle = selectedTheme.textSecondary;
    ctx.font = '700 46px "JetBrains Mono", monospace';
    ctx.fillText(seatCode, contentX + contentW, headerY + 34);

    ctx.fillStyle = selectedTheme.textMuted;
    ctx.font = '500 14px "JetBrains Mono", monospace';
    ctx.fillText(
      `DIST ${activeSeat.metrics.distanceToScreen}M · FOV ${activeSeat.metrics.horizontalFov}°`,
      contentX + contentW,
      headerY + 58
    );

    // 5. Central Movie Still Artwork Window (Captured directly from the 3D Screen!)
    const imgX = contentX;
    const imgY = headerY + 84;
    const imgW = contentW;
    const imgH = 440;

    ctx.fillStyle = selectedTheme.innerCardBg;
    ctx.fillRect(imgX, imgY, imgW, imgH);

    const screenCanvas = getScreenSnapshot();
    if (screenCanvas && screenCanvas.width > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();

      // Draw movie frame with cover aspect ratio
      const srcAspect = screenCanvas.width / screenCanvas.height;
      const dstAspect = imgW / imgH;
      let drawW = imgW;
      let drawH = imgH;
      let offsetX = imgX;
      let offsetY = imgY;

      if (srcAspect > dstAspect) {
        drawH = imgH;
        drawW = imgH * srcAspect;
        offsetX = imgX - (drawW - imgW) * 0.5;
      } else {
        drawW = imgW;
        drawH = imgW / srcAspect;
        offsetY = imgY - (drawH - imgH) * 0.5;
      }

      ctx.drawImage(screenCanvas, offsetX, offsetY, drawW, drawH);

      // Subtle cinema vignette over the film frame
      const vig = ctx.createRadialGradient(
        imgX + imgW * 0.5,
        imgY + imgH * 0.5,
        imgH * 0.25,
        imgX + imgW * 0.5,
        imgY + imgH * 0.5,
        imgW * 0.65
      );
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.45)');
      ctx.fillStyle = vig;
      ctx.fillRect(imgX, imgY, imgW, imgH);

      // Subtle 35mm film grainsprocket bar accents at top/bottom of frame
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(imgX, imgY, imgW, 22);
      ctx.fillRect(imgX, imgY + imgH - 22, imgW, 22);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.font = '500 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('KODAK 2383 ARCHIVAL PRINT · 22M CURVED SCREEN', imgX + 12, imgY + 15);
      ctx.textAlign = 'right';
      ctx.fillText(`SEAT POV: ${activeSeat.rowLabel}排${String(activeSeat.seatNumber).padStart(2, '0')}座`, imgX + imgW - 12, imgY + imgH - 7);

      ctx.restore();
    }

    ctx.strokeStyle = selectedTheme.borderPrimary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(imgX, imgY, imgW, imgH);

    // 6. Editorial Movie Title, Seat Coordinates & Personal Check-in Quote
    const metaY = imgY + imgH + 56;
    ctx.textAlign = 'left';

    ctx.fillStyle = selectedTheme.textSecondary;
    ctx.font = '500 16px "JetBrains Mono", monospace';
    ctx.fillText(
      `${activeStream.languageTag || '院线展映'} · 1号 苍穹弧形巨幕厅`,
      contentX,
      metaY
    );

    ctx.fillStyle = selectedTheme.textPrimary;
    ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
    const cleanMovieTitle = activeStream.title.split('·')[0].trim();
    ctx.fillText(`《${cleanMovieTitle}》`, contentX - 8, metaY + 46);

    // Divider line
    ctx.strokeStyle = selectedTheme.borderSecondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(contentX, metaY + 72);
    ctx.lineTo(contentX + contentW, metaY + 72);
    ctx.stroke();

    // User's Check-in Note Quote
    ctx.fillStyle = selectedTheme.textPrimary;
    ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`“ ${customNote || '银幕微光，独坐暗场听风'} ”`, contentX, metaY + 118);

    // Bottom Serial Number & Date
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    ctx.fillStyle = selectedTheme.textMuted;
    ctx.font = '500 15px "JetBrains Mono", monospace';
    ctx.fillText(
      `CHECK-IN TIME: ${dateStr} ${timeStr}   |   SEAT: ${activeSeat.rowLabel}排${String(activeSeat.seatNumber).padStart(2, '0')}座`,
      contentX,
      frameY + frameH - 36
    );

    // 7. Authentic Circular Cinema Postmark Seal (定制圆形纪念邮戳 + 波浪销票纹)
    const sealX = contentX + contentW - 95;
    const sealY = metaY + 125;
    const sealR = 68;

    ctx.save();
    ctx.translate(sealX, sealY);
    ctx.rotate(-0.18);
    ctx.strokeStyle = selectedTheme.sealColor;
    ctx.fillStyle = selectedTheme.sealColor;
    ctx.globalAlpha = 0.85;

    // Outer double postmark rings
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, sealR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, sealR - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Inner horizontal postmark date bars
    ctx.beginPath();
    ctx.moveTo(-sealR + 10, -16);
    ctx.lineTo(sealR - 10, -16);
    ctx.moveTo(-sealR + 10, 16);
    ctx.lineTo(sealR - 10, 16);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText('AETHER CINEMA', 0, -28);
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillText(dateStr, 0, 6);
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillText(`打卡 · ${activeSeat.rowLabel}${String(activeSeat.seatNumber).padStart(2, '0')}`, 0, 38);

    // Wavy cancellation lines extending to the left of the circular postmark
    ctx.lineWidth = 2;
    for (let wLine = -2; wLine <= 2; wLine++) {
      const ly = wLine * 14;
      ctx.beginPath();
      ctx.moveTo(-sealR - 95, ly);
      for (let wx = -sealR - 95; wx <= -sealR - 6; wx += 8) {
        ctx.lineTo(wx, ly + Math.sin(wx * 0.22) * 3.5);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [isOpen, activeSeat, activeStream, selectedTheme, customNote, getScreenSnapshot]);

  if (!isOpen) return null;

  const handleDownloadStamp = () => {
    const canvas = stampCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `AETHER-观影纪念邮票-${activeSeat.rowLabel}排${String(activeSeat.seatNumber).padStart(2, '0')}座.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-4">
      <div className="relative w-full max-w-2xl bg-[#0B0D12] border border-white/12 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-center gap-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Left: Live High-Res Perforated Postage Stamp Preview */}
        <div className="w-64 sm:w-72 shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-[#060709]">
          <canvas
            ref={stampCanvasRef}
            className="w-full h-auto block"
          />
        </div>

        {/* Right: Stamp Customization & Download Controls */}
        <div className="flex-1 w-full flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#E29B66]">
              <Stamp className="w-3.5 h-3.5" />
              <span>COMMEMORATIVE STAMP · 打卡集邮</span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">
              专属观影纪念邮票
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              已定格当前 {activeSeat.rowLabel}排{String(activeSeat.seatNumber).padStart(2, '0')}座 视角与银幕画面，生成齿孔纪念邮票并加盖专属日戳。
            </p>
          </div>

          {/* Paper Stock Theme Selector */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 block">
              选择邮票纸张风格
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STAMP_THEMES.map((theme) => {
                const isSelected = theme.id === selectedTheme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#C87D46]/20 border-[#C87D46] text-white font-semibold'
                        : 'bg-[#141720] border-white/8 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {theme.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Personal Check-in Quote Input */}
          <div className="space-y-2">
            <label className="text-xs text-neutral-400 flex items-center justify-between">
              <span>定制票面观影寄语</span>
              <Sparkles className="w-3 h-3 text-[#C87D46]" />
            </label>
            <input
              type="text"
              maxLength={22}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="输入一句观影心情..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141720] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C87D46]"
            />
          </div>

          {/* Download High-Res Stamp Image CTA */}
          <div className="pt-2">
            <button
              onClick={handleDownloadStamp}
              className="w-full py-3 px-4 rounded-xl bg-[#C87D46] hover:bg-[#D68B54] text-neutral-950 font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 stroke-[2.2]" />
              <span>下载高清纪念邮票图片 (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
