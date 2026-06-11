import { request } from './client';
import type {
  CaseSnapshot,
  CaseSnapshotExportFormat,
  CreateCaseSnapshotDto,
  UpdateCaseSnapshotDto,
  ApiResponse,
} from '@/types';

export const caseSnapshotApi = {
  async getAll(): Promise<ApiResponse<CaseSnapshot[]>> {
    return request<CaseSnapshot[]>('/case-snapshots');
  },

  async getByCaseId(caseId: string): Promise<ApiResponse<CaseSnapshot[]>> {
    return request<CaseSnapshot[]>(`/case-snapshots/case/${caseId}`);
  },

  async getById(id: string): Promise<ApiResponse<CaseSnapshot>> {
    return request<CaseSnapshot>(`/case-snapshots/${id}`);
  },

  async create(dto: CreateCaseSnapshotDto): Promise<ApiResponse<CaseSnapshot>> {
    return request<CaseSnapshot>('/case-snapshots', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async update(id: string, dto: UpdateCaseSnapshotDto): Promise<ApiResponse<CaseSnapshot>> {
    return request<CaseSnapshot>(`/case-snapshots/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  },

  async exportSnapshot(id: string, format: CaseSnapshotExportFormat): Promise<ApiResponse<CaseSnapshot>> {
    return request<CaseSnapshot>(`/case-snapshots/${id}/export/${format}`, {
      method: 'POST',
    });
  },

  async delete(id: string): Promise<ApiResponse<void>> {
    return request<void>(`/case-snapshots/${id}`, {
      method: 'DELETE',
    });
  },
};
