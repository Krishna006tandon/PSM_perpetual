/**
 * ANSI/API RECOMMENDED PRACTICE 754 (Fourth Edition / Third Edition Compliant)
 * Comprehensive Multi-Stage Classification Engine
 * Categories Generated:
 * 1. Tier 1 PSE (Major process safety event)
 * 2. Tier 2 PSE (Process safety event with lesser consequence)
 * 3. Tier 3 Indicator (Challenges to safety systems / SOL excursions / Demands)
 * 4. Tier 4 Indicator (Operating discipline and management system performance)
 * 5. Near Miss (No qualifying actual PSE; credible potential incident)
 * 6. Other Incident (Actual incident not qualifying as API RP 754 PSE, e.g. personal safety slip/fall)
 * 7. Pending Classification (Insufficient data / verification required)
 */

// Table 1 - Material Release Threshold Quantities (TRC 1 to 8)
const TRC_THRESHOLDS = {
  'TRC 1': {
    name: 'TIH Zone A / GHS Cat 1 Inhalation (H330)',
    description: 'Toxic Inhalation Hazard Zone A (LC50 <= 200 ppm)',
    tier1: { outdoorKg: 5, indoorKg: 0.5 },
    tier2: { outdoorKg: 0.5, indoorKg: 0.25 }
  },
  'TRC 2': {
    name: 'TIH Zone B / GHS Cat 2 Inhalation (H330)',
    description: 'Toxic Inhalation Hazard Zone B (200 < LC50 <= 1000 ppm)',
    tier1: { outdoorKg: 25, indoorKg: 2.5 },
    tier2: { outdoorKg: 2.5, indoorKg: 1.25 }
  },
  'TRC 3': {
    name: 'TIH Zone C / GHS Cat 3 Inhalation (H331)',
    description: 'Toxic Inhalation Hazard Zone C (1000 < LC50 <= 3000 ppm)',
    tier1: { outdoorKg: 100, indoorKg: 10 },
    tier2: { outdoorKg: 10, indoorKg: 5 }
  },
  'TRC 4': {
    name: 'TIH Zone D / GHS Cat 4 Inhalation (H332)',
    description: 'Toxic Inhalation Hazard Zone D (3000 < LC50 <= 5000 ppm)',
    tier1: { outdoorKg: 200, indoorKg: 20 },
    tier2: { outdoorKg: 20, indoorKg: 10 }
  },
  'TRC 5': {
    name: 'Flammable Gases & Packing Group I Flammables',
    description: 'Flammable gas, liquids BP <= 35°C and FP < 23°C, Pyrophorics',
    tier1: { outdoorKg: 500, indoorKg: 50 },
    tier2: { outdoorKg: 50, indoorKg: 25 }
  },
  'TRC 6': {
    name: 'Packing Group II Flammables & Crude Oil >= 15 API',
    description: 'Flammable liquids BP > 35°C and FP < 23°C, Crude oil >= 15 API',
    tier1: { outdoorKg: 1000, indoorKg: 100, outdoorBbl: 7, indoorBbl: 0.7 },
    tier2: { outdoorKg: 100, indoorKg: 50, outdoorBbl: 0.7, indoorBbl: 0.35 }
  },
  'TRC 7': {
    name: 'Packing Group III Combustibles & Crude Oil < 15 API',
    description: 'Liquids 23°C <= FP <= 60°C, Liquids released at/above FP, Asphyxiant gases',
    tier1: { outdoorKg: 2000, indoorKg: 200, outdoorBbl: 14, indoorBbl: 1.4 },
    tier2: { outdoorKg: 200, indoorKg: 100, outdoorBbl: 1.4, indoorBbl: 0.7 }
  },
  'TRC 8': {
    name: 'Moderate Combustibles (< FP) & Strong Acids/Bases',
    description: 'Liquids 60°C < FP <= 93°C released below FP, Strong acids/bases (pH < 1 or > 12.5)',
    tier1: null,
    tier2: { outdoorKg: 1000, indoorKg: 500, outdoorBbl: 7, indoorBbl: 3.5 }
  }
};

