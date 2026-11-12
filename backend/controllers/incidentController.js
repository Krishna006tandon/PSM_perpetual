const Incident = require('../models/Incident');
const WhyWhyNode = require('../models/WhyWhyNode');
const CAPA = require('../models/CAPA');
const {
  TRC_THRESHOLDS,
  API_754_CAUSAL_FACTORS,
  evaluateApi754Tier,
  calculateTier1SeverityScore
} = require('../utils/api754Helper');

// Generate unique incident number: INC-YYYY-XXXX
const generateIncidentNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `INC-${currentYear}-`;
  
  // Find highest incident number in the current year
  const lastIncident = await Incident.findOne({
    incidentNumber: { $regex: `^${prefix}` }
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastIncident && lastIncident.incidentNumber) {
    const parts = lastIncident.incidentNumber.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) sequence = num + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

// Helper to normalize input for API 754 evaluation from flat or nested Section A-H structure
const normalizeApi754Input = (data) => {
  const natureOfEvents = Array.isArray(data.natureOfEvents) ? data.natureOfEvents : [];
  const isActualRelease = data.isActualRelease || 'No';

  const isLOPC = Boolean(
    data.isLOPC ||
    (data.materialDetails && data.materialDetails.chemicalTRC && data.materialDetails.chemicalTRC !== 'N/A') ||
    natureOfEvents.includes('Loss of Primary Containment (LOPC)') ||
    natureOfEvents.includes('Leakage from equipment, piping, flange, valve or instrument') ||
    natureOfEvents.includes('Chemical / liquid spill') ||
    natureOfEvents.includes('Toxic gas release') ||
    natureOfEvents.includes('Flammable gas / vapour release')
  );

  const chemicalTRC = data.chemicalTRC || data.materialDetails?.chemicalTRC || 'N/A';
  const releaseQuantityKg = Number(
    data.releaseQuantityKg ??
    data.materialDetails?.quantityInOneHourKg ??
    data.materialDetails?.estimatedQuantity ??
    0
  );

  const quantityUnknown = Boolean(
    data.quantityUnknown ||
    data.materialDetails?.quantityUnknown
  );

  const releaseLocation = data.releaseLocation || data.materialDetails?.releaseLocation || 'Outdoor';

  // Human Consequences
  const injuredList = Array.isArray(data.injuredPersons) ? data.injuredPersons : [];
  let fatalitiesCount = Number(data.fatalitiesCount || 0);
  let daysAwayInjuriesCount = Number(data.daysAwayInjuriesCount || 0);
  let recordableInjuriesCount = Number(data.recordableInjuriesCount || 0);
  let hospitalAdmissionThirdParty = Number(data.hospitalAdmissionThirdParty || 0);

  injuredList.forEach(p => {
    if (p.injuryType === 'Fatality' || p.medicalStatus === 'Deceased') fatalitiesCount++;
    if (p.injuryType === 'Days Away From Work (LTI)') daysAwayInjuriesCount++;
    if (p.injuryType === 'Medical Treatment Case (MTC)') recordableInjuriesCount++;
    if (p.role === 'Third Party' && p.medicalStatus === 'Hospital Admission') hospitalAdmissionThirdParty++;
  });

  const hasInjuriesPending = Boolean(
    data.hasInjuriesPending ||
    injuredList.some(p => p.medicalStatus === 'Assessment Pending')
  );

  // Fire & Explosion
  const fireDetails = data.fireExplosionDetails || data.fireExplosion || {};
  const fireExplosionOccurred = Boolean(
    data.fireExplosionOccurred ||
    fireDetails.occurred ||
    fireDetails.didFireOccur ||
    fireDetails.didExplosionOccur ||
    fireDetails.isFlashFire ||
    fireDetails.isVCE ||
    natureOfEvents.includes('Fire') ||
    natureOfEvents.includes('Explosion') ||
    natureOfEvents.includes('Flash fire')
  );

  const directCostUSD = Number(
    data.directCostUSD ??
    fireDetails.directCostUSD ??
    0
  );

  const directCostPending = Boolean(
    data.directCostPending ||
    fireDetails.directCostPending
  );

  // Emergency Measures
  const emergency = data.emergencyMeasures || data.communityImpact || {};
  const evacOrShelter = Boolean(
    data.evacOrShelter ||
    data.officiallyDeclaredEvacuationOrShelter ||
    emergency.communityEvacuation ||
    emergency.communityShelter ||
    emergency.declared
  );

  const officiallyDeclared = Boolean(
    data.officiallyDeclared ||
    emergency.officiallyDeclared ||
    data.officiallyDeclaredEvacuationOrShelter
  );

  // Barrier & Safety Systems
  const barriers = data.barrierPerformance || data.prdRelease || {};
  const isPRDOrUpset = Boolean(
    data.isPRDOrUpset ||
    barriers.prdOperated ||
    barriers.isPRDOrUpset ||
    natureOfEvents.includes('Pressure relief device (PRD) discharge')
  );

  const prdDischargeConsequences = data.prdDischargeConsequences || {
    rainout: Boolean(emergency.liquidRainout || barriers.rainout),
    unsafeLocation: Boolean(emergency.dischargeToUnsafeLocation || barriers.unsafeLocation),
    onSiteEvac: Boolean(emergency.onSiteEvacuation || barriers.onSiteEvacOrShelter),
    publicProtective: Boolean(emergency.publicProtectiveMeasures || barriers.publicProtectiveMeasures)
  };

  const isSOLChallenge = Boolean(
    data.isSOLChallenge ||
    barriers.solExceeded ||
    natureOfEvents.includes('Safe Operating Limit excursion')
  );

  const isSafetySystemDemand = Boolean(
    data.isSafetySystemDemand ||
    barriers.sisActivated ||
    barriers.interlockTripDemand ||
    natureOfEvents.includes('Safety Instrumented System (SIS) activation')
  );

  const isManagementSystemIssue = Boolean(
    data.isManagementSystemIssue ||
    barriers.safetyCriticalEquipmentFailed ||
    natureOfEvents.includes('Equipment failure / malfunction')
  );

  const isNearMiss = Boolean(
    data.isNearMiss ||
    natureOfEvents.includes('Near miss / Potential incident') ||
    (isActualRelease === 'No' && data.nearMissAssessment?.isCrediblePotential)
  );

  return {
    isLOPC,
    chemicalTRC,
    releaseLocation,
    releaseQuantityKg,
    isActualRelease,
    quantityUnknown,
    fatalitiesCount,
    daysAwayInjuriesCount,
    recordableInjuriesCount,
    hospitalAdmissionThirdParty,
    hasInjuriesPending,
    fireExplosionOccurred,
    directCostUSD,
    directCostPending,
    evacOrShelter,
    officiallyDeclared,
    isPRDOrUpset,
    prdDischargeConsequences,
    isSOLChallenge,
    isSafetySystemDemand,
    isManagementSystemIssue,
    isNearMiss
  };
};

// 1. Create FIR (First Incident Report)
exports.createIncident = async (req, res) => {
  try {
    const data = req.body;
    const incidentNumber = await generateIncidentNumber();

    // Normalize inputs and calculate API 754 classification
    const normalized = normalizeApi754Input(data);
    const classification = evaluateApi754Tier(normalized);
    let severityScore = 0;
    if (classification.category === 'Tier 1 PSE' || classification.tier === 'Tier 1') {
      severityScore = calculateTier1SeverityScore(normalized);
    }

    const newIncident = new Incident({
      ...data,
      incidentNumber,
      companyCode: req.user?.companyCode || data.companyCode || 'DEFAULT',
      reporter: {
        userId: req.user?._id || data.reporter?.userId,
        name: data.reporter?.name || req.user?.name || 'Anonymous Observer',
        department: data.reporter?.department || 'Operations',
        designation: data.reporter?.designation || 'Staff',
        contactPhone: data.reporter?.contactPhone || '',
        email: data.reporter?.email || req.user?.email || ''
      },
      api754Classification: {
        category: classification.category || classification.tier,
        tier: classification.tier,
        title: classification.title,
        badgeColor: classification.badgeColor,
        reasons: classification.reasons,
        tier1SeverityPoints: severityScore,
        manuallyOverridden: false
      },
      submittedAt: new Date(),
      managerReviewDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-Day SLA
      status: 'Submitted',
      auditTrail: [{
        action: 'FIR Submitted',
        actor: data.reporter?.name || req.user?.name || 'Reporter',
        timestamp: new Date(),
        details: `Initial report logged. Evaluated as API 754 [${classification.category || classification.tier}]. 7-Day Manager SLA clock initiated.`
      }]
    });

    const saved = await newIncident.save();
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating incident:', error);
    res.status(500).json({ error: 'Failed to submit incident report: ' + error.message });
  }
};

// 2. Get All Incidents with filtering and search
exports.getAllIncidents = async (req, res) => {
  try {
    const { status, tier, search, plantZone, slaFilter } = req.query;
    const filter = {};

    if (req.user?.companyCode && req.user.role !== 'SuperAdmin') {
      filter.companyCode = req.user.companyCode;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (tier && tier !== 'all') {
      filter.$or = [
        { 'api754Classification.tier': tier },
        { 'api754Classification.category': tier }
      ];
    }

    if (plantZone && plantZone !== 'all') {
      filter.plantZone = plantZone;
    }

    if (search) {
      filter.$or = [
        { incidentNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { 'descriptionMatrix.whatHappened': { $regex: search, $options: 'i' } },
        { plantZone: { $regex: search, $options: 'i' } }
      ];
    }

    const incidents = await Incident.find(filter).sort({ dateTime: -1 });

    // Enhance incidents with computed SLA status
    const now = new Date();
    const formatted = incidents.map(inc => {
      const isPendingReview = inc.triage?.status === 'Pending' && inc.status === 'Submitted';
      const isBreached = isPendingReview && (now > new Date(inc.managerReviewDeadline));
      const hoursLeft = Math.round((new Date(inc.managerReviewDeadline) - now) / (1000 * 60 * 60));
      const daysLeft = Math.ceil(hoursLeft / 24);

      return {
        ...inc.toObject(),
        isSlaOverdue: isBreached,
        slaHoursRemaining: isPendingReview ? hoursLeft : null,
        slaDaysRemaining: isPendingReview ? daysLeft : null
      };
    });

    // Optional SLA filter
    let finalIncidents = formatted;
    if (slaFilter === 'overdue') {
      finalIncidents = formatted.filter(i => i.isSlaOverdue);
    } else if (slaFilter === 'pending') {
      finalIncidents = formatted.filter(i => i.triage?.status === 'Pending');
    }

    res.json(finalIncidents);
  } catch (error) {
    console.error('Error fetching incidents:', error);
    res.status(500).json({ error: 'Failed to retrieve incidents: ' + error.message });
  }
};

// 3. Get KPI Stats Summary
exports.getIncidentStats = async (req, res) => {
  try {
    const filter = {};
    if (req.user?.companyCode && req.user.role !== 'SuperAdmin') {
      filter.companyCode = req.user.companyCode;
    }

    const incidents = await Incident.find(filter);
    const now = new Date();

    let total = incidents.length;
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;
    let tier4Count = 0;
    let nearMissCount = 0;
    let otherIncidentCount = 0;
    let pendingClassificationCount = 0;
    let pendingTriageCount = 0;
    let overdueSlaCount = 0;
    let activeInvestigationCount = 0;
    let closedCount = 0;

    const incidentIds = incidents.map(i => i._id);
    const activeCapas = await CAPA.find({
      incidentId: { $in: incidentIds },
      status: { $ne: 'Verified & Closed' }
    }, { targetDate: 1, status: 1 });
    const openCapaCount = activeCapas.length;
    const overdueCapaCount = activeCapas.filter(c => c.targetDate && now > new Date(c.targetDate)).length;
    const pendingCapaVerificationCount = activeCapas.filter(c => c.status === 'Submitted For Verification').length;

    incidents.forEach(inc => {
      const cat = inc.api754Classification?.category || inc.api754Classification?.tier;
      if (cat === 'Tier 1 PSE' || cat === 'Tier 1') tier1Count++;
      else if (cat === 'Tier 2 PSE' || cat === 'Tier 2') tier2Count++;
      else if (cat === 'Tier 3 Indicator' || cat === 'Tier 3') tier3Count++;
      else if (cat === 'Tier 4 Indicator' || cat === 'Tier 4') tier4Count++;
      else if (cat === 'Pending Classification' || cat?.includes('Pending')) pendingClassificationCount++;
      else if (cat === 'Other Incident') otherIncidentCount++;
      else nearMissCount++;

      if (inc.triage?.status === 'Pending') {
        pendingTriageCount++;
        if (now > new Date(inc.managerReviewDeadline)) {
          overdueSlaCount++;
        }
      }

      if (inc.status === 'Investigation Active' || inc.status === 'CAPA Pending' || inc.status === 'CAPA Verification') {
        activeInvestigationCount++;
      } else if (inc.status === 'Closed' || inc.status === 'Administratively Closed') {
        closedCount++;
      }
    });

    res.json({
      total,
      tier1Count,
      tier2Count,
      tier3Count,
      tier4Count,
      nearMissCount,
      otherIncidentCount,
      pendingClassificationCount,
      openCapaCount,
      overdueCapaCount,
      pendingCapaVerificationCount,
      pendingTriageCount,
      overdueSlaCount,
      activeInvestigationCount,
      closedCount
    });
  } catch (error) {
    console.error('Error calculating incident stats:', error);
    res.status(500).json({ error: 'Failed to compute stats: ' + error.message });
  }
};

// 4. Get Incident by ID
exports.getIncidentById = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Also fetch associated Why-Why Nodes and CAPAs
    const nodes = await WhyWhyNode.find({ incidentId: incident._id }).sort({ whyLevel: 1, branchIndex: 1 });
    const capas = await CAPA.find({ incidentId: incident._id })
      .populate('whyNodeId', 'statement whyLevel rootCauseType api754Category api754Subcategory')
      .sort({ targetDate: 1 });

    res.json({
      ...incident.toObject(),
      nodes,
      capas
    });
  } catch (error) {
    console.error('Error fetching incident by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve incident details: ' + error.message });
  }
};

