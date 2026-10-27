import Database from "better-sqlite3";
import path from "path";


// 1. Resolve the absolute path to your database file
const dbPath = path.join(process.cwd(), "nightlife.db");

// 2. Open or create the SQLite database file
const db = new Database(dbPath);

// 3. Enable WAL mode and foreign key constraints
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// 4. Define table schema in the CORRECT order (places first, then stories)
db.exec(`


  -- 2. Create stories table referencing places(id)
CREATE TABLE IF NOT EXISTS stories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  location_name TEXT,
  category TEXT,
  narrative_text TEXT,
  author_name TEXT,
  x REAL DEFAULT 0,
  z REAL DEFAULT 0,
  audio TEXT,
  color INTEGER DEFAULT 16738740, /* Default color in decimal */
  status TEXT DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);



export default db;