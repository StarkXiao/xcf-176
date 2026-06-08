import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { Connection, CreateConnectionDto } from '@shared/types';

export const ConnectionService = {
  getAllConnections: (): Connection[] => {
    return ConnectionRepository.findAll();
  },

  getConnectionById: (id: string): Connection | null => {
    return ConnectionRepository.findById(id);
  },

  getConnectionsByCaseId: (caseId: string): Connection[] => {
    return ConnectionRepository.findByCaseId(caseId);
  },

  getConnectionsByEvidenceId: (evidenceId: string): Connection[] => {
    return ConnectionRepository.findByEvidenceId(evidenceId);
  },

  createConnection: (dto: CreateConnectionDto): Connection => {
    return ConnectionRepository.create(dto);
  },

  deleteConnection: (id: string): boolean => {
    return ConnectionRepository.delete(id);
  },

  deleteConnectionsByCaseId: (caseId: string): number => {
    return ConnectionRepository.deleteByCaseId(caseId);
  },

  deleteConnectionsByEvidenceId: (evidenceId: string): number => {
    return ConnectionRepository.deleteByEvidenceId(evidenceId);
  },
};
