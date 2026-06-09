import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuditLogService } from '../services/AuditLogService.js';
import type { CreateAuditLogDto, ApiResponse, AuditLog, TimelineEntry } from '@shared/types';

interface CaseIdParams {
  Params: { caseId: string };
}

interface CollaboratorIdParams {
  Params: { collaboratorId: string };
}

export const AuditLogController = {
  async getAuditLogsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const logs = AuditLogService.getAuditLogsByCaseId(caseId);
      const response: ApiResponse<AuditLog[]> = { success: true, data: logs };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getAuditLogsByCollaboratorId(req: FastifyRequest<CollaboratorIdParams>, reply: FastifyReply) {
    try {
      const { collaboratorId } = req.params;
      const logs = AuditLogService.getAuditLogsByCollaboratorId(collaboratorId);
      const response: ApiResponse<AuditLog[]> = { success: true, data: logs };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async createAuditLog(req: FastifyRequest<{ Body: CreateAuditLogDto }>, reply: FastifyReply) {
    try {
      const { caseId, collaboratorId, action, targetType, targetId } = req.body;
      if (!caseId || !collaboratorId || !action || !targetType || !targetId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID、协作者ID、操作类型、目标类型和目标ID不能为空',
        };
        return reply.status(400).send(response);
      }
      const log = AuditLogService.createAuditLog(req.body);
      const response: ApiResponse<AuditLog> = { success: true, data: log, message: '审计日志创建成功' };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getTimelineByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const timeline = AuditLogService.getTimelineByCaseId(caseId);
      const response: ApiResponse<TimelineEntry[]> = { success: true, data: timeline };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },
};
