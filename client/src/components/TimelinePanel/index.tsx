import React, { useMemo, useState } from 'react';
import { Clock, X, ArrowRight, FileText, Link, ScrollText } from 'lucide-react';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useAuditLogStore } from '@/store/useAuditLogStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';

type FilterType = 'all' | 'evidence' | 'connection' | 'audit';

interface TimelineItem {
  id: string;
  type: 'evidence' | 'connection' | 'audit';
  timestamp: string;
  content: React.ReactNode;
  dotColor: string;
}

const FILTER_LABELS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'evidence', label: '证据' },
  { value: 'connection', label: '关联' },
  { value: 'audit', label: '操作' },
];

export const TimelinePanel: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const evidenceMap = useEvidenceStore((s) => s.evidence);
  const connections = useCanvasStore((s) => s.connections);
  const auditLogs = useAuditLogStore((s) => s.auditLogs);
  const toggleTimelinePanel = useUiStore((s) => s.toggleTimelinePanel);

  const evidenceArray = Object.values(evidenceMap);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${mi}`;
  };

  const items: TimelineItem[] = useMemo(() => {
    const result: TimelineItem[] = [];

    evidenceArray.forEach((e) => {
      result.push({
        id: `ev-${e.id}`,
        type: 'evidence',
        timestamp: e.timestamp,
        dotColor: CYBERPUNK_COLORS.accentCyan,
        content: (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText size={12} style={{ color: CYBERPUNK_COLORS.accentCyan }} />
              <span
                className="text-xs font-mono truncate"
                style={{ color: CYBERPUNK_COLORS.textPrimary }}
              >
                {e.content.slice(0, 30)}
                {e.content.length > 30 && '...'}
              </span>
            </div>
            {e.importance && (
              <span
                className="inline-block px-1.5 py-0.5 text-xs font-mono rounded-sm"
                style={{
                  backgroundColor: getGlowColor(IMPORTANCE_COLORS[e.importance], 0.15),
                  color: IMPORTANCE_COLORS[e.importance],
                }}
              >
                {e.importance}
              </span>
            )}
          </div>
        ),
      });
    });

    connections.forEach((c) => {
      const fromEv = evidenceMap[c.fromEvidenceId];
      const toEv = evidenceMap[c.toEvidenceId];
      result.push({
        id: `cn-${c.id}`,
        type: 'connection',
        timestamp: c.createdAt,
        dotColor: CYBERPUNK_COLORS.accentPurple,
        content: (
          <div className="flex items-center gap-1.5">
            <Link size={12} style={{ color: CYBERPUNK_COLORS.accentPurple }} />
            <span
              className="text-xs font-mono truncate"
              style={{ color: CYBERPUNK_COLORS.textPrimary }}
            >
              {c.label || '关联'}
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {fromEv?.content.slice(0, 10) || '...'}
            </span>
            <ArrowRight size={10} style={{ color: CYBERPUNK_COLORS.accentPurple }} />
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {toEv?.content.slice(0, 10) || '...'}
            </span>
          </div>
        ),
      });
    });

    auditLogs.forEach((l) => {
      result.push({
        id: `al-${l.id}`,
        type: 'audit',
        timestamp: l.createdAt,
        dotColor: CYBERPUNK_COLORS.accentYellow,
        content: (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <ScrollText size={12} style={{ color: CYBERPUNK_COLORS.accentYellow }} />
              <span
                className="text-xs font-mono"
                style={{ color: CYBERPUNK_COLORS.textPrimary }}
              >
                {l.collaboratorName}
              </span>
            </div>
            <div
              className="text-xs font-mono"
              style={{ color: CYBERPUNK_COLORS.textSecondary }}
            >
              {l.detail}
            </div>
          </div>
        ),
      });
    });

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [evidenceArray, connections, auditLogs, evidenceMap]);

  const filtered = filter === 'all' ? items : items.filter((i) => i.type === filter);

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 360,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <Clock
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentCyan,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.6)}`,
            }}
          >
            统一时间线
          </span>
        </div>
        <button
          onClick={toggleTimelinePanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-1 p-3 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        {FILTER_LABELS.map((f) => (
          <button
            key={f.value}
            className="px-2 py-1 text-xs font-mono rounded-sm border transition-all"
            style={{
              borderColor: filter === f.value ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.borderColor,
              color: filter === f.value ? CYBERPUNK_COLORS.accentCyan : CYBERPUNK_COLORS.textSecondary,
              backgroundColor: filter === f.value ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1) : 'transparent',
            }}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <div
            className="text-xs font-mono text-center py-4"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无记录
          </div>
        )}
        <div className="relative pl-6">
          <div
            className="absolute left-2.5 top-0 bottom-0 w-px"
            style={{ backgroundColor: CYBERPUNK_COLORS.borderColor }}
          />
          {filtered.map((item) => (
            <div key={item.id} className="relative pb-4">
              <div
                className="absolute left-[-10px] top-1 w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: item.dotColor,
                  boxShadow: `0 0 8px ${getGlowColor(item.dotColor, 0.6)}`,
                }}
              />
              <div
                className="text-xs font-mono mb-1"
                style={{ color: CYBERPUNK_COLORS.textSecondary }}
              >
                {formatTimestamp(item.timestamp)}
              </div>
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
