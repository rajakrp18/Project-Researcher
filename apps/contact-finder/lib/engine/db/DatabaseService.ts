import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface DBEntity {
  id: number;
  name: string;
  type: string;
}

export interface DBPhone {
  id: number;
  phone: string;
  entity_id: number;
  confidence: number;
  source: string;
}

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(path.join(dbDir, 'contact_graph.db'));
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS phones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        confidence INTEGER NOT NULL,
        source TEXT,
        FOREIGN KEY(entity_id) REFERENCES entities(id),
        UNIQUE(phone, entity_id)
      );
    `);
  }

  findEntityId(name: string): number | null {
    const row = this.db.prepare('SELECT id FROM entities WHERE name = ? COLLATE NOCASE').get(name) as { id: number } | undefined;
    return row ? row.id : null;
  }

  ensureEntity(name: string, type: string = 'PERSON'): number {
    const existing = this.findEntityId(name);
    if (existing) return existing;

    const result = this.db.prepare('INSERT INTO entities (name, type) VALUES (?, ?)').run(name, type);
    return result.lastInsertRowid as number;
  }

  savePhone(name: string, phone: string, confidence: number, source: string) {
    const entityId = this.ensureEntity(name);
    try {
      this.db.prepare(
        'INSERT INTO phones (phone, entity_id, confidence, source) VALUES (?, ?, ?, ?) ON CONFLICT(phone, entity_id) DO UPDATE SET confidence = excluded.confidence WHERE excluded.confidence > phones.confidence'
      ).run(phone, entityId, confidence, source);
    } catch (err) {
      console.error('Error saving phone to DB:', err);
    }
  }

  findPhonesForEntity(name: string): DBPhone[] {
    const entityId = this.findEntityId(name);
    if (!entityId) return [];

    return this.db.prepare('SELECT * FROM phones WHERE entity_id = ? ORDER BY confidence DESC').all(entityId) as DBPhone[];
  }
}
