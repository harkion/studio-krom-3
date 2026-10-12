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
  -- 1. Create places table FIRST so foreign key references succeed
  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    scope TEXT NOT NULL,
    status TEXT NOT NULL
  );

  -- 2. Create stories table referencing places(id)
  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    category TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'non-binary', 'other')),
    place_id TEXT REFERENCES places(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
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