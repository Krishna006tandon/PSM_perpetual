const express = require('express');
const router = express.Router();
const BowTie = require('../models/BowTie');
const Scenario = require('../models/Scenario');
const Study = require('../models/Study');
const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');
const { buildPhaBowtiePayload, syncBowTiesFromPHA } = require('../services/bowtieSyncService');

// Helper to chunk barriers for Cytoscape mapping
function formatGraphData(bowtie) {
  const barriers = bowtie.barriers || [];
  const eventName = bowtie.eventName || "Top Event";

  const causeBarriers = barriers.filter(b => b.barrier_type === 'cause');
  const consBarriers = barriers.filter(b => b.barrier_type === 'consequence');

  function chunkBarriers(barrierArray, defaultGroupName, explicitFallbackName = '') {
    const groups = [];
    
    // Group by custom threat_or_consequence_name if present, otherwise group every 5
    const namedGroups = {};
    const unNamed = [];

    barrierArray.forEach(b => {
      const name = (b.threat_or_consequence_name && b.threat_or_consequence_name.trim()) 
        ? b.threat_or_consequence_name.trim() 
        : null;
      if (name) {
        if (!namedGroups[name]) namedGroups[name] = [];
        namedGroups[name].push(b);
      } else {
        unNamed.push(b);
      }
    });

    Object.keys(namedGroups).forEach(name => {
      groups.push({
        name: name,
        barriers: namedGroups[name].map(b => ({
          id: b._id,
          description: (b.pb && b.pb.length > 0) ? b.pb.join(', ') : 'Barrier',
          tagNo: (b.pb_tag_no && b.pb_tag_no.length > 0) ? b.pb_tag_no.join(', ') : '',
          owner: (b.barrier_owner && b.barrier_owner.length > 0) ? b.barrier_owner.join(', ') : '',
          severity: b.r >= 10 ? 'crit' : b.r >= 6 ? 'high' : b.r >= 3 ? 'med' : 'low',
          escalation_factor: b.escalation_factor || '',
          escalation_control: b.escalation_control || '',
          escalation_control_owner: b.escalation_control_owner || '',
          type: b.type || 'Engg',
          available_new: b.available_new || 'Available',
          c: b.c || 0,
          p: b.p || 0,
          r: b.r || 0,
          recommendation: b.recommendation || '',
          c_rec: b.c_rec || 0,
          p_rec: b.p_rec || 0,
          r_rec: b.r_rec || 0
        }))
      });
    });

    let currentGroup = null;
    unNamed.forEach((b, i) => {
      if (i % 5 === 0) {
        currentGroup = {
          name: `${defaultGroupName} ${groups.length + 1}`,
          barriers: []
        };
        groups.push(currentGroup);
      }
      currentGroup.barriers.push({
        id: b._id,
        description: (b.pb && b.pb.length > 0) ? b.pb.join(', ') : 'Barrier',
        tagNo: (b.pb_tag_no && b.pb_tag_no.length > 0) ? b.pb_tag_no.join(', ') : '',
        owner: (b.barrier_owner && b.barrier_owner.length > 0) ? b.barrier_owner.join(', ') : '',
        severity: b.r >= 10 ? 'crit' : b.r >= 6 ? 'high' : b.r >= 3 ? 'med' : 'low',
        escalation_factor: b.escalation_factor || '',
        escalation_control: b.escalation_control || '',
        escalation_control_owner: b.escalation_control_owner || '',
        type: b.type || 'Engg',
        available_new: b.available_new || 'Available',
        c: b.c || 0,
        p: b.p || 0,
        r: b.r || 0,
        recommendation: b.recommendation || '',
        c_rec: b.c_rec || 0,
        p_rec: b.p_rec || 0,
        r_rec: b.r_rec || 0
      });
    });

    // If no barriers, provide an empty threat/consequence placeholder (preserving PHA Cause / Ultimate Consequence name when present)
    if (groups.length === 0) {
      const fallbackName = (explicitFallbackName && explicitFallbackName.trim())
        ? explicitFallbackName.trim()
        : `${defaultGroupName} 1`;
      groups.push({
        name: fallbackName,
        barriers: []
      });
    }

    return groups;
  }

  return {
    title: eventName,
    section: bowtie.section || '',
    causes: chunkBarriers(causeBarriers, "Threat", bowtie.defaultThreatName),
    consequences: chunkBarriers(consBarriers, "Consequence", bowtie.defaultConsequenceName)
  };
}

