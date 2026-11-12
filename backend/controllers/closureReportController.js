const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const WhyWhyNode = require('../models/WhyWhyNode');
const CAPA = require('../models/CAPA');

const SIGN_OFF_ROLES = [
  'CFT Leader',
  'Plant / Area Manager',
  'HSE / Process Safety Lead'
];

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const ensureDefaultSignOffs = (incident) => {
  const existing = incident.closureGovernance?.signOffs || [];
  if (existing.length === 0) {
    incident.closureGovernance = incident.closureGovernance || {};
    incident.closureGovernance.signOffs = SIGN_OFF_ROLES.map((role) => ({
      role,
      signerName: role === 'CFT Leader' ? (incident.cft?.leader?.name || '') : '',
      signerDesignation: role === 'CFT Leader' ? (incident.cft?.leader?.designation || '') : '',
      status: 'Pending',
      comments: ''
    }));
    return true;
  }
  return false;
};

const evaluateClosureReadiness = (incident, whyNodes = [], capas = []) => {
  const cat = incident.api754Classification?.category || incident.api754Classification?.tier || '';
  const classificationFinalized = Boolean(cat && cat !== 'Pending Classification');

  const triageCompleted = Boolean(incident.triage?.status && incident.triage.status !== 'Pending');

  const rootCauses = whyNodes.filter((n) => n.isRootCause);
  const rcaCompleted = rootCauses.length > 0;

  const totalCapas = capas.length;
  const verifiedCapas = capas.filter((c) => c.status === 'Verified & Closed').length;
  const capasVerifiedClosed = totalCapas > 0 && verifiedCapas === totalCapas;

  const barriers = incident.barrierAnalysis || [];
  const barriersEvaluated = barriers.length > 0;

  const applicableEvidence = (incident.supportingEvidence || []).filter(
    (e) => e.isApplicable && e.status !== 'Not Applicable'
  );
  const pendingEvidenceCount = applicableEvidence.filter(
    (e) => e.status !== 'Uploaded / Attached' && !e.fileUrl
  ).length;
  const evidenceComplete = pendingEvidenceCount === 0;

  const phaLink = incident.phaBowTieLink || {};
  const phaRevalidationAddressed =
    !phaLink.phaRevalidationRequired || phaLink.revalidationStatus === 'Completed';

  const checks = [
    {
      key: 'classificationFinalized',
      label: 'API RP 754 Classification Finalized',
      passed: classificationFinalized,
      detail: classificationFinalized ? `Classified as ${cat}` : 'Still marked Pending Classification (Resolve in Stage 3C).'
    },
    {
      key: 'triageCompleted',
      label: 'Manager Triage & CFT Charter Completed',
      passed: triageCompleted,
      detail: triageCompleted ? `Triage status: ${incident.triage.status}` : 'Manager triage is still Pending (Stage 2).'
    },
    {
      key: 'rcaCompleted',
      label: 'Root Cause Identified in Why-Why Tree',
      passed: rcaCompleted,
      detail: rcaCompleted
        ? `${rootCauses.length} verified root cause(s) identified (Stage 3A).`
        : 'No Why-Why node is marked as a Root Cause yet (Stage 3A).'
    },
    {
      key: 'capasVerifiedClosed',
      label: 'All CAPAs Implemented & Maker-Checker Verified',
      passed: capasVerifiedClosed,
      detail: totalCapas === 0
        ? 'At least 1 CAPA must be created and verified/closed (Stage 3B).'
        : `${verifiedCapas} of ${totalCapas} CAPA(s) verified & closed.`
    },
    {
      key: 'barriersEvaluated',
      label: 'LOPA / Swiss-Cheese Barrier Scorecard Evaluated',
      passed: barriersEvaluated,
      detail: barriersEvaluated
        ? `${barriers.length} barrier layers scored (Stage 3C).`
        : 'Open Stage 3C Barrier Scorecard to initialize & evaluate safeguards.'
    },
    {
      key: 'evidenceComplete',
      label: 'Mandatory Supporting Evidence Checklist Complete',
      passed: evidenceComplete,
      detail: evidenceComplete
        ? `All ${applicableEvidence.length} applicable evidence item(s) uploaded or marked N/A.`
        : `${pendingEvidenceCount} applicable supporting document(s) still Pending (Stage 3C).`
    },
    {
      key: 'phaRevalidationAddressed',
      label: 'PHA / BowTie Revalidation Requirement Addressed',
      passed: phaRevalidationAddressed,
      detail: phaRevalidationAddressed
        ? `Status: ${phaLink.revalidationStatus || 'Not Required'}`
        : `PHA Revalidation is marked "${phaLink.revalidationStatus}" — complete before normal closure (Stage 3D).`
    }
  ];

  const signOffs = incident.closureGovernance?.signOffs || [];
  const approvedSignOffs = signOffs.filter((s) => s.status === 'Approved').length;
  const allSignOffsApproved = signOffs.length >= SIGN_OFF_ROLES.length && approvedSignOffs === signOffs.length;
  const allChecksPassed = checks.every((c) => c.passed);

  return {
    checks,
    passedCount: checks.filter((c) => c.passed).length,
    totalChecks: checks.length,
    allChecksPassed,
    approvedSignOffs,
    totalSignOffs: signOffs.length,
    allSignOffsApproved,
    canCloseNormally: allChecksPassed && allSignOffsApproved
  };
};

