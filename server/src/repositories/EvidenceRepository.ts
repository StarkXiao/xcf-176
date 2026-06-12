import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { Evidence, CreateEvidenceDto, UpdateEvidenceDto } from '@shared/types';

interface EvidenceRow {
  id: string;
  case_id: string;
  content: string;
  source: string;
  source_credibility: string;
  verification_status: string;
  importance: string;
  tags: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  timestamp: string | null;
  assigned_to: string | null;
  status: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  deleted_by_name: string | null;
}

const rowToEvidence = (row: EvidenceRow): Evidence => ({
  id: row.id,
  caseId: row.case_id,
  content: row.content,
  source: row.source,
  sourceCredibility: row.source_credibility as Evidence['sourceCredibility'],
  verificationStatus: row.verification_status as Evidence['verificationStatus'],
  importance: row.importance as Evidence['importance'],
  tags: JSON.parse(row.tags) as string[],
  positionX: row.position_x,
  positionY: row.position_y,
  width: row.width,
  height: row.height,
  color: row.color,
  timestamp: row.timestamp ?? '',
  assignedTo: row.assigned_to,
  status: row.status as Evidence['status'],
  createdAt: row.created_at,
});

export interface DeletedEvidenceInfo extends Evidence {
  deletedAt: string;
  deletedBy: string | null;
  deletedByName: string | null;
}

const rowToDeletedEvidence = (row: EvidenceRow): DeletedEvidenceInfo => ({
  ...rowToEvidence(row),
  deletedAt: row.deleted_at!,
  deletedBy: row.deleted_by,
  deletedByName: row.deleted_by_name,
});

