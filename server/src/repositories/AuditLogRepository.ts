import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { AuditLog, CreateAuditLogDto } from '@shared/types';

interface AuditLogRow {
  id: string;
  case_id: string;
  collaborator_id: string;
  collaborator_name: string;
  action: string;
  target_type: string;
  target_id: string;
  detail: string;
  snapshot: string | null;
  created_at: string;
}

const rowToAuditLog = (row: AuditLogRow): AuditLog => ({
  id: row.id,
  caseId: row.case_id,
  collaboratorId: row.collaborator_id,
  collaboratorName: row.collaborator_name,
  action: row.action as AuditLog['action'],
  targetType: row.target_type as AuditLog['targetType'],
  targetId: row.target_id,
  detail: row.detail,
  snapshot: row.snapshot ?? undefined,
  createdAt: row.created_at,
});

export const AuditLogRepository = {
  findAll: (): AuditLog[] => {
    const rows = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC').all() as AuditLogRow[];
    return rows.map(rowToAuditLog);
  },

  findById: (id: string): AuditLog | null => {
    const row = db.prepare('SELECT * FROM audit_logs WHERE id = ?').get(id) as AuditLogRow | undefined;
    return row ? rowToAuditLog(row) : null;
  },

  findByCaseId: (caseId: string): AuditLog[] => {
    const rows = db.prepare('SELECT * FROM audit_logs WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as AuditLogRow[];
    return rows.map(rowToAuditLog);
  },

  findByCollaboratorId: (collaboratorId: string): AuditLog[] => {
    const rows = db.prepare('SELECT * FROM audit_logs WHERE collaborator_id = ? ORDER BY created_at DESC')
      .all(collaboratorId) as AuditLogRow[];
    return rows.map(rowToAuditLog);
  },

  create: (dto: CreateAuditLogDto, collaboratorName: string = ''): AuditLog => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, case_id, collaborator_id, collaborator_name, action, target_type, target_id, detail, snapshot, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.collaboratorId,
      collaboratorName,
      dto.action,
      dto.targetType,
      dto.targetId,
      dto.detail,
      dto.snapshot ?? null,
      now
    );
    return AuditLogRepository.findById(id)!;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM audit_logs WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },
};
