import { describe, it, expect } from 'vitest';
import { buildTraceGraph, filterGraphByPerspective } from '@/store/useTraceAnalysisStore';
import type { Evidence, Connection, AuditLog, EvidenceCollectionItem } from '@/types';

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    caseId: 'case-1',
    content: '测试证据',
    source: 'manual',
    sourceCredibility: 'medium',
    verificationStatus: 'unverified',
    importance: 'high',
    tags: ['标签A'],
    positionX: 0,
    positionY: 0,
    width: 200,
    height: 120,
    color: '#00f0ff',
    timestamp: '2025-01-01T10:00:00Z',
    createdAt: '2025-01-01T10:00:00Z',
    assignedTo: null,
    status: 'pending',
    ...overrides,
  };
}

function makeConnection(fromId: string, toId: string, label = '关联'): Connection {
  return {
    id: 'conn-1',
    caseId: 'case-1',
    fromEvidenceId: fromId,
    toEvidenceId: toId,
    label,
    color: '#9945ff',
    lineStyle: 'solid',
    createdAt: '2025-01-01T11:00:00Z',
  };
}

function makeAuditLog(targetId: string, targetType: 'evidence' | 'connection' | 'case' | 'collaborator' = 'evidence'): AuditLog {
  return {
    id: 'al-1',
    caseId: 'case-1',
    collaboratorId: 'col-1',
    collaboratorName: '操作员A',
    action: 'create_evidence',
    targetType,
    targetId,
    detail: '创建证据',
    createdAt: '2025-01-01T09:00:00Z',
  };
}

function makeCollectionItem(overrides: Partial<EvidenceCollectionItem> = {}): EvidenceCollectionItem {
  return {
    id: 'ci-1',
    caseId: 'case-1',
    sourceType: 'manual_entry',
    content: '采集项',
    contentHash: 'hash123',
    importance: 'normal',
    tags: [],
    verificationStatus: 'verified',
    collectedAt: '2025-01-01T08:00:00Z',
    ...overrides,
  };
}

describe('buildTraceGraph', () => {
  it('空输入应返回空图', () => {
    const graph = buildTraceGraph([], [], [], []);
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });

  it('证据应生成evidence节点', () => {
    const evidence = [makeEvidence()];
    const graph = buildTraceGraph(evidence, [], [], []);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].kind).toBe('evidence');
    expect(graph.nodes[0].id).toBe('evidence-ev-1');
    expect(graph.nodes[0].importance).toBe('high');
  });

  it('证据标签应正确传递', () => {
    const evidence = [makeEvidence({ tags: ['重要', '关键'] })];
    const graph = buildTraceGraph(evidence, [], [], []);
    expect(graph.nodes[0].tags).toEqual(['重要', '关键']);
  });

  it('连接应生成connection边', () => {
    const evidence = [makeEvidence({ id: 'ev-1' }), makeEvidence({ id: 'ev-2' })];
    const connections = [makeConnection('ev-1', 'ev-2', '因果')];
    const graph = buildTraceGraph(evidence, connections, [], []);
    const connEdges = graph.edges.filter((e) => e.kind === 'connection');
    expect(connEdges).toHaveLength(1);
    expect(connEdges[0].label).toBe('因果');
    expect(connEdges[0].fromNodeId).toBe('evidence-ev-1');
    expect(connEdges[0].toNodeId).toBe('evidence-ev-2');
  });

  it('采集项应生成collection节点', () => {
    const items = [makeCollectionItem()];
    const graph = buildTraceGraph([], [], [], items);
    const collNodes = graph.nodes.filter((n) => n.kind === 'collection');
    expect(collNodes).toHaveLength(1);
    expect(collNodes[0].sourceType).toBe('manual_entry');
  });

  it('重复采集应生成dedup边', () => {
    const items = [
      makeCollectionItem({ id: 'ci-1' }),
      makeCollectionItem({ id: 'ci-2', duplicateOf: 'ci-1', verificationStatus: 'duplicate' }),
    ];
    const graph = buildTraceGraph([], [], [], items);
    const dedupEdges = graph.edges.filter((e) => e.kind === 'dedup');
    expect(dedupEdges).toHaveLength(1);
    expect(dedupEdges[0].fromNodeId).toBe('collection-ci-2');
    expect(dedupEdges[0].toNodeId).toBe('collection-ci-1');
  });

  it('归档采集项应生成source边指向evidence', () => {
    const items = [makeCollectionItem({ archivedEvidenceId: 'ev-archived' })];
    const graph = buildTraceGraph([], [], [], items);
    const sourceEdges = graph.edges.filter((e) => e.kind === 'source');
    expect(sourceEdges).toHaveLength(1);
    expect(sourceEdges[0].toNodeId).toBe('evidence-ev-archived');
  });

  it('审计日志应生成audit节点', () => {
    const auditLogs = [makeAuditLog('ev-1')];
    const graph = buildTraceGraph([], [], auditLogs, []);
    const auditNodes = graph.nodes.filter((n) => n.kind === 'audit');
    expect(auditNodes).toHaveLength(1);
    expect(auditNodes[0].collaboratorName).toBe('操作员A');
  });

  it('审计日志指向已存在evidence应生成source边', () => {
    const evidence = [makeEvidence({ id: 'ev-1' })];
    const auditLogs = [makeAuditLog('ev-1')];
    const graph = buildTraceGraph(evidence, [], auditLogs, []);
    const sourceEdges = graph.edges.filter((e) => e.kind === 'source');
    expect(sourceEdges.length).toBeGreaterThanOrEqual(1);
  });

  it('长内容应截断为30字符', () => {
    const longContent = 'A'.repeat(50);
    const evidence = [makeEvidence({ content: longContent })];
    const graph = buildTraceGraph(evidence, [], [], []);
    expect(graph.nodes[0].label).toHaveLength(33);
    expect(graph.nodes[0].label.endsWith('...')).toBe(true);
  });
});

