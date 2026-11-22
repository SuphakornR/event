/* HelpDai Backend & SQLite Database Server (Zero-Dependency Node v22+ / v26) */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

// Simple in-memory IP rate limiter for write endpoints (max 60 writes / 60s)
const rateMap = new Map();
function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateMap.get(ip) || { count: 0, resetAt: now + 60000 };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 60000;
  }
  entry.count++;
  rateMap.set(ip, entry);
  if (rateMap.size > 5000) rateMap.clear();
  return entry.count > 60;
}

function sanitizeRoomPayload(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.teams) || !Array.isArray(raw.games)) {
    return null;
  }
  if (raw.teams.length < 2 || raw.teams.length > 8 || raw.games.length < 1 || raw.games.length > 6) {
    return null;
  }
  const cleanStr = (v, max = 120) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, max);
  const cleanUrl = (v) => {
    const s = cleanStr(v, 500000);
    if (!s) return '';
    if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(s)) return s;
    try {
      const u = new URL(s);
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch {
      return '';
    }
  };

  return {
    eventTitle: cleanStr(raw.eventTitle || 'HelpDai Stage', 100),
    eventSubtitle: cleanStr(raw.eventSubtitle || '', 160),
    games: raw.games.slice(0, 6).map((g, i) => cleanStr(g, 80) || `Activity ${i + 1}`),
    gameMedia: Array.from({ length: raw.games.length }, (_, i) => {
      const m = Array.isArray(raw.gameMedia) ? raw.gameMedia[i] : {};
      return {
        description: cleanStr(m?.description || '', 1500),
        youtubeUrl: cleanUrl(m?.youtubeUrl || ''),
        imageData: cleanUrl(m?.imageData || ''),
        activeMediaType: m?.activeMediaType === 'image' ? 'image' : 'video'
      };
    }),
    teams: raw.teams.slice(0, 8).map((t, i) => ({
      id: cleanStr(t?.id || `team-${i + 1}`, 40),
      name: cleanStr(t?.name || `Team ${i + 1}`, 60),
      color: /^#[0-9a-fA-F]{6}$/.test(t?.color || '') ? t.color : '#F4D03F',
      textColor: /^#[0-9a-fA-F]{6}$/.test(t?.textColor || '') ? t.textColor : '#111111',
      scores: Array.from({ length: raw.games.length }, (_, gi) => {
        const n = Number(t?.scores?.[gi]);
        return Number.isFinite(n) ? Math.max(-99999, Math.min(99999, Math.round(n))) : 0;
      })
    })),
    winnerAnnounced: Boolean(raw.winnerAnnounced),
    activeGameAccordion: typeof raw.activeGameAccordion === 'number' ? raw.activeGameAccordion : null,
    isActivityFocused: Boolean(raw.isActivityFocused),
    viewMode: {
      detail: ['full', 'compact', 'simple'].includes(raw.viewMode?.detail) ? raw.viewMode.detail : 'compact',
      layout: ['row', 'grid'].includes(raw.viewMode?.layout) ? raw.viewMode.layout : 'row'
    },
    timer: {
      durationSec: Math.max(5, Math.min(3600, Number(raw.timer?.durationSec) || 180)),
      remainingSec: Math.max(0, Math.min(3600, Number(raw.timer?.remainingSec) || 0)),
      running: Boolean(raw.timer?.running),
      visible: Boolean(raw.timer?.visible),
      mode: raw.timer?.mode === 'center' ? 'center' : 'corner',
      endAt: typeof raw.timer?.endAt === 'number' ? raw.timer.endAt : null,
      timerVersion: Number(raw.timer?.timerVersion) || 0
    }
  };
}

