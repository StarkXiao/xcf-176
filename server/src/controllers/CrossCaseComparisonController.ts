import type { FastifyRequest, FastifyReply } from 'fastify';
import { CrossCaseComparisonService } from '../services/CrossCaseComparisonService.js';
import type { ApiResponse, CrossCaseComparisonConfig, CrossCaseComparisonResult } from '@shared/types';

interface CompareBody {
  Body?: CrossCaseComparisonConfig;
}

export const CrossCaseComparisonController = {
  async compare(req: FastifyRequest<CompareBody>, reply: FastifyReply) {
    try {
      const config = req.body as CrossCaseComparisonConfig | undefined;
      const result: CrossCaseComparisonResult = CrossCaseComparisonService.compare(config);
      const response: ApiResponse<CrossCaseComparisonResult> = {
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
};
