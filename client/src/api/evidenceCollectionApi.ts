import { request } from './client';
import type { EvidenceCollectionItem, CreateCollectionItemDto, ApiResponse } from '@/types';

export const evidenceCollectionApi = {
  async getByCaseId(caseId: string): Promise<ApiResponse<EvidenceCollectionItem[]>> {
    return request<EvidenceCollectionItem[]>(`/evidence-collection?caseId=${caseId}`);
  },

  async create(data: CreateCollectionItemDto): Promise<ApiResponse<EvidenceCollectionItem>> {
    return request<EvidenceCollectionItem>('/evidence-collection', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async verify(id: string): Promise<ApiResponse<EvidenceCollectionItem>> {
    return request<EvidenceCollectionItem>(`/evidence-collection/${id}/verify`, {
      method: 'POST',
    });
  },

  async archive(id: string): Promise<ApiResponse<EvidenceCollectionItem>> {
    return request<EvidenceCollectionItem>(`/evidence-collection/${id}/archive`, {
      method: 'POST',
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/evidence-collection/${id}`, {
      method: 'DELETE',
    });
  },

  async bulkArchive(ids: string[]): Promise<ApiResponse<EvidenceCollectionItem[]>> {
    return request<EvidenceCollectionItem[]>('/evidence-collection/bulk-archive', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
};
