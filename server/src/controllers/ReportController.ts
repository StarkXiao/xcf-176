import type { FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from '../services/ReportService.js';
import type { ApiResponse, CreateReportDto, ReportExportFormat } from '@shared/types';

interface CaseIdParams {
  Params: { caseId: string };
}

interface ReportIdParams {
  Params: { id: string };
}

interface GenerateBody {
  Body: CreateReportDto;
}

interface ExportBody {
  Body: { format: ReportExportFormat };
}

export const ReportController = {
  async getReportsByCaseId(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const reports = ReportService.getReportsByCaseId(caseId);
      const response: ApiResponse<typeof reports> = {
        success: true,
        data: reports,
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

  async getReportById(req: FastifyRequest<ReportIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const report = ReportService.getReportById(id);
      if (!report) {
        const response: ApiResponse<null> = {
          success: false,
          error: '报告不存在',
        };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof report> = {
        success: true,
        data: report,
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

  async generateReport(req: FastifyRequest<GenerateBody>, reply: FastifyReply) {
    try {
      const { caseId } = req.body;
      if (!caseId) {
        const response: ApiResponse<null> = {
          success: false,
          error: '案件ID不能为空',
        };
        return reply.status(400).send(response);
      }

      const report = ReportService.generateReport(req.body);
      const response: ApiResponse<typeof report> = {
        success: true,
        data: report,
        message: '报告生成成功',
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

  async regenerateReport(req: FastifyRequest<ReportIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const report = ReportService.regenerateReport(id);
      if (!report) {
        const response: ApiResponse<null> = {
          success: false,
          error: '报告不存在',
        };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof report> = {
        success: true,
        data: report,
        message: '报告已重新生成',
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

  async exportReport(req: FastifyRequest<ReportIdParams & ExportBody>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const { format } = req.body;

      if (!format) {
        const response: ApiResponse<null> = {
          success: false,
          error: '导出格式不能为空',
        };
        return reply.status(400).send(response);
      }

      const report = ReportService.exportReport(id, format);
      if (!report) {
        const response: ApiResponse<null> = {
          success: false,
          error: '报告不存在',
        };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<typeof report> = {
        success: true,
        data: report,
        message: '报告导出成功',
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

  async deleteReport(req: FastifyRequest<ReportIdParams>, reply: FastifyReply) {
    try {
      const { id } = req.params;
      const deleted = ReportService.deleteReport(id);
      if (!deleted) {
        const response: ApiResponse<null> = {
          success: false,
          error: '报告不存在',
        };
        return reply.status(404).send(response);
      }
      const response: ApiResponse<null> = {
        success: true,
        message: '报告删除成功',
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
