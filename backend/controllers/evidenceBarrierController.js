const mongoose = require('mongoose');
const Incident = require('../models/Incident');
const incidentController = require('./incidentController');
const { evaluateApi754Tier, calculateTier1SeverityScore } = require('../utils/api754Helper');

const VALID_BARRIER_STATUSES = [
  'Worked as Intended',
  'Failed / Degraded',
  'Bypassed / Defeated',
  'Missing / Not Installed',
  'Not Applicable'
];

const VALID_BARRIER_TYPES = ['Prevention', 'Mitigation'];
const VALID_EVIDENCE_STATUSES = ['Pending', 'Uploaded / Attached', 'Not Applicable'];

const validateObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildDefaultBarriers = (incident) => {
  const bp = incident.barrierPerformance || {};
  const em = incident.emergencyMeasures || {};

  return [
    {
      layerName: '1. Operating Procedures & Permit-to-Work (SOP / PTW / LOTO)',
      barrierType: 'Prevention',
      safeguardTag: 'Administrative / Procedural',
      status: incident.isActualRelease === 'Yes' ? 'Failed / Degraded' : 'Not Applicable',
      failureReason: ''
    },
    {
      layerName: '2. Basic Process Control & Safe Operating Limits (BPCS / SOL)',
      barrierType: 'Prevention',
      safeguardTag: bp.setPoint ? `Set point: ${bp.setPoint}` : 'BPCS Loop / SOL',
      status: bp.solExceeded ? 'Failed / Degraded' : 'Not Applicable',
      failureReason: bp.solExceeded ? 'Safe Operating Limit exceeded during event.' : ''
    },
    {
      layerName: '3. Process Alarms & Operator Intervention',
      barrierType: 'Prevention',
      safeguardTag: 'DCS Alarm / Operator Action',
      status: incident.nearMissAssessment?.barrierPreventedEscalation ? 'Worked as Intended' : 'Not Applicable',
      failureReason: incident.nearMissAssessment?.safeguardThatPrevented || ''
    },
    {
      layerName: '4. Safety Instrumented System / Emergency Shutdown (SIS / ESD / Interlock)',
      barrierType: 'Prevention',
      safeguardTag: bp.equipmentTag || 'SIS / ESD',
      status: bp.sisActivated || bp.interlockTripDemand
        ? (bp.performedAsIntended === false ? 'Failed / Degraded' : 'Worked as Intended')
        : 'Not Applicable',
      failureReason: ''
    },
    {
      layerName: '5. Primary Mechanical Containment (Piping, Vessels, Seals, Flanges)',
      barrierType: 'Prevention',
      safeguardTag: incident.equipmentTag || 'Primary Equipment',
      status: incident.isActualRelease === 'Yes' || incident.isLOPC ? 'Failed / Degraded' : 'Worked as Intended',
      failureReason: incident.sourceOfRelease && incident.sourceOfRelease !== 'N/A' ? `Source: ${incident.sourceOfRelease}` : ''
    },
    {
      layerName: '6. Pressure Relief / Engineered Protection (PRV / PSV / Rupture Disc)',
      barrierType: 'Mitigation',
      safeguardTag: bp.equipmentTag || 'PRD / PSV',
      status: bp.prdOperated
        ? (bp.performedAsIntended === false ? 'Failed / Degraded' : 'Worked as Intended')
        : 'Not Applicable',
      failureReason: ''
    },
    {
      layerName: '7. Secondary Containment, Fire Protection & Emergency Response',
      barrierType: 'Mitigation',
      safeguardTag: 'Bund / Deluge / ERT',
      status: (em.onSiteEvacuation || em.onSiteShelter || em.communityEvacuation || incident.fireExplosionDetails?.firefightingRequired)
        ? 'Worked as Intended'
        : 'Not Applicable',
      failureReason: ''
    }
  ];
};

