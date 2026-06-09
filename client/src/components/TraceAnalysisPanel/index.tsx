import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { GitBranch, X, ZoomIn, ZoomOut, Maximize2, FileText, ShieldCheck, ScrollText } from 'lucide-react';
import { useTraceAnalysisStore, filterGraphByPerspective } from '@/store/useTraceAnalysisStore';
import { useEvidenceStore } from '@/store/useEvidenceStore';
import { useCanvasStore } from '@/store/useCanvasStore';
import { useAuditLogStore } from '@/store/useAuditLogStore';
import { useEvidenceCollectionStore } from '@/store/useEvidenceCollectionStore';
import { useUiStore } from '@/store/useUiStore';
import { useCaseStore } from '@/store/useCaseStore';
import { CYBERPUNK_COLORS, getGlowColor, IMPORTANCE_COLORS } from '@/utils/colorUtils';
import type { TraceNode, TracePerspective, TraceNodeKind, TraceEdgeKind } from '@/types';

const PERSPECTIVE_CONFIG: Array<{ value: TracePerspective; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'timeline', label: '时间线', icon: <FileText size={12} />, color: CYBERPUNK_COLORS.accentCyan },
  { value: 'source', label: '来源渠道', icon: <ShieldCheck size={12} />, color: CYBERPUNK_COLORS.accentGreen },
  { value: 'relationship', label: '证据关系', icon: <GitBranch size={12} />, color: CYBERPUNK_COLORS.accentPurple },
  { value: 'importance', label: '重要性', icon: <ScrollText size={12} />, color: CYBERPUNK_COLORS.accentRed },
];

const NODE_COLORS: Record<TraceNodeKind, string> = {
  evidence: CYBERPUNK_COLORS.accentCyan,
  collection: CYBERPUNK_COLORS.accentGreen,
  audit: CYBERPUNK_COLORS.accentYellow,
};

const EDGE_COLORS: Record<TraceEdgeKind, string> = {
  connection: CYBERPUNK_COLORS.accentPurple,
  temporal: CYBERPUNK_COLORS.accentCyan,
  source: CYBERPUNK_COLORS.accentGreen,
  dedup: CYBERPUNK_COLORS.accentRed,
};

const NODE_RADIUS = 16;
const NODE_SPACING_X = 120;
const NODE_SPACING_Y = 90;

interface LayoutNode extends TraceNode {
  x: number;
  y: number;
}

