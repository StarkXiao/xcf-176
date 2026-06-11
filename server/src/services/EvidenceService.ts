import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
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
    if (existing) {
      try {
        EvidenceVersionService.recordEvidenceDelete(existing, collaboratorId ?? null, collaboratorName ?? null);
      } catch (_e) {
        // version logging should not break primary operation
      }
    }
    ConnectionRepository.deleteByEvidenceId(id);
    const deleted = EvidenceRepository.delete(id);
    if (deleted && caseId) {
      AnomalyAlertService.runDetectionForCase(caseId);
    }
    return deleted;
  },

  getAllTags: (caseId: string): string[] => {
    const evidence = EvidenceRepository.findByCaseId(caseId);
    const tagSet = new Set<string>();
    evidence.forEach((e) => e.tags.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },
};