const buildDefaultEvidenceChecklist = (incident) => {
  const hasInjury = (incident.injuredPersons && incident.injuredPersons.some((p) => p.injuryType !== 'No Injury')) || incident.hasInjuriesPending;
  const hasFireOrCost = Boolean(
    incident.fireExplosionDetails?.occurred ||
    incident.fireExplosionDetails?.didFireOccur ||
    incident.fireExplosionDetails?.didExplosionOccur ||
    incident.fireExplosionDetails?.directCostPending
  );
  const hasEvac = Boolean(
    incident.emergencyMeasures?.onSiteEvacuation ||
    incident.emergencyMeasures?.onSiteShelter ||
    incident.emergencyMeasures?.communityEvacuation ||
    incident.emergencyMeasures?.communityShelter
  );
  const isRelease = incident.isActualRelease === 'Yes' || incident.isActualRelease === 'Not sure' || incident.isLOPC;

  const defs = [
    { checklistKey: 'photos_videos', title: 'Photographs / Videos of the Incident Scene & Equipment', category: 'Site Evidence', applicable: true },
    { checklistKey: 'pid_location', title: 'Marked-up P&ID Showing Exact Incident / Release Location', category: 'Engineering PSI', applicable: true },
    { checklistKey: 'equipment_id', title: 'Equipment / Piping Identification & Inspection History', category: 'Asset Integrity', applicable: true },
    { checklistKey: 'sds_material', title: 'Safety Data Sheet (SDS) of Released / Involved Material', category: 'Chemical Data', applicable: isRelease },
    { checklistKey: 'release_calc', title: '1-Hour Release Quantity Calculation / Mass Balance Sheet', category: 'API 754 Evidence', applicable: isRelease },
    { checklistKey: 'operating_trends', title: 'Relevant Operating Parameters & DCS Process Trends', category: 'Process Logs', applicable: true },
    { checklistKey: 'alarm_event_log', title: 'DCS Alarm & Sequence-of-Events Log', category: 'Process Logs', applicable: true },
    { checklistKey: 'sis_esd_prv', title: 'SIS / ESD / PRV Activation & Trip Records', category: 'Safety Systems', applicable: true },
    { checklistKey: 'injury_medical', title: 'Injury & Medical Treatment / Recordability Assessment', category: 'Human Consequences', applicable: hasInjury },
    { checklistKey: 'damage_cost', title: 'Fire / Explosion Direct Damage Cost Assessment', category: 'Financial Impact', applicable: hasFireOrCost },
    { checklistKey: 'emergency_report', title: 'Emergency Response Team (ERT) Incident Log', category: 'Emergency Response', applicable: true },
    { checklistKey: 'evac_declaration', title: 'Evacuation / Shelter-in-Place Declaration Record', category: 'Community Impact', applicable: hasEvac }
  ];

  return defs.map((d) => ({
    checklistKey: d.checklistKey,
    title: d.title,
    category: d.category,
    isApplicable: d.applicable,
    status: d.applicable ? 'Pending' : 'Not Applicable',
    fileUrl: '',
    originalName: '',
    notes: ''
  }));
};

const computeStage3CSummary = (incident) => {
  const barriers = incident.barrierAnalysis || [];
  const evidence = incident.supportingEvidence || [];

  let workedCount = 0;
  let failedCount = 0;
  let bypassedCount = 0;
  let missingCount = 0;

  barriers.forEach((b) => {
    if (b.status === 'Worked as Intended') workedCount++;
    else if (b.status === 'Failed / Degraded') failedCount++;
    else if (b.status === 'Bypassed / Defeated') bypassedCount++;
    else if (b.status === 'Missing / Not Installed') missingCount++;
  });

  const applicableBarriers = workedCount + failedCount + bypassedCount + missingCount;

  let uploadedCount = 0;
  let pendingCount = 0;
  let naCount = 0;

  evidence.forEach((ev) => {
    if (!ev.isApplicable || ev.status === 'Not Applicable') {
      naCount++;
    } else if (ev.status === 'Uploaded / Attached' || ev.fileUrl) {
      uploadedCount++;
    } else {
      pendingCount++;
    }
  });

  const applicableEvidence = uploadedCount + pendingCount;
  const evidenceCompletionRate =
    applicableEvidence > 0 ? Math.round((uploadedCount / applicableEvidence) * 100) : 100;

  return {
    barriers: {
      total: barriers.length,
      applicableBarriers,
      workedCount,
      failedCount,
      bypassedCount,
      missingCount
    },
    evidence: {
      total: evidence.length,
      applicableEvidence,
      uploadedCount,
      pendingCount,
      naCount,
      completionRate: evidenceCompletionRate
    }
  };
};

