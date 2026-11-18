// =============================================================================
// MentorMatchr: Database Adapter
// Utilizes Node.js v26 native SQLite DatabaseSync with BCNF schemas
// =============================================================================

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initSchema } from './schema.js';
import { seedData } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'mentormatchr.sqlite');
const db = new DatabaseSync(DB_PATH);

// Initialize schema and initial seed data
initSchema(db);
seedData(db);

export default db;
