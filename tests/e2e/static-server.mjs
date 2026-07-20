import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, normalize, resolve } from 'node:path';

const port = Number(process.argv[process.argv.indexOf('--port') + 1] ?? 8081);
const root = resolve(process.cwd(), 'app/dist');
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function resolveAsset(pathname) {
  const decoded = decodeURIComponent(pathname);
  const route = decoded === '/' ? '/index.html' : decoded;
  const relative = normalize(route).replace(/^[/\\]+/, '');
  const candidate = resolve(root, relative);
  if (!candidate.startsWith(`${root}/`)) return null;
  if (existsSync(candidate)) return candidate;
  if (!extname(candidate) && existsSync(`${candidate}.html`)) return `${candidate}.html`;
  return resolve(root, 'index.html');
}

createServer((request, response) => {
  const asset = resolveAsset(new URL(request.url ?? '/', 'http://localhost').pathname);
  if (!asset) {
    response.writeHead(403).end();
    return;
  }
  response.writeHead(200, {
    'content-type': contentTypes[extname(asset)] ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(asset).pipe(response);
})
  .listen(port, '127.0.0.1', () => {
    process.stdout.write(`Fixture E2E server listening on http://127.0.0.1:${port}\n`);
  });
