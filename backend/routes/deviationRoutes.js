const express = require('express');
const router = express.Router();
const Deviation = require('../models/Deviation');
const auth = require('../middleware/auth');

// Apply auth middleware
router.use(auth);

// GET all deviations for a specific study
router.get('/:studyId', async (req, res) => {
  try {
    const deviations = await Deviation.find({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ order: 1 });
    res.json(deviations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new deviation row
router.post('/:studyId', async (req, res) => {
  try {
    const lastDeviation = await Deviation.findOne({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ order: -1 });
    const newOrder = lastDeviation ? lastDeviation.order + 1 : 1;

    // The pre-save hook in the model handles computing deviationAuto if not passed
    const newDeviation = new Deviation({ companyCode: req.user.companyCode, studyId: req.params.studyId,
      order: newOrder,
      ...req.body
    });

    const savedDeviation = await newDeviation.save();
    res.status(201).json(savedDeviation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT to reorder deviations in bulk
router.put('/reorder', async (req, res) => {
  try {
    const { deviations } = req.body; 
    
    const updatePromises = deviations.map(dev => 
      Deviation.findByIdAndUpdate(dev.id, { order: dev.order })
    );
    
    await Promise.all(updatePromises);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT to update a specific deviation
router.put('/:id', async (req, res) => {
  try {
    // For single field updates, the frontend will compute and send 'deviationAuto' 
    // along with the field being updated to ensure it's always accurate in DB.
    const updatedDeviation = await Deviation.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!updatedDeviation) {
      return res.status(404).json({ message: 'Deviation not found' });
    }
    
    res.json(updatedDeviation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a specific deviation row
router.delete('/:id', async (req, res) => {
  try {
    const deletedDeviation = await Deviation.findByIdAndDelete(req.params.id);
    if (!deletedDeviation) {
      return res.status(404).json({ message: 'Deviation not found' });
    }
    res.json({ message: 'Deviation deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