// 1. Get Barrier Analysis, Supporting Evidence Vault, and Classification Context
exports.getBarrierAndEvidence = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    let dirty = false;
    if (!incident.barrierAnalysis || incident.barrierAnalysis.length === 0) {
      incident.barrierAnalysis = buildDefaultBarriers(incident);
      dirty = true;
    }
    if (!incident.supportingEvidence || incident.supportingEvidence.length === 0) {
      incident.supportingEvidence = buildDefaultEvidenceChecklist(incident);
      dirty = true;
    }

    if (dirty) {
      await incident.save();
    }

    res.json({
      incidentId: incident._id,
      incidentNumber: incident.incidentNumber,
      barrierAnalysis: incident.barrierAnalysis,
      supportingEvidence: incident.supportingEvidence,
      summary: computeStage3CSummary(incident),
      classificationContext: {
        classification: incident.api754Classification,
        isActualRelease: incident.isActualRelease,
        isLOPC: incident.isLOPC,
        chemicalTRC: incident.materialDetails?.chemicalTRC || 'N/A',
        quantityInOneHourKg: incident.materialDetails?.quantityInOneHourKg || 0,
        quantityUnknown: Boolean(incident.materialDetails?.quantityUnknown),
        releaseLocation: incident.materialDetails?.releaseLocation || 'Outdoor',
        hasInjuriesPending: Boolean(incident.hasInjuriesPending),
        directCostUSD: incident.fireExplosionDetails?.directCostUSD || 0,
        directCostPending: Boolean(incident.fireExplosionDetails?.directCostPending)
      }
    });
  } catch (error) {
    console.error('Error fetching barrier & evidence:', error);
    res.status(500).json({ error: 'Failed to retrieve barrier analysis and evidence vault: ' + error.message });
  }
};

// 2. Save full Barrier Analysis list (updates existing rows or adds custom barrier layers)
exports.saveBarrierAnalysis = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const { barriers } = req.body;
    if (!Array.isArray(barriers)) {
      return res.status(400).json({ error: 'Barriers payload must be an array.' });
    }

    const actor = req.user?.name || req.body.updatedBy || incident.cft?.leader?.name || 'CFT Investigator';
    const sanitized = barriers
      .filter((b) => b && String(b.layerName || '').trim())
      .map((b) => ({
        layerName: String(b.layerName).trim(),
        barrierType: VALID_BARRIER_TYPES.includes(b.barrierType) ? b.barrierType : 'Prevention',
        safeguardTag: String(b.safeguardTag || '').trim(),
        status: VALID_BARRIER_STATUSES.includes(b.status) ? b.status : 'Not Applicable',
        failureReason: String(b.failureReason || '').trim(),
        evaluatedBy: b.evaluatedBy || actor,
        evaluatedAt: b.evaluatedAt || new Date()
      }));

    incident.barrierAnalysis = sanitized;

    const failedOrBypassed = sanitized.filter(
      (b) => b.status === 'Failed / Degraded' || b.status === 'Bypassed / Defeated'
    ).length;

    incident.auditTrail.push({
      action: 'Barrier Analysis Updated',
      actor,
      timestamp: new Date(),
      details: `Evaluated ${sanitized.length} safety barriers (${failedOrBypassed} failed/bypassed).`
    });

    await incident.save();
    res.json({
      barrierAnalysis: incident.barrierAnalysis,
      summary: computeStage3CSummary(incident)
    });
  } catch (error) {
    console.error('Error saving barrier analysis:', error);
    res.status(500).json({ error: 'Failed to save barrier analysis: ' + error.message });
  }
};

