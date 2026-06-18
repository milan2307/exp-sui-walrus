/**
 * serve.js — local dev server for all TradeProof web pages
 *
 * Serves the entire web/ directory.
 *
 * Routes:
 *   /              → web/index.html
 *   /verify/       → web/verify/index.html
 *   /track/        → web/track/index.html
 *   /speedex-pitch → web/speedex-pitch.html
 *
 * Usage: npm run serve   (opens browser automatically)
 */

import { createReadStream, existsSync } from 'node:fs';
import { createServer }                  from 'node:http';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath }                 from 'node:url';
import { exec }                          from 'node:child_process';

const webRoot = join(dirname(dirname(fileURLToPath(import.meta.url))), 'web');
const PORT    = 4174;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
};

const server = createServer((req, res) => {
  let path = new URL(req.url, 'http://localhost').pathname;

  // directory → index.html
  if (path.endsWith('/')) path += 'index.html';

  const abs  = normalize(join(webRoot, path.slice(1)));
  const safe = abs.startsWith(webRoot);

  if (!safe) { res.writeHead(403); res.end('Forbidden'); return; }

  // if file not found and no extension, try .html
  const target = existsSync(abs) ? abs
               : existsSync(abs + '.html') ? abs + '.html'
               : null;

  if (!target) { res.writeHead(404); res.end(`Not found: ${path}`); return; }

  res.writeHead(200, { 'content-type': MIME[extname(target)] ?? 'text/html; charset=utf-8' });
  createReadStream(target).on('error', () => { res.writeHead(500); res.end(); }).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('\n  TradeProof Web Server');
  console.log(`  http://127.0.0.1:${PORT}/\n`);
  console.log(`  /             → landing page`);
  console.log(`  /trade/       → Trade Portal (shippers, forwarders, importers)`);
  console.log(`  /authority/   → Authority Portal (port authorities, shipping lines)`);
  console.log(`  /track/       → Container Track & Trace`);
  console.log(`  /verify/      → Object Verifier`);
  console.log(`  /dashboard/   → Build Dashboard (shareable progress)`);
  console.log(`  /speedex-pitch → Speedex pitch deck\n`);
  exec(`start http://127.0.0.1:${PORT}/`);
});
