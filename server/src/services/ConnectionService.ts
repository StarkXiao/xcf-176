import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
import type { Connection, CreateConnectionDto, SyncSourceChange } from '@shared/types';

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
    const existing = ConnectionRepository.findById(id);
    const updated = ConnectionRepository.update(id, dto);
    if (updated && existing) {
      const changes: SyncSourceChange[] = [];
      if (dto.label !== undefined && dto.label !== existing.label) {
        changes.push({ field: 'label', oldValue: existing.label, newValue: dto.label });
      }
      if (dto.lineStyle !== undefined && dto.lineStyle !== existing.lineStyle) {
        changes.push({ field: 'lineStyle', oldValue: existing.lineStyle, newValue: dto.lineStyle });
      }
      if (changes.length > 0) {
        InvestigationTaskService.onConnectionUpdated(id, changes);
      }
    }
    return updated;
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