// Apply auth middleware
router.use(auth);

// 1. GET all BowTie analyses for a specific study (syncs PHA-flagged BowTies first)
router.get('/study/:studyId', checkStudyAccess, async (req, res) => {
  try {
    await syncBowTiesFromPHA(req.params.studyId);

    const bowties = await BowTie.find({ studyId: req.params.studyId })
      .populate('nodeId', 'nodeNumber name description')
      .populate('deviationId', 'deviationAuto parameter')
      .populate('scenarioId')
      .sort({ createdAt: -1 });

    res.json(bowties);
  } catch (err) {
    console.error('Error fetching bowties:', err);
    res.status(500).json({ message: err.message });
  }
});

// 1b. POST force re-sync BowTies from PHA
router.post('/study/:studyId/sync-from-pha', checkStudyAccess, async (req, res) => {
  try {
    await syncBowTiesFromPHA(req.params.studyId);
    const bowties = await BowTie.find({ studyId: req.params.studyId })
      .populate('nodeId', 'nodeNumber name description')
      .populate('deviationId', 'deviationAuto parameter')
      .populate('scenarioId')
      .sort({ createdAt: -1 });
    res.json(bowties);
  } catch (err) {
    console.error('Error syncing bowties from PHA:', err);
    res.status(500).json({ message: err.message });
  }
});

// 2. POST create a new BowTie analysis (optionally prefilled from a PHA Scenario)
router.post('/study/:studyId', checkStudyAccess, async (req, res) => {
  try {
    const { 
      eventName, 
      section, 
      hazardDescription, 
      riskRating, 
      scenarioId, 
      nodeId, 
      deviationId, 
      barriers = [] 
    } = req.body;

    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ message: 'Event Name is required' });
    }

    let newBarriers = [...barriers];
    let defaultThreatName = '';
    let defaultConsequenceName = '';
    let unclassifiedSafeguardCount = 0;
    let resolvedNodeId = nodeId || null;
    let resolvedDevId = deviationId || null;

    // If a scenarioId was provided and no custom barriers given, auto-seed from PHA Scenario group
    if (scenarioId && newBarriers.length === 0) {
      const scenario = await Scenario.findById(scenarioId)
        .populate('nodeId', 'nodeNumber description')
        .populate('causeId', 'description categoryType')
        .populate('deviationId', 'deviationAuto parameter');

      if (scenario) {
        let groupScenarios = [scenario];
        if (scenario.consequenceGroupId && String(scenario.consequenceGroupId).trim() !== '') {
          groupScenarios = await Scenario.find({
            studyId: req.params.studyId,
            consequenceGroupId: scenario.consequenceGroupId
          })
            .populate('nodeId', 'nodeNumber description')
            .populate('causeId', 'description categoryType')
            .populate('deviationId', 'deviationAuto parameter')
            .sort({ order: 1, createdAt: 1 });
        }

        const seeded = buildPhaBowtiePayload(groupScenarios, eventName.trim());
        if (seeded) {
          newBarriers = seeded.barriers;
          defaultThreatName = seeded.defaultThreatName;
          defaultConsequenceName = seeded.defaultConsequenceName;
          unclassifiedSafeguardCount = seeded.unclassifiedSafeguardCount;
          resolvedNodeId = resolvedNodeId || seeded.nodeId;
          resolvedDevId = resolvedDevId || seeded.deviationId;
        }
      }
    }

    const bowtie = new BowTie({
      studyId: req.params.studyId,
      scenarioId: scenarioId || null,
      nodeId: resolvedNodeId,
      deviationId: resolvedDevId,
      eventName: eventName.trim(),
      section: section || '',
      hazardDescription: hazardDescription || '',
      riskRating: Number(riskRating) || 0,
      defaultThreatName,
      defaultConsequenceName,
      unclassifiedSafeguardCount,
      barriers: newBarriers
    });

    const saved = await bowtie.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error creating bowtie:', err);
    res.status(500).json({ message: err.message });
  }
});

