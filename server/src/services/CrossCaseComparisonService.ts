import { v4 as uuidv4 } from 'uuid';
import { EvidenceRepository } from '../repositories/EvidenceRepository.js';
import { ConnectionRepository } from '../repositories/ConnectionRepository.js';
import { CaseRepository } from '../repositories/CaseRepository.js';
import { EvidenceCollectionRepository } from '../repositories/EvidenceCollectionRepository.js';
import type {
  Evidence,
  Connection,
  CrossCaseComparisonConfig,
  CrossCaseComparisonResult,
  CrossCaseEvidenceRef,
  DuplicateEvidenceGroup,
  SharedSourceGroup,
  SimilarStructureGroup,
  CrimeChainLink,
  CrossCaseMatchConfidence,
} from '@shared/types';

const DEFAULT_CONFIG: Required<Omit<CrossCaseComparisonConfig, 'caseIds'>> = {
  minSimilarityScore: 0.3,
  includeDuplicateEvidence: true,
  includeSharedSource: true,
  includeSimilarStructure: true,
  includeCrimeChain: true,
  contentSimilarityThreshold: 0.4,
  tagOverlapThreshold: 0.3,
  structureOverlapThreshold: 0.3,
};

function computeJaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;
  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

function computeContentSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  const setA = new Set(na.split(''));
  const setB = new Set(nb.split(''));
  return computeJaccardSimilarity(setA, setB);
}

function computeNgramSimilarity(a: string, b: string, n: number = 3): number {
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.length < n || nb.length < n) return computeContentSimilarity(a, b);

  const ngrams = (s: string) => {
    const result = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      result.add(s.slice(i, i + n));
    }
    return result;
  };

  return computeJaccardSimilarity(ngrams(na), ngrams(nb));
}

