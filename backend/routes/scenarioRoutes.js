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

module.exports = router;
