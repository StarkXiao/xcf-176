import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { Case, CreateCaseDto, UpdateCaseDto, CanvasState } from '@shared/types';

interface CaseRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  key_clues: string;
  canvas_state: string | null;
  created_at: string;
  updated_at: string;
}

const rowToCase = (row: CaseRow): Case => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  status: row.status as Case['status'],
  keyClues: JSON.parse(row.key_clues) as string[],
  canvasState: row.canvas_state ? (JSON.parse(row.canvas_state) as CanvasState) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const CaseRepository = {
  findAll: (): Case[] => {
    const rows = db.prepare('SELECT * FROM cases ORDER BY updated_at DESC').all() as CaseRow[];
    return rows.map(rowToCase);
  },

  findById: (id: string): Case | null => {
    const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow | undefined;
    return row ? rowToCase(row) : null;
  },

  create: (dto: CreateCaseDto): Case => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO cases (id, name, description, status, key_clues, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', '[]', ?, ?)
    `);
    stmt.run(id, dto.name, dto.description ?? null, now, now);
    return CaseRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateCaseDto): Case | null => {
    const existing = CaseRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.description !== undefined) {
      fields.push('description = ?');
      values.push(dto.description);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    if (dto.keyClues !== undefined) {
      fields.push('key_clues = ?');
      values.push(JSON.stringify(dto.keyClues));
    }
    if (dto.canvasState !== undefined) {
      fields.push('canvas_state = ?');
      values.push(JSON.stringify(dto.canvasState));
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    const stmt = db.prepare(`UPDATE cases SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return CaseRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
