import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
export const CaseService = {
    getAllCases: () => {
        return CaseRepository.findAll();
    },
    getCaseById: (id) => {
        return CaseRepository.findById(id);
    },
    getCaseWithRelations: (id) => {
        const caseData = CaseRepository.findById(id);
        if (!caseData)
            return null;
        const evidence = EvidenceRepository.findByCaseId(id);
        const connections = ConnectionRepository.findByCaseId(id);
        const collaborators = CollaboratorRepository.findByCaseId(id);
        return {
            ...caseData,
            evidence,
            connections,
            collaborators,
        };
    },
    createCase: (dto) => {
        return CaseRepository.create(dto);
    },
    updateCase: (id, dto) => {
        return CaseRepository.update(id, dto);
    },
    deleteCase: (id) => {
        ConnectionRepository.deleteByCaseId(id);
        EvidenceRepository.deleteByCaseId(id);
        return CaseRepository.delete(id);
    },
};
