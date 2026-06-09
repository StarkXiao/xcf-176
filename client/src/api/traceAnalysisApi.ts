import { request } from './client';
import type { TraceGraph, ApiResponse } from '@/types';

export const traceAnalysisApi = {
  async getTraceGraph(caseId: string): Promise<ApiResponse<TraceGraph>> {
    return request<TraceGraph>(`/trace-analysis/${caseId}`);
  },
};
