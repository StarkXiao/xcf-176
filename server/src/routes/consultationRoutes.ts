import type { FastifyInstance } from 'fastify';
import { ConsultationController } from '../controllers/ConsultationController.js';

export const consultationRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', ConsultationController.getAllConsultations);
  fastify.get('/case/:caseId', ConsultationController.getConsultationsByCaseId);
  fastify.get('/:id', ConsultationController.getConsultationById);
  fastify.get('/:id/details', ConsultationController.getConsultationWithDetails);
  fastify.post('/', ConsultationController.createConsultation);
  fastify.put('/:id', ConsultationController.updateConsultation);
  fastify.delete('/:id', ConsultationController.deleteConsultation);
  fastify.get('/:id/discussions', ConsultationController.getDiscussions);
  fastify.post('/:id/discussions', ConsultationController.addDiscussion);
  fastify.get('/:id/conclusions', ConsultationController.getConclusions);
  fastify.post('/:id/conclusions', ConsultationController.addConclusion);
  fastify.get('/:id/disputes', ConsultationController.getDisputes);
  fastify.post('/:id/disputes', ConsultationController.addDispute);
  fastify.put('/:id/disputes/:disputeId/resolve', ConsultationController.resolveDispute);
};
