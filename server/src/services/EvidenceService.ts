import { EvidenceRepository, type DeletedEvidenceInfo } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { EvidenceVersionRepository } from '../repositories/EvidenceVersionRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
import { AnomalyAlertService } from './AnomalyAlertService.js';
import { EvidenceVersionService } from './EvidenceVersionService.js';
import type { Evidence, CreateEvidenceDto, UpdateEvidenceDto, SearchFilter, SyncSourceChange } from '@shared/types';

export const EvidenceService = {
  getAllEvidence: (): Evidence[] => {
    return EvidenceRepository.findAll();
  },

  getEvidenceById: (id: string): Evidence | null => {
    return EvidenceRepository.findById(id);
  },

  getEvidenceByCaseId: (caseId: string): Evidence[] => {
    return EvidenceRepository.findByCaseId(caseId);
  },

  searchEvidence: (caseId: string, filter: SearchFilter): Evidence[] => {
    let evidence = EvidenceRepository.findByCaseId(caseId);

    if (filter.keyword && filter.keyword.trim()) {
      const keyword = filter.keyword.toLowerCase();
      evidence = evidence.filter(
        (e) =>
          e.content.toLowerCase().includes(keyword) ||
          e.source.toLowerCase().includes(keyword) ||
          e.tags.some((t: string) => t.toLowerCase().includes(keyword))
      );
    }

    if (filter.tags && filter.tags.length > 0) {
      evidence = evidence.filter((e) =>
        filter.tags.every((tag: string) => e.tags.includes(tag))
      );
    }

    if (filter.importance) {
      evidence = evidence.filter((e) => e.importance === filter.importance);
    }

    if (filter.dateRange) {
      const { start, end } = filter.dateRange;
      evidence = evidence.filter((e) => {
        if (!e.timestamp) return false;
        const ts = new Date(e.timestamp).getTime();
        return ts >= new Date(start).getTime() && ts <= new Date(end).getTime();
      });
    }

    return evidence;
  },

  createEvidence: (dto: CreateEvidenceDto, collaboratorId?: string | null, collaboratorName?: string | null): Evidence => {
    const evidence = EvidenceRepository.create(dto);
    try {
      EvidenceVersionService.recordEvidenceCreate(evidence, collaboratorId ?? null, collaboratorName ?? null);
    } catch (_e) {
      // version logging should not break primary operation
    }
    AnomalyAlertService.runDetectionForCase(dto.caseId);
    return evidence;
  },

  updateEvidence: (id: string, dto: UpdateEvidenceDto, collaboratorId?: string | null, collaboratorName?: string | null): Evidence | null => {
    const existing = EvidenceRepository.findById(id);
    const updated = EvidenceRepository.update(id, dto);
    if (updated && existing) {
      try {
        EvidenceVersionService.recordEvidenceUpdate(
          id,
          dto,
          existing,
          updated,
          collaboratorId ?? null,
          collaboratorName ?? null
        );
      } catch (_e) {
        // version logging should not break primary operation
      }
      const changes: SyncSourceChange[] = [];
      if (dto.content !== undefined && dto.content !== existing.content) {
        changes.push({ field: 'content', oldValue: existing.content.slice(0, 20), newValue: dto.content.slice(0, 20) });
      }
      if (dto.importance !== undefined && dto.importance !== existing.importance) {
        changes.push({ field: 'importance', oldValue: existing.importance, newValue: dto.importance });
      }
      if (dto.status !== undefined && dto.status !== existing.status) {
        changes.push({ field: 'status', oldValue: existing.status, newValue: dto.status });
      }
      if (changes.length > 0) {
        InvestigationTaskService.onEvidenceUpdated(id, changes);
      }
      AnomalyAlertService.runDetectionForCase(updated.caseId);
    }
    return updated;
  },

  deleteEvidence: (id: string, collaboratorId?: string | null, collaboratorName?: string | null): boolean => {
    const existing = EvidenceRepository.findById(id);
    const caseId = existing?.caseId;
    let deleted = false;
    if (existing) {
      try {
        EvidenceVersionService.recordEvidenceDelete(existing, collaboratorId ?? null, collaboratorName ?? null);
      } catch (_e) {
        // version logging should not break primary operation
      }
      deleted = EvidenceRepository.softDelete(id, collaboratorId ?? null, collaboratorName ?? null);
      if (deleted) {
        ConnectionRepository.archiveByEvidenceId(id);
      }
    }
    if (deleted && caseId) {
      AnomalyAlertService.runDetectionForCase(caseId);
    }
    return deleted;
  },

  restoreDeletedEvidence: (
    id: string,
    collaboratorId?: string | null,
    collaboratorName?: string | null
  ): { evidence: Evidence | null; skippedConnections: Array<{ connectionId: string; reason: string; otherEvidenceId: string; otherEvidenceDeleted: boolean }> } => {
    const deletedInfo = EvidenceRepository.findDeletedById(id);
    if (!deletedInfo) return { evidence: null, skippedConnections: [] };

    const restored = EvidenceRepository.restore(id);
    let skippedConnections: Array<{ connectionId: string; reason: string; otherEvidenceId: string; otherEvidenceDeleted: boolean }> = [];
    if (restored) {
      const connResult = ConnectionRepository.restoreByEvidenceId(id);
      skippedConnections = connResult.skipped;

      try {
        EvidenceVersionService._recordRestoreFromDelete(
          restored,
          deletedInfo,
          collaboratorId ?? null,
          collaboratorName ?? null,
          connResult
        );
      } catch (_e) {
        // version logging should not break primary operation
      }

      AnomalyAlertService.runDetectionForCase(restored.caseId);
    }
    return { evidence: restored, skippedConnections };
  },

  purgeDeletedEvidence: (id: string): boolean => {
    const deletedInfo = EvidenceRepository.findDeletedById(id);
    if (!deletedInfo) return false;
    ConnectionRepository.deleteByEvidenceId(id);
    EvidenceVersionRepository.deleteByEvidenceId(id);
    return EvidenceRepository.delete(id);
  },

  purgeAllDeleted: (days?: number): { purgedEvidenceCount: number } => {
    let count = 0;
    const toPurge = days !== undefined
      ? EvidenceRepository.findAllDeleted().filter(d => {
          const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
          return new Date(d.deletedAt).getTime() < cutoff;
        })
      : EvidenceRepository.findAllDeleted();

    for (const d of toPurge) {
      ConnectionRepository.deleteByEvidenceId(d.id);
      EvidenceVersionRepository.deleteByEvidenceId(d.id);
      if (EvidenceRepository.delete(d.id)) {
        count++;
      }
    }
    return { purgedEvidenceCount: count };
  },

  getAllDeletedEvidence: (): DeletedEvidenceInfo[] => {
    return EvidenceRepository.findAllDeleted();
  },

  getDeletedEvidenceByCaseId: (caseId: string): DeletedEvidenceInfo[] => {
    return EvidenceRepository.findDeletedByCaseId(caseId);
  },

  getDeletedEvidenceById: (id: string): DeletedEvidenceInfo | null => {
    return EvidenceRepository.findDeletedById(id);
  },

  getAllTags: (caseId: string): string[] => {
    const evidence = EvidenceRepository.findByCaseId(caseId);
    const tagSet = new Set<string>();
    evidence.forEach((e) => e.tags.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },
};