export const EvidenceRepository = {
  findAll: (): Evidence[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence WHERE deleted_at IS NULL ORDER BY created_at DESC'
    ).all() as EvidenceRow[];
    return rows.map(rowToEvidence);
  },

  findAllIncludeDeleted: (): Evidence[] => {
    const rows = db.prepare('SELECT * FROM evidence ORDER BY created_at DESC').all() as EvidenceRow[];
    return rows.map(rowToEvidence);
  },

  findById: (id: string): Evidence | null => {
    const row = db.prepare(
      'SELECT * FROM evidence WHERE id = ? AND deleted_at IS NULL'
    ).get(id) as EvidenceRow | undefined;
    return row ? rowToEvidence(row) : null;
  },

  findByIdIncludeDeleted: (id: string): Evidence | null => {
    const row = db.prepare('SELECT * FROM evidence WHERE id = ?').get(id) as EvidenceRow | undefined;
    return row ? rowToEvidence(row) : null;
  },

  findDeletedById: (id: string): DeletedEvidenceInfo | null => {
    const row = db.prepare(
      'SELECT * FROM evidence WHERE id = ? AND deleted_at IS NOT NULL'
    ).get(id) as EvidenceRow | undefined;
    return row ? rowToDeletedEvidence(row) : null;
  },

  findAllDeleted: (): DeletedEvidenceInfo[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    ).all() as EvidenceRow[];
    return rows.map(rowToDeletedEvidence);
  },

  findDeletedByCaseId: (caseId: string): DeletedEvidenceInfo[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence WHERE case_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    ).all(caseId) as EvidenceRow[];
    return rows.map(rowToDeletedEvidence);
  },

  findDeletedByCollaborator: (collaboratorId: string): DeletedEvidenceInfo[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence WHERE deleted_by = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC'
    ).all(collaboratorId) as EvidenceRow[];
    return rows.map(rowToDeletedEvidence);
  },

  findByCaseId: (caseId: string): Evidence[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence WHERE case_id = ? AND deleted_at IS NULL ORDER BY created_at ASC'
    ).all(caseId) as EvidenceRow[];
    return rows.map(rowToEvidence);
  },

  findByCaseIdIncludeDeleted: (caseId: string): Evidence[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at ASC'
    ).all(caseId) as EvidenceRow[];
    return rows.map(rowToEvidence);
  },

  create: (dto: CreateEvidenceDto): Evidence => {
    const id = uuidv4();
    return EvidenceRepository._insert(id, dto);
  },

  createWithId: (id: string, dto: CreateEvidenceDto): Evidence => {
    return EvidenceRepository._insert(id, dto);
  },

  _insert: (id: string, dto: CreateEvidenceDto): Evidence => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO evidence (
        id, case_id, content, source, source_credibility, verification_status,
        importance, tags, position_x, position_y, width, height, color, timestamp,
        assigned_to, status, created_at, deleted_at, deleted_by, deleted_by_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.content,
      dto.source ?? 'unknown',
      dto.sourceCredibility ?? 'medium',
      dto.verificationStatus ?? 'unverified',
      dto.importance ?? 'normal',
      JSON.stringify(dto.tags ?? []),
      dto.positionX ?? 0,
      dto.positionY ?? 0,
      dto.width ?? 200,
      dto.height ?? 120,
      dto.color ?? '#3b82f6',
      dto.timestamp ?? null,
      dto.assignedTo ?? null,
      dto.status ?? 'pending',
      now
    );
    return EvidenceRepository.findByIdIncludeDeleted(id)!;
  },

  update: (id: string, dto: UpdateEvidenceDto): Evidence | null => {
    const existing = EvidenceRepository.findByIdIncludeDeleted(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.content !== undefined) {
      fields.push('content = ?');
      values.push(dto.content);
    }
    if (dto.source !== undefined) {
      fields.push('source = ?');
      values.push(dto.source);
    }
    if (dto.sourceCredibility !== undefined) {
      fields.push('source_credibility = ?');
      values.push(dto.sourceCredibility);
    }
    if (dto.verificationStatus !== undefined) {
      fields.push('verification_status = ?');
      values.push(dto.verificationStatus);
    }
    if (dto.importance !== undefined) {
      fields.push('importance = ?');
      values.push(dto.importance);
    }
    if (dto.tags !== undefined) {
      fields.push('tags = ?');
      values.push(JSON.stringify(dto.tags));
    }
    if (dto.positionX !== undefined) {
      fields.push('position_x = ?');
      values.push(dto.positionX);
    }
    if (dto.positionY !== undefined) {
      fields.push('position_y = ?');
      values.push(dto.positionY);
    }
    if (dto.width !== undefined) {
      fields.push('width = ?');
      values.push(dto.width);
    }
    if (dto.height !== undefined) {
      fields.push('height = ?');
      values.push(dto.height);
    }
    if (dto.color !== undefined) {
      fields.push('color = ?');
      values.push(dto.color);
    }
    if (dto.timestamp !== undefined) {
      fields.push('timestamp = ?');
      values.push(dto.timestamp);
    }
    if (dto.assignedTo !== undefined) {
      fields.push('assigned_to = ?');
      values.push(dto.assignedTo ?? null);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    values.push(id);

    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE evidence SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return EvidenceRepository.findById(id);
  },

  softDelete: (
    id: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): boolean => {
    const existing = EvidenceRepository.findById(id);
    if (!existing) return false;
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'UPDATE evidence SET deleted_at = ?, deleted_by = ?, deleted_by_name = ? WHERE id = ? AND deleted_at IS NULL'
    );
    const result = stmt.run(
      now,
      collaboratorId ?? null,
      collaboratorName ?? null,
      id
    );
    return result.changes > 0;
  },

  restore: (id: string): Evidence | null => {
    const existing = EvidenceRepository.findDeletedById(id);
    if (!existing) return null;
    const stmt = db.prepare(
      'UPDATE evidence SET deleted_at = NULL, deleted_by = NULL, deleted_by_name = NULL WHERE id = ? AND deleted_at IS NOT NULL'
    );
    const result = stmt.run(id);
    if (result.changes > 0) {
      return EvidenceRepository.findById(id);
    }
    return null;
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM evidence WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  purgeDeletedOlderThan: (days: number): number => {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const stmt = db.prepare('DELETE FROM evidence WHERE deleted_at IS NOT NULL AND deleted_at < ?');
    const result = stmt.run(cutoff);
    return result.changes;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM evidence WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },

  softDeleteByCaseId: (
    caseId: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): number => {
    const now = new Date().toISOString();
    const stmt = db.prepare(
      'UPDATE evidence SET deleted_at = ?, deleted_by = ?, deleted_by_name = ? WHERE case_id = ? AND deleted_at IS NULL'
    );
    const result = stmt.run(
      now,
      collaboratorId ?? null,
      collaboratorName ?? null,
      caseId
    );
    return result.changes;
  },
};
