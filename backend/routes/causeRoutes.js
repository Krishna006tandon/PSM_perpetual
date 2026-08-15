const express = require('express');
const router = express.Router();
const Cause = require('../models/Cause');
const auth = require('../middleware/auth');

// Apply auth middleware
router.use(auth);

// GET all causes for a specific study
router.get('/:studyId', async (req, res) => {
  try {
    const causes = await Cause.find({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ order: 1 });
    res.json(causes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new cause row
router.post('/:studyId', async (req, res) => {
  try {
    const lastCause = await Cause.findOne({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ order: -1 });
    const newOrder = lastCause ? lastCause.order + 1 : 1;

    const newCause = new Cause({ companyCode: req.user.companyCode, studyId: req.params.studyId,
      order: newOrder,
      ...req.body
    });

    const savedCause = await newCause.save();
    res.status(201).json(savedCause);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT to reorder causes in bulk
router.put('/reorder', async (req, res) => {
  try {
    const { causes } = req.body; 
    
    const updatePromises = causes.map(cause => 
      Cause.findByIdAndUpdate(cause.id, { order: cause.order })
    );
    
    await Promise.all(updatePromises);
    res.json({ message: 'Reordered successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT to update a specific cause
router.put('/:id', async (req, res) => {
  try {
    const updatedCause = await Cause.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    
    if (!updatedCause) {
      return res.status(404).json({ message: 'Cause not found' });
    }
    
    res.json(updatedCause);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a specific cause row
router.delete('/:id', async (req, res) => {
  try {
    const deletedCause = await Cause.findByIdAndDelete(req.params.id);
    if (!deletedCause) {
      return res.status(404).json({ message: 'Cause not found' });
    }
    res.json({ message: 'Cause deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
