import type { FastifyInstance } from 'fastify';
import { EvidenceVersionController } from '../controllers/EvidenceVersionController.js';

export const evidenceVersionRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/:versionId', EvidenceVersionController.getVersionById);
  fastify.get('/evidence/:evidenceId', EvidenceVersionController.getVersionsByEvidenceId);
  fastify.get('/evidence/:evidenceId/latest', EvidenceVersionController.getLatestVersion);
  fastify.get('/case/:caseId', EvidenceVersionController.getVersionsByCaseId);
  fastify.post('/case/:caseId/date-range', EvidenceVersionController.getVersionsByDateRange);
  fastify.get('/collaborator/:collaboratorId', EvidenceVersionController.getVersionsByCollaborator);
  fastify.get('/:versionId/compare', EvidenceVersionController.compareVersion);
  fastify.post('/restore', EvidenceVersionController.restoreToVersion);
  fastify.get('/case/:caseId/stats', EvidenceVersionController.getVersionStats);
};
