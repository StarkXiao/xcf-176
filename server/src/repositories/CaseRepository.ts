import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type { Case, CreateCaseDto, UpdateCaseDto, CanvasState, CaseTemplate, CaseSearchFilters, CaseWithAggregatedData, Evidence } from '@shared/types';

interface CaseRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  key_clues: string;
  canvas_state: string | null;
  template_id: string | null;
  template_metadata: string | null;
  created_at: string;
  updated_at: string;
}

const rowToCase = (row: CaseRow): Case => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  status: row.status as Case['status'],
  keyClues: JSON.parse(row.key_clues) as string[],
  canvasState: row.canvas_state ? (JSON.parse(row.canvas_state) as CanvasState) : undefined,
  templateId: row.template_id ?? undefined,
  templateMetadata: row.template_metadata ? JSON.parse(row.template_metadata) : undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const CaseRepository = {
  findAll: (): Case[] => {
    const rows = db.prepare('SELECT * FROM cases ORDER BY updated_at DESC').all() as CaseRow[];
    return rows.map(rowToCase);
  },

  findById: (id: string): Case | null => {
    const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow | undefined;
    return row ? rowToCase(row) : null;
  },

  create: (dto: CreateCaseDto, template?: CaseTemplate): Case => {
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
    stmt.run(
      id,
      dto.name,
      dto.description ?? null,
      template ? template.id : null,
      templateMetadata ? JSON.stringify(templateMetadata) : null,
      now,
      now
    );
    return CaseRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateCaseDto): Case | null => {
    const existing = CaseRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

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

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM cases WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  findAllWithAggregatedData: (): CaseWithAggregatedData[] => {
    const cases = CaseRepository.findAll();
    const evidenceRows = db.prepare(
      'SELECT case_id, source, importance, tags FROM evidence WHERE deleted_at IS NULL'
    ).all() as Array<{ case_id: string; source: string; importance: string; tags: string }>;

    const caseEvidenceMap = new Map<string, Array<{ source: string; importance: string; tags: string[] }>>();
    for (const row of evidenceRows) {
      if (!caseEvidenceMap.has(row.case_id)) {
        caseEvidenceMap.set(row.case_id, []);
      }
      caseEvidenceMap.get(row.case_id)!.push({
        source: row.source,
        importance: row.importance,
        tags: JSON.parse(row.tags) as string[],
      });
    }

    const importanceOrder: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };

    return cases.map((caseItem) => {
      const evidences = caseEvidenceMap.get(caseItem.id) || [];
      const allTags = new Set<string>();
      const allSources = new Set<string>();
      let highestImportance: Evidence['importance'] | null = null;
      let highestImportanceRank = 0;

      for (const ev of evidences) {
        ev.tags.forEach((t) => allTags.add(t));
        if (ev.source && ev.source !== 'unknown') {
          allSources.add(ev.source);
        }
        const rank = importanceOrder[ev.importance] || 0;
        if (rank > highestImportanceRank) {
          highestImportanceRank = rank;
          highestImportance = ev.importance as Evidence['importance'];
        }
      }

      return {
        ...caseItem,
        allTags: Array.from(allTags).sort(),
        allSources: Array.from(allSources).sort(),
        highestImportance,
        evidenceCount: evidences.length,
      };
    });
  },

  search: (filters: CaseSearchFilters): CaseWithAggregatedData[] => {
    let cases = CaseRepository.findAllWithAggregatedData();
    const importanceOrder: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };

    if (filters.keyword && filters.keyword.trim()) {
      const keyword = filters.keyword.trim().toLowerCase();
      cases = cases.filter((c) => {
        const matchesName = c.name.toLowerCase().includes(keyword);
        const matchesDesc = c.description?.toLowerCase().includes(keyword);
        const matchesTag = c.allTags.some((t) => t.toLowerCase().includes(keyword));
        const matchesSource = c.allSources.some((s) => s.toLowerCase().includes(keyword));
        return matchesName || matchesDesc || matchesTag || matchesSource;
      });
    }

    if (filters.tags.length > 0) {
      cases = cases.filter((c) =>
        filters.tags.some((tag) => c.allTags.includes(tag))
      );
    }

    if (filters.sources.length > 0) {
      cases = cases.filter((c) =>
        filters.sources.some((source) =>
          c.allSources.some((s) => s === source || s.includes(source))
        )
      );
    }

    if (filters.importance) {
      const targetRank = importanceOrder[filters.importance] || 0;
      cases = cases.filter((c) => {
        if (!c.highestImportance) return false;
        return (importanceOrder[c.highestImportance] || 0) >= targetRank;
      });
    }

    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      const dateField = filters.dateField || 'updatedAt';
      cases = cases.filter((c) => {
        const caseDate = new Date(c[dateField]).getTime();
        if (filters.dateRange!.start) {
          const start = new Date(filters.dateRange!.start).getTime();
          if (caseDate < start) return false;
        }
        if (filters.dateRange!.end) {
          const end = new Date(filters.dateRange!.end).getTime() + 24 * 60 * 60 * 1000;
          if (caseDate >= end) return false;
        }
        return true;
      });
    }

    return cases;
  },

  getAllAvailableTags: (): string[] => {
    const rows = db.prepare(
      'SELECT DISTINCT tags FROM evidence WHERE deleted_at IS NULL AND tags != \'[]\''
    ).all() as Array<{ tags: string }>;
    const tagSet = new Set<string>();
    for (const row of rows) {
      try {
        const tags = JSON.parse(row.tags) as string[];
        tags.forEach((t) => tagSet.add(t));
      } catch {
        // skip invalid JSON
      }
    }
    return Array.from(tagSet).sort();
  },

  getAllAvailableSources: (): string[] => {
    const rows = db.prepare(
      'SELECT DISTINCT source FROM evidence WHERE deleted_at IS NULL AND source IS NOT NULL AND source != \'unknown\''
    ).all() as Array<{ source: string }>;
    return rows.map((r) => r.source).filter(Boolean).sort();
  },
};
