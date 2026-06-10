import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  Report,
  ReportCaseSummary,
  ReportRelationshipGraph,
  ReportTimelineEntry,
  ReportTaskSummary,
  ReportExportFormat,
  CreateReportDto,
  UpdateReportDto,
} from '@shared/types';

interface ReportRow {
  id: string;
  case_id: string;
  title: string;
  status: string;
  case_summary: string;
  relationship_graph: string;
  timeline: string;
  task_summaries: string;
  export_format: string;
  exported_content: string | null;
  generated_at: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
}

const rowToReport = (row: ReportRow): Report => ({
  id: row.id,
  caseId: row.case_id,
  title: row.title,
  status: row.status as Report['status'],
  caseSummary: JSON.parse(row.case_summary) as ReportCaseSummary,
  relationshipGraph: JSON.parse(row.relationship_graph) as ReportRelationshipGraph,
  timeline: JSON.parse(row.timeline) as ReportTimelineEntry[],
  taskSummaries: JSON.parse(row.task_summaries) as ReportTaskSummary[],
  exportFormat: row.export_format as ReportExportFormat,
  exportedContent: row.exported_content,
  generatedAt: row.generated_at,
  exportedAt: row.exported_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const ReportRepository = {
  findAll: (): Report[] => {
    const rows = db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all() as ReportRow[];
    return rows.map(rowToReport);
  },

  findByCaseId: (caseId: string): Report[] => {
    const rows = db.prepare('SELECT * FROM reports WHERE case_id = ? ORDER BY created_at DESC')
      .all(caseId) as ReportRow[];
    return rows.map(rowToReport);
  },

  findById: (id: string): Report | null => {
    const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRow | undefined;
    return row ? rowToReport(row) : null;
  },

  create: (
    dto: CreateReportDto,
    caseSummary: ReportCaseSummary,
    relationshipGraph: ReportRelationshipGraph,
    timeline: ReportTimelineEntry[],
    taskSummaries: ReportTaskSummary[],
  ): Report => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const title = dto.title ?? `${caseSummary.caseName} - 证据报告`;
    const stmt = db.prepare(`
      INSERT INTO reports (
        id, case_id, title, status,
        case_summary, relationship_graph, timeline, task_summaries,
        export_format, generated_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.caseId,
      title,
      JSON.stringify(caseSummary),
      JSON.stringify(relationshipGraph),
      JSON.stringify(timeline),
      JSON.stringify(taskSummaries),
      dto.exportFormat ?? 'json',
      now,
      now,
      now,
    );
    return ReportRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateReportDto): Report | null => {
    const existing = ReportRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.title !== undefined) {
      fields.push('title = ?');
      values.push(dto.title);
    }
    if (dto.status !== undefined) {
      fields.push('status = ?');
      values.push(dto.status);
    }
    if (dto.exportFormat !== undefined) {
      fields.push('export_format = ?');
      values.push(dto.exportFormat);
    }

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 1) {
      const stmt = db.prepare(`UPDATE reports SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return ReportRepository.findById(id);
  },

  updateExportedContent: (id: string, content: string, format: ReportExportFormat): Report | null => {
    const existing = ReportRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const stmt = db.prepare(`
      UPDATE reports
      SET exported_content = ?, export_format = ?, status = 'exported', exported_at = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(content, format, now, now, id);

    return ReportRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  deleteByCaseId: (caseId: string): number => {
    const stmt = db.prepare('DELETE FROM reports WHERE case_id = ?');
    const result = stmt.run(caseId);
    return result.changes;
  },
};
