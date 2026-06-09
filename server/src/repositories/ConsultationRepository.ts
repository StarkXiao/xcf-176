import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  Consultation,
  ConsultationDiscussion,
  ConsultationConclusion,
  ConsultationDispute,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateDiscussionDto,
  CreateConclusionDto,
  CreateDisputeDto,
  ResolveDisputeDto,
  ConsultationWithDetails,
} from '@shared/types';

interface ConsultationRow {
  id: string;
  case_id: string;
  title: string;
  description: string;
  status: string;
  initiated_by: string;
  evidence_ids: string;
  key_clues: string;
  concluded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface DiscussionRow {
  id: string;
  consultation_id: string;
  collaborator_id: string;
  collaborator_name: string;
  evidence_id: string | null;
  content: string;
  is_dispute: number;
  created_at: string;
}

interface ConclusionRow {
  id: string;
  consultation_id: string;
  content: string;
  decided_by: string;
  decided_by_name: string;
  case_status_update: string | null;
  key_clues_update: string | null;
  created_at: string;
}

interface DisputeRow {
  id: string;
  consultation_id: string;
  discussion_id: string;
  evidence_id: string | null;
  description: string;
  raised_by: string;
  raised_by_name: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
}

const rowToConsultation = (row: ConsultationRow): Consultation => ({
  id: row.id,
  caseId: row.case_id,
  title: row.title,
  description: row.description,
  status: row.status as Consultation['status'],
  initiatedBy: row.initiated_by,
  evidenceIds: JSON.parse(row.evidence_ids) as string[],
  keyClues: JSON.parse(row.key_clues) as string[],
  concludedAt: row.concluded_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const rowToDiscussion = (row: DiscussionRow): ConsultationDiscussion => ({
  id: row.id,
  consultationId: row.consultation_id,
  collaboratorId: row.collaborator_id,
  collaboratorName: row.collaborator_name,
  evidenceId: row.evidence_id ?? undefined,
  content: row.content,
  isDispute: row.is_dispute === 1,
  createdAt: row.created_at,
});

const rowToConclusion = (row: ConclusionRow): ConsultationConclusion => ({
  id: row.id,
  consultationId: row.consultation_id,
  content: row.content,
  decidedBy: row.decided_by,
  decidedByName: row.decided_by_name,
  caseStatusUpdate: (row.case_status_update as ConsultationConclusion['caseStatusUpdate']) ?? undefined,
  keyCluesUpdate: row.key_clues_update ? (JSON.parse(row.key_clues_update) as string[]) : undefined,
  createdAt: row.created_at,
});

const rowToDispute = (row: DisputeRow): ConsultationDispute => ({
  id: row.id,
  consultationId: row.consultation_id,
  discussionId: row.discussion_id,
  evidenceId: row.evidence_id ?? undefined,
  description: row.description,
  raisedBy: row.raised_by,
  raisedByName: row.raised_by_name,
  resolution: row.resolution ?? undefined,
  resolvedBy: row.resolved_by ?? undefined,
  resolvedByName: row.resolved_by_name ?? undefined,
  resolvedAt: row.resolved_at ?? undefined,
  createdAt: row.created_at,
});

export const ConsultationRepository = {
  findAll: (): Consultation[] => {
    const rows = db.prepare('SELECT * FROM consultations ORDER BY updated_at DESC').all() as ConsultationRow[];
    return rows.map(rowToConsultation);
  },

  findById: (id: string): Consultation | null => {
    const row = db.prepare('SELECT * FROM consultations WHERE id = ?').get(id) as ConsultationRow | undefined;
    return row ? rowToConsultation(row) : null;
  },

  findByCaseId: (caseId: string): Consultation[] => {
    const rows = db.prepare('SELECT * FROM consultations WHERE case_id = ? ORDER BY updated_at DESC').all(caseId) as ConsultationRow[];
    return rows.map(rowToConsultation);
  },

  findWithDetails: (id: string): ConsultationWithDetails | null => {
    const consultation = ConsultationRepository.findById(id);
    if (!consultation) return null;

    const discussions = ConsultationRepository.findDiscussions(id);
    const conclusions = ConsultationRepository.findConclusions(id);
    const disputes = ConsultationRepository.findDisputes(id);

    return { ...consultation, discussions, conclusions, disputes };
  },

  create: (dto: CreateConsultationDto): Consultation => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO consultations (id, case_id, title, description, status, initiated_by, evidence_ids, key_clues, concluded_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?, ?, NULL, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.title,
      dto.description ?? '',
      dto.initiatedBy,
      JSON.stringify(dto.evidenceIds ?? []),
      JSON.stringify(dto.keyClues ?? []),
      now,
      now
    );
    return ConsultationRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateConsultationDto): Consultation | null => {
    const existing = ConsultationRepository.findById(id);
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
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    if (dto.evidenceIds !== undefined) {
      fields.push('evidence_ids = ?');
      values.push(JSON.stringify(dto.evidenceIds));
    }
    if (dto.keyClues !== undefined) {
      fields.push('key_clues = ?');
      values.push(JSON.stringify(dto.keyClues));
    }
    if (dto.concludedAt !== undefined) {
      fields.push('concluded_at = ?');
      values.push(dto.concludedAt);
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE consultations SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return ConsultationRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM consultations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  findDiscussions: (consultationId: string): ConsultationDiscussion[] => {
    const rows = db.prepare('SELECT * FROM consultation_discussions WHERE consultation_id = ? ORDER BY created_at ASC').all(consultationId) as DiscussionRow[];
    return rows.map(rowToDiscussion);
  },

  addDiscussion: (dto: CreateDiscussionDto): ConsultationDiscussion => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO consultation_discussions (id, consultation_id, collaborator_id, collaborator_name, evidence_id, content, is_dispute, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, dto.consultationId, dto.collaboratorId, dto.collaboratorName, dto.evidenceId ?? null, dto.content, dto.isDispute ? 1 : 0, now);
    return rowToDiscussion((db.prepare('SELECT * FROM consultation_discussions WHERE id = ?').get(id) as DiscussionRow));
  },

  findConclusions: (consultationId: string): ConsultationConclusion[] => {
    const rows = db.prepare('SELECT * FROM consultation_conclusions WHERE consultation_id = ? ORDER BY created_at ASC').all(consultationId) as ConclusionRow[];
    return rows.map(rowToConclusion);
  },

  addConclusion: (dto: CreateConclusionDto): ConsultationConclusion => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO consultation_conclusions (id, consultation_id, content, decided_by, decided_by_name, case_status_update, key_clues_update, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.consultationId,
      dto.content,
      dto.decidedBy,
      dto.decidedByName,
      dto.caseStatusUpdate ?? null,
      dto.keyCluesUpdate ? JSON.stringify(dto.keyCluesUpdate) : null,
      now
    );
    return rowToConclusion((db.prepare('SELECT * FROM consultation_conclusions WHERE id = ?').get(id) as ConclusionRow));
  },

  findDisputes: (consultationId: string): ConsultationDispute[] => {
    const rows = db.prepare('SELECT * FROM consultation_disputes WHERE consultation_id = ? ORDER BY created_at ASC').all(consultationId) as DisputeRow[];
    return rows.map(rowToDispute);
  },

  addDispute: (dto: CreateDisputeDto): ConsultationDispute => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO consultation_disputes (id, consultation_id, discussion_id, evidence_id, description, raised_by, raised_by_name, resolution, resolved_by, resolved_by_name, resolved_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?)
    `);
    stmt.run(id, dto.consultationId, dto.discussionId, dto.evidenceId ?? null, dto.description, dto.raisedBy, dto.raisedByName, now);
    return rowToDispute((db.prepare('SELECT * FROM consultation_disputes WHERE id = ?').get(id) as DisputeRow));
  },

  resolveDispute: (id: string, dto: ResolveDisputeDto): ConsultationDispute | null => {
    const existing = db.prepare('SELECT * FROM consultation_disputes WHERE id = ?').get(id) as DisputeRow | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE consultation_disputes SET resolution = ?, resolved_by = ?, resolved_by_name = ?, resolved_at = ? WHERE id = ?
    `);
    stmt.run(dto.resolution, dto.resolvedBy, dto.resolvedByName, now, id);
    return rowToDispute((db.prepare('SELECT * FROM consultation_disputes WHERE id = ?').get(id) as DisputeRow));
  },
};
