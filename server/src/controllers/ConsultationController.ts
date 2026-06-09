import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConsultationService } from '../services/ConsultationService.js';
import type {
  ApiResponse,
  CreateConsultationDto,
  UpdateConsultationDto,
  CreateDiscussionDto,
  CreateConclusionDto,
  CreateDisputeDto,
  ResolveDisputeDto,
} from '@shared/types';

interface ConsultationIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

export const ConsultationController = {
  async getAllConsultations(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const consultations = ConsultationService.getAllConsultations();
      const response: ApiResponse<typeof consultations> = { success: true, data: consultations };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getConsultationsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const consultations = ConsultationService.getConsultationsByCaseId(caseId);
      const response: ApiResponse<typeof consultations> = { success: true, data: consultations };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getConsultationById(req: FastifyRequest<ConsultationIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const consultation = ConsultationService.getConsultationById(id);
      if (!consultation) {
        const response: ApiResponse<null> = { success: false, error: '会商不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof consultation> = { success: true, data: consultation };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getConsultationWithDetails(req: FastifyRequest<ConsultationIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const consultation = ConsultationService.getConsultationWithDetails(id);
      if (!consultation) {
        const response: ApiResponse<null> = { success: false, error: '会商不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof consultation> = { success: true, data: consultation };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async createConsultation(req: FastifyRequest<{ Body: CreateConsultationDto }>, reply: FastifyReply) {
    try {
      const { caseId, title, initiatedBy } = req.body;
      if (!caseId || !title || !initiatedBy) {
        const response: ApiResponse<null> = { success: false, error: '案件ID、标题和发起人不能为空' };
        return reply.status(400).send(response);
      }
      const consultation = ConsultationService.createConsultation(req.body);
      const response: ApiResponse<typeof consultation> = { success: true, data: consultation, message: '会商创建成功' };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async updateConsultation(req: FastifyRequest<ConsultationIdParams & { Body: UpdateConsultationDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = ConsultationService.updateConsultation(id, req.body);
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '会商不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '会商更新成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async deleteConsultation(req: FastifyRequest<ConsultationIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = ConsultationService.deleteConsultation(id);
      if (!deleted) {
        const response: ApiResponse<null> = { success: false, error: '会商不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<null> = { success: true, message: '会商删除成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async addDiscussion(req: FastifyRequest<ConsultationIdParams & { Body: CreateDiscussionDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const body = { ...req.body, consultationId: id };
      if (!body.content || !body.collaboratorId) {
        const response: ApiResponse<null> = { success: false, error: '内容和发言者不能为空' };
        return reply.status(400).send(response);
      }
      const discussion = ConsultationService.addDiscussion(body);
      const response: ApiResponse<typeof discussion> = { success: true, data: discussion, message: '讨论添加成功' };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getDiscussions(req: FastifyRequest<ConsultationIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const discussions = ConsultationService.getDiscussions(id);
      const response: ApiResponse<typeof discussions> = { success: true, data: discussions };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async addConclusion(req: FastifyRequest<ConsultationIdParams & { Body: CreateConclusionDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const body = { ...req.body, consultationId: id };
      if (!body.content || !body.decidedBy) {
        const response: ApiResponse<null> = { success: false, error: '结论内容和决策人不能为空' };
        return reply.status(400).send(response);
      }
      const conclusion = ConsultationService.addConclusion(body);
      const response: ApiResponse<typeof conclusion> = { success: true, data: conclusion, message: '结论添加成功' };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getConclusions(req: FastifyRequest<ConsultationIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const conclusions = ConsultationService.getConclusions(id);
      const response: ApiResponse<typeof conclusions> = { success: true, data: conclusions };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async addDispute(req: FastifyRequest<ConsultationIdParams & { Body: CreateDisputeDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const body = { ...req.body, consultationId: id };
      if (!body.description || !body.raisedBy) {
        const response: ApiResponse<null> = { success: false, error: '争议描述和提出人不能为空' };
        return reply.status(400).send(response);
      }
      const dispute = ConsultationService.addDispute(body);
      const response: ApiResponse<typeof dispute> = { success: true, data: dispute, message: '争议记录添加成功' };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getDisputes(req: FastifyRequest<ConsultationIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const disputes = ConsultationService.getDisputes(id);
      const response: ApiResponse<typeof disputes> = { success: true, data: disputes };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async resolveDispute(req: FastifyRequest<{ Params: { id: string; disputeId: string }; Body: ResolveDisputeDto }>, reply: FastifyReply) {
    try {
      const { disputeId } = req.params;
      if (!req.body.resolution || !req.body.resolvedBy) {
        const response: ApiResponse<null> = { success: false, error: '解决方案和解决人不能为空' };
        return reply.status(400).send(response);
      }
      const dispute = ConsultationService.resolveDispute(disputeId, req.body);
      if (!dispute) {
        const response: ApiResponse<null> = { success: false, error: '争议记录不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof dispute> = { success: true, data: dispute, message: '争议解决成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },
};
