import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { CollaboratorRepository } from '../repositories/CollaboratorRepository.js';
import { AnomalyAlertRepository } from '../repositories/AnomalyAlertRepository.js';
import { AnomalyAlertService } from './AnomalyAlertService.js';
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
        const updated = CaseRepository.update(id, dto);
        if (updated) {
            AnomalyAlertService.runDetectionForCase(id);
        }
        return updated;
    },
    deleteCase: (id) => {
        ConnectionRepository.deleteByCaseId(id);
        EvidenceRepository.deleteByCaseId(id);
        AnomalyAlertRepository.deleteByCaseId(id);
        return CaseRepository.delete(id);
    },
};
