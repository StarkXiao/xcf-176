import React, { useEffect } from 'react';
import { Toolbar } from '@/components/Toolbar';
import { Sidebar } from '@/components/Sidebar';
import { Canvas } from '@/components/Canvas';
import { PropertyPanel } from '@/components/PropertyPanel';
import { CaseSelector } from '@/components/CaseSelector';
import { CollaboratorPanel } from '@/components/CollaboratorPanel';
import { TimelinePanel } from '@/components/TimelinePanel';
import { AuditLogPanel } from '@/components/AuditLogPanel';
import { EvidenceCollectionPanel } from '@/components/EvidenceCollectionPanel';
import { ConsultationPanel } from '@/components/ConsultationPanel';
import { TraceAnalysisPanel } from '@/components/TraceAnalysisPanel';
import { InvestigationTaskPanel } from '@/components/InvestigationTaskPanel';
import { ScanlineEffect } from '@/components/ui/ScanlineEffect';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useCollaboratorStore } from '@/store/useCollaboratorStore';
import { useAuditLogStore } from '@/store/useAuditLogStore';
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
  const loadCollaborators = useCollaboratorStore((state) => state.loadCollaborators);
  const loadAuditLogs = useAuditLogStore((state) => state.loadAuditLogs);

  useDebouncedSave(500);

  useEffect(() => {
    if (!currentCase && !caseSelectorOpen) {
      setCaseSelectorOpen(true);
    }
  }, [currentCase, caseSelectorOpen, setCaseSelectorOpen]);

  useEffect(() => {
    if (currentCase) {
      loadCollaborators(currentCase.id);
      loadAuditLogs(currentCase.id);
    }
  }, [currentCase, loadCollaborators, loadAuditLogs]);

  return (
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}
    >
      <Toolbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <Canvas />
        {collaboratorPanelOpen && <CollaboratorPanel />}
        {timelinePanelOpen && <TimelinePanel />}
        {auditLogPanelOpen && <AuditLogPanel />}
        {evidenceCollectionPanelOpen && <EvidenceCollectionPanel />}
        {consultationPanelOpen && <ConsultationPanel />}
        {traceAnalysisPanelOpen && <TraceAnalysisPanel />}
        {investigationTaskPanelOpen && <InvestigationTaskPanel />}
        <PropertyPanel />
      </div>

      <CaseSelector />
      <ScanlineEffect />
    </div>
  );
};

export default Home;