// 3. Upload supporting evidence file (PDF / Image / Excel / Word / CSV)
exports.uploadEvidenceFile = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file selected for upload.' });
    }
    res.status(201).json({
      fileUrl: `/uploads/evidence/${req.file.filename}`,
      originalName: req.file.originalname,
      size: req.file.size
    });
  } catch (error) {
    console.error('Error uploading evidence file:', error);
    res.status(500).json({ error: 'Failed to upload supporting document: ' + error.message });
  }
};

// 4. Update checklist evidence item OR add a custom supporting evidence item
exports.upsertEvidenceItem = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const {
      itemId,
      title,
      category,
      isApplicable,
      status,
      fileUrl,
      originalName,
      notes,
      uploadedBy
    } = req.body;

    const actor = String(uploadedBy || req.user?.name || incident.cft?.leader?.name || 'CFT Investigator').trim();

    if (itemId) {
      const target = incident.supportingEvidence.id(itemId);
      if (!target) {
        return res.status(404).json({ error: 'Evidence checklist item not found.' });
      }

      if (title && String(title).trim()) target.title = String(title).trim();
      if (category && String(category).trim()) target.category = String(category).trim();
      if (typeof isApplicable === 'boolean') target.isApplicable = isApplicable;
      if (Object.prototype.hasOwnProperty.call(req.body, 'fileUrl')) {
        target.fileUrl = String(fileUrl || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'originalName')) {
        target.originalName = String(originalName || '').trim();
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'notes')) {
        target.notes = String(notes || '').trim();
      }

      if (status && VALID_EVIDENCE_STATUSES.includes(status)) {
        target.status = status;
        if (status === 'Not Applicable') target.isApplicable = false;
      } else if (target.fileUrl) {
        target.status = 'Uploaded / Attached';
        target.isApplicable = true;
      } else if (!target.isApplicable) {
        target.status = 'Not Applicable';
      } else {
        target.status = 'Pending';
      }

      target.uploadedBy = actor;
      target.uploadedAt = new Date();

      incident.auditTrail.push({
        action: 'Supporting Evidence Updated',
        actor,
        timestamp: new Date(),
        details: `${target.title}: marked [${target.status}]${target.originalName ? ` (${target.originalName})` : ''}.`
      });
    } else {
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle) {
        return res.status(400).json({ error: 'Evidence document title is required.' });
      }

      const resolvedFileUrl = String(fileUrl || '').trim();
      const resolvedStatus =
        status && VALID_EVIDENCE_STATUSES.includes(status)
          ? status
          : resolvedFileUrl
          ? 'Uploaded / Attached'
          : 'Pending';

      incident.supportingEvidence.push({
        checklistKey: 'custom',
        title: cleanTitle,
        category: String(category || 'Additional Evidence').trim(),
        isApplicable: resolvedStatus !== 'Not Applicable',
        status: resolvedStatus,
        fileUrl: resolvedFileUrl,
        originalName: String(originalName || '').trim(),
        notes: String(notes || '').trim(),
        uploadedBy: actor,
        uploadedAt: new Date()
      });

      incident.auditTrail.push({
        action: 'Custom Evidence Added',
        actor,
        timestamp: new Date(),
        details: `Added supporting document "${cleanTitle}".`
      });
    }

    await incident.save();
    res.json({
      supportingEvidence: incident.supportingEvidence,
      summary: computeStage3CSummary(incident)
    });
  } catch (error) {
    console.error('Error saving supporting evidence:', error);
    res.status(500).json({ error: 'Failed to save supporting evidence: ' + error.message });
  }
};

// 5. Clear attachment on checklist item OR delete custom item
exports.deleteEvidenceItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    if (!validateObjectId(id) || !validateObjectId(itemId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const item = incident.supportingEvidence.id(itemId);
    if (!item) return res.status(404).json({ error: 'Evidence item not found' });

    if (item.checklistKey === 'custom') {
      item.deleteOne();
    } else {
      item.fileUrl = '';
      item.originalName = '';
      item.status = item.isApplicable ? 'Pending' : 'Not Applicable';
      item.uploadedAt = undefined;
    }

    await incident.save();
    res.json({
      supportingEvidence: incident.supportingEvidence,
      summary: computeStage3CSummary(incident)
    });
  } catch (error) {
    console.error('Error clearing/deleting evidence item:', error);
    res.status(500).json({ error: 'Failed to update evidence item: ' + error.message });
  }
};

