import { CaseController } from '../controllers/CaseController.js';
export const caseRoutes = async (fastify) => {
    fastify.get('/', CaseController.getAllCases);
    fastify.get('/:id', CaseController.getCaseById);
    fastify.get('/:id/full', CaseController.getCaseWithRelations);
    fastify.post('/', CaseController.createCase);
    fastify.put('/:id', CaseController.updateCase);
    fastify.put('/:id/canvas', CaseController.saveCanvasState);
    fastify.delete('/:id', CaseController.deleteCase);
};
