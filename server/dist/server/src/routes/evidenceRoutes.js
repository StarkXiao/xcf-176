import { EvidenceController } from '../controllers/EvidenceController.js';
export const evidenceRoutes = async (fastify) => {
    fastify.get('/', EvidenceController.getAllEvidence);
    fastify.get('/:id', EvidenceController.getEvidenceById);
    fastify.get('/case/:caseId', EvidenceController.getEvidenceByCaseId);
    fastify.post('/case/:caseId/search', EvidenceController.searchEvidence);
    fastify.get('/case/:caseId/tags', EvidenceController.getTags);
    fastify.post('/', EvidenceController.createEvidence);
    fastify.put('/:id', EvidenceController.updateEvidence);
    fastify.put('/:id/position', EvidenceController.updatePosition);
    fastify.put('/:id/size', EvidenceController.updateSize);
    fastify.delete('/:id', EvidenceController.deleteEvidence);
};
