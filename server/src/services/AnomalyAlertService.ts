import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { AnomalyAlertRepository } from '../repositories/AnomalyAlertRepository.js';
import type {
  AnomalyAlert,
  AnomalyAlertSeverity,
  AnomalyAlertType,
  AnomalyDetectionConfig,
  AnomalyDetectionResult,
  Case,
  Connection,
  Evidence,
  UpdateAnomalyAlertDto,
} from '@shared/types';

const DEFAULT_CONFIG: Required<AnomalyDetectionConfig> = {
  highImportance: {
    criticalThreshold: 2,
    highThreshold: 4,
    minEvidenceCount: 3,
  },
  denseConnections: {
    minConnectionsPerEvidence: 3,
    minClusterSize: 3,
    connectionDensityThreshold: 0.5,
  },
  temporalBurst: {
    timeWindowHours: 24,
    minEvidenceInWindow: 5,
    burstMultiplier: 2.0,
  },
  combinedAlertThreshold: 0.6,
};

function mergeConfig(userConfig?: AnomalyDetectionConfig): Required<AnomalyDetectionConfig> {
  return {
    highImportance: { ...DEFAULT_CONFIG.highImportance, ...(userConfig?.highImportance ?? {}) },
    denseConnections: { ...DEFAULT_CONFIG.denseConnections, ...(userConfig?.denseConnections ?? {}) },
    temporalBurst: { ...DEFAULT_CONFIG.temporalBurst, ...(userConfig?.temporalBurst ?? {}) },
    combinedAlertThreshold: userConfig?.combinedAlertThreshold ?? DEFAULT_CONFIG.combinedAlertThreshold,
  };
}

function resolveSeverity(score: number): AnomalyAlertSeverity {
  if (score >= 0.8) return 'critical';
  if (score >= 0.5) return 'high';
  return 'warning';
}

interface HighImportanceResult {
  triggered: boolean;
  score: number;
  criticalEvidence: Evidence[];
  highEvidence: Evidence[];
  evidenceIds: string[];
}

function detectHighImportance(
  evidence: Evidence[],
  config: Required<AnomalyDetectionConfig>['highImportance']
): HighImportanceResult {
  const criticalEvidence = evidence.filter((e) => e.importance === 'critical');
  const highEvidence = evidence.filter((e) => e.importance === 'high');
  const totalImportant = criticalEvidence.length + highEvidence.length;
  const minEvidenceCount = config.minEvidenceCount!;
  const criticalThreshold = config.criticalThreshold!;
  const highThreshold = config.highThreshold!;

  if (evidence.length < minEvidenceCount) {
    return { triggered: false, score: 0, criticalEvidence, highEvidence, evidenceIds: [] };
  }

  let score = 0;
  if (criticalEvidence.length >= criticalThreshold) {
    score += 0.5;
  } else {
    score += (criticalEvidence.length / Math.max(criticalThreshold, 1)) * 0.5;
  }

  const highRatio = highEvidence.length / Math.max(highThreshold, 1);
  score += Math.min(highRatio, 1) * 0.3;

  const importantRatio = totalImportant / Math.max(evidence.length, 1);
  score += importantRatio * 0.2;

  score = Math.min(score, 1);

  const triggered = criticalEvidence.length >= criticalThreshold ||
    (totalImportant >= highThreshold && importantRatio >= 0.5);

  return {
    triggered,
    score,
    criticalEvidence,
    highEvidence,
    evidenceIds: [...criticalEvidence, ...highEvidence].map((e) => e.id),
  };
}

interface DenseConnectionsResult {
  triggered: boolean;
  score: number;
  clusterEvidenceIds: string[];
  clusterConnectionIds: string[];
  connectionCount: number;
}

function buildAdjacencyMap(connections: Connection[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const conn of connections) {
    if (!adj.has(conn.fromEvidenceId)) adj.set(conn.fromEvidenceId, new Set());
    if (!adj.has(conn.toEvidenceId)) adj.set(conn.toEvidenceId, new Set());
    adj.get(conn.fromEvidenceId)!.add(conn.toEvidenceId);
    adj.get(conn.toEvidenceId)!.add(conn.fromEvidenceId);
  }
  return adj;
}

