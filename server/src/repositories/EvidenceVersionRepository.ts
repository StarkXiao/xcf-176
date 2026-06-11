import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  EvidenceVersion,
  CreateEvidenceVersionDto,
  FieldDiff,
  TagChange,
  RelationChange,
  Connection,
  Evidence,
} from '@shared/types';

interface EvidenceVersionRow {
  id: string;
  evidence_id: string;
  case_id: string;
  version_number: number;
  change_type: string;
  change_summary: string;
  field_diffs: string;
  tag_changes: string;
  relation_changes: string;
  before_state: string | null;
  after_state: string | null;
  related_connections_snapshot: string | null;
  collaborator_id: string | null;
  collaborator_name: string | null;
  restored_from_version_id: string | null;
  created_at: string;
}

const rowToEvidenceVersion = (row: EvidenceVersionRow): EvidenceVersion => ({
  id: row.id,
  evidenceId: row.evidence_id,
  caseId: row.case_id,
  versionNumber: row.version_number,
  changeType: row.change_type as EvidenceVersion['changeType'],
  changeSummary: row.change_summary,
  fieldDiffs: JSON.parse(row.field_diffs) as FieldDiff[],
  tagChanges: JSON.parse(row.tag_changes) as TagChange[],
  relationChanges: JSON.parse(row.relation_changes) as RelationChange[],
  beforeState: row.before_state ? (JSON.parse(row.before_state) as Partial<Evidence>) : null,
  afterState: row.after_state ? (JSON.parse(row.after_state) as Partial<Evidence>) : null,
  relatedConnectionsSnapshot: row.related_connections_snapshot
    ? (JSON.parse(row.related_connections_snapshot) as Connection[])
    : null,
  collaboratorId: row.collaborator_id,
  collaboratorName: row.collaborator_name,
  restoredFromVersionId: row.restored_from_version_id ?? undefined,
  createdAt: row.created_at,
});

export const EvidenceVersionRepository = {
  findAll: (): EvidenceVersion[] => {
    const rows = db.prepare('SELECT * FROM evidence_versions ORDER BY created_at DESC').all() as EvidenceVersionRow[];
    return rows.map(rowToEvidenceVersion);
  },

  findById: (id: string): EvidenceVersion | null => {
    const row = db.prepare('SELECT * FROM evidence_versions WHERE id = ?').get(id) as EvidenceVersionRow | undefined;
    return row ? rowToEvidenceVersion(row) : null;
  },

  findByEvidenceId: (evidenceId: string): EvidenceVersion[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence_versions WHERE evidence_id = ? ORDER BY version_number ASC'
    ).all(evidenceId) as EvidenceVersionRow[];
    return rows.map(rowToEvidenceVersion);
  },

  findByCaseId: (caseId: string): EvidenceVersion[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence_versions WHERE case_id = ? ORDER BY created_at DESC'
    ).all(caseId) as EvidenceVersionRow[];
    return rows.map(rowToEvidenceVersion);
  },

  findLatestByEvidenceId: (evidenceId: string): EvidenceVersion | null => {
    const row = db.prepare(
      'SELECT * FROM evidence_versions WHERE evidence_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(evidenceId) as EvidenceVersionRow | undefined;
    return row ? rowToEvidenceVersion(row) : null;
  },

  getNextVersionNumber: (evidenceId: string): number => {
    const result = db.prepare(
      'SELECT COALESCE(MAX(version_number), 0) as max_num FROM evidence_versions WHERE evidence_id = ?'
    ).get(evidenceId) as { max_num: number };
    return result.max_num + 1;
  },

  findByEvidenceIdAndVersion: (evidenceId: string, versionNumber: number): EvidenceVersion | null => {
    const row = db.prepare(
      'SELECT * FROM evidence_versions WHERE evidence_id = ? AND version_number = ?'
    ).get(evidenceId, versionNumber) as EvidenceVersionRow | undefined;
    return row ? rowToEvidenceVersion(row) : null;
  },

  findByCollaboratorId: (collaboratorId: string): EvidenceVersion[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence_versions WHERE collaborator_id = ? ORDER BY created_at DESC'
    ).all(collaboratorId) as EvidenceVersionRow[];
    return rows.map(rowToEvidenceVersion);
  },

  findByDateRange: (caseId: string, startDate: string, endDate: string): EvidenceVersion[] => {
    const rows = db.prepare(
      'SELECT * FROM evidence_versions WHERE case_id = ? AND created_at >= ? AND created_at <= ? ORDER BY created_at ASC'
    ).all(caseId, startDate, endDate) as EvidenceVersionRow[];
    return rows.map(rowToEvidenceVersion);
  },

  create: (dto: CreateEvidenceVersionDto): EvidenceVersion => {
    const id = uuidv4();
    const versionNumber = EvidenceVersionRepository.getNextVersionNumber(dto.evidenceId);
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO evidence_versions (
        id, evidence_id, case_id, version_number, change_type, change_summary,
        field_diffs, tag_changes, relation_changes,
        before_state, after_state, related_connections_snapshot,
        collaborator_id, collaborator_name, restored_from_version_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      dto.evidenceId,
      dto.caseId,
      versionNumber,
      dto.changeType,
      dto.changeSummary ?? '',
      JSON.stringify(dto.fieldDiffs ?? []),
      JSON.stringify(dto.tagChanges ?? []),
      JSON.stringify(dto.relationChanges ?? []),
      dto.beforeState !== undefined && dto.beforeState !== null ? JSON.stringify(dto.beforeState) : null,
      dto.afterState !== undefined && dto.afterState !== null ? JSON.stringify(dto.afterState) : null,
      dto.relatedConnectionsSnapshot ? JSON.stringify(dto.relatedConnectionsSnapshot) : null,
      dto.collaboratorId ?? null,
      dto.collaboratorName ?? null,
      dto.restoredFromVersionId ?? null,
      now
    );

    return EvidenceVersionRepository.findById(id)!;
  },

  deleteByEvidenceId: (evidenceId: string): number => {
    const stmt = db.prepare('DELETE FROM evidence_versions WHERE evidence_id = ?');
    const result = stmt.run(evidenceId);
    return result.changes;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM evidence_versions WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },
};
