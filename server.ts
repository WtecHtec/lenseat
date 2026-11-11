import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

/**
 * Rewrites all relative/absolute URLs inside an HLS .m3u8 manifest
 * so every sub-playlist, .ts/.m4s segment, and #EXT-X-KEY/#EXT-X-MAP URI
 * routes cleanly through /api/hls-proxy without CORS or Mixed-Content blocks.
 */
function rewriteM3u8Manifest(rawManifest: string, baseUrl: string): string {
  const lines = rawManifest.split(/\r?\n/);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      out.push('');
      continue;
    }

    if (trimmed.startsWith('#')) {
      // Rewrite URI="..." inside tags such as #EXT-X-KEY, #EXT-X-MAP, #EXT-X-MEDIA
      const rewrittenTag = trimmed.replace(/URI="([^"]+)"/gi, (_match, uriVal: string) => {
        try {
          const resolved = new URL(uriVal, baseUrl).toString();
          return `URI="hls-proxy?url=${encodeURIComponent(resolved)}"`;
        } catch {
          return _match;
        }
      });
      out.push(rewrittenTag);
    } else {
      try {
        const resolved = new URL(trimmed, baseUrl).toString();
        out.push(`hls-proxy?url=${encodeURIComponent(resolved)}`);
      } catch {
        out.push(trimmed);
      }
    }
  }

  return out.join('\n');
}

async function startServer() {
  const app = express();

  // 0. Comprehensive CORS Middleware & Preflight Handling
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization'
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Length, Content-Range, Accept-Ranges, Content-Type'
    );
    if (req.headers.origin) {
      res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Health check endpoint for connection tests and status verification
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'aether-cinema-api',
      uptime: Math.round(process.uptime()),
      timestamp: Date.now(),
    });
  });

  // 1. Server-side IPTV playlist fetcher (solves CORS & Mixed Content for .m3u/.m3u8 lists)
  app.get('/api/iptv-playlist', async (req, res) => {
    const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      res.status(400).json({ error: 'Invalid playlist URL' });
      return;
    }

    try {
      const upstream = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(9000),
      });

      if (!upstream.ok) {
        res.status(upstream.status).json({ error: `Upstream HTTP ${upstream.status}` });
        return;
      }

      const text = await upstream.text();
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(text);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to fetch playlist',
      });
    }
  });

  // 2. High-speed HLS (.m3u8 + .ts/.m4s/.aac) Stream Proxy
  app.get('/api/hls-proxy', async (req, res) => {
    const targetUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      res.status(400).send('Invalid target URL');
      return;
    }

    try {
      let parsedOrigin = '';
      try {
        parsedOrigin = new URL(targetUrl).origin;
      } catch {
        parsedOrigin = '';
      }

      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
          Accept: '*/*',
          ...(parsedOrigin ? { Referer: `${parsedOrigin}/` } : {}),
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(9000),
      });

      if (!upstream.ok) {
        res.status(upstream.status).send(`Upstream error ${upstream.status}`);
        return;
      }

      const finalBaseUrl = upstream.url || targetUrl;
      const contentType = (upstream.headers.get('content-type') || '').toLowerCase();

      const isKnownBinarySegment =
        /\.(ts|m4s|mp4|aac|mp3)(\?|$)/i.test(finalBaseUrl) ||
        contentType.includes('video/mp2t') ||
        contentType.includes('video/mp4') ||
        contentType.includes('video/iso.segment') ||
        contentType.includes('audio/');

      if (isKnownBinarySegment && upstream.body) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', contentType || 'video/mp2t');
        res.setHeader('Cache-Control', 'public, max-age=30');
        const nodeStream = Readable.fromWeb(upstream.body as never);
        nodeStream.on('error', () => {
          if (!res.headersSent) res.status(502).end();
          else res.end();
        });
        nodeStream.pipe(res);
        return;
      }

      // Otherwise inspect buffer to distinguish between #EXTM3U playlist and MPEG-TS (0x47)
      const arrayBuf = await upstream.arrayBuffer();
      const buf = Buffer.from(arrayBuf);

      if (buf.length === 0) {
        res.status(502).send('Empty upstream response');
        return;
      }

      // MPEG-TS sync byte 0x47 check
      if (buf[0] === 0x47 && !buf.subarray(0, 16).toString('utf8').includes('#EXTM3U')) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'video/mp2t');
        res.send(buf);
        return;
      }

      const text = buf.toString('utf8');
      const trimmedStart = text.trimStart();

      if (trimmedStart.startsWith('#EXTM3U')) {
        const rewritten = rewriteM3u8Manifest(text, finalBaseUrl);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.send(rewritten);
        return;
      }

      // Reject HTML error pages masquerading as HTTP 200
      if (/^<!doctype html|^<html/i.test(trimmedStart)) {
        res.status(502).send('Upstream returned HTML instead of HLS stream');
        return;
      }

      // Pass through other binary media data (e.g., fMP4 init segment or AES key)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', contentType || 'application/octet-stream');
      res.send(buf);
    } catch (err) {
      if (!res.headersSent) {
        res.status(502).send(err instanceof Error ? err.message : 'HLS Proxy Error');
      }
    }
  });

  // 3. Mount Vite dev server in development or static dist in production
  const isApiOnly =
    process.env.API_ONLY === 'true' ||
    process.env.STANDALONE === 'true' ||
    process.argv.includes('--api-only');

  if (isApiOnly) {
    console.log('[Aether Cinema] Running in Standalone API-only mode (Vite client excluded)');
  } else if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `Aether Cinema Server & HLS Proxy listening on http://0.0.0.0:${PORT} [${
        isApiOnly ? 'Standalone API' : 'Fullstack'
      }] (CORS Enabled)`
    );
  });
}

startServer();
