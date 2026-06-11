import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  AnomalyAlert,
  AnomalyAlertStatus,
  AnomalyAlertSeverity,
  AnomalyAlertType,
  UpdateAnomalyAlertDto,
} from '@shared/types';

interface AnomalyAlertRow {
  id: string;
  case_id: string;
  case_name: string;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  score: number;
  evidence_count: number;
  connection_count: number;
  critical_evidence_count: number;
  high_evidence_count: number;
  burst_start: string | null;
  burst_end: string | null;
  evidence_ids: string;
  connection_ids: string;
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  notes: string | null;
}

const rowToAnomalyAlert = (row: AnomalyAlertRow): AnomalyAlert => ({
  id: row.id,
  caseId: row.case_id,
  caseName: row.case_name,
  type: row.type as AnomalyAlertType,
  severity: row.severity as AnomalyAlertSeverity,
  status: row.status as AnomalyAlertStatus,
  title: row.title,
  description: row.description,
  score: row.score,
  evidenceCount: row.evidence_count,
  connectionCount: row.connection_count,
  criticalEvidenceCount: row.critical_evidence_count,
  highEvidenceCount: row.high_evidence_count,
  burstStart: row.burst_start ?? undefined,
  burstEnd: row.burst_end ?? undefined,
  evidenceIds: JSON.parse(row.evidence_ids) as string[],
  connectionIds: JSON.parse(row.connection_ids) as string[],
  detectedAt: row.detected_at,
  reviewedAt: row.reviewed_at ?? undefined,
  reviewedBy: row.reviewed_by ?? undefined,
  notes: row.notes ?? undefined,
});

interface CreateAnomalyAlertData {
  caseId: string;
  caseName: string;
  type: AnomalyAlertType;
  severity: AnomalyAlertSeverity;
  title: string;
  description: string;
  score: number;
  evidenceCount: number;
  connectionCount: number;
  criticalEvidenceCount: number;
  highEvidenceCount: number;
  burstStart?: string;
  burstEnd?: string;
  evidenceIds: string[];
  connectionIds: string[];
}

export const AnomalyAlertRepository = {
  findAll: (): AnomalyAlert[] => {
    const rows = db.prepare('SELECT * FROM anomaly_alerts ORDER BY detected_at DESC').all() as AnomalyAlertRow[];
    return rows.map(rowToAnomalyAlert);
  },

  findById: (id: string): AnomalyAlert | null => {
    const row = db.prepare('SELECT * FROM anomaly_alerts WHERE id = ?').get(id) as AnomalyAlertRow | undefined;
    return row ? rowToAnomalyAlert(row) : null;
  },

  findByCaseId: (caseId: string): AnomalyAlert[] => {
    const rows = db.prepare('SELECT * FROM anomaly_alerts WHERE case_id = ? ORDER BY detected_at DESC')
      .all(caseId) as AnomalyAlertRow[];
    return rows.map(rowToAnomalyAlert);
  },

  findByStatus: (status: AnomalyAlertStatus): AnomalyAlert[] => {
    const rows = db.prepare('SELECT * FROM anomaly_alerts WHERE status = ? ORDER BY detected_at DESC')
      .all(status) as AnomalyAlertRow[];
    return rows.map(rowToAnomalyAlert);
  },

  findBySeverity: (severity: AnomalyAlertSeverity): AnomalyAlert[] => {
    const rows = db.prepare('SELECT * FROM anomaly_alerts WHERE severity = ? ORDER BY detected_at DESC')
      .all(severity) as AnomalyAlertRow[];
    return rows.map(rowToAnomalyAlert);
  },

  findPending: (): AnomalyAlert[] => {
    const rows = db.prepare(`
      SELECT * FROM anomaly_alerts 
      WHERE status = 'pending' 
      ORDER BY 
        CASE severity 
          WHEN 'critical' THEN 0 
          WHEN 'high' THEN 1 
          WHEN 'warning' THEN 2 
        END,
        score DESC,
        detected_at DESC
    `).all() as AnomalyAlertRow[];
    return rows.map(rowToAnomalyAlert);
  },

  create: (data: CreateAnomalyAlertData): AnomalyAlert => {
    const id = uuidv4();
    const now = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO anomaly_alerts (
        id, case_id, case_name, type, severity, status,
        title, description, score,
        evidence_count, connection_count,
        critical_evidence_count, high_evidence_count,
        burst_start, burst_end,
        evidence_ids, connection_ids,
        detected_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.caseId,
      data.caseName,
      data.type,
      data.severity,
      data.title,
      data.description,
      data.score,
      data.evidenceCount,
      data.connectionCount,
      data.criticalEvidenceCount,
      data.highEvidenceCount,
      data.burstStart ?? null,
      data.burstEnd ?? null,
      JSON.stringify(data.evidenceIds),
      JSON.stringify(data.connectionIds),
      now
    );

    return AnomalyAlertRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateAnomalyAlertDto): AnomalyAlert | null => {
    const existing = AnomalyAlertRepository.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
      if (dto.status !== 'pending') {
        fields.push('reviewed_at = ?');
        values.push(new Date().toISOString());
      }
    }
    if (dto.notes !== undefined) {
      fields.push('notes = ?');
      values.push(dto.notes);
    }
    if (dto.reviewedBy !== undefined) {
      fields.push('reviewed_by = ?');
      values.push(dto.reviewedBy);
    }

    if (fields.length === 0) return existing;

    values.push(id);
    const stmt = db.prepare(`UPDATE anomaly_alerts SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return AnomalyAlertRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM anomaly_alerts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM anomaly_alerts WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },

  deletePendingByCaseId: (caseId: string): number => {
    const stmt = db.prepare("DELETE FROM anomaly_alerts WHERE case_id = ? AND status = 'pending'");
    const result = stmt.run(caseId);
    return result.changes;
  },

  deleteByTypeAndCase: (caseId: string, type: AnomalyAlertType): number => {
    const stmt = db.prepare('DELETE FROM anomaly_alerts WHERE case_id = ? AND type = ?');
    const result = stmt.run(caseId, type);
    return result.changes;
  },

  existsByCaseAndType: (caseId: string, type: AnomalyAlertType): boolean => {
    const row = db.prepare(
      'SELECT COUNT(*) as count FROM anomaly_alerts WHERE case_id = ? AND type = ?'
    ).get(caseId, type) as { count: number };
    return row.count > 0;
  },
};
