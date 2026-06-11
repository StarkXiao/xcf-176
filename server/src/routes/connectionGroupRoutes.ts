import type { FastifyInstance } from 'fastify';
import { ConnectionGroupController } from '../controllers/ConnectionGroupController.js';

export const connectionGroupRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', ConnectionGroupController.getAllGroups);
  fastify.get('/case/:caseId', ConnectionGroupController.getGroupsByCaseId);
  fastify.get('/stats/:caseId', ConnectionGroupController.getConnectionTypeStats);
  fastify.post('/', ConnectionGroupController.createGroup);
  fastify.post('/bulk/by-type', ConnectionGroupController.bulkUpdateByRelationType);
  fastify.post('/bulk/by-label', ConnectionGroupController.bulkUpdateByLabel);
  fastify.post('/bulk/apply-style', ConnectionGroupController.bulkApplyStyle);
  fastify.post('/auto-create', ConnectionGroupController.autoCreateGroupsFromTypes);
  fastify.get('/:id', ConnectionGroupController.getGroupById);
  fastify.put('/:id', ConnectionGroupController.updateGroup);
  fastify.delete('/:id', ConnectionGroupController.deleteGroup);
  fastify.post('/:id/toggle-visibility', ConnectionGroupController.toggleGroupVisibility);
  fastify.post('/:id/add-connection', ConnectionGroupController.addConnectionToGroup);
  fastify.post('/:id/remove-connection', ConnectionGroupController.removeConnectionFromGroup);
};
