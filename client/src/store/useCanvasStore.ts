import { create } from 'zustand';
import type { Connection, ConnectionGroup } from '@/types';

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
  selectedIds: Set<string>;
  selectedConnectionId: string | null;
  connections: Connection[];
  connectionGroups: ConnectionGroup[];
  visibleConnectionIds: Set<string> | null;
  hiddenConnectionIds: Set<string>;
  drawingConnection: DrawingConnection | null;
  isPanning: boolean;
  timelineMode: boolean;
  timelineHighlightId: string | null;
  timeRangeFilter: TimeRangeFilter;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setSelectedId: (id: string | null) => void;
  toggleSelectedId: (id: string, multiSelect?: boolean) => void;
  setSelectedIds: (ids: Set<string>) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  isSelected: (id: string) => boolean;
  setSelectedConnectionId: (id: string | null) => void;
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (id: string) => void;
  updateConnection: (connection: Connection) => void;
  patchConnection: (id: string, patch: Partial<Connection>) => void;
  setConnectionGroups: (groups: ConnectionGroup[]) => void;
  addConnectionGroup: (group: ConnectionGroup) => void;
  updateConnectionGroup: (group: ConnectionGroup) => void;
  removeConnectionGroup: (id: string) => void;
  setConnectionGroupColor: (groupId: string, color: string) => void;
  toggleConnectionGroupVisibility: (groupId: string) => void;
  setVisibleConnectionIds: (ids: Set<string> | null) => void;
  hideConnections: (ids: string[]) => void;
  showConnections: (ids: string[]) => void;
  toggleConnectionVisibility: (id: string) => void;
  resetConnectionVisibility: () => void;
  hideConnectionGroup: (groupId: string) => void;
  showConnectionGroup: (groupId: string) => void;
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
  isConnectionVisible: (connectionId: string) => boolean;
}

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  selectedId: null,
  selectedIds: new Set<string>(),
  selectedConnectionId: null,
  connections: [],
  connectionGroups: [],
  visibleConnectionIds: null,
  hiddenConnectionIds: new Set<string>(),
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

  setSelectedId: (id) => {
    if (id === null) {
      set({ selectedId: null, selectedIds: new Set(), selectedConnectionId: null });
    } else {
      set({ selectedId: id, selectedIds: new Set([id]), selectedConnectionId: null });
    }
  },

  toggleSelectedId: (id, multiSelect = false) => {
    const { selectedIds } = get();
    const newSelectedIds = new Set(selectedIds);
    if (multiSelect) {
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id);
      } else {
        newSelectedIds.add(id);
      }
      set({
        selectedIds: newSelectedIds,
        selectedId: newSelectedIds.size === 1 ? id : (newSelectedIds.size > 1 ? null : get().selectedId),
        selectedConnectionId: null,
      });
    } else {
      set({
        selectedIds: new Set([id]),
        selectedId: id,
        selectedConnectionId: null,
      });
    }
  },

  setSelectedIds: (ids) => {
    const idsArray = Array.from(ids);
    set({
      selectedIds: ids,
      selectedId: idsArray.length === 1 ? idsArray[0] : null,
      selectedConnectionId: null,
    });
  },

  addToSelection: (id) => {
    const { selectedIds } = get();
    const newSelectedIds = new Set(selectedIds);
    newSelectedIds.add(id);
    const idsArray = Array.from(newSelectedIds);
    set({
      selectedIds: newSelectedIds,
      selectedId: idsArray.length === 1 ? id : get().selectedId,
      selectedConnectionId: null,
    });
  },

  removeFromSelection: (id) => {
    const { selectedIds } = get();
    const newSelectedIds = new Set(selectedIds);
    newSelectedIds.delete(id);
    const idsArray = Array.from(newSelectedIds);
    set({
      selectedIds: newSelectedIds,
      selectedId: idsArray.length === 1 ? idsArray[0] : null,
    });
  },

  clearSelection: () => {
    set({
      selectedId: null,
      selectedIds: new Set(),
      selectedConnectionId: null,
    });
  },

  getSelectedCount: () => get().selectedIds.size,

  isSelected: (id) => get().selectedIds.has(id),

  setSelectedConnectionId: (id) => set({ selectedConnectionId: id, selectedId: null, selectedIds: new Set() }),

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

  setConnectionGroups: (groups) => set({ connectionGroups: groups }),

  addConnectionGroup: (group) =>
    set((state) => ({ connectionGroups: [...state.connectionGroups, group] })),

  updateConnectionGroup: (group) =>
    set((state) => ({
      connectionGroups: state.connectionGroups.map((g) =>
        g.id === group.id ? group : g
      ),
    })),

  removeConnectionGroup: (id) =>
    set((state) => ({
      connectionGroups: state.connectionGroups.filter((g) => g.id !== id),
    })),

  setConnectionGroupColor: (groupId, color) =>
    set((state) => ({
      connectionGroups: state.connectionGroups.map((g) =>
        g.id === groupId ? { ...g, color } : g
      ),
    })),

  toggleConnectionGroupVisibility: (groupId) => {
    const { connectionGroups } = get();
    const group = connectionGroups.find((g) => g.id === groupId);
    if (!group) return;

    const updatedGroup = { ...group, visible: !group.visible };
    set((state) => ({
      connectionGroups: state.connectionGroups.map((g) =>
        g.id === groupId ? updatedGroup : g
      ),
    }));
  },

  setVisibleConnectionIds: (ids) => set({ visibleConnectionIds: ids }),

  hideConnections: (ids) =>
    set((state) => {
      const newHidden = new Set(state.hiddenConnectionIds);
      ids.forEach((id) => newHidden.add(id));
      return { hiddenConnectionIds: newHidden };
    }),

  showConnections: (ids) =>
    set((state) => {
      const newHidden = new Set(state.hiddenConnectionIds);
      ids.forEach((id) => newHidden.delete(id));
      return { hiddenConnectionIds: newHidden };
    }),

  toggleConnectionVisibility: (id) =>
    set((state) => {
      const newHidden = new Set(state.hiddenConnectionIds);
      if (newHidden.has(id)) {
        newHidden.delete(id);
      } else {
        newHidden.add(id);
      }
      return { hiddenConnectionIds: newHidden };
    }),

  resetConnectionVisibility: () =>
    set({ hiddenConnectionIds: new Set(), visibleConnectionIds: null }),

  hideConnectionGroup: (groupId) => {
    const { connectionGroups } = get();
    const group = connectionGroups.find((g) => g.id === groupId);
    if (!group) return;

    set((state) => ({
      connectionGroups: state.connectionGroups.map((g) =>
        g.id === groupId ? { ...g, visible: false } : g
      ),
    }));
  },

  showConnectionGroup: (groupId) => {
    const { connectionGroups } = get();
    const group = connectionGroups.find((g) => g.id === groupId);
    if (!group) return;

    set((state) => ({
      connectionGroups: state.connectionGroups.map((g) =>
        g.id === groupId ? { ...g, visible: true } : g
      ),
    }));
  },

  isConnectionVisible: (connectionId) => {
    const { visibleConnectionIds, hiddenConnectionIds, connectionGroups } = get();

    if (hiddenConnectionIds.has(connectionId)) {
      return false;
    }

    if (visibleConnectionIds !== null && !visibleConnectionIds.has(connectionId)) {
      return false;
    }

    for (const group of connectionGroups) {
      if (group.connectionIds.includes(connectionId) && !group.visible) {
        return false;
      }
    }

    return true;
  },
}));
