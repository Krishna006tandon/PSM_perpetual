const BowTie = require('../models/BowTie');
const Scenario = require('../models/Scenario');

/**
 * Builds normalized BowTie metadata and barriers from a group of PHA Scenarios
 * belonging to the same consequence group.
 *
 * Mapping rules:
 *  - Immediate Consequence -> BowTie Top Event (center)
 *  - Cause                 -> Left side Threat/Cause
 *  - Ultimate Consequence  -> Right side Consequence
 *  - Preventive ('P')      -> Cause Barriers (Cause -> Immediate Consequence)
 *  - Mitigative ('M')      -> Consequence Barriers (Immediate Consequence -> Ultimate Consequence)
 */
function buildPhaBowtiePayload(groupScenarios, customEventName = '') {
  if (!groupScenarios || groupScenarios.length === 0) return null;

  const firstSc = groupScenarios[0];
  const immCons = (firstSc.consequencesImmediate || '').trim();
  const ultCons = (firstSc.consequencesUltimate || '').trim();
  const devAuto = (firstSc.deviationId?.deviationAuto || '').trim();
  const causeName = (firstSc.causeId?.description || '').trim() || firstSc.causeId?.categoryType || 'Identified Cause';

  const eventName = (customEventName && customEventName.trim())
    || immCons
    || ultCons
    || devAuto
    || 'Top Event';

  const ultimateConsName = ultCons || immCons || 'Ultimate Consequence';

  const node = firstSc.nodeId;
  let section = '';
  if (node) {
    if (node.nodeNumber && node.description) {
      section = `Node ${node.nodeNumber} - ${node.description}`;
    } else if (node.nodeNumber) {
      section = `Node ${node.nodeNumber}`;
    } else if (node.description) {
      section = node.description;
    }
  }

  const hazardParts = [];
  if (devAuto) hazardParts.push(`Deviation: ${devAuto}`);
  if (causeName) hazardParts.push(`Cause: ${causeName}`);
  if (ultCons) hazardParts.push(`Ultimate Consequence: ${ultCons}`);
  const hazardDescription = hazardParts.join(' | ');

  const riskRating = Number(firstSc.inherentRiskRR) || Number(firstSc.mitigatedRiskRR) || 0;

  // Deduplicate safeguards within the consequence group by safeguardGroupId (or scenario _id)
  const safeGroupMap = new Map();
  for (const sc of groupScenarios) {
    const safeKey = sc.safeguardGroupId || String(sc._id);
    if (!safeGroupMap.has(safeKey)) {
      safeGroupMap.set(safeKey, {
        safeKey,
        scenarioId: sc._id,
        presentProtection: (sc.presentProtection || '').trim(),
        safeguardType: sc.safeguardType || '',
        recommendations: [],
        inherentS: Number(sc.inherentRiskS) || 3,
        inherentL: Number(sc.inherentRiskL) || 2,
        inherentRR: Number(sc.inherentRiskRR) || 6,
        mitigatedS: Number(sc.mitigatedRiskS) || 2,
        mitigatedL: Number(sc.mitigatedRiskL) || 1,
        mitigatedRR: Number(sc.mitigatedRiskRR) || 2,
        residualS: Number(sc.residualRiskS) || 2,
        residualL: Number(sc.residualRiskL) || 1,
        residualRR: Number(sc.residualRiskRR) || 2
      });
    }
    const entry = safeGroupMap.get(safeKey);
    if (!entry.presentProtection && (sc.presentProtection || '').trim()) {
      entry.presentProtection = sc.presentProtection.trim();
    }
    if (!entry.safeguardType && sc.safeguardType) {
      entry.safeguardType = sc.safeguardType;
    }
    const recText = (sc.additionalProtection || '').trim();
    if (recText && !entry.recommendations.includes(recText)) {
      entry.recommendations.push(recText);
    }
  }

  const barriers = [];
  let unclassifiedSafeguardCount = 0;

  for (const entry of safeGroupMap.values()) {
    if (!entry.presentProtection) continue;

    if (entry.safeguardType !== 'P' && entry.safeguardType !== 'M') {
      unclassifiedSafeguardCount++;
      continue;
    }

    const isPreventive = entry.safeguardType === 'P';
    barriers.push({
      event_name: eventName,
      barrier_type: isPreventive ? 'cause' : 'consequence',
      threat_or_consequence_name: isPreventive ? causeName : ultimateConsName,
      pb: [entry.presentProtection],
      pb_tag_no: [],
      barrier_owner: [],
      escalation_factor: '',
      escalation_control: '',
      escalation_control_owner: '',
      available_new: 'Available',
      type: 'Engg',
      c: isPreventive ? entry.inherentS : entry.mitigatedS,
      p: isPreventive ? entry.inherentL : entry.mitigatedL,
      r: isPreventive ? entry.inherentRR : entry.mitigatedRR,
      recommendation: entry.recommendations.join(' | '),
      c_rec: isPreventive ? entry.mitigatedS : entry.residualS,
      p_rec: isPreventive ? entry.mitigatedL : entry.residualL,
      r_rec: isPreventive ? entry.mitigatedRR : entry.residualRR,
      phaScenarioId: entry.scenarioId,
      phaSafeguardKey: entry.safeKey
    });
  }

  return {
    scenarioId: firstSc._id,
    nodeId: firstSc.nodeId?._id || firstSc.nodeId || null,
    deviationId: firstSc.deviationId?._id || firstSc.deviationId || null,
    eventName,
    section,
    hazardDescription,
    riskRating,
    defaultThreatName: causeName,
    defaultConsequenceName: ultimateConsName,
    unclassifiedSafeguardCount,
    barriers
  };
}