function findClusters(
  adjacency: Map<string, Set<string>>,
  minClusterSize: number
): string[][] {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of adjacency.keys()) {
    if (visited.has(node)) continue;
    const queue = [node];
    const cluster: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);
      const neighbors = adjacency.get(current);
      if (neighbors) {
        for (const n of neighbors) {
          if (!visited.has(n)) queue.push(n);
        }
      }
    }
    if (cluster.length >= minClusterSize) {
      clusters.push(cluster);
    }
  }
  return clusters;
}

function detectDenseConnections(
  evidence: Evidence[],
  connections: Connection[],
  config: Required<AnomalyDetectionConfig>['denseConnections']
): DenseConnectionsResult {
  const minClusterSize = config.minClusterSize!;
  const minConnectionsPerEvidence = config.minConnectionsPerEvidence!;
  const connectionDensityThreshold = config.connectionDensityThreshold!;

  if (evidence.length < minClusterSize || connections.length === 0) {
    return { triggered: false, score: 0, clusterEvidenceIds: [], clusterConnectionIds: [], connectionCount: 0 };
  }

  const adjacency = buildAdjacencyMap(connections);
  const clusters = findClusters(adjacency, minClusterSize);

  if (clusters.length === 0) {
    return { triggered: false, score: 0, clusterEvidenceIds: [], clusterConnectionIds: [], connectionCount: 0 };
  }

  let bestCluster: string[] = [];
  let bestScore = 0;
  let bestConnectionCount = 0;

  for (const cluster of clusters) {
    const clusterEvidence = evidence.filter((e) => cluster.includes(e.id));
    if (clusterEvidence.length < minClusterSize) continue;

    const clusterConnections = connections.filter(
      (c) => cluster.includes(c.fromEvidenceId) && cluster.includes(c.toEvidenceId)
    );

    const maxPossibleConnections = (cluster.length * (cluster.length - 1)) / 2;
    const density = maxPossibleConnections > 0 ? clusterConnections.length / maxPossibleConnections : 0;

    const avgConnectionsPerNode = cluster.length > 0
      ? cluster.reduce((sum, node) => sum + (adjacency.get(node)?.size ?? 0), 0) / cluster.length
      : 0;

    let score = 0;
    score += Math.min(density / connectionDensityThreshold, 1) * 0.5;
    score += Math.min(avgConnectionsPerNode / minConnectionsPerEvidence, 1) * 0.3;
    score += Math.min(cluster.length / (minClusterSize * 2), 1) * 0.2;
    score = Math.min(score, 1);

    if (score > bestScore) {
      bestScore = score;
      bestCluster = cluster;
      bestConnectionCount = clusterConnections.length;
    }
  }

  const clusterConnectionIds = connections
    .filter((c) => bestCluster.includes(c.fromEvidenceId) && bestCluster.includes(c.toEvidenceId))
    .map((c) => c.id);

  const triggered = bestScore >= 0.5;

  return {
    triggered,
    score: bestScore,
    clusterEvidenceIds: bestCluster,
    clusterConnectionIds,
    connectionCount: bestConnectionCount,
  };
}

interface TemporalBurstResult {
  triggered: boolean;
  score: number;
  burstEvidenceIds: string[];
  burstStart?: string;
  burstEnd?: string;
}

