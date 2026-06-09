import type { FastifyRequest, FastifyReply } from 'fastify';
import { CollaboratorService } from '../services/CollaboratorService.js';
import type { CreateCollaboratorDto, UpdateCollaboratorDto, ApiResponse, Collaborator } from '@shared/types';

interface CaseIdParams {
  Params: { caseId: string };
}

interface CollaboratorIdParams {
  Params: { id: string };
}

export const CollaboratorController = {
  async getAllCollaborators(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const collaborators = CollaboratorService.getAllCollaborators();
      const response: ApiResponse<Collaborator[]> = { success: true, data: collaborators };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getCollaboratorsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const collaborators = CollaboratorService.getCollaboratorsByCaseId(caseId);
      const response: ApiResponse<Collaborator[]> = {
        success: true,
        data: collaborators,
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

  async createCollaborator(req: FastifyRequest<{ Body: CreateCollaboratorDto }>, reply: FastifyReply) {
    try {
      const { caseId, name } = req.body;

      if (!caseId || !name || name.trim() === '') {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和姓名不能为空',
        };
        return reply.status(400).send(response);
      }

      const collaborator = CollaboratorService.createCollaborator(req.body);
      const response: ApiResponse<Collaborator> = {
        success: true,
        data: collaborator,
        message: '协作者创建成功',
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

  async updateCollaborator(req: FastifyRequest<CollaboratorIdParams & { Body: UpdateCollaboratorDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = CollaboratorService.updateCollaborator(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '协作者不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<Collaborator> = {
        success: true,
        data: updated,
        message: '协作者更新成功',
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

  async deleteCollaborator(req: FastifyRequest<CollaboratorIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = CollaboratorService.deleteCollaborator(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '协作者不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '协作者删除成功',
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
