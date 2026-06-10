import type { FastifyRequest, FastifyReply } from 'fastify';
import { AnomalyAlertService } from '../services/AnomalyAlertService.js';
import type {
  AnomalyAlert,
  AnomalyAlertSeverity,
  AnomalyAlertStatus,
  AnomalyDetectionConfig,
  AnomalyDetectionResult,
  ApiResponse,
  UpdateAnomalyAlertDto,
} from '@shared/types';

interface AlertIdParams {
  Params: { id: string };
}

interface CaseIdParams {
  Params: { caseId: string };
}

interface StatusQuery {
  Querystring: { status?: AnomalyAlertStatus };
}

interface SeverityQuery {
  Querystring: { severity?: AnomalyAlertSeverity };
}

interface DetectionBody {
  Body: { config?: AnomalyDetectionConfig };
}

interface UpdateAlertBody {
  Body: UpdateAnomalyAlertDto;
}

export const AnomalyAlertController = {
  async getAllAlerts(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const alerts = AnomalyAlertService.getAllAlerts();
      const response: ApiResponse<AnomalyAlert[]> = {
        success: true,
        data: alerts,
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

  async getPendingAlerts(_req: FastifyRequest, reply: FastifyReply) {
    try {
      const alerts = AnomalyAlertService.getPendingAlerts();
      const response: ApiResponse<AnomalyAlert[]> = {
        success: true,
        data: alerts,
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

  async getAlertById(req: FastifyRequest<AlertIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const alert = AnomalyAlertService.getAlertById(id);

      if (!alert) {
        const response: ApiResponse<null> = {
          success: false,
          error: '预警不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<AnomalyAlert> = {
        success: true,
        data: alert,
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

  async getAlertsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const alerts = AnomalyAlertService.getAlertsByCaseId(caseId);
      const response: ApiResponse<AnomalyAlert[]> = {
        success: true,
        data: alerts,
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

  async updateAlert(req: FastifyRequest<AlertIdParams & UpdateAlertBody>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const updated = AnomalyAlertService.updateAlert(id, req.body);

      if (!updated) {
        const response: ApiResponse<null> = {
          success: false,
          error: '预警不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<AnomalyAlert> = {
        success: true,
        data: updated,
        message: '预警已更新',
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

  async deleteAlert(req: FastifyRequest<AlertIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = AnomalyAlertService.deleteAlert(id);

      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '预警不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<null> = {
        success: true,
        message: '预警已删除',
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

  async detectForCase(req: FastifyRequest<CaseIdParams & DetectionBody>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const config = req.body?.config;
      const result = AnomalyAlertService.runDetectionForCase(caseId, config);

      if (!result) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件不存在',
        };
        return reply.status(404).send(response);
      }

      const response: ApiResponse<AnomalyDetectionResult> = {
        success: true,
        data: result,
        message: '检测完成',
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

  async detectAllCases(req: FastifyRequest<DetectionBody>, reply: FastifyReply) {
    try {
      const config = req.body?.config;
      const results = AnomalyAlertService.runDetectionForAllCases(config);

      const response: ApiResponse<AnomalyDetectionResult[]> = {
        success: true,
        data: results,
        message: '全量检测完成',
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

  async getPriorityCases(req: FastifyRequest<DetectionBody>, reply: FastifyReply) {
    try {
      const config = req.body?.config;
      const results = AnomalyAlertService.getPriorityCases(config);

      const response: ApiResponse<AnomalyDetectionResult[]> = {
        success: true,
        data: results,
        message: '获取优先核查案件列表完成',
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
