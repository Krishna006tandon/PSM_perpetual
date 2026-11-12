const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  // Section A - Basic Incident Information
  incidentNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  companyCode: {
    type: String,
    index: true,
    default: 'DEFAULT'
  },
  companyName: {
    type: String,
    default: 'Perpetual Solutions'
  },
  facilityName: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  plantZone: {
    type: String,
    required: true,
    trim: true
  },
  exactLocation: {
    type: String,
    default: ''
  },
  equipmentTag: {
    type: String,
    default: ''
  },
  equipmentDescription: {
    type: String,
    default: ''
  },
  dateTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  shift: {
    type: String,
    enum: ['Shift A', 'Shift B', 'Shift C', 'General Shift', 'Night Shift'],
    default: 'Shift A'
  },
  unitOperatingStatus: {
    type: String,
    enum: ['Normal - Steady State', 'Start-up', 'Shutdown', 'Routine Maintenance', 'Turnaround', 'Other'],
    default: 'Normal - Steady State'
  },
  facilityType: {
    type: String,
    enum: ['Refining', 'Petrochemical', 'Chemical Processing', 'Storage / Terminal', 'Utilities', 'Other'],
    default: 'Refining'
  },
  status: {
    type: String,
    enum: [
      'Submitted',
      'Under Manager Review',
      'Investigation Active',
      'CAPA Pending',
      'CAPA Verification',
      'Closed',
      'Administratively Closed',
      'Archived'
    ],
    default: 'Submitted'
  },

  // Reporter Credentials
  reporter: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    department: { type: String, default: 'Operations' },
    designation: { type: String, default: 'Shift Engineer' },
    contactPhone: { type: String, default: '' },
    email: { type: String, default: '' }
  },

  // Section B - Nature of Event
  natureOfEvents: [{
    type: String
  }],
  isActualRelease: {
    type: String,
    enum: ['Yes', 'No', 'Not sure'],
    default: 'No'
  },
  sourceOfRelease: {
    type: String,
    default: 'N/A'
  },
  releaseAuthorization: {
    type: String,
    default: 'N/A'
  },
  descriptionMatrix: {
    whatHappened: { type: String, required: true },
    whatWasObserved: { type: String, default: '' },
    whatCouldHaveHappened: { type: String, default: '' }
  },
  immediateActionsTaken: {
    type: String,
    default: ''
  },

  // Section C - Material & Release Details (Conditional on Release = Yes)
  isLOPC: { type: Boolean, default: false },
  materialDetails: {
    materialName: { type: String, default: '' },
    chemicalName: { type: String, default: '' },
    casNumber: { type: String, default: '' },
    chemicalTRC: {
      type: String,
      enum: ['TRC 1', 'TRC 2', 'TRC 3', 'TRC 4', 'TRC 5', 'TRC 6', 'TRC 7', 'TRC 8', 'Non-Hazardous/Other', 'N/A'],
      default: 'N/A'
    },
    physicalState: {
      type: String,
      enum: ['Gas', 'Liquid', 'Vapour', 'Solid', 'Two-phase', 'N/A'],
      default: 'N/A'
    },
    isFlammable: { type: Boolean, default: false },
    isToxic: { type: Boolean, default: false },
    isCorrosive: { type: Boolean, default: false },
    temperatureC: { type: Number, default: 25 },
    operatingPressureBar: { type: Number, default: 1 },
    releasePressureBar: { type: Number, default: 1 },
    releaseLocation: { type: String, enum: ['Outdoor', 'Indoor'], default: 'Outdoor' },
    estimatedQuantity: { type: Number, default: 0 },
    quantityUnit: { type: String, default: 'kg' },
    quantityInOneHourKg: { type: Number, default: 0 },
    quantityUnknown: { type: Boolean, default: false },
    releaseDurationHours: { type: Number, default: 1 },
    releaseRateKgHr: { type: Number, default: 0 },
    wasRecovered: { type: String, enum: ['Yes', 'No', 'Partially', 'N/A'], default: 'N/A' },
    stoppedBy: { type: String, default: 'Manual intervention' },
    sdsAvailable: { type: Boolean, default: true },
    isMixture: { type: Boolean, default: false },
    mixtureDetails: { type: String, default: '' }
  },

  // Section D - Human Consequences
  injuredPersons: [{
    name: String,
    role: { type: String, enum: ['Employee', 'Contractor', 'Third Party'], default: 'Employee' },
    injuryType: {
      type: String,
      enum: ['No Injury', 'First Aid Case (FAC)', 'Medical Treatment Case (MTC)', 'Days Away From Work (LTI)', 'Fatality'],
      default: 'No Injury'
    },
    medicalStatus: {
      type: String,
      enum: ['On-site First Aid', 'Treated & Released', 'Hospital Admission', 'Deceased', 'Assessment Pending', 'N/A'],
      default: 'N/A'
    },
    daysAwayFromWork: { type: Number, default: 0 },
    natureOfInjury: String
  }],
  hasInjuriesPending: { type: Boolean, default: false },

  // Section E - Fire & Explosion Consequences
  fireExplosionDetails: {
    occurred: { type: Boolean, default: false },
    didFireOccur: { type: Boolean, default: false },
    didExplosionOccur: { type: Boolean, default: false },
    isFlashFire: { type: Boolean, default: false },
    isVCE: { type: Boolean, default: false },
    equipmentDamage: { type: Boolean, default: false },
    structuralDamage: { type: Boolean, default: false },
    directCostUSD: { type: Number, default: 0 },
    directCostPending: { type: Boolean, default: false },
    firefightingRequired: { type: Boolean, default: false },
    unitShutdown: { type: Boolean, default: false }
  },

  // Section F - Emergency Response & Protective Measures
  emergencyMeasures: {
    onSiteEvacuation: { type: Boolean, default: false },
    onSiteShelter: { type: Boolean, default: false },
    communityEvacuation: { type: Boolean, default: false },
    communityShelter: { type: Boolean, default: false },
    officiallyDeclared: { type: Boolean, default: false },
    publicProtectiveMeasures: { type: Boolean, default: false },
    precautionaryOnly: { type: Boolean, default: false },
    durationHours: { type: Number, default: 0 },
    dischargeToUnsafeLocation: { type: Boolean, default: false },
    liquidRainout: { type: Boolean, default: false },
    offSiteImpact: { type: Boolean, default: false }
  },

  // Section G - Barrier & Safety System Performance
  barrierPerformance: {
    prdOperated: { type: Boolean, default: false },
    sisActivated: { type: Boolean, default: false },
    emergencyDepressureOperated: { type: Boolean, default: false },
    solExceeded: { type: Boolean, default: false },
    interlockTripDemand: { type: Boolean, default: false },
    safetyCriticalEquipmentFailed: { type: Boolean, default: false },
    equipmentTag: { type: String, default: '' },
    setPoint: { type: String, default: '' },
    actualValue: { type: String, default: '' },
    performedAsIntended: { type: Boolean, default: true }
  },

  // Section H - Near-Miss Assessment (Conditional)
  nearMissAssessment: {
    isCrediblePotential: { type: Boolean, default: false },
    barrierPreventedEscalation: { type: Boolean, default: false },
    safeguardThatPrevented: { type: String, default: '' },
    credibleWorstCaseConsequence: { type: String, default: '' }
  },

  // Section I & J - Automated API RP 754 Classification
  api754Classification: {
    category: {
      type: String,
      enum: [
        'Tier 1 PSE',
        'Tier 2 PSE',
        'Tier 3 Indicator',
        'Tier 4 Indicator',
        'Near Miss',
        'Other Incident',
        'Pending Classification'
      ],
      default: 'Near Miss'
    },
    tier: { type: String, default: 'Near Miss' },
    title: { type: String, default: 'Near Miss – Credible Potential Event' },
    reasons: [String],
    tier1SeverityPoints: { type: Number, default: 0 },
    badgeColor: { type: String, default: 'primary' },
    manuallyOverridden: { type: Boolean, default: false },
    overrideJustification: { type: String, default: '' }
  },

  // Section K - Initial Reviewer Declaration
  reviewerDeclaration: {
    reviewedBy: String,
    reviewerEmail: String,
    reviewerRole: String,
    reviewedDate: Date,
    isConfirmed: { type: Boolean, default: false },
    approvedBy: String,
    approvalDate: Date,
    statement: {
      type: String,
      default: 'I have reviewed the information provided in this First Incident Report and assessed the event against the applicable API RP 754 criteria. The classification represents the initial assessment based on currently available information and shall be reconfirmed upon full investigation.'
    }
  },

  // Module 3: 7-Day SLA Triage & CFT
  submittedAt: { type: Date, default: Date.now },
  managerReviewDeadline: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  },
  triage: {
    status: {
      type: String,
      enum: ['Pending', 'Administratively Closed', 'Formal Investigation Mandated'],
      default: 'Pending'
    },
    reviewedBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String
    },
    decisionDate: Date,
    comments: String
  },

  cft: {
    leader: {
      name: String,
      designation: String,
      email: String,
      department: String
    },
    members: [{
      name: String,
      designation: String,
      email: String,
      department: String,
      role: { type: String, default: 'Investigator' }
    }]
  },

  // Stage 3C: Barrier Effectiveness Analysis (LOPA / Swiss-Cheese Layers)
  barrierAnalysis: [{
    layerName: { type: String, required: true },
    barrierType: { type: String, enum: ['Prevention', 'Mitigation'], default: 'Prevention' },
    safeguardTag: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'Worked as Intended',
        'Failed / Degraded',
        'Bypassed / Defeated',
        'Missing / Not Installed',
        'Not Applicable'
      ],
      default: 'Not Applicable'
    },
    failureReason: { type: String, default: '' },
    evaluatedBy: { type: String, default: '' },
    evaluatedAt: { type: Date, default: Date.now }
  }],

  // Stage 3C: Mandatory Supporting Evidence & Document Vault
  supportingEvidence: [{
    checklistKey: { type: String, default: 'custom' },
    title: { type: String, required: true },
    category: { type: String, default: 'General Evidence' },
    isApplicable: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['Pending', 'Uploaded / Attached', 'Not Applicable'],
      default: 'Pending'
    },
    fileUrl: { type: String, default: '' },
    originalName: { type: String, default: '' },
    notes: { type: String, default: '' },
    uploadedBy: { type: String, default: '' },
    uploadedAt: { type: Date }
  }],

  // Stage 3D: Sequence-of-Events Timeline, Witness Statements & PHA / BowTie Revalidation Link
  sequenceTimeline: [{
    timestamp: { type: Date, required: true },
    phase: {
      type: String,
      enum: [
        'Pre-Incident',
        'Initiating Event',
        'Alarm / Intervention',
        'Release / Escalation',
        'Emergency Response',
        'Safe State'
      ],
      default: 'Initiating Event'
    },
    source: {
      type: String,
      enum: ['DCS / Historian', 'Field Observation', 'SIS / ESD Log', 'Witness Account', 'CCTV / Manual'],
      default: 'Field Observation'
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    actorOrSystem: { type: String, default: '' },
    isCriticalMilestone: { type: Boolean, default: false },
    addedBy: { type: String, default: '' }
  }],

  witnessStatements: [{
    witnessName: { type: String, required: true },
    role: { type: String, default: 'Operator' },
    department: { type: String, default: 'Operations' },
    shift: { type: String, default: 'Day' },
    locationAtEvent: { type: String, default: '' },
    interviewedBy: { type: String, default: '' },
    interviewDate: { type: Date, default: Date.now },
    keyObservation: { type: String, required: true },
    actionTakenByWitness: { type: String, default: '' },
    verificationStatus: {
      type: String,
      enum: ['Draft', 'Verified / Signed'],
      default: 'Draft'
    },
    attachmentUrl: { type: String, default: '' },
    attachmentName: { type: String, default: '' }
  }],

  phaBowTieLink: {
    linkedStudyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study' },
    linkedStudyName: { type: String, default: '' },
    linkedBowTieId: { type: mongoose.Schema.Types.ObjectId, ref: 'BowTie' },
    linkedBowTieEvent: { type: String, default: '' },
    scenarioIdentifiedInPha: { type: Boolean, default: false },
    invalidatedSafeguardTags: [{ type: String }],
    phaRevalidationRequired: { type: Boolean, default: false },
    revalidationStatus: {
      type: String,
      enum: ['Not Required', 'Pending Revalidation', 'In Progress', 'Completed'],
      default: 'Not Required'
    },
    revalidationNotes: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
    updatedAt: { type: Date }
  },

  auditTrail: [{
    action: String,
    actor: String,
    timestamp: { type: Date, default: Date.now },
    details: String
  }]
}, {
  timestamps: true
});

// SLA Virtuals
incidentSchema.virtual('isSlaOverdue').get(function() {
  if (this.triage && this.triage.status !== 'Pending') return false;
  return new Date() > this.managerReviewDeadline;
});

incidentSchema.virtual('slaDaysRemaining').get(function() {
  if (this.triage && this.triage.status !== 'Pending') return 0;
  const diffMs = this.managerReviewDeadline - new Date();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

incidentSchema.set('toJSON', { virtuals: true });
incidentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Incident', incidentSchema);
