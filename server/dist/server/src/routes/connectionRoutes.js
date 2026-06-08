import { ConnectionController } from '../controllers/ConnectionController.js';
export const connectionRoutes = async (fastify) => {
    fastify.get('/', ConnectionController.getAllConnections);
    fastify.get('/:id', ConnectionController.getConnectionById);
    fastify.get('/case/:caseId', ConnectionController.getConnectionsByCaseId);
    fastify.get('/evidence/:evidenceId', ConnectionController.getConnectionsByEvidenceId);
    fastify.post('/', ConnectionController.createConnection);
    fastify.delete('/:id', ConnectionController.deleteConnection);
    fastify.delete('/case/:caseId', ConnectionController.deleteConnectionsByCaseId);
};
