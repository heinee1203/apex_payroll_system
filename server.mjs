import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./dist', import.meta.url)));
const port = Number(process.env.PORT || 4173);

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

createServer((request, response) => {
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
