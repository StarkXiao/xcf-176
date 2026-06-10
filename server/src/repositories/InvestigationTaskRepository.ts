import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  InvestigationTask,
  InvestigationTaskPriority,
  InvestigationTaskStatus,
  CreateInvestigationTaskDto,
  UpdateInvestigationTaskDto,
} from '@shared/types';

interface InvestigationTaskRow {
  id: string;
  case_id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assignee_id: string | null;
  assignee_name: string | null;
  deadline: string | null;
  evidence_ids: string;
  collection_item_ids: string;
  connection_ids: string;
  created_by: string;
  created_by_name: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const rowToTask = (row: InvestigationTaskRow): InvestigationTask => ({
  id: row.id,
  caseId: row.case_id,
  title: row.title,
  description: row.description,
  priority: row.priority as InvestigationTaskPriority,
  status: row.status as InvestigationTaskStatus,
  assigneeId: row.assignee_id,
  assigneeName: row.assignee_name,
  deadline: row.deadline,
  evidenceIds: JSON.parse(row.evidence_ids) as string[],
  collectionItemIds: JSON.parse(row.collection_item_ids) as string[],
  connectionIds: JSON.parse(row.connection_ids) as string[],
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const InvestigationTaskRepository = {
  findAll: (): InvestigationTask[] => {
    const rows = db.prepare('SELECT * FROM investigation_tasks ORDER BY updated_at DESC').all() as InvestigationTaskRow[];
    return rows.map(rowToTask);
  },

  findByCaseId: (caseId: string): InvestigationTask[] => {
    const rows = db.prepare('SELECT * FROM investigation_tasks WHERE case_id = ? ORDER BY updated_at DESC').all(caseId) as InvestigationTaskRow[];
    return rows.map(rowToTask);
  },

  findById: (id: string): InvestigationTask | null => {
    const row = db.prepare('SELECT * FROM investigation_tasks WHERE id = ?').get(id) as InvestigationTaskRow | undefined;
    return row ? rowToTask(row) : null;
  },

  findByAssigneeId: (assigneeId: string): InvestigationTask[] => {
    const rows = db.prepare('SELECT * FROM investigation_tasks WHERE assignee_id = ? ORDER BY deadline ASC').all(assigneeId) as InvestigationTaskRow[];
    return rows.map(rowToTask);
  },

  findByStatus: (caseId: string, status: InvestigationTaskStatus): InvestigationTask[] => {
    const rows = db.prepare('SELECT * FROM investigation_tasks WHERE case_id = ? AND status = ? ORDER BY deadline ASC').all(caseId, status) as InvestigationTaskRow[];
    return rows.map(rowToTask);
  },

  findOverdue: (caseId: string): InvestigationTask[] => {
    const now = new Date().toISOString();
    const rows = db.prepare(
      "SELECT * FROM investigation_tasks WHERE case_id = ? AND deadline IS NOT NULL AND deadline < ? AND status NOT IN ('completed', 'cancelled') ORDER BY deadline ASC"
    ).all(caseId, now) as InvestigationTaskRow[];
    return rows.map(rowToTask);
  },

  create: (dto: CreateInvestigationTaskDto, assigneeName?: string, createdByName?: string): InvestigationTask => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO investigation_tasks (
        id, case_id, title, description, priority, status,
        assignee_id, assignee_name, deadline,
        evidence_ids, collection_item_ids, connection_ids,
        created_by, created_by_name, completed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.title,
      dto.description ?? '',
      dto.priority ?? 'normal',
      dto.assigneeId ?? null,
      assigneeName ?? null,
      dto.deadline ?? null,
      JSON.stringify(dto.evidenceIds ?? []),
      JSON.stringify(dto.collectionItemIds ?? []),
      JSON.stringify(dto.connectionIds ?? []),
      dto.createdBy,
      createdByName ?? '',
      now,
      now
    );
    return InvestigationTaskRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateInvestigationTaskDto, assigneeName?: string): InvestigationTask | null => {
    const existing = InvestigationTaskRepository.findById(id);
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
      values.push(dto.description);
    }
    if (dto.priority !== undefined) {
      fields.push('priority = ?');
      values.push(dto.priority);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
      if (dto.status === 'completed') {
        fields.push('completed_at = ?');
        values.push(now);
      }
      if (existing.status === 'completed' && dto.status !== 'completed') {
        fields.push('completed_at = ?');
        values.push(null);
      }
    }
    if (dto.assigneeId !== undefined) {
      fields.push('assignee_id = ?');
      values.push(dto.assigneeId);
      fields.push('assignee_name = ?');
      values.push(assigneeName ?? null);
    }
    if (dto.deadline !== undefined) {
      fields.push('deadline = ?');
      values.push(dto.deadline);
    }
    if (dto.evidenceIds !== undefined) {
      fields.push('evidence_ids = ?');
      values.push(JSON.stringify(dto.evidenceIds));
    }
    if (dto.collectionItemIds !== undefined) {
      fields.push('collection_item_ids = ?');
      values.push(JSON.stringify(dto.collectionItemIds));
    }
    if (dto.connectionIds !== undefined) {
      fields.push('connection_ids = ?');
      values.push(JSON.stringify(dto.connectionIds));
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE investigation_tasks SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return InvestigationTaskRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM investigation_tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },
};
