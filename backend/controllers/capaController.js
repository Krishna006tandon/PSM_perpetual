const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const WhyWhyNode = require('../models/WhyWhyNode');
const CAPA = require('../models/CAPA');
const MOCTicket = require('../models/MOCTicket');

const VALID_ACTION_TYPES = ['Corrective', 'Preventive'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const VALID_STATUSES = [
  'Open',
  'In Progress',
  'Submitted For Verification',
  'Verified & Closed',
  'Rejected / Rework'
];

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const generateActionNumber = async (incident) => {
  const existing = await CAPA.find({ incidentId: incident._id }, { actionNumber: 1 });
  let maxSeq = 0;
  existing.forEach((c) => {
    const parts = String(c.actionNumber || '').split('-');
    const tail = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(tail) && tail > maxSeq) {
      maxSeq = tail;
    }
  });
  return `CAPA-${incident.incidentNumber}-${String(maxSeq + 1).padStart(2, '0')}`;
};

const createLinkedMocTicket = async (incident, capa, actorName) => {
  const count = await MOCTicket.countDocuments();
  const mocId = `MOC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  const titleBase = `[CAPA ${capa.actionNumber}] ${String(capa.description || '').slice(0, 75)}`;

  const ticket = new MOCTicket({
    mocId,
    title: titleBase,
    description: `Triggered from Incident ${incident.incidentNumber} (${incident.title}). Root-cause CAPA: ${capa.description}`,
    plant: incident.plantZone || 'Main Plant',
    department: capa.department || 'Operations',
    changeType: 'Permanent',
    riskLevel: capa.priority === 'Critical' || capa.priority === 'High' ? 'High' : 'Medium',
    urgency: capa.priority || 'Medium',
    requestor: {
      name: actorName || capa.assignee?.name || 'HSE Lead',
      designation: 'Incident Investigation / CAPA Action Owner',
      contact: capa.assignee?.email || ''
    },
    status: 'Active',
    stageHistory: [{
      stageIndex: 0,
      action: 'Submitted',
      actor: { name: actorName || 'System', designation: 'CAPA Module' },
      comments: `Auto-initiated from ${capa.actionNumber} under ${incident.incidentNumber}.`,
      timestamp: new Date()
    }]
  });

  const savedMoc = await ticket.save();
  return savedMoc;
};

const syncIncidentCapaStatus = async (incident) => {
  if (!incident) return;
  const protectedStatuses = ['Closed', 'Administratively Closed', 'Archived'];
  if (protectedStatuses.includes(incident.status)) return;

  const allCapas = await CAPA.find({ incidentId: incident._id }, { status: 1 });
  if (allCapas.length === 0) {
    if (incident.status === 'CAPA Pending' || incident.status === 'CAPA Verification') {
      incident.status = 'Investigation Active';
      await incident.save();
    }
    return;
  }

  const anySubmitted = allCapas.some((c) => c.status === 'Submitted For Verification');
  const allClosed = allCapas.every((c) => c.status === 'Verified & Closed');
  const anyReworkOrOpen = allCapas.some(
    (c) => c.status === 'Open' || c.status === 'In Progress' || c.status === 'Rejected / Rework'
  );

  let targetStatus = incident.status;
  if (allClosed) {
    targetStatus = 'CAPA Verification';
  } else if (anySubmitted && !anyReworkOrOpen) {
    targetStatus = 'CAPA Verification';
  } else {
    targetStatus = 'CAPA Pending';
  }

  if (incident.status !== targetStatus) {
    incident.status = targetStatus;
    await incident.save();
  }
};

const computeCapaSummary = (capas) => {
  const now = new Date();
  let open = 0;
  let inProgress = 0;
  let submittedForVerification = 0;
  let verifiedAndClosed = 0;
  let rejected = 0;
  let overdueCount = 0;
  let correctiveCount = 0;
  let preventiveCount = 0;
  let escalatedCount = 0;

  const formatted = capas.map((doc) => {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    const isClosed = obj.status === 'Verified & Closed';
    const isOverdue = Boolean(!isClosed && obj.targetDate && now > new Date(obj.targetDate));
    const daysRemaining = obj.targetDate
      ? Math.ceil((new Date(obj.targetDate) - now) / (1000 * 60 * 60 * 24))
      : null;

    if (obj.status === 'Open') open++;
    else if (obj.status === 'In Progress') inProgress++;
    else if (obj.status === 'Submitted For Verification') submittedForVerification++;
    else if (obj.status === 'Verified & Closed') verifiedAndClosed++;
    else if (obj.status === 'Rejected / Rework') rejected++;

    if (isOverdue) overdueCount++;
    if (obj.actionType === 'Corrective') correctiveCount++;
    else if (obj.actionType === 'Preventive') preventiveCount++;
    if (obj.escalation?.isEscalated) escalatedCount++;

    return {
      ...obj,
      isOverdue,
      daysRemaining
    };
  });

  const total = formatted.length;
  const completionRate = total > 0 ? Math.round((verifiedAndClosed / total) * 100) : 0;

  return {
    capas: formatted,
    summary: {
      total,
      open,
      inProgress,
      submittedForVerification,
      verifiedAndClosed,
      rejected,
      overdueCount,
      correctiveCount,
      preventiveCount,
      escalatedCount,
      completionRate,
      readyForClosure: total > 0 && verifiedAndClosed === total
    }
  };
};

// 1. Get all CAPAs for an incident
exports.getIncidentCapas = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const [capas, nodes] = await Promise.all([
      CAPA.find({ incidentId: incident._id })
        .populate('whyNodeId', 'statement whyLevel rootCauseType api754Category api754Subcategory')
        .sort({ targetDate: 1, createdAt: -1 }),
      WhyWhyNode.find({ incidentId: incident._id }).sort({ whyLevel: 1, branchIndex: 1 })
    ]);

    const result = computeCapaSummary(capas);
    res.json({
      incidentId: incident._id,
      incidentNumber: incident.incidentNumber,
      incidentStatus: incident.status,
      whyNodes: nodes,
      ...result
    });
  } catch (error) {
    console.error('Error fetching incident CAPAs:', error);
    res.status(500).json({ error: 'Failed to retrieve CAPA items: ' + error.message });
  }
};

// 2. Upload Before / After Verification Photo
exports.uploadCapaPhoto = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }
    const fileUrl = `/uploads/capa/${req.file.filename}`;
    res.status(201).json({
      fileUrl,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading CAPA photo:', error);
    res.status(500).json({ error: 'Failed to upload CAPA photo: ' + error.message });
  }
};

// 3. Create a new CAPA item linked to Incident (and optionally WhyWhyNode & MOC)
exports.createCapa = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const {
      whyNodeId,
      actionType,
      description,
      department,
      assignee,
      targetDate,
      priority,
      requiresMoc,
      mocNumber,
      autoCreateMoc
    } = req.body;

    if (!description || !String(description).trim()) {
      return res.status(400).json({ error: 'CAPA action description is required.' });
    }
    if (!VALID_ACTION_TYPES.includes(actionType)) {
      return res.status(400).json({ error: 'Action type must be Corrective or Preventive.' });
    }
    if (!department || !String(department).trim()) {
      return res.status(400).json({ error: 'Responsible department is required.' });
    }
    if (!assignee || !assignee.name || !String(assignee.name).trim()) {
      return res.status(400).json({ error: 'Assignee name is required.' });
    }
    if (!targetDate) {
      return res.status(400).json({ error: 'Target completion date is required.' });
    }

    let resolvedWhyNodeId = null;
    if (whyNodeId) {
      if (!validateObjectId(whyNodeId)) {
        return res.status(400).json({ error: 'Invalid Why-Why node ID' });
      }
      const linkedNode = await WhyWhyNode.findOne({ _id: whyNodeId, incidentId: incident._id });
      if (!linkedNode) {
        return res.status(404).json({ error: 'Linked Why-Why node not found on this incident.' });
      }
      resolvedWhyNodeId = linkedNode._id;
    }

    const actionNumber = await generateActionNumber(incident);
    const resolvedPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
    const actor = req.user?.name || req.body.createdBy || incident.cft?.leader?.name || 'CFT Lead';

    const capaDoc = new CAPA({
      incidentId: incident._id,
      whyNodeId: resolvedWhyNodeId,
      actionNumber,
      actionType,
      description: String(description).trim(),
      department: String(department).trim(),
      assignee: {
        name: String(assignee.name).trim(),
        email: String(assignee.email || '').trim(),
        designation: String(assignee.designation || '').trim()
      },
      targetDate: new Date(targetDate),
      priority: resolvedPriority,
      status: 'Open',
      mocReference: {
        requiresMoc: Boolean(requiresMoc || autoCreateMoc || mocNumber),
        mocNumber: String(mocNumber || '').trim()
      }
    });

    if (autoCreateMoc) {
      const savedMoc = await createLinkedMocTicket(incident, capaDoc, actor);
      capaDoc.mocReference.requiresMoc = true;
      capaDoc.mocReference.mocId = savedMoc._id;
      capaDoc.mocReference.mocNumber = savedMoc.mocId;
    }

    const savedCapa = await capaDoc.save();

    incident.auditTrail.push({
      action: 'CAPA Action Assigned',
      actor,
      timestamp: new Date(),
      details: `${savedCapa.actionNumber} [${savedCapa.actionType}, ${savedCapa.priority}] assigned to ${savedCapa.assignee.name} (${savedCapa.department}), due ${new Date(savedCapa.targetDate).toLocaleDateString()}.${savedCapa.mocReference?.mocNumber ? ` Linked MOC: ${savedCapa.mocReference.mocNumber}` : ''}`
    });
    await incident.save();
    await syncIncidentCapaStatus(incident);

    const populated = await CAPA.findById(savedCapa._id).populate(
      'whyNodeId',
      'statement whyLevel rootCauseType api754Category api754Subcategory'
    );
    const { capas } = computeCapaSummary([populated]);
    res.status(201).json(capas[0]);
  } catch (error) {
    console.error('Error creating CAPA:', error);
    res.status(500).json({ error: 'Failed to create CAPA item: ' + error.message });
  }
};

// 4. Update CAPA details or transition between Open / In Progress
exports.updateCapa = async (req, res) => {
  try {
    const { id, capaId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(capaId)) {
      return res.status(400).json({ error: 'Invalid incident or CAPA ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const capa = await CAPA.findOne({ _id: capaId, incidentId: incident._id });
    if (!capa) return res.status(404).json({ error: 'CAPA item not found' });

    const {
      whyNodeId,
      actionType,
      description,
      department,
      assignee,
      targetDate,
      priority,
      status,
      requiresMoc,
      mocNumber
    } = req.body;

    if (Object.prototype.hasOwnProperty.call(req.body, 'whyNodeId')) {
      if (!whyNodeId) {
        capa.whyNodeId = null;
      } else {
        if (!validateObjectId(whyNodeId)) {
          return res.status(400).json({ error: 'Invalid Why-Why node ID' });
        }
        const node = await WhyWhyNode.findOne({ _id: whyNodeId, incidentId: incident._id });
        if (!node) return res.status(404).json({ error: 'Linked Why-Why node not found' });
        capa.whyNodeId = node._id;
      }
    }

    if (actionType && VALID_ACTION_TYPES.includes(actionType)) capa.actionType = actionType;
    if (description && String(description).trim()) capa.description = String(description).trim();
    if (department && String(department).trim()) capa.department = String(department).trim();
    if (priority && VALID_PRIORITIES.includes(priority)) capa.priority = priority;
    if (targetDate) capa.targetDate = new Date(targetDate);

    if (assignee && assignee.name) {
      capa.assignee = {
        name: String(assignee.name).trim(),
        email: String(assignee.email || '').trim(),
        designation: String(assignee.designation || '').trim()
      };
    }

    if (status && VALID_STATUSES.includes(status)) {
      capa.status = status;
    }

    if (
      Object.prototype.hasOwnProperty.call(req.body, 'requiresMoc') ||
      Object.prototype.hasOwnProperty.call(req.body, 'mocNumber')
    ) {
      capa.mocReference = {
        ...capa.mocReference,
        requiresMoc: Object.prototype.hasOwnProperty.call(req.body, 'requiresMoc')
          ? Boolean(requiresMoc)
          : capa.mocReference?.requiresMoc,
        mocNumber: Object.prototype.hasOwnProperty.call(req.body, 'mocNumber')
          ? String(mocNumber || '').trim()
          : (capa.mocReference?.mocNumber || '')
      };
    }

    await capa.save();
    await syncIncidentCapaStatus(incident);

    const populated = await CAPA.findById(capa._id).populate(
      'whyNodeId',
      'statement whyLevel rootCauseType api754Category api754Subcategory'
    );
    const { capas } = computeCapaSummary([populated]);
    res.json(capas[0]);
  } catch (error) {
    console.error('Error updating CAPA:', error);
    res.status(500).json({ error: 'Failed to update CAPA item: ' + error.message });
  }
};

// 5. Maker Step: Action Owner submits CAPA completion with Before/After Photos & Notes
exports.submitCapaForVerification = async (req, res) => {
  try {
    const { id, capaId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(capaId)) {
      return res.status(400).json({ error: 'Invalid incident or CAPA ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const capa = await CAPA.findOne({ _id: capaId, incidentId: incident._id });
    if (!capa) return res.status(404).json({ error: 'CAPA item not found' });

    const { assigneeNotes, beforePhotoUrl, afterPhotoUrl, submittedBy } = req.body;
    if (!assigneeNotes || !String(assigneeNotes).trim()) {
      return res.status(400).json({ error: 'Completion implementation notes are required before submitting for verification.' });
    }

    const actor = String(submittedBy || req.user?.name || capa.assignee?.name || 'Action Owner').trim();

    capa.status = 'Submitted For Verification';
    capa.verification = {
      ...(capa.verification || {}),
      assigneeNotes: String(assigneeNotes).trim(),
      beforePhotoUrl: String(beforePhotoUrl || '').trim(),
      afterPhotoUrl: String(afterPhotoUrl || '').trim(),
      submittedAt: new Date(),
      submittedBy: actor,
      isAccepted: undefined
    };

    await capa.save();

    incident.auditTrail.push({
      action: 'CAPA Submitted For Verification',
      actor,
      timestamp: new Date(),
      details: `${capa.actionNumber} submitted for HSE/CFT effectiveness verification.`
    });
    await incident.save();
    await syncIncidentCapaStatus(incident);

    const populated = await CAPA.findById(capa._id).populate(
      'whyNodeId',
      'statement whyLevel rootCauseType api754Category api754Subcategory'
    );
    const { capas } = computeCapaSummary([populated]);
    res.json(capas[0]);
  } catch (error) {
    console.error('Error submitting CAPA for verification:', error);
    res.status(500).json({ error: 'Failed to submit CAPA for verification: ' + error.message });
  }
};

// 6. Checker Step: HSE / CFT Lead reviews evidence and Approves or Rejects for Rework
exports.verifyCapa = async (req, res) => {
  try {
    const { id, capaId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(capaId)) {
      return res.status(400).json({ error: 'Invalid incident or CAPA ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const capa = await CAPA.findOne({ _id: capaId, incidentId: incident._id });
    if (!capa) return res.status(404).json({ error: 'CAPA item not found' });

    const { decision, reviewComments, reviewedBy } = req.body;
    if (!['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: 'Decision must be "approve" or "reject".' });
    }

    const trimmedComments = String(reviewComments || '').trim();
    if (decision === 'reject' && !trimmedComments) {
      return res.status(400).json({ error: 'Review comments / rework instructions are required when rejecting a CAPA.' });
    }

    const reviewer = String(reviewedBy || req.user?.name || incident.cft?.leader?.name || 'HSE Verifier').trim();
    const isApproved = decision === 'approve';

    capa.status = isApproved ? 'Verified & Closed' : 'Rejected / Rework';
    capa.verification = {
      ...(capa.verification || {}),
      reviewedBy: reviewer,
      reviewedAt: new Date(),
      reviewComments: trimmedComments || 'Verified effective and closed.',
      isAccepted: isApproved
    };

    await capa.save();

    incident.auditTrail.push({
      action: isApproved ? 'CAPA Verified & Closed' : 'CAPA Rejected / Rework Required',
      actor: reviewer,
      timestamp: new Date(),
      details: `${capa.actionNumber} ${isApproved ? 'verified and closed' : 'returned for rework'}. Remarks: ${capa.verification.reviewComments}`
    });
    await incident.save();
    await syncIncidentCapaStatus(incident);

    const populated = await CAPA.findById(capa._id).populate(
      'whyNodeId',
      'statement whyLevel rootCauseType api754Category api754Subcategory'
    );
    const { capas } = computeCapaSummary([populated]);
    res.json(capas[0]);
  } catch (error) {
    console.error('Error verifying CAPA:', error);
    res.status(500).json({ error: 'Failed to record CAPA verification: ' + error.message });
  }
};

// 7. Escalate overdue or blocked CAPA
exports.escalateCapa = async (req, res) => {
  try {
    const { id, capaId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(capaId)) {
      return res.status(400).json({ error: 'Invalid incident or CAPA ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const capa = await CAPA.findOne({ _id: capaId, incidentId: incident._id });
    if (!capa) return res.status(404).json({ error: 'CAPA item not found' });

    const reason = String(req.body.escalationReason || '').trim() || 'Overdue action escalated to Plant Leadership.';
    const actor = req.user?.name || req.body.escalatedBy || incident.cft?.leader?.name || 'HSE Lead';

    capa.escalation = {
      isEscalated: true,
      escalationDate: new Date(),
      escalationReason: reason
    };
    await capa.save();

    incident.auditTrail.push({
      action: 'CAPA Escalated',
      actor,
      timestamp: new Date(),
      details: `${capa.actionNumber} escalated. Reason: ${reason}`
    });
    await incident.save();

    const populated = await CAPA.findById(capa._id).populate(
      'whyNodeId',
      'statement whyLevel rootCauseType api754Category api754Subcategory'
    );
    const { capas } = computeCapaSummary([populated]);
    res.json(capas[0]);
  } catch (error) {
    console.error('Error escalating CAPA:', error);
    res.status(500).json({ error: 'Failed to escalate CAPA: ' + error.message });
  }
};

// 8. One-Click Initiate Linked MOC Ticket from CAPA
exports.initiateCapaMoc = async (req, res) => {
  try {
    const { id, capaId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(capaId)) {
      return res.status(400).json({ error: 'Invalid incident or CAPA ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const capa = await CAPA.findOne({ _id: capaId, incidentId: incident._id });
    if (!capa) return res.status(404).json({ error: 'CAPA item not found' });

    if (capa.mocReference?.mocNumber) {
      return res.status(400).json({ error: `CAPA is already linked to MOC ${capa.mocReference.mocNumber}` });
    }

    const actor = req.user?.name || req.body.actor || incident.cft?.leader?.name || 'HSE Lead';
    const savedMoc = await createLinkedMocTicket(incident, capa, actor);

    capa.mocReference = {
      requiresMoc: true,
      mocId: savedMoc._id,
      mocNumber: savedMoc.mocId
    };
    await capa.save();

    incident.auditTrail.push({
      action: 'MOC Initiated from CAPA',
      actor,
      timestamp: new Date(),
      details: `Created ${savedMoc.mocId} for ${capa.actionNumber}.`
    });
    await incident.save();

    const populated = await CAPA.findById(capa._id).populate(
      'whyNodeId',
      'statement whyLevel rootCauseType api754Category api754Subcategory'
    );
    const { capas } = computeCapaSummary([populated]);
    res.status(201).json({ capa: capas[0], moc: savedMoc });
  } catch (error) {
    console.error('Error initiating MOC from CAPA:', error);
    res.status(500).json({ error: 'Failed to initiate MOC ticket: ' + error.message });
  }
};

// 9. Delete CAPA item
exports.deleteCapa = async (req, res) => {
  try {
    const { id, capaId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(capaId)) {
      return res.status(400).json({ error: 'Invalid incident or CAPA ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const deleted = await CAPA.findOneAndDelete({ _id: capaId, incidentId: incident._id });
    if (!deleted) return res.status(404).json({ error: 'CAPA item not found' });

    const actor = req.user?.name || incident.cft?.leader?.name || 'CFT Lead';
    incident.auditTrail.push({
      action: 'CAPA Action Removed',
      actor,
      timestamp: new Date(),
      details: `Removed ${deleted.actionNumber} ("${deleted.description.slice(0, 60)}").`
    });
    await incident.save();
    await syncIncidentCapaStatus(incident);

    res.json({ message: 'CAPA item deleted successfully.', deletedId: deleted._id });
  } catch (error) {
    console.error('Error deleting CAPA:', error);
    res.status(500).json({ error: 'Failed to delete CAPA item: ' + error.message });
  }
};
