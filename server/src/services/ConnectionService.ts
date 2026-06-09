import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { Connection, CreateConnectionDto } from '@shared/types';

export interface UpdateConnectionDto {
  label?: string;
  color?: string;
  lineStyle?: Connection['lineStyle'];
}

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

  updateConnection: (id: string, dto: UpdateConnectionDto): Connection | null => {
    return ConnectionRepository.update(id, dto);
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
