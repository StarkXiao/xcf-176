import type { FastifyInstance } from 'fastify';
import { CaseSnapshotController } from '../controllers/CaseSnapshotController.js';

export const caseSnapshotRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', CaseSnapshotController.getAllSnapshots);
  fastify.get('/case/:caseId', CaseSnapshotController.getSnapshotsByCaseId);
  fastify.get('/:id', CaseSnapshotController.getSnapshotById);
  fastify.post('/', CaseSnapshotController.createSnapshot);
  fastify.put('/:id', CaseSnapshotController.updateSnapshot);
  fastify.post('/:id/export/:format', CaseSnapshotController.exportSnapshot);
  fastify.delete('/:id', CaseSnapshotController.deleteSnapshot);
};