// 3. GET detail of a specific BowTie with graph-ready format
router.get('/detail/:id', async (req, res) => {
  try {
    let bowtie = await BowTie.findById(req.params.id);
    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    if (bowtie.isFromPha && bowtie.studyId) {
      await syncBowTiesFromPHA(bowtie.studyId);
    }

    bowtie = await BowTie.findById(req.params.id)
      .populate('studyId', 'title plant companyCode studyType')
      .populate('nodeId', 'nodeNumber name description')
      .populate('deviationId', 'deviationAuto parameter');

    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    const graphData = formatGraphData(bowtie);
    res.json({ bowtie, graphData });
  } catch (err) {
    console.error('Error fetching bowtie detail:', err);
    res.status(500).json({ message: err.message });
  }
});

// 4. PUT update BowTie general info
router.put('/detail/:id', async (req, res) => {
  try {
    const { eventName, section, hazardDescription, riskRating } = req.body;
    const bowtie = await BowTie.findById(req.params.id);

    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    if (eventName) bowtie.eventName = eventName.trim();
    if (section !== undefined) bowtie.section = section;
    if (hazardDescription !== undefined) bowtie.hazardDescription = hazardDescription;
    if (riskRating !== undefined) bowtie.riskRating = Number(riskRating);

    await bowtie.save();
    const graphData = formatGraphData(bowtie);
    res.json({ bowtie, graphData });
  } catch (err) {
    console.error('Error updating bowtie:', err);
    res.status(500).json({ message: err.message });
  }
});

// 5. POST add a barrier to a BowTie (Cause or Consequence barrier)
router.post('/detail/:id/barrier', async (req, res) => {
  try {
    const bowtie = await BowTie.findById(req.params.id);
    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    const {
      event_name,
      barrier_type,
      threat_or_consequence_name,
      pb = [],
      pb_tag_no = [],
      barrier_owner = [],
      escalation_factor = '',
      escalation_control = '',
      escalation_control_owner = '',
      available_new = 'Available',
      type = 'Engg',
      c = 0,
      p = 0,
      r = 0,
      recommendation = '',
      c_rec = 0,
      p_rec = 0,
      r_rec = 0,
      action_by = '',
      target_completion = '',
      remark = '',
      status = 'Open'
    } = req.body;

    const toArray = (v) => Array.isArray(v) ? v : (v !== undefined && v !== null && v !== '') ? [v] : [];

    const calculatedR = Number(c) * Number(p);
    const calculatedRRec = Number(c_rec) * Number(p_rec);

    bowtie.barriers.push({
      event_name: event_name || bowtie.eventName,
      barrier_type: barrier_type || 'cause',
      threat_or_consequence_name: threat_or_consequence_name || '',
      pb: toArray(pb),
      pb_tag_no: toArray(pb_tag_no),
      barrier_owner: toArray(barrier_owner),
      escalation_factor,
      escalation_control,
      escalation_control_owner,
      available_new,
      type,
      c: Number(c),
      p: Number(p),
      r: r ? Number(r) : calculatedR,
      recommendation,
      c_rec: Number(c_rec),
      p_rec: Number(p_rec),
      r_rec: r_rec ? Number(r_rec) : calculatedRRec,
      action_by,
      target_completion,
      remark,
      status
    });

    await bowtie.save();
    const graphData = formatGraphData(bowtie);
    res.status(201).json({ bowtie, graphData });
  } catch (err) {
    console.error('Error adding barrier:', err);
    res.status(500).json({ message: err.message });
  }
});

