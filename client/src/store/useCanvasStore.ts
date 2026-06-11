import { create } from 'zustand';
import type { Connection } from '@/types';

interface DrawingConnection {
  fromId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface TimeRangeFilter {
  start: string | null;
  end: string | null;
}

interface CanvasState {
  zoom: number;
  panX: number;
  panY: number;
  selectedId: string | null;
  selectedConnectionId: string | null;
  connections: Connection[];
  drawingConnection: DrawingConnection | null;
  isPanning: boolean;
  timelineMode: boolean;
  timelineHighlightId: string | null;
  timeRangeFilter: TimeRangeFilter;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setSelectedId: (id: string | null) => void;
  setSelectedConnectionId: (id: string | null) => void;
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;
  updateConnection: (connection: Connection) => void;
  patchConnection: (id: string, patch: Partial<Connection>) => void;
  startDrawingConnection: (fromId: string, startX: number, startY: number) => void;
  updateDrawingConnection: (endX: number, endY: number) => void;
  endDrawingConnection: () => void;
  setIsPanning: (panning: boolean) => void;
  resetView: () => void;
  setTimelineMode: (enabled: boolean) => void;
  toggleTimelineMode: () => void;
  setTimelineHighlightId: (id: string | null) => void;
  setTimeRangeFilter: (filter: Partial<TimeRangeFilter>) => void;
  clearTimeRangeFilter: () => void;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedId: null,
  selectedConnectionId: null,
  connections: [],
  drawingConnection: null,
  isPanning: false,
  timelineMode: false,
  timelineHighlightId: null,
  timeRangeFilter: { start: null, end: null },

  setZoom: (zoom) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
    set({ zoom: clampedZoom });
  },

  setPan: (x, y) => set({ panX: x, panY: y }),

  setSelectedId: (id) => set({ selectedId: id, selectedConnectionId: null }),

  setSelectedConnectionId: (id) => set({ selectedConnectionId: id, selectedId: null }),

  setConnections: (connections) => set({ connections }),

  addConnection: (connection) => {
    set((state) => ({ connections: [...state.connections, connection] }));
  },

  removeConnection: (id) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
    }));
  },

  updateConnection: (connection) => {
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === connection.id ? connection : c
      ),
    }));
  },

  patchConnection: (id, patch) => {
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));
  },

  startDrawingConnection: (fromId, startX, startY) => {
    set({
      drawingConnection: {
        fromId,
        startX,
        startY,
        endX: startX,
        endY: startY,
      },
    });
  },

  updateDrawingConnection: (endX, endY) => {
    const { drawingConnection } = get();
    if (drawingConnection) {
      set({
        drawingConnection: { ...drawingConnection, endX, endY },
      });
    }
  },

  endDrawingConnection: () => set({ drawingConnection: null }),

  setIsPanning: (panning) => set({ isPanning: panning }),

  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  setTimelineMode: (enabled) => set({ timelineMode: enabled }),

  toggleTimelineMode: () => set((state) => ({ timelineMode: !state.timelineMode })),

  setTimelineHighlightId: (id) => set({ timelineHighlightId: id }),

  setTimeRangeFilter: (filter) =>
    set((state) => ({
      timeRangeFilter: { ...state.timeRangeFilter, ...filter },
    })),

  clearTimeRangeFilter: () =>
    set({ timeRangeFilter: { start: null, end: null } }),
}));