// 5. Manager Triage & CFT Formation (Module 3: 7-Day SLA Workflow)
exports.triageIncident = async (req, res) => {
  try {
    const { decision, comments, cft } = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const reviewerName = req.user?.name || req.body.reviewerName || 'Plant Manager';
    const reviewerEmail = req.user?.email || req.body.reviewerEmail || '';

    // Save Section K Reviewer Declaration if provided
    if (req.body.reviewerDeclaration) {
      incident.reviewerDeclaration = {
        reviewedBy: req.body.reviewerDeclaration.reviewedBy || reviewerName,
        reviewerEmail: req.body.reviewerDeclaration.reviewerEmail || reviewerEmail,
        reviewerRole: req.body.reviewerDeclaration.reviewerRole || 'Process Safety / HSE Reviewer',
        reviewedDate: req.body.reviewerDeclaration.reviewedDate || new Date(),
        isConfirmed: req.body.reviewerDeclaration.isConfirmed ?? true,
        statement: req.body.reviewerDeclaration.statement || 'I have reviewed the information provided in this First Incident Report and assessed the event against the applicable API RP 754 criteria. The above classification represents the initial assessment based on the information currently available. The classification shall be reconfirmed following detailed incident investigation and validation of the actual consequences, release quantity, applicable threshold and supporting evidence.'
      };
    }

    if (decision === 'Administratively Closed') {
      incident.triage = {
        status: 'Administratively Closed',
        reviewedBy: {
          userId: req.user?._id,
          name: reviewerName,
          email: reviewerEmail
        },
        decisionDate: new Date(),
        comments: comments || 'Administratively closed after initial management review.'
      };
      incident.status = 'Administratively Closed';

      incident.auditTrail.push({
        action: 'Administratively Closed',
        actor: reviewerName,
        timestamp: new Date(),
        details: `Incident closed administratively. Comments: ${comments || 'No remarks'}`
      });
    } else if (decision === 'Formal Investigation Mandated') {
      if (!cft || !cft.leader || !cft.leader.name) {
        return res.status(400).json({ error: 'A Team Leader must be designated to mandate formal investigation.' });
      }

      incident.triage = {
        status: 'Formal Investigation Mandated',
        reviewedBy: {
          userId: req.user?._id,
          name: reviewerName,
          email: reviewerEmail
        },
        decisionDate: new Date(),
        comments: comments || 'Formal investigation mandated with Cross-Functional Team appointment.'
      };
      incident.cft = cft;
      incident.status = 'Investigation Active';

      incident.auditTrail.push({
        action: 'Formal Investigation Mandated & CFT Formed',
        actor: reviewerName,
        timestamp: new Date(),
        details: `Investigation mandated. Team Leader: ${cft.leader.name} (${cft.leader.department || 'EHS'}). Team Members: ${cft.members?.length || 0} appointed.`
      });

      // Auto-create initial Problem Anchor node in Why-Why tree if none exists
      const existingAnchor = await WhyWhyNode.findOne({ incidentId: incident._id, parentId: null });
      if (!existingAnchor) {
        const anchorNode = new WhyWhyNode({
          incidentId: incident._id,
          parentId: null,
          whyLevel: 0,
          statement: incident.descriptionMatrix?.whatHappened || incident.title,
          status: 'Exploring',
          isRootCause: false,
          notes: 'Initial problem anchor established from First Incident Report (FIR).'
        });
        await anchorNode.save();
      }
    } else {
      return res.status(400).json({ error: 'Invalid triage decision' });
    }

    const updated = await incident.save();
    res.json(updated);
  } catch (error) {
    console.error('Error triaging incident:', error);
    res.status(500).json({ error: 'Failed to save triage decision: ' + error.message });
  }
};

