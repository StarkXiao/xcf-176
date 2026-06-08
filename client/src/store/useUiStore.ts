import { create } from 'zustand';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UiState {
  sidebarOpen: boolean;
  propertyPanelOpen: boolean;
  caseSelectorOpen: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  currentTime: string;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  togglePropertyPanel: () => void;
  setPropertyPanelOpen: (open: boolean) => void;
  toggleCaseSelector: () => void;
  setCaseSelectorOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  updateLastSaved: () => void;
  updateCurrentTime: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  sidebarOpen: true,
  propertyPanelOpen: true,
  caseSelectorOpen: false,
  saveStatus: 'idle',
  lastSaved: null,
  currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  togglePropertyPanel: () => set((state) => ({ propertyPanelOpen: !state.propertyPanelOpen })),
  setPropertyPanelOpen: (open) => set({ propertyPanelOpen: open }),

  toggleCaseSelector: () => set((state) => ({ caseSelectorOpen: !state.caseSelectorOpen })),
  setCaseSelectorOpen: (open) => set({ caseSelectorOpen: open }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  updateLastSaved: () => set({ lastSaved: new Date() }),

  updateCurrentTime: () => {
    set({
      currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    });
  },
}));