function detectTemporalBurst(
  evidence: Evidence[],
  config: Required<AnomalyDetectionConfig>['temporalBurst']
): TemporalBurstResult {
  const timeWindowHours = config.timeWindowHours!;
  const minEvidenceInWindow = config.minEvidenceInWindow!;
  const burstMultiplier = config.burstMultiplier!;

  const datedEvidence = evidence.filter((e) => e.timestamp && e.timestamp.length > 0);
  if (datedEvidence.length < minEvidenceInWindow) {
    return { triggered: false, score: 0, burstEvidenceIds: [] };
  }

  const sorted = [...datedEvidence].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const windowMs = timeWindowHours * 60 * 60 * 1000;
  let maxCount = 0;
  let maxStartIdx = 0;

  for (let i = 0; i < sorted.length; i++) {
    const windowStart = new Date(sorted[i].timestamp).getTime();
    let count = 0;
    for (let j = i; j < sorted.length; j++) {
      if (new Date(sorted[j].timestamp).getTime() - windowStart <= windowMs) {
        count++;
      } else {
        break;
      }
    }
    if (count > maxCount) {
      maxCount = count;
      maxStartIdx = i;
    }
  }

  if (maxCount < minEvidenceInWindow) {
    return { triggered: false, score: 0, burstEvidenceIds: [] };
  }

  const burstEvidence: Evidence[] = [];
  const windowStart = new Date(sorted[maxStartIdx].timestamp).getTime();
  for (let j = maxStartIdx; j < sorted.length; j++) {
    if (new Date(sorted[j].timestamp).getTime() - windowStart <= windowMs) {
      burstEvidence.push(sorted[j]);
    } else {
      break;
    }
  }

  const expectedRate = datedEvidence.length / Math.max(
    (new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime()) / windowMs,
    1
  );
  const actualRate = maxCount;
  const burstRatio = expectedRate > 0 ? actualRate / expectedRate : actualRate;

  let score = 0;
  score += Math.min(maxCount / (minEvidenceInWindow * 2), 1) * 0.4;
  score += Math.min(burstRatio / burstMultiplier, 1) * 0.4;
  score += Math.min(burstEvidence.length / datedEvidence.length, 1) * 0.2;
  score = Math.min(score, 1);

  const triggered = burstRatio >= burstMultiplier || score >= 0.5;

  return {
    triggered,
    score,
    burstEvidenceIds: burstEvidence.map((e) => e.id),
    burstStart: burstEvidence[0]?.timestamp,
    burstEnd: burstEvidence[burstEvidence.length - 1]?.timestamp,
  };
}