// 1. Get Stage 4 Closure Governance & Executive Report Compiler Data
exports.getClosureReportWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const initialized = ensureDefaultSignOffs(incident);
    if (initialized) {
      await incident.save();
    }

    const whyNodes = await WhyWhyNode.find({ incidentId: incident._id }).sort({ whyLevel: 1, branchIndex: 1 });
    const capas = await CAPA.find({ incidentId: incident._id })
      .populate('whyNodeId', 'statement whyLevel rootCauseType api754Category api754Subcategory')
      .populate('mocReference.mocId', 'mocNumber title status')
      .sort({ targetDate: 1 });

    const readiness = evaluateClosureReadiness(incident, whyNodes, capas);

    res.json({
      incident,
      whyNodes,
      capas,
      readiness,
      lessonsLearned: incident.lessonsLearned || {
        executiveSummary: '',
        keyLessons: [],
        preventiveTakeaways: '',
        applicablePlantUnits: [],
        requiresToolboxTalk: true,
        disseminatedToShifts: false
      },
      closureGovernance: incident.closureGovernance
    });
  } catch (error) {
    console.error('Error loading Stage 4 closure workspace:', error);
    res.status(500).json({ error: 'Failed to load Closure & Final Report workspace: ' + error.message });
  }
};

// 2. Save Lessons Learned & Safety Flash Bulletin
exports.saveLessonsLearned = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const {
      executiveSummary,
      keyLessons,
      preventiveTakeaways,
      applicablePlantUnits,
      requiresToolboxTalk,
      disseminatedToShifts
    } = req.body;

    const cleanLessons = Array.isArray(keyLessons)
      ? keyLessons.map((l) => String(l).trim()).filter(Boolean)
      : String(keyLessons || '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

    const cleanUnits = Array.isArray(applicablePlantUnits)
      ? applicablePlantUnits.map((u) => String(u).trim()).filter(Boolean)
      : String(applicablePlantUnits || '')
          .split(',')
          .map((u) => u.trim())
          .filter(Boolean);

    const actor = req.user?.name || incident.cft?.leader?.name || 'CFT / HSE Lead';
    const isDisseminated = Boolean(disseminatedToShifts);

    incident.lessonsLearned = {
      executiveSummary: String(executiveSummary || '').trim(),
      keyLessons: cleanLessons,
      preventiveTakeaways: String(preventiveTakeaways || '').trim(),
      applicablePlantUnits: cleanUnits,
      requiresToolboxTalk: requiresToolboxTalk !== undefined ? Boolean(requiresToolboxTalk) : true,
      disseminatedToShifts: isDisseminated,
      disseminatedDate: isDisseminated ? (incident.lessonsLearned?.disseminatedDate || new Date()) : undefined,
      updatedBy: actor,
      updatedAt: new Date()
    };

    incident.auditTrail.push({
      action: 'Lessons Learned & Safety Flash Updated',
      actor,
      timestamp: new Date(),
      details: `${cleanLessons.length} key lesson(s) saved. Shift dissemination: ${isDisseminated ? 'Completed' : 'Pending'}.`
    });

    await incident.save();
    res.json({ lessonsLearned: incident.lessonsLearned });
  } catch (error) {
    console.error('Error saving lessons learned:', error);
    res.status(500).json({ error: 'Failed to save Lessons Learned: ' + error.message });
  }
};

