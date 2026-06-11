import { request } from './client';
import type { Case, CaseWithRelations, CreateCaseDto, UpdateCaseDto, ApiResponse, CaseSearchFilters, CaseWithAggregatedData, CaseOverview } from '@/types';

export const caseApi = {
  async getAll(): Promise<ApiResponse<Case[]>> {
    return request<Case[]>('/cases');
  },

  async getAllWithMeta(): Promise<ApiResponse<CaseWithAggregatedData[]>> {
    return request<CaseWithAggregatedData[]>('/cases/meta');
  },

  async search(filters: CaseSearchFilters): Promise<ApiResponse<CaseWithAggregatedData[]>> {
    return request<CaseWithAggregatedData[]>('/cases/search', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  async getFilterOptions(): Promise<ApiResponse<{ tags: string[]; sources: string[] }>> {
    return request<{ tags: string[]; sources: string[] }>('/cases/filter-options');
  },

  async getById(id: string): Promise<ApiResponse<CaseWithRelations>> {
    return request<CaseWithRelations>(`/cases/${id}/full`);
  },

  async getOverview(id: string): Promise<ApiResponse<CaseOverview>> {
    return request<CaseOverview>(`/cases/${id}/overview`);
  },

  async create(data: CreateCaseDto): Promise<ApiResponse<Case>> {
    return request<Case>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: UpdateCaseDto): Promise<ApiResponse<Case>> {
    return request<Case>(`/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/cases/${id}`, {
      method: 'DELETE',
    });
  },
};
