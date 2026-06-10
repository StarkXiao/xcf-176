import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { InvestigationTaskService } from './InvestigationTaskService.js';
export const ConnectionService = {
    getAllConnections: () => {
        return ConnectionRepository.findAll();
    },
    getConnectionById: (id) => {
        return ConnectionRepository.findById(id);
    },
    getConnectionsByCaseId: (caseId) => {
        return ConnectionRepository.findByCaseId(caseId);
    },
    getConnectionsByEvidenceId: (evidenceId) => {
        return ConnectionRepository.findByEvidenceId(evidenceId);
    },
    createConnection: (dto) => {
        return ConnectionRepository.create(dto);
    },
    updateConnection: (id, dto) => {
        const existing = ConnectionRepository.findById(id);
        const updated = ConnectionRepository.update(id, dto);
        if (updated && existing) {
            const changes = [];
            if (dto.label !== undefined && dto.label !== existing.label) {
                changes.push(`标签: ${existing.label} → ${dto.label}`);
            }
            if (dto.lineStyle !== undefined && dto.lineStyle !== existing.lineStyle) {
                changes.push(`线型: ${existing.lineStyle} → ${dto.lineStyle}`);
            }
            if (changes.length > 0) {
                InvestigationTaskService.onConnectionUpdated(id, changes.join(', '));
            }
        }
        return updated;
    },
    deleteConnection: (id) => {
        return ConnectionRepository.delete(id);
    },
    deleteConnectionsByCaseId: (caseId) => {
        return ConnectionRepository.deleteByCaseId(caseId);
    },
    deleteConnectionsByEvidenceId: (evidenceId) => {
        return ConnectionRepository.deleteByEvidenceId(evidenceId);
    },
};
