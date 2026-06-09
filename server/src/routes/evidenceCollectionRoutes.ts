import type { FastifyInstance } from 'fastify';
import { EvidenceCollectionController } from '../controllers/EvidenceCollectionController.js';

export const evidenceCollectionRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', EvidenceCollectionController.getByCaseId);
  fastify.post('/', EvidenceCollectionController.create);
  fastify.post('/:id/verify', EvidenceCollectionController.verify);
  fastify.post('/:id/archive', EvidenceCollectionController.archive);
  fastify.post('/bulk-archive', EvidenceCollectionController.bulkArchive);
  fastify.delete('/:id', EvidenceCollectionController.deleteItem);
};
