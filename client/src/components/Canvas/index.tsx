import React, { useCallback, useMemo } from 'react';
import { GridBackground } from './GridBackground';
import { ConnectionLines } from './ConnectionLines';
import { DrawingLine } from './DrawingLine';
import { EvidenceCard } from '@/components/EvidenceCard';
import { ScanlineEffect } from '@/components/ui/ScanlineEffect';
import { useCanvas } from '@/hooks/useCanvas';
import { useDragDrop } from '@/hooks/useDragDrop';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useCaseStore } from '@/store/useCaseStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';
import type { Connection, Evidence } from '@/types';
import type { PendingConnectionData } from '@/store/useUiStore';

export const Canvas: React.FC = () => {
  const {
    canvasRef,
    zoom,
    panX,
    panY,
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    screenToWorld,
  } = useCanvas();

  const {
    handleDragOver,
    handleDropFromSidebar,
    handleCardMouseDown,
  } = useDragDrop(screenToWorld);

  const evidence = useEvidenceStore((state) => state.getEvidenceArray());
  const selectedId = useCanvasStore((state) => state.selectedId);
  const selectedIds = useCanvasStore((state) => state.selectedIds);
  const toggleSelectedId = useCanvasStore((state) => state.toggleSelectedId);
  const drawingConnection = useCanvasStore((state) => state.drawingConnection);
  const updateDrawingConnection = useCanvasStore((state) => state.updateDrawingConnection);
  const endDrawingConnection = useCanvasStore((state) => state.endDrawingConnection);
  const startDrawingConnection = useCanvasStore((state) => state.startDrawingConnection);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const getEvidenceById = useEvidenceStore((state) => state.getEvidenceById);
  const currentCase = useCaseStore((state) => state.currentCase);
  const pendingRelationType = useUiStore((state) => state.pendingRelationType);
  const openConnectionDialog = useUiStore((state) => state.openConnectionDialog);
  const timelineHighlightId = useCanvasStore((state) => state.timelineHighlightId);
  const timeRangeFilter = useCanvasStore((state) => state.timeRangeFilter);

  const timeRangeStats = useMemo(() => {
    if (!timeRangeFilter.start && !timeRangeFilter.end) return null;
    const startMs = timeRangeFilter.start ? new Date(timeRangeFilter.start).getTime() : -Infinity;
    const endMs = timeRangeFilter.end ? new Date(timeRangeFilter.end).getTime() : Infinity;
    return { startMs, endMs };
  }, [timeRangeFilter]);

  const { visibleEvidence, dimmedEvidenceIds, visibleConnectionIds } = useMemo(() => {
    if (!timeRangeStats) {
      return {
        visibleEvidence: evidence,
        dimmedEvidenceIds: new Set<string>(),
        visibleConnectionIds: null as Set<string> | null,
      };
    }

    const visible = new Set<string>();
    const dimmed = new Set<string>();

    evidence.forEach((ev: Evidence) => {
      const ts = new Date(ev.timestamp || ev.createdAt).getTime();
      if (ts >= timeRangeStats.startMs && ts <= timeRangeStats.endMs) {
        visible.add(ev.id);
      } else {
        dimmed.add(ev.id);
      }
    });

    const { connections } = useCanvasStore.getState();
    const visibleConn = new Set<string>();
    connections.forEach((c: Connection) => {
      if (visible.has(c.fromEvidenceId) && visible.has(c.toEvidenceId)) {
        visibleConn.add(c.id);
      }
    });

    return {
      visibleEvidence: evidence,
      dimmedEvidenceIds: dimmed,
      visibleConnectionIds: visibleConn,
    };
  }, [evidence, timeRangeStats]);

  const isHighlighted = (evidenceId: string) => {
    if (timelineHighlightId === `ev-${evidenceId}`) return true;
    if (selectedId === evidenceId) return true;
    return false;
  };

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      handleMouseMove(e);

      if (drawingConnection) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        updateDrawingConnection(worldPos.x, worldPos.y);
      }
    },
    [handleMouseMove, drawingConnection, screenToWorld, updateDrawingConnection]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleMouseUp();

      if (drawingConnection && currentCase) {
        const target = e.target as HTMLElement;
        const cardElement = target.closest('[data-evidence-card]');

        if (cardElement) {
          const toId = cardElement.getAttribute('data-evidence-id');
          if (toId && toId !== drawingConnection.fromId) {
            const fromEvidence = getEvidenceById(drawingConnection.fromId);
            const toEvidence = getEvidenceById(toId);

            if (fromEvidence && toEvidence) {
              const tempConnectionId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const lineStyle = (pendingRelationType?.lineStyle || 'solid') as Connection['lineStyle'];
              const defaultColor = pendingRelationType?.color || CYBERPUNK_COLORS.accentCyan;
              const defaultLabel = pendingRelationType?.label || '';
              const defaultRelationTypeId = pendingRelationType?.id || null;

              const previewConnection: Connection = {
                id: tempConnectionId,
                caseId: currentCase.id,
                fromEvidenceId: drawingConnection.fromId,
                toEvidenceId: toId,
                label: defaultLabel,
                color: defaultColor,
                lineStyle,
                relationTypeId: defaultRelationTypeId,
                createdAt: new Date().toISOString(),
              };

              addConnection(previewConnection);

              const pendingData: PendingConnectionData = {
                fromEvidenceId: drawingConnection.fromId,
                toEvidenceId: toId,
                label: defaultLabel,
                color: defaultColor,
                lineStyle,
                relationTypeId: defaultRelationTypeId,
                tempConnectionId,
              };

              openConnectionDialog(pendingData);
            }
          }
        }
        endDrawingConnection();
      }
    },
    [
      handleMouseUp,
      drawingConnection,
      currentCase,
      getEvidenceById,
      addConnection,
      endDrawingConnection,
      pendingRelationType,
      openConnectionDialog,
    ]
  );

  const handleConnectionStart = useCallback(
    (evidenceId: string, startX: number, startY: number) => {
      startDrawingConnection(evidenceId, startX, startY);
    },
    [startDrawingConnection]
  );

  const handleCardClick = useCallback(
    (e: React.MouseEvent, evidenceId: string) => {
      e.stopPropagation();
      const multiSelect = e.ctrlKey || e.metaKey;
      toggleSelectedId(evidenceId, multiSelect);
    },
    [toggleSelectedId]
  );

  const canvasStyle: React.CSSProperties = {
    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
    transformOrigin: '0 0',
    cursor: isPanning ? 'grabbing' : drawingConnection ? 'crosshair' : 'grab',
  };

  return (
    <div
      ref={canvasRef}
      data-canvas-container
      className="flex-1 relative overflow-hidden"
      style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleMouseLeave}
      onDragOver={handleDragOver}
      onDrop={handleDropFromSidebar}
    >
      <GridBackground />

      <div
        className="absolute top-0 left-0 w-full h-full"
        style={canvasStyle}
      >
        <ConnectionLines
          zoom={zoom}
          visibleConnectionIds={visibleConnectionIds}
          highlightConnectionIds={timelineHighlightId?.startsWith('cn-') ? new Set([timelineHighlightId.slice(3)]) : null}
        />

        {visibleEvidence.map((item) => {
          const dimmed = dimmedEvidenceIds.has(item.id);
          const highlighted = isHighlighted(item.id);
          const isCardSelected = selectedIds.has(item.id);

          return (
            <div
              key={`wrapper-${item.id}`}
              style={{
                opacity: dimmed ? 0.2 : 1,
                transition: 'opacity 0.3s ease',
                filter: dimmed ? 'grayscale(50%)' : 'none',
                pointerEvents: dimmed ? 'none' : 'auto',
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
              }}
            >
              <EvidenceCard
                evidence={item}
                isSelected={highlighted || isCardSelected}
                onMouseDown={(e) => handleCardMouseDown(e, item)}
                onClick={(e) => handleCardClick(e, item.id)}
                onConnectionStart={handleConnectionStart}
                zoom={zoom}
                highlighted={highlighted}
              />
            </div>
          );
        })}

        <DrawingLine zoom={zoom} />
      </div>

      {timeRangeStats && (
        <div
          className="absolute top-2 left-2 px-3 py-1.5 rounded-sm border text-xs font-mono flex items-center gap-2 z-40"
          style={{
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgSecondary, 0.9),
            borderColor: CYBERPUNK_COLORS.accentPurple,
            color: CYBERPUNK_COLORS.accentPurple,
            backdropFilter: 'blur(4px)',
          }}
        >
          <span>时间过滤已激活</span>
          <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            ({visibleEvidence.length - dimmedEvidenceIds.size}/{visibleEvidence.length} 条证据)
          </span>
        </div>
      )}

      {timelineHighlightId && (
        <div
          className="absolute top-2 right-2 px-3 py-1.5 rounded-sm border text-xs font-mono z-40 animate-pulse"
          style={{
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.bgSecondary, 0.9),
            borderColor: CYBERPUNK_COLORS.accentCyan,
            color: CYBERPUNK_COLORS.accentCyan,
          }}
        >
          已定位: {timelineHighlightId.startsWith('ev-') ? '证据卡片' : timelineHighlightId.startsWith('cn-') ? '关联关系' : '记录'}
        </div>
      )}

      <ScanlineEffect />
    </div>
  );
};

export default Canvas;
