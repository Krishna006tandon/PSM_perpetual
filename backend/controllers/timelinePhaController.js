const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const Study = require('../models/Study');
const BowTie = require('../models/BowTie');

const VALID_TIMELINE_PHASES = [
  'Pre-Incident',
  'Initiating Event',
  'Alarm / Intervention',
  'Release / Escalation',
  'Emergency Response',
  'Safe State'
];

const VALID_TIMELINE_SOURCES = [
  'DCS / Historian',
  'Field Observation',
  'SIS / ESD Log',
  'Witness Account',
  'CCTV / Manual'
];

const VALID_WITNESS_STATUSES = ['Draft', 'Verified / Signed'];
const VALID_REVAL_STATUSES = ['Not Required', 'Pending Revalidation', 'In Progress', 'Completed'];

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sortTimelineChronologically = (items = []) => {
  return [...items].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

const computeStage3DSummary = (incident) => {
  const timeline = incident.sequenceTimeline || [];
  const witnesses = incident.witnessStatements || [];
  const phaLink = incident.phaBowTieLink || {};

  const verifiedWitnesses = witnesses.filter((w) => w.verificationStatus === 'Verified / Signed').length;
  const criticalMilestones = timeline.filter((t) => t.isCriticalMilestone).length;

  return {
    timelineCount: timeline.length,
    criticalMilestones,
    witnessCount: witnesses.length,
    verifiedWitnesses,
    hasPhaLink: Boolean(phaLink.linkedStudyId || phaLink.linkedBowTieId),
    phaRevalidationRequired: Boolean(phaLink.phaRevalidationRequired),
    revalidationStatus: phaLink.revalidationStatus || 'Not Required'
  };
};

// 1. Get Stage 3D Workspace (SOE Timeline, Witness Statements, PHA/BowTie Catalog & Link)
exports.getStage3DWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    // Auto-seed T0 anchor event on first Stage 3D visit if timeline is empty
    if (!incident.sequenceTimeline || incident.sequenceTimeline.length === 0) {
      incident.sequenceTimeline = [
        {
          timestamp: incident.dateTime || incident.createdAt || new Date(),
          phase: 'Initiating Event',
          source: 'Field Observation',
          title: `T0 — Initial Event Reported (${incident.title})`,
          description: incident.descriptionMatrix?.whatHappened || 'Initial event recorded in First Incident Report (FIR).',
          actorOrSystem: incident.equipmentTag || incident.plantZone || 'Process Unit',
          isCriticalMilestone: true,
          addedBy: incident.reporter?.name || 'System'
        }
      ];
      await incident.save();
    }

    // Fetch existing PHA Studies & BowTie models for cross-linking
    const studyFilter = {};
    if (req.user?.companyCode && req.user.role !== 'SuperAdmin') {
      studyFilter.companyCode = req.user.companyCode;
    } else if (incident.companyCode && incident.companyCode !== 'DEFAULT') {
      studyFilter.$or = [{ companyCode: incident.companyCode }, { companyCode: { $exists: false } }, { companyCode: '' }];
    }

    const studies = await Study.find(studyFilter, {
      studyName: 1,
      phaType: 1,
      plantUnit: 1,
      facility: 1,
      studyStatus: 1
    }).sort({ createdAt: -1 }).limit(100);

    const studyIds = studies.map((s) => s._id);
    const bowTies = studyIds.length > 0
      ? await BowTie.find({ studyId: { $in: studyIds } }, {
          studyId: 1,
          eventName: 1,
          section: 1,
          barriers: 1
        }).limit(250)
      : [];

    const formattedBowTies = bowTies.map((bt) => {
      const safeguardTags = [];
      (bt.barriers || []).forEach((b) => {
        (b.pb_tag_no || []).forEach((t) => {
          if (t && !safeguardTags.includes(t)) safeguardTags.push(t);
        });
      });
      return {
        _id: bt._id,
        studyId: bt.studyId,
        eventName: bt.eventName,
        section: bt.section || '',
        barrierCount: (bt.barriers || []).length,
        safeguardTags
      };
    });

    const sortedTimeline = sortTimelineChronologically(incident.sequenceTimeline || []);

    res.json({
      incidentId: incident._id,
      incidentNumber: incident.incidentNumber,
      incidentDateTime: incident.dateTime,
      sequenceTimeline: sortedTimeline,
      witnessStatements: incident.witnessStatements || [],
      phaBowTieLink: incident.phaBowTieLink || {
        scenarioIdentifiedInPha: false,
        invalidatedSafeguardTags: [],
        phaRevalidationRequired: false,
        revalidationStatus: 'Not Required',
        revalidationNotes: ''
      },
      studies,
      bowTies: formattedBowTies,
      summary: computeStage3DSummary(incident)
    });
  } catch (error) {
    console.error('Error loading Stage 3D workspace:', error);
    res.status(500).json({ error: 'Failed to load Timeline, Witness & PHA workspace: ' + error.message });
  }
};

