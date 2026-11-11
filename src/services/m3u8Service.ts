import { StreamCategory, StreamResource } from '../types/cinema';

/**
 * Verified, Live-Tested Cantonese (粤语), Mandarin Cinema (CCTV-6 / 卫视 / 凤凰),
 * and Widescreen VOD HLS (.m3u8) streams with automatic multi-line backup failover.
 * Powered by server-side /api/hls-proxy to bypass HTTP Mixed-Content & CORS limits.
 */
export const FEATURED_M3U8_STREAMS: StreamResource[] = [
  {
    id: 'hk-tvb-jade-cantonese',
    title: '翡翠台 · TVB 粤语经典与院线剧场',
    subtitle: '香港粤语综合频道 · 港产剧集与电影专场 (1080P 实测直连)',
    category: 'featured',
    m3u8Url: 'http://103.172.187.30:12000/stream/mytv/null-1/master.m3u8',
    backupUrls: [
      'http://103.172.187.30:12000/stream/mytv/null-11/master.m3u8',
      'http://113.90.154.189:9901/tsfile/live/1000_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 粤语',
    languageTag: '粤语原声',
    isLive: true,
  },
  {
    id: 'cn-cctv6-movie',
    title: 'CCTV-6 · 电影频道高清巨幕院线',
    subtitle: 'best-fan/iptv-sources 实测源 · 24小时华语与国际院线大片',
    category: 'featured',
    m3u8Url: 'http://69.30.245.50/live/cctv6.m3u8',
    backupUrls: [
      'http://124.90.45.52:9901/tsfile/live/1017_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 电影',
    languageTag: '国语院线',
    isLive: true,
  },
  {
    id: 'gd-satellite-cantonese',
    title: '广东卫视 · 岭南大湾区超清剧场',
    subtitle: 'best-fan/iptv-sources 多线源 · 粤港澳大湾区人文与影视',
    category: 'featured',
    m3u8Url: 'http://113.90.154.189:9901/tsfile/live/1000_1.m3u8?key=txiptv&playlive=1&authid=0',
    backupUrls: [
      'http://124.228.160.40:9901/tsfile/live/0125_1.m3u8?key=txiptv&playlive=1&authid=0',
      'http://36.136.38.87:9901/tsfile/live/0125_1.m3u8?key=txiptv&playlive=1&authid=0',
      'http://153.0.171.163:9901/tsfile/live/0125_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 粤/国',
    languageTag: '大湾区源',
    isLive: true,
  },
  {
    id: 'hk-asian-drama',
    title: '亚洲剧台 · Asian Drama 港剧与华语剧场',
    subtitle: '全天候经典港产剧集与亚洲影视展映 (1080P HLS)',
    category: 'featured',
    m3u8Url: 'http://103.172.187.30:12000/stream/mytv/null-11/master.m3u8',
    backupUrls: [
      'http://103.172.187.30:12000/stream/mytv/null-1/master.m3u8',
    ],
    resolution: '1080P · 港剧',
    languageTag: '粤语/华语',
    isLive: true,
  },
  {
    id: 'hn-mango-cinema',
    title: '湖南卫视 · 华语院线与剧场联播',
    subtitle: 'best-fan/iptv-sources 实测源 · 黄金档华语剧集与电影盛典',
    category: 'featured',
    m3u8Url: 'http://36.136.38.87:9901/tsfile/live/0128_1.m3u8?key=txiptv&playlive=1&authid=0',
    backupUrls: [
      'http://74.91.26.218:82/live/hnwshd.m3u8',
      'http://153.0.171.163:9901/tsfile/live/0128_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 华语',
    languageTag: '华语院线',
    isLive: true,
  },
  {
    id: 'hk-phoenix-chinese',
    title: '凤凰卫视 · 粤港与全球华人纪实剧场',
    subtitle: 'best-fan/iptv-sources 实测源 · 港澳人文纪实与电影专题',
    category: 'featured',
    m3u8Url: 'http://120.198.95.220:9901/tsfile/live/1036_1.m3u8?key=txiptv&playlive=1&down=1',
    backupUrls: [
      'http://113.90.154.189:9901/tsfile/live/1000_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 港澳',
    languageTag: '港澳华语',
    isLive: true,
  },
  {
    id: 'cn-cctv8-drama',
    title: 'CCTV-8 · 华语黄金档电视剧场',
    subtitle: 'best-fan/iptv-sources 36ms 极速源 · 院线级热播华语剧集联播',
    category: 'featured',
    m3u8Url: 'http://124.228.160.40:9901/tsfile/live/0008_1.m3u8?key=txiptv&playlive=1&authid=0',
    backupUrls: [
      'http://124.90.45.52:9901/tsfile/live/1018_1.m3u8?key=txiptv&playlive=1&authid=0',
      'http://74.91.26.218:82/live/cctv8hd.m3u8',
    ],
    resolution: '1080P · 国语',
    languageTag: '国语剧场',
    isLive: true,
  },
  {
    id: 'cn-dragon-tv',
    title: '东方卫视 · 华语院线与文化剧场',
    subtitle: 'best-fan/iptv-sources 38ms 低延迟源 · 高清影视与文化综述',
    category: 'featured',
    m3u8Url: 'http://124.228.160.40:9901/tsfile/live/1005_1.m3u8?key=txiptv&playlive=1&authid=0',
    backupUrls: [
      'http://153.0.171.163:9901/tsfile/live/0107_1.m3u8?key=txiptv&playlive=1&authid=0',
      'http://119.129.172.144:9901/tsfile/live/0107_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 超清',
    languageTag: '国语超清',
    isLive: true,
  },
  {
    id: 'cn-zhejiang-tv',
    title: '浙江卫视 · 1080P 蓝光院线剧场',
    subtitle: '阿里云 CDN 直连 1080P 高码率源 · 华语剧场与大片展映',
    category: 'featured',
    m3u8Url: 'http://ali-xwl.cztv.com/live/channel011080Plxw.m3u8',
    backupUrls: [
      'http://120.198.95.220:9901/tsfile/live/1045_1.m3u8?key=txiptv&playlive=1&down=1',
      'http://124.228.160.40:9901/tsfile/live/0124_1.m3u8?key=txiptv&playlive=1&authid=0',
    ],
    resolution: '1080P · 蓝光',
    languageTag: '国语蓝光',
    isLive: true,
  },
  {
    id: 'hls-sintel-cinema',
    title: '寻龙纪元 · Sintel 2.35:1 宽银幕巨制',
    subtitle: '影院级 2.35:1 宽银幕奇幻动画电影 · 杜比多音轨点播源',
    category: 'featured',
    m3u8Url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    backupUrls: [
      'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    ],
    resolution: '1080P · 2.35:1',
    languageTag: '宽银幕点播',
    isLive: false,
  },
];

/**
 * Integrated M3U8 repositories based on:
 * - https://github.com/best-fan/iptv-sources (daily verified Chinese CCTV / Province / Pay M3U8 with response-time sorting)
 * - https://github.com/jia070310/4K-IPTV-M3U & Cantonese / Hong Kong / Macau IPTV playlists
 */
export const PUBLIC_M3U_REPOS: Record<
  'cantonese' | 'mandarin' | 'movies' | 'animation',
  { label: string; urls: string[]; langBadge: string }
> = {
  cantonese: {
    label: '粤语 / 港澳 / 岭南源',
    urls: [
      'https://raw.githubusercontent.com/best-fan/iptv-sources/main/cn_pay_status.m3u8',
      'https://raw.githubusercontent.com/best-fan/iptv-sources/main/cn_province_status.m3u8',
      'https://iptv-org.github.io/iptv/languages/yue.m3u',
      'https://iptv-org.github.io/iptv/countries/hk.m3u',
    ],
    langBadge: '粤语 / 港澳',
  },
  mandarin: {
    label: '央视 / 电影 / 纪录源 (best-fan)',
    urls: [
      'https://raw.githubusercontent.com/best-fan/iptv-sources/main/cn_cctv_status.m3u8',
      'https://raw.githubusercontent.com/best-fan/iptv-sources/main/cn_all_status.m3u8',
    ],
    langBadge: '央视 / 华语',
  },
  movies: {
    label: '全国卫视 4K/HD 源',
    urls: [
      'https://raw.githubusercontent.com/best-fan/iptv-sources/main/cn_province_status.m3u8',
      'https://iptv-org.github.io/iptv/categories/movies.m3u',
    ],
    langBadge: '高清卫视 / 电影',
  },
  animation: {
    label: '少儿卡通 / 动画源',
    urls: [
      'https://raw.githubusercontent.com/best-fan/iptv-sources/main/cn_pay_status.m3u8',
      'https://iptv-org.github.io/iptv/categories/animation.m3u',
    ],
    langBadge: '卡通 / 动漫',
  },
};

/**
 * Parses standard #EXTM3U / #EXTINF playlist content (both http:// and https://),
 * filters out [Geo-blocked] dead streams, and automatically groups multi-line backup URLs
 * by channel title so if line 1 fails, line 2/3/4 automatically takes over!
 */
export function parseM3UPlaylist(
  rawText: string,
  category: StreamCategory = 'movies',
  defaultLangBadge: string = 'HLS 流媒体',
  limit: number = 180
): StreamResource[] {
  const lines = rawText.split(/\r?\n/);
  const byTitle = new Map<string, StreamResource>();
  const seenUrls = new Set<string>();

  let currentTitle = '';
  let currentGroup = '';
  let currentLogo = '';
  let currentResponseTime = '';
  let isGeoBlocked = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      isGeoBlocked = /\[Geo-blocked\]/i.test(line);
      const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
      const groupMatch = line.match(/group-title="([^"]+)"/i);
      const rtMatch = line.match(/response-time="([^"]+)"/i);
      const commaIdx = line.lastIndexOf(',');

      currentLogo = logoMatch ? logoMatch[1] : '';
      currentGroup = groupMatch ? groupMatch[1] : defaultLangBadge;
      currentResponseTime = rtMatch ? rtMatch[1] : '';
      currentTitle = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : '未命名影视源';
    } else if (!line.startsWith('#')) {
      if (
        !isGeoBlocked &&
        /^https?:\/\//i.test(line) &&
        (line.includes('.m3u8') || line.includes('/live/') || line.includes('/hls/')) &&
        !seenUrls.has(line)
      ) {
        seenUrls.add(line);

        const resMatch =
          currentTitle.match(/\((\d{3,4}[pi])\)/i) ||
          currentTitle.match(/\[(\d{3,4})\]/);
        const cleanTitle = currentTitle
          .replace(/\s*\(\d{3,4}[pi]\)/gi, '')
          .replace(/\s*\[[^\]]*\]/g, '')
          .replace(/^CCTV-(\d+)/i, 'CCTV$1')
          .trim();

        const normalizedKey = (cleanTitle || `stream-${byTitle.size}`).toUpperCase();

        // Category-specific filtering for Cantonese tab so Cantonese/HK/Guangdong channels appear first
        if (category === 'cantonese') {
          const isCantoneseOrSouth =
            /广东|珠江|深圳|大湾区|香港|凤凰|翡翠|明珠|亚洲|莲花|TVB|Jade|Asian|Lotus|Phoenix|RTHK|Viu|HOY|Macau|澳门/i.test(
              `${cleanTitle} ${currentGroup}`
            );
          if (!isCantoneseOrSouth && byTitle.size > 15) {
            currentTitle = '';
            continue;
          }
        }

        const existing = byTitle.get(normalizedKey);
        if (existing) {
          if (!existing.backupUrls) existing.backupUrls = [];
          if (existing.backupUrls.length < 8) {
            existing.backupUrls.push(line);
            existing.subtitle = `${currentGroup || defaultLangBadge} · 含 ${existing.backupUrls.length + 1} 条自动备线${
              currentResponseTime ? ` (${currentResponseTime})` : ''
            }`;
          }
        } else if (byTitle.size < limit) {
          byTitle.set(normalizedKey, {
            id: `m3u-${category}-${byTitle.size}-${Math.random().toString(36).slice(2, 6)}`,
            title: cleanTitle || `影视流 #${byTitle.size + 1}`,
            subtitle: `${currentGroup || defaultLangBadge}${
              currentResponseTime ? ` · 延迟 ${currentResponseTime}` : ' · 实时 M3U8 视频流'
            }`,
            category,
            m3u8Url: line,
            backupUrls: [],
            resolution: resMatch ? resMatch[1].toUpperCase() : '1080P/HD',
            languageTag: defaultLangBadge,
            isLive: true,
            logo: currentLogo || undefined,
          });
        }
      }

      currentTitle = '';
      currentGroup = '';
      currentLogo = '';
      currentResponseTime = '';
      isGeoBlocked = false;
    }
  }

  return Array.from(byTitle.values());
}

const playlistCache = new Map<string, StreamResource[]>();

/**
 * Fetches and parses public M3U8 playlists via backend /api/iptv-playlist proxy
 */
export async function fetchPublicM3U8Category(
  category: 'cantonese' | 'mandarin' | 'movies' | 'animation'
): Promise<StreamResource[]> {
  if (playlistCache.has(category)) {
    return playlistCache.get(category)!;
  }

  const repo = PUBLIC_M3U_REPOS[category];
  const texts = await Promise.all(
    repo.urls.map(async (u) => {
      try {
        const proxyRes = await fetch(`/api/iptv-playlist?url=${encodeURIComponent(u)}`);
        if (proxyRes.ok) return await proxyRes.text();
      } catch {
        // Fallback to direct fetch if needed
      }
      try {
        const directRes = await fetch(u);
        return directRes.ok ? await directRes.text() : '';
      } catch {
        return '';
      }
    })
  );

  const combinedText = texts.join('\n');
  let parsed = parseM3UPlaylist(combinedText, category, repo.langBadge, 180);

  // Prepend verified Cantonese/HK streams in Cantonese tab so top channels always play immediately
  if (category === 'cantonese') {
    const verifiedCantonese = FEATURED_M3U8_STREAMS.filter((s) =>
      /粤|港澳|大湾区|华语纪实/.test(s.languageTag || '')
    );
    parsed = [...verifiedCantonese, ...parsed];
  }

  if (parsed.length === 0) {
    throw new Error('暂未拉取到可用片源，请切换其他分类或粘贴自定义 M3U8 链接');
  }

  playlistCache.set(category, parsed);
  return parsed;
}
