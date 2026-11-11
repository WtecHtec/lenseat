/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'aether_cinema_api_base_url';
const API_URL_CHANGE_EVENT = 'aether_api_config_changed';

/**
 * Normalizes an API base URL by trimming whitespace and removing trailing slashes.
 */
export function normalizeApiBaseUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/\/+$/, '');
}

/**
 * Gets the current API base URL.
 * Priority:
 * 1. User configured non-empty value in localStorage
 * 2. Vite environment variable `VITE_API_BASE_URL` (from .env / .env.local)
 * 3. Default empty string '' (uses relative path /api)
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null && stored.trim() !== '') {
      return normalizeApiBaseUrl(stored);
    }
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  return normalizeApiBaseUrl(envUrl || '');
}

/**
 * Gets the raw Vite environment variable value.
 */
export function getEnvApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL || '');
}

/**
 * Saves the user-configured API base URL to localStorage and notifies listeners.
 * Pass empty string to reset to default.
 */
export function setApiBaseUrl(newUrl: string): void {
  const normalized = normalizeApiBaseUrl(newUrl);
  if (typeof window !== 'undefined') {
    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(
      new CustomEvent(API_URL_CHANGE_EVENT, {
        detail: { apiBaseUrl: normalized },
      })
    );
  }
}

/**
 * Resolves a given API endpoint path against the configured API Base URL.
 * If path is already an absolute URL (http:// or https://), returns it unchanged.
 */
export function getApiUrl(path: string): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const base = getApiBaseUrl();
  if (!base) {
    return path.startsWith('/') ? path : `/${path}`;
  }

  const formattedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${formattedPath}`;
}

/**
 * Tests connection to the backend server health check endpoint.
 */
export async function testServerConnection(targetUrl?: string): Promise<{
  ok: boolean;
  message: string;
  latency?: number;
  data?: unknown;
}> {
  const base = targetUrl !== undefined ? normalizeApiBaseUrl(targetUrl) : getApiBaseUrl();
  const testEndpoint = base ? `${base}/api/health` : '/api/health';

  // Check for Mixed Content block (HTTPS page requesting HTTP API)
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    testEndpoint.startsWith('http://')
  ) {
    return {
      ok: false,
      latency: 0,
      message:
        'Mixed Content 拦截：当前页面运行在 HTTPS 下，浏览器禁止请求不安全的 HTTP 接口。请将后端配置为 HTTPS 或使用反向代理。',
    };
  }

  const startTime = performance.now();
  try {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 6000);

    const res = await fetch(testEndpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      signal: controller.signal,
    });
    window.clearTimeout(timeoutId);

    const latency = Math.round(performance.now() - startTime);

    if (res.ok) {
      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        // Response was text
      }
      return {
        ok: true,
        latency,
        message: `连接成功 (延迟 ${latency}ms)`,
        data,
      };
    } else {
      return {
        ok: false,
        latency,
        message: `服务端响应异常 HTTP ${res.status}: ${res.statusText}`,
      };
    }
  } catch (err) {
    const latency = Math.round(performance.now() - startTime);
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        ok: false,
        latency,
        message: '连接超时 (超过 6 秒未响应)，请检查服务端是否已启动并在监听该端口',
      };
    }
    return {
      ok: false,
      latency,
      message:
        err instanceof Error
          ? `连接失败: ${err.message}`
          : '无法连接到服务端，请检查跨域配置与服务状态',
    };
  }
}

/**
 * React hook to read and update API base URL reactively.
 */
export function useApiConfig() {
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(() => getApiBaseUrl());

  useEffect(() => {
    const handleUrlChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ apiBaseUrl: string }>;
      setApiBaseUrlState(customEvent.detail?.apiBaseUrl ?? getApiBaseUrl());
    };

    window.addEventListener(API_URL_CHANGE_EVENT, handleUrlChange);
    window.addEventListener('storage', handleUrlChange);

    return () => {
      window.removeEventListener(API_URL_CHANGE_EVENT, handleUrlChange);
      window.removeEventListener('storage', handleUrlChange);
    };
  }, []);

  const updateApiBaseUrl = (url: string) => {
    setApiBaseUrl(url);
    setApiBaseUrlState(normalizeApiBaseUrl(url));
  };

  const isCustomConfigured =
    typeof window !== 'undefined' &&
    Boolean(window.localStorage.getItem(STORAGE_KEY)?.trim());

  return {
    apiBaseUrl,
    setApiBaseUrl: updateApiBaseUrl,
    isCustomConfigured,
    envApiBaseUrl: getEnvApiBaseUrl(),
  };
}