// Initialize SQLite Database
const db = new DatabaseSync(path.join(DATA_DIR, 'helpdai.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS rooms (
    room_id TEXT PRIMARY KEY,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const stmtGetRoom = db.prepare('SELECT room_id, payload, updated_at FROM rooms WHERE room_id = ?');
const stmtPutRoom = db.prepare(`
  INSERT INTO rooms (room_id, payload, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(room_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at
`);
const stmtAddSugg = db.prepare('INSERT INTO suggestions (category, message, created_at) VALUES (?, ?, ?)');
const stmtListSugg = db.prepare('SELECT id, category, message, created_at FROM suggestions ORDER BY id DESC LIMIT 100');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

const sendJson = (res, status, data) => {
  res.writeHead(status, {
    ...SEC_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key'
  });
  res.end(JSON.stringify(data));
};

const readBody = (req, maxBytes = 2 * 1024 * 1024) => new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > maxBytes) {
      reject(new Error('Payload too large'));
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', () => {
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
    } catch {
      reject(new Error('Invalid JSON'));
    }
  });
  req.on('error', reject);
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  // API Routes
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'helpdai-backend', db: 'sqlite' });
  }

  if (pathname === '/api/yt-search' && req.method === 'GET') {
    const clientIp = req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) return sendJson(res, 429, { ok: false, error: 'Too many requests' });
    const q = (url.searchParams.get('q') || '').trim().slice(0, 120);
    if (!q) return sendJson(res, 400, { ok: false, error: 'Missing query' });
    try {
      const ytHtml = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
        signal: AbortSignal.timeout(4500)
      }).then(r => r.text());
      const m = ytHtml.match(/var ytInitialData = (\{.*?\});<\/script>/);
      const data = m ? JSON.parse(m[1]) : null;
      const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
      const items = contents.map(c => c.videoRenderer).filter(Boolean).slice(0, 5).map(v => ({
        id: v.videoId,
        title: v.title?.runs?.[0]?.text || '',
        author: v.ownerText?.runs?.[0]?.text || '',
        thumb: v.thumbnail?.thumbnails?.[0]?.url || ''
      })).filter(it => it.id);
      return sendJson(res, 200, { ok: true, items });
    } catch (err) {
      return sendJson(res, 502, { ok: false, error: err.message, items: [] });
    }
  }

  if (pathname.startsWith('/api/rooms/')) {
    const roomId = decodeURIComponent(pathname.slice('/api/rooms/'.length)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
    if (!roomId) return sendJson(res, 400, { ok: false, error: 'Invalid room ID' });

    if (req.method === 'GET') {
      const row = stmtGetRoom.get(roomId);
      if (!row) return sendJson(res, 404, { ok: false, error: 'Room not found' });
      return sendJson(res, 200, { ok: true, roomId: row.room_id, payload: JSON.parse(row.payload), updatedAt: row.updated_at });
    }

    if (req.method === 'PUT') {
      const clientIp = req.socket?.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) return sendJson(res, 429, { ok: false, error: 'Too many requests' });
      try {
        const body = await readBody(req);
        const cleanPayload = sanitizeRoomPayload(body?.payload ?? body);
        if (!cleanPayload) {
          return sendJson(res, 400, { ok: false, error: 'Invalid or corrupt scoreboard payload' });
        }
        const now = new Date().toISOString();
        stmtPutRoom.run(roomId, JSON.stringify(cleanPayload), now);
        return sendJson(res, 200, { ok: true, roomId, updatedAt: now });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }
  }

  if (pathname === '/api/suggestions') {
    if (req.method === 'GET') {
      if (ADMIN_KEY && req.headers['x-admin-key'] !== ADMIN_KEY) {
        return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
      }
      return sendJson(res, 200, { ok: true, items: stmtListSugg.all() });
    }
    if (req.method === 'POST') {
      const clientIp = req.socket?.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) return sendJson(res, 429, { ok: false, error: 'Too many requests' });
      try {
        const body = await readBody(req, 32 * 1024);
        const category = String(body.category || 'ทั่วไป').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 40);
        const message = String(body.message || '').replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 500);
        if (!message) return sendJson(res, 400, { ok: false, error: 'Message required' });
        const now = new Date().toISOString();
        stmtAddSugg.run(category, message, now);
        return sendJson(res, 201, { ok: true, category, message, createdAt: now });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }
  }

  // Static File Serving (blocks dotfiles, package.json, and /server/*)
  const relPath = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  if (/(^|[\\/])\./.test(safePath) || safePath.startsWith('/server') || safePath.startsWith('\\server') || safePath === '/package.json') {
    res.writeHead(403, SEC_HEADERS);
    return res.end('Forbidden');
  }
  const fullPath = path.join(ROOT_DIR, safePath);
  if (!fullPath.startsWith(ROOT_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    res.writeHead(404, SEC_HEADERS);
    return res.end('Not Found');
  }

  const ext = path.extname(fullPath).toLowerCase();
  res.writeHead(200, { ...SEC_HEADERS, 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(fullPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`HelpDai Backend & SQLite DB running on http://localhost:${PORT}`);
});
