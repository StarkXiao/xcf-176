import { request } from './client';
import type {
  EvidenceVersion,
  VersionDiffResult,
  RestoreEvidenceVersionDto,
  ApiResponse,
  Evidence,
} from '@/types';

export const evidenceVersionApi = {
  async getById(versionId: string): Promise<ApiResponse<EvidenceVersion>> {
    return request<EvidenceVersion>(`/evidence-versions/${versionId}`);
  },

  async getByEvidenceId(evidenceId: string): Promise<ApiResponse<EvidenceVersion[]>> {
    return request<EvidenceVersion[]>(`/evidence-versions/evidence/${evidenceId}`);
  },

  async getLatestByEvidenceId(evidenceId: string): Promise<ApiResponse<EvidenceVersion>> {
    return request<EvidenceVersion>(`/evidence-versions/evidence/${evidenceId}/latest`);
  },

  async getByCaseId(caseId: string): Promise<ApiResponse<EvidenceVersion[]>> {
    return request<EvidenceVersion[]>(`/evidence-versions/case/${caseId}`);
  },

  async getByDateRange(
    caseId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiResponse<EvidenceVersion[]>> {
    return request<EvidenceVersion[]>(`/evidence-versions/case/${caseId}/date-range`, {
      method: 'POST',
      body: JSON.stringify({ startDate, endDate }),
    });
  },

  async getByCollaborator(collaboratorId: string): Promise<ApiResponse<EvidenceVersion[]>> {
    return request<EvidenceVersion[]>(`/evidence-versions/collaborator/${collaboratorId}`);
  },

  async compareVersion(versionId: string): Promise<ApiResponse<VersionDiffResult>> {
    return request<VersionDiffResult>(`/evidence-versions/${versionId}/compare`);
  },

  async restore(dto: RestoreEvidenceVersionDto): Promise<ApiResponse<Evidence>> {
    return request<Evidence>('/evidence-versions/restore', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async getStats(caseId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return request<Record<string, unknown>>(`/evidence-versions/case/${caseId}/stats`);
  },
};