// 6. PUT update a specific barrier
router.put('/detail/:id/barrier/:barrierId', async (req, res) => {
  try {
    const bowtie = await BowTie.findById(req.params.id);
    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    const barrier = bowtie.barriers.id(req.params.barrierId);
    if (!barrier) {
      return res.status(404).json({ message: 'Barrier not found' });
    }

    const toArray = (v) => Array.isArray(v) ? v : (v !== undefined && v !== null && v !== '') ? [v] : [];

    Object.assign(barrier, {
      ...req.body,
      pb: req.body.pb ? toArray(req.body.pb) : barrier.pb,
      pb_tag_no: req.body.pb_tag_no ? toArray(req.body.pb_tag_no) : barrier.pb_tag_no,
      barrier_owner: req.body.barrier_owner ? toArray(req.body.barrier_owner) : barrier.barrier_owner,
      c: req.body.c !== undefined ? Number(req.body.c) : barrier.c,
      p: req.body.p !== undefined ? Number(req.body.p) : barrier.p,
      r: (req.body.c !== undefined || req.body.p !== undefined) 
        ? Number(req.body.c ?? barrier.c) * Number(req.body.p ?? barrier.p) 
        : barrier.r,
      c_rec: req.body.c_rec !== undefined ? Number(req.body.c_rec) : barrier.c_rec,
      p_rec: req.body.p_rec !== undefined ? Number(req.body.p_rec) : barrier.p_rec,
      r_rec: (req.body.c_rec !== undefined || req.body.p_rec !== undefined) 
        ? Number(req.body.c_rec ?? barrier.c_rec) * Number(req.body.p_rec ?? barrier.p_rec) 
        : barrier.r_rec
    });

    await bowtie.save();
    const graphData = formatGraphData(bowtie);
    res.json({ bowtie, graphData });
  } catch (err) {
    console.error('Error updating barrier:', err);
    res.status(500).json({ message: err.message });
  }
});

// 7. DELETE remove a barrier
router.delete('/detail/:id/barrier/:barrierId', async (req, res) => {
  try {
    const bowtie = await BowTie.findById(req.params.id);
    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    bowtie.barriers.pull({ _id: req.params.barrierId });
    await bowtie.save();

    const graphData = formatGraphData(bowtie);
    res.json({ bowtie, graphData });
  } catch (err) {
    console.error('Error deleting barrier:', err);
    res.status(500).json({ message: err.message });
  }
});

// 8. PUT bulk update RM recommendations
router.put('/detail/:id/rm-recommendations', async (req, res) => {
  try {
    const bowtie = await BowTie.findById(req.params.id);
    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }

    const { updates = [] } = req.body; // array of { barrierId, action_by, target_completion, remark, status }

    updates.forEach(u => {
      const b = bowtie.barriers.id(u.barrierId);
      if (b) {
        if (u.action_by !== undefined) b.action_by = u.action_by;
        if (u.target_completion !== undefined) b.target_completion = u.target_completion;
        if (u.remark !== undefined) b.remark = u.remark;
        if (u.status !== undefined) b.status = u.status;
      }
    });

    await bowtie.save();
    res.json({ message: 'Recommendations updated successfully', bowtie });
  } catch (err) {
    console.error('Error updating RM recommendations:', err);
    res.status(500).json({ message: err.message });
  }
});

// 9. DELETE an entire BowTie
router.delete('/detail/:id', async (req, res) => {
  try {
    const bowtie = await BowTie.findByIdAndDelete(req.params.id);
    if (!bowtie) {
      return res.status(404).json({ message: 'BowTie analysis not found' });
    }
    if (bowtie.isFromPha && bowtie.studyId) {
      const clearFilter = { studyId: bowtie.studyId };
      if (bowtie.consequenceGroupId) {
        clearFilter.$or = [{ consequenceGroupId: bowtie.consequenceGroupId }];
        if (bowtie.scenarioId) clearFilter.$or.push({ _id: bowtie.scenarioId });
      } else if (bowtie.scenarioId) {
        clearFilter._id = bowtie.scenarioId;
      }
      if (clearFilter.$or || clearFilter._id) {
        await Scenario.updateMany(clearFilter, { $set: { isBowtie: false } });
      }
    }
    res.json({ message: 'BowTie deleted successfully' });
  } catch (err) {
    console.error('Error deleting bowtie:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
