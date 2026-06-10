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
