import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
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
