// Universal Utility for managing PHA to LOPA field mappings and dynamic transformations

export const DEFAULT_LOPA_MAPPING = {
  scenarioSource: 'consequencesImmediate',
  scenarioLabel: 'Scenario',
  initiatingEventSource: 'causeDescription',
  initiatingEventLabel: 'Initiating Event',
  iplSource: 'presentProtection',
  iplLabel: 'Independent Protection Layer (IPL)',
  severitySource: 'inherentRiskS',
  transferRecommendations: true
};

// Universal list of all PHA fields grouped logically so ANY PHA field can be mapped to ANY LOPA column
export const UNIVERSAL_PHA_FIELD_GROUPS = [
  {
    group: 'Consequence Fields',
    options: [
      { id: 'consequencesImmediate', label: 'Consequence (Immediate)' },
      { id: 'consequencesUltimate', label: 'Consequence (Ultimate)' },
      { id: 'bothConsequences', label: 'Both Consequences (Immediate + Ultimate)' },
      { id: 'consequenceCategory', label: 'Consequence Category' },
      { id: 'categoryAndImmediate', label: 'Category + Immediate Consequence' }
    ]
  },
  {
    group: 'Cause Fields',
    options: [
      { id: 'causeDescription', label: 'Cause Description' },
      { id: 'causeAndEquipment', label: 'Cause + Equipment / Instrument Tag' }
    ]
  },
  {
    group: 'Deviation Fields',
    options: [
      { id: 'deviation', label: 'Deviation (Auto / Description)' },
      { id: 'deviationAndCause', label: 'Deviation + Cause Description' },
      { id: 'deviationAndConsequence', label: 'Deviation + Consequence' }
    ]
  },
  {
    group: 'Safeguards & Recommendations',
    options: [
      { id: 'presentProtection', label: 'Safeguards (Present Protection)' },
      { id: 'additionalProtection', label: 'Recommendations (Additional Protection)' },
      { id: 'allProtections', label: 'Both Safeguards & Recommendations' }
    ]
  },
  {
    group: 'Node & Facility',
    options: [
      { id: 'node', label: 'Node Description' }
    ]
  },
  {
    group: 'Risk Ranking Scores',
    options: [
      { id: 'inherentRiskS', label: 'Inherent Risk Severity (S)' },
      { id: 'inherentRiskL', label: 'Inherent Risk Likelihood (L)' },
      { id: 'inherentRiskRR', label: 'Inherent Risk Ranking (RR)' },
      { id: 'mitigatedRiskS', label: 'Mitigated Risk Severity (S)' },
      { id: 'residualRiskS', label: 'Residual Risk Severity (S)' }
    ]
  },
  {
    group: 'General & Tracking',
    options: [
      { id: 'recommendationNo', label: 'Recommendation ID (R1, R2...)' },
      { id: 'remarks', label: 'Remarks / Notes' },
      { id: 'status', label: 'Status' }
    ]
  }
];

export const SEVERITY_SOURCES = [
  { id: 'inherentRiskS', label: 'Inherent Risk Severity (S) [Default]', desc: 'Raw unmitigated severity level from PHA risk matrix' },
  { id: 'mitigatedRiskS', label: 'Mitigated Risk Severity (S)', desc: 'Severity level after applying existing safeguards' },
  { id: 'residualRiskS', label: 'Residual Risk Severity (S)', desc: 'Final residual severity after recommendations' },
  { id: 'manual', label: 'Manual Input in LOPA Worksheet', desc: 'Allows free-form numeric entry directly inside LOPA Worksheet' }
];

export const getLopaMapping = () => {
  try {
    const raw = localStorage.getItem('pha_lopa_mapping');
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_LOPA_MAPPING, ...parsed };
    }
  } catch (err) {
    console.error('Failed to parse pha_lopa_mapping from localStorage:', err);
  }
  return { ...DEFAULT_LOPA_MAPPING };
};

export const saveLopaMapping = (mapping) => {
  try {
    localStorage.setItem('pha_lopa_mapping', JSON.stringify(mapping));
    window.dispatchEvent(new Event('pha_lopa_mapping_changed'));
    return true;
  } catch (err) {
    console.error('Failed to save pha_lopa_mapping:', err);
    return false;
  }
};

export const resetLopaMapping = () => {
  try {
    localStorage.setItem('pha_lopa_mapping', JSON.stringify(DEFAULT_LOPA_MAPPING));
    window.dispatchEvent(new Event('pha_lopa_mapping_changed'));
    return { ...DEFAULT_LOPA_MAPPING };
  } catch (err) {
    console.error('Failed to reset pha_lopa_mapping:', err);
    return { ...DEFAULT_LOPA_MAPPING };
  }
};

