import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(process.env.DATABASE_PATH || './data/songsprout.db');

let _db = null;

export function getDb() {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  ensureSchema(_db);
  return _db;
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      is_admin INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS kids_songs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      child_name TEXT NOT NULL,
      song_type TEXT NOT NULL,
      theme TEXT DEFAULT 'classic',
      voice TEXT DEFAULT 'warm_female',
      lyrics TEXT,
      mp3_url TEXT,
      wav_url TEXT,
      duration REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT,
      tier TEXT DEFAULT 'free',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS agent_jobs (
      id TEXT PRIMARY KEY,
      api_key_id TEXT NOT NULL,
      child_name TEXT NOT NULL,
      song_type TEXT NOT NULL,
      age INTEGER,
      interests TEXT DEFAULT '[]',
      pet_name TEXT,
      voice TEXT DEFAULT 'warm_female',
      bpm INTEGER,
      lyrics TEXT,
      mp3_url TEXT,
      wav_url TEXT,
      duration REAL,
      webhook_url TEXT,
      status TEXT DEFAULT 'queued',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
    );

    CREATE INDEX IF NOT EXISTS idx_kids_songs_child ON kids_songs(child_name);
    CREATE INDEX IF NOT EXISTS idx_agent_jobs_key ON agent_jobs(api_key_id);
    CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON agent_jobs(status);
  `);
}
