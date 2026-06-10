import type { FastifyRequest, FastifyReply } from 'fastify';
import { CaseTemplateService } from '../services/CaseTemplateService.js';
import type {
  CaseTemplate,
  CreateCaseTemplateDto,
  UpdateCaseTemplateDto,
  ApplyTemplateDto,
  ApiResponse,
  CaseWithRelations,
} from '@shared/types';

interface TemplateIdParams {
  Params: { id: string };
}

interface CategoryParams {
  Params: { category: string };
}

export const CaseTemplateController = {
  async getAllTemplates(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const templates = CaseTemplateService.getAllTemplates();
      const response: ApiResponse<typeof templates> = {
        success: true,
        data: templates,
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async getTemplateById(req: FastifyRequest<TemplateIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const template = CaseTemplateService.getTemplateById(id);

      if (!template) {
        const response: ApiResponse<null> = {
          success: false,
          error: '模板不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof template> = {
        success: true,
        data: template,
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async getTemplatesByCategory(req: FastifyRequest<CategoryParams>, reply: FastifyReply) {
    try {
      const { category } = req.params;
      const templates = CaseTemplateService.getTemplatesByCategory(category);
      const response: ApiResponse<typeof templates> = {
        success: true,
        data: templates,
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async getBuiltInTemplates(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const templates = CaseTemplateService.getBuiltInTemplates();
      const response: ApiResponse<typeof templates> = {
        success: true,
        data: templates,
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async createTemplate(req: FastifyRequest<{ Body: CreateCaseTemplateDto }>, reply: FastifyReply) {
    try {
      const { name, category } = req.body;

      if (!name || name.trim() === '') {
        const response: ApiResponse<null> = {
          success: false,
          error: '模板名称不能为空',
        };
        return reply.status(400).send(response);
      }

      if (!category) {
        const response: ApiResponse<null> = {
          success: false,
          error: '模板分类不能为空',
        };
        return reply.status(400).send(response);
      }

      const newTemplate = CaseTemplateService.createTemplate(req.body);
      const response: ApiResponse<typeof newTemplate> = {
        success: true,
        data: newTemplate,
        message: '模板创建成功',
      };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async updateTemplate(req: FastifyRequest<TemplateIdParams & { Body: UpdateCaseTemplateDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = CaseTemplateService.updateTemplate(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '模板不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof updated> = {
        success: true,
        data: updated,
        message: '模板更新成功',
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async deleteTemplate(req: FastifyRequest<TemplateIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = CaseTemplateService.deleteTemplate(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '模板不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '模板删除成功',
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },

  async applyTemplate(req: FastifyRequest<{ Body: ApplyTemplateDto }>, reply: FastifyReply) {
    try {
      const { templateId, caseName, createdBy } = req.body;

      if (!templateId || !caseName || !createdBy) {
        const response: ApiResponse<null> = {
          success: false,
          error: '模板ID、案件名称和创建人不能为空',
        };
        return reply.status(400).send(response);
      }

      const newCase = CaseTemplateService.applyTemplate(req.body);
      const response: ApiResponse<CaseWithRelations> = {
        success: true,
        data: newCase,
        message: '案件创建成功，已应用模板配置',
      };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        error: (error as Error).message,
      };
      return reply.status(500).send(response);
    }
  },
};
