import type { FastifyRequest, FastifyReply } from 'fastify';
import { EvidenceService } from '../services/EvidenceService.js';
import { PersistenceService } from '../services/PersistenceService.js';
import type { CreateEvidenceDto, UpdateEvidenceDto, ApiResponse, SearchFilter } from '@shared/types';

interface EvidenceIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface PositionBody {
  Body: { positionX: number; positionY: number };
}

interface SizeBody {
  Body: { width: number; height: number };
}

export const EvidenceController = {
  async getAllEvidence(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const evidence = EvidenceService.getAllEvidence();
      const response: ApiResponse<typeof evidence> = {
        success: true,
        data: evidence,
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

  async getEvidenceById(req: FastifyRequest<EvidenceIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const evidence = EvidenceService.getEvidenceById(id);

      if (!evidence) {
        const response: ApiResponse<null> = {
          success: false,
          error: '证据不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof evidence> = {
        success: true,
        data: evidence,
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

  async getEvidenceByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const evidence = EvidenceService.getEvidenceByCaseId(caseId);
      const response: ApiResponse<typeof evidence> = {
        success: true,
        data: evidence,
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

  async searchEvidence(req: FastifyRequest<CaseIdParams & { Body: SearchFilter }>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const filter = req.body;
      const evidence = EvidenceService.searchEvidence(caseId, filter);
      const response: ApiResponse<typeof evidence> = {
        success: true,
        data: evidence,
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

  async getTags(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const tags = EvidenceService.getAllTags(caseId);
      const response: ApiResponse<typeof tags> = {
        success: true,
        data: tags,
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

  async createEvidence(req: FastifyRequest<{ Body: CreateEvidenceDto }>, reply: FastifyReply) {
    try {
      const { caseId, content } = req.body;

      if (!caseId || !content || content.trim() === '') {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和内容不能为空',
        };
        return reply.status(400).send(response);
      }

      const newEvidence = EvidenceService.createEvidence(req.body);
      const response: ApiResponse<typeof newEvidence> = {
        success: true,
        data: newEvidence,
        message: '证据创建成功',
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

  async updateEvidence(req: FastifyRequest<EvidenceIdParams & { Body: UpdateEvidenceDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = EvidenceService.updateEvidence(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '证据不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof updated> = {
        success: true,
        data: updated,
        message: '证据更新成功',
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

  async updatePosition(req: FastifyRequest<EvidenceIdParams & PositionBody>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { positionX, positionY } = req.body;

      if (positionX === undefined || positionY === undefined) {
        const response: ApiResponse<null> = {
          success: false,
          error: '位置参数不完整',
        };
        return reply.status(400).send(response);
      }

      PersistenceService.saveEvidencePosition(id, positionX, positionY);

      const response: ApiResponse<null> = {
        success: true,
        message: '位置已保存',
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

  async updateSize(req: FastifyRequest<EvidenceIdParams & SizeBody>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { width, height } = req.body;

      if (width === undefined || height === undefined) {
        const response: ApiResponse<null> = {
          success: false,
          error: '尺寸参数不完整',
        };
        return reply.status(400).send(response);
      }

      PersistenceService.saveEvidenceSize(id, width, height);

      const response: ApiResponse<null> = {
        success: true,
        message: '尺寸已保存',
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

  async deleteEvidence(req: FastifyRequest<EvidenceIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = EvidenceService.deleteEvidence(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '证据不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '证据删除成功',
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
