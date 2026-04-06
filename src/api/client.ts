import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';

/**
 * API Client for JioSaavn API (https://saavn.sumit.co)
 *
 * Strategy:
 * - Native (Android/iOS): Direct API calls to https://saavn.sumit.co
 * - Web (dev): Tries local CORS proxy at http://localhost:3999 first.
 *   If unavailable, falls back to external CORS proxies targeting the
 *   REAL API (saavn.sumit.co), NOT localhost.
 * - Web (production): External CORS proxies
 *
 * Run: node proxy-server.js (in project root) for local dev proxy.
 */

const DIRECT_API_BASE_URL = 'https://saavn.sumit.co';
const LOCAL_PROXY_URL = 'http://localhost:3999';

// Detect web dev environment
const isWeb = Platform.OS === 'web';
const isWebDev =
  isWeb &&
  typeof window !== 'undefined' &&
  (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1');
const preferLocalProxy =
  isWebDev &&
  (process.env.EXPO_PUBLIC_USE_LOCAL_PROXY === '1' ||
    process.env.EXPO_PUBLIC_USE_LOCAL_PROXY === 'true');

// External CORS proxies — used when local proxy is down, or in production web.
// These must proxy requests to the REAL API (saavn.sumit.co), NOT localhost.
const WEB_CORS_PROXIES = [
  {
    name: 'corsproxy-io',
    buildUrl: (targetUrl: string) => `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
  },
  {
    name: 'cors-anywhere-herokuapp',
    buildUrl: (targetUrl: string) => `https://cors-anywhere.herokuapp.com/${targetUrl}`,
  },
  {
    name: 'allorigins',
    buildUrl: (targetUrl: string) =>
      `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  },
];

type ProxyConfig = (typeof WEB_CORS_PROXIES)[number] | null;

type RequestWithMeta = InternalAxiosRequestConfig & {
  __retryCount?: number;
  __targetUrl?: string;
  __proxyIndex?: number;
  __proxyConfig?: ProxyConfig;
  __useLocalProxy?: boolean;
};

/**
 * Determine the initial base URL based on platform:
 * - Web dev: local proxy (http://localhost:3999)
 * - Native: direct API
 */
const getBaseUrl = (): string => {
  if (preferLocalProxy) return LOCAL_PROXY_URL;
  return DIRECT_API_BASE_URL;
};

const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const MIN_REQUEST_GAP_MS = 500;
const MAX_RETRIES = 1;

let lastRequestTimestamp = 0;
let requestQueue: Promise<void> = Promise.resolve();
let rateLimitBlockedUntil = 0;
let localProxyAvailable: boolean | null = null;
let activeProxyIndex = 0;
let workingProxyIndex: number | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getApiCooldownRemainingMs = (): number =>
  Math.max(0, rateLimitBlockedUntil - Date.now());

export const isApiCooldownActive = (): boolean => getApiCooldownRemainingMs() > 0;

export const resetApiCooldown = (): void => {
  rateLimitBlockedUntil = 0;
};

const appendQueryParams = (url: URL, params: unknown) => {
  if (!params || typeof params !== 'object') return;
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null) {
          url.searchParams.append(key, String(item));
        }
      });
      return;
    }
    url.searchParams.set(key, String(value));
  });
};

/**
 * Check if the local proxy is running (on first request)
 */
const checkLocalProxy = async (): Promise<boolean> => {
  if (localProxyAvailable !== null) return localProxyAvailable;
  if (!preferLocalProxy) {
    localProxyAvailable = false;
    return false;
  }

  try {
    const response = await fetch(`${LOCAL_PROXY_URL}/api/search/songs?query=test&limit=1`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });
    localProxyAvailable = response.ok || response.status === 429;
    if (localProxyAvailable) {
      console.log('✅ Local CORS proxy available at', LOCAL_PROXY_URL);
    }
    return localProxyAvailable;
  } catch {
    console.log('⚠️ Local CORS proxy not available, falling back to external CORS proxies → saavn.sumit.co');
    localProxyAvailable = false;
    return false;
  }
};

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isApiCooldownActive()) {
    const remaining = getApiCooldownRemainingMs();
    if (remaining < 5000) {
      await sleep(remaining + 50);
    }
  }

  // Throttle
  const gate = requestQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTimestamp;
    if (elapsed < MIN_REQUEST_GAP_MS) {
      await sleep(MIN_REQUEST_GAP_MS - elapsed);
    }
    lastRequestTimestamp = Date.now();
  });
  requestQueue = gate.catch(() => undefined);
  await gate;

  const requestConfig = config as RequestWithMeta;

  if (isWebDev) {
    if (preferLocalProxy) {
      // Check if local proxy is available
      const proxyUp = await checkLocalProxy();
      if (proxyUp) {
        // Local proxy is running — use it (baseURL is already set to LOCAL_PROXY_URL)
        requestConfig.__useLocalProxy = true;
        return config;
      }
      // Local proxy not available — fall through to CORS proxy logic.
      // CRITICAL FIX: We must NOT use LOCAL_PROXY_URL as baseURL for CORS proxies.
      // We need to build the target URL using the REAL API base.
    }
  }

  // Web (production or dev without local proxy): use CORS proxies
  if (isWeb && requestConfig.url) {
    // CRITICAL: Always use the DIRECT API base URL for CORS proxy targets,
    // never localhost (which external proxies can't reach).
    const base = DIRECT_API_BASE_URL;
    const isAbsolute = /^https?:\/\//i.test(requestConfig.url);

    // If the URL starts with LOCAL_PROXY_URL, strip it and use DIRECT_API_BASE_URL
    let cleanUrl = requestConfig.url;
    if (cleanUrl.startsWith(LOCAL_PROXY_URL)) {
      cleanUrl = cleanUrl.replace(LOCAL_PROXY_URL, '');
    }

    const absoluteTarget = isAbsolute
      ? cleanUrl.replace(LOCAL_PROXY_URL, DIRECT_API_BASE_URL) // Fix localhost refs
      : `${base.replace(/\/$/, '')}/${cleanUrl.replace(/^\//, '')}`;

    const targetUrl = requestConfig.__targetUrl
      ? new URL(requestConfig.__targetUrl)
      : new URL(absoluteTarget);
    if (!requestConfig.__targetUrl) {
      appendQueryParams(targetUrl, requestConfig.params);
      requestConfig.__targetUrl = targetUrl.toString();
    }

    const startIndex =
      requestConfig.__proxyIndex ?? workingProxyIndex ?? activeProxyIndex;
    const proxyIndex = Math.min(startIndex, WEB_CORS_PROXIES.length - 1);
    requestConfig.__proxyIndex = proxyIndex;
    const proxy = WEB_CORS_PROXIES[proxyIndex];
    requestConfig.__proxyConfig = proxy;

    requestConfig.baseURL = undefined;
    requestConfig.params = undefined;
    requestConfig.url = proxy.buildUrl(requestConfig.__targetUrl);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const responseConfig = response.config as RequestWithMeta;

    if (isWeb && typeof responseConfig.__proxyIndex === 'number') {
      workingProxyIndex = responseConfig.__proxyIndex;
      activeProxyIndex = responseConfig.__proxyIndex;
    }

    // Handle allorigins /get wrapper (if using the /get endpoint with unwrap)
    if (
      responseConfig.__proxyConfig?.name === 'allorigins' &&
      response.data?.contents
    ) {
      try {
        const parsed =
          typeof response.data.contents === 'string'
            ? JSON.parse(response.data.contents)
            : response.data.contents;
        response.data = parsed;
      } catch {
        return Promise.reject(new Error('Failed to parse allorigins response'));
      }
      return response;
    }

    // Guard against HTML responses
    const contentType = response.headers?.['content-type'];
    if (
      contentType &&
      !contentType.includes('application/json') &&
      !contentType.includes('text/plain')
    ) {
      if (typeof response.data === 'string') {
        try {
          response.data = JSON.parse(response.data);
          return response;
        } catch {
          /* not JSON */
        }
      }
      return Promise.reject(new Error(`Expected JSON but got ${contentType}`));
    }

    // If response.data is a string, try to parse it as JSON (some proxies return raw text)
    if (typeof response.data === 'string') {
      try {
        response.data = JSON.parse(response.data);
      } catch {
        /* keep as string */
      }
    }

    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RequestWithMeta | undefined;
    const status = error.response?.status;

    // 429 retry with backoff (works for both local proxy and direct)
    if (status === 429 && config) {
      config.__retryCount = config.__retryCount ?? 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        const delay = 1500 * config.__retryCount;
        console.log(`Rate limited (429), retrying in ${delay}ms...`);
        await sleep(delay);
        return apiClient.request(config);
      }
      rateLimitBlockedUntil = Date.now() + 5000;
    }

    // Web CORS proxy cycling (production web or when local proxy is down)
    const isCorsProxyRequest = isWeb && !!config?.__targetUrl && !config.__useLocalProxy;
    if (isCorsProxyRequest && config) {
      const currentProxy = config.__proxyIndex ?? 0;
      const nextProxy = currentProxy + 1;
      const isServerError = typeof status === 'number' && status >= 500;
      const shouldTryNextProxy =
        status === 429 || status === 403 || status === 400 || isServerError || !error.response;

      if (shouldTryNextProxy && nextProxy < WEB_CORS_PROXIES.length) {
        console.log(
          `CORS proxy "${WEB_CORS_PROXIES[currentProxy].name}" failed (${status || 'network'}), trying "${WEB_CORS_PROXIES[nextProxy].name}"...`
        );
        config.__proxyIndex = nextProxy;
        config.__retryCount = 0;
        config.__proxyConfig = WEB_CORS_PROXIES[nextProxy];
        // Rebuild the URL with the new proxy
        config.url = WEB_CORS_PROXIES[nextProxy].buildUrl(config.__targetUrl!);
        config.baseURL = undefined;
        config.params = undefined;
        await sleep(300);
        return apiClient.request(config);
      }

      // All proxies exhausted — try a direct fetch as last resort
      if (shouldTryNextProxy && config.__targetUrl) {
        try {
          console.log('All CORS proxies exhausted, attempting direct fetch...');
          const directResponse = await fetch(config.__targetUrl, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
          });
          if (directResponse.ok) {
            const data = await directResponse.json();
            return { data, status: 200, statusText: 'OK', headers: {}, config } as any;
          }
        } catch (directErr) {
          console.log('Direct fetch also failed:', directErr);
        }
      }
    }

    // 5xx retry
    if (config && status !== undefined && status >= 500) {
      config.__retryCount = config.__retryCount ?? 0;
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount += 1;
        await sleep(500 * config.__retryCount);
        return apiClient.request(config);
      }
    }

    if (error.response) {
      console.warn(`API request failed [${error.response.status}] after retries/fallbacks.`);
    } else if (error.request) {
      console.warn('API network request failed after retries/fallbacks.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
