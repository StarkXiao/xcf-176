import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { Evidence, CreateEvidenceDto, UpdateEvidenceDto } from '@shared/types';

interface EvidenceRow {
  id: string;
  case_id: string;
  content: string;
  source: string;
  importance: string;
  tags: string;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  color: string;
  timestamp: string | null;
  created_at: string;
}

const rowToEvidence = (row: EvidenceRow): Evidence => ({
  id: row.id,
  caseId: row.case_id,
  content: row.content,
  source: row.source,
  importance: row.importance as Evidence['importance'],
  tags: JSON.parse(row.tags) as string[],
  positionX: row.position_x,
  positionY: row.position_y,
  width: row.width,
  height: row.height,
  color: row.color,
  timestamp: row.timestamp ?? '',
  createdAt: row.created_at,
});

export const EvidenceRepository = {
  findAll: (): Evidence[] => {
    const rows = db.prepare('SELECT * FROM evidence ORDER BY created_at DESC').all() as EvidenceRow[];
    return rows.map(rowToEvidence);
  },

  findById: (id: string): Evidence | null => {
    const row = db.prepare('SELECT * FROM evidence WHERE id = ?').get(id) as EvidenceRow | undefined;
    return row ? rowToEvidence(row) : null;
  },

  findByCaseId: (caseId: string): Evidence[] => {
    const rows = db.prepare('SELECT * FROM evidence WHERE case_id = ? ORDER BY created_at ASC')
      .all(caseId) as EvidenceRow[];
    return rows.map(rowToEvidence);
  },

  create: (dto: CreateEvidenceDto): Evidence => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO evidence (
        id, case_id, content, source, importance, tags,
        position_x, position_y, width, height, color, timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.content,
      dto.source ?? 'unknown',
      dto.importance ?? 'normal',
      JSON.stringify(dto.tags ?? []),
      dto.positionX ?? 0,
      dto.positionY ?? 0,
      dto.width ?? 200,
      dto.height ?? 120,
      dto.color ?? '#3b82f6',
      dto.timestamp ?? null,
      now
    );
    return EvidenceRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateEvidenceDto): Evidence | null => {
    const existing = EvidenceRepository.findById(id);
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
    values.push(id);

    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE evidence SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return EvidenceRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM evidence WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM evidence WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },
};
