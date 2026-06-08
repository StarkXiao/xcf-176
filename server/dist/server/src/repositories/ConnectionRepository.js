import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
const rowToConnection = (row) => ({
    id: row.id,
    caseId: row.case_id,
    fromEvidenceId: row.from_evidence_id,
    toEvidenceId: row.to_evidence_id,
    label: row.label ?? '',
    color: row.color,
    lineStyle: row.line_style,
    createdAt: row.created_at,
});
export const ConnectionRepository = {
    findAll: () => {
        const rows = db.prepare('SELECT * FROM connections ORDER BY created_at DESC').all();
        return rows.map(rowToConnection);
    },
    findById: (id) => {
        const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(id);
        return row ? rowToConnection(row) : null;
    },
    findByCaseId: (caseId) => {
        const rows = db.prepare('SELECT * FROM connections WHERE case_id = ? ORDER BY created_at ASC')
            .all(caseId);
        return rows.map(rowToConnection);
    },
    findByEvidenceId: (evidenceId) => {
        const rows = db.prepare(`
      SELECT * FROM connections 
      WHERE from_evidence_id = ? OR to_evidence_id = ? 
      ORDER BY created_at ASC
    `).all(evidenceId, evidenceId);
        return rows.map(rowToConnection);
    },
    create: (dto) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO connections (
        id, case_id, from_evidence_id, to_evidence_id,
        label, color, line_style, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, dto.caseId, dto.fromEvidenceId, dto.toEvidenceId, dto.label ?? null, dto.color ?? '#6b7280', dto.lineStyle ?? 'solid', now);
        return ConnectionRepository.findById(id);
    },
    delete: (id) => {
        const stmt = db.prepare('DELETE FROM connections WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    deleteByCaseId: (caseId) => {
        const stmt = db.prepare('DELETE FROM connections WHERE case_id = ?');
        const result = stmt.run(caseId);
        return result.changes;
    },
    deleteByEvidenceId: (evidenceId) => {
        const stmt = db.prepare(`
      DELETE FROM connections 
      WHERE from_evidence_id = ? OR to_evidence_id = ?
    `);
        const result = stmt.run(evidenceId, evidenceId);
        return result.changes;
    },
};
