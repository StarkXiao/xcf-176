import { create } from 'zustand';
import { reportApi } from '@/api/reportApi';
import type { Report, ReportExportFormat } from '@/types';

interface ReportState {
  reports: Report[];
  currentReport: Report | null;
  loading: boolean;
  generating: boolean;
  exporting: boolean;
  error: string | null;
  loadReports: (caseId: string) => Promise<void>;
  selectReport: (id: string) => Promise<void>;
  generateReport: (caseId: string, title?: string) => Promise<Report | null>;
  regenerateReport: (id: string) => Promise<Report | null>;
  exportReport: (id: string, format: ReportExportFormat) => Promise<Report | null>;
  deleteReport: (id: string) => Promise<boolean>;
  clearCurrentReport: () => void;
  clearError: () => void;
}

export const useReportStore = create<ReportState>((set, get) => ({
  reports: [],
  currentReport: null,
  loading: false,
  generating: false,
  exporting: false,
  error: null,

  loadReports: async (caseId: string) => {
    set({ loading: true, error: null });
    try {
      const res = await reportApi.getReportsByCaseId(caseId);
      if (res.success && res.data) {
        set({ reports: res.data, loading: false });
      } else {
        set({ error: res.error ?? '加载报告列表失败', loading: false });
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  selectReport: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const res = await reportApi.getReportById(id);
      if (res.success && res.data) {
        set({ currentReport: res.data, loading: false });
      } else {
        set({ error: res.error ?? '加载报告详情失败', loading: false });
      }
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },

  generateReport: async (caseId: string, title?: string) => {
    set({ generating: true, error: null });
    try {
      const res = await reportApi.generateReport(caseId, title);
      if (res.success && res.data) {
        const newReport = res.data;
        set((state) => ({
          reports: [newReport, ...state.reports],
          currentReport: newReport,
          generating: false,
        }));
        return newReport;
      } else {
        set({ error: res.error ?? '生成报告失败', generating: false });
        return null;
      }
    } catch (e) {
      set({ error: (e as Error).message, generating: false });
      return null;
    }
  },

  regenerateReport: async (id: string) => {
    set({ generating: true, error: null });
    try {
      const res = await reportApi.regenerateReport(id);
      if (res.success && res.data) {
        const updated = res.data;
        set((state) => ({
          reports: state.reports.map((r) => (r.id === updated.id ? updated : r)),
          currentReport: state.currentReport?.id === updated.id ? updated : state.currentReport,
          generating: false,
        }));
        return updated;
      } else {
        set({ error: res.error ?? '重新生成报告失败', generating: false });
        return null;
      }
    } catch (e) {
      set({ error: (e as Error).message, generating: false });
      return null;
    }
  },

  exportReport: async (id: string, format: ReportExportFormat) => {
    set({ exporting: true, error: null });
    try {
      const res = await reportApi.exportReport(id, format);
      if (res.success && res.data) {
        const updated = res.data;
        set((state) => ({
          reports: state.reports.map((r) => (r.id === updated.id ? updated : r)),
          currentReport: state.currentReport?.id === updated.id ? updated : state.currentReport,
          exporting: false,
        }));
        return updated;
      } else {
        set({ error: res.error ?? '导出报告失败', exporting: false });
        return null;
      }
    } catch (e) {
      set({ error: (e as Error).message, exporting: false });
      return null;
    }
  },

  deleteReport: async (id: string) => {
    try {
      const res = await reportApi.deleteReport(id);
      if (res.success) {
        set((state) => ({
          reports: state.reports.filter((r) => r.id !== id),
          currentReport: state.currentReport?.id === id ? null : state.currentReport,
        }));
        return true;
      } else {
        set({ error: res.error ?? '删除报告失败' });
        return false;
      }
    } catch (e) {
      set({ error: (e as Error).message });
      return false;
    }
  },

  clearCurrentReport: () => set({ currentReport: null }),
  clearError: () => set({ error: null }),
}));
