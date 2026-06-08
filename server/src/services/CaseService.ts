import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { Case, CaseWithRelations, CreateCaseDto, UpdateCaseDto } from '@shared/types';

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

    return {
      ...caseData,
      evidence,
      connections,
    };
  },

  createCase: (dto: CreateCaseDto): Case => {
    return CaseRepository.create(dto);
  },

  updateCase: (id: string, dto: UpdateCaseDto): Case | null => {
    return CaseRepository.update(id, dto);
  },

  deleteCase: (id: string): boolean => {
    ConnectionRepository.deleteByCaseId(id);
    EvidenceRepository.deleteByCaseId(id);
    return CaseRepository.delete(id);
  },
};
