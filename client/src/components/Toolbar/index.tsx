import React, { useEffect } from 'react';
import {
  FilePlus,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Clock,
  FolderOpen,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { NeonButton } from '@/components/ui/NeonButton';
import { StatusIndicator } from '@/components/ui/StatusIndicator';
import { useUiStore } from '@/store/useUiStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useZoom } from '@/hooks/useZoom';
import { useDebouncedSave } from '@/hooks/useDebouncedSave';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';

export const Toolbar: React.FC = () => {
  const { zoom, zoomIn, zoomOut, setZoomLevel, resetView } = useZoom();
  const saveStatus = useUiStore((state) => state.saveStatus);
  const lastSaved = useUiStore((state) => state.lastSaved);
  const currentTime = useUiStore((state) => state.currentTime);
  const updateCurrentTime = useUiStore((state) => state.updateCurrentTime);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const togglePropertyPanel = useUiStore((state) => state.togglePropertyPanel);
  const toggleCaseSelector = useUiStore((state) => state.toggleCaseSelector);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const propertyPanelOpen = useUiStore((state) => state.propertyPanelOpen);
  const { forceSave } = useDebouncedSave();

  useEffect(() => {
    const interval = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(interval);
  }, [updateCurrentTime]);

  const handleExport = async () => {
    const canvasElement = document.querySelector('[data-canvas-container]') as HTMLElement;
    if (!canvasElement) return;

    try {
      const { exportCanvasAsPng, formatExportFilename } = await import('@/utils/exportUtils');
      await exportCanvasAsPng(canvasElement, formatExportFilename('evidence-board'));
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleNewCase = () => {
    toggleCaseSelector();
  };

  return (
    <div
      className="h-12 px-4 flex items-center justify-between border-b"
      style={{
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div className="flex items-center gap-2">
        <NeonButton
          size="sm"
          variant="primary"
          icon={<FilePlus size={16} />}
          onClick={handleNewCase}
        >
          新建
        </NeonButton>
        <NeonButton
          size="sm"
          variant="success"
          icon={<Save size={16} />}
          onClick={forceSave}
          disabled={saveStatus === 'saving'}
        >
          保存
        </NeonButton>
        <NeonButton
          size="sm"
          variant="secondary"
          icon={<FolderOpen size={16} />}
          onClick={toggleCaseSelector}
        >
          打开
        </NeonButton>

        <div
          className="h-6 w-px mx-2"
          style={{ backgroundColor: CYBERPUNK_COLORS.borderColor }}
        />

        <NeonButton
          size="sm"
          variant="primary"
          icon={<ZoomOut size={16} />}
          onClick={zoomOut}
          glow={false}
        />
        <div
          className="text-xs font-mono w-16 text-center"
          style={{
            color: CYBERPUNK_COLORS.accentCyan,
            textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
          }}
        >
          {Math.round(zoom * 100)}%
        </div>
        <NeonButton
          size="sm"
          variant="primary"
          icon={<ZoomIn size={16} />}
          onClick={zoomIn}
          glow={false}
        />
        <NeonButton
          size="sm"
          variant="primary"
          icon={<Maximize2 size={16} />}
          onClick={resetView}
          glow={false}
        />

        <div
          className="h-6 w-px mx-2"
          style={{ backgroundColor: CYBERPUNK_COLORS.borderColor }}
        />

        <NeonButton
          size="sm"
          variant="warning"
          icon={<Download size={16} />}
          onClick={handleExport}
        >
          导出
        </NeonButton>
      </div>

      <div className="flex items-center gap-4">
        <StatusIndicator
          status={saveStatus}
          label={
            saveStatus === 'saving'
              ? '保存中...'
              : saveStatus === 'saved'
              ? '已保存'
              : saveStatus === 'error'
              ? '保存失败'
              : '就绪'
          }
        />

        {lastSaved && (
          <div
            className="text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            上次保存: {lastSaved.toLocaleTimeString('zh-CN', { hour12: false })}
          </div>
        )}

        <div
          className="h-6 w-px"
          style={{ backgroundColor: CYBERPUNK_COLORS.borderColor }}
        />

        <div className="flex items-center gap-2">
          <Clock
            size={16}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="font-mono text-sm"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {currentTime}
          </span>
        </div>

        <div
          className="h-6 w-px"
          style={{ backgroundColor: CYBERPUNK_COLORS.borderColor }}
        />

        <NeonButton
          size="sm"
          variant="primary"
          icon={<PanelLeft size={16} />}
          onClick={toggleSidebar}
          glow={sidebarOpen}
        />
        <NeonButton
          size="sm"
          variant="primary"
          icon={<PanelRight size={16} />}
          onClick={togglePropertyPanel}
          glow={propertyPanelOpen}
        />
      </div>
    </div>
  );
};

export default Toolbar;
