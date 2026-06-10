import type { FastifyInstance } from 'fastify';
import { InvestigationTaskController } from '../controllers/InvestigationTaskController.js';

export const investigationTaskRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', InvestigationTaskController.getAllTasks);
  fastify.get('/case/:caseId', InvestigationTaskController.getTasksByCaseId);
  fastify.get('/case/:caseId/overdue', InvestigationTaskController.getOverdueTasks);
  fastify.get('/case/:caseId/status', InvestigationTaskController.getTasksByStatus);
  fastify.get('/:id', InvestigationTaskController.getTaskById);
  fastify.post('/', InvestigationTaskController.createTask);
  fastify.put('/:id', InvestigationTaskController.updateTask);
  fastify.put('/:id/assign', InvestigationTaskController.assignTask);
  fastify.post('/:id/link/evidence', InvestigationTaskController.linkEvidence);
  fastify.post('/:id/unlink/evidence', InvestigationTaskController.unlinkEvidence);
  fastify.post('/:id/link/collection', InvestigationTaskController.linkCollectionItem);
  fastify.post('/:id/unlink/collection', InvestigationTaskController.unlinkCollectionItem);
  fastify.post('/:id/link/connection', InvestigationTaskController.linkConnection);
  fastify.post('/:id/unlink/connection', InvestigationTaskController.unlinkConnection);
  fastify.delete('/:id', InvestigationTaskController.deleteTask);
};
