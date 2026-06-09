import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { EvidenceCollectionItem, CreateCollectionItemDto, VerificationStatus } from '@shared/types';

interface EvidenceCollectionRow {
  id: string;
  case_id: string;
  source_type: string;
  content: string;
  source_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  screenshot_data_url: string | null;
  content_hash: string;
  importance: string;
  tags: string;
  verification_status: string;
  duplicate_of: string | null;
  collected_at: string;
  archived_at: string | null;
  archived_evidence_id: string | null;
}

const rowToItem = (row: EvidenceCollectionRow): EvidenceCollectionItem => ({
  id: row.id,
  caseId: row.case_id,
  sourceType: row.source_type as EvidenceCollectionItem['sourceType'],
  content: row.content,
  sourceUrl: row.source_url ?? undefined,
  fileName: row.file_name ?? undefined,
  fileSize: row.file_size ?? undefined,
  fileType: row.file_type ?? undefined,
  screenshotDataUrl: row.screenshot_data_url ?? undefined,
  contentHash: row.content_hash,
  importance: row.importance as EvidenceCollectionItem['importance'],
  tags: JSON.parse(row.tags) as string[],
  verificationStatus: row.verification_status as VerificationStatus,
  duplicateOf: row.duplicate_of ?? undefined,
  collectedAt: row.collected_at,
  archivedAt: row.archived_at ?? undefined,
  archivedEvidenceId: row.archived_evidence_id ?? undefined,
});

export const EvidenceCollectionRepository = {
  findByCaseId: (caseId: string): EvidenceCollectionItem[] => {
    const rows = db
      .prepare('SELECT * FROM evidence_collection WHERE case_id = ? ORDER BY collected_at DESC')
      .all(caseId) as EvidenceCollectionRow[];
    return rows.map(rowToItem);
  },

  findById: (id: string): EvidenceCollectionItem | null => {
    const row = db
      .prepare('SELECT * FROM evidence_collection WHERE id = ?')
      .get(id) as EvidenceCollectionRow | undefined;
    return row ? rowToItem(row) : null;
  },

  findByContentHash: (caseId: string, contentHash: string): EvidenceCollectionItem | null => {
    const row = db
      .prepare(
        "SELECT * FROM evidence_collection WHERE case_id = ? AND content_hash = ? AND verification_status != 'duplicate' LIMIT 1"
      )
      .get(caseId, contentHash) as EvidenceCollectionRow | undefined;
    return row ? rowToItem(row) : null;
  },

  create: (dto: CreateCollectionItemDto & { contentHash: string }, verificationStatus: VerificationStatus = 'pending', duplicateOf?: string): EvidenceCollectionItem => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO evidence_collection (
        id, case_id, source_type, content, source_url, file_name, file_size,
        file_type, screenshot_data_url, content_hash, importance, tags,
        verification_status, duplicate_of, collected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      dto.sourceType,
      dto.content,
      dto.sourceUrl ?? null,
      dto.fileName ?? null,
      dto.fileSize ?? null,
      dto.fileType ?? null,
      dto.screenshotDataUrl ?? null,
      dto.contentHash,
      dto.importance ?? 'normal',
      JSON.stringify(dto.tags ?? []),
      verificationStatus,
      duplicateOf ?? null,
      now
    );
    return EvidenceCollectionRepository.findById(id)!;
  },

  updateVerificationStatus: (id: string, status: VerificationStatus): EvidenceCollectionItem | null => {
    db.prepare('UPDATE evidence_collection SET verification_status = ? WHERE id = ?').run(status, id);
    return EvidenceCollectionRepository.findById(id);
  },

  markArchived: (id: string, evidenceId: string): EvidenceCollectionItem | null => {
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE evidence_collection SET archived_at = ?, archived_evidence_id = ? WHERE id = ?'
    ).run(now, evidenceId, id);
    return EvidenceCollectionRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const result = db.prepare('DELETE FROM evidence_collection WHERE id = ?').run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const result = db.prepare('DELETE FROM evidence_collection WHERE case_id = ?').run(caseId);
    return result.changes;
  },

  findVerifiedNotArchived: (caseId: string): EvidenceCollectionItem[] => {
    const rows = db
      .prepare(
        "SELECT * FROM evidence_collection WHERE case_id = ? AND verification_status = 'verified' AND archived_at IS NULL ORDER BY collected_at ASC"
      )
      .all(caseId) as EvidenceCollectionRow[];
    return rows.map(rowToItem);
  },
};