// 2. Add or Update Sequence-of-Events Timeline Entry
exports.upsertTimelineEvent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { eventId, timestamp, phase, source, title, description, actorOrSystem, isCriticalMilestone } = req.body;
    const cleanTitle = String(title || '').trim();
    if (!cleanTitle) {
      return res.status(400).json({ error: 'Timeline event title is required.' });
    }

    const parsedDate = timestamp ? new Date(timestamp) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Valid event timestamp is required.' });
    }

    const actor = req.user?.name || incident.cft?.leader?.name || 'CFT Investigator';
    const resolvedPhase = VALID_TIMELINE_PHASES.includes(phase) ? phase : 'Initiating Event';
    const resolvedSource = VALID_TIMELINE_SOURCES.includes(source) ? source : 'Field Observation';

    if (eventId) {
      const target = incident.sequenceTimeline.id(eventId);
      if (!target) return res.status(404).json({ error: 'Timeline event not found.' });
      target.timestamp = parsedDate;
      target.phase = resolvedPhase;
      target.source = resolvedSource;
      target.title = cleanTitle;
      target.description = String(description || '').trim();
      target.actorOrSystem = String(actorOrSystem || '').trim();
      target.isCriticalMilestone = Boolean(isCriticalMilestone);
    } else {
      incident.sequenceTimeline.push({
        timestamp: parsedDate,
        phase: resolvedPhase,
        source: resolvedSource,
        title: cleanTitle,
        description: String(description || '').trim(),
        actorOrSystem: String(actorOrSystem || '').trim(),
        isCriticalMilestone: Boolean(isCriticalMilestone),
        addedBy: actor
      });
    }

    incident.sequenceTimeline = sortTimelineChronologically(incident.sequenceTimeline);
    incident.auditTrail.push({
      action: eventId ? 'SOE Timeline Event Updated' : 'SOE Timeline Event Added',
      actor,
      timestamp: new Date(),
      details: `[${resolvedPhase}] ${cleanTitle} (${parsedDate.toISOString()})`
    });

    await incident.save();
    res.json({
      sequenceTimeline: sortTimelineChronologically(incident.sequenceTimeline),
      summary: computeStage3DSummary(incident)
    });
  } catch (error) {
    console.error('Error saving timeline event:', error);
    res.status(500).json({ error: 'Failed to save timeline event: ' + error.message });
  }
};

// 3. Delete Timeline Event
exports.deleteTimelineEvent = async (req, res) => {
  try {
    const { id, eventId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(eventId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const item = incident.sequenceTimeline.id(eventId);
    if (!item) return res.status(404).json({ error: 'Timeline event not found' });

    item.deleteOne();
    await incident.save();

    res.json({
      sequenceTimeline: sortTimelineChronologically(incident.sequenceTimeline),
      summary: computeStage3DSummary(incident)
    });
  } catch (error) {
    console.error('Error deleting timeline event:', error);
    res.status(500).json({ error: 'Failed to delete timeline event: ' + error.message });
  }
};

// 4. Upload Signed Witness Statement Attachment
exports.uploadWitnessAttachment = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No statement file selected for upload.' });
    }
    res.status(201).json({
      attachmentUrl: `/uploads/witnesses/${req.file.filename}`,
      attachmentName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading witness attachment:', error);
    res.status(500).json({ error: 'Failed to upload witness statement file: ' + error.message });
  }
};

// 5. Add or Update Witness Statement
exports.upsertWitnessStatement = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const {
      witnessId,
      witnessName,
      role,
      department,
      shift,
      locationAtEvent,
      interviewedBy,
      interviewDate,
      keyObservation,
      actionTakenByWitness,
      verificationStatus,
      attachmentUrl,
      attachmentName
    } = req.body;

    const cleanName = String(witnessName || '').trim();
    const cleanObs = String(keyObservation || '').trim();
    if (!cleanName || !cleanObs) {
      return res.status(400).json({ error: 'Witness Name and Key Observation are required.' });
    }

    const actor = req.user?.name || incident.cft?.leader?.name || 'CFT Investigator';
    const resolvedStatus = VALID_WITNESS_STATUSES.includes(verificationStatus) ? verificationStatus : 'Draft';

    if (witnessId) {
      const target = incident.witnessStatements.id(witnessId);
      if (!target) return res.status(404).json({ error: 'Witness statement not found.' });
      target.witnessName = cleanName;
      target.role = String(role || 'Operator').trim();
      target.department = String(department || 'Operations').trim();
      target.shift = String(shift || 'Day').trim();
      target.locationAtEvent = String(locationAtEvent || '').trim();
      target.interviewedBy = String(interviewedBy || actor).trim();
      if (interviewDate) target.interviewDate = new Date(interviewDate);
      target.keyObservation = cleanObs;
      target.actionTakenByWitness = String(actionTakenByWitness || '').trim();
      target.verificationStatus = resolvedStatus;
      if (Object.prototype.hasOwnProperty.call(req.body, 'attachmentUrl')) {
        target.attachmentUrl = String(attachmentUrl || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'attachmentName')) {
        target.attachmentName = String(attachmentName || '').trim();
      }
    } else {
      incident.witnessStatements.push({
        witnessName: cleanName,
        role: String(role || 'Operator').trim(),
        department: String(department || 'Operations').trim(),
        shift: String(shift || 'Day').trim(),
        locationAtEvent: String(locationAtEvent || '').trim(),
        interviewedBy: String(interviewedBy || actor).trim(),
        interviewDate: interviewDate ? new Date(interviewDate) : new Date(),
        keyObservation: cleanObs,
        actionTakenByWitness: String(actionTakenByWitness || '').trim(),
        verificationStatus: resolvedStatus,
        attachmentUrl: String(attachmentUrl || '').trim(),
        attachmentName: String(attachmentName || '').trim()
      });
    }

    incident.auditTrail.push({
      action: witnessId ? 'Witness Statement Updated' : 'Witness Statement Recorded',
      actor,
      timestamp: new Date(),
      details: `Witness: ${cleanName} (${role || 'Operator'}) — status [${resolvedStatus}].`
    });

    await incident.save();
    res.json({
      witnessStatements: incident.witnessStatements,
      summary: computeStage3DSummary(incident)
    });
  } catch (error) {
    console.error('Error saving witness statement:', error);
    res.status(500).json({ error: 'Failed to save witness statement: ' + error.message });
  }
};

