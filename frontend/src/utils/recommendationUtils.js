/**
 * recommendationUtils.js
 * Unified sorting and recommendation numbering logic across PHA Worksheet,
 * Recommendation Registry, Reports, and Exports.
 */

export const normalizeRecText = (txt) => {
  return (txt || '').trim().toLowerCase().replace(/\s+/g, ' ');
};

/**
 * Sorts scenarios across all nodes of a study in the exact visual sequence
 * as seen on the PHA Worksheet:
 * 1. Node sequence (node.order or nodes array index)
 * 2. Within each node:
 *    a. Deviation sequence (first appearance index in node's scenarios)
 *    b. Cause sequence (first appearance index in deviation's scenarios)
 *    c. Consequence group sequence (first appearance index)
 *    d. Scenario row order (s.order)
 *    e. Tie-breaker (_id)
 */
export const sortStudyScenarios = (scenarios = [], nodes = []) => {
  if (!scenarios || scenarios.length === 0) return [];

  // Build node order map
  const nodeOrderMap = new Map();
  (nodes || []).forEach((n, idx) => {
    const id = String(n._id || n);
    nodeOrderMap.set(id, typeof n.order === 'number' ? n.order : idx);
  });

  // Group scenarios by node
  const scenariosByNode = new Map();
  scenarios.forEach((s) => {
    const nId = s.nodeId?._id ? String(s.nodeId._id) : (s.nodeId ? String(s.nodeId) : 'unassigned');
    if (!scenariosByNode.has(nId)) {
      scenariosByNode.set(nId, []);
    }
    scenariosByNode.get(nId).push(s);
  });

  // Sort node IDs based on nodeOrderMap
  const sortedNodeIds = Array.from(scenariosByNode.keys()).sort((a, b) => {
    const oA = nodeOrderMap.has(a) ? nodeOrderMap.get(a) : 9999;
    const oB = nodeOrderMap.has(b) ? nodeOrderMap.get(b) : 9999;
    return oA - oB;
  });

  const fullySorted = [];

  sortedNodeIds.forEach((nId) => {
    const nodeScs = scenariosByNode.get(nId) || [];
    
    const getConsKey = (s) => s.consequenceGroupId || s._id;

    // Track first appearance index of deviation, cause, consequence within this node
    const devFirstIndex = new Map();
    const causeFirstIndex = new Map();
    const consFirstIndex = new Map();

    nodeScs.forEach((s, idx) => {
      const dId = s.deviationId?._id ? String(s.deviationId._id) : (s.deviationId ? String(s.deviationId) : '');
      const cId = s.causeId?._id ? String(s.causeId._id) : (s.causeId ? String(s.causeId) : '');
      const ck = `${dId}_${cId}`;
      const consK = `${ck}_${getConsKey(s)}`;

      if (!devFirstIndex.has(dId)) devFirstIndex.set(dId, idx);
      if (!causeFirstIndex.has(ck)) causeFirstIndex.set(ck, idx);
      if (!consFirstIndex.has(consK)) consFirstIndex.set(consK, idx);
    });

    const sortedNodeScs = [...nodeScs].sort((a, b) => {
      const devA = a.deviationId?._id ? String(a.deviationId._id) : (a.deviationId ? String(a.deviationId) : '');
      const devB = b.deviationId?._id ? String(b.deviationId._id) : (b.deviationId ? String(b.deviationId) : '');
      const devDiff = (devFirstIndex.get(devA) ?? 0) - (devFirstIndex.get(devB) ?? 0);
      if (devDiff !== 0) return devDiff;

      const causeA = a.causeId?._id ? String(a.causeId._id) : (a.causeId ? String(a.causeId) : '');
      const causeB = b.causeId?._id ? String(b.causeId._id) : (b.causeId ? String(b.causeId) : '');
      const ckA = `${devA}_${causeA}`;
      const ckB = `${devB}_${causeB}`;
      const causeDiff = (causeFirstIndex.get(ckA) ?? 0) - (causeFirstIndex.get(ckB) ?? 0);
      if (causeDiff !== 0) return causeDiff;

      const consKA = `${ckA}_${getConsKey(a)}`;
      const consKB = `${ckB}_${getConsKey(b)}`;
      const consDiff = (consFirstIndex.get(consKA) ?? 0) - (consFirstIndex.get(consKB) ?? 0);
      if (consDiff !== 0) return consDiff;

      const orderA = typeof a.order === 'number' ? a.order : 0;
      const orderB = typeof b.order === 'number' ? b.order : 0;
      if (orderA !== orderB) return orderA - orderB;

      const idA = String(a._id || '');
      const idB = String(b._id || '');
      return idA.localeCompare(idB);
    });

    fullySorted.push(...sortedNodeScs);
  });

  return fullySorted;
};

/**
 * Builds a deterministic recommendation registry and lookup map:
 * - Iterates through scenarios already sorted by `sortStudyScenarios`
 * - Groups duplicate recommendations to the same R-number
 * - Sequentially numbers unique recommendations as R1, R2, R3...
 * - Returns maps and unique items guaranteed to be in identical order
 */
export const buildStudyRecommendationRegistry = (sortedScenarios = []) => {
  const studyRecMap = new Map(); // normalizedText -> 'R1'
  const recNumberMap = {}; // scenarioId -> 'R1'
  const uniqueRecommendations = [];
  const seenMap = new Map();
  let counter = 1;

  sortedScenarios.forEach((sc) => {
    const text = (sc.additionalProtection || '').trim();
    if (!text) return;

    const key = normalizeRecText(text);

    if (!seenMap.has(key)) {
      const recNo = `R${counter++}`;
      studyRecMap.set(key, recNo);
      recNumberMap[sc._id] = recNo;

      const item = {
        ...sc,
        displayRecNo: recNo,
        key,
        occurrences: [sc],
        nodeNames: [sc.nodeId?.description || 'General Node']
      };
      seenMap.set(key, item);
      uniqueRecommendations.push(item);
    } else {
      const existing = seenMap.get(key);
      existing.occurrences.push(sc);
      const nodeDesc = sc.nodeId?.description || 'General Node';
      if (!existing.nodeNames.includes(nodeDesc)) {
        existing.nodeNames.push(nodeDesc);
      }
      recNumberMap[sc._id] = existing.displayRecNo;
    }
  });

  return {
    studyRecMap,
    recNumberMap,
    uniqueRecommendations,
    nextRecNo: `R${counter}`
  };
};
