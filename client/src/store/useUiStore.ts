import { create } from 'zustand';
import type { TemplateRelationType } from '@/types';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UiState {
  sidebarOpen: boolean;
  propertyPanelOpen: boolean;
  caseSelectorOpen: boolean;
  collaboratorPanelOpen: boolean;
  timelinePanelOpen: boolean;
  auditLogPanelOpen: boolean;
  evidenceCollectionPanelOpen: boolean;
  consultationPanelOpen: boolean;
  traceAnalysisPanelOpen: boolean;
  investigationTaskPanelOpen: boolean;
  reportPanelOpen: boolean;
  anomalyAlertPanelOpen: boolean;
  crossCaseComparisonPanelOpen: boolean;
  connectionGroupPanelOpen: boolean;
  overviewPanelOpen: boolean;
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  currentTime: string;
  currentCollaboratorId: string | null;
  pendingRelationType: TemplateRelationType | null;
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
  toggleConsultationPanel: () => void;
  setConsultationPanelOpen: (open: boolean) => void;
  toggleTraceAnalysisPanel: () => void;
  setTraceAnalysisPanelOpen: (open: boolean) => void;
  toggleInvestigationTaskPanel: () => void;
  setInvestigationTaskPanelOpen: (open: boolean) => void;
  toggleReportPanel: () => void;
  setReportPanelOpen: (open: boolean) => void;
  toggleAnomalyAlertPanel: () => void;
  setAnomalyAlertPanelOpen: (open: boolean) => void;
  toggleCrossCaseComparisonPanel: () => void;
  setCrossCaseComparisonPanelOpen: (open: boolean) => void;
  toggleConnectionGroupPanel: () => void;
  setConnectionGroupPanelOpen: (open: boolean) => void;
  toggleOverviewPanel: () => void;
  setOverviewPanelOpen: (open: boolean) => void;
  setSaveStatus: (status: SaveStatus) => void;
  updateLastSaved: () => void;
  updateCurrentTime: () => void;
  setCurrentCollaboratorId: (id: string | null) => void;
  setPendingRelationType: (type: TemplateRelationType | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  propertyPanelOpen: true,
  caseSelectorOpen: false,
  collaboratorPanelOpen: false,
  timelinePanelOpen: false,
  auditLogPanelOpen: false,
  evidenceCollectionPanelOpen: false,
  consultationPanelOpen: false,
  traceAnalysisPanelOpen: false,
  investigationTaskPanelOpen: false,
  reportPanelOpen: false,
  anomalyAlertPanelOpen: false,
  crossCaseComparisonPanelOpen: false,
  connectionGroupPanelOpen: false,
  overviewPanelOpen: false,
  saveStatus: 'idle',
  lastSaved: null,
  currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
  currentCollaboratorId: null,
  pendingRelationType: null,

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

  toggleConsultationPanel: () => set((state) => ({ consultationPanelOpen: !state.consultationPanelOpen })),
  setConsultationPanelOpen: (open) => set({ consultationPanelOpen: open }),

  toggleTraceAnalysisPanel: () => set((state) => ({ traceAnalysisPanelOpen: !state.traceAnalysisPanelOpen })),
  setTraceAnalysisPanelOpen: (open) => set({ traceAnalysisPanelOpen: open }),

  toggleInvestigationTaskPanel: () => set((state) => ({ investigationTaskPanelOpen: !state.investigationTaskPanelOpen })),
  setInvestigationTaskPanelOpen: (open) => set({ investigationTaskPanelOpen: open }),

  toggleReportPanel: () => set((state) => ({ reportPanelOpen: !state.reportPanelOpen })),
  setReportPanelOpen: (open) => set({ reportPanelOpen: open }),

  toggleAnomalyAlertPanel: () => set((state) => ({ anomalyAlertPanelOpen: !state.anomalyAlertPanelOpen })),
  setAnomalyAlertPanelOpen: (open) => set({ anomalyAlertPanelOpen: open }),

  toggleCrossCaseComparisonPanel: () => set((state) => ({ crossCaseComparisonPanelOpen: !state.crossCaseComparisonPanelOpen })),
  setCrossCaseComparisonPanelOpen: (open) => set({ crossCaseComparisonPanelOpen: open }),

  toggleConnectionGroupPanel: () => set((state) => ({ connectionGroupPanelOpen: !state.connectionGroupPanelOpen })),
  setConnectionGroupPanelOpen: (open) => set({ connectionGroupPanelOpen: open }),

  toggleOverviewPanel: () => set((state) => ({ overviewPanelOpen: !state.overviewPanelOpen })),
  setOverviewPanelOpen: (open) => set({ overviewPanelOpen: open }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  updateLastSaved: () => set({ lastSaved: new Date() }),

  updateCurrentTime: () => {
    set({
      currentTime: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    });
  },

  setCurrentCollaboratorId: (id) => set({ currentCollaboratorId: id }),

  setPendingRelationType: (type) => set({ pendingRelationType: type }),
}));
