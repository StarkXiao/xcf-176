import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { Collaborator, CreateCollaboratorDto, UpdateCollaboratorDto } from '@shared/types';

interface CollaboratorRow {
  id: string;
  case_id: string;
  name: string;
  role: string;
  color: string;
  created_at: string;
}

const rowToCollaborator = (row: CollaboratorRow): Collaborator => ({
  id: row.id,
  caseId: row.case_id,
  name: row.name,
  role: row.role as Collaborator['role'],
  color: row.color,
  createdAt: row.created_at,
});

export const CollaboratorRepository = {
  findAll: (): Collaborator[] => {
    const rows = db.prepare('SELECT * FROM collaborators ORDER BY created_at ASC').all() as CollaboratorRow[];
    return rows.map(rowToCollaborator);
  },

  findById: (id: string): Collaborator | null => {
    const row = db.prepare('SELECT * FROM collaborators WHERE id = ?').get(id) as CollaboratorRow | undefined;
    return row ? rowToCollaborator(row) : null;
  },

  findByCaseId: (caseId: string): Collaborator[] => {
    const rows = db.prepare('SELECT * FROM collaborators WHERE case_id = ? ORDER BY created_at ASC')
      .all(caseId) as CollaboratorRow[];
    return rows.map(rowToCollaborator);
  },

  create: (dto: CreateCollaboratorDto): Collaborator => {
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO collaborators (id, case_id, name, role, color, created_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(id, dto.caseId, dto.name, dto.role ?? 'analyst', dto.color ?? '#00f0ff');
    return CollaboratorRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateCollaboratorDto): Collaborator | null => {
    const existing = CollaboratorRepository.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.role !== undefined) {
      fields.push('role = ?');
      values.push(dto.role);
    }
    if (dto.color !== undefined) {
      fields.push('color = ?');
      values.push(dto.color);
    }
    values.push(id);

    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE collaborators SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return CollaboratorRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM collaborators WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM collaborators WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },
};
