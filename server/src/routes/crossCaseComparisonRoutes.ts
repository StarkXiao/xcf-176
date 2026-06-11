import type { FastifyInstance } from 'fastify';
import { CrossCaseComparisonController } from '../controllers/CrossCaseComparisonController.js';

export const crossCaseComparisonRoutes = async (fastify: FastifyInstance) => {
  fastify.post('/', CrossCaseComparisonController.compare);
};
