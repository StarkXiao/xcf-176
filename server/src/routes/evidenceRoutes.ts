import type { FastifyInstance } from 'fastify';
import { EvidenceController } from '../controllers/EvidenceController.js';

export const evidenceRoutes = async (fastify: FastifyInstance) => {
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

  fastify.get('/recycle-bin/all', EvidenceController.getAllDeletedEvidence);
  fastify.get('/recycle-bin/case/:caseId', EvidenceController.getDeletedByCaseId);
  fastify.get('/recycle-bin/:id', EvidenceController.getDeletedById);
  fastify.post('/recycle-bin/:id/restore', EvidenceController.restoreDeletedEvidence);
  fastify.delete('/recycle-bin/:id/purge', EvidenceController.purgeDeletedEvidence);
  fastify.post('/recycle-bin/purge-all', EvidenceController.purgeAllDeleted);
};
