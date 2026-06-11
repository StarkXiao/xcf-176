import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { AnomalyAlertRepository } from '../repositories/AnomalyAlertRepository.js';
import { AnomalyAlertService } from './AnomalyAlertService.js';
import type { Case, CaseWithRelations, CreateCaseDto, UpdateCaseDto, CaseSearchFilters, CaseWithAggregatedData, CaseOverview } from '@shared/types';

export const CaseService = {
  getAllCases: (): Case[] => {
    return CaseRepository.findAll();
  },

  getCaseById: (id: string): Case | null => {
    return CaseRepository.findById(id);
  },

  getCaseWithRelations: (id: string): CaseWithRelations | null => {
    const caseData = CaseRepository.findById(id);
    if (!caseData) return null;

    const evidence = EvidenceRepository.findByCaseId(id);
    const connections = ConnectionRepository.findByCaseId(id);
    const collaborators = CollaboratorRepository.findByCaseId(id);

    return {
      ...caseData,
      evidence,
      connections,
      collaborators,
    };
  },

  createCase: (dto: CreateCaseDto): Case => {
    return CaseRepository.create(dto);
  },

  updateCase: (id: string, dto: UpdateCaseDto): Case | null => {
    const updated = CaseRepository.update(id, dto);
    if (updated) {
      AnomalyAlertService.runDetectionForCase(id);
    }
    return updated;
  },

  deleteCase: (id: string): boolean => {
    ConnectionRepository.deleteByCaseId(id);
    EvidenceRepository.deleteByCaseId(id);
    AnomalyAlertRepository.deleteByCaseId(id);
    return CaseRepository.delete(id);
  },

  searchCases: (filters: CaseSearchFilters): CaseWithAggregatedData[] => {
    return CaseRepository.search(filters);
  },

  getAllCasesWithAggregatedData: (): CaseWithAggregatedData[] => {
    return CaseRepository.findAllWithAggregatedData();
  },

  getAvailableCaseTags: (): string[] => {
    return CaseRepository.getAllAvailableTags();
  },

  getAvailableCaseSources: (): string[] => {
    return CaseRepository.getAllAvailableSources();
  },

  getCaseOverview: (caseId: string): CaseOverview | null => {
    return CaseRepository.getCaseOverview(caseId);
  },
};
