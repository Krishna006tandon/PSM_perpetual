const express = require('express');
const router = express.Router();
const Scenario = require('../models/Scenario');
const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');

// Apply auth middleware
router.use(auth);

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
    const filter = { studyId: req.params.studyId, nodeId: req.body.nodeId };
    const lastScenario = await Scenario.findOne(filter).sort({ order: -1 });
    const newOrder = lastScenario ? lastScenario.order + 1 : 1;

    const newScenario = new Scenario({ companyCode: req.user.companyCode, studyId: req.params.studyId,
      order: newOrder,
      ...req.body
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
    const { scenarioIds, targetNodeId } = req.body;
    if (!scenarioIds || !scenarioIds.length) {
      return res.status(400).json({ message: 'No scenario IDs provided' });
    }

    const scenariosToClone = await Scenario.find({ _id: { $in: scenarioIds } }).sort({ order: 1 });
    if (!scenariosToClone.length) {
      return res.status(404).json({ message: 'Scenarios not found' });
    }

    const effectiveNodeId = targetNodeId || scenariosToClone[0].nodeId;
    const lastScenario = await Scenario.findOne({ studyId: req.params.studyId, nodeId: effectiveNodeId }).sort({ order: -1 });
    let startOrder = lastScenario ? lastScenario.order + 1 : 1;

    const groupMapping = {};

    const clonedDocs = scenariosToClone.map((sc, i) => {
      const obj = sc.toObject();
      delete obj._id;
      delete obj.createdAt;
      delete obj.updatedAt;
      obj.nodeId = effectiveNodeId;
      obj.order = startOrder + i;

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

