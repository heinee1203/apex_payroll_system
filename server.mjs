import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const databaseUrl = process.env.DATABASE_URL || '';
const sessionSecret = process.env.SESSION_SECRET || databaseUrl || process.env.RAILWAY_ENVIRONMENT_ID || 'apex-payroll-local-session';
const secureCookies = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID || process.env.NODE_ENV === 'production');

const AUTH_EMAIL = 'admin@apex.com';
const AUTH_PASSWORD_HASH = 'b45a3bb8623d2ac9c258d2f7477bb42d32db59e7f94f2d493b3cdf5626e65136';
const COOKIE_NAME = 'apex_payroll_session';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const WORKSPACE_ID = 'default';
const MAX_JSON_BODY_BYTES = 30 * 1024 * 1024;

const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

let databaseInitialized = false;
let databaseInitPromise = null;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gz': 'application/gzip',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

function resolveAssetPath(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  const requestedPath = normalize(join(root, pathname));
  const isInsideRoot = requestedPath === root || requestedPath.startsWith(root + sep);

  if (!isInsideRoot) {
    return null;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  return join(root, 'index.html');
}

async function ensureDatabase() {
  if (!pool) {
    throw new Error('DATABASE_URL is not configured');
  }

  if (databaseInitialized) return;
  if (!databaseInitPromise) {
    databaseInitPromise = pool.query(`
      CREATE TABLE IF NOT EXISTS workspace_documents (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  await databaseInitPromise;
  databaseInitialized = true;
}

async function readJsonBody(request) {
  const rawBody = await new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;

    request.on('data', (chunk) => {
      size += chunk.length;

      if (size > MAX_JSON_BODY_BYTES) {
        const error = new Error('Request body too large');
        error.statusCode = 413;
        rejectBody(error);
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on('end', () => {
      resolveBody(Buffer.concat(chunks).toString('utf8'));
    });
    request.on('error', rejectBody);
  });

  if (!rawBody) return null;
  return JSON.parse(rawBody);
}

function sendJson(response, statusCode, payload, headers = {}) {
  response.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function sendNoContent(response, headers = {}) {
  response.writeHead(204, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end();
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signPayload(payload) {
  return createHmac('sha256', sessionSecret).update(payload).digest('base64url');
}

function createSessionToken(email) {
  const payload = Buffer.from(JSON.stringify({
    email,
    expiresAt: Date.now() + COOKIE_MAX_AGE_SECONDS * 1000,
  })).toString('base64url');

  return `${payload}.${signPayload(payload)}`;
}

function verifySessionToken(token) {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, signPayload(payload))) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return session.email === AUTH_EMAIL && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

function parseCookies(request) {
  const cookieHeader = request.headers.cookie || '';
  const cookies = new Map();

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) continue;
    cookies.set(rawName, decodeURIComponent(rawValue.join('=')));
  }

  return cookies;
}

function isAuthenticated(request) {
  const token = parseCookies(request).get(COOKIE_NAME);
  return Boolean(token && verifySessionToken(token));
}

function sessionCookie(token) {
  return [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    secureCookies ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

function expiredSessionCookie() {
  return [
    `${COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    secureCookies ? 'Secure' : '',
  ].filter(Boolean).join('; ');
}

async function handleApi(request, response) {
  const { pathname } = new URL(request.url || '/', 'http://localhost');

  try {
    if (request.method === 'OPTIONS') {
      sendNoContent(response);
      return;
    }

    if (pathname === '/api/health' && request.method === 'GET') {
      try {
        await ensureDatabase();
        await pool.query('SELECT 1');
        sendJson(response, 200, { ok: true, database: 'ready' });
      } catch (error) {
        sendJson(response, 503, {
          ok: false,
          database: pool ? 'error' : 'missing',
          error: error.message,
        });
      }
      return;
    }

    if (pathname === '/api/session' && request.method === 'GET') {
      sendJson(response, 200, { authenticated: isAuthenticated(request) });
      return;
    }

    if (pathname === '/api/login' && request.method === 'POST') {
      const body = await readJsonBody(request);
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      const valid = email === AUTH_EMAIL && safeEqual(hashPassword(password), AUTH_PASSWORD_HASH);

      if (!valid) {
        sendJson(response, 401, { error: 'Invalid username or password' });
        return;
      }

      sendJson(response, 200, { authenticated: true }, {
        'Set-Cookie': sessionCookie(createSessionToken(AUTH_EMAIL)),
      });
      return;
    }

    if (pathname === '/api/logout' && request.method === 'POST') {
      sendJson(response, 200, { authenticated: false }, {
        'Set-Cookie': expiredSessionCookie(),
      });
      return;
    }

    if (pathname === '/api/workspace' && (request.method === 'GET' || request.method === 'PUT')) {
      if (!isAuthenticated(request)) {
        sendJson(response, 401, { error: 'Authentication required' });
        return;
      }

      await ensureDatabase();

      if (request.method === 'GET') {
        const result = await pool.query(
          'SELECT data, updated_at FROM workspace_documents WHERE id = $1',
          [WORKSPACE_ID]
        );
        const row = result.rows[0];
        sendJson(response, 200, {
          workspace: row?.data ?? null,
          updatedAt: row?.updated_at ?? null,
        });
        return;
      }

      const body = await readJsonBody(request);
      const workspace = body?.workspace;

      if (!workspace || typeof workspace !== 'object' || Array.isArray(workspace)) {
        sendJson(response, 400, { error: 'Workspace JSON is required' });
        return;
      }

      const result = await pool.query(
        `INSERT INTO workspace_documents (id, data, updated_at)
         VALUES ($1, $2::jsonb, now())
         ON CONFLICT (id)
         DO UPDATE SET data = EXCLUDED.data, updated_at = now()
         RETURNING updated_at`,
        [WORKSPACE_ID, JSON.stringify(workspace)]
      );

      sendJson(response, 200, {
        ok: true,
        updatedAt: result.rows[0]?.updated_at ?? null,
      });
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    const statusCode = Number(error.statusCode) || (error instanceof SyntaxError ? 400 : 500);
    sendJson(response, statusCode, { error: error.message || 'Server error' });
  }
}

createServer((request, response) => {
  const { pathname } = new URL(request.url || '/', 'http://localhost');

  if (pathname.startsWith('/api/')) {
    void handleApi(request, response);
    return;
  }

  const assetPath = resolveAssetPath(request.url || '/');

  if (!assetPath || !existsSync(assetPath)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'Cache-Control': assetPath.includes(`${sep}assets${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
    'Content-Type': mimeTypes[extname(assetPath)] || 'application/octet-stream',
  });

  createReadStream(assetPath).pipe(response);
}).listen(port, '0.0.0.0', () => {
  console.log(`Apex Payroll listening on port ${port}`);
});
