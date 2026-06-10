import type { FastifyInstance } from 'fastify';
import { AnomalyAlertController } from '../controllers/AnomalyAlertController.js';

export const anomalyAlertRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', AnomalyAlertController.getAllAlerts);
  fastify.get('/pending', AnomalyAlertController.getPendingAlerts);
  fastify.get('/priority-cases', AnomalyAlertController.getPriorityCases);
  fastify.get('/:id', AnomalyAlertController.getAlertById);
  fastify.get('/case/:caseId', AnomalyAlertController.getAlertsByCaseId);
  fastify.put('/:id', AnomalyAlertController.updateAlert);
  fastify.delete('/:id', AnomalyAlertController.deleteAlert);
  fastify.post('/detect/case/:caseId', AnomalyAlertController.detectForCase);
  fastify.post('/detect/all', AnomalyAlertController.detectAllCases);
};
