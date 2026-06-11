import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConnectionGroupService } from '../services/ConnectionGroupService.js';
import type { ApiResponse, ConnectionGroup, CreateConnectionGroupDto, UpdateConnectionGroupDto, BulkUpdateConnectionsByTypeDto, BulkUpdateConnectionsByLabelDto, BulkApplyStyleDto, ConnectionTypeStats } from '@shared/types';

interface GroupIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface TypeIdParams {
  Params: { caseId: string; relationTypeId: string };
}

export const ConnectionGroupController = {
  async getAllGroups(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const groups = ConnectionGroupService.getAllGroups();
      const response: ApiResponse<typeof groups> = {
        success: true,
        data: groups,
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

  async getGroupById(req: FastifyRequest<GroupIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const group = ConnectionGroupService.getGroupById(id);

      if (!group) {
        const response: ApiResponse<null> = {
          success: false,
          error: '分组不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof group> = {
        success: true,
        data: group,
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

  async getGroupsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const groups = ConnectionGroupService.getGroupsByCaseId(caseId);
      const response: ApiResponse<typeof groups> = {
        success: true,
        data: groups,
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

  async getConnectionTypeStats(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const stats = ConnectionGroupService.getConnectionTypeStats(caseId);
      const response: ApiResponse<ConnectionTypeStats[]> = {
        success: true,
        data: stats,
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

  async createGroup(req: FastifyRequest<{ Body: CreateConnectionGroupDto }>, reply: FastifyReply) {
    try {
      const { caseId, name } = req.body;

      if (!caseId || !name) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和分组名称不能为空',
        };
        return reply.status(400).send(response);
      }

      const newGroup = ConnectionGroupService.createGroup(req.body);
      const response: ApiResponse<ConnectionGroup> = {
        success: true,
        data: newGroup,
        message: '分组创建成功',
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

  async updateGroup(req: FastifyRequest<{ Params: { id: string }; Body: UpdateConnectionGroupDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = ConnectionGroupService.updateGroup(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '分组不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<ConnectionGroup> = {
        success: true,
        data: updated,
        message: '分组更新成功',
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

  async deleteGroup(req: FastifyRequest<GroupIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = ConnectionGroupService.deleteGroup(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '分组不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '分组删除成功',
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

  async bulkUpdateByRelationType(req: FastifyRequest<{ Body: BulkUpdateConnectionsByTypeDto }>, reply: FastifyReply) {
    try {
      const { caseId, relationTypeId } = req.body;

      if (!caseId || !relationTypeId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和关系类型ID不能为空',
        };
        return reply.status(400).send(response);
      }

      const result = ConnectionGroupService.bulkUpdateByRelationType(req.body);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `已更新 ${result.updated} 条连线`,
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

  async bulkUpdateByLabel(req: FastifyRequest<{ Body: BulkUpdateConnectionsByLabelDto }>, reply: FastifyReply) {
    try {
      const { caseId, label } = req.body;

      if (!caseId || !label) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和标签不能为空',
        };
        return reply.status(400).send(response);
      }

      const result = ConnectionGroupService.bulkUpdateByLabel(req.body);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `已更新 ${result.updated} 条连线`,
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

  async bulkApplyStyle(req: FastifyRequest<{ Body: BulkApplyStyleDto }>, reply: FastifyReply) {
    try {
      const { caseId, connectionIds } = req.body;

      if (!caseId || !connectionIds || connectionIds.length === 0) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和连线ID列表不能为空',
        };
        return reply.status(400).send(response);
      }

      const result = ConnectionGroupService.bulkApplyStyle(req.body);
      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
        message: `已更新 ${result.updated} 条连线样式`,
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

  async toggleGroupVisibility(req: FastifyRequest<GroupIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = ConnectionGroupService.toggleGroupVisibility(id);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '分组不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<ConnectionGroup> = {
        success: true,
        data: updated,
        message: updated.visible ? '分组已显示' : '分组已隐藏',
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

  async addConnectionToGroup(req: FastifyRequest<{ Params: { id: string }; Body: { connectionId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { connectionId } = req.body;

      if (!connectionId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '连线ID不能为空',
        };
        return reply.status(400).send(response);
      }

      const updated = ConnectionGroupService.addConnectionToGroup(id, connectionId);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '分组不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<ConnectionGroup> = {
        success: true,
        data: updated,
        message: '连线已添加到分组',
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

  async removeConnectionFromGroup(req: FastifyRequest<{ Params: { id: string }; Body: { connectionId: string } }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { connectionId } = req.body;

      if (!connectionId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '连线ID不能为空',
        };
        return reply.status(400).send(response);
      }

      const updated = ConnectionGroupService.removeConnectionFromGroup(id, connectionId);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '分组不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<ConnectionGroup> = {
        success: true,
        data: updated,
        message: '连线已从分组移除',
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

  async autoCreateGroupsFromTypes(req: FastifyRequest<{ Body: { caseId: string; relationTypes: Array<{ id: string; label: string; color: string; lineStyle: any }> } }>, reply: FastifyReply) {
    try {
      const { caseId, relationTypes } = req.body;

      if (!caseId || !relationTypes) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID和关系类型列表不能为空',
        };
        return reply.status(400).send(response);
      }

      const groups = ConnectionGroupService.autoCreateGroupsFromTypes(caseId, relationTypes);
      const response: ApiResponse<typeof groups> = {
        success: true,
        data: groups,
        message: `已创建 ${groups.length} 个分组`,
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