describe('filterGraphByPerspective', () => {
  const baseGraph = {
    nodes: [
      { id: 'evidence-ev1', kind: 'evidence' as const, label: '证据1', timestamp: '2025-01-01T10:00:00Z', referenceId: 'ev1', tags: [], importance: 'high' as const },
      { id: 'evidence-ev2', kind: 'evidence' as const, label: '证据2', timestamp: '2025-01-01T12:00:00Z', referenceId: 'ev2', tags: [], importance: 'normal' as const },
      { id: 'collection-ci1', kind: 'collection' as const, label: '采集1', timestamp: '2025-01-01T08:00:00Z', referenceId: 'ci1', tags: [], sourceType: 'manual_entry' as const, importance: 'critical' as const },
      { id: 'audit-al1', kind: 'audit' as const, label: '操作1', timestamp: '2025-01-01T09:00:00Z', referenceId: 'al1', tags: [], collaboratorName: '操作员A' },
    ],
    edges: [
      { id: 'edge-1', fromNodeId: 'evidence-ev1', toNodeId: 'evidence-ev2', label: '关联', kind: 'connection' as const },
      { id: 'edge-2', fromNodeId: 'collection-ci1', toNodeId: 'evidence-ev1', label: '归档为', kind: 'source' as const },
      { id: 'edge-3', fromNodeId: 'audit-al1', toNodeId: 'evidence-ev1', label: '操作', kind: 'source' as const },
    ],
  };

  it('timeline视角应按时间排序节点', () => {
    const result = filterGraphByPerspective(baseGraph, 'timeline');
    const timestamps = result.nodes.map((n) => new Date(n.timestamp).getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it('source视角应只保留collection和evidence节点', () => {
    const result = filterGraphByPerspective(baseGraph, 'source');
    result.nodes.forEach((n) => {
      expect(n.kind === 'collection' || n.kind === 'evidence').toBe(true);
    });
  });

  it('relationship视角应只保留有连接的证据节点', () => {
    const result = filterGraphByPerspective(baseGraph, 'relationship');
    result.nodes.forEach((n) => {
      expect(n.kind).toBe('evidence');
    });
    result.edges.forEach((e) => {
      expect(e.kind).toBe('connection');
    });
  });

  it('importance视角应只保留high和critical节点', () => {
    const result = filterGraphByPerspective(baseGraph, 'importance');
    result.nodes.forEach((n) => {
      expect(n.importance === 'high' || n.importance === 'critical').toBe(true);
    });
  });

  it('importance视角应只保留两端都是high/critical的边', () => {
    const result = filterGraphByPerspective(baseGraph, 'importance');
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    result.edges.forEach((e) => {
      expect(nodeIds.has(e.fromNodeId)).toBe(true);
      expect(nodeIds.has(e.toNodeId)).toBe(true);
    });
  });

  it('空图应安全处理所有视角', () => {
    const emptyGraph = { nodes: [], edges: [] };
    expect(() => filterGraphByPerspective(emptyGraph, 'timeline')).not.toThrow();
    expect(() => filterGraphByPerspective(emptyGraph, 'source')).not.toThrow();
    expect(() => filterGraphByPerspective(emptyGraph, 'relationship')).not.toThrow();
    expect(() => filterGraphByPerspective(emptyGraph, 'importance')).not.toThrow();
  });
});
