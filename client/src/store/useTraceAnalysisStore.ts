import { create } from 'zustand';
import { traceAnalysisApi } from '@/api/traceAnalysisApi';
import type {
  TraceNode,
  TraceEdge,
  TraceGraph,
  TracePerspective,
  TraceNodeKind,
  TraceEdgeKind,
  Evidence,
  Connection,
  AuditLog,
  EvidenceCollectionItem,
} from '@/types';

interface TraceAnalysisState {
  graph: TraceGraph;
  perspective: TracePerspective;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  loading: boolean;
  error: string | null;
  setPerspective: (p: TracePerspective) => void;
  setSelectedNodeId: (id: string | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  buildGraph: (
    evidence: Evidence[],
    connections: Connection[],
    auditLogs: AuditLog[],
    collectionItems: EvidenceCollectionItem[],
  ) => void;
  loadFromServer: (caseId: string) => Promise<void>;
  getFilteredGraph: () => TraceGraph;
}

function makeNodeId(kind: TraceNodeKind, refId: string): string {
  return `${kind}-${refId}`;
}

function makeEdgeId(from: string, to: string, kind: TraceEdgeKind): string {
  return `edge-${kind}-${from}-${to}`;
}

export function buildTraceGraph(
  evidence: Evidence[],
  connections: Connection[],
  auditLogs: AuditLog[],
  collectionItems: EvidenceCollectionItem[],
): TraceGraph {
  const nodes: TraceNode[] = [];
  const edges: TraceEdge[] = [];
  const nodeIdSet = new Set<string>();

  const addNode = (node: TraceNode) => {
    if (!nodeIdSet.has(node.id)) {
      nodeIdSet.add(node.id);
      nodes.push(node);
    }
  };

  evidence.forEach((e) => {
    addNode({
      id: makeNodeId('evidence', e.id),
      kind: 'evidence',
      label: e.content.length > 30 ? e.content.slice(0, 30) + '...' : e.content,
      timestamp: e.timestamp || e.createdAt,
      importance: e.importance,
      sourceCredibility: e.sourceCredibility,
      verificationStatus: e.verificationStatus,
      referenceId: e.id,
      tags: e.tags || [],
    });
  });

  collectionItems.forEach((ci) => {
    addNode({
      id: makeNodeId('collection', ci.id),
      kind: 'collection',
      label: ci.content.length > 30 ? ci.content.slice(0, 30) + '...' : ci.content,
      timestamp: ci.collectedAt,
      sourceType: ci.sourceType,
      importance: ci.importance,
      referenceId: ci.id,
      tags: ci.tags || [],
    });

    if (ci.duplicateOf) {
      const fromId = makeNodeId('collection', ci.id);
      const toId = makeNodeId('collection', ci.duplicateOf);
      edges.push({
        id: makeEdgeId(fromId, toId, 'dedup'),
        fromNodeId: fromId,
        toNodeId: toId,
        label: '重复',
        kind: 'dedup',
      });
    }

    if (ci.archivedEvidenceId) {
      const fromId = makeNodeId('collection', ci.id);
      const toId = makeNodeId('evidence', ci.archivedEvidenceId);
      edges.push({
        id: makeEdgeId(fromId, toId, 'source'),
        fromNodeId: fromId,
        toNodeId: toId,
        label: '归档为',
        kind: 'source',
      });
    }
  });

  connections.forEach((c) => {
    const fromId = makeNodeId('evidence', c.fromEvidenceId);
    const toId = makeNodeId('evidence', c.toEvidenceId);
    edges.push({
      id: makeEdgeId(fromId, toId, 'connection'),
      fromNodeId: fromId,
      toNodeId: toId,
      label: c.label || '关联',
      kind: 'connection',
    });
  });

  auditLogs.forEach((al) => {
    const auditNodeId = makeNodeId('audit', al.id);
    addNode({
      id: auditNodeId,
      kind: 'audit',
      label: al.detail.length > 30 ? al.detail.slice(0, 30) + '...' : al.detail,
      timestamp: al.createdAt,
      referenceId: al.id,
      tags: [],
      collaboratorName: al.collaboratorName,
    });

    if (al.targetType === 'evidence') {
      const targetId = makeNodeId('evidence', al.targetId);
      if (nodeIdSet.has(targetId)) {
        edges.push({
          id: makeEdgeId(auditNodeId, targetId, 'source'),
          fromNodeId: auditNodeId,
          toNodeId: targetId,
          label: '操作',
          kind: 'source',
        });
      }
    }
  });

  const sortedNodes = [...nodes].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  for (let i = 1; i < sortedNodes.length; i++) {
    const prev = sortedNodes[i - 1];
    const curr = sortedNodes[i];
    if (prev.kind === curr.kind || prev.kind === 'collection' || curr.kind === 'collection') {
      const existingEdge = edges.find(
        (e) =>
          (e.fromNodeId === prev.id && e.toNodeId === curr.id) ||
          (e.fromNodeId === curr.id && e.toNodeId === prev.id)
      );
      if (!existingEdge) {
        edges.push({
          id: makeEdgeId(prev.id, curr.id, 'temporal'),
          fromNodeId: prev.id,
          toNodeId: curr.id,
          label: '时序',
          kind: 'temporal',
        });
      }
    }
  }

  return { nodes, edges };
}

export function filterGraphByPerspective(graph: TraceGraph, perspective: TracePerspective): TraceGraph {
  switch (perspective) {
    case 'timeline':
      return {
        nodes: [...graph.nodes].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
        edges: graph.edges,
      };

    case 'source': {
      const sourceNodes = graph.nodes.filter((n) => n.kind === 'collection' || n.kind === 'evidence');
      const sourceNodeIds = new Set(sourceNodes.map((n) => n.id));
      const sourceEdges = graph.edges.filter(
        (e) => sourceNodeIds.has(e.fromNodeId) && sourceNodeIds.has(e.toNodeId)
      );
      return { nodes: sourceNodes, edges: sourceEdges };
    }

    case 'relationship': {
      const evidenceNodes = graph.nodes.filter((n) => n.kind === 'evidence');
      const evidenceNodeIds = new Set(evidenceNodes.map((n) => n.id));
      const connEdges = graph.edges.filter(
        (e) =>
          e.kind === 'connection' &&
          evidenceNodeIds.has(e.fromNodeId) &&
          evidenceNodeIds.has(e.toNodeId)
      );
      const connectedNodeIds = new Set<string>();
      connEdges.forEach((e) => {
        connectedNodeIds.add(e.fromNodeId);
        connectedNodeIds.add(e.toNodeId);
      });
      const connectedNodes = evidenceNodes.filter((n) => connectedNodeIds.has(n.id));
      return { nodes: connectedNodes, edges: connEdges };
    }

    case 'importance': {
      const importanceNodes = graph.nodes.filter(
        (n) => n.importance === 'high' || n.importance === 'critical'
      );
      const importanceNodeIds = new Set(importanceNodes.map((n) => n.id));
      const importanceEdges = graph.edges.filter(
        (e) => importanceNodeIds.has(e.fromNodeId) && importanceNodeIds.has(e.toNodeId)
      );
      return { nodes: importanceNodes, edges: importanceEdges };
    }

    case 'credibility': {
      const credibilityNodes = graph.nodes.filter(
        (n) => n.sourceCredibility && n.sourceCredibility !== 'very_low' && n.sourceCredibility !== 'low'
      );
      if (credibilityNodes.length === 0) {
        return { nodes: graph.nodes.filter((n) => n.sourceCredibility), edges: [] };
      }
      const credibilityNodeIds = new Set(credibilityNodes.map((n) => n.id));
      const credibilityEdges = graph.edges.filter(
        (e) => credibilityNodeIds.has(e.fromNodeId) && credibilityNodeIds.has(e.toNodeId)
      );
      return { nodes: credibilityNodes, edges: credibilityEdges };
    }

    case 'verification': {
      const verificationNodes = graph.nodes.filter(
        (n) => n.verificationStatus
      );
      const verificationNodeIds = new Set(verificationNodes.map((n) => n.id));
      const verificationEdges = graph.edges.filter(
        (e) => verificationNodeIds.has(e.fromNodeId) && verificationNodeIds.has(e.toNodeId)
      );
      return { nodes: verificationNodes, edges: verificationEdges };
    }

    default:
      return graph;
  }
}

export const useTraceAnalysisStore = create<TraceAnalysisState>((set, get) => ({
  graph: { nodes: [], edges: [] },
  perspective: 'timeline',
  selectedNodeId: null,
  hoveredNodeId: null,
  loading: false,
  error: null,

  setPerspective: (p) => set({ perspective: p }),

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),

  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  buildGraph: (evidence, connections, auditLogs, collectionItems) => {
    const graph = buildTraceGraph(evidence, connections, auditLogs, collectionItems);
    set({ graph });
  },

  loadFromServer: async (caseId) => {
    set({ loading: true, error: null });
    try {
      const response = await traceAnalysisApi.getTraceGraph(caseId);
      if (response.success && response.data) {
        set({ graph: response.data });
      } else {
        set({ error: response.error || '加载链路图失败' });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      set({ loading: false });
    }
  },

  getFilteredGraph: () => {
    const { graph, perspective } = get();
    return filterGraphByPerspective(graph, perspective);
  },
}));
