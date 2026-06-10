import React, { useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { Sidebar } from '@/components/Sidebar';
import { Canvas } from '@/components/Canvas';
import { PropertyPanel } from '@/components/PropertyPanel';
import { CaseSelector } from '@/components/CaseSelector';
import { TemplateEvidenceFields } from '@/components/TemplateEvidenceFields';
import { CollaboratorPanel } from '@/components/CollaboratorPanel';
import { TimelinePanel } from '@/components/TimelinePanel';
import { AuditLogPanel } from '@/components/AuditLogPanel';
import { EvidenceCollectionPanel } from '@/components/EvidenceCollectionPanel';
import { ConsultationPanel } from '@/components/ConsultationPanel';
import { TraceAnalysisPanel } from '@/components/TraceAnalysisPanel';
import { InvestigationTaskPanel } from '@/components/InvestigationTaskPanel';
import { ReportPanel } from '@/components/ReportPanel';
import { ScanlineEffect } from '@/components/ui/ScanlineEffect';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useCaseTemplateStore } from '@/store/useCaseTemplateStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useAuditLogStore } from '@/store/useAuditLogStore';
import { useInvestigationTaskStore } from '@/store/useInvestigationTaskStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { CYBERPUNK_COLORS } from '@/utils/colorUtils';

const Home: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const caseSelectorOpen = useUiStore((state) => state.caseSelectorOpen);
  const setCaseSelectorOpen = useUiStore((state) => state.setCaseSelectorOpen);
  const collaboratorPanelOpen = useUiStore((state) => state.collaboratorPanelOpen);
  const timelinePanelOpen = useUiStore((state) => state.timelinePanelOpen);
  const auditLogPanelOpen = useUiStore((state) => state.auditLogPanelOpen);
  const evidenceCollectionPanelOpen = useUiStore((state) => state.evidenceCollectionPanelOpen);
  const consultationPanelOpen = useUiStore((state) => state.consultationPanelOpen);
  const traceAnalysisPanelOpen = useUiStore((state) => state.traceAnalysisPanelOpen);
  const investigationTaskPanelOpen = useUiStore((state) => state.investigationTaskPanelOpen);
  const reportPanelOpen = useUiStore((state) => state.reportPanelOpen);
  const loadCollaborators = useCollaboratorStore((state) => state.loadCollaborators);
  const loadAuditLogs = useAuditLogStore((state) => state.loadAuditLogs);
  const loadTasks = useInvestigationTaskStore((state) => state.loadTasks);
  const setEvidence = useEvidenceStore((state) => state.setEvidence);
  const setConnections = useCanvasStore((state) => state.setConnections);
  const setZoom = useCanvasStore((state) => state.setZoom);
  const setPan = useCanvasStore((state) => state.setPan);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const setSelectedConnectionId = useCanvasStore((state) => state.setSelectedConnectionId);
  const loadAppliedTemplateForCase = useCaseTemplateStore((state) => state.loadAppliedTemplateForCase);
  const setAppliedTemplateData = useCaseTemplateStore((state) => state.setAppliedTemplateData);

  const hasTemplate = currentCase?.templateId != null;

  useDebouncedSave(500);

  useEffect(() => {
    if (!currentCase && !caseSelectorOpen) {
      setCaseSelectorOpen(true);
    }
  }, [currentCase, caseSelectorOpen, setCaseSelectorOpen]);

  useEffect(() => {
    if (currentCase) {
      setEvidence(currentCase.evidence);
      setConnections(currentCase.connections);
      
      if (currentCase.canvasState) {
        setZoom(currentCase.canvasState.zoom);
        setPan(currentCase.canvasState.panX, currentCase.canvasState.panY);
      } else {
        setZoom(1);
        setPan(0, 0);
      }
      
      setSelectedId(null);
      setSelectedConnectionId(null);

      loadCollaborators(currentCase.id);
      loadAuditLogs(currentCase.id);
      loadTasks(currentCase.id);
      
      if (currentCase.templateId) {
        loadAppliedTemplateForCase(currentCase.id, currentCase.templateId);
      } else {
        setAppliedTemplateData(null);
      }
    } else {
      setAppliedTemplateData(null);
    }
  }, [
    currentCase,
    setEvidence,
    setConnections,
    setZoom,
    setPan,
    setSelectedId,
    setSelectedConnectionId,
    loadCollaborators,
    loadAuditLogs,
    loadTasks,
    loadAppliedTemplateForCase,
    setAppliedTemplateData,
  ]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}
    >
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        {hasTemplate && (
          <div className="w-80 flex-shrink-0">
            <TemplateEvidenceFields />
          </div>
        )}
        <Sidebar />
        <Canvas />
        {collaboratorPanelOpen && <CollaboratorPanel />}
        {timelinePanelOpen && <TimelinePanel />}
        {auditLogPanelOpen && <AuditLogPanel />}
        {evidenceCollectionPanelOpen && <EvidenceCollectionPanel />}
        {consultationPanelOpen && <ConsultationPanel />}
        {traceAnalysisPanelOpen && <TraceAnalysisPanel />}
        {investigationTaskPanelOpen && <InvestigationTaskPanel />}
        {reportPanelOpen && <ReportPanel />}
        <PropertyPanel />
      </div>

      <CaseSelector />
      <ScanlineEffect />
    </div>
  );
};

export default Home;
