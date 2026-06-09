import React, { useCallback } from 'react';
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
import { connectionApi } from '@/api/connectionApi';
import { generateConnectionId } from '@/utils/idGenerator';
import { recordAuditLog, captureConnectionSnapshot } from '@/utils/auditHelper';
import { CYBERPUNK_COLORS } from '@/utils/colorUtils';

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
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDropFromSidebar,
    handleCardMouseDown,
  } = useDragDrop(screenToWorld);

  const evidence = useEvidenceStore((state) => state.getEvidenceArray());
  const selectedId = useCanvasStore((state) => state.selectedId);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const drawingConnection = useCanvasStore((state) => state.drawingConnection);
  const updateDrawingConnection = useCanvasStore((state) => state.updateDrawingConnection);
  const endDrawingConnection = useCanvasStore((state) => state.endDrawingConnection);
  const startDrawingConnection = useCanvasStore((state) => state.startDrawingConnection);
  const addConnection = useCanvasStore((state) => state.addConnection);
  const getEvidenceById = useEvidenceStore((state) => state.getEvidenceById);
  const currentCase = useCaseStore((state) => state.currentCase);

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
              const newConnection = {
                id: generateConnectionId(),
                caseId: currentCase.id,
                fromEvidenceId: drawingConnection.fromId,
                toEvidenceId: toId,
                label: '',
                color: CYBERPUNK_COLORS.accentCyan,
                lineStyle: 'solid' as const,
                createdAt: new Date().toISOString(),
              };

              connectionApi.create({
                caseId: currentCase.id,
                fromEvidenceId: drawingConnection.fromId,
                toEvidenceId: toId,
                label: '',
                color: CYBERPUNK_COLORS.accentCyan,
                lineStyle: 'solid',
              });

              addConnection(newConnection);

              const snapshot = captureConnectionSnapshot(newConnection);
              recordAuditLog(
                'create_connection',
                'connection',
                newConnection.id,
                `创建关联: ${fromEvidence.content.slice(0, 20)} → ${toEvidence.content.slice(0, 20)}`,
                snapshot
              );
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
      setSelectedId(selectedId === evidenceId ? null : evidenceId);
    },
    [selectedId, setSelectedId]
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
        <ConnectionLines zoom={zoom} />

        {evidence.map((item) => (
          <EvidenceCard
            key={item.id}
            evidence={item}
            isSelected={selectedId === item.id}
            onMouseDown={(e) => handleCardMouseDown(e, item)}
            onClick={(e) => handleCardClick(e, item.id)}
            onConnectionStart={handleConnectionStart}
            zoom={zoom}
          />
        ))}

        <DrawingLine zoom={zoom} />
      </div>

      <ScanlineEffect />
    </div>
  );
};

export default Canvas;
