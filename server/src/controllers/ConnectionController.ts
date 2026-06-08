import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConnectionService } from '../services/ConnectionService.js';
import type { CreateConnectionDto, ApiResponse } from '@shared/types';

interface ConnectionIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface EvidenceIdParams {
  Params: { evidenceId: string };
}

export const ConnectionController = {
  async getAllConnections(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const connections = ConnectionService.getAllConnections();
      const response: ApiResponse<typeof connections> = {
        success: true,
        data: connections,
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

  async getConnectionById(req: FastifyRequest<ConnectionIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const connection = ConnectionService.getConnectionById(id);

      if (!connection) {
        const response: ApiResponse<null> = {
          success: false,
          error: '连线不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof connection> = {
        success: true,
        data: connection,
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

  async getConnectionsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const connections = ConnectionService.getConnectionsByCaseId(caseId);
      const response: ApiResponse<typeof connections> = {
        success: true,
        data: connections,
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

  async getConnectionsByEvidenceId(req: FastifyRequest<EvidenceIdParams>, reply: FastifyReply) {
    try {
      const { evidenceId } = req.params;
      const connections = ConnectionService.getConnectionsByEvidenceId(evidenceId);
      const response: ApiResponse<typeof connections> = {
        success: true,
        data: connections,
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

  async createConnection(req: FastifyRequest<{ Body: CreateConnectionDto }>, reply: FastifyReply) {
    try {
      const { caseId, fromEvidenceId, toEvidenceId } = req.body;

      if (!caseId || !fromEvidenceId || !toEvidenceId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID、起始证据ID和目标证据ID不能为空',
        };
        return reply.status(400).send(response);
      }

      if (fromEvidenceId === toEvidenceId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '不能连接自己',
        };
        return reply.status(400).send(response);
      }

      const newConnection = ConnectionService.createConnection(req.body);
      const response: ApiResponse<typeof newConnection> = {
        success: true,
        data: newConnection,
        message: '连线创建成功',
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

  async deleteConnection(req: FastifyRequest<ConnectionIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = ConnectionService.deleteConnection(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '连线不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '连线删除成功',
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

  async deleteConnectionsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const count = ConnectionService.deleteConnectionsByCaseId(caseId);
      const response: ApiResponse<{ deleted: number }> = {
        success: true,
        data: { deleted: count },
        message: `已删除 ${count} 条连线`,
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
