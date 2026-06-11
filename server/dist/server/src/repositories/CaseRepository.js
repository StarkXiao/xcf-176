import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
const rowToCase = (row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? '',
    status: row.status,
    keyClues: JSON.parse(row.key_clues),
    canvasState: row.canvas_state ? JSON.parse(row.canvas_state) : undefined,
    templateId: row.template_id ?? undefined,
    templateMetadata: row.template_metadata ? JSON.parse(row.template_metadata) : undefined,
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
    create: (dto, template) => {
        const id = uuidv4();
        const now = new Date().toISOString();
        const templateMetadata = template ? {
            templateName: template.name,
            category: template.category,
            evidenceFieldIds: template.evidenceFields.map(f => f.id),
            relationTypeIds: template.relationTypes.map(r => r.id),
            investigationStepIds: template.investigationSteps.map(s => s.id),
        } : undefined;
        const stmt = db.prepare(`
      INSERT INTO cases (id, name, description, status, key_clues, template_id, template_metadata, created_at, updated_at)
      VALUES (?, ?, ?, 'pending', '[]', ?, ?, ?, ?)
    `);
        stmt.run(id, dto.name, dto.description ?? null, template ? template.id : null, templateMetadata ? JSON.stringify(templateMetadata) : null, now, now);
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
        if (dto.templateId !== undefined) {
            fields.push('template_id = ?');
            values.push(dto.templateId);
        }
        if (dto.templateMetadata !== undefined) {
            fields.push('template_metadata = ?');
            values.push(dto.templateMetadata ? JSON.stringify(dto.templateMetadata) : null);
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
