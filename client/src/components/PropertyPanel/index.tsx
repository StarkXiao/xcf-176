import React from 'react';
import { Settings, X } from 'lucide-react';
import { EvidenceEditor } from './EvidenceEditor';
import { useUiStore } from '@/store/useUiStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { CYBERPUNK_COLORS, getGlowColor } from '@/utils/colorUtils';

export const PropertyPanel: React.FC = () => {
  const propertyPanelOpen = useUiStore((state) => state.propertyPanelOpen);
  const togglePropertyPanel = useUiStore((state) => state.togglePropertyPanel);
  const selectedId = useCanvasStore((state) => state.selectedId);
  const getEvidenceById = useEvidenceStore((state) => state.getEvidenceById);

  const selectedEvidence = selectedId ? getEvidenceById(selectedId) : null;

  if (!propertyPanelOpen) {
    return (
      <div
        className="w-12 border-l flex flex-col items-center py-4 gap-4"
        style={{
          backgroundColor: CYBERPUNK_COLORS.bgSecondary,
          borderColor: CYBERPUNK_COLORS.borderColor,
        }}
      >
        <button onClick={togglePropertyPanel}>
          <Settings
            size={20}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-80 border-l flex flex-col"
      style={{
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="h-12 px-4 flex items-center justify-between border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <Settings
            size={16}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="font-mono text-sm uppercase tracking-wider"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.4)}`,
            }}
          >
            属性面板
          </span>
        </div>
        <button onClick={togglePropertyPanel}>
          <X size={16} style={{ color: CYBERPUNK_COLORS.textSecondary }} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedEvidence ? (
          <EvidenceEditor evidence={selectedEvidence} />
        ) : (
          <div
            className="text-center py-12 font-mono text-sm"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <Settings
              size={48}
              className="mx-auto mb-4 opacity-30"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            />
            <p>选择一个证据卡片</p>
            <p className="text-xs mt-2">以编辑其属性</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyPanel;