/**
 * Synchronizes all BowTie records linked to PHA scenarios (`isBowtie: true`)
 * for a given study while preserving manual BowTie enrichments and standalone BowTies.
 */
async function syncBowTiesFromPHA(studyId) {
  if (!studyId) return;

  const flaggedScenarios = await Scenario.find({ studyId, isBowtie: true })
    .populate('nodeId', 'nodeNumber description')
    .populate('deviationId', 'deviationAuto parameter')
    .populate('causeId', 'description categoryType')
    .sort({ order: 1, createdAt: 1 });

  // Group scenarios by consequenceGroupId (fallback to scenario _id for ungrouped rows)
  const groupMap = new Map();
  for (const sc of flaggedScenarios) {
    const groupKey = sc.consequenceGroupId && String(sc.consequenceGroupId).trim() !== ''
      ? String(sc.consequenceGroupId)
      : String(sc._id);
    if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
    groupMap.get(groupKey).push(sc);
  }

  const existingPhaBowties = await BowTie.find({ studyId, isFromPha: true });
  const matchedBowtieIds = new Set();

  for (const [groupKey, groupScenarios] of groupMap.entries()) {
    const payload = buildPhaBowtiePayload(groupScenarios);
    if (!payload) continue;

    const scenarioIdSet = new Set(groupScenarios.map(s => String(s._id)));

    // Find matching existing BowTie by consequenceGroupId or by scenarioId
    const existing = existingPhaBowties.find(bt =>
      !matchedBowtieIds.has(String(bt._id)) && (
        (bt.consequenceGroupId && bt.consequenceGroupId === groupKey) ||
        (bt.scenarioId && scenarioIdSet.has(String(bt.scenarioId)))
      )
    );

    if (existing) {
      matchedBowtieIds.add(String(existing._id));

      // Preserve BowTie-side enrichments on matched PHA barriers and keep any manual barriers
      const existingBarriers = existing.barriers || [];
      const manualBarriers = existingBarriers.filter(b => !b.phaSafeguardKey && !b.phaScenarioId);

      const mergedPhaBarriers = payload.barriers.map(pbItem => {
        const match = existingBarriers.find(b =>
          (b.phaSafeguardKey && b.phaSafeguardKey === pbItem.phaSafeguardKey) ||
          (b.phaScenarioId && String(b.phaScenarioId) === String(pbItem.phaScenarioId))
        );
        if (!match) return pbItem;

        const baseObj = match.toObject ? match.toObject() : { ...match };
        return {
          ...baseObj,
          event_name: payload.eventName,
          barrier_type: pbItem.barrier_type,
          threat_or_consequence_name: pbItem.threat_or_consequence_name,
          pb: pbItem.pb,
          recommendation: pbItem.recommendation || baseObj.recommendation || '',
          phaScenarioId: pbItem.phaScenarioId,
          phaSafeguardKey: pbItem.phaSafeguardKey
        };
      });

      existing.scenarioId = payload.scenarioId;
      existing.nodeId = payload.nodeId;
      existing.deviationId = payload.deviationId;
      existing.consequenceGroupId = groupKey;
      existing.isFromPha = true;
      existing.eventName = payload.eventName;
      existing.section = payload.section;
      existing.hazardDescription = payload.hazardDescription;
      existing.riskRating = payload.riskRating;
      existing.defaultThreatName = payload.defaultThreatName;
      existing.defaultConsequenceName = payload.defaultConsequenceName;
      existing.unclassifiedSafeguardCount = payload.unclassifiedSafeguardCount;
      existing.barriers = [...mergedPhaBarriers, ...manualBarriers];

      await existing.save();
    } else {
      const created = new BowTie({
        studyId,
        scenarioId: payload.scenarioId,
        nodeId: payload.nodeId,
        deviationId: payload.deviationId,
        consequenceGroupId: groupKey,
        isFromPha: true,
        eventName: payload.eventName,
        section: payload.section,
        hazardDescription: payload.hazardDescription,
        riskRating: payload.riskRating,
        defaultThreatName: payload.defaultThreatName,
        defaultConsequenceName: payload.defaultConsequenceName,
        unclassifiedSafeguardCount: payload.unclassifiedSafeguardCount,
        barriers: payload.barriers
      });
      await created.save();
      matchedBowtieIds.add(String(created._id));
    }
  }

  // Remove any PHA-linked BowTies whose scenarios were unticked from BowTie
  const staleIds = existingPhaBowties
    .filter(bt => !matchedBowtieIds.has(String(bt._id)))
    .map(bt => bt._id);

  if (staleIds.length > 0) {
    await BowTie.deleteMany({ _id: { $in: staleIds } });
  }
}

module.exports = {
  buildPhaBowtiePayload,
  syncBowTiesFromPHA
};
