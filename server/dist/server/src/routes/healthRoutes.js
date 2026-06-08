import { HealthController } from '../controllers/HealthController.js';
export const healthRoutes = async (fastify) => {
    fastify.get('/', HealthController.check);
};
