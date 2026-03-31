import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:./local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;

export async function initDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS video_matches (
      youtube_id TEXT PRIMARY KEY,
      youtube_title TEXT NOT NULL,
      youtube_thumbnail TEXT,
      youtube_channel TEXT,
      youtube_playlist_id TEXT,
      youtube_playlist_title TEXT,
      youtube_duration INTEGER,
      youtube_views INTEGER,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bilibili_reuploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_id TEXT NOT NULL,
      bvid TEXT NOT NULL,
      aid INTEGER NOT NULL,
      title TEXT NOT NULL,
      uploader_name TEXT,
      thumbnail TEXT,
      duration INTEGER,
      views INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      match_confidence REAL DEFAULT 0,
      match_method TEXT DEFAULT 'title',
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (youtube_id) REFERENCES video_matches(youtube_id),
      UNIQUE(youtube_id, bvid)
    );

    CREATE TABLE IF NOT EXISTS admin_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      youtube_id TEXT NOT NULL,
      bvid TEXT,
      action TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bilibili_youtube ON bilibili_reuploads(youtube_id);
    CREATE INDEX IF NOT EXISTS idx_bilibili_bvid ON bilibili_reuploads(bvid);
  `);

  await ensureColumnExists('video_matches', 'youtube_playlist_id', 'TEXT');
  await ensureColumnExists('video_matches', 'youtube_playlist_title', 'TEXT');
}

async function ensureColumnExists(
  tableName: string,
  columnName: string,
  columnDefinition: string
) {
  const result = await db.execute(`PRAGMA table_info(${tableName})`);
  const hasColumn = result.rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    await db.execute(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}
