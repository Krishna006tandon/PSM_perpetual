const express = require('express');
const router = express.Router();
const Study = require('../models/Study');
const auth = require('../middleware/auth');

// Apply auth middleware to all study routes
router.use(auth);

// GET recent studies
router.get('/recent', async (req, res) => {
  try {
    const studies = await Study.find().sort({ lastAccessed: -1 }).limit(5);
    res.json(studies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new study
router.post('/', async (req, res) => {
  const {
    studyName,
    studyCoordinator,
    contactInfo,
    facility,
    owner,
    plantUnit,
    phaType,
    studyStatus
  } = req.body;

  try {
    const newStudy = new Study({
      studyName,
      studyCoordinator,
      contactInfo,
      facility,
      owner,
      plantUnit,
      phaType,
      studyStatus,
      lastAccessed: new Date()
    });

    const savedStudy = await newStudy.save();
    res.status(201).json(savedStudy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update study
router.put('/:id', async (req, res) => {
  try {
    const updatedStudy = await Study.findByIdAndUpdate(
      req.params.id,
      { $set: req.body, lastAccessed: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!updatedStudy) {
      return res.status(404).json({ message: 'Study not found' });
    }
    
    res.json(updatedStudy);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
