const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');
const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');

// Apply auth middleware
router.use(auth);

// GET all company-wide recommendations across studies (Placed BEFORE /:studyId)
router.get('/company/recommendations', async (req, res) => {
  try {
    const User = require('../models/User');
    const Study = require('../models/Study');
    const TeamMember = require('../models/TeamMember');

    const user = await User.findById(req.user.userId);
    const userRole = (user && user.role) ? user.role.toLowerCase() : '';
    const userEmail = user ? user.email : '';

    let accessibleStudyIds = [];
    if (user && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'owner')) {
      const studies = await Study.find({ companyCode: req.user.companyCode }).select('_id');
      accessibleStudyIds = studies.map(s => s._id);
    } else {
      const [companyStudies, memberships] = await Promise.all([
        Study.find({ companyCode: req.user.companyCode }).select('_id'),
        TeamMember.find({ email: { $regex: new RegExp(`^${userEmail.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') } }).select('studyId')
      ]);
      const set = new Set([...companyStudies.map(s => String(s._id)), ...memberships.map(m => String(m.studyId))]);
      accessibleStudyIds = Array.from(set);
    }

    const filter = {
      $or: [
        { additionalProtection: { $exists: true, $regex: /\S/ } },
        { recommendationNo: { $exists: true, $regex: /\S/ } }
      ]
    };

    if (accessibleStudyIds.length > 0) {
      filter.studyId = { $in: accessibleStudyIds };
    } else if (req.user.companyCode) {
      filter.companyCode = req.user.companyCode;
    }

    const scenarios = await Scenario.find(filter)
      .populate('studyId', 'studyName phaType facility plantUnit lastAccessed')
      .populate('nodeId', 'description intention boundary')
      .populate('deviationId', 'deviationAuto guidewords parameter')
      .populate('causeId', 'description')
      .sort({ updatedAt: -1, order: 1 });

    res.json(scenarios);
  } catch (err) {
    console.error('Error fetching company recommendations:', err);
    res.status(500).json({ message: err.message });
  }
});

// Apply checkStudyAccess middleware to routes targeting a specific study
router.use('/:studyId', checkStudyAccess);

// GET all scenarios for a specific study, optionally filtered by node
router.get('/:studyId', async (req, res) => {
  try {
    const filter = { studyId: req.params.studyId };
    if (req.query.nodeId) {
      filter.nodeId = req.query.nodeId;
    }
    
    // Populate the referenced data
    const scenarios = await Scenario.find(filter)
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId')
      .sort({ order: 1 });
      
    res.json(scenarios);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new scenario row
router.post('/:studyId', async (req, res) => {
  try {
    const { insertAfterScenarioId, ...bodyData } = req.body;
    let newOrder;

    if (insertAfterScenarioId) {
      const targetScenario = await Scenario.findById(insertAfterScenarioId);
      if (targetScenario) {
        newOrder = (targetScenario.order || 0) + 1;
        // Shift subsequent rows
        await Scenario.updateMany(
          { studyId: req.params.studyId, nodeId: req.body.nodeId, order: { $gte: newOrder } },
          { $inc: { order: 1 } }
        );
      }
    }

    if (newOrder === undefined) {
      const filter = { studyId: req.params.studyId, nodeId: req.body.nodeId };
      const lastScenario = await Scenario.findOne(filter).sort({ order: -1 });
      newOrder = lastScenario ? (lastScenario.order || 0) + 1 : 1;
    }

    const newScenario = new Scenario({
      companyCode: req.user.companyCode,
      studyId: req.params.studyId,
      order: newOrder,
      ...bodyData
    });

    const savedScenario = await newScenario.save();
    
    // Populate it before sending back so UI has everything
    const populated = await Scenario.findById(savedScenario._id)
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');
      
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT to update a specific scenario
router.put('/:id', async (req, res) => {
  try {
    const updatedScenario = await Scenario.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    )
    .populate('nodeId')
    .populate('deviationId')
    .populate('causeId');
    
    if (!updatedScenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }
    
    res.json(updatedScenario);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a specific scenario
router.delete('/:id', async (req, res) => {
  try {
    const deletedScenario = await Scenario.findByIdAndDelete(req.params.id);
    if (!deletedScenario) {
      return res.status(404).json({ message: 'Scenario not found' });
    }
    res.json({ message: 'Scenario deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST bulk duplicate scenarios
router.post('/:studyId/bulk-duplicate', async (req, res) => {
  try {
    const { scenarioIds, targetNodeId, insertAfterScenarioId } = req.body;
    if (!scenarioIds || !scenarioIds.length) {
      return res.status(400).json({ message: 'No scenario IDs provided' });
    }

    const scenariosToClone = await Scenario.find({ _id: { $in: scenarioIds } }).sort({ order: 1 });
    if (!scenariosToClone.length) {
      return res.status(404).json({ message: 'Scenarios not found' });
    }

    const effectiveNodeId = targetNodeId || scenariosToClone[0].nodeId;
    let startOrder;

    const afterId = insertAfterScenarioId || (scenarioIds.length === 1 ? scenarioIds[0] : null);
    if (afterId) {
      const target = await Scenario.findById(afterId);
      if (target) {
        startOrder = (target.order || 0) + 1;
        // Shift all subsequent scenarios down
        await Scenario.updateMany(
          { studyId: req.params.studyId, nodeId: effectiveNodeId, order: { $gte: startOrder } },
          { $inc: { order: scenariosToClone.length } }
        );
      }
    }

    if (startOrder === undefined) {
      const lastScenario = await Scenario.findOne({ studyId: req.params.studyId, nodeId: effectiveNodeId }).sort({ order: -1 });
      startOrder = lastScenario ? (lastScenario.order || 0) + 1 : 1;
    }

    const groupMapping = {};

    const clonedDocs = scenariosToClone.map((sc, i) => {
      const obj = sc.toObject();
      delete obj._id;
      delete obj.__v;
      delete obj.createdAt;
      delete obj.updatedAt;
      obj.studyId = req.params.studyId;
      obj.companyCode = req.user.companyCode;
      obj.nodeId = effectiveNodeId;
      obj.order = startOrder + i;

      // Remap consequence and safeguard groups so duplicate rows are independently editable
      // (while preserving intra-group relationships if multiple rows are duplicated together)
      if (obj.consequenceGroupId) {
        if (!groupMapping[obj.consequenceGroupId]) {
          groupMapping[obj.consequenceGroupId] = 'grp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
        obj.consequenceGroupId = groupMapping[obj.consequenceGroupId];
      }
      if (obj.safeguardGroupId) {
        if (!groupMapping[obj.safeguardGroupId]) {
          groupMapping[obj.safeguardGroupId] = 'sgrp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }
        obj.safeguardGroupId = groupMapping[obj.safeguardGroupId];
      }

      return obj;
    });

    const inserted = await Scenario.insertMany(clonedDocs);
    const populated = await Scenario.find({ _id: { $in: inserted.map(d => d._id) } })
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error duplicating scenarios:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST restore deleted scenarios (undo deletion)
router.post('/:studyId/restore', async (req, res) => {
  try {
    const { scenarios } = req.body;
    if (!scenarios || !Array.isArray(scenarios) || scenarios.length === 0) {
      return res.status(400).json({ message: 'No scenarios provided to restore' });
    }

    const docsToInsert = [];
    for (const sc of scenarios) {
      const { _id, createdAt, updatedAt, __v, ...rest } = sc;
      const targetNodeId = sc.nodeId?._id || sc.nodeId || req.body.nodeId;
      if (!targetNodeId) continue;

      const doc = {
        ...rest,
        companyCode: req.user.companyCode,
        studyId: req.params.studyId,
        nodeId: targetNodeId,
        deviationId: sc.deviationId?._id || sc.deviationId || null,
        causeId: sc.causeId?._id || sc.causeId || null
      };

      if (_id) {
        const exists = await Scenario.exists({ _id });
        if (!exists) {
          doc._id = _id;
        }
      }
      docsToInsert.push(doc);
    }

    if (docsToInsert.length === 0) {
      return res.status(400).json({ message: 'No valid scenarios to restore' });
    }

    const inserted = await Scenario.insertMany(docsToInsert);

    const populated = await Scenario.find({ _id: { $in: inserted.map(d => d._id) } })
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId');

    res.status(201).json(populated);
  } catch (err) {
    console.error('Error restoring scenarios:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

