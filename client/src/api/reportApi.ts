import apiClient from './client';
import type { Report, ReportExportFormat, ApiResponse } from '@/types';

export const reportApi = {
  async getReportsByCaseId(caseId: string): Promise<ApiResponse<Report[]>> {
    const res = await apiClient.get(`/reports/case/${caseId}`);
    return res.data;
  },

  async getReportById(id: string): Promise<ApiResponse<Report>> {
    const res = await apiClient.get(`/reports/${id}`);
    return res.data;
  },

  async generateReport(caseId: string, title?: string, exportFormat?: ReportExportFormat): Promise<ApiResponse<Report>> {
    const res = await apiClient.post('/reports', { caseId, title, exportFormat });
    return res.data;
  },

  async regenerateReport(id: string): Promise<ApiResponse<Report>> {
    const res = await apiClient.post(`/reports/${id}/regenerate`);
    return res.data;
  },

  async exportReport(id: string, format: ReportExportFormat): Promise<ApiResponse<Report>> {
    const res = await apiClient.post(`/reports/${id}/export`, { format });
    return res.data;
  },

  async deleteReport(id: string): Promise<ApiResponse<null>> {
    const res = await apiClient.delete(`/reports/${id}`);
    return res.data;
  },
};
