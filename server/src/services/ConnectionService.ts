import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
import { AnomalyAlertService } from './AnomalyAlertService.js';
import { EvidenceVersionService } from './EvidenceVersionService.js';
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

  createConnection: (dto: CreateConnectionDto, collaboratorId?: string | null, collaboratorName?: string | null): Connection => {
    const connection = ConnectionRepository.create(dto);
    try {
      EvidenceVersionService.recordRelationAdd(
        connection,
        dto.fromEvidenceId,
        dto.caseId,
        collaboratorId ?? null,
        collaboratorName ?? null
      );
      if (dto.fromEvidenceId !== dto.toEvidenceId) {
        EvidenceVersionService.recordRelationAdd(
          connection,
          dto.toEvidenceId,
          dto.caseId,
          collaboratorId ?? null,
          collaboratorName ?? null
        );
      }
    } catch (_e) {
      // version logging should not break primary operation
    }
    AnomalyAlertService.runDetectionForCase(dto.caseId);
    return connection;
  },

  updateConnection: (id: string, dto: UpdateConnectionDto, collaboratorId?: string | null, collaboratorName?: string | null): Connection | null => {
    const existing = ConnectionRepository.findById(id);
    const updated = ConnectionRepository.update(id, dto);
    if (updated && existing) {
      try {
        const v1 = EvidenceVersionService.recordRelationUpdate(
          existing,
          updated,
          existing.fromEvidenceId,
          existing.caseId,
          collaboratorId ?? null,
          collaboratorName ?? null
        );
        if (existing.fromEvidenceId !== existing.toEvidenceId) {
          EvidenceVersionService.recordRelationUpdate(
            existing,
            updated,
            existing.toEvidenceId,
            existing.caseId,
            collaboratorId ?? null,
            collaboratorName ?? null
          );
        }
        void v1;
      } catch (_e) {
        // version logging should not break primary operation
      }
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

  deleteConnection: (id: string, collaboratorId?: string | null, collaboratorName?: string | null): boolean => {
    const existing = ConnectionRepository.findById(id);
    const caseId = existing?.caseId;
    if (existing) {
      try {
        EvidenceVersionService.recordRelationRemove(
          existing,
          existing.fromEvidenceId,
          existing.caseId,
          collaboratorId ?? null,
          collaboratorName ?? null
        );
        if (existing.fromEvidenceId !== existing.toEvidenceId) {
          EvidenceVersionService.recordRelationRemove(
            existing,
            existing.toEvidenceId,
            existing.caseId,
            collaboratorId ?? null,
            collaboratorName ?? null
          );
        }
      } catch (_e) {
        // version logging should not break primary operation
      }
    }
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
