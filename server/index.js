import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHabitRepository } from './habit-repository.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(__dirname);
const dataDir = join(rootDir, 'data');
const dbPath = process.env.HBRAIN_DB_PATH || join(dataDir, 'hbrain.sqlite');
const port = Number(process.env.HBRAIN_API_PORT || 3100);

mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
const repo = createHabitRepository(db);

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(body));
}

function notFound(res) {
  json(res, 404, { error: 'Not found' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      json(res, 200, { ok: true, dbPath });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/state') {
      json(res, 200, repo.getState());
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/migrate') {
      repo.importLocal(await readBody(req));
      json(res, 200, repo.getState());
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/habits') {
      json(res, 201, repo.addHabit(await readBody(req)));
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/habits/')) {
      const id = decodeURIComponent(url.pathname.split('/').pop());
      json(res, 200, repo.deleteHabit(id));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/entries/toggle') {
      const body = await readBody(req);
      json(res, 200, repo.toggleEntry(body.habitId, body.date));
      return;
    }

    if (req.method === 'DELETE' && url.pathname === '/api/data') {
      json(res, 200, repo.reset());
      return;
    }

    notFound(res);
  } catch (err) {
    json(res, 400, { error: err.message || 'Request failed' });
  }
}

createServer(handle).listen(port, '127.0.0.1', () => {
  console.log(`HBrain API listening on http://127.0.0.1:${port}`);
  console.log(`SQLite database: ${dbPath}`);
});
