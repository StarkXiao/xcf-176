import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { Connection, CreateConnectionDto } from '@shared/types';

interface ConnectionRow {
  id: string;
  case_id: string;
  from_evidence_id: string;
  to_evidence_id: string;
  label: string | null;
  color: string;
  line_style: string;
  created_at: string;
  archived_at: string | null;
}

const rowToConnection = (row: ConnectionRow): Connection => ({
  id: row.id,
  caseId: row.case_id,
  fromEvidenceId: row.from_evidence_id,
  toEvidenceId: row.to_evidence_id,
  label: row.label ?? '',
  color: row.color,
  lineStyle: row.line_style as Connection['lineStyle'],
  createdAt: row.created_at,
});

export const ConnectionRepository = {
  findAll: (): Connection[] => {
    const rows = db.prepare(
      'SELECT * FROM connections WHERE archived_at IS NULL ORDER BY created_at DESC'
    ).all() as ConnectionRow[];
    return rows.map(rowToConnection);
  },

  findById: (id: string): Connection | null => {
    const row = db.prepare(
      'SELECT * FROM connections WHERE id = ? AND archived_at IS NULL'
    ).get(id) as ConnectionRow | undefined;
    return row ? rowToConnection(row) : null;
  },

  findByIdIncludeArchived: (id: string): Connection | null => {
    const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(id) as ConnectionRow | undefined;
    return row ? rowToConnection(row) : null;
  },

  findByCaseId: (caseId: string): Connection[] => {
    const rows = db.prepare(
      'SELECT * FROM connections WHERE case_id = ? AND archived_at IS NULL ORDER BY created_at ASC'
    ).all(caseId) as ConnectionRow[];
    return rows.map(rowToConnection);
  },

  findByEvidenceId: (evidenceId: string): Connection[] => {
    const rows = db.prepare(`
      SELECT * FROM connections 
      WHERE (from_evidence_id = ? OR to_evidence_id = ?) AND archived_at IS NULL
      ORDER BY created_at ASC
    `).all(evidenceId, evidenceId) as ConnectionRow[];
    return rows.map(rowToConnection);
  },

  archiveByEvidenceId: (evidenceId: string): number => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE connections SET archived_at = ?
      WHERE (from_evidence_id = ? OR to_evidence_id = ?) AND archived_at IS NULL
    `);
    const result = stmt.run(now, evidenceId, evidenceId);
    return result.changes;
  },

  restoreByEvidenceId: (evidenceId: string): number => {
    const stmt = db.prepare(`
      UPDATE connections SET archived_at = NULL
      WHERE (from_evidence_id = ? OR to_evidence_id = ?) AND archived_at IS NOT NULL
    `);
    const result = stmt.run(evidenceId, evidenceId);
    return result.changes;
  },

  create: (dto: CreateConnectionDto): Connection => {
    const id = uuidv4();
    return ConnectionRepository._insert(id, dto);
  },

  createWithId: (id: string, dto: CreateConnectionDto): Connection => {
    return ConnectionRepository._insert(id, dto);
  },

  _insert: (id: string, dto: CreateConnectionDto): Connection => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO connections (
        id, case_id, from_evidence_id, to_evidence_id,
        label, color, line_style, created_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.fromEvidenceId,
      dto.toEvidenceId,
      dto.label ?? null,
      dto.color ?? '#6b7280',
      dto.lineStyle ?? 'solid',
      now
    );
    return ConnectionRepository.findByIdIncludeArchived(id)!;
  },

  archive: (id: string): boolean => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'UPDATE connections SET archived_at = ? WHERE id = ? AND archived_at IS NULL'
    );
    const result = stmt.run(now, id);
    return result.changes > 0;
  },

  unarchive: (id: string): Connection | null => {
    const stmt = db.prepare(
      'UPDATE connections SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL'
    );
    const result = stmt.run(id);
    if (result.changes > 0) {
      return ConnectionRepository.findById(id);
    }
    return null;
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM connections WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  update: (id: string, dto: Partial<Pick<Connection, 'label' | 'color' | 'lineStyle'>>): Connection | null => {
    const existing = ConnectionRepository.findByIdIncludeArchived(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.label !== undefined) { fields.push('label = ?'); values.push(dto.label); }
    if (dto.color !== undefined) { fields.push('color = ?'); values.push(dto.color); }
    if (dto.lineStyle !== undefined) { fields.push('line_style = ?'); values.push(dto.lineStyle); }

    if (fields.length > 0) {
      values.push(id);
      const stmt = db.prepare(`UPDATE connections SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return ConnectionRepository.findById(id);
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM connections WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },

  deleteByEvidenceId: (evidenceId: string): number => {
    const stmt = db.prepare(`
      DELETE FROM connections 
      WHERE from_evidence_id = ? OR to_evidence_id = ?
    `);
    const result = stmt.run(evidenceId, evidenceId);
    return result.changes;
  },
};
