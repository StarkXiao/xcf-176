import type { FastifyInstance } from 'fastify';
import { AuditLogController } from '../controllers/AuditLogController.js';

export const auditLogRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/case/:caseId', AuditLogController.getAuditLogsByCaseId);
  fastify.get('/collaborator/:collaboratorId', AuditLogController.getAuditLogsByCollaboratorId);
  fastify.post('/', AuditLogController.createAuditLog);
  fastify.get('/timeline/:caseId', AuditLogController.getTimelineByCaseId);
};
