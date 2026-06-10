import type { FastifyRequest, FastifyReply } from 'fastify';
import { InvestigationTaskService } from '../services/InvestigationTaskService.js';
import type {
  ApiResponse,
  CreateInvestigationTaskDto,
  UpdateInvestigationTaskDto,
  InvestigationTaskStatus,
} from '@shared/types';

interface TaskIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface StatusQuery {
  Querystring: { status?: InvestigationTaskStatus };
}

export const InvestigationTaskController = {
  async getAllTasks(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const tasks = InvestigationTaskService.getAllTasks();
      const response: ApiResponse<typeof tasks> = { success: true, data: tasks };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getTasksByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const tasks = InvestigationTaskService.getTasksByCaseId(caseId);
      const response: ApiResponse<typeof tasks> = { success: true, data: tasks };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getTaskById(req: FastifyRequest<TaskIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const task = InvestigationTaskService.getTaskById(id);
      if (!task) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof task> = { success: true, data: task };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getTasksByStatus(req: FastifyRequest<CaseIdParams & StatusQuery>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const { status } = req.query;
      if (!status) {
        const tasks = InvestigationTaskService.getTasksByCaseId(caseId);
        const response: ApiResponse<typeof tasks> = { success: true, data: tasks };
        return reply.send(response);
      }
      const tasks = InvestigationTaskService.getTasksByStatus(caseId, status);
      const response: ApiResponse<typeof tasks> = { success: true, data: tasks };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async getOverdueTasks(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const tasks = InvestigationTaskService.getOverdueTasks(caseId);
      const response: ApiResponse<typeof tasks> = { success: true, data: tasks };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async createTask(req: FastifyRequest<{ Body: CreateInvestigationTaskDto }>, reply: FastifyReply) {
    try {
      const { caseId, title, createdBy } = req.body;
      if (!caseId || !title || !createdBy) {
        const response: ApiResponse<null> = { success: false, error: '案件ID、标题和创建人不能为空' };
        return reply.status(400).send(response);
      }
      const task = InvestigationTaskService.createTask(req.body);
      const response: ApiResponse<typeof task> = { success: true, data: task, message: '侦查任务创建成功' };
      return reply.status(201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async updateTask(req: FastifyRequest<TaskIdParams & { Body: UpdateInvestigationTaskDto & { collaboratorId?: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { collaboratorId, ...dto } = req.body;
      const updated = InvestigationTaskService.updateTask(id, dto, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '侦查任务更新成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async assignTask(req: FastifyRequest<TaskIdParams & { Body: { assigneeId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { assigneeId, collaboratorId } = req.body;
      if (!assigneeId) {
        const response: ApiResponse<null> = { success: false, error: '责任人ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.assignTask(id, assigneeId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '任务分配成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async linkEvidence(req: FastifyRequest<TaskIdParams & { Body: { evidenceId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { evidenceId, collaboratorId } = req.body;
      if (!evidenceId) {
        const response: ApiResponse<null> = { success: false, error: '证据ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.linkEvidence(id, evidenceId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '证据关联成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async unlinkEvidence(req: FastifyRequest<TaskIdParams & { Body: { evidenceId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { evidenceId, collaboratorId } = req.body;
      if (!evidenceId) {
        const response: ApiResponse<null> = { success: false, error: '证据ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.unlinkEvidence(id, evidenceId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '取消证据关联成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async linkCollectionItem(req: FastifyRequest<TaskIdParams & { Body: { collectionItemId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { collectionItemId, collaboratorId } = req.body;
      if (!collectionItemId) {
        const response: ApiResponse<null> = { success: false, error: '采集项ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.linkCollectionItem(id, collectionItemId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '采集项关联成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async unlinkCollectionItem(req: FastifyRequest<TaskIdParams & { Body: { collectionItemId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { collectionItemId, collaboratorId } = req.body;
      if (!collectionItemId) {
        const response: ApiResponse<null> = { success: false, error: '采集项ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.unlinkCollectionItem(id, collectionItemId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '取消采集项关联成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async linkConnection(req: FastifyRequest<TaskIdParams & { Body: { connectionId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { connectionId, collaboratorId } = req.body;
      if (!connectionId) {
        const response: ApiResponse<null> = { success: false, error: '关系线ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.linkConnection(id, connectionId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '关系线关联成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async unlinkConnection(req: FastifyRequest<TaskIdParams & { Body: { connectionId: string; collaboratorId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { connectionId, collaboratorId } = req.body;
      if (!connectionId) {
        const response: ApiResponse<null> = { success: false, error: '关系线ID不能为空' };
        return reply.status(400).send(response);
      }
      const updated = InvestigationTaskService.unlinkConnection(id, connectionId, collaboratorId ?? 'system');
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '取消关系线关联成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async deleteTask(req: FastifyRequest<TaskIdParams & { Body: { collaboratorId?: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const collaboratorId = req.body?.collaboratorId ?? 'system';
      const deleted = InvestigationTaskService.deleteTask(id, collaboratorId);
      if (!deleted) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<null> = { success: true, message: '侦查任务删除成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async clearSyncNotes(req: FastifyRequest<TaskIdParams & { Body: { collaboratorId?: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const collaboratorId = req.body?.collaboratorId ?? 'system';
      const updated = InvestigationTaskService.clearSyncNotes(id, collaboratorId);
      if (!updated) {
        const response: ApiResponse<null> = { success: false, error: '侦查任务不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof updated> = { success: true, data: updated, message: '同步通知已确认' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },
};
