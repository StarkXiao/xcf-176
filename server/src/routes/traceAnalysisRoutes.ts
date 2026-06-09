import type { FastifyInstance } from 'fastify';
import { TraceAnalysisController } from '../controllers/TraceAnalysisController.js';

export const traceAnalysisRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/:caseId', TraceAnalysisController.getTraceGraph);
};
