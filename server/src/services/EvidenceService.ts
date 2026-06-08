import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import type { Evidence, CreateEvidenceDto, UpdateEvidenceDto, SearchFilter } from '@shared/types';

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

  createEvidence: (dto: CreateEvidenceDto): Evidence => {
    return EvidenceRepository.create(dto);
  },

  updateEvidence: (id: string, dto: UpdateEvidenceDto): Evidence | null => {
    return EvidenceRepository.update(id, dto);
  },

  deleteEvidence: (id: string): boolean => {
    ConnectionRepository.deleteByEvidenceId(id);
    return EvidenceRepository.delete(id);
  },

  getAllTags: (caseId: string): string[] => {
    const evidence = EvidenceRepository.findByCaseId(caseId);
    const tagSet = new Set<string>();
    evidence.forEach((e) => e.tags.forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  },
};
