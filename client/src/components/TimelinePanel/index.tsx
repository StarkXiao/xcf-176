import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  Clock,
  X,
  ArrowRight,
  FileText,
  Link,
  ScrollText,
  Calendar,
  Filter,
  Target,
  CalendarDays,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useAuditLogStore } from '@/store/useAuditLogStore';
import { useUiStore } from '@/store/useUiStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';

type FilterType = 'all' | 'evidence' | 'connection' | 'audit';

interface TimelineItemData {
  id: string;
  type: 'evidence' | 'connection' | 'audit';
  timestamp: string;
  timestampMs: number;
  referenceId?: string;
  content: React.ReactNode;
  dotColor: string;
  rawContent: string;
}

const FILTER_LABELS: Array<{ value: FilterType; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'evidence', label: '证据' },
  { value: 'connection', label: '关联' },
  { value: 'audit', label: '操作' },
];

const PRESET_RANGES: Array<{ label: string; hours: number | null }> = [
  { label: '1小时', hours: 1 },
  { label: '24小时', hours: 24 },
  { label: '7天', hours: 24 * 7 },
  { label: '30天', hours: 24 * 30 },
  { label: '全部', hours: null },
];

export const TimelinePanel: React.FC = () => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const evidenceMap = useEvidenceStore((s) => s.evidence);
  const connections = useCanvasStore((s) => s.connections);
  const auditLogs = useAuditLogStore((s) => s.auditLogs);
  const toggleTimelinePanel = useUiStore((s) => s.toggleTimelinePanel);
  const selectedId = useCanvasStore((s) => s.selectedId);
  const setSelectedId = useCanvasStore((s) => s.setSelectedId);
  const setPan = useCanvasStore((s) => s.setPan);
  const setZoom = useCanvasStore((s) => s.setZoom);
  const timelineHighlightId = useCanvasStore((s) => s.timelineHighlightId);
  const setTimelineHighlightId = useCanvasStore((s) => s.setTimelineHighlightId);
  const timeRangeFilter = useCanvasStore((s) => s.timeRangeFilter);
  const setTimeRangeFilter = useCanvasStore((s) => s.setTimeRangeFilter);
  const clearTimeRangeFilter = useCanvasStore((s) => s.clearTimeRangeFilter);
  const arrangeByTimeline = useEvidenceStore((s) => s.arrangeByTimeline);
  const restorePositions = useEvidenceStore((s) => s.restorePositions);
  const previousPositions = useEvidenceStore((s) => s.previousPositions);
  const timelineMode = useCanvasStore((s) => s.timelineMode);
  const toggleTimelineMode = useCanvasStore((s) => s.toggleTimelineMode);

  const evidenceArray = Object.values(evidenceMap);

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return {
      date: `${yyyy}/${mm}/${dd}`,
      time: `${hh}:${mi}:${ss}`,
      short: `${mm}/${dd} ${hh}:${mi}`,
      full: `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`,
      hourLabel: `${mm}/${dd} ${hh}:00`,
    };
  };

  const items: TimelineItemData[] = useMemo(() => {
    const result: TimelineItemData[] = [];

    evidenceArray.forEach((e) => {
      const ts = e.timestamp || e.createdAt;
      result.push({
        id: `ev-${e.id}`,
        type: 'evidence',
        timestamp: ts,
        timestampMs: new Date(ts).getTime(),
        referenceId: e.id,
        dotColor: e.color || CYBERPUNK_COLORS.accentCyan,
        rawContent: e.content,
        content: (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText size={12} style={{ color: e.color || CYBERPUNK_COLORS.accentCyan }} />
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
        timestampMs: new Date(c.createdAt).getTime(),
        referenceId: c.id,
        dotColor: c.color || CYBERPUNK_COLORS.accentPurple,
        rawContent: c.label || '关联',
        content: (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link size={12} style={{ color: c.color || CYBERPUNK_COLORS.accentPurple }} />
            <span
              className="text-xs font-mono truncate"
              style={{ color: CYBERPUNK_COLORS.textPrimary }}
            >
              {c.label || '关联'}
            </span>
            <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {fromEv?.content.slice(0, 10) || '...'}
            </span>
            <ArrowRight size={10} style={{ color: c.color || CYBERPUNK_COLORS.accentPurple }} />
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
        timestampMs: new Date(l.createdAt).getTime(),
        referenceId: l.id,
        dotColor: CYBERPUNK_COLORS.accentYellow,
        rawContent: l.detail,
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
              {l.detail.slice(0, 40)}
              {l.detail.length > 40 && '...'}
            </div>
          </div>
        ),
      });
    });

    result.sort((a, b) => a.timestampMs - b.timestampMs);
    return result;
  }, [evidenceArray, connections, auditLogs, evidenceMap]);

  const timeRangeStats = useMemo(() => {
    if (items.length === 0) {
      return { min: Date.now(), max: Date.now(), span: 0 };
    }
    const timestamps = items.map((i) => i.timestampMs);
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    return { min, max, span: max - min };
  }, [items]);

  const filtered = useMemo(() => {
    let result = filter === 'all' ? items : items.filter((i) => i.type === filter);

    if (timeRangeFilter.start) {
      const startMs = new Date(timeRangeFilter.start).getTime();
      result = result.filter((i) => i.timestampMs >= startMs);
    }
    if (timeRangeFilter.end) {
      const endMs = new Date(timeRangeFilter.end).getTime();
      result = result.filter((i) => i.timestampMs <= endMs);
    }

    return result;
  }, [items, filter, timeRangeFilter]);

  const hourMarkers = useMemo(() => {
    if (filtered.length === 0) return [];
    const markers: Array<{ key: string; label: string; timestampMs: number }> = [];
    const seen = new Set<string>();

    filtered.forEach((item) => {
      const d = new Date(item.timestampMs);
      d.setMinutes(0, 0, 0);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      if (!seen.has(key)) {
        seen.add(key);
        markers.push({
          key,
          label: formatTimestamp(item.timestamp).hourLabel,
          timestampMs: d.getTime(),
        });
      }
    });

    return markers;
  }, [filtered]);

  const focusOnCanvas = (item: TimelineItemData) => {
    if (item.type === 'evidence' && item.referenceId) {
      const ev = evidenceMap[item.referenceId];
      if (ev) {
        setSelectedId(ev.id);
        setTimelineHighlightId(item.id);

        const canvasContainer = document.querySelector('[data-canvas-container]');
        if (canvasContainer) {
          const rect = canvasContainer.getBoundingClientRect();
          const targetX = rect.width / 2 - (ev.positionX + ev.width / 2);
          const targetY = rect.height / 2 - (ev.positionY + ev.height / 2);
          setPan(targetX, targetY);
          setZoom(1);
        }
      }
    } else if (item.type === 'connection' && item.referenceId) {
      const conn = connections.find((c) => c.id === item.referenceId);
      if (conn) {
        const fromEv = evidenceMap[conn.fromEvidenceId];
        const toEv = evidenceMap[conn.toEvidenceId];
        if (fromEv && toEv) {
          const centerX = (fromEv.positionX + fromEv.width / 2 + toEv.positionX + toEv.width / 2) / 2;
          const centerY = (fromEv.positionY + fromEv.height / 2 + toEv.positionY + toEv.height / 2) / 2;
          setTimelineHighlightId(item.id);

          const canvasContainer = document.querySelector('[data-canvas-container]');
          if (canvasContainer) {
            const rect = canvasContainer.getBoundingClientRect();
            const targetX = rect.width / 2 - centerX;
            const targetY = rect.height / 2 - centerY;
            setPan(targetX, targetY);
            setZoom(1);
          }
        }
      }
    }

    setTimeout(() => setTimelineHighlightId(null), 2000);
  };

  const applyPresetRange = (hours: number | null) => {
    if (hours === null) {
      clearTimeRangeFilter();
      setCustomStart('');
      setCustomEnd('');
    } else {
      const now = Date.now();
      const start = new Date(now - hours * 60 * 60 * 1000);
      setTimeRangeFilter({
        start: start.toISOString(),
        end: new Date(now).toISOString(),
      });
    }
    setRangeOpen(false);
  };

  const applyCustomRange = () => {
    setTimeRangeFilter({
      start: customStart ? new Date(customStart).toISOString() : null,
      end: customEnd ? new Date(customEnd).toISOString() : null,
    });
    setRangeOpen(false);
  };

  const handleTimelineLayoutToggle = async () => {
    if (!timelineMode) {
      await arrangeByTimeline({ itemsPerRow: 4 });
    } else {
      await restorePositions();
    }
    toggleTimelineMode();
  };

  useEffect(() => {
    if (selectedId) {
      const targetItem = filtered.find((i) => i.referenceId === selectedId);
      if (targetItem && itemRefs.current[targetItem.id]) {
        itemRefs.current[targetItem.id]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
        setTimelineHighlightId(targetItem.id);
        setTimeout(() => setTimelineHighlightId(null), 2000);
      }
    }
  }, [selectedId, filtered, setTimelineHighlightId]);

  const isHighlighted = (itemId: string) => {
    if (timelineHighlightId === itemId) return true;
    if (selectedId) {
      const item = filtered.find((i) => i.id === itemId);
      return item?.referenceId === selectedId;
    }
    return false;
  };

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 400,
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
        <div className="flex items-center gap-1">
          <button
            onClick={handleTimelineLayoutToggle}
            className="p-1.5 rounded-sm border transition-all"
            style={{
              borderColor: timelineMode ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.borderColor,
              color: timelineMode ? CYBERPUNK_COLORS.accentGreen : CYBERPUNK_COLORS.textSecondary,
              backgroundColor: timelineMode ? getGlowColor(CYBERPUNK_COLORS.accentGreen, 0.1) : 'transparent',
            }}
            title={timelineMode ? '还原画布布局' : '按时间线排布画布'}
          >
            <CalendarDays size={14} />
          </button>
          {previousPositions && (
            <button
              onClick={restorePositions}
              className="p-1.5 rounded-sm border transition-all"
              style={{
                borderColor: CYBERPUNK_COLORS.accentYellow,
                color: CYBERPUNK_COLORS.accentYellow,
              }}
              title="还原原始位置"
            >
              <RotateCcw size={14} />
            </button>
          )}
          <button
            onClick={toggleTimelinePanel}
            className="p-1 transition-colors ml-1"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            <X size={16} />
          </button>
        </div>
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
        <div className="flex-1" />
        <div className="relative">
          <button
            onClick={() => setRangeOpen(!rangeOpen)}
            className="px-2 py-1 text-xs font-mono rounded-sm border transition-all flex items-center gap-1"
            style={{
              borderColor: (timeRangeFilter.start || timeRangeFilter.end)
                ? CYBERPUNK_COLORS.accentPurple
                : CYBERPUNK_COLORS.borderColor,
              color: (timeRangeFilter.start || timeRangeFilter.end)
                ? CYBERPUNK_COLORS.accentPurple
                : CYBERPUNK_COLORS.textSecondary,
              backgroundColor: (timeRangeFilter.start || timeRangeFilter.end)
                ? getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1)
                : 'transparent',
            }}
            title="时间范围过滤"
          >
            <Filter size={12} />
            {rangeOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {rangeOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-50 p-3 rounded-sm border shadow-xl"
              style={{
                width: 280,
                backgroundColor: CYBERPUNK_COLORS.bgTertiary,
                borderColor: CYBERPUNK_COLORS.borderColor,
              }}
            >
              <div className="text-xs font-mono mb-2" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                预设时间范围
              </div>
              <div className="flex flex-wrap gap-1 mb-3">
                {PRESET_RANGES.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPresetRange(p.hours)}
                    className="px-2 py-0.5 text-xs font-mono rounded-sm border transition-all"
                    style={{
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      color: CYBERPUNK_COLORS.textSecondary,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="text-xs font-mono mb-2" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
                自定义范围
              </div>
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-[10px] font-mono block mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    开始时间
                  </label>
                  <input
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono rounded-sm border outline-none"
                    style={{
                      backgroundColor: CYBERPUNK_COLORS.bgSecondary,
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      color: CYBERPUNK_COLORS.textPrimary,
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono block mb-1" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                    结束时间
                  </label>
                  <input
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono rounded-sm border outline-none"
                    style={{
                      backgroundColor: CYBERPUNK_COLORS.bgSecondary,
                      borderColor: CYBERPUNK_COLORS.borderColor,
                      color: CYBERPUNK_COLORS.textPrimary,
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={applyCustomRange}
                  className="flex-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.accentPurple,
                    color: CYBERPUNK_COLORS.accentPurple,
                    backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                  }}
                >
                  应用
                </button>
                <button
                  onClick={() => {
                    clearTimeRangeFilter();
                    setCustomStart('');
                    setCustomEnd('');
                  }}
                  className="px-2 py-1 text-xs font-mono rounded-sm border transition-all"
                  style={{
                    borderColor: CYBERPUNK_COLORS.borderColor,
                    color: CYBERPUNK_COLORS.textSecondary,
                  }}
                >
                  清除
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {(timeRangeFilter.start || timeRangeFilter.end) && (
        <div
          className="px-3 py-2 border-b flex items-center justify-between"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.05),
          }}
        >
          <div className="flex items-center gap-2 text-xs font-mono" style={{ color: CYBERPUNK_COLORS.accentPurple }}>
            <Calendar size={12} />
            <span>
              {timeRangeFilter.start ? formatTimestamp(timeRangeFilter.start).short : '最早'}
              {' ~ '}
              {timeRangeFilter.end ? formatTimestamp(timeRangeFilter.end).short : '现在'}
            </span>
          </div>
          <button
            onClick={() => {
              clearTimeRangeFilter();
              setCustomStart('');
              setCustomEnd('');
            }}
            className="text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            清除
          </button>
        </div>
      )}

      <div className="px-3 py-2 border-b text-xs font-mono flex items-center justify-between"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>
          共 {filtered.length} 条记录
        </span>
        {items.length > 0 && (
          <span style={{ color: CYBERPUNK_COLORS.textSecondary }}>
            跨度: {timeRangeStats.span < 60000
              ? `${Math.floor(timeRangeStats.span / 1000)}秒`
              : timeRangeStats.span < 3600000
              ? `${Math.floor(timeRangeStats.span / 60000)}分钟`
              : timeRangeStats.span < 86400000
              ? `${Math.floor(timeRangeStats.span / 3600000)}小时`
              : `${Math.floor(timeRangeStats.span / 86400000)}天`
            }
          </span>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3">
        {filtered.length === 0 && (
          <div
            className="text-xs font-mono text-center py-8"
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

          {filtered.map((item, idx) => {
            const prevItem = idx > 0 ? filtered[idx - 1] : null;
            const showHourMarker = hourMarkers.find(
              (m) => m.timestampMs <= item.timestampMs && (!prevItem || m.timestampMs > prevItem.timestampMs)
            );
            const highlighted = isHighlighted(item.id);
            const formatted = formatTimestamp(item.timestamp);

            return (
              <React.Fragment key={item.id}>
                {showHourMarker && (
                  <div className="relative -ml-6 mb-2 mt-4 first:mt-0">
                    <div
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono"
                      style={{
                        backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.1),
                        color: CYBERPUNK_COLORS.accentCyan,
                        border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.3)}`,
                      }}
                    >
                      <Clock size={10} />
                      {showHourMarker.label}
                    </div>
                  </div>
                )}

                <div
                  ref={(el) => { itemRefs.current[item.id] = el; }}
                  className={`relative pb-4 cursor-pointer transition-all duration-200 ${
                    highlighted ? '-ml-2' : ''
                  }`}
                  onClick={() => focusOnCanvas(item)}
                  style={{
                    opacity: highlighted ? 1 : 0.9,
                  }}
                >
                  <div
                    className="absolute left-[-10px] top-1 w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                      backgroundColor: item.dotColor,
                      boxShadow: highlighted
                        ? `0 0 12px ${getGlowColor(item.dotColor, 0.9)}, 0 0 24px ${getGlowColor(item.dotColor, 0.5)}`
                        : `0 0 8px ${getGlowColor(item.dotColor, 0.6)}`,
                      transform: highlighted ? 'scale(1.5)' : 'scale(1)',
                    }}
                  />

                  <div
                    className={`rounded-sm border p-2 transition-all ${
                      highlighted ? 'border-l-4' : ''
                    }`}
                    style={{
                      backgroundColor: highlighted
                        ? getGlowColor(CYBERPUNK_COLORS.accentCyan, 0.08)
                        : CYBERPUNK_COLORS.bgTertiary,
                      borderColor: highlighted
                        ? item.dotColor
                        : CYBERPUNK_COLORS.borderColor,
                      borderLeftWidth: highlighted ? 3 : 1,
                      borderLeftColor: highlighted ? item.dotColor : CYBERPUNK_COLORS.borderColor,
                      transform: highlighted ? 'translateX(4px)' : 'none',
                    }}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div
                        className="text-[10px] font-mono"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      >
                        {formatted.time}
                      </div>
                      <div
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: getGlowColor(
                            item.type === 'evidence'
                              ? CYBERPUNK_COLORS.accentCyan
                              : item.type === 'connection'
                              ? CYBERPUNK_COLORS.accentPurple
                              : CYBERPUNK_COLORS.accentYellow,
                            0.12
                          ),
                          color:
                            item.type === 'evidence'
                              ? CYBERPUNK_COLORS.accentCyan
                              : item.type === 'connection'
                              ? CYBERPUNK_COLORS.accentPurple
                              : CYBERPUNK_COLORS.accentYellow,
                        }}
                      >
                        {item.type === 'evidence' ? '证据' : item.type === 'connection' ? '关联' : '操作'}
                      </div>
                    </div>
                    <div className="mb-1.5">
                      <div
                        className="text-[10px] font-mono mb-0.5"
                        style={{ color: CYBERPUNK_COLORS.textSecondary }}
                      >
                        {formatted.date}
                      </div>
                      {item.content}
                    </div>
                    <div
                      className="flex items-center gap-1 text-[10px] font-mono pt-1 border-t"
                      style={{
                        borderColor: CYBERPUNK_COLORS.borderColor,
                        color: CYBERPUNK_COLORS.textSecondary,
                      }}
                    >
                      <Target size={10} />
                      <span className="truncate">点击定位到画布</span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelinePanel;
