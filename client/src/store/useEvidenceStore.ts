import { create } from 'zustand';
import { evidenceApi } from '@/api/evidenceApi';
import type { Evidence, UpdateEvidenceDto, CreateEvidenceDto } from '@/types';

interface EvidenceState {
  evidence: Record<string, Evidence>;
  loading: boolean;
  error: string | null;
  getEvidenceArray: () => Evidence[];
  getEvidenceById: (id: string) => Evidence | undefined;
  addEvidence: (data: CreateEvidenceDto) => Promise<Evidence | null>;
  updateEvidence: (id: string, data: UpdateEvidenceDto) => Promise<void>;
  deleteEvidence: (id: string) => Promise<void>;
  setEvidence: (evidenceList: Evidence[]) => void;
  updateEvidencePosition: (id: string, x: number, y: number) => void;
  bulkUpdateEvidence: (updates: Array<{ id: string; data: UpdateEvidenceDto }>) => Promise<void>;
}

export const useEvidenceStore = create<EvidenceState>((set, get) => ({
  evidence: {},
  loading: false,
  error: null,

  getEvidenceArray: () => Object.values(get().evidence),

  getEvidenceById: (id) => get().evidence[id],

  setEvidence: (evidenceList) => {
    const evidenceMap: Record<string, Evidence> = {};
    evidenceList.forEach((e) => {
      evidenceMap[e.id] = e;
    });
    set({ evidence: evidenceMap });
  },

  addEvidence: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.create(data);
      if (response.success && response.data) {
        set((state) => ({
          evidence: { ...state.evidence, [response.data!.id]: response.data! },
        }));
        return response.data;
      }
      set({ error: response.error || 'Failed to add evidence' });
      return null;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    } finally {
      set({ loading: false });
    }
  },

  updateEvidence: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          evidence: { ...state.evidence, [id]: response.data! },
        }));
      } else {
        set({ error: response.error || 'Failed to update evidence' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  updateEvidencePosition: (id, x, y) => {
    set((state) => ({
      evidence: {
        ...state.evidence,
        [id]: {
          ...state.evidence[id],
          positionX: x,
          positionY: y,
        },
      },
    }));
  },

  deleteEvidence: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.delete(id);
      if (response.success) {
        set((state) => {
          const newEvidence = { ...state.evidence };
          delete newEvidence[id];
          return { evidence: newEvidence };
        });
      } else {
        set({ error: response.error || 'Failed to delete evidence' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  bulkUpdateEvidence: async (updates) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.bulkUpdate(updates);
      if (response.success && response.data) {
        const evidenceMap: Record<string, Evidence> = { ...get().evidence };
        response.data.forEach((e) => {
          evidenceMap[e.id] = e;
        });
        set({ evidence: evidenceMap });
      } else {
        set({ error: response.error || 'Failed to bulk update evidence' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },
}));
