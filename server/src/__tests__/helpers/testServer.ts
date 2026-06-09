import Database from 'better-sqlite3';
import Fastify from 'fastify';
import { evidenceCollectionRoutes } from '../../routes/evidenceCollectionRoutes.js';
import { CaseRepository } from '../../repositories/CaseRepository.js';
import { CollaboratorRepository } from '../../repositories/CollaboratorRepository.js';

export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
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
  `);

  return db;
}

export interface TestContext {
  db: Database.Database;
  caseId: string;
  collaboratorId: string;
  collaboratorName: string;
  secondCollaboratorId: string;
  secondCollaboratorName: string;
}

export function seedTestData(db: Database.Database): TestContext {
  const now = new Date().toISOString();
  const caseId = 'test-case-001';

  db.prepare(
    "INSERT INTO cases (id, name, description, status, key_clues, created_at, updated_at) VALUES (?, ?, ?, 'pending', '[]', ?, ?)"
  ).run(caseId, '测试案件', '自动化测试案件', now, now);

  const collaboratorId = 'test-col-001';
  const collaboratorName = '测试操作员A';
  db.prepare(
    "INSERT INTO collaborators (id, case_id, name, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(collaboratorId, caseId, collaboratorName, 'operator', '#00f0ff', now);

  const secondCollaboratorId = 'test-col-002';
  const secondCollaboratorName = '测试审核员B';
  db.prepare(
    "INSERT INTO collaborators (id, case_id, name, role, color, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(secondCollaboratorId, caseId, secondCollaboratorName, 'reviewer', '#9945ff', now);

  return {
    db,
    caseId,
    collaboratorId,
    collaboratorName,
    secondCollaboratorId,
    secondCollaboratorName,
  };
}

export async function buildTestServer() {
  const server = Fastify();
  server.register(evidenceCollectionRoutes, { prefix: '/api/evidence-collection' });
  await server.ready();
  return server;
}
