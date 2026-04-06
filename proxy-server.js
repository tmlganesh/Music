/**
 * Local CORS proxy server for development with CACHING & RATE-LIMIT handling.
 * Proxies requests from http://localhost:3999/api/* to https://saavn.sumit.co/api/*
 * - Caches successful responses for 5 minutes to avoid rate limits
 * - Queues requests with 500ms gap to avoid upstream 429s
 * - Returns cached data when rate-limited
 *
 * Usage: node proxy-server.js
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

const TARGET_HOST = 'saavn.sumit.co';
const PROXY_PORT = 3999;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_REQUEST_GAP_MS = 600; // Minimum gap between upstream requests

// In-memory cache
const cache = new Map();
let lastRequestTime = 0;
let requestQueue = Promise.resolve();

function getCacheKey(path) {
  return path;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchFromUpstream(targetPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: TARGET_HOST,
      port: 443,
      path: targetPath,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'LokoMusic/1.0',
      },
    };

    const proxyReq = https.request(options, (proxyRes) => {
      const chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks);
        resolve({
          statusCode: proxyRes.statusCode,
          headers: proxyRes.headers,
          body,
        });
      });
    });

    proxyReq.on('error', (err) => reject(err));
    proxyReq.end();
  });
}

const server = http.createServer(async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PROXY_PORT}`);
  const targetPath = parsedUrl.pathname + parsedUrl.search;
  const cacheKey = getCacheKey(targetPath);

  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[CACHE HIT] ${targetPath}`);
    const headers = { ...cached.headers };
    headers['access-control-allow-origin'] = '*';
    headers['x-cache'] = 'HIT';
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    res.writeHead(cached.statusCode, headers);
    res.end(cached.body);
    return;
  }

  // Throttle upstream requests
  const gate = requestQueue.then(async () => {
    const now = Date.now();
    const elapsed = now - lastRequestTime;
    if (elapsed < MIN_REQUEST_GAP_MS) {
      await sleep(MIN_REQUEST_GAP_MS - elapsed);
    }
    lastRequestTime = Date.now();
  });
  requestQueue = gate.catch(() => undefined);
  await gate;

  console.log(`[PROXY] ${req.method} ${targetPath}`);

  try {
    const upstream = await fetchFromUpstream(targetPath);

    if (upstream.statusCode === 429) {
      // Rate limited — serve stale cache if available
      if (cached) {
        console.log(`[429 → STALE CACHE] ${targetPath}`);
        const headers = { ...cached.headers };
        headers['access-control-allow-origin'] = '*';
        headers['x-cache'] = 'STALE';
        delete headers['x-frame-options'];
        delete headers['content-security-policy'];
        res.writeHead(cached.statusCode, headers);
        res.end(cached.body);
        return;
      }

      // No cache available — forward the 429
      console.log(`[429 NO CACHE] ${targetPath}`);
      const headers = { ...upstream.headers };
      headers['access-control-allow-origin'] = '*';
      delete headers['x-frame-options'];
      delete headers['content-security-policy'];
      res.writeHead(429, headers);
      res.end(upstream.body);
      return;
    }

    // Cache successful responses
    if (upstream.statusCode >= 200 && upstream.statusCode < 300) {
      cache.set(cacheKey, {
        statusCode: upstream.statusCode,
        headers: upstream.headers,
        body: upstream.body,
        timestamp: Date.now(),
      });

      // Limit cache size
      if (cache.size > 500) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
    }

    const headers = { ...upstream.headers };
    delete headers['x-frame-options'];
    delete headers['content-security-policy'];
    headers['access-control-allow-origin'] = '*';
    headers['x-cache'] = 'MISS';

    res.writeHead(upstream.statusCode, headers);
    res.end(upstream.body);
  } catch (err) {
    console.error('[PROXY ERROR]', err.message);

    // On network error, try stale cache
    if (cached) {
      console.log(`[ERROR → STALE CACHE] ${targetPath}`);
      const headers = { ...cached.headers };
      headers['access-control-allow-origin'] = '*';
      headers['x-cache'] = 'STALE';
      res.writeHead(cached.statusCode, headers);
      res.end(cached.body);
      return;
    }

    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`\n🎵 Loko CORS Proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`   Proxying /api/* → https://${TARGET_HOST}/api/*`);
  console.log(`   Cache TTL: ${CACHE_TTL_MS / 1000}s | Request gap: ${MIN_REQUEST_GAP_MS}ms\n`);
});