function layoutNodes(nodes: TraceNode[], perspective: TracePerspective): LayoutNode[] {
  if (nodes.length === 0) return [];

  const layoutNodesResult: LayoutNode[] = [];

  if (perspective === 'timeline') {
    nodes.forEach((node, i) => {
      layoutNodesResult.push({ ...node, x: 80, y: 40 + i * NODE_SPACING_Y });
    });
    return layoutNodesResult;
  }

  if (perspective === 'source') {
    const groups = new Map<string, TraceNode[]>();
    nodes.forEach((n) => {
      const key = n.sourceType || n.kind;
      const arr = groups.get(key) || [];
      arr.push(n);
      groups.set(key, arr);
    });
    const groupKeys = Array.from(groups.keys());
    groupKeys.forEach((key, colIdx) => {
      const group = groups.get(key)!;
      group.forEach((n, rowIdx) => {
        layoutNodesResult.push({
          ...n,
          x: 80 + colIdx * NODE_SPACING_X * 1.5,
          y: 60 + rowIdx * NODE_SPACING_Y,
        });
      });
    });
    return layoutNodesResult;
  }

  if (perspective === 'importance') {
    const groups = new Map<string, TraceNode[]>();
    const order = ['critical', 'high', 'normal', 'low'];
    nodes.forEach((n) => {
      const key = n.importance || 'normal';
      const arr = groups.get(key) || [];
      arr.push(n);
      groups.set(key, arr);
    });
    order.forEach((key, colIdx) => {
      const group = groups.get(key);
      if (!group) return;
      group.forEach((n, rowIdx) => {
        layoutNodesResult.push({
          ...n,
          x: 80 + colIdx * NODE_SPACING_X * 1.5,
          y: 60 + rowIdx * NODE_SPACING_Y,
        });
      });
    });
    return layoutNodesResult;
  }

  nodes.forEach((node, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    layoutNodesResult.push({
      ...node,
      x: 80 + col * NODE_SPACING_X * 1.5,
      y: 60 + row * NODE_SPACING_Y,
    });
  });
  return layoutNodesResult;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${mi}`;
}

const SOURCE_LABELS: Record<string, string> = {
  manual_entry: '手工录入',
  file_upload: '文件上传',
  webpage_screenshot: '网页截图',
  evidence: '证据',
  collection: '采集项',
  audit: '操作',
};

const KIND_LABELS: Record<TraceNodeKind, string> = {
  evidence: '证据',
  collection: '采集',
  audit: '操作',
};

const EDGE_KIND_LABELS: Record<TraceEdgeKind, string> = {
  connection: '关联',
  temporal: '时序',
  source: '来源',
  dedup: '去重',
};

export const TraceAnalysisPanel: React.FC = () => {
  const perspective = useTraceAnalysisStore((s) => s.perspective);
  const setPerspective = useTraceAnalysisStore((s) => s.setPerspective);
  const selectedNodeId = useTraceAnalysisStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useTraceAnalysisStore((s) => s.setSelectedNodeId);
  const hoveredNodeId = useTraceAnalysisStore((s) => s.hoveredNodeId);
  const setHoveredNodeId = useTraceAnalysisStore((s) => s.setHoveredNodeId);
  const buildGraph = useTraceAnalysisStore((s) => s.buildGraph);
  const toggleTraceAnalysisPanel = useUiStore((s) => s.toggleTraceAnalysisPanel);

  const evidenceMap = useEvidenceStore((s) => s.evidence);
  const connections = useCanvasStore((s) => s.connections);
  const auditLogs = useAuditLogStore((s) => s.auditLogs);
  const collectionItems = useEvidenceCollectionStore((s) => s.items);
  const currentCase = useCaseStore((s) => s.currentCase);
  const loadAuditLogs = useAuditLogStore((s) => s.loadAuditLogs);

  const [svgZoom, setSvgZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (currentCase) {
      loadAuditLogs(currentCase.id);
    }
  }, [currentCase, loadAuditLogs]);

  useEffect(() => {
    const evidenceArray = Object.values(evidenceMap);
    buildGraph(evidenceArray, connections, auditLogs, collectionItems);
  }, [evidenceMap, connections, auditLogs, collectionItems, buildGraph]);

  const graph = useTraceAnalysisStore((s) => s.graph);
  const filteredGraph = useMemo(
    () => filterGraphByPerspective(graph, perspective),
    [graph, perspective]
  );

  const layoutedNodes = useMemo(
    () => layoutNodes(filteredGraph.nodes, perspective),
    [filteredGraph.nodes, perspective]
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, LayoutNode>();
    layoutedNodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [layoutedNodes]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setSvgZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !(e.target as HTMLElement).closest('[data-node]')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setSvgZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const svgWidth = 480;
  const svgHeight = Math.max(400, layoutedNodes.length * NODE_SPACING_Y + 100);

  const selectedNode = layoutedNodes.find((n) => n.id === selectedNodeId);

  const connectedEdgeIds = useMemo(() => {
    if (!selectedNodeId && !hoveredNodeId) return new Set<string>();
    const activeId = selectedNodeId || hoveredNodeId;
    const set = new Set<string>();
    filteredGraph.edges.forEach((e) => {
      if (e.fromNodeId === activeId || e.toNodeId === activeId) {
        set.add(e.id);
      }
    });
    return set;
  }, [selectedNodeId, hoveredNodeId, filteredGraph.edges]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId && !hoveredNodeId) return new Set<string>();
    const activeId = selectedNodeId || hoveredNodeId;
    const set = new Set<string>();
    set.add(activeId);
    filteredGraph.edges.forEach((e) => {
      if (e.fromNodeId === activeId) set.add(e.toNodeId);
      if (e.toNodeId === activeId) set.add(e.fromNodeId);
    });
    return set;
  }, [selectedNodeId, hoveredNodeId, filteredGraph.edges]);

  return (
    <div
      className="h-full flex flex-col border-l"
      style={{
        width: 540,
        backgroundColor: CYBERPUNK_COLORS.bgSecondary,
        borderColor: CYBERPUNK_COLORS.borderColor,
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor }}
      >
        <div className="flex items-center gap-2">
          <GitBranch
            size={18}
            style={{
              color: CYBERPUNK_COLORS.accentPurple,
              filter: `drop-shadow(0 0 4px ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.6)})`,
            }}
          />
          <span
            className="text-sm font-mono font-bold"
            style={{
              color: CYBERPUNK_COLORS.accentPurple,
              textShadow: `0 0 8px ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.6)}`,
            }}
          >
            链路追踪
          </span>
        </div>
        <button
          onClick={toggleTraceAnalysisPanel}
          className="p-1 transition-colors"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-1 p-3 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        {PERSPECTIVE_CONFIG.map((p) => (
          <button
            key={p.value}
            className="flex items-center gap-1 px-2 py-1 text-xs font-mono rounded-sm border transition-all"
            style={{
              borderColor: perspective === p.value ? p.color : CYBERPUNK_COLORS.borderColor,
              color: perspective === p.value ? p.color : CYBERPUNK_COLORS.textSecondary,
              backgroundColor: perspective === p.value ? getGlowColor(p.color, 0.1) : 'transparent',
            }}
            onClick={() => setPerspective(p.value)}
          >
            {p.icon}
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: CYBERPUNK_COLORS.borderColor }}>
        <button
          className="p-1 border rounded-sm transition-colors"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            color: CYBERPUNK_COLORS.accentCyan,
          }}
          onClick={() => setSvgZoom((z) => Math.min(3, z + 0.2))}
        >
          <ZoomIn size={14} />
        </button>
        <span
          className="text-xs font-mono w-12 text-center"
          style={{ color: CYBERPUNK_COLORS.accentCyan }}
        >
          {Math.round(svgZoom * 100)}%
        </span>
        <button
          className="p-1 border rounded-sm transition-colors"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            color: CYBERPUNK_COLORS.accentCyan,
          }}
          onClick={() => setSvgZoom((z) => Math.max(0.3, z - 0.2))}
        >
          <ZoomOut size={14} />
        </button>
        <button
          className="p-1 border rounded-sm transition-colors"
          style={{
            borderColor: CYBERPUNK_COLORS.borderColor,
            color: CYBERPUNK_COLORS.accentCyan,
          }}
          onClick={resetView}
        >
          <Maximize2 size={14} />
        </button>
        <div className="flex-1" />
        <span
          className="text-xs font-mono"
          style={{ color: CYBERPUNK_COLORS.textSecondary }}
        >
          {filteredGraph.nodes.length} 节点 / {filteredGraph.edges.length} 连线
        </span>
      </div>

      <div className="flex-1 overflow-hidden relative" style={{ backgroundColor: CYBERPUNK_COLORS.bgPrimary }}>
        {filteredGraph.nodes.length === 0 ? (
          <div
            className="flex items-center justify-center h-full text-xs font-mono"
            style={{ color: CYBERPUNK_COLORS.textSecondary }}
          >
            暂无追踪数据
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={svgWidth}
            height={svgHeight}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              transform: `scale(${svgZoom}) translate(${panOffset.x / svgZoom}px, ${panOffset.y / svgZoom}px)`,
              transformOrigin: '0 0',
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              <marker
                id="arrowhead-connection"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={EDGE_COLORS.connection} />
              </marker>
              <marker
                id="arrowhead-temporal"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={EDGE_COLORS.temporal} />
              </marker>
              <marker
                id="arrowhead-source"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={EDGE_COLORS.source} />
              </marker>
              <marker
                id="arrowhead-dedup"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={EDGE_COLORS.dedup} />
              </marker>
              {Object.entries(NODE_COLORS).map(([kind, color]) => (
                <filter key={`glow-${kind}`} id={`glow-${kind}`}>
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor={color} floodOpacity="0.4" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="shadow" />
                  <feMerge>
                    <feMergeNode in="shadow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            {filteredGraph.edges.map((edge) => {
              const fromNode = nodeMap.get(edge.fromNodeId);
              const toNode = nodeMap.get(edge.toNodeId);
              if (!fromNode || !toNode) return null;

              const isActive = connectedEdgeIds.has(edge.id);
              const edgeColor = EDGE_COLORS[edge.kind];
              const opacity = connectedEdgeIds.size > 0 ? (isActive ? 1 : 0.15) : 0.6;
              const dashArray = edge.kind === 'temporal' ? '4,4' : edge.kind === 'dedup' ? '2,2' : 'none';
              const markerEnd = `url(#arrowhead-${edge.kind})`;

              const dx = toNode.x - fromNode.x;
              const dy = toNode.y - fromNode.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const offsetX = (dx / dist) * (NODE_RADIUS + 4);
              const offsetY = (dy / dist) * (NODE_RADIUS + 4);

              return (
                <g key={edge.id}>
                  <line
                    x1={fromNode.x + offsetX}
                    y1={fromNode.y + offsetY}
                    x2={toNode.x - offsetX}
                    y2={toNode.y - offsetY}
                    stroke={edgeColor}
                    strokeWidth={isActive ? 2 : 1}
                    strokeDasharray={dashArray}
                    strokeOpacity={opacity}
                    markerEnd={markerEnd}
                  />
                  {isActive && (
                    <text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2 - 6}
                      textAnchor="middle"
                      fill={edgeColor}
                      fontSize="9"
                      fontFamily="monospace"
                      opacity={0.9}
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {layoutedNodes.map((node) => {
              const nodeColor = NODE_COLORS[node.kind];
              const isActive = connectedNodeIds.size > 0 ? connectedNodeIds.has(node.id) : true;
              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const opacity = isActive ? 1 : 0.2;
              const importanceColor = node.importance ? IMPORTANCE_COLORS[node.importance] : undefined;

              return (
                <g
                  key={node.id}
                  data-node="true"
                  transform={`translate(${node.x}, ${node.y})`}
                  opacity={opacity}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(isSelected ? null : node.id);
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle
                    r={NODE_RADIUS}
                    fill={CYBERPUNK_COLORS.bgTertiary}
                    stroke={nodeColor}
                    strokeWidth={isSelected ? 3 : isHovered ? 2 : 1.5}
                    filter={isSelected || isHovered ? `url(#glow-${node.kind})` : undefined}
                    strokeOpacity={opacity}
                  />
                  {importanceColor && (
                    <circle
                      r={NODE_RADIUS + 4}
                      fill="none"
                      stroke={importanceColor}
                      strokeWidth={1}
                      strokeDasharray="3,3"
                      strokeOpacity={0.5}
                    />
                  )}
                  <text
                    y={-2}
                    textAnchor="middle"
                    fill={nodeColor}
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {KIND_LABELS[node.kind]}
                  </text>
                  <text
                    y={7}
                    textAnchor="middle"
                    fill={CYBERPUNK_COLORS.textPrimary}
                    fontSize="7"
                    fontFamily="monospace"
                  >
                    {node.label.slice(0, 6)}
                  </text>
                </g>
              );
            })}

            {perspective === 'source' && (
              <>
                {Array.from(new Set(layoutedNodes.map((n) => n.sourceType || n.kind))).map((key, colIdx) => (
                  <text
                    key={key}
                    x={80 + colIdx * NODE_SPACING_X * 1.5}
                    y={25}
                    textAnchor="middle"
                    fill={CYBERPUNK_COLORS.textSecondary}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {SOURCE_LABELS[key] || key}
                  </text>
                ))}
              </>
            )}

            {perspective === 'importance' && (
              <>
                {['critical', 'high', 'normal', 'low'].map((key, colIdx) => (
                  <text
                    key={key}
                    x={80 + colIdx * NODE_SPACING_X * 1.5}
                    y={25}
                    textAnchor="middle"
                    fill={IMPORTANCE_COLORS[key as keyof typeof IMPORTANCE_COLORS]}
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {key}
                  </text>
                ))}
              </>
            )}
          </svg>
        )}
      </div>

      <div
        className="border-t px-3 py-2"
        style={{ borderColor: CYBERPUNK_COLORS.borderColor, backgroundColor: CYBERPUNK_COLORS.bgTertiary }}
      >
        <div className="flex items-center gap-4 mb-1.5">
          {Object.entries(KIND_LABELS).map(([kind, label]) => (
            <div key={kind} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: NODE_COLORS[kind as TraceNodeKind],
                  boxShadow: `0 0 4px ${getGlowColor(NODE_COLORS[kind as TraceNodeKind], 0.5)}`,
                }}
              />
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                {label}
              </span>
            </div>
          ))}
          {Object.entries(EDGE_KIND_LABELS).map(([kind, label]) => (
            <div key={kind} className="flex items-center gap-1">
              <div
                className="w-4 h-0"
                style={{
                  borderTop: `1px ${kind === 'temporal' ? 'dashed' : kind === 'dedup' ? 'dotted' : 'solid'} ${EDGE_COLORS[kind as TraceEdgeKind]}`,
                }}
              />
              <span className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {selectedNode && (
          <div
            className="mt-1.5 p-2 rounded-sm border"
            style={{
              borderColor: NODE_COLORS[selectedNode.kind],
              backgroundColor: getGlowColor(NODE_COLORS[selectedNode.kind], 0.05),
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-mono font-bold"
                style={{ color: NODE_COLORS[selectedNode.kind] }}
              >
                {KIND_LABELS[selectedNode.kind]}
              </span>
              {selectedNode.importance && (
                <span
                  className="text-xs font-mono px-1 py-0 rounded-sm"
                  style={{
                    color: IMPORTANCE_COLORS[selectedNode.importance],
                    backgroundColor: getGlowColor(IMPORTANCE_COLORS[selectedNode.importance], 0.1),
                  }}
                >
                  {selectedNode.importance}
                </span>
              )}
              {selectedNode.sourceType && (
                <span
                  className="text-xs font-mono"
                  style={{ color: CYBERPUNK_COLORS.textSecondary }}
                >
                  {SOURCE_LABELS[selectedNode.sourceType] || selectedNode.sourceType}
                </span>
              )}
            </div>
            <div className="text-xs font-mono mb-0.5" style={{ color: CYBERPUNK_COLORS.textPrimary }}>
              {selectedNode.label}
            </div>
            <div className="text-xs font-mono" style={{ color: CYBERPUNK_COLORS.textSecondary }}>
              {formatTimestamp(selectedNode.timestamp)}
              {selectedNode.collaboratorName && ` · ${selectedNode.collaboratorName}`}
            </div>
            {selectedNode.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {selectedNode.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono px-1.5 py-0 rounded-sm"
                    style={{
                      color: CYBERPUNK_COLORS.accentPurple,
                      backgroundColor: getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.1),
                      border: `1px solid ${getGlowColor(CYBERPUNK_COLORS.accentPurple, 0.3)}`,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceAnalysisPanel;
