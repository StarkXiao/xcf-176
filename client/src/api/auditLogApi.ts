import { request } from './client';
import type { AuditLog, CreateAuditLogDto, TimelineEntry, ApiResponse } from '@/types';

export const auditLogApi = {
  async getByCaseId(caseId: string): Promise<ApiResponse<AuditLog[]>> {
    return request<AuditLog[]>(`/audit-logs/case/${caseId}`);
  },

  async getByCollaboratorId(collaboratorId: string): Promise<ApiResponse<AuditLog[]>> {
    return request<AuditLog[]>(`/audit-logs/collaborator/${collaboratorId}`);
  },

  async create(data: CreateAuditLogDto): Promise<ApiResponse<AuditLog>> {
    return request<AuditLog>('/audit-logs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTimelineByCaseId(caseId: string): Promise<ApiResponse<TimelineEntry[]>> {
    return request<TimelineEntry[]>(`/audit-logs/timeline/${caseId}`);
  },
};
