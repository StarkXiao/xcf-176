import html2canvas from 'html2canvas';
import { caseSnapshotApi } from '@/api/caseSnapshotApi';
import type {
  CaseSnapshot,
  CaseSnapshotExportFormat,
  CaseSnapshotFilterState,
  CaseSnapshotCanvasLayout,
  CaseSnapshotRelationshipNote,
  Evidence,
  Connection,
  ConnectionGroup,
} from '@/types';

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

export async function createCaseSnapshot(params: {
  caseId: string;
  caseName: string;
  title?: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  filters: SearchFilters;
  filteredEvidence: Evidence[];
  visibleConnections: Connection[];
  connectionGroups: ConnectionGroup[];
  canvasZoom: number;
  canvasPanX: number;
  canvasPanY: number;
  visibleConnectionIds: Set<string> | null;
  hiddenConnectionIds: Set<string>;
  timeRangeFilter: { start: string | null; end: string | null };
  timelineMode: boolean;
}): Promise<CaseSnapshot | null> {
  try {
    const {
      caseId,
      title,
      description,
      createdBy,
      createdByName,
      filters,
      filteredEvidence,
      visibleConnections,
      connectionGroups,
      canvasZoom,
      canvasPanX,
      canvasPanY,
      visibleConnectionIds,
      hiddenConnectionIds,
      timeRangeFilter,
      timelineMode,
    } = params;

    const matchedEvidenceIds = filteredEvidence.map((e) => e.id);
    const evidenceIdSet = new Set(matchedEvidenceIds);

    const filterState: CaseSnapshotFilterState = {
      keyword: filters.keyword,
      tags: filters.tags,
      importance: filters.importance,
      matchedEvidenceIds,
    };

    const evidencePositions = filteredEvidence.map((e) => ({
      evidenceId: e.id,
      positionX: e.positionX,
      positionY: e.positionY,
      width: e.width,
      height: e.height,
      color: e.color,
    }));

    const evidenceMap = new Map<string, Evidence>();
    filteredEvidence.forEach((e) => evidenceMap.set(e.id, e));

    const viewScopedConnections = visibleConnections.filter((c) => {
      return evidenceIdSet.has(c.fromEvidenceId) && evidenceIdSet.has(c.toEvidenceId);
    });

    const viewScopedConnectionIdSet = new Set(viewScopedConnections.map((c) => c.id));

    const viewScopedConnectionGroups = connectionGroups
      .map((g) => ({
        ...g,
        connectionIds: g.connectionIds.filter((cid) => viewScopedConnectionIdSet.has(cid)),
      }))
      .filter((g) => g.connectionIds.length > 0);

    const relationshipNotes: CaseSnapshotRelationshipNote[] = viewScopedConnections.map((c) => {
      const fromEv = evidenceMap.get(c.fromEvidenceId);
      const toEv = evidenceMap.get(c.toEvidenceId);
      return {
        connectionId: c.id,
        fromEvidenceId: c.fromEvidenceId,
        toEvidenceId: c.toEvidenceId,
        fromEvidenceContent: fromEv ? fromEv.content.slice(0, 50) : c.fromEvidenceId,
        toEvidenceContent: toEv ? toEv.content.slice(0, 50) : c.toEvidenceId,
        label: c.label || '关联',
        color: c.color,
        description: `${fromEv ? fromEv.content.slice(0, 30) : c.fromEvidenceId}  →  ${toEv ? toEv.content.slice(0, 30) : c.toEvidenceId}`,
      };
    });

    const canvasLayout: CaseSnapshotCanvasLayout = {
      zoom: canvasZoom,
      panX: canvasPanX,
      panY: canvasPanY,
      evidencePositions,
      visibleConnectionIds: visibleConnectionIds ? Array.from(visibleConnectionIds) : null,
      hiddenConnectionIds: Array.from(hiddenConnectionIds),
      timeRangeFilter,
      timelineMode,
    };

    const response = await caseSnapshotApi.create({
      caseId,
      title,
      description,
      createdBy,
      createdByName,
      filterState,
      canvasLayout,
      relationshipNotes,
      evidence: filteredEvidence,
      connections: viewScopedConnections,
      connectionGroups: viewScopedConnectionGroups,
    });

    if (response.success && response.data) {
      return response.data;
    }
    console.error('Failed to create snapshot:', response.error);
    return null;
  } catch (error) {
    console.error('Create snapshot failed:', error);
    return null;
  }
}

export async function exportCaseSnapshot(
  snapshotId: string,
  format: CaseSnapshotExportFormat,
): Promise<CaseSnapshot | null> {
  try {
    const response = await caseSnapshotApi.exportSnapshot(snapshotId, format);
    if (response.success && response.data && response.data.exportedContent) {
      let filename = `case-snapshot-${snapshotId.slice(0, 8)}`;
      let mimeType = 'text/plain';

      switch (format) {
        case 'json':
          filename += '.json';
          mimeType = 'application/json';
          break;
        case 'html':
          filename += '.html';
          mimeType = 'text/html';
          break;
        case 'markdown':
          filename += '.md';
          mimeType = 'text/markdown';
          break;
      }

      downloadFile(response.data.exportedContent, filename, mimeType);
      return response.data;
    }
    console.error('Failed to export snapshot:', response.error);
    return null;
  } catch (error) {
    console.error('Export snapshot failed:', error);
    return null;
  }
}

export function formatSnapshotFilename(prefix: string = 'case-snapshot', format: string = 'json'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.${format}`;
}

export interface SearchFilters {
  keyword: string;
  tags: string[];
  importance?: Evidence['importance'];
}

export async function exportCanvasAsPng(
  element: HTMLElement,
  filename: string = 'evidence-board.png'
): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Export failed:', error);
    throw new Error('Failed to export canvas as PNG');
  }
}

export async function exportCanvasAsBlob(element: HTMLElement): Promise<Blob | null> {
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#0a0a0f',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png');
    });
  } catch (error) {
    console.error('Export failed:', error);
    return null;
  }
}

export function formatExportFilename(prefix: string = 'evidence-board'): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${timestamp}.png`;
}

export async function copyToClipboard(element: HTMLElement): Promise<boolean> {
  try {
    const blob = await exportCanvasAsBlob(element);
    if (!blob) return false;

    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ]);

    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}
