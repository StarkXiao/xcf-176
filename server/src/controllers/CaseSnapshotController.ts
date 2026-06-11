import type { FastifyRequest, FastifyReply } from 'fastify';
import { CaseSnapshotService } from '../services/CaseSnapshotService.js';
import type {
  CaseSnapshot,
  CreateCaseSnapshotDto,
  UpdateCaseSnapshotDto,
  ApiResponse,
  CaseSnapshotExportFormat,
} from '@shared/types';

interface SnapshotIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface ExportFormatParams {
  Params: { id: string; format: string };
}

export const CaseSnapshotController = {
  async getAllSnapshots(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const snapshots = CaseSnapshotService.getAllSnapshots();
      const response: ApiResponse<typeof snapshots> = {
        success: true,
        data: snapshots,
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

  async getSnapshotsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const snapshots = CaseSnapshotService.getSnapshotsByCaseId(caseId);
      const response: ApiResponse<typeof snapshots> = {
        success: true,
        data: snapshots,
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

  async getSnapshotById(req: FastifyRequest<SnapshotIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const snapshot = CaseSnapshotService.getSnapshotById(id);

      if (!snapshot) {
        const response: ApiResponse<null> = {
          success: false,
          error: '快照不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<CaseSnapshot> = {
        success: true,
        data: snapshot,
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

  async createSnapshot(req: FastifyRequest<{ Body: CreateCaseSnapshotDto }>, reply: FastifyReply) {
    try {
      const dto = req.body;

      if (!dto.caseId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID不能为空',
        };
        return reply.status(400).send(response);
      }

      if (!dto.createdBy || !dto.createdByName) {
        const response: ApiResponse<null> = {
          success: false,
          error: '创建人信息不能为空',
        };
        return reply.status(400).send(response);
      }

      const snapshot = CaseSnapshotService.createSnapshot(dto);
      const response: ApiResponse<CaseSnapshot> = {
        success: true,
        data: snapshot,
        message: '案件快照创建成功',
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

  async updateSnapshot(req: FastifyRequest<SnapshotIdParams & { Body: UpdateCaseSnapshotDto }>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = CaseSnapshotService.updateSnapshot(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '快照不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<CaseSnapshot> = {
        success: true,
        data: updated,
        message: '快照更新成功',
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

  async exportSnapshot(req: FastifyRequest<ExportFormatParams>, reply: FastifyReply) {
    try {
      const { id, format } = req.params;
      const validFormats: CaseSnapshotExportFormat[] = ['json', 'html', 'markdown'];
      const exportFormat = (validFormats.includes(format as CaseSnapshotExportFormat)
        ? format
        : 'json') as CaseSnapshotExportFormat;

      const snapshot = CaseSnapshotService.exportSnapshot(id, exportFormat);

      if (!snapshot) {
        const response: ApiResponse<null> = {
          success: false,
          error: '快照不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<CaseSnapshot> = {
        success: true,
        data: snapshot,
        message: '快照导出成功',
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

  async deleteSnapshot(req: FastifyRequest<SnapshotIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = CaseSnapshotService.deleteSnapshot(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '快照不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '快照删除成功',
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