// 6. Update Incident Details / Classification Override
exports.updateIncident = async (req, res) => {
  try {
    const updateData = req.body;
    const incident = await Incident.findById(req.params.id);

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // If API 754 parameters changed, recalculate
    const merged = { ...incident.toObject(), ...updateData };
    const normalized = normalizeApi754Input(merged);
    const newCalc = evaluateApi754Tier(normalized);

    updateData.api754Classification = {
      category: updateData.api754Classification?.category || newCalc.category || newCalc.tier,
      tier: updateData.api754Classification?.tier || newCalc.tier,
      title: newCalc.title,
      badgeColor: newCalc.badgeColor,
      reasons: newCalc.reasons,
      tier1SeverityPoints: (newCalc.category === 'Tier 1 PSE' || newCalc.tier === 'Tier 1') ? calculateTier1SeverityScore(normalized) : 0,
      manuallyOverridden: updateData.api754Classification?.manuallyOverridden || false,
      overrideJustification: updateData.api754Classification?.overrideJustification || ''
    };

    Object.assign(incident, updateData);
    incident.auditTrail.push({
      action: 'Incident Updated',
      actor: req.user?.name || 'User',
      timestamp: new Date(),
      details: 'Incident fields updated.'
    });

    const saved = await incident.save();
    res.json(saved);
  } catch (error) {
    console.error('Error updating incident:', error);
    res.status(500).json({ error: 'Failed to update incident: ' + error.message });
  }
};

