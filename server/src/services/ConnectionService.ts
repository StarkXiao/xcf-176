import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
import { AnomalyAlertService } from './AnomalyAlertService.js';
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
    const connection = ConnectionRepository.create(dto);
    AnomalyAlertService.runDetectionForCase(dto.caseId);
    return connection;
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
      AnomalyAlertService.runDetectionForCase(updated.caseId);
    }
    return updated;
  },

  deleteConnection: (id: string): boolean => {
    const existing = ConnectionRepository.findById(id);
    const caseId = existing?.caseId;
    const deleted = ConnectionRepository.delete(id);
    if (deleted && caseId) {
      AnomalyAlertService.runDetectionForCase(caseId);
    }
    return deleted;
  },

  deleteConnectionsByCaseId: (caseId: string): number => {
    return ConnectionRepository.deleteByCaseId(caseId);
  },

  deleteConnectionsByEvidenceId: (evidenceId: string): number => {
    return ConnectionRepository.deleteByEvidenceId(evidenceId);
  },
};
