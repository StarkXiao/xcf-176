import { create } from 'zustand';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UiState {
  sidebarOpen: boolean;
  propertyPanelOpen: boolean;
  caseSelectorOpen: boolean;
  collaboratorPanelOpen: boolean;
  timelinePanelOpen: boolean;
  auditLogPanelOpen: boolean;
  evidenceCollectionPanelOpen: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  currentTime: string;
  currentCollaboratorId: string | null;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  togglePropertyPanel: () => void;
  setPropertyPanelOpen: (open: boolean) => void;
  toggleCaseSelector: () => void;
  setCaseSelectorOpen: (open: boolean) => void;
  toggleCollaboratorPanel: () => void;
  setCollaboratorPanelOpen: (open: boolean) => void;
  toggleTimelinePanel: () => void;
  setTimelinePanelOpen: (open: boolean) => void;
  toggleAuditLogPanel: () => void;
  setAuditLogPanelOpen: (open: boolean) => void;
  toggleEvidenceCollectionPanel: () => void;
  setEvidenceCollectionPanelOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  updateLastSaved: () => void;
  updateCurrentTime: () => void;
  setCurrentCollaboratorId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  propertyPanelOpen: true,
  caseSelectorOpen: false,
  collaboratorPanelOpen: false,
  timelinePanelOpen: false,
  auditLogPanelOpen: false,
  evidenceCollectionPanelOpen: false,
  saveStatus: 'idle',
  lastSaved: null,
  currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  currentCollaboratorId: null,

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  togglePropertyPanel: () => set((state) => ({ propertyPanelOpen: !state.propertyPanelOpen })),
  setPropertyPanelOpen: (open) => set({ propertyPanelOpen: open }),

  toggleCaseSelector: () => set((state) => ({ caseSelectorOpen: !state.caseSelectorOpen })),
  setCaseSelectorOpen: (open) => set({ caseSelectorOpen: open }),

  toggleCollaboratorPanel: () => set((state) => ({ collaboratorPanelOpen: !state.collaboratorPanelOpen })),
  setCollaboratorPanelOpen: (open) => set({ collaboratorPanelOpen: open }),

  toggleTimelinePanel: () => set((state) => ({ timelinePanelOpen: !state.timelinePanelOpen })),
  setTimelinePanelOpen: (open) => set({ timelinePanelOpen: open }),

  toggleAuditLogPanel: () => set((state) => ({ auditLogPanelOpen: !state.auditLogPanelOpen })),
  setAuditLogPanelOpen: (open) => set({ auditLogPanelOpen: open }),

  toggleEvidenceCollectionPanel: () => set((state) => ({ evidenceCollectionPanelOpen: !state.evidenceCollectionPanelOpen })),
  setEvidenceCollectionPanelOpen: (open) => set({ evidenceCollectionPanelOpen: open }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  updateLastSaved: () => set({ lastSaved: new Date() }),

  updateCurrentTime: () => {
    set({
      currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    });
  },

  setCurrentCollaboratorId: (id) => set({ currentCollaboratorId: id }),
}));