// 7. Delete Incident
exports.deleteIncident = async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Delete associated nodes and CAPA items
    await WhyWhyNode.deleteMany({ incidentId: incident._id });
    await CAPA.deleteMany({ incidentId: incident._id });
    await Incident.findByIdAndDelete(incident._id);

    res.json({ message: 'Incident and related records successfully deleted.' });
  } catch (error) {
    console.error('Error deleting incident:', error);
    res.status(500).json({ error: 'Failed to delete incident: ' + error.message });
  }
};

// 8. Live API 754 Evaluator (Used during FIR form input)
exports.evaluateApi754Live = (req, res) => {
  try {
    const normalized = normalizeApi754Input(req.body);
    const calc = evaluateApi754Tier(normalized);
    let severityScore = 0;
    if (calc.category === 'Tier 1 PSE' || calc.tier === 'Tier 1') {
      severityScore = calculateTier1SeverityScore(normalized);
    }
    res.json({
      category: calc.category,
      tier: calc.tier,
      title: calc.title,
      badgeColor: calc.badgeColor,
      reasons: calc.reasons,
      tier1SeverityPoints: severityScore
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to evaluate live API 754: ' + error.message });
  }
};

// 9. Get API 754 Standard Taxonomy (TRC & Causal categories)
exports.getApi754Taxonomy = (req, res) => {
  res.json({
    thresholds: TRC_THRESHOLDS,
    causalFactors: API_754_CAUSAL_FACTORS
  });
};
