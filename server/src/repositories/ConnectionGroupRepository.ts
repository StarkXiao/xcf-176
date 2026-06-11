import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { ConnectionGroup, CreateConnectionGroupDto, UpdateConnectionGroupDto } from '@shared/types';

interface ConnectionGroupRow {
  id: string;
  case_id: string;
  name: string;
  color: string;
  line_style: string;
  relation_type_id: string | null;
  connection_ids: string;
  visible: number;
  created_at: string;
  updated_at: string;
}

const rowToConnectionGroup = (row: ConnectionGroupRow): ConnectionGroup => ({
  id: row.id,
  caseId: row.case_id,
  name: row.name,
  color: row.color,
  lineStyle: row.line_style as ConnectionGroup['lineStyle'],
  relationTypeId: row.relation_type_id,
  connectionIds: JSON.parse(row.connection_ids || '[]'),
  visible: row.visible === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const ConnectionGroupRepository = {
  findAll: (): ConnectionGroup[] => {
    const rows = db.prepare(
      'SELECT * FROM connection_groups ORDER BY created_at DESC'
    ).all() as ConnectionGroupRow[];
    return rows.map(rowToConnectionGroup);
  },

  findById: (id: string): ConnectionGroup | null => {
    const row = db.prepare(
      'SELECT * FROM connection_groups WHERE id = ?'
    ).get(id) as ConnectionGroupRow | undefined;
    return row ? rowToConnectionGroup(row) : null;
  },

  findByCaseId: (caseId: string): ConnectionGroup[] => {
    const rows = db.prepare(
      'SELECT * FROM connection_groups WHERE case_id = ? ORDER BY created_at ASC'
    ).all(caseId) as ConnectionGroupRow[];
    return rows.map(rowToConnectionGroup);
  },

  findByRelationTypeId: (caseId: string, relationTypeId: string): ConnectionGroup | null => {
    const row = db.prepare(
      'SELECT * FROM connection_groups WHERE case_id = ? AND relation_type_id = ?'
    ).get(caseId, relationTypeId) as ConnectionGroupRow | undefined;
    return row ? rowToConnectionGroup(row) : null;
  },

  create: (dto: CreateConnectionGroupDto): ConnectionGroup => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO connection_groups (
        id, case_id, name, color, line_style, relation_type_id,
        connection_ids, visible, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.name,
      dto.color ?? '#6b7280',
      dto.lineStyle ?? 'solid',
      dto.relationTypeId ?? null,
      JSON.stringify(dto.connectionIds ?? []),
      1,
      now,
      now
    );
    return ConnectionGroupRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateConnectionGroupDto): ConnectionGroup | null => {
    const existing = ConnectionGroupRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) { fields.push('name = ?'); values.push(dto.name); }
    if (dto.color !== undefined) { fields.push('color = ?'); values.push(dto.color); }
    if (dto.lineStyle !== undefined) { fields.push('line_style = ?'); values.push(dto.lineStyle); }
    if (dto.relationTypeId !== undefined) { fields.push('relation_type_id = ?'); values.push(dto.relationTypeId); }
    if (dto.connectionIds !== undefined) { fields.push('connection_ids = ?'); values.push(JSON.stringify(dto.connectionIds)); }
    if (dto.visible !== undefined) { fields.push('visible = ?'); values.push(dto.visible ? 1 : 0); }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(now, id);

    const stmt = db.prepare(`UPDATE connection_groups SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return ConnectionGroupRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM connection_groups WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM connection_groups WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },

  addConnectionToGroup: (groupId: string, connectionId: string): ConnectionGroup | null => {
    const existing = ConnectionGroupRepository.findById(groupId);
    if (!existing) return null;

    const connectionIds = [...new Set([...existing.connectionIds, connectionId])];
    return ConnectionGroupRepository.update(groupId, { connectionIds });
  },

  removeConnectionFromGroup: (groupId: string, connectionId: string): ConnectionGroup | null => {
    const existing = ConnectionGroupRepository.findById(groupId);
    if (!existing) return null;

    const connectionIds = existing.connectionIds.filter(id => id !== connectionId);
    return ConnectionGroupRepository.update(groupId, { connectionIds });
  },

  toggleGroupVisibility: (groupId: string): ConnectionGroup | null => {
    const existing = ConnectionGroupRepository.findById(groupId);
    if (!existing) return null;

    return ConnectionGroupRepository.update(groupId, { visible: !existing.visible });
  },
};