function detectCaseAnomalies(
  caseData: Case,
  evidence: Evidence[],
  connections: Connection[],
  config: Required<AnomalyDetectionConfig>
): AnomalyAlert[] {
  const alerts: AnomalyAlert[] = [];
  const timeWindowHours = config.temporalBurst.timeWindowHours!;
  const combinedAlertThreshold = config.combinedAlertThreshold!;

  const hiResult = detectHighImportance(evidence, config.highImportance);
  if (hiResult.triggered || hiResult.score >= 0.4) {
    const severity = resolveSeverity(hiResult.score);
    const title = hiResult.criticalEvidence.length > 0
      ? `发现 ${hiResult.criticalEvidence.length} 个关键证据`
      : `发现大量高重要度证据`;
    const description = [
      `案件中包含 ${hiResult.criticalEvidence.length} 个关键(critical)证据，`,
      `${hiResult.highEvidence.length} 个高(high)重要度证据，`,
      `占总证据数的 ${((hiResult.criticalEvidence.length + hiResult.highEvidence.length) / Math.max(evidence.length, 1) * 100).toFixed(1)}%。`,
      hiResult.criticalEvidence.length > 0 ? '建议优先核查关键证据内容。' : '证据整体重要度偏高，需重点关注。'
    ].join('');

    const alertData = {
      caseId: caseData.id,
      caseName: caseData.name,
      type: 'high_importance' as AnomalyAlertType,
      severity,
      title,
      description,
      score: hiResult.score,
      evidenceCount: evidence.length,
      connectionCount: connections.length,
      criticalEvidenceCount: hiResult.criticalEvidence.length,
      highEvidenceCount: hiResult.highEvidence.length,
      evidenceIds: hiResult.evidenceIds,
      connectionIds: [] as string[],
    };

    if (!AnomalyAlertRepository.existsByCaseAndType(caseData.id, 'high_importance')) {
      alerts.push(AnomalyAlertRepository.create(alertData));
    }
  }

  const dcResult = detectDenseConnections(evidence, connections, config.denseConnections);
  if (dcResult.triggered || dcResult.score >= 0.4) {
    const severity = resolveSeverity(dcResult.score);
    const title = `检测到证据密集关联网络`;
    const description = [
      `发现由 ${dcResult.clusterEvidenceIds.length} 个证据节点组成的密集关联簇，`,
      `包含 ${dcResult.connectionCount} 条关联关系。`,
      dcResult.clusterEvidenceIds.length >= 5 ? '关联网络规模较大，可能指向有组织犯罪活动。' : '证据间存在紧密关联，建议作为整体线索分析。'
    ].join('');

    const alertData = {
      caseId: caseData.id,
      caseName: caseData.name,
      type: 'dense_connections' as AnomalyAlertType,
      severity,
      title,
      description,
      score: dcResult.score,
      evidenceCount: evidence.length,
      connectionCount: connections.length,
      criticalEvidenceCount: 0,
      highEvidenceCount: 0,
      evidenceIds: dcResult.clusterEvidenceIds,
      connectionIds: dcResult.clusterConnectionIds,
    };

    if (!AnomalyAlertRepository.existsByCaseAndType(caseData.id, 'dense_connections')) {
      alerts.push(AnomalyAlertRepository.create(alertData));
    }
  }

  const tbResult = detectTemporalBurst(evidence, config.temporalBurst);
  if (tbResult.triggered || tbResult.score >= 0.4) {
    const severity = resolveSeverity(tbResult.score);
    const title = `检测到证据时间集中爆发`;
    const burstRange = tbResult.burstStart && tbResult.burstEnd
      ? `（${new Date(tbResult.burstStart).toLocaleString()} 至 ${new Date(tbResult.burstEnd).toLocaleString()}）`
      : '';
    const description = [
      `在 ${timeWindowHours} 小时窗口内集中出现 ${tbResult.burstEvidenceIds.length} 条证据`,
      burstRange,
      '。时间上的高度集中可能说明该时段为案件关键活动期，建议重点分析该时间段的事件序列。'
    ].join('');

    const alertData = {
      caseId: caseData.id,
      caseName: caseData.name,
      type: 'temporal_burst' as AnomalyAlertType,
      severity,
      title,
      description,
      score: tbResult.score,
      evidenceCount: evidence.length,
      connectionCount: connections.length,
      criticalEvidenceCount: 0,
      highEvidenceCount: 0,
      burstStart: tbResult.burstStart,
      burstEnd: tbResult.burstEnd,
      evidenceIds: tbResult.burstEvidenceIds,
      connectionIds: [] as string[],
    };

    if (!AnomalyAlertRepository.existsByCaseAndType(caseData.id, 'temporal_burst')) {
      alerts.push(AnomalyAlertRepository.create(alertData));
    }
  }

  const combinedScore = (hiResult.score + dcResult.score + tbResult.score) / 3;
  if (combinedScore >= combinedAlertThreshold) {
    const severity = resolveSeverity(combinedScore);
    const factors: string[] = [];
    if (hiResult.score >= 0.4) factors.push('高重要度证据');
    if (dcResult.score >= 0.4) factors.push('密集关联网络');
    if (tbResult.score >= 0.4) factors.push('时间集中爆发');

    const title = `综合异常预警：多维度检测到重大线索`;
    const description = [
      `综合评分 ${(combinedScore * 100).toFixed(0)}/100，同时触发 ${factors.length} 个异常维度：`,
      factors.join('、'),
      '。该案件具有多个高风险特征，强烈建议列为优先核查对象。'
    ].join('');

    const allEvidenceIds = Array.from(new Set([
      ...hiResult.evidenceIds,
      ...dcResult.clusterEvidenceIds,
      ...tbResult.burstEvidenceIds,
    ]));
    const allConnectionIds = dcResult.clusterConnectionIds;

    const alertData = {
      caseId: caseData.id,
      caseName: caseData.name,
      type: 'combined' as AnomalyAlertType,
      severity,
      title,
      description,
      score: combinedScore,
      evidenceCount: evidence.length,
      connectionCount: connections.length,
      criticalEvidenceCount: hiResult.criticalEvidence.length,
      highEvidenceCount: hiResult.highEvidence.length,
      burstStart: tbResult.burstStart,
      burstEnd: tbResult.burstEnd,
      evidenceIds: allEvidenceIds,
      connectionIds: allConnectionIds,
    };

    if (!AnomalyAlertRepository.existsByCaseAndType(caseData.id, 'combined')) {
      alerts.push(AnomalyAlertRepository.create(alertData));
    }
  }

  return alerts;
}

