import type { FastifyInstance } from 'fastify';
import { CaseTemplateController } from '../controllers/CaseTemplateController.js';

export const caseTemplateRoutes = async (fastify: FastifyInstance) => {
  fastify.get('/', CaseTemplateController.getAllTemplates);
  fastify.get('/built-in', CaseTemplateController.getBuiltInTemplates);
  fastify.get('/category/:category', CaseTemplateController.getTemplatesByCategory);
  fastify.get('/:id', CaseTemplateController.getTemplateById);
  fastify.post('/', CaseTemplateController.createTemplate);
  fastify.put('/:id', CaseTemplateController.updateTemplate);
  fastify.delete('/:id', CaseTemplateController.deleteTemplate);
  fastify.post('/apply', CaseTemplateController.applyTemplate);
};
