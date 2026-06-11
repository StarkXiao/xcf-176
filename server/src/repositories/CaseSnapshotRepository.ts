import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  CaseSnapshot,
  CaseSnapshotFilterState,
  CaseSnapshotCanvasLayout,
  CaseSnapshotRelationshipNote,
  Evidence,
  Connection,
  ConnectionGroup,
  CreateCaseSnapshotDto,
  UpdateCaseSnapshotDto,
  CaseSnapshotExportFormat,
} from '@shared/types';

interface CaseSnapshotRow {
  id: string;
  case_id: string;
  case_name: string;
  title: string;
  description: string | null;
  created_by: string;
  created_by_name: string;
  filter_state: string;
  canvas_layout: string;
  relationship_notes: string;
  evidence: string;
  connections: string;
  connection_groups: string;
  exported_format: string | null;
  exported_content: string | null;
  created_at: string;
  updated_at: string;
}

const rowToSnapshot = (row: CaseSnapshotRow): CaseSnapshot => ({
  id: row.id,
  caseId: row.case_id,
  caseName: row.case_name,
  title: row.title,
  description: row.description ?? undefined,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  filterState: JSON.parse(row.filter_state) as CaseSnapshotFilterState,
  canvasLayout: JSON.parse(row.canvas_layout) as CaseSnapshotCanvasLayout,
  relationshipNotes: JSON.parse(row.relationship_notes) as CaseSnapshotRelationshipNote[],
  evidence: JSON.parse(row.evidence) as Evidence[],
  connections: JSON.parse(row.connections) as Connection[],
  connectionGroups: JSON.parse(row.connection_groups) as ConnectionGroup[],
  exportedFormat: row.exported_format as CaseSnapshotExportFormat | undefined,
  exportedContent: row.exported_content,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const CaseSnapshotRepository = {
  findAll: (): CaseSnapshot[] => {
    const rows = db.prepare('SELECT * FROM case_snapshots ORDER BY created_at DESC').all() as CaseSnapshotRow[];
    return rows.map(rowToSnapshot);
  },

  findByCaseId: (caseId: string): CaseSnapshot[] => {
    const rows = db.prepare('SELECT * FROM case_snapshots WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as CaseSnapshotRow[];
    return rows.map(rowToSnapshot);
  },

  findById: (id: string): CaseSnapshot | null => {
    const row = db.prepare('SELECT * FROM case_snapshots WHERE id = ?').get(id) as CaseSnapshotRow | undefined;
    return row ? rowToSnapshot(row) : null;
  },

  create: (
    dto: CreateCaseSnapshotDto,
    caseName: string,
    evidence: Evidence[],
    connections: Connection[],
    connectionGroups: ConnectionGroup[],
  ): CaseSnapshot => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const title = dto.title ?? `${caseName} - 案件快照`;
    const stmt = db.prepare(`
      INSERT INTO case_snapshots (
        id, case_id, case_name, title, description,
        created_by, created_by_name,
        filter_state, canvas_layout, relationship_notes,
        evidence, connections, connection_groups,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      caseName,
      title,
      dto.description ?? null,
      dto.createdBy,
      dto.createdByName,
      JSON.stringify(dto.filterState),
      JSON.stringify(dto.canvasLayout),
      JSON.stringify(dto.relationshipNotes ?? []),
      JSON.stringify(evidence),
      JSON.stringify(connections),
      JSON.stringify(connectionGroups),
      now,
      now,
    );
    return CaseSnapshotRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateCaseSnapshotDto): CaseSnapshot | null => {
    const existing = CaseSnapshotRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.title !== undefined) {
      fields.push('title = ?');
      values.push(dto.title);
    }
    if (dto.description !== undefined) {
      fields.push('description = ?');
      values.push(dto.description ?? null);
    }
    if (dto.relationshipNotes !== undefined) {
      fields.push('relationship_notes = ?');
      values.push(JSON.stringify(dto.relationshipNotes));
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 1) {
      const stmt = db.prepare(`UPDATE case_snapshots SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return CaseSnapshotRepository.findById(id);
  },

  updateExportedContent: (
    id: string,
    content: string,
    format: CaseSnapshotExportFormat,
  ): CaseSnapshot | null => {
    const existing = CaseSnapshotRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE case_snapshots
      SET exported_content = ?, exported_format = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(content, format, now, id);

    return CaseSnapshotRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM case_snapshots WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM case_snapshots WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },
};
