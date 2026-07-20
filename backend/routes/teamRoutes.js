const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const auth = require('../middleware/auth');

// Apply auth middleware to all team routes
router.use(auth);

// GET all team members for a specific study
router.get('/:studyId', async (req, res) => {
  try {
    const members = await TeamMember.find({ studyId: req.params.studyId }).sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new team member
router.post('/:studyId', async (req, res) => {
  const {
    fullName,
    email,
    phone,
    company,
    role,
    discipline
  } = req.body;

  try {
    const newMember = new TeamMember({
      studyId: req.params.studyId,
      fullName,
      email,
      phone,
      company,
      role,
      discipline
    });

    const savedMember = await newMember.save();
    res.status(201).json(savedMember);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
