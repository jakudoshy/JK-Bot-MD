import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const pagePath = path.join(__dirname, 'index.html');
let state = { status: 'starting', connected: false, bot: 'ᴊᴋ ʙᴏᴛꫂꤪꤨᴼᶠᶜ', owner: 'ᴍᴏᴅ ʙʏ ᴊᴀᴋᴜᴅᴏѕʜʏꫂꤪꤨᴼᶠᶜ', updatedAt: new Date().toISOString() };
let server;

export function setWebStatus(next = {}) {
  state = { ...state, ...next, updatedAt: new Date().toISOString() };
}

function commandCatalog() {
  const root = path.join(projectRoot, 'cmds');
  const files = [];
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.js')) files.push(entry.name.replace(/\.js$/, ''));
    }
  };
  walk(root);
  return [...new Set(files)].sort();
}

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store' });
  res.end(body);
}

export function startWebServer(port = Number(process.env.PORT) || 3000) {
  if (server) return server;
  server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      return fs.readFile(pagePath, (error, data) => error ? send(res, 500, 'text/plain', 'Web unavailable') : send(res, 200, 'text/html', data));
    }
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, 'application/json', JSON.stringify({ ok: true, service: 'jk-bot', ...state }));
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, 'application/json', JSON.stringify(state));
    if (req.method === 'GET' && url.pathname === '/api/commands') return send(res, 200, 'application/json', JSON.stringify({ total: commandCatalog().length, commands: commandCatalog() }));
    if (req.method === 'GET' && url.pathname === '/favicon.ico') return send(res, 204, 'text/plain', '');
    return send(res, 404, 'application/json', JSON.stringify({ error: 'Not found' }));
  });
  server.listen(port, '0.0.0.0', () => console.log(`[WEB] JK Bot activo en 0.0.0.0:${port}`));
  server.on('error', error => console.error('[WEB] Error:', error.message));
  return server;
}