// 6. Delete Witness Statement
exports.deleteWitnessStatement = async (req, res) => {
  try {
    const { id, witnessId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(witnessId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const item = incident.witnessStatements.id(witnessId);
    if (!item) return res.status(404).json({ error: 'Witness statement not found' });

    item.deleteOne();
    await incident.save();

    res.json({
      witnessStatements: incident.witnessStatements,
      summary: computeStage3DSummary(incident)
    });
  } catch (error) {
    console.error('Error deleting witness statement:', error);
    res.status(500).json({ error: 'Failed to delete witness statement: ' + error.message });
  }
};

// 7. Save PHA / HAZOP / BowTie Revalidation Link
exports.savePhaBowTieLink = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const {
      linkedStudyId,
      linkedBowTieId,
      scenarioIdentifiedInPha,
      invalidatedSafeguardTags,
      phaRevalidationRequired,
      revalidationStatus,
      revalidationNotes
    } = req.body;

    let linkedStudyName = '';
    if (linkedStudyId && validateObjectId(linkedStudyId)) {
      const study = await Study.findById(linkedStudyId, { studyName: 1, phaType: 1 });
      if (study) linkedStudyName = `${study.studyName} (${study.phaType || 'HAZOP'})`;
    }

    let linkedBowTieEvent = '';
    if (linkedBowTieId && validateObjectId(linkedBowTieId)) {
      const bt = await BowTie.findById(linkedBowTieId, { eventName: 1 });
      if (bt) linkedBowTieEvent = bt.eventName;
    }

    const tags = Array.isArray(invalidatedSafeguardTags)
      ? invalidatedSafeguardTags.map((t) => String(t).trim()).filter(Boolean)
      : String(invalidatedSafeguardTags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);

    const needsReval = Boolean(phaRevalidationRequired);
    let resolvedRevalStatus = VALID_REVAL_STATUSES.includes(revalidationStatus)
      ? revalidationStatus
      : needsReval
      ? 'Pending Revalidation'
      : 'Not Required';

    if (needsReval && resolvedRevalStatus === 'Not Required') {
      resolvedRevalStatus = 'Pending Revalidation';
    }

    const actor = req.user?.name || incident.cft?.leader?.name || 'HSE / PHA Lead';

    incident.phaBowTieLink = {
      linkedStudyId: linkedStudyId && validateObjectId(linkedStudyId) ? linkedStudyId : undefined,
      linkedStudyName,
      linkedBowTieId: linkedBowTieId && validateObjectId(linkedBowTieId) ? linkedBowTieId : undefined,
      linkedBowTieEvent,
      scenarioIdentifiedInPha: Boolean(scenarioIdentifiedInPha),
      invalidatedSafeguardTags: tags,
      phaRevalidationRequired: needsReval,
      revalidationStatus: resolvedRevalStatus,
      revalidationNotes: String(revalidationNotes || '').trim(),
      updatedBy: actor,
      updatedAt: new Date()
    };

    incident.auditTrail.push({
      action: 'PHA / BowTie Link Updated',
      actor,
      timestamp: new Date(),
      details: `Linked Study: ${linkedStudyName || 'None'} | BowTie: ${linkedBowTieEvent || 'None'} | PHA Revalidation: ${resolvedRevalStatus}.`
    });

    await incident.save();
    res.json({
      phaBowTieLink: incident.phaBowTieLink,
      summary: computeStage3DSummary(incident)
    });
  } catch (error) {
    console.error('Error saving PHA / BowTie link:', error);
    res.status(500).json({ error: 'Failed to save PHA / BowTie link: ' + error.message });
  }
};
