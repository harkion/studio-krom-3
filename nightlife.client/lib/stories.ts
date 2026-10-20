import Database from "better-sqlite3";
import path from "path";
import { places as initialPlaces } from "./places";

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
    location_name TEXT NOT NULL,
    category TEXT NOT NULL,
    narrative_text TEXT NOT NULL,
    author_name TEXT DEFAULT 'Anonymous',
    audio_voice_url TEXT,
    pos_x REAL DEFAULT 0.0,
    pos_y REAL DEFAULT 0.0,
    pos_z REAL DEFAULT 0.0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// 5. Seed places table with initial data if empty
const countStmt = db.prepare("SELECT COUNT(*) as count FROM places");
const { count } = countStmt.get() as { count: number };

if (count === 0) {
    const insertPlace = db.prepare(`
    INSERT INTO places (id, name, query, category, title, summary, scope, status)
    VALUES (@id, @name, @query, @category, @title, @summary, @scope, @status)
  `);

    const seedTransaction = db.transaction((placesList) => {
        for (const place of placesList) {
            insertPlace.run(place);
        }
    });

    seedTransaction(initialPlaces);
}

export default db;