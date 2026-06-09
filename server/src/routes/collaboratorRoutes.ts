import type { FastifyInstance } from 'fastify';
import { CollaboratorController } from '../controllers/CollaboratorController.js';

export const collaboratorRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', CollaboratorController.getAllCollaborators);
  fastify.get('/case/:caseId', CollaboratorController.getCollaboratorsByCaseId);
  fastify.post('/', CollaboratorController.createCollaborator);
  fastify.put('/:id', CollaboratorController.updateCollaborator);
  fastify.delete('/:id', CollaboratorController.deleteCollaborator);
};
