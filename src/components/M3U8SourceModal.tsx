import React, { useState, useEffect } from 'react';
import {
  Film,
  Globe,
  Link2,
  Loader2,
  Play,
  Search,
  Sparkles,
  X,
  Check,
} from 'lucide-react';
import {
  FEATURED_M3U8_STREAMS,
  fetchPublicM3U8Category,
  parseM3UPlaylist,
  PUBLIC_M3U_REPOS,
} from '../services/m3u8Service';
import { StreamCategory, StreamResource } from '../types/cinema';

interface M3U8SourceModalProps {
  isOpen: boolean;
  activeStream: StreamResource;
  onSelectStream: (stream: StreamResource) => void;
  onClose: () => void;
}

export const M3U8SourceModal: React.FC<M3U8SourceModalProps> = ({
  isOpen,
  activeStream,
  onSelectStream,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<StreamCategory>('featured');
  const [remoteStreams, setRemoteStreams] = useState<StreamResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [customUrl, setCustomUrl] = useState<string>('');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [customParsedList, setCustomParsedList] = useState<StreamResource[]>([]);
  const [isParsingCustomM3u, setIsParsingCustomM3u] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    if (
      activeTab === 'cantonese' ||
      activeTab === 'mandarin' ||
      activeTab === 'movies' ||
      activeTab === 'animation'
    ) {
      setIsLoading(true);
      setFetchError('');
      fetchPublicM3U8Category(activeTab)
        .then((list) => {
          setRemoteStreams(list);
          setIsLoading(false);
        })
        .catch((err) => {
          setFetchError(err instanceof Error ? err.message : '拉取公开 M3U8 列表失败');
          setIsLoading(false);
        });
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const displayedStreams =
    activeTab === 'featured'
      ? FEATURED_M3U8_STREAMS
      : activeTab === 'custom'
      ? customParsedList
      : remoteStreams.filter(
          (s) =>
            !searchQuery.trim() ||
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const handleLoadCustomUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customUrl.trim();
    if (!trimmed) return;

    if (trimmed.endsWith('.m3u') || trimmed.includes('.m3u?') || trimmed.includes('cn_all') || trimmed.includes('cn_cctv') || trimmed.includes('cn_province') || trimmed.includes('cn_pay')) {
      setIsParsingCustomM3u(true);
      setFetchError('');
      try {
        const res = await fetch(`/api/iptv-playlist?url=${encodeURIComponent(trimmed)}`);
        const txt = res.ok ? await res.text() : await (await fetch(trimmed)).text();
        const parsed = parseM3UPlaylist(txt, 'custom', '自定义列表', 200);
        setCustomParsedList(parsed);
      } catch {
        setFetchError('无法拉取该 M3U 播放列表，请检查链接有效性');
      } finally {
        setIsParsingCustomM3u(false);
      }
      return;
    }

    const customStream: StreamResource = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || '自定义 M3U8 放映源',
      subtitle: trimmed,
      category: 'custom',
      m3u8Url: trimmed,
      resolution: 'M3U8',
      languageTag: '自定义流',
    };
    onSelectStream(customStream);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-3xl bg-[#0B0D12] border border-white/12 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[82vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/8">
          <div>
            <h3 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
              <Film className="w-4 h-4 text-[#C87D46]" />
              <span>M3U8 华语 / 粤语 / 院线流媒体片源库</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              支持粤语、国语及全球电影 HLS (.m3u8) 实时流解码投射至 3D 弧形巨幕
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-3.5 border-b border-white/8">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('featured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'featured'
                  ? 'bg-[#C87D46] text-neutral-950 font-semibold'
                  : 'bg-[#141720] text-neutral-300 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>精选粤语 / 华语 / 院线</span>
            </button>

            {(
              Object.keys(PUBLIC_M3U_REPOS) as Array<keyof typeof PUBLIC_M3U_REPOS>
            ).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  activeTab === key
                    ? 'bg-[#C87D46] text-neutral-950 font-semibold'
                    : 'bg-[#141720] text-neutral-300 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{PUBLIC_M3U_REPOS[key].label}</span>
              </button>
            ))}

            <button
              onClick={() => setActiveTab('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                activeTab === 'custom'
                  ? 'bg-[#C87D46] text-neutral-950 font-semibold'
                  : 'bg-[#141720] text-neutral-300 hover:text-white'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>自定义 M3U8</span>
            </button>
          </div>

          {activeTab !== 'featured' && activeTab !== 'custom' && (
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索粤语/华语频道..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#141720] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C87D46]"
              />
            </div>
          )}
        </div>

        {/* Custom URL Input Form */}
        {activeTab === 'custom' && (
          <form onSubmit={handleLoadCustomUrl} className="py-4 space-y-3 border-b border-white/8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="影片名称（如：无间道 粤语版）"
                className="px-3.5 py-2 rounded-xl bg-[#141720] border border-white/10 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#C87D46]"
              />
              <input
                type="url"
                required
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="输入 https://.../*.m3u8 流地址 或 *.m3u 列表地址"
                className="sm:col-span-2 px-3.5 py-2 rounded-xl bg-[#141720] border border-white/10 text-xs text-white font-mono placeholder:text-neutral-500 focus:outline-none focus:border-[#C87D46]"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">
                支持任意 HLS (.m3u8) 华语/粤语影视直链或公开 M3U 播放列表
              </span>
              <button
                type="submit"
                disabled={isParsingCustomM3u}
                className="px-4 py-2 rounded-xl bg-[#C87D46] hover:bg-[#D68B54] text-neutral-950 font-semibold text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {isParsingCustomM3u ? '解析列表中...' : '立即投射至 3D 银幕'}
              </button>
            </div>
          </form>
        )}

        {/* Stream List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#C87D46]" />
              <span className="text-xs">正在拉取并解析粤语 / 中文 .m3u8 视频流...</span>
            </div>
          ) : fetchError ? (
            <div className="py-12 text-center text-xs text-rose-400">
              {fetchError}
            </div>
          ) : displayedStreams.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500">
              {activeTab === 'custom'
                ? '请在上方粘贴任意 .m3u8 视频流地址或 .m3u 播放列表链接'
                : '未找到匹配的片源'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {displayedStreams.map((item) => {
                const isSelected = item.m3u8Url === activeStream.m3u8Url;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectStream(item);
                      onClose();
                    }}
                    className={`group text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-[#C87D46]/15 border-[#C87D46] text-white'
                        : 'bg-[#12151E] border-white/8 hover:border-white/25 text-neutral-200'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {item.title}
                        </span>
                        {item.languageTag && (
                          <span className="text-[10px] font-mono text-[#E29B66] shrink-0">
                            {item.languageTag}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>

                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-[#C87D46] text-neutral-950'
                          : 'bg-white/8 text-neutral-300 group-hover:bg-[#C87D46] group-hover:text-neutral-950'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-white/8 flex items-center justify-between text-[11px] text-neutral-500">
          <span>当前放映：{activeStream.title}</span>
          <span className="font-mono tabular-nums">
            共 {displayedStreams.length} 个片源
          </span>
        </div>
      </div>
    </div>
  );
};
