import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
export const EvidenceService = {
    getAllEvidence: () => {
        return EvidenceRepository.findAll();
    },
    getEvidenceById: (id) => {
        return EvidenceRepository.findById(id);
    },
    getEvidenceByCaseId: (caseId) => {
        return EvidenceRepository.findByCaseId(caseId);
    },
    searchEvidence: (caseId, filter) => {
        let evidence = EvidenceRepository.findByCaseId(caseId);
        if (filter.keyword && filter.keyword.trim()) {
            const keyword = filter.keyword.toLowerCase();
            evidence = evidence.filter((e) => e.content.toLowerCase().includes(keyword) ||
                e.source.toLowerCase().includes(keyword) ||
                e.tags.some((t) => t.toLowerCase().includes(keyword)));
        }
        if (filter.tags && filter.tags.length > 0) {
            evidence = evidence.filter((e) => filter.tags.every((tag) => e.tags.includes(tag)));
        }
        if (filter.importance) {
            evidence = evidence.filter((e) => e.importance === filter.importance);
        }
        if (filter.dateRange) {
            const { start, end } = filter.dateRange;
            evidence = evidence.filter((e) => {
                if (!e.timestamp)
                    return false;
                const ts = new Date(e.timestamp).getTime();
                return ts >= new Date(start).getTime() && ts <= new Date(end).getTime();
            });
        }
        return evidence;
    },
    createEvidence: (dto) => {
        return EvidenceRepository.create(dto);
    },
    updateEvidence: (id, dto) => {
        const existing = EvidenceRepository.findById(id);
        const updated = EvidenceRepository.update(id, dto);
        if (updated && existing) {
            const changes = [];
            if (dto.content !== undefined && dto.content !== existing.content) {
                changes.push(`内容变更`);
            }
            if (dto.importance !== undefined && dto.importance !== existing.importance) {
                changes.push(`重要性: ${existing.importance} → ${dto.importance}`);
            }
            if (dto.status !== undefined && dto.status !== existing.status) {
                changes.push(`状态: ${existing.status} → ${dto.status}`);
            }
            if (changes.length > 0) {
                InvestigationTaskService.onEvidenceUpdated(id, changes.join(', '));
            }
        }
        return updated;
    },
    deleteEvidence: (id) => {
        ConnectionRepository.deleteByEvidenceId(id);
        return EvidenceRepository.delete(id);
    },
    getAllTags: (caseId) => {
        const evidence = EvidenceRepository.findByCaseId(caseId);
        const tagSet = new Set();
        evidence.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
        return Array.from(tagSet).sort();
    },
};