function toConfidence(score: number): CrossCaseMatchConfidence {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function makeEvidenceRef(ev: Evidence, caseName: string): CrossCaseEvidenceRef {
  return {
    caseId: ev.caseId,
    caseName,
    evidenceId: ev.id,
    evidenceContent: ev.content.length > 80 ? ev.content.slice(0, 80) + '...' : ev.content,
    evidenceSource: ev.source,
    evidenceImportance: ev.importance,
    evidenceTags: ev.tags || [],
    evidenceTimestamp: ev.timestamp || ev.createdAt,
  };
}

export const CrossCaseComparisonService = {
  compare: (config?: CrossCaseComparisonConfig): CrossCaseComparisonResult => {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const allCases = CaseRepository.findAll();
    const targetCases = cfg.caseIds
      ? allCases.filter((c) => cfg.caseIds!.includes(c.id))
      : allCases;

    if (targetCases.length < 2) {
      return {
        totalCasesCompared: targetCases.length,
        caseIds: targetCases.map((c) => c.id),
        duplicateEvidenceGroups: [],
        sharedSourceGroups: [],
        similarStructureGroups: [],
        crimeChainLinks: [],
        overallScore: 0,
        summary: '至少需要2个案件才能进行跨案件比对',
        recommendations: [],
        comparedAt: new Date().toISOString(),
      };
    }

    const caseNameMap = new Map<string, string>();
    targetCases.forEach((c) => caseNameMap.set(c.id, c.name));

    const caseEvidenceMap = new Map<string, Evidence[]>();
    const caseConnectionsMap = new Map<string, Connection[]>();
    targetCases.forEach((c) => {
      caseEvidenceMap.set(c.id, EvidenceRepository.findByCaseId(c.id));
      caseConnectionsMap.set(c.id, ConnectionRepository.findByCaseId(c.id));
    });

    const collectionItems = targetCases.flatMap((c) => EvidenceCollectionRepository.findByCaseId(c.id));

    const duplicateEvidenceGroups: DuplicateEvidenceGroup[] = [];
    const sharedSourceGroups: SharedSourceGroup[] = [];
    const similarStructureGroups: SimilarStructureGroup[] = [];
    const crimeChainLinks: CrimeChainLink[] = [];

    if (cfg.includeDuplicateEvidence) {
      duplicateEvidenceGroups.push(
        ...CrossCaseComparisonService.findDuplicateEvidence(
          targetCases.map((c) => c.id),
          caseEvidenceMap,
          caseNameMap,
          cfg.contentSimilarityThreshold,
          cfg.tagOverlapThreshold,
          cfg.minSimilarityScore,
        ),
      );
    }

    if (cfg.includeSharedSource) {
      sharedSourceGroups.push(
        ...CrossCaseComparisonService.findSharedSources(
          targetCases.map((c) => c.id),
          caseEvidenceMap,
          caseNameMap,
          collectionItems,
          cfg.minSimilarityScore,
        ),
      );
    }

    if (cfg.includeSimilarStructure) {
      similarStructureGroups.push(
        ...CrossCaseComparisonService.findSimilarStructures(
          targetCases.map((c) => c.id),
          caseEvidenceMap,
          caseConnectionsMap,
          caseNameMap,
          cfg.structureOverlapThreshold,
          cfg.minSimilarityScore,
        ),
      );
    }

    if (cfg.includeCrimeChain) {
      crimeChainLinks.push(
        ...CrossCaseComparisonService.findCrimeChains(
          targetCases.map((c) => c.id),
          duplicateEvidenceGroups,
          sharedSourceGroups,
          similarStructureGroups,
          caseNameMap,
        ),
      );
    }

    const totalMatches =
      duplicateEvidenceGroups.length +
      sharedSourceGroups.length +
      similarStructureGroups.length +
      crimeChainLinks.length;

    const allScores = [
      ...duplicateEvidenceGroups.map((g) => g.score),
      ...sharedSourceGroups.map((g) => g.score),
      ...similarStructureGroups.map((g) => g.score),
      ...crimeChainLinks.map((g) => g.score),
    ];
    const overallScore = allScores.length > 0
      ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
      : 0;

    const summary = CrossCaseComparisonService.generateSummary(
      targetCases.length,
      totalMatches,
      duplicateEvidenceGroups.length,
      sharedSourceGroups.length,
      similarStructureGroups.length,
      crimeChainLinks.length,
      overallScore,
    );

    const recommendations = CrossCaseComparisonService.generateRecommendations(
      duplicateEvidenceGroups,
      sharedSourceGroups,
      similarStructureGroups,
      crimeChainLinks,
    );

    return {
      totalCasesCompared: targetCases.length,
      caseIds: targetCases.map((c) => c.id),
      duplicateEvidenceGroups,
      sharedSourceGroups,
      similarStructureGroups,
      crimeChainLinks,
      overallScore,
      summary,
      recommendations,
      comparedAt: new Date().toISOString(),
    };
  },

  findDuplicateEvidence: (
    caseIds: string[],
    caseEvidenceMap: Map<string, Evidence[]>,
    caseNameMap: Map<string, string>,
    contentThreshold: number,
    tagThreshold: number,
    minScore: number,
  ): DuplicateEvidenceGroup[] => {
    const groups: DuplicateEvidenceGroup[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < caseIds.length; i++) {
      for (let j = i + 1; j < caseIds.length; j++) {
        const evidenceA = caseEvidenceMap.get(caseIds[i]) || [];
        const evidenceB = caseEvidenceMap.get(caseIds[j]) || [];

        for (const evA of evidenceA) {
          for (const evB of evidenceB) {
            const pairKey = [evA.id, evB.id].sort().join('|');
            if (processed.has(pairKey)) continue;
            processed.add(pairKey);

            const contentSim = computeNgramSimilarity(evA.content, evB.content);
            const tagSim = computeJaccardSimilarity(
              new Set(evA.tags || []),
              new Set(evB.tags || []),
            );
            const sourceSim = evA.source === evB.source && evA.source !== 'unknown' ? 1 : 0;

            const similarityFields: string[] = [];
            const scores: number[] = [];

            if (contentSim >= contentThreshold) {
              similarityFields.push('content');
              scores.push(contentSim);
            }
            if (tagSim >= tagThreshold && (evA.tags || []).length > 0) {
              similarityFields.push('tags');
              scores.push(tagSim);
            }
            if (sourceSim > 0) {
              similarityFields.push('source');
              scores.push(sourceSim);
            }

            if (similarityFields.length === 0) continue;

            const score = scores.reduce((sum, s) => sum + s, 0) / scores.length;
            if (score < minScore) continue;

            const nameA = caseNameMap.get(caseIds[i]) || caseIds[i];
            const nameB = caseNameMap.get(caseIds[j]) || caseIds[j];

            groups.push({
              id: uuidv4(),
              matchType: 'duplicate_evidence',
              confidence: toConfidence(score),
              score: Math.round(score * 100) / 100,
              description: `案件"${nameA}"与"${nameB}"发现相似证据（${similarityFields.join('、')}相似）`,
              evidenceRefs: [
                makeEvidenceRef(evA, nameA),
                makeEvidenceRef(evB, nameB),
              ],
              similarityFields,
            });
          }
        }
      }
    }

    return groups.sort((a, b) => b.score - a.score);
  },

  findSharedSources: (
    caseIds: string[],
    caseEvidenceMap: Map<string, Evidence[]>,
    caseNameMap: Map<string, string>,
    collectionItems: Array<{ caseId: string; contentHash: string; sourceUrl?: string; id: string }>,
    minScore: number,
  ): SharedSourceGroup[] => {
    const groups: SharedSourceGroup[] = [];

    const sourceGroups = new Map<string, CrossCaseEvidenceRef[]>();
    const sourceTypeMap = new Map<string, 'content_hash' | 'source_name' | 'source_url'>();

    for (let i = 0; i < caseIds.length; i++) {
      for (let j = i + 1; j < caseIds.length; j++) {
        const evidenceA = caseEvidenceMap.get(caseIds[i]) || [];
        const evidenceB = caseEvidenceMap.get(caseIds[j]) || [];
        const nameA = caseNameMap.get(caseIds[i]) || caseIds[i];
        const nameB = caseNameMap.get(caseIds[j]) || caseIds[j];

        const sourceMapA = new Map<string, Evidence[]>();
        evidenceA.forEach((ev) => {
          if (ev.source && ev.source !== 'unknown') {
            const arr = sourceMapA.get(ev.source) || [];
            arr.push(ev);
            sourceMapA.set(ev.source, arr);
          }
        });

        for (const evB of evidenceB) {
          if (!evB.source || evB.source === 'unknown') continue;
          const matchingA = sourceMapA.get(evB.source);
          if (!matchingA) continue;

          for (const evA of matchingA) {
            const key = `source_name:${evB.source}`;
            if (!sourceGroups.has(key)) {
              sourceGroups.set(key, []);
              sourceTypeMap.set(key, 'source_name');
            }
            const refs = sourceGroups.get(key)!;
            const alreadyHasA = refs.some((r) => r.evidenceId === evA.id);
            const alreadyHasB = refs.some((r) => r.evidenceId === evB.id);
            if (!alreadyHasA) refs.push(makeEvidenceRef(evA, nameA));
            if (!alreadyHasB) refs.push(makeEvidenceRef(evB, nameB));
          }
        }
      }
    }

    const caseIdSet = new Set(caseIds);
    const hashGroups = new Map<string, Array<{ caseId: string; caseName: string; item: typeof collectionItems[0] }>>();
    for (const item of collectionItems) {
      if (!caseIdSet.has(item.caseId)) continue;
      if (!item.contentHash) continue;
      const arr = hashGroups.get(item.contentHash) || [];
      arr.push({ caseId: item.caseId, caseName: caseNameMap.get(item.caseId) || item.caseId, item });
      hashGroups.set(item.contentHash, arr);
    }

    for (const [hash, items] of hashGroups) {
      if (items.length < 2) continue;
      const caseIdsInGroup = new Set(items.map((it) => it.caseId));
      if (caseIdsInGroup.size < 2) continue;

      const key = `content_hash:${hash}`;
      sourceGroups.set(key, []);
      sourceTypeMap.set(key, 'content_hash');
      const refs = sourceGroups.get(key)!;

      for (const { caseId, caseName, item } of items) {
        const evOfCase = caseEvidenceMap.get(caseId) || [];
        const linkedEvidence = evOfCase.find((ev) => ev.source === item.sourceUrl || ev.source === item.id);
        if (linkedEvidence) {
          const alreadyExists = refs.some((r) => r.evidenceId === linkedEvidence.id);
          if (!alreadyExists) refs.push(makeEvidenceRef(linkedEvidence, caseName));
        }
      }

      if (refs.length < 2) {
        sourceGroups.delete(key);
        sourceTypeMap.delete(key);
      }
    }

    for (const [key, refs] of sourceGroups) {
      const caseIdsInRefs = new Set(refs.map((r) => r.caseId));
      if (caseIdsInRefs.size < 2) continue;

      const sourceType = sourceTypeMap.get(key) || 'source_name';
      const sourceIdentifier = key.includes(':') ? key.split(':').slice(1).join(':') : key;
      const score = Math.min(1, refs.length * 0.25 + caseIdsInRefs.size * 0.2);

      if (score < minScore) continue;

      const caseNames = Array.from(caseIdsInRefs)
        .map((cid) => caseNameMap.get(cid) || cid)
        .join('、');

      groups.push({
        id: uuidv4(),
        matchType: 'shared_source',
        confidence: toConfidence(score),
        score: Math.round(score * 100) / 100,
        description: `案件${caseNames}共用相同来源: ${sourceIdentifier.length > 40 ? sourceIdentifier.slice(0, 40) + '...' : sourceIdentifier}`,
        sourceIdentifier,
        sourceType,
        evidenceRefs: refs,
      });
    }

    return groups.sort((a, b) => b.score - a.score);
  },

  findSimilarStructures: (
    caseIds: string[],
    caseEvidenceMap: Map<string, Evidence[]>,
    caseConnectionsMap: Map<string, Connection[]>,
    caseNameMap: Map<string, string>,
    structureThreshold: number,
    minScore: number,
  ): SimilarStructureGroup[] => {
    const groups: SimilarStructureGroup[] = [];

    for (let i = 0; i < caseIds.length; i++) {
      for (let j = i + 1; j < caseIds.length; j++) {
        const caseIdA = caseIds[i];
        const caseIdB = caseIds[j];
        const connectionsA = caseConnectionsMap.get(caseIdA) || [];
        const connectionsB = caseConnectionsMap.get(caseIdB) || [];

        if (connectionsA.length === 0 || connectionsB.length === 0) continue;

        const labelsA = new Set(connectionsA.map((c) => c.label || '关联'));
        const labelsB = new Set(connectionsB.map((c) => c.label || '关联'));
        const labelOverlap = computeJaccardSimilarity(labelsA, labelsB);

        const importanceA = caseEvidenceMap.get(caseIdA) || [];
        const importanceB = caseEvidenceMap.get(caseIdB) || [];
        const importanceDistA = new Map<string, number>();
        const importanceDistB = new Map<string, number>();
        importanceA.forEach((ev) => {
          importanceDistA.set(ev.importance, (importanceDistA.get(ev.importance) || 0) + 1);
        });
        importanceB.forEach((ev) => {
          importanceDistB.set(ev.importance, (importanceDistB.get(ev.importance) || 0) + 1);
        });
        const allImportanceKeys = new Set([...importanceDistA.keys(), ...importanceDistB.keys()]);
        let importanceSim = 0;
        for (const key of allImportanceKeys) {
          const valA = (importanceDistA.get(key) || 0) / Math.max(1, importanceA.length);
          const valB = (importanceDistB.get(key) || 0) / Math.max(1, importanceB.length);
          importanceSim += Math.min(valA, valB);
        }

        const structureScore = labelOverlap * 0.6 + importanceSim * 0.4;
        if (structureScore < structureThreshold || structureScore < minScore) continue;

        const overlapRatio = Math.round(labelOverlap * 100) / 100;
        const nameA = caseNameMap.get(caseIdA) || caseIdA;
        const nameB = caseNameMap.get(caseIdB) || caseIdB;

        const highImportanceA = importanceA.filter((ev) => ev.importance === 'high' || ev.importance === 'critical');
        const highImportanceB = importanceB.filter((ev) => ev.importance === 'high' || ev.importance === 'critical');
        const evidenceRefs = [
          ...highImportanceA.slice(0, 2).map((ev) => makeEvidenceRef(ev, nameA)),
          ...highImportanceB.slice(0, 2).map((ev) => makeEvidenceRef(ev, nameB)),
        ];

        groups.push({
          id: uuidv4(),
          matchType: 'similar_structure',
          confidence: toConfidence(structureScore),
          score: Math.round(structureScore * 100) / 100,
          description: `案件"${nameA}"与"${nameB}"的关系结构相似（标签重叠率${Math.round(overlapRatio * 100)}%）`,
          caseIdA,
          caseNameA: nameA,
          caseIdB,
          caseNameB: nameB,
          connectionLabelsA: Array.from(labelsA),
          connectionLabelsB: Array.from(labelsB),
          overlapRatio,
          evidenceRefs,
        });
      }
    }

    return groups.sort((a, b) => b.score - a.score);
  },

  findCrimeChains: (
    caseIds: string[],
    duplicateGroups: DuplicateEvidenceGroup[],
    sharedSourceGroups: SharedSourceGroup[],
    similarStructureGroups: SimilarStructureGroup[],
    caseNameMap: Map<string, string>,
  ): CrimeChainLink[] => {
    const links: CrimeChainLink[] = [];
    const caseConnections = new Map<string, Set<string>>();

    for (const group of duplicateGroups) {
      const caseIdsInGroup = new Set(group.evidenceRefs.map((r) => r.caseId));
      for (const cid of caseIdsInGroup) {
        for (const cid2 of caseIdsInGroup) {
          if (cid !== cid2) {
            const set = caseConnections.get(cid) || new Set<string>();
            set.add(cid2);
            caseConnections.set(cid, set);
          }
        }
      }
    }

    for (const group of sharedSourceGroups) {
      const caseIdsInGroup = new Set(group.evidenceRefs.map((r) => r.caseId));
      for (const cid of caseIdsInGroup) {
        for (const cid2 of caseIdsInGroup) {
          if (cid !== cid2) {
            const set = caseConnections.get(cid) || new Set<string>();
            set.add(cid2);
            caseConnections.set(cid, set);
          }
        }
      }
    }

    for (const group of similarStructureGroups) {
      const setA = caseConnections.get(group.caseIdA) || new Set<string>();
      setA.add(group.caseIdB);
      caseConnections.set(group.caseIdA, setA);

      const setB = caseConnections.get(group.caseIdB) || new Set<string>();
      setB.add(group.caseIdA);
      caseConnections.set(group.caseIdB, setB);
    }

    const visited = new Set<string>();
    const clusters: string[][] = [];

    const dfs = (node: string, cluster: string[]) => {
      if (visited.has(node)) return;
      visited.add(node);
      cluster.push(node);
      const neighbors = caseConnections.get(node) || new Set<string>();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, cluster);
        }
      }
    };

    for (const cid of caseIds) {
      if (!visited.has(cid) && caseConnections.has(cid)) {
        const cluster: string[] = [];
        dfs(cid, cluster);
        if (cluster.length >= 2) {
          clusters.push(cluster);
        }
      }
    }

    for (const cluster of clusters) {
      const linkedCases = cluster.map((cid) => ({
        caseId: cid,
        caseName: caseNameMap.get(cid) || cid,
        role: '',
      }));

      const duplicateCount = duplicateGroups.filter((g) =>
        g.evidenceRefs.some((r) => cluster.includes(r.caseId)) &&
        new Set(g.evidenceRefs.map((r) => r.caseId)).size > 1,
      ).length;

      const sharedSourceCount = sharedSourceGroups.filter((g) =>
        g.evidenceRefs.some((r) => cluster.includes(r.caseId)) &&
        new Set(g.evidenceRefs.map((r) => r.caseId)).size > 1,
      ).length;

      const structureCount = similarStructureGroups.filter((g) =>
        cluster.includes(g.caseIdA) && cluster.includes(g.caseIdB),
      ).length;

      const evidenceFactor = Math.min(1, duplicateCount * 0.3);
      const sourceFactor = Math.min(1, sharedSourceCount * 0.25);
      const structureFactor = Math.min(1, structureCount * 0.2);
      const clusterFactor = Math.min(1, cluster.length * 0.15);
      const score = Math.min(1, evidenceFactor + sourceFactor + structureFactor + clusterFactor);

      if (score < 0.3) continue;

      const patterns: string[] = [];
      if (duplicateCount > 0) patterns.push('重复证据');
      if (sharedSourceCount > 0) patterns.push('共用来源');
      if (structureCount > 0) patterns.push('相似结构');
      if (cluster.length >= 3) patterns.push('多案关联');

      const allEvidenceRefs: CrossCaseEvidenceRef[] = [];
      for (const g of duplicateGroups) {
        if (g.evidenceRefs.some((r) => cluster.includes(r.caseId))) {
          for (const ref of g.evidenceRefs) {
            if (!allEvidenceRefs.some((er) => er.evidenceId === ref.evidenceId)) {
              allEvidenceRefs.push(ref);
            }
          }
        }
      }
      for (const g of sharedSourceGroups) {
        if (g.evidenceRefs.some((r) => cluster.includes(r.caseId))) {
          for (const ref of g.evidenceRefs) {
            if (!allEvidenceRefs.some((er) => er.evidenceId === ref.evidenceId)) {
              allEvidenceRefs.push(ref);
            }
          }
        }
      }

      const caseNames = cluster.map((cid) => caseNameMap.get(cid) || cid).join('、');
      const description = `检测到${caseNames}之间存在团伙化作案链路特征（${patterns.join('、')}），建议并案侦查。`;

      for (const lc of linkedCases) {
        if (duplicateCount > 0 && sharedSourceCount > 0) lc.role = '核心关联';
        else if (duplicateCount > 0) lc.role = '证据重合';
        else if (sharedSourceCount > 0) lc.role = '来源共享';
        else lc.role = '结构相似';
      }

      links.push({
        id: uuidv4(),
        matchType: 'crime_chain',
        confidence: toConfidence(score),
        score: Math.round(score * 100) / 100,
        description,
        linkedCases,
        evidenceRefs: allEvidenceRefs.slice(0, 10),
        chainPattern: patterns.join('→'),
      });
    }

    return links.sort((a, b) => b.score - a.score);
  },

  generateSummary: (
    caseCount: number,
    totalMatches: number,
    dupCount: number,
    srcCount: number,
    structCount: number,
    chainCount: number,
    overallScore: number,
  ): string => {
    const parts: string[] = [`对${caseCount}个案件进行了跨案件线索比对`];
    if (totalMatches === 0) {
      parts.push('，未发现跨案件关联线索');
    } else {
      parts.push(`，共发现${totalMatches}条跨案件关联`);
      const details: string[] = [];
      if (dupCount > 0) details.push(`${dupCount}组重复证据`);
      if (srcCount > 0) details.push(`${srcCount}组共用来源`);
      if (structCount > 0) details.push(`${structCount}组相似结构`);
      if (chainCount > 0) details.push(`${chainCount}条作案链路`);
      if (details.length > 0) parts.push(`（${details.join('、')}）`);
    }
    if (overallScore >= 0.7) {
      parts.push('。关联程度较高，强烈建议并案侦查');
    } else if (overallScore >= 0.4) {
      parts.push('。存在一定关联，建议进一步调查');
    } else if (totalMatches > 0) {
      parts.push('。关联程度较低，可做参考');
    }
    return parts.join('');
  },

  generateRecommendations: (
    duplicateGroups: DuplicateEvidenceGroup[],
    sharedSourceGroups: SharedSourceGroup[],
    similarStructureGroups: SimilarStructureGroup[],
    chainLinks: CrimeChainLink[],
  ): string[] => {
    const recs: string[] = [];

    if (chainLinks.length > 0) {
      const highConfChains = chainLinks.filter((l) => l.confidence === 'high');
      if (highConfChains.length > 0) {
        recs.push(`发现${highConfChains.length}条高置信度团伙化链路，强烈建议启动并案侦查程序`);
      }
      if (chainLinks.length > highConfChains.length) {
        recs.push(`另有${chainLinks.length - highConfChains.length}条潜在作案链路待核实`);
      }
    }

    if (duplicateGroups.length > 0) {
      const highConfDup = duplicateGroups.filter((g) => g.confidence === 'high');
      if (highConfDup.length > 0) {
        recs.push(`${highConfDup.length}组高相似度重复证据可能指向同一作案主体，建议交叉讯问`);
      }
    }

    if (sharedSourceGroups.length > 0) {
      const hashSources = sharedSourceGroups.filter((g) => g.sourceType === 'content_hash');
      const nameSources = sharedSourceGroups.filter((g) => g.sourceType === 'source_name');
      if (hashSources.length > 0) {
        recs.push(`${hashSources.length}组内容哈希匹配表明跨案件证据来自同一数字来源，建议溯源追踪`);
      }
      if (nameSources.length > 0) {
        recs.push(`${nameSources.length}组同名来源线索可用于追踪嫌疑人的跨案件活动`);
      }
    }

    if (similarStructureGroups.length > 0) {
      recs.push(`${similarStructureGroups.length}组相似关系结构表明案件可能使用相同作案手法，建议制作作案手法对比表`);
    }

    if (recs.length === 0) {
      recs.push('暂未发现明显跨案件关联，可继续收集证据后再行比对');
    }

    return recs;
  },
};
