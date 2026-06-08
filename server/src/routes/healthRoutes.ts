import type { FastifyInstance } from 'fastify';
import { HealthController } from '../controllers/HealthController.js';

export const healthRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', HealthController.check);
};
