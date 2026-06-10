import type { FastifyInstance } from 'fastify';
import { ReportController } from '../controllers/ReportController.js';

export const reportRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/case/:caseId', ReportController.getReportsByCaseId);
  fastify.get('/:id', ReportController.getReportById);
  fastify.post('/', ReportController.generateReport);
  fastify.post('/:id/regenerate', ReportController.regenerateReport);
  fastify.post('/:id/export', ReportController.exportReport);
  fastify.delete('/:id', ReportController.deleteReport);
};