// Section 10.4.4 Standard Causal Taxonomy
const API_754_CAUSAL_FACTORS = [
  {
    category: 'Change Management/MOC/PSSR',
    subcategories: [
      'Action items implementation less than adequate (LTA)',
      'Commissioning not authorized or LTA',
      'Informing/training personnel LTA',
      'MOC hazard analysis LTA',
      'No MOC conducted',
      'QA/QC design and construction LTA',
      'Temporary MOC past removal date',
      'Updating procedures/PSI LTA',
      'Other'
    ]
  },
  {
    category: 'Communication',
    subcategories: [
      'Ambiguous communication',
      'Language barrier',
      'Misunderstood instruction',
      'No communication',
      'Not timely',
      'Prework safety review LTA',
      'Shift turnover LTA',
      'Signs, warnings, or labels LTA',
      'Other'
    ]
  },
  {
    category: 'Design/Construction',
    subcategories: [
      'Codes and standards, specifications LTA',
      'Construction not consistent with design',
      'Engineering LTA',
      'Fabrication or installation LTA',
      'Wrong material(s) of construction',
      'Other'
    ]
  },
  {
    category: 'Equipment Reliability',
    subcategories: [
      'Maintenance methodology LTA',
      'Premature failure',
      'Preventive maintenance/testing frequency LTA',
      'Repair methodology LTA',
      'Testing methodology LTA',
      'Other'
    ]
  },
  {
    category: 'Fixed Equipment Inspection',
    subcategories: [
      'Corrective action not timely',
      'Frequency LTA',
      'Knowledge/experience of inspector LTA',
      'Location LTA',
      'No inspection',
      'QA/QC LTA',
      'Records LTA',
      'Technique LTA',
      'Other'
    ]
  },
  {
    category: 'Human Performance',
    subcategories: [
      'Ergonomics LTA',
      'Human machine interface LTA',
      'Physiologically related - fatigue, illness, impairment',
      'Time constraint / schedule pressure',
      'Work environment',
      'Workload - physical/mental',
      'Other'
    ]
  },
  {
    category: 'Operating Limits',
    subcategories: [
      'No operating limits established',
      'Not alarmed',
      'Not monitored',
      'Operating limits exceeded',
      'Operating limits not correct',
      'Other'
    ]
  },
  {
    category: 'Procedures',
    subcategories: [
      'Operating - No procedure available',
      'Operating - Procedure available but not followed',
      'Operating - Procedure followed incorrectly',
      'Operating - Procedure not accurate/clear',
      'Operating - Situation not covered',
      'Operating - Used wrong procedure',
      'Maintenance - Procedure LTA / not followed',
      'Contractor - Procedure LTA / not followed',
      'Other'
    ]
  },
  {
    category: 'Safe Work Practices',
    subcategories: [
      'Confined space practice LTA',
      'Energy control / LOTO practice LTA',
      'Hot work practice LTA',
      'Line breaking / equipment opening LTA',
      'Other'
    ]
  }
];

/**
 * Stage 2 – Automated PSE Classification Engine
 * Implements full 7-category declaration logic:
 * 1. Tier 1 PSE
 * 2. Tier 2 PSE
 * 3. Tier 3 Indicator
 * 4. Tier 4 Indicator
 * 5. Near Miss
 * 6. Other Incident
 * 7. Pending Classification
 */
