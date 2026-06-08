import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
const rowToCase = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    canvasState: row.canvas_state ? JSON.parse(row.canvas_state) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});
export const CaseRepository = {
    findAll: () => {
        const rows = db.prepare('SELECT * FROM cases ORDER BY updated_at DESC').all();
        return rows.map(rowToCase);
    },
    findById: (id) => {
        const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id);
        return row ? rowToCase(row) : null;
    },
    create: (dto) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO cases (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(id, dto.name, dto.description ?? null, now, now);
        return CaseRepository.findById(id);
    },
    update: (id, dto) => {
        const existing = CaseRepository.findById(id);
        if (!existing)
            return null;
        const now = new Date().toISOString();
        const fields = [];
        const values = [];
        if (dto.name !== undefined) {
            fields.push('name = ?');
            values.push(dto.name);
        }
        if (dto.description !== undefined) {
            fields.push('description = ?');
            values.push(dto.description);
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
    delete: (id) => {
        const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
};
