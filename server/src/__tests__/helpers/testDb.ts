import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    canvas_state TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE evidence (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'unknown',
    importance TEXT NOT NULL DEFAULT 'normal',
    tags TEXT DEFAULT '[]',
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    width REAL NOT NULL DEFAULT 200,
    height REAL NOT NULL DEFAULT 120,
    color TEXT DEFAULT '#3b82f6',
    timestamp TEXT,
    assigned_to TEXT DEFAULT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
  CREATE TABLE connections (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    from_evidence_id TEXT NOT NULL,
    to_evidence_id TEXT NOT NULL,
    label TEXT,
    color TEXT DEFAULT '#6b7280',
    line_style TEXT NOT NULL DEFAULT 'solid',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (from_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
    FOREIGN KEY (to_evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
  );
  CREATE TABLE collaborators (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operator',
    color TEXT NOT NULL DEFAULT '#00f0ff',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
  CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    collaborator_id TEXT NOT NULL,
    collaborator_name TEXT NOT NULL DEFAULT '',
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    snapshot TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
  CREATE TABLE evidence_collection (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    content TEXT NOT NULL,
    source_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    screenshot_data_url TEXT,
    content_hash TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'normal',
    tags TEXT DEFAULT '[]',
    verification_status TEXT NOT NULL DEFAULT 'pending',
    duplicate_of TEXT,
    collected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    archived_evidence_id TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_evidence_collection_case_id ON evidence_collection(case_id);
  CREATE INDEX IF NOT EXISTS idx_evidence_collection_content_hash ON evidence_collection(content_hash);
  CREATE INDEX IF NOT EXISTS idx_evidence_collection_status ON evidence_collection(verification_status);
  CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_case_id ON audit_logs(case_id);
`;

let _db: Database.Database | null = null;

export function getTestDb(): Database.Database {
  if (!_db) {
    _db = new Database(':memory:');
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(SCHEMA);
  }
  return _db;
}

export function resetTestDb(): void {
  const db = getTestDb();
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM evidence_collection;
    DELETE FROM evidence;
    DELETE FROM connections;
    DELETE FROM collaborators;
    DELETE FROM cases;
  `);
}

export function seedTestCase(db: Database.Database, id: string, name: string, description: string = ''): void {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO cases (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, description, now, now);
}

export function seedTestCollaborators(
  db: Database.Database,
  caseId: string,
  collaborators: Array<{ id: string; name: string; role: string; color: string }>
): void {
  const now = new Date().toISOString();
  for (const c of collaborators) {
    db.prepare(
      "INSERT OR IGNORE INTO collaborators (id, case_id, name, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(c.id, caseId, c.name, c.role, c.color, now);
  }
}