export const AnomalyAlertService = {
  getAllAlerts: (): AnomalyAlert[] => {
    return AnomalyAlertRepository.findAll();
  },

  getAlertById: (id: string): AnomalyAlert | null => {
    return AnomalyAlertRepository.findById(id);
  },

  getAlertsByCaseId: (caseId: string): AnomalyAlert[] => {
    return AnomalyAlertRepository.findByCaseId(caseId);
  },

  getPendingAlerts: (): AnomalyAlert[] => {
    return AnomalyAlertRepository.findPending();
  },

  updateAlert: (id: string, dto: UpdateAnomalyAlertDto): AnomalyAlert | null => {
    return AnomalyAlertRepository.update(id, dto);
  },

  deleteAlert: (id: string): boolean => {
    return AnomalyAlertRepository.delete(id);
  },

  runDetectionForCase: (caseId: string, config?: AnomalyDetectionConfig): AnomalyDetectionResult | null => {
    const caseData = CaseRepository.findById(caseId);
    if (!caseData) return null;

    const evidence = EvidenceRepository.findByCaseId(caseId);
    const connections = ConnectionRepository.findByCaseId(caseId);
    const mergedConfig = mergeConfig(config);

    AnomalyAlertRepository.deletePendingByCaseId(caseId);

    const alerts = detectCaseAnomalies(caseData, evidence, connections, mergedConfig);
    const caseAlerts = AnomalyAlertRepository.findByCaseId(caseId);

    const overallScore = caseAlerts.length > 0
      ? caseAlerts.reduce((sum, a) => sum + a.score, 0) / caseAlerts.length
      : 0;

    const priorityLevel = resolveSeverity(overallScore);

    const recommendations: string[] = [];
    const hasCombined = caseAlerts.some((a) => a.type === 'combined');
    const hasCritical = caseAlerts.some((a) => a.severity === 'critical');
    const hasHighImportance = caseAlerts.some((a) => a.type === 'high_importance');
    const hasDenseConnections = caseAlerts.some((a) => a.type === 'dense_connections');
    const hasTemporalBurst = caseAlerts.some((a) => a.type === 'temporal_burst');

    if (hasCombined || hasCritical) {
      recommendations.push('此案件具有多项高风险特征，建议立即列为优先核查对象。');
    }
    if (hasHighImportance) {
      recommendations.push('优先梳理和核查所有标记为 critical 和 high 的关键证据。');
    }
    if (hasDenseConnections) {
      recommendations.push('针对密集关联的证据簇进行整体分析，识别潜在的犯罪网络结构。');
    }
    if (hasTemporalBurst) {
      recommendations.push('重点关注集中爆发时间段内的事件序列，还原关键活动过程。');
    }
    if (recommendations.length === 0) {
      recommendations.push('暂无明显异常特征，按常规流程继续侦查。');
    }

    let summary = '';
    if (caseAlerts.length === 0) {
      summary = `案件「${caseData.name}」未检测到明显异常线索。`;
    } else {
      const severityText = priorityLevel === 'critical' ? '重大风险' : priorityLevel === 'high' ? '高风险' : '中等风险';
      summary = `案件「${caseData.name}」检测到 ${caseAlerts.length} 个异常预警（${severityText}），综合评分 ${(overallScore * 100).toFixed(0)}/100。`;
    }

    return {
      caseId,
      caseName: caseData.name,
      alerts: caseAlerts,
      overallScore,
      priorityLevel,
      summary,
      recommendations,
    };
  },

  runDetectionForAllCases: (config?: AnomalyDetectionConfig): AnomalyDetectionResult[] => {
    const cases = CaseRepository.findAll();
    const results: AnomalyDetectionResult[] = [];

    for (const caseData of cases) {
      const result = AnomalyAlertService.runDetectionForCase(caseData.id, config);
      if (result) results.push(result);
    }

    return results.sort((a, b) => b.overallScore - a.overallScore);
  },

  getPriorityCases: (config?: AnomalyDetectionConfig): AnomalyDetectionResult[] => {
    const results = AnomalyAlertService.runDetectionForAllCases(config);
    return results.filter((r) => r.overallScore >= 0.3 || r.alerts.length > 0);
  },
};
