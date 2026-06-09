import { create } from 'zustand';
import { auditLogApi } from '@/api/auditLogApi';
import type { AuditLog, CreateAuditLogDto, TimelineEntry } from '@/types';

interface AuditLogState {
  auditLogs: AuditLog[];
  timeline: TimelineEntry[];
  loading: boolean;
  error: string | null;
  loadAuditLogs: (caseId: string) => Promise<void>;
  loadTimeline: (caseId: string) => Promise<void>;
  addAuditLog: (data: CreateAuditLogDto) => Promise<AuditLog | null>;
}

export const useAuditLogStore = create<AuditLogState>((set) => ({
  auditLogs: [],
  timeline: [],
  loading: false,
  error: null,

  loadAuditLogs: async (caseId) => {
    set({ loading: true, error: null });
    try {
      const response = await auditLogApi.getByCaseId(caseId);
      if (response.success && response.data) {
        set({ auditLogs: response.data, loading: false });
      } else {
        set({ error: response.error || 'Failed to load audit logs', loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  loadTimeline: async (caseId) => {
    set({ loading: true, error: null });
    try {
      const response = await auditLogApi.getTimelineByCaseId(caseId);
      if (response.success && response.data) {
        set({ timeline: response.data, loading: false });
      } else {
        set({ error: response.error || 'Failed to load timeline', loading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },

  addAuditLog: async (data) => {
    try {
      const response = await auditLogApi.create(data);
      if (response.success && response.data) {
        set((state) => ({
          auditLogs: [response.data!, ...state.auditLogs],
        }));
        return response.data;
      }
      return null;
    } catch (error) {
      return null;
    }
  },
}));
