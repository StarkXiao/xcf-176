import type { FastifyRequest, FastifyReply } from 'fastify';
import { CaseService } from '../services/CaseService.js';
import { PersistenceService } from '../services/PersistenceService.js';
import type { Case, CreateCaseDto, UpdateCaseDto, ApiResponse, CaseWithRelations, CaseSearchFilters, CaseWithAggregatedData } from '@shared/types';

interface CaseIdParams {
  Params: { id: string };
}

interface SaveCanvasBody {
  Body: { canvasState: Case['canvasState'] };
}

export const CaseController = {
  async getAllCases(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const cases = CaseService.getAllCases();
      const response: ApiResponse<typeof cases> = {
        success: true,
        data: cases,
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

  async getAllCasesWithMeta(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const cases = CaseService.getAllCasesWithAggregatedData();
      const response: ApiResponse<CaseWithAggregatedData[]> = {
        success: true,
        data: cases,
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

  async searchCases(req: FastifyRequest<{ Body: CaseSearchFilters }>, reply: FastifyReply) {
    try {
      const filters = req.body || { keyword: '', tags: [], sources: [] };
      const cases = CaseService.searchCases(filters);
      const response: ApiResponse<CaseWithAggregatedData[]> = {
        success: true,
        data: cases,
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

  async getCaseFilterOptions(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const tags = CaseService.getAvailableCaseTags();
      const sources = CaseService.getAvailableCaseSources();
      const response: ApiResponse<{ tags: string[]; sources: string[] }> = {
        success: true,
        data: { tags, sources },
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

  async getCaseById(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const caseData = CaseService.getCaseById(id);

      if (!caseData) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof caseData> = {
        success: true,
        data: caseData,
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

  async getCaseWithRelations(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const caseData = CaseService.getCaseWithRelations(id);

      if (!caseData) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<CaseWithRelations> = {
        success: true,
        data: caseData,
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

  async createCase(req: FastifyRequest<{ Body: CreateCaseDto }>, reply: FastifyReply) {
    try {
      const { name, description } = req.body;

      if (!name || name.trim() === '') {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件名称不能为空',
        };
        return reply.status(400).send(response);
      }

      const newCase = CaseService.createCase({ name, description });
      const response: ApiResponse<typeof newCase> = {
        success: true,
        data: newCase,
        message: '案件创建成功',
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

  async updateCase(req: FastifyRequest<CaseIdParams & { Body: UpdateCaseDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = CaseService.updateCase(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof updated> = {
        success: true,
        data: updated,
        message: '案件更新成功',
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

  async saveCanvasState(req: FastifyRequest<CaseIdParams & SaveCanvasBody>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { canvasState } = req.body;

      if (!canvasState) {
        const response: ApiResponse<null> = {
          success: false,
          error: '画布状态不能为空',
        };
        return reply.status(400).send(response);
      }

      const updated = PersistenceService.saveCanvasState(id, canvasState);
      const response: ApiResponse<null> = {
        success: true,
        message: '画布状态已保存',
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

  async deleteCase(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = CaseService.deleteCase(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件不存在',
        };
        return reply.status(404).send(response);
      }

      PersistenceService.cancelPending(id);

      const response: ApiResponse<null> = {
        success: true,
        message: '案件删除成功',
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
};
