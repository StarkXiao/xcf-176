import { v4 as uuidv4 } from 'uuid';
import db from '../database/index.js';
import type {
  CaseTemplate,
  CreateCaseTemplateDto,
  UpdateCaseTemplateDto,
  TemplateEvidenceField,
  TemplateRelationType,
  TemplateInvestigationStep,
} from '@shared/types';

interface CaseTemplateRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  icon: string | null;
  color: string;
  evidence_fields: string;
  relation_types: string;
  investigation_steps: string;
  default_tags: string;
  is_built_in: number;
  created_at: string;
  updated_at: string;
}

const rowToTemplate = (row: CaseTemplateRow): CaseTemplate => ({
  id: row.id,
  name: row.name,
  category: row.category as CaseTemplate['category'],
  description: row.description ?? '',
  icon: row.icon ?? undefined,
  color: row.color,
  evidenceFields: JSON.parse(row.evidence_fields) as TemplateEvidenceField[],
  relationTypes: JSON.parse(row.relation_types) as TemplateRelationType[],
  investigationSteps: JSON.parse(row.investigation_steps) as TemplateInvestigationStep[],
  defaultTags: JSON.parse(row.default_tags) as string[],
  isBuiltIn: row.is_built_in === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const CaseTemplateRepository = {
  findAll: (): CaseTemplate[] => {
    const rows = db.prepare('SELECT * FROM case_templates ORDER BY is_built_in DESC, created_at DESC')
      .all() as CaseTemplateRow[];
    return rows.map(rowToTemplate);
  },

  findById: (id: string): CaseTemplate | null => {
    const row = db.prepare('SELECT * FROM case_templates WHERE id = ?').get(id) as CaseTemplateRow | undefined;
    return row ? rowToTemplate(row) : null;
  },

  findByCategory: (category: string): CaseTemplate[] => {
    const rows = db.prepare('SELECT * FROM case_templates WHERE category = ? ORDER BY is_built_in DESC, created_at DESC')
      .all(category) as CaseTemplateRow[];
    return rows.map(rowToTemplate);
  },

  findBuiltIn: (): CaseTemplate[] => {
    const rows = db.prepare('SELECT * FROM case_templates WHERE is_built_in = 1 ORDER BY created_at ASC')
      .all() as CaseTemplateRow[];
    return rows.map(rowToTemplate);
  },

  create: (dto: CreateCaseTemplateDto, isBuiltIn = false): CaseTemplate => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO case_templates (
        id, name, category, description, icon, color,
        evidence_fields, relation_types, investigation_steps, default_tags,
        is_built_in, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.name,
      dto.category,
      dto.description ?? null,
      dto.icon ?? null,
      dto.color ?? '#3b82f6',
      JSON.stringify(dto.evidenceFields ?? []),
      JSON.stringify(dto.relationTypes ?? []),
      JSON.stringify(dto.investigationSteps ?? []),
      JSON.stringify(dto.defaultTags ?? []),
      isBuiltIn ? 1 : 0,
      now,
      now
    );
    return CaseTemplateRepository.findById(id)!;
  },

  createWithId: (id: string, dto: CreateCaseTemplateDto, isBuiltIn = false): CaseTemplate => {
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO case_templates (
        id, name, category, description, icon, color,
        evidence_fields, relation_types, investigation_steps, default_tags,
        is_built_in, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      dto.name,
      dto.category,
      dto.description ?? null,
      dto.icon ?? null,
      dto.color ?? '#3b82f6',
      JSON.stringify(dto.evidenceFields ?? []),
      JSON.stringify(dto.relationTypes ?? []),
      JSON.stringify(dto.investigationSteps ?? []),
      JSON.stringify(dto.defaultTags ?? []),
      isBuiltIn ? 1 : 0,
      now,
      now
    );
    return CaseTemplateRepository.findById(id)!;
  },

  update: (id: string, dto: UpdateCaseTemplateDto): CaseTemplate | null => {
    const existing = CaseTemplateRepository.findById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: unknown[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      values.push(dto.name);
    }
    if (dto.category !== undefined) {
      fields.push('category = ?');
      values.push(dto.category);
    }
    if (dto.description !== undefined) {
      fields.push('description = ?');
      values.push(dto.description);
    }
    if (dto.icon !== undefined) {
      fields.push('icon = ?');
      values.push(dto.icon ?? null);
    }
    if (dto.color !== undefined) {
      fields.push('color = ?');
      values.push(dto.color);
    }
    if (dto.evidenceFields !== undefined) {
      fields.push('evidence_fields = ?');
      values.push(JSON.stringify(dto.evidenceFields));
    }
    if (dto.relationTypes !== undefined) {
      fields.push('relation_types = ?');
      values.push(JSON.stringify(dto.relationTypes));
    }
    if (dto.investigationSteps !== undefined) {
      fields.push('investigation_steps = ?');
      values.push(JSON.stringify(dto.investigationSteps));
    }
    if (dto.defaultTags !== undefined) {
      fields.push('default_tags = ?');
      values.push(JSON.stringify(dto.defaultTags));
    }
    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    if (fields.length > 0) {
      const stmt = db.prepare(`UPDATE case_templates SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }

    return CaseTemplateRepository.findById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM case_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  count: (): number => {
    const result = db.prepare('SELECT COUNT(*) as count FROM case_templates').get() as { count: number };
    return result.count;
  },
};
