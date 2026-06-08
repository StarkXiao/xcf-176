import React, { useState, useMemo } from 'react';
import { Plus, Database } from 'lucide-react';
import { SearchFilter } from './SearchFilter';
import { EvidenceListItem } from './EvidenceListItem';
import { NeonButton } from '@/components/ui/NeonButton';
import { useCaseStore } from '@/store/useCaseStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor, generateRandomColor } from '@/utils/colorUtils';
import type { Evidence, SearchFilters } from '@/types';

export const Sidebar: React.FC = () => {
  const currentCase = useCaseStore((state) => state.currentCase);
  const evidenceList = useEvidenceStore((state) => state.getEvidenceArray());
  const selectedId = useCanvasStore((state) => state.selectedId);
  const setSelectedId = useCanvasStore((state) => state.setSelectedId);
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: '',
    tags: [],
    importance: undefined,
  });

  const filteredEvidence = useMemo(() => {
    return evidenceList.filter((evidence) => {
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const matchesContent = evidence.content.toLowerCase().includes(keyword);
        const matchesSource = evidence.source?.toLowerCase().includes(keyword);
        const matchesTags = evidence.tags.some((t) => t.toLowerCase().includes(keyword));
        if (!matchesContent && !matchesSource && !matchesTags) return false;
      }

      if (filters.tags.length > 0) {
        const hasTag = filters.tags.some((t) => evidence.tags.includes(t));
        if (!hasTag) return false;
      }

      if (filters.importance && evidence.importance !== filters.importance) {
        return false;
      }

      return true;
    });
  }, [evidenceList, filters]);

  const handleDragStart = (e: React.DragEvent, evidence: Evidence) => {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', evidence.id);
  };

  const handleDragEnd = () => {};

  const handleItemClick = (evidence: Evidence) => {
    setSelectedId(selectedId === evidence.id ? null : evidence.id);
  };

  const handleAddEvidence = async () => {
    if (!currentCase) return;

    const addEvidence = useEvidenceStore.getState().addEvidence;
    await addEvidence({
      caseId: currentCase.id,
      content: '新证据',
      source: '手动添加',
      importance: 'normal',
      tags: [],
      positionX: 100 + Math.random() * 200,
      positionY: 100 + Math.random() * 200,
      width: 200,
      height: 120,
      color: generateRandomColor(),
      timestamp: new Date().toISOString(),
    });
  };

  if (!sidebarOpen) {
    return (
      <div
        className="w-12 border-r flex flex-col items-center py-4 gap-4"
        style={{
          backgroundColor: CYBERPUNK_COLORS.bgSecondary,
          borderColor: CYBERPUNK_COLORS.borderColor,
        }}
      >
        <Database
          size={20}
          style={{
            color: CYBERPUNK_COLORS.accentCyan,
            filter: `drop-shadow(0 0 6px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="w-72 border-r flex flex-col"
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
          <Database
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
            证据库
          </span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded-sm"
            style={{
              backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.2),
              color: CYBERPUNK_COLORS.accentCyan,
            }}
          >
            {filteredEvidence.length}
          </span>
        </div>
        <NeonButton size="sm" variant="primary" icon={<Plus size={14} />} onClick={handleAddEvidence} />
      </div>

      <SearchFilter filters={filters} onFiltersChange={setFilters} />

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredEvidence.length === 0 ? (
          <div
            className="text-center py-8 font-mono text-sm"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            {evidenceList.length === 0 ? '暂无证据' : '无匹配结果'}
          </div>
        ) : (
          filteredEvidence.map((evidence) => (
            <EvidenceListItem
              key={evidence.id}
              evidence={evidence}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onClick={() => handleItemClick(evidence)}
              isSelected={selectedId === evidence.id}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
