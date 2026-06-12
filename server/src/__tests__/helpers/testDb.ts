import Database from 'better-sqlite3';

const SCHEMA = `
  CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    key_clues TEXT DEFAULT '[]',
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
  CREATE TABLE IF NOT EXISTS investigation_tasks (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    assignee_id TEXT,
    assignee_name TEXT DEFAULT NULL,
    deadline TEXT,
    evidence_ids TEXT DEFAULT '[]',
    collection_item_ids TEXT DEFAULT '[]',
    connection_ids TEXT DEFAULT '[]',
    sync_notes TEXT DEFAULT '[]',
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL DEFAULT '',
    completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_investigation_tasks_case_id ON investigation_tasks(case_id);
  CREATE INDEX IF NOT EXISTS idx_investigation_tasks_status ON investigation_tasks(status);
  CREATE INDEX IF NOT EXISTS idx_investigation_tasks_assignee_id ON investigation_tasks(assignee_id);
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    case_summary TEXT NOT NULL DEFAULT '{}',
    relationship_graph TEXT NOT NULL DEFAULT '{}',
    timeline TEXT NOT NULL DEFAULT '[]',
    task_summaries TEXT NOT NULL DEFAULT '[]',
    export_format TEXT NOT NULL DEFAULT 'json',
    exported_content TEXT,
    generated_at TEXT,
    exported_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
  CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
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
    DELETE FROM investigation_tasks;
    DELETE FROM reports;
    DELETE FROM evidence;
    DELETE FROM connections;
    DELETE FROM collaborators;
    DELETE FROM cases;
  `);
}

export function seedTestCase(db: Database.Database, id: string, name: string, description: string = ''): void {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT OR IGNORE INTO cases (id, name, description, status, key_clues, created_at, updated_at) VALUES (?, ?, ?, 'pending', '[]', ?, ?)"
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

export function seedTestEvidence(
  db: Database.Database,
  caseId: string,
  evidence: Array<{
    id: string;
    content: string;
    source: string;
    importance: string;
    tags: string[];
    status: string;
    timestamp?: string;
    assignedTo?: string;
    sourceCredibility?: string;
    verificationStatus?: string;
  }>
): void {
  const now = new Date().toISOString();
  for (const e of evidence) {
    db.prepare(
      "INSERT OR IGNORE INTO evidence (id, case_id, content, source, source_credibility, verification_status, importance, tags, status, timestamp, assigned_to, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      e.id,
      caseId,
      e.content,
      e.source,
      e.sourceCredibility ?? 'medium',
      e.verificationStatus ?? 'unverified',
      e.importance,
      JSON.stringify(e.tags),
      e.status,
      e.timestamp ?? now,
      e.assignedTo ?? null,
      now
    );
  }
}

export function seedTestConnection(
  db: Database.Database,
  caseId: string,
  connections: Array<{
    id: string;
    fromEvidenceId: string;
    toEvidenceId: string;
    label: string;
  }>
): void {
  const now = new Date().toISOString();
  for (const c of connections) {
    db.prepare(
      "INSERT OR IGNORE INTO connections (id, case_id, from_evidence_id, to_evidence_id, label, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(c.id, caseId, c.fromEvidenceId, c.toEvidenceId, c.label, now);
  }
}

export function seedTestInvestigationTask(
  db: Database.Database,
  caseId: string,
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    priority: string;
    status: string;
    assigneeId?: string;
    assigneeName?: string;
    deadline?: string;
    createdBy: string;
    createdByName: string;
  }>
): void {
  const now = new Date().toISOString();
  for (const t of tasks) {
    db.prepare(
      "INSERT OR IGNORE INTO investigation_tasks (id, case_id, title, description, priority, status, assignee_id, assignee_name, deadline, created_by, created_by_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      t.id,
      caseId,
      t.title,
      t.description ?? '',
      t.priority,
      t.status,
      t.assigneeId ?? null,
      t.assigneeName ?? null,
      t.deadline ?? null,
      t.createdBy,
      t.createdByName,
      now,
      now
    );
  }
}

export function updateCaseKeyClues(
  db: Database.Database,
  caseId: string,
  keyClues: string[]
): void {
  db.prepare("UPDATE cases SET key_clues = ?, status = 'in_progress' WHERE id = ?").run(
    JSON.stringify(keyClues),
    caseId
  );
}

export function seedTestAuditLog(
  db: Database.Database,
  caseId: string,
  logs: Array<{
    id: string;
    collaboratorId: string;
    collaboratorName: string;
    action: string;
    targetType: string;
    targetId: string;
    detail: string;
  }>
): void {
  const now = new Date().toISOString();
  for (const log of logs) {
    db.prepare(
      "INSERT OR IGNORE INTO audit_logs (id, case_id, collaborator_id, collaborator_name, action, target_type, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      log.id,
      caseId,
      log.collaboratorId,
      log.collaboratorName,
      log.action,
      log.targetType,
      log.targetId,
      log.detail,
      now
    );
  }
}