function evaluateApi754Tier(data) {
  const {
    isActualRelease,              // 'Yes' | 'No' | 'Not sure'
    isLOPC,                       // Boolean
    natureOfEvents = [],          // Array of checked strings
    chemicalTRC,                  // 'TRC 1' .. 'TRC 8', 'N/A'
    releaseLocation = 'Outdoor',  // 'Outdoor' | 'Indoor'
    releaseQuantityKg = 0,
    quantityUnknown = false,      // User indicated quantity is not yet known
    fatalitiesCount = 0,
    daysAwayInjuriesCount = 0,
    recordableInjuriesCount = 0,
    hospitalAdmissionThirdParty = 0,
    hasInjuriesPending = false,   // Medical assessment pending
    fireExplosionOccurred = false,
    directCostUSD = 0,
    directCostPending = false,    // Cost estimation still in progress
    evacOrShelter = false,
    officiallyDeclared = false,
    isPRDOrUpset = false,
    prdDischargeConsequences = {},
    isSOLChallenge = false,
    isSafetySystemDemand = false,
    isManagementSystemIssue = false,
    isNearMiss = false
  } = data;

  const reasons = [];

  // RULE A: Check for Pending Classification – Additional Information Required
  // "If any mandatory information is missing, the software should display
  // Pending Classification – Additional Information Required, rather than automatically declaring the event as Near Miss or Non-PSE."
  const pendingReasons = [];
  const pendingDetails = [];

  if (isActualRelease === 'Not sure') {
    pendingReasons.push('Actual material release status is unconfirmed (loss of containment vs internal upset)');
    pendingDetails.push({
      item: 'Material Release Status',
      parameter: 'isActualRelease',
      status: 'Unconfirmed (Not sure)',
      guidance: 'Verify whether a physical breach of containment occurred to atmosphere/ground or if the event was safely contained.'
    });
  }

  if (hasInjuriesPending) {
    pendingReasons.push('Medical treatment / injury recordability assessment pending occupational health evaluation');
    pendingDetails.push({
      item: 'Medical / Injury Severity',
      parameter: 'hasInjuriesPending',
      status: 'Medical Evaluation Pending',
      guidance: 'Awaiting doctor diagnosis: check whether any worker sustained Days Away From Work / LTI (Tier 1) or Medical Treatment (Tier 2).'
    });
  }

  if (directCostPending) {
    pendingReasons.push('Fire / explosion direct cost damage assessment is still in progress');
    pendingDetails.push({
      item: 'Direct Damage Cost',
      parameter: 'directCostPending',
      status: 'Estimation In Progress',
      guidance: 'Awaiting engineering cost estimate: check whether total direct equipment repair/replacement cost exceeds $100,000 (Tier 2) or $2,500,000 (Tier 1).'
    });
  }

  if ((isActualRelease === 'Yes' || isLOPC) && chemicalTRC && chemicalTRC !== 'N/A' && (quantityUnknown || releaseQuantityKg <= 0)) {
    pendingReasons.push(`Chemical release (${chemicalTRC}) confirmed, but 1-hour release quantity is not yet estimated/measured`);
    pendingDetails.push({
      item: '1-Hour Release Quantity (LOPC)',
      parameter: 'releaseQuantityKg / quantityUnknown',
      status: quantityUnknown ? 'Marked Unknown by Reporter' : '0 kg Recorded',
      guidance: `Perform mass balance or plant calculation to estimate 1-hour release quantity (kg) against API RP 754 ${chemicalTRC} Threshold Quantity.`
    });
  }

  if ((isActualRelease === 'Yes' || isLOPC) && (!chemicalTRC || chemicalTRC === 'N/A' || chemicalTRC === 'None')) {
    pendingReasons.push('Loss of Primary Containment (LOPC) indicated, but chemical Threshold Release Category (TRC 1..8) has not been assigned');
    pendingDetails.push({
      item: 'Chemical TRC Category',
      parameter: 'chemicalTRC',
      status: 'Unassigned',
      guidance: 'Select chemical / material toxicity and flammability category (TRC 1 to TRC 8) in Section C to determine applicable threshold quantity.'
    });
  }

  if (pendingReasons.length > 0) {
    return {
      category: 'Pending Classification',
      tier: 'Pending Classification',
      title: 'Pending Classification – Additional Information Required',
      reasons: pendingReasons,
      pendingDetails,
      badgeColor: 'warning'
    };
  }

  // RULE B: Check Tier 1 PSE Criteria
  if (fatalitiesCount > 0) {
    reasons.push(`${fatalitiesCount} fatality(ies) reported (API 754 Tier 1 Criterion)`);
    return {
      category: 'Tier 1 PSE',
      tier: 'Tier 1',
      title: 'Tier 1 PSE – Major Process Safety Event',
      reasons,
      badgeColor: 'danger'
    };
  }

  if (daysAwayInjuriesCount > 0) {
    reasons.push(`${daysAwayInjuriesCount} Days Away From Work (LTI) injury(ies) to employee or contractor`);
    return {
      category: 'Tier 1 PSE',
      tier: 'Tier 1',
      title: 'Tier 1 PSE – Major Process Safety Event',
      reasons,
      badgeColor: 'danger'
    };
  }

  if (hospitalAdmissionThirdParty > 0) {
    reasons.push(`${hospitalAdmissionThirdParty} third-party hospital admission(s)`);
    return {
      category: 'Tier 1 PSE',
      tier: 'Tier 1',
      title: 'Tier 1 PSE – Major Process Safety Event',
      reasons,
      badgeColor: 'danger'
    };
  }

  if (evacOrShelter && officiallyDeclared) {
    reasons.push('Officially declared community evacuation or community shelter-in-place');
    return {
      category: 'Tier 1 PSE',
      tier: 'Tier 1',
      title: 'Tier 1 PSE – Major Process Safety Event',
      reasons,
      badgeColor: 'danger'
    };
  }

  if (fireExplosionOccurred && directCostUSD >= 100000) {
    reasons.push(`Direct fire / explosion damage of $${directCostUSD.toLocaleString()} (meets Tier 1 $100,000 threshold)`);
    return {
      category: 'Tier 1 PSE',
      tier: 'Tier 1',
      title: 'Tier 1 PSE – Major Process Safety Event',
      reasons,
      badgeColor: 'danger'
    };
  }

  // Chemical release Tier 1 check
  const threshold = TRC_THRESHOLDS[chemicalTRC];
  const hasPRDConsequence = prdDischargeConsequences.rainout ||
    prdDischargeConsequences.unsafeLocation ||
    prdDischargeConsequences.onSiteEvac ||
    prdDischargeConsequences.publicProtective;

  if (threshold && threshold.tier1) {
    const t1ThresholdKg = releaseLocation === 'Indoor' ? threshold.tier1.indoorKg : threshold.tier1.outdoorKg;

    if (isPRDOrUpset && hasPRDConsequence && releaseQuantityKg >= t1ThresholdKg) {
      reasons.push(`PRD/Upset release of ${releaseQuantityKg} kg of ${chemicalTRC} exceeded Tier 1 threshold (${t1ThresholdKg} kg) with rainout/unsafe dispersion`);
      return {
        category: 'Tier 1 PSE',
        tier: 'Tier 1',
        title: 'Tier 1 PSE – Major Process Safety Event',
        reasons,
        badgeColor: 'danger'
      };
    }

    if (!isPRDOrUpset && (isLOPC || isActualRelease === 'Yes') && releaseQuantityKg >= t1ThresholdKg) {
      reasons.push(`Loss of Primary Containment of ${releaseQuantityKg} kg of ${chemicalTRC} exceeded Tier 1 threshold (${t1ThresholdKg} kg) within 1-hour`);
      return {
        category: 'Tier 1 PSE',
        tier: 'Tier 1',
        title: 'Tier 1 PSE – Major Process Safety Event',
        reasons,
        badgeColor: 'danger'
      };
    }
  }

  // RULE C: Check Tier 2 PSE Criteria
  if (recordableInjuriesCount > 0) {
    reasons.push(`${recordableInjuriesCount} recordable injury(ies) to employee or contractor (Tier 2 Criterion)`);
    return {
      category: 'Tier 2 PSE',
      tier: 'Tier 2',
      title: 'Tier 2 PSE – Process Safety Event with Lesser Consequence',
      reasons,
      badgeColor: 'warning-dark'
    };
  }

  if (fireExplosionOccurred && directCostUSD >= 2500) {
    reasons.push(`Direct fire / explosion damage of $${directCostUSD.toLocaleString()} (meets Tier 2 $2,500 threshold)`);
    return {
      category: 'Tier 2 PSE',
      tier: 'Tier 2',
      title: 'Tier 2 PSE – Process Safety Event with Lesser Consequence',
      reasons,
      badgeColor: 'warning-dark'
    };
  }

  if (threshold && threshold.tier2) {
    const t2ThresholdKg = releaseLocation === 'Indoor' ? threshold.tier2.indoorKg : threshold.tier2.outdoorKg;

    if (isPRDOrUpset && hasPRDConsequence && releaseQuantityKg >= t2ThresholdKg) {
      reasons.push(`PRD/Upset release of ${releaseQuantityKg} kg of ${chemicalTRC} exceeded Tier 2 threshold (${t2ThresholdKg} kg) with adverse dispersion`);
      return {
        category: 'Tier 2 PSE',
        tier: 'Tier 2',
        title: 'Tier 2 PSE – Process Safety Event with Lesser Consequence',
        reasons,
        badgeColor: 'warning-dark'
      };
    }

    if (!isPRDOrUpset && (isLOPC || isActualRelease === 'Yes') && releaseQuantityKg >= t2ThresholdKg) {
      reasons.push(`Loss of Primary Containment of ${releaseQuantityKg} kg of ${chemicalTRC} exceeded Tier 2 threshold (${t2ThresholdKg} kg) within 1-hour`);
      return {
        category: 'Tier 2 PSE',
        tier: 'Tier 2',
        title: 'Tier 2 PSE – Process Safety Event with Lesser Consequence',
        reasons,
        badgeColor: 'warning-dark'
      };
    }
  }

  // RULE D: Check Tier 3 Indicators (Challenges to Safety Systems / SOL excursions)
  if (isSOLChallenge || isSafetySystemDemand || natureOfEvents.includes('Safe Operating Limit excursion') || natureOfEvents.includes('SIS activation') || natureOfEvents.includes('Pressure relief device (PRD) discharge')) {
    if (isSOLChallenge || natureOfEvents.includes('Safe Operating Limit excursion')) {
      reasons.push('Safe Operating Limit (SOL) excursion occurred without Tier 1/2 consequence');
    }
    if (isSafetySystemDemand || natureOfEvents.includes('SIS activation')) {
      reasons.push('Demand on Safety Instrumented System (SIS) / interlock trip occurred');
    }
    if (natureOfEvents.includes('Pressure relief device (PRD) discharge')) {
      reasons.push('Pressure relief device discharged to flare/safe vent without rainout or unsafe location');
    }
    return {
      category: 'Tier 3 Indicator',
      tier: 'Tier 3',
      title: 'Tier 3 Indicator – Challenges to Safety Systems',
      reasons,
      badgeColor: 'info'
    };
  }

  // Minor LOPC below Tier 2
  if (isLOPC || isActualRelease === 'Yes') {
    reasons.push('Minor Loss of Primary Containment (LOPC) below Tier 2 threshold quantities');
    return {
      category: 'Tier 3 Indicator',
      tier: 'Tier 3',
      title: 'Tier 3 Indicator – Minor LOPC',
      reasons,
      badgeColor: 'info'
    };
  }

  // RULE E: Check Tier 4 Indicators (Operating Discipline & Management System Performance)
  if (isManagementSystemIssue || natureOfEvents.includes('Unsafe condition identified')) {
    reasons.push('Operating discipline, inspection overdue, or management system finding');
    return {
      category: 'Tier 4 Indicator',
      tier: 'Tier 4',
      title: 'Tier 4 Indicator – Operating Discipline & Management Systems',
      reasons,
      badgeColor: 'secondary'
    };
  }

  // RULE F: Near Miss (Credible potential incident prevented by barrier)
  if (isNearMiss || natureOfEvents.includes('Near miss / Potential incident') || isActualRelease === 'No') {
    reasons.push('No actual qualifying PSE consequence. Credible potential incident prevented by safeguards/barriers');
    return {
      category: 'Near Miss',
      tier: 'Near Miss',
      title: 'Near Miss – Credible Potential Event',
      reasons,
      badgeColor: 'primary'
    };
  }

  // RULE G: Other Incident (Non-process related, e.g. purely occupational slip/fall)
  reasons.push('Actual event did not meet API RP 754 process safety criteria (e.g. routine personal safety)');
  return {
    category: 'Other Incident',
    tier: 'Other Incident',
    title: 'Other Incident – Non-Process Safety Event',
    reasons,
    badgeColor: 'secondary'
  };
}

