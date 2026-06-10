import { CaseTemplateRepository } from '../repositories/CaseTemplateRepository.js';
import { CaseRepository } from '../repositories/CaseRepository.js';
import { InvestigationTaskRepository } from '../repositories/InvestigationTaskRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import type {
  CaseTemplate,
  CreateCaseTemplateDto,
  UpdateCaseTemplateDto,
  ApplyTemplateDto,
  ApplyTemplateResult,
  CaseWithRelations,
  CreateInvestigationTaskDto,
  Evidence,
  Connection,
  InvestigationTask,
} from '@shared/types';
import { builtInTemplates } from '../data/builtInTemplates.js';

export const CaseTemplateService = {
  getAllTemplates: (): CaseTemplate[] => {
    return CaseTemplateRepository.findAll();
  },

  getTemplateById: (id: string): CaseTemplate | null => {
    return CaseTemplateRepository.findById(id);
  },

  getTemplatesByCategory: (category: string): CaseTemplate[] => {
    return CaseTemplateRepository.findByCategory(category);
  },

  getBuiltInTemplates: (): CaseTemplate[] => {
    return CaseTemplateRepository.findBuiltIn();
  },

  createTemplate: (dto: CreateCaseTemplateDto): CaseTemplate => {
    return CaseTemplateRepository.create(dto, false);
  },

  updateTemplate: (id: string, dto: UpdateCaseTemplateDto): CaseTemplate | null => {
    return CaseTemplateRepository.update(id, dto);
  },

  deleteTemplate: (id: string): boolean => {
    const template = CaseTemplateRepository.findById(id);
    if (!template) return false;
    if (template.isBuiltIn) {
      throw new Error('内置模板不可删除');
    }
    return CaseTemplateRepository.delete(id);
  },

  applyTemplate: (dto: ApplyTemplateDto): ApplyTemplateResult => {
    const template = CaseTemplateRepository.findById(dto.templateId);
    if (!template) {
      throw new Error('模板不存在');
    }

    const newCase = CaseRepository.create(
      {
        name: dto.caseName,
        description: dto.caseDescription ?? template.description,
      },
      template
    );

    const tasks: InvestigationTask[] = [];
    const sortedSteps = [...template.investigationSteps].sort((a, b) => a.order - b.order);

    for (const step of sortedSteps) {
      const taskDto: CreateInvestigationTaskDto = {
        caseId: newCase.id,
        title: step.title,
        description: step.description,
        priority: step.priority,
        createdBy: dto.createdBy,
        evidenceIds: [],
        collectionItemIds: [],
        connectionIds: [],
      };
      const task = InvestigationTaskRepository.create(taskDto, undefined, undefined);
      tasks.push(task);
    }

    const evidence: Evidence[] = [];
    const connections: Connection[] = [];
    const collaborators = CollaboratorRepository.findByCaseId(newCase.id);

    const caseWithRelations: CaseWithRelations = {
      ...newCase,
      evidence,
      connections,
      collaborators,
    };

    return {
      case: caseWithRelations,
      template,
      evidenceFields: template.evidenceFields,
      relationTypes: template.relationTypes,
      investigationSteps: template.investigationSteps,
      createdTasks: tasks,
    };
  },

  initializeBuiltInTemplates: (): void => {
    const existingCount = CaseTemplateRepository.count();
    if (existingCount > 0) return;

    for (const tpl of builtInTemplates) {
      CaseTemplateRepository.createWithId(tpl.id, tpl, true);
    }
  },
};
