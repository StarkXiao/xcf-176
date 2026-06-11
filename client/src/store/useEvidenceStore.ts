import { create } from 'zustand';
import { evidenceApi } from '@/api/evidenceApi';
import { recordAuditLog, captureEvidenceSnapshot } from '@/utils/auditHelper';
import type { Evidence, UpdateEvidenceDto, CreateEvidenceDto } from '@/types';

export interface TimelineLayoutConfig {
  startX?: number;
  startY?: number;
  columnGap?: number;
  rowGap?: number;
  itemsPerRow?: number;
  cardWidth?: number;
  cardHeight?: number;
  direction?: 'horizontal' | 'vertical';
}

interface EvidenceState {
  evidence: Record<string, Evidence>;
  loading: boolean;
  error: string | null;
  previousPositions: Record<string, { x: number; y: number }> | null;
  getEvidenceArray: () => Evidence[];
  getEvidenceById: (id: string) => Evidence | undefined;
  addEvidence: (data: CreateEvidenceDto) => Promise<Evidence | null>;
  updateEvidence: (id: string, data: UpdateEvidenceDto) => Promise<void>;
  deleteEvidence: (id: string) => Promise<void>;
  setEvidence: (evidenceList: Evidence[]) => void;
  updateEvidencePosition: (id: string, x: number, y: number) => void;
  bulkUpdateEvidence: (updates: Array<{ id: string; data: UpdateEvidenceDto }>, collaboratorId?: string, collaboratorName?: string) => Promise<void>;
  arrangeByTimeline: (config?: TimelineLayoutConfig) => Promise<void>;
  restorePositions: () => Promise<void>;
}

export const useEvidenceStore = create<EvidenceState>((set, get) => ({
  evidence: {},
  loading: false,
  error: null,
  previousPositions: null,

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
        recordAuditLog('create_evidence', 'evidence', response.data.id, `创建证据: ${response.data.content.slice(0, 40)}`);
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
      const before = get().evidence[id];
      const snapshot = before ? captureEvidenceSnapshot(before) : undefined;
      const response = await evidenceApi.update(id, data);
      if (response.success && response.data) {
        set((state) => ({
          evidence: { ...state.evidence, [id]: response.data! },
        }));
        recordAuditLog('update_evidence', 'evidence', id, `更新证据: ${response.data.content.slice(0, 40)}`, snapshot);
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
      const existing = get().evidence[id];
      const contentPreview = existing?.content.slice(0, 40) || id;
      const snapshot = existing ? captureEvidenceSnapshot(existing) : undefined;
      const response = await evidenceApi.delete(id);
      if (response.success) {
        set((state) => {
          const newEvidence = { ...state.evidence };
          delete newEvidence[id];
          return { evidence: newEvidence };
        });
        recordAuditLog('delete_evidence', 'evidence', id, `删除证据: ${contentPreview}`, snapshot);
      } else {
        set({ error: response.error || 'Failed to delete evidence' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  bulkUpdateEvidence: async (updates, collaboratorId?: string, collaboratorName?: string) => {
    set({ loading: true, error: null });
    try {
      const response = await evidenceApi.bulkUpdate(updates, collaboratorId, collaboratorName);
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

  arrangeByTimeline: async (config) => {
    const {
      startX = 100,
      startY = 120,
      columnGap = 80,
      rowGap = 120,
      itemsPerRow = 5,
      direction = 'horizontal',
    } = config || {};

    const evidenceArray = Object.values(get().evidence);
    if (evidenceArray.length === 0) return;

    const savedPositions: Record<string, { x: number; y: number }> = {};
    evidenceArray.forEach((e) => {
      savedPositions[e.id] = { x: e.positionX, y: e.positionY };
    });

    const sorted = [...evidenceArray].sort((a, b) => {
      const tA = new Date(a.timestamp || a.createdAt).getTime();
      const tB = new Date(b.timestamp || b.createdAt).getTime();
      return tA - tB;
    });

    const updates = sorted.map((ev, index) => {
      let x: number, y: number;

      if (direction === 'horizontal') {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const width = ev.width || 240;
        const height = ev.height || 180;
        x = startX + col * (width + columnGap);
        y = startY + row * (height + rowGap);
      } else {
        const col = Math.floor(index / itemsPerRow);
        const row = index % itemsPerRow;
        const width = ev.width || 240;
        const height = ev.height || 180;
        x = startX + col * (width + columnGap);
        y = startY + row * (height + rowGap);
      }

      return {
        id: ev.id,
        data: { positionX: x, positionY: y } as UpdateEvidenceDto,
      };
    });

    set({ previousPositions: savedPositions });

    const newEvidenceMap: Record<string, Evidence> = { ...get().evidence };
    updates.forEach((u) => {
      if (newEvidenceMap[u.id]) {
        newEvidenceMap[u.id] = {
          ...newEvidenceMap[u.id],
          positionX: u.data.positionX!,
          positionY: u.data.positionY!,
        };
      }
    });
    set({ evidence: newEvidenceMap });

    try {
      await get().bulkUpdateEvidence(updates);
    } catch {
      console.warn('Timeline layout persistence failed, local state already updated');
    }
  },

  restorePositions: async () => {
    const { previousPositions } = get();
    if (!previousPositions) return;

    const updates: Array<{ id: string; data: UpdateEvidenceDto }> = [];
    const newEvidenceMap: Record<string, Evidence> = { ...get().evidence };

    Object.entries(previousPositions).forEach(([id, pos]) => {
      if (newEvidenceMap[id]) {
        newEvidenceMap[id] = {
          ...newEvidenceMap[id],
          positionX: pos.x,
          positionY: pos.y,
        };
        updates.push({
          id,
          data: { positionX: pos.x, positionY: pos.y },
        });
      }
    });

    set({ evidence: newEvidenceMap, previousPositions: null });

    if (updates.length > 0) {
      try {
        await get().bulkUpdateEvidence(updates);
      } catch {
        console.warn('Restore positions persistence failed, local state already updated');
      }
    }
  },
}));