/**
 * Calculate Tier 1 Severity Weighting (Annex D Table D.1)
 */
function calculateTier1SeverityScore(data) {
  let points = 0;
  const {
    fatalitiesCount = 0,
    daysAwayInjuriesCount = 0,
    recordableInjuriesCount = 0,
    hospitalAdmissionThirdParty = 0,
    directCostUSD = 0,
    communityHours = 0,
    isEvacuation = false,
    releaseMultipleOfTQ = 0,
    acuteEnvironmentalCostUSD = 0
  } = data;

  if (fatalitiesCount >= 2 || hospitalAdmissionThirdParty >= 2 || (fatalitiesCount >= 1 && hospitalAdmissionThirdParty >= 1)) {
    points += 27;
  } else if (fatalitiesCount === 1 || hospitalAdmissionThirdParty === 1) {
    points += 9;
  } else if (daysAwayInjuriesCount > 0) {
    points += 3;
  } else if (recordableInjuriesCount > 0) {
    points += 1;
  }

  if (directCostUSD >= 100000000) {
    points += 27;
  } else if (directCostUSD >= 10000000) {
    points += 9;
  } else if (directCostUSD >= 1000000) {
    points += 3;
  } else if (directCostUSD >= 100000) {
    points += 1;
  }

  if (releaseMultipleOfTQ >= 27) {
    points += 27;
  } else if (releaseMultipleOfTQ >= 9) {
    points += 9;
  } else if (releaseMultipleOfTQ >= 3) {
    points += 3;
  } else if (releaseMultipleOfTQ >= 1) {
    points += 1;
  }

  if (isEvacuation && communityHours > 48) {
    points += 27;
  } else if (isEvacuation && communityHours > 24) {
    points += 9;
  } else if ((isEvacuation && communityHours > 3) || (!isEvacuation && communityHours > 3)) {
    points += 3;
  } else if (communityHours > 0) {
    points += 1;
  }

  if (acuteEnvironmentalCostUSD >= 100000000) {
    points += 27;
  } else if (acuteEnvironmentalCostUSD >= 10000000) {
    points += 9;
  } else if (acuteEnvironmentalCostUSD >= 1000000) {
    points += 3;
  } else if (acuteEnvironmentalCostUSD >= 100000) {
    points += 1;
  }

  return points;
}

module.exports = {
  TRC_THRESHOLDS,
  API_754_CAUSAL_FACTORS,
  evaluateApi754Tier,
  calculateTier1SeverityScore
};
