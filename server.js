const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT       = 3000;
const DB_FILE    = path.join(__dirname, 'scores.json');
const PUBLIC_DIR = __dirname;

// ── DB helpers ────────────────────────────────────────────────────────────────
function loadScores() {
  if (!fs.existsSync(DB_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { return []; }
}

function saveScores(scores) {
  fs.writeFileSync(DB_FILE, JSON.stringify(scores, null, 2), 'utf8');
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // ── CORS helper ─────────────────────────────────────────────────────────────
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // ── GET /api/scores ─────────────────────────────────────────────────────────
  if (req.method === 'GET' && url.pathname === '/api/scores') {
    const scores = loadScores()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(scores));
  }

  // ── POST /api/scores ────────────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/scores') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const { name, score } = JSON.parse(body);
        if (!name || typeof score !== 'number') throw new Error('invalid');

        const scores = loadScores();
        const existing = scores.find(e => e.name.toLowerCase() === name.toLowerCase());

        if (existing) {
          if (score > existing.score) {
            existing.score = score;
            existing.date  = new Date().toISOString().slice(0,10);
          }
        } else {
          scores.push({
            name: name.slice(0, 20),
            score,
            date: new Date().toISOString().slice(0,10),
          });
        }
        saveScores(scores);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false }));
      }
    });
    return;
  }

  // ── Static files ─────────────────────────────────────────────────────────────
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  // Sicherheit: nur innerhalb PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  const ext = path.extname(filePath).toLowerCase();
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`dackel-Slots Server läuft auf http://localhost:${PORT}`);
  console.log(`Scores werden gespeichert in: ${DB_FILE}`);
});
