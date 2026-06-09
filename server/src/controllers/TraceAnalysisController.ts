import type { FastifyRequest, FastifyReply } from 'fastify';
import { TraceAnalysisService } from '../services/TraceAnalysisService.js';
import type { ApiResponse, TraceGraph } from '@shared/types';

interface CaseIdParams {
  Params: { caseId: string };
}

export const TraceAnalysisController = {
  async getTraceGraph(req: FastifyRequest<CaseIdParams>, reply: FastifyReply) {
    try {
      const { caseId } = req.params;
      const graph: TraceGraph = TraceAnalysisService.buildTraceGraph(caseId);
      const response: ApiResponse<TraceGraph> = {
        success: true,
        data: graph,
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
