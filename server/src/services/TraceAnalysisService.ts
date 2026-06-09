import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { AuditLogRepository } from '../repositories/AuditLogRepository.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import type { TraceNode, TraceEdge, TraceGraph, TraceNodeKind, TraceEdgeKind } from '@shared/types';

function makeNodeId(kind: TraceNodeKind, refId: string): string {
  return `${kind}-${refId}`;
}

function makeEdgeId(from: string, to: string, kind: TraceEdgeKind): string {
  return `edge-${kind}-${from}-${to}`;
}

export const TraceAnalysisService = {
  buildTraceGraph: (caseId: string): TraceGraph => {
    const evidence = EvidenceRepository.findByCaseId(caseId);
    const connections = ConnectionRepository.findByCaseId(caseId);
    const auditLogs = AuditLogRepository.findByCaseId(caseId);
    const collectionItems = EvidenceCollectionRepository.findByCaseId(caseId);

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
  },
};