// 3. Submit Digital Sign-Off (CFT Leader / Plant Manager / HSE Lead)
exports.submitClosureSignOff = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { role, signerName, signerDesignation, decision, comments } = req.body;
    if (!SIGN_OFF_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid sign-off role.' });
    }
    const cleanName = String(signerName || req.user?.name || '').trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Signer Full Name is required.' });
    }
    if (!['Approved', 'Returned for Rework'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be Approved or Returned for Rework.' });
    }

    ensureDefaultSignOffs(incident);
    const target = incident.closureGovernance.signOffs.find((s) => s.role === role);
    if (!target) {
      incident.closureGovernance.signOffs.push({ role });
    }
    const entry = incident.closureGovernance.signOffs.find((s) => s.role === role);
    entry.signerName = cleanName;
    entry.signerDesignation = String(signerDesignation || '').trim();
    entry.status = decision;
    entry.comments = String(comments || '').trim();
    entry.signedAt = new Date();

    if (decision === 'Returned for Rework' && !['Closed', 'Administratively Closed'].includes(incident.status)) {
      incident.status = 'Investigation Active';
    }

    incident.auditTrail.push({
      action: `Closure Sign-Off (${decision})`,
      actor: cleanName,
      timestamp: new Date(),
      details: `Role: ${role} | Decision: ${decision}${entry.comments ? ` | Comments: ${entry.comments}` : ''}`
    });

    await incident.save();

    const whyNodes = await WhyWhyNode.find({ incidentId: incident._id });
    const capas = await CAPA.find({ incidentId: incident._id });
    const readiness = evaluateClosureReadiness(incident, whyNodes, capas);

    res.json({
      closureGovernance: incident.closureGovernance,
      status: incident.status,
      readiness
    });
  } catch (error) {
    console.error('Error submitting closure sign-off:', error);
    res.status(500).json({ error: 'Failed to submit sign-off: ' + error.message });
  }
};

// 4. Finalize & Lock Incident Closure (Gatekeeper Enforced + Audited Override)
exports.finalizeIncidentClosure = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { mode = 'normal', overrideJustification = '', actorName } = req.body;
    const actor = String(actorName || req.user?.name || 'HSE / Site Head').trim();

    ensureDefaultSignOffs(incident);
    const whyNodes = await WhyWhyNode.find({ incidentId: incident._id });
    const capas = await CAPA.find({ incidentId: incident._id });
    const readiness = evaluateClosureReadiness(incident, whyNodes, capas);

    if (mode === 'override') {
      const cleanJust = String(overrideJustification || '').trim();
      if (cleanJust.length < 15) {
        return res.status(400).json({
          error: 'Administrative Closure override requires a detailed written justification (at least 15 characters).'
        });
      }
      incident.status = 'Administratively Closed';
      incident.closureGovernance.overrideUsed = true;
      incident.closureGovernance.overrideJustification = cleanJust;
      incident.closureGovernance.closedBy = actor;
      incident.closureGovernance.closedAt = new Date();

      incident.auditTrail.push({
        action: 'Incident Administratively Closed (Gatekeeper Override)',
        actor,
        timestamp: new Date(),
        details: `Justification: ${cleanJust}`
      });
    } else {
      if (!readiness.canCloseNormally) {
        const failedLabels = readiness.checks.filter((c) => !c.passed).map((c) => c.label);
        if (!readiness.allSignOffsApproved) {
          failedLabels.push('All 3 Governance Sign-Offs (CFT Leader, Plant Manager, HSE Lead)');
        }
        return res.status(400).json({
          error: `Closure blocked by Governance Gatekeeper. Pending items: ${failedLabels.join('; ')}`,
          readiness
        });
      }

      incident.status = 'Closed';
      incident.closureGovernance.overrideUsed = false;
      incident.closureGovernance.closedBy = actor;
      incident.closureGovernance.closedAt = new Date();

      incident.auditTrail.push({
        action: 'Incident Formally Closed',
        actor,
        timestamp: new Date(),
        details: 'All 7 compliance checks passed and all 3 digital sign-offs approved.'
      });
    }

    await incident.save();
    res.json({
      incident,
      status: incident.status,
      closureGovernance: incident.closureGovernance,
      readiness: evaluateClosureReadiness(incident, whyNodes, capas)
    });
  } catch (error) {
    console.error('Error finalizing incident closure:', error);
    res.status(500).json({ error: 'Failed to finalize incident closure: ' + error.message });
  }
};

// 5. Reopen Closed Incident (Audited)
exports.reopenIncident = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const reason = String(req.body.reason || '').trim();
    if (reason.length < 10) {
      return res.status(400).json({ error: 'Please enter a justification reason (at least 10 characters) to reopen this investigation.' });
    }

    const actor = String(req.body.actorName || req.user?.name || 'HSE / Site Head').trim();
    incident.status = 'Investigation Active';
    incident.closureGovernance = incident.closureGovernance || {};
    incident.closureGovernance.reopenedReason = reason;
    incident.closureGovernance.closedAt = undefined;

    incident.auditTrail.push({
      action: 'Closed Incident Reopened',
      actor,
      timestamp: new Date(),
      details: `Reopened Reason: ${reason}`
    });

    await incident.save();

    const whyNodes = await WhyWhyNode.find({ incidentId: incident._id });
    const capas = await CAPA.find({ incidentId: incident._id });

    res.json({
      incident,
      status: incident.status,
      closureGovernance: incident.closureGovernance,
      readiness: evaluateClosureReadiness(incident, whyNodes, capas)
    });
  } catch (error) {
    console.error('Error reopening incident:', error);
    res.status(500).json({ error: 'Failed to reopen incident: ' + error.message });
  }
};