/**
 * Universal resolver: converts ANY selected PHA field source into its formatted string value
 */
export const resolvePhaFieldValue = (sc, sourceKey) => {
  if (!sc || !sourceKey) return '';
  switch (sourceKey) {
    // Consequences
    case 'consequencesImmediate':
      return sc.consequencesImmediate || '';
    case 'consequencesUltimate':
      return sc.consequencesUltimate || sc.consequencesImmediate || '';
    case 'bothConsequences':
      if (sc.consequencesImmediate && sc.consequencesUltimate) {
        return `${sc.consequencesImmediate} [Ultimate: ${sc.consequencesUltimate}]`;
      }
      return sc.consequencesImmediate || sc.consequencesUltimate || '';
    case 'consequenceCategory':
      return sc.consequenceCategory || '';
    case 'categoryAndImmediate':
      return sc.consequenceCategory 
        ? `[${sc.consequenceCategory}] ${sc.consequencesImmediate || ''}`.trim() 
        : (sc.consequencesImmediate || '');

    // Causes
    case 'causeDescription':
      return sc.causeId?.description || '';
    case 'causeAndEquipment': {
      const parts = [];
      if (sc.causeId?.equipment) parts.push(`Eq: ${sc.causeId.equipment}`);
      if (sc.causeId?.instrument) parts.push(`Inst: ${sc.causeId.instrument}`);
      const details = parts.length > 0 ? ` (${parts.join(', ')})` : '';
      return `${sc.causeId?.description || ''}${details}`.trim();
    }

    // Deviations
    case 'deviation':
      return sc.deviationId?.deviationAuto || '';
    case 'deviationAndCause':
      return sc.deviationId?.deviationAuto 
        ? `${sc.deviationId.deviationAuto} → ${sc.causeId?.description || ''}` 
        : (sc.causeId?.description || '');
    case 'deviationAndConsequence':
      return sc.deviationId?.deviationAuto 
        ? `${sc.deviationId.deviationAuto} → ${sc.consequencesImmediate || ''}` 
        : (sc.consequencesImmediate || '');

    // Node
    case 'node':
      return sc.nodeId?.description || '';

    // Safeguards & Protections
    case 'presentProtection':
      return sc.presentProtection || '';
    case 'additionalProtection':
      return sc.additionalProtection || '';
    case 'allProtections':
      if (sc.presentProtection && sc.additionalProtection) {
        return `${sc.presentProtection} | Rec: ${sc.additionalProtection}`;
      }
      return sc.presentProtection || sc.additionalProtection || '';

    // Risk Rankings
    case 'inherentRiskS':
      return sc.inherentRiskS || '';
    case 'inherentRiskL':
      return sc.inherentRiskL || '';
    case 'inherentRiskRR':
      return sc.inherentRiskRR || '';
    case 'mitigatedRiskS':
      return sc.mitigatedRiskS || '';
    case 'residualRiskS':
      return sc.residualRiskS || '';

    // General
    case 'recommendationNo':
      return sc.recommendationNo || '';
    case 'remarks':
      return sc.remarks || '';
    case 'status':
      return sc.status || '';

    default:
      return sc[sourceKey] || '';
  }
};

export const getScenarioText = (sc, mapping = DEFAULT_LOPA_MAPPING) => {
  return resolvePhaFieldValue(sc, mapping?.scenarioSource || 'consequencesImmediate');
};

export const getInitiatingEventText = (sc, mapping = DEFAULT_LOPA_MAPPING) => {
  return resolvePhaFieldValue(sc, mapping?.initiatingEventSource || 'causeDescription');
};

export const getIplText = (sc, mapping = DEFAULT_LOPA_MAPPING) => {
  return resolvePhaFieldValue(sc, mapping?.iplSource || 'presentProtection');
};

export const getSeverityValue = (sc, mapping = DEFAULT_LOPA_MAPPING) => {
  if (!sc) return '';
  const source = mapping?.severitySource || 'inherentRiskS';
  switch (source) {
    case 'mitigatedRiskS':
      return sc.mitigatedRiskS || sc.inherentRiskS || (sc.lopaData?.severity ?? '');
    case 'residualRiskS':
      return sc.residualRiskS || sc.inherentRiskS || (sc.lopaData?.severity ?? '');
    case 'manual':
      return sc.lopaData?.severity !== undefined && sc.lopaData?.severity !== null ? sc.lopaData.severity : '';
    case 'inherentRiskS':
    default:
      return sc.inherentRiskS || (sc.lopaData?.severity ?? '');
  }
};

export const findFieldLabel = (fieldId) => {
  for (const grp of UNIVERSAL_PHA_FIELD_GROUPS) {
    const match = grp.options.find(opt => opt.id === fieldId);
    if (match) return match.label;
  }
  return fieldId;
};
