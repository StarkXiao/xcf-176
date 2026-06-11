import { request } from './client';
import type { CrossCaseComparisonConfig, CrossCaseComparisonResult, ApiResponse } from '@/types';

export const crossCaseComparisonApi = {
  async compare(config?: CrossCaseComparisonConfig): Promise<ApiResponse<CrossCaseComparisonResult>> {
    return request<CrossCaseComparisonResult>('/cross-case-comparison', {
      method: 'POST',
      body: JSON.stringify(config || {}),
    });
  },
};
