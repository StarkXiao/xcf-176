import type { FastifyRequest, FastifyReply } from 'fastify';
import { EvidenceCollectionService } from '../services/EvidenceCollectionService.js';
import type { ApiResponse, CreateCollectionItemDto, EvidenceCollectionItem } from '@shared/types';

interface CaseIdQuery {
  Querystring: { caseId: string };
}

interface IdParams {
  Params: { id: string };
}

interface CreateBody {
  Body: CreateCollectionItemDto;
}

interface BulkArchiveBody {
  Body: { ids: string[] };
}

export const EvidenceCollectionController = {
  async getByCaseId(req: FastifyRequest<CaseIdQuery>, reply: FastifyReply) {
    try {
      const { caseId } = req.query;
      if (!caseId) {
        const response: ApiResponse<null> = { success: false, error: '案件ID不能为空' };
        return reply.status(400).send(response);
      }
      const items = EvidenceCollectionService.getByCaseId(caseId);
      const response: ApiResponse<EvidenceCollectionItem[]> = { success: true, data: items };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },

  async create(req: FastifyRequest<CreateBody>, reply: FastifyReply) {
    try {
      const { caseId, sourceType, content } = req.body;
      if (!caseId || !sourceType || !content || content.trim() === '') {
        const response: ApiResponse<null> = { success: false, error: '案件ID、来源类型和内容不能为空' };
        return reply.status(400).send(response);
      }

      const { item, isDuplicate } = EvidenceCollectionService.collect(req.body);
      const response: ApiResponse<EvidenceCollectionItem> = {
        success: true,
        data: item,
        message: isDuplicate ? '发现重复证据，已标记为重复' : '证据采集成功',
      };
      return reply.status(isDuplicate ? 200 : 201).send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(400).send(response);
    }
  },

  async verify(req: FastifyRequest<IdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const item = EvidenceCollectionService.verify(id);
      const response: ApiResponse<EvidenceCollectionItem> = { success: true, data: item, message: '校验通过' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(400).send(response);
    }
  },

  async archive(req: FastifyRequest<IdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const item = EvidenceCollectionService.archive(id);
      const response: ApiResponse<EvidenceCollectionItem> = { success: true, data: item, message: '归档成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(400).send(response);
    }
  },

  async bulkArchive(req: FastifyRequest<BulkArchiveBody>, reply: FastifyReply) {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        const response: ApiResponse<null> = { success: false, error: '请提供要归档的采集项ID列表' };
        return reply.status(400).send(response);
      }
      const items = EvidenceCollectionService.bulkArchive(ids);
      const response: ApiResponse<EvidenceCollectionItem[]> = {
        success: true,
        data: items,
        message: `成功归档 ${items.length} 条证据`,
      };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(400).send(response);
    }
  },

  async deleteItem(req: FastifyRequest<IdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = EvidenceCollectionService.delete(id);
      if (!deleted) {
        const response: ApiResponse<null> = { success: false, error: '采集项不存在' };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<null> = { success: true, message: '删除成功' };
      return reply.send(response);
    } catch (error) {
      const response: ApiResponse<null> = { success: false, error: (error as Error).message };
      return reply.status(500).send(response);
    }
  },
};