// 6. Pending Classification Resolver: Update factual parameters & re-run API RP 754 engine
exports.recalculateClassification = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validateObjectId(id)) {
      return res.status(400).json({ error: 'Invalid incident ID' });
    }

    const incident = await Incident.findById(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    const {
      isActualRelease,
      chemicalTRC,
      quantityInOneHourKg,
      quantityUnknown,
      releaseLocation,
      hasInjuriesPending,
      directCostUSD,
      directCostPending
    } = req.body;

    if (isActualRelease && ['Yes', 'No', 'Not sure'].includes(isActualRelease)) {
      incident.isActualRelease = isActualRelease;
      incident.isLOPC = isActualRelease === 'Yes';
    }

    incident.materialDetails = incident.materialDetails || {};
    if (chemicalTRC) incident.materialDetails.chemicalTRC = chemicalTRC;
    if (releaseLocation) incident.materialDetails.releaseLocation = releaseLocation;
    if (typeof quantityUnknown === 'boolean') incident.materialDetails.quantityUnknown = quantityUnknown;
    if (quantityInOneHourKg !== undefined) {
      incident.materialDetails.quantityInOneHourKg = Number(quantityInOneHourKg) || 0;
    }

    if (typeof hasInjuriesPending === 'boolean') {
      incident.hasInjuriesPending = hasInjuriesPending;
    }

    incident.fireExplosionDetails = incident.fireExplosionDetails || {};
    if (typeof directCostPending === 'boolean') {
      incident.fireExplosionDetails.directCostPending = directCostPending;
    }
    if (directCostUSD !== undefined) {
      incident.fireExplosionDetails.directCostUSD = Number(directCostUSD) || 0;
    }

    const prevCat = incident.api754Classification?.category || incident.api754Classification?.tier;
    const normalized = incidentController._normalizeApi754Input(incident.toObject());
    const newCalc = evaluateApi754Tier(normalized);
    const severityScore =
      newCalc.category === 'Tier 1 PSE' || newCalc.tier === 'Tier 1'
        ? calculateTier1SeverityScore(normalized)
        : 0;

    incident.api754Classification = {
      category: newCalc.category || newCalc.tier,
      tier: newCalc.tier,
      title: newCalc.title,
      badgeColor: newCalc.badgeColor,
      reasons: newCalc.reasons,
      tier1SeverityPoints: severityScore,
      manuallyOverridden: false,
      overrideJustification: ''
    };

    const actor = req.user?.name || req.body.updatedBy || incident.cft?.leader?.name || 'HSE Investigator';
    incident.auditTrail.push({
      action: 'API 754 Classification Re-evaluated',
      actor,
      timestamp: new Date(),
      details: `Validated field data updated. Tier transitioned: ${prevCat} → ${incident.api754Classification.category}.`
    });

    await incident.save();

    res.json({
      classification: incident.api754Classification,
      classificationContext: {
        classification: incident.api754Classification,
        isActualRelease: incident.isActualRelease,
        isLOPC: incident.isLOPC,
        chemicalTRC: incident.materialDetails?.chemicalTRC || 'N/A',
        quantityInOneHourKg: incident.materialDetails?.quantityInOneHourKg || 0,
        quantityUnknown: Boolean(incident.materialDetails?.quantityUnknown),
        releaseLocation: incident.materialDetails?.releaseLocation || 'Outdoor',
        hasInjuriesPending: Boolean(incident.hasInjuriesPending),
        directCostUSD: incident.fireExplosionDetails?.directCostUSD || 0,
        directCostPending: Boolean(incident.fireExplosionDetails?.directCostPending)
      }
    });
  } catch (error) {
    console.error('Error recalculating classification:', error);
    res.status(500).json({ error: 'Failed to re-evaluate classification: ' + error.message });
  }
};
