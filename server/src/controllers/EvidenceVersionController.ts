import type { FastifyRequest, FastifyReply } from 'fastify';
import { EvidenceVersionService } from '../services/EvidenceVersionService.js';
import type { ApiResponse, RestoreEvidenceVersionDto } from '@shared/types';

interface VersionIdParams {
  Params: { versionId: string };
}

interface EvidenceIdParams {
  Params: { evidenceId: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface CollaboratorIdParams {
  Params: { collaboratorId: string };
}

interface DateRangeBody {
  Body: { startDate: string; endDate: string };
}

interface RestoreBody {
  Body: RestoreEvidenceVersionDto;
}

export const EvidenceVersionController = {
  async getVersionById(req: FastifyRequest<VersionIdParams>, reply: FastifyReply) {
    try {
      const { versionId } = req.params;
      const version = EvidenceVersionService.getVersionById(versionId);

      if (!version) {
        const response: ApiResponse<null> = {
          success: false,
          error: '版本不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof version> = {
        success: true,
        data: version,
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

  async getVersionsByEvidenceId(req: FastifyRequest<EvidenceIdParams>, reply: FastifyReply) {
    try {
      const { evidenceId } = req.params;
      const versions = EvidenceVersionService.getVersionsByEvidenceId(evidenceId);

      const response: ApiResponse<typeof versions> = {
        success: true,
        data: versions,
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

  async getVersionsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const versions = EvidenceVersionService.getVersionsByCaseId(caseId);

      const response: ApiResponse<typeof versions> = {
        success: true,
        data: versions,
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

  async getLatestVersion(req: FastifyRequest<EvidenceIdParams>, reply: FastifyReply) {
    try {
      const { evidenceId } = req.params;
      const version = EvidenceVersionService.getLatestVersion(evidenceId);

      if (!version) {
        const response: ApiResponse<null> = {
          success: false,
          error: '该证据暂无版本记录',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof version> = {
        success: true,
        data: version,
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

  async getVersionsByDateRange(
    req: FastifyRequest<CaseIdParams & DateRangeBody>,
    reply: FastifyReply
  ) {
    try {
      const { caseId } = req.params;
      const { startDate, endDate } = req.body;

      if (!startDate || !endDate) {
        const response: ApiResponse<null> = {
          success: false,
          error: '开始时间和结束时间不能为空',
        };
        return reply.status(400).send(response);
      }

      const versions = EvidenceVersionService.getVersionsByDateRange(caseId, startDate, endDate);

      const response: ApiResponse<typeof versions> = {
        success: true,
        data: versions,
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

  async getVersionsByCollaborator(req: FastifyRequest<CollaboratorIdParams>, reply: FastifyReply) {
    try {
      const { collaboratorId } = req.params;
      const versions = EvidenceVersionService.getVersionsByCollaborator(collaboratorId);

      const response: ApiResponse<typeof versions> = {
        success: true,
        data: versions,
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

  async compareVersion(req: FastifyRequest<VersionIdParams>, reply: FastifyReply) {
    try {
      const { versionId } = req.params;
      const result = EvidenceVersionService.compareVersions(versionId);

      if (!result) {
        const response: ApiResponse<null> = {
          success: false,
          error: '版本不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<typeof result> = {
        success: true,
        data: result,
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

  async restoreToVersion(req: FastifyRequest<RestoreBody>, reply: FastifyReply) {
    try {
      const { versionId, collaboratorId, collaboratorName } = req.body;

      if (!versionId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '版本ID不能为空',
        };
        return reply.status(400).send(response);
      }

      const restoredEvidence = EvidenceVersionService.restoreToVersion(
        versionId,
        collaboratorId ?? null,
        collaboratorName ?? null
      );

      const response: ApiResponse<typeof restoredEvidence> = {
        success: true,
        data: restoredEvidence,
        message: '已成功恢复到指定历史版本',
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

  async getVersionStats(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const stats = EvidenceVersionService.getVersionStats(caseId);

      const response: ApiResponse<typeof stats> = {
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
};
