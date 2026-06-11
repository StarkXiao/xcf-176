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
    relationTypeId: row.relation_type_id,
    createdAt: row.created_at,
});
export const ConnectionRepository = {
    findAll: () => {
        const rows = db.prepare('SELECT * FROM connections WHERE archived_at IS NULL ORDER BY created_at DESC').all();
        return rows.map(rowToConnection);
    },
    findById: (id) => {
        const row = db.prepare('SELECT * FROM connections WHERE id = ? AND archived_at IS NULL').get(id);
        return row ? rowToConnection(row) : null;
    },
    findByIdIncludeArchived: (id) => {
        const row = db.prepare('SELECT * FROM connections WHERE id = ?').get(id);
        return row ? rowToConnection(row) : null;
    },
    findByCaseId: (caseId) => {
        const rows = db.prepare('SELECT * FROM connections WHERE case_id = ? AND archived_at IS NULL ORDER BY created_at ASC').all(caseId);
        return rows.map(rowToConnection);
    },
    findByEvidenceId: (evidenceId) => {
        const rows = db.prepare(`
      SELECT * FROM connections 
      WHERE (from_evidence_id = ? OR to_evidence_id = ?) AND archived_at IS NULL
      ORDER BY created_at ASC
    `).all(evidenceId, evidenceId);
        return rows.map(rowToConnection);
    },
    archiveByEvidenceId: (evidenceId) => {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      UPDATE connections SET archived_at = ?
      WHERE (from_evidence_id = ? OR to_evidence_id = ?) AND archived_at IS NULL
    `);
        const result = stmt.run(now, evidenceId, evidenceId);
        return result.changes;
    },
    restoreByEvidenceId: (evidenceId) => {
        const rows = db.prepare(`
      SELECT * FROM connections 
      WHERE (from_evidence_id = ? OR to_evidence_id = ?) AND archived_at IS NOT NULL
    `).all(evidenceId, evidenceId);
        let restoredCount = 0;
        const skipped = [];
        for (const row of rows) {
            const otherEvidenceId = row.from_evidence_id === evidenceId ? row.to_evidence_id : row.from_evidence_id;
            const otherEvidence = db.prepare('SELECT deleted_at FROM evidence WHERE id = ?').get(otherEvidenceId);
            if (!otherEvidence) {
                skipped.push({
                    connectionId: row.id,
                    reason: '另一端证据已被彻底删除',
                    otherEvidenceId,
                    otherEvidenceDeleted: true,
                });
                continue;
            }
            if (otherEvidence.deleted_at !== null) {
                skipped.push({
                    connectionId: row.id,
                    reason: '另一端证据仍在回收站中',
                    otherEvidenceId,
                    otherEvidenceDeleted: true,
                });
                continue;
            }
            const updateStmt = db.prepare('UPDATE connections SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL');
            const result = updateStmt.run(row.id);
            if (result.changes > 0) {
                restoredCount++;
            }
        }
        return { restored: restoredCount, skipped };
    },
    create: (dto) => {
        const id = uuidv4();
        return ConnectionRepository._insert(id, dto);
    },
    createWithId: (id, dto) => {
        return ConnectionRepository._insert(id, dto);
    },
    _insert: (id, dto) => {
        const now = new Date().toISOString();
        const stmt = db.prepare(`
      INSERT INTO connections (
        id, case_id, from_evidence_id, to_evidence_id,
        label, color, line_style, relation_type_id, created_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);
        stmt.run(id, dto.caseId, dto.fromEvidenceId, dto.toEvidenceId, dto.label ?? null, dto.color ?? '#6b7280', dto.lineStyle ?? 'solid', dto.relationTypeId ?? null, now);
        return ConnectionRepository.findByIdIncludeArchived(id);
    },
    archive: (id) => {
        const now = new Date().toISOString();
        const stmt = db.prepare('UPDATE connections SET archived_at = ? WHERE id = ? AND archived_at IS NULL');
        const result = stmt.run(now, id);
        return result.changes > 0;
    },
    unarchive: (id) => {
        const stmt = db.prepare('UPDATE connections SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL');
        const result = stmt.run(id);
        if (result.changes > 0) {
            return ConnectionRepository.findById(id);
        }
        return null;
    },
    delete: (id) => {
        const stmt = db.prepare('DELETE FROM connections WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    },
    update: (id, dto) => {
        const existing = ConnectionRepository.findByIdIncludeArchived(id);
        if (!existing)
            return null;
        const fields = [];
        const values = [];
        if (dto.label !== undefined) {
            fields.push('label = ?');
            values.push(dto.label);
        }
        if (dto.color !== undefined) {
            fields.push('color = ?');
            values.push(dto.color);
        }
        if (dto.lineStyle !== undefined) {
            fields.push('line_style = ?');
            values.push(dto.lineStyle);
        }
        if (dto.relationTypeId !== undefined) {
            fields.push('relation_type_id = ?');
            values.push(dto.relationTypeId);
        }
        if (fields.length > 0) {
            values.push(id);
            const stmt = db.prepare(`UPDATE connections SET ${fields.join(', ')} WHERE id = ?`);
            stmt.run(...values);
        }
        return ConnectionRepository.findById(id);
    },
    findByRelationTypeId: (caseId, relationTypeId) => {
        const rows = db.prepare(`
      SELECT * FROM connections 
      WHERE case_id = ? AND relation_type_id = ? AND archived_at IS NULL
      ORDER BY created_at ASC
    `).all(caseId, relationTypeId);
        return rows.map(rowToConnection);
    },
    findByLabel: (caseId, label) => {
        const rows = db.prepare(`
      SELECT * FROM connections 
      WHERE case_id = ? AND label = ? AND archived_at IS NULL
      ORDER BY created_at ASC
    `).all(caseId, label);
        return rows.map(rowToConnection);
    },
    getTypeStats: (caseId) => {
        const rows = db.prepare(`
      SELECT 
        relation_type_id,
        COALESCE(label, '未分类') as label,
        color,
        COUNT(*) as count,
        GROUP_CONCAT(id) as ids
      FROM connections 
      WHERE case_id = ? AND archived_at IS NULL
      GROUP BY relation_type_id, label, color
      ORDER BY count DESC
    `).all(caseId);
        return rows.map(row => ({
            relationTypeId: row.relation_type_id,
            label: row.label,
            color: row.color,
            count: row.count,
            connectionIds: row.ids ? row.ids.split(',') : [],
        }));
    },
    bulkUpdateByRelationType: (caseId, relationTypeId, dto) => {
        const fields = [];
        const values = [];
        if (dto.color !== undefined) {
            fields.push('color = ?');
            values.push(dto.color);
        }
        if (dto.lineStyle !== undefined) {
            fields.push('line_style = ?');
            values.push(dto.lineStyle);
        }
        if (dto.relationTypeId !== undefined) {
            fields.push('relation_type_id = ?');
            values.push(dto.relationTypeId);
        }
        if (fields.length === 0)
            return 0;
        values.push(caseId, relationTypeId);
        const stmt = db.prepare(`
      UPDATE connections SET ${fields.join(', ')} 
      WHERE case_id = ? AND relation_type_id = ? AND archived_at IS NULL
    `);
        const result = stmt.run(...values);
        return result.changes;
    },
    bulkUpdateByLabel: (caseId, label, dto) => {
        const fields = [];
        const values = [];
        if (dto.color !== undefined) {
            fields.push('color = ?');
            values.push(dto.color);
        }
        if (dto.lineStyle !== undefined) {
            fields.push('line_style = ?');
            values.push(dto.lineStyle);
        }
        if (dto.relationTypeId !== undefined) {
            fields.push('relation_type_id = ?');
            values.push(dto.relationTypeId);
        }
        if (fields.length === 0)
            return 0;
        values.push(caseId, label);
        const stmt = db.prepare(`
      UPDATE connections SET ${fields.join(', ')} 
      WHERE case_id = ? AND label = ? AND archived_at IS NULL
    `);
        const result = stmt.run(...values);
        return result.changes;
    },
    bulkUpdateByIds: (connectionIds, dto) => {
        if (connectionIds.length === 0)
            return 0;
        const fields = [];
        const values = [];
        if (dto.color !== undefined) {
            fields.push('color = ?');
            values.push(dto.color);
        }
        if (dto.lineStyle !== undefined) {
            fields.push('line_style = ?');
            values.push(dto.lineStyle);
        }
        if (dto.relationTypeId !== undefined) {
            fields.push('relation_type_id = ?');
            values.push(dto.relationTypeId);
        }
        if (fields.length === 0)
            return 0;
        const placeholders = connectionIds.map(() => '?').join(', ');
        values.push(...connectionIds);
        const stmt = db.prepare(`
      UPDATE connections SET ${fields.join(', ')} 
      WHERE id IN (${placeholders}) AND archived_at IS NULL
    `);
        const result = stmt.run(...values);
        return result.changes;
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
