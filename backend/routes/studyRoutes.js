const express = require('express');
const router = express.Router();
const Study = require('../models/Study');
const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');

// Apply auth middleware to all study routes
router.use(auth);

// GET recent studies
router.get('/recent', async (req, res) => {
  try {
    const User = require('../models/User');
    const TeamMember = require('../models/TeamMember');
    
    // Find the current user
    const user = await User.findById(req.user.userId); // req.user.userId is decoded.userId from auth middleware
    
    let studies;
    if (user && user.role === 'Admin') {
      // Admin sees all studies
      studies = await Study.find({ companyCode: req.user.companyCode, companyCode: req.user.companyCode }).sort({ lastAccessed: -1 }).limit(10);
    } else {
      // Normal user sees studies where they are a team member
      const userEmail = user ? user.email : '';
      const memberships = await TeamMember.find({ companyCode: req.user.companyCode, email: userEmail });
      const studyIds = memberships.map(m => m.studyId);
      
      studies = await Study.find({ companyCode: req.user.companyCode, _id: { $in: studyIds } }).sort({ lastAccessed: -1 }).limit(10);
    }
    
    res.json(studies);
  } catch (err) {
    console.error('Error fetching studies:', err);
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
    const newStudy = new Study({ companyCode: req.user.companyCode, studyName,
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

// Apply checkStudyAccess middleware to routes targeting a specific study by ID
router.use('/:id', checkStudyAccess);

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

// GET full export data for a study
router.get('/:id/full-export-data', async (req, res) => {
  try {
    const studyId = req.params.id;
    const Study = require('../models/Study');
    const TeamMember = require('../models/TeamMember');
    const Session = require('../models/Session');
    const StudyRevision = require('../models/StudyRevision');
    const StudyDocument = require('../models/StudyDocument');
    const Node = require('../models/Node');
    const Scenario = require('../models/Scenario');

    const study = await Study.findById(studyId);
    if (!study) return res.status(404).json({ message: 'Study not found' });

    const teamMembers = await TeamMember.find({ studyId });
    const sessions = await Session.find({ studyId }).sort({ date: 1 });
    const revisions = await StudyRevision.find({ studyId }).sort({ revision: 1 });
    const documents = await StudyDocument.find({ studyId });
    const nodes = await Node.find({ studyId }).sort({ nodeNumber: 1 });
    const scenarios = await Scenario.find({ studyId })
      .populate('nodeId')
      .populate('deviationId')
      .populate('causeId')
      .sort({ order: 1 });

    res.json({
      study,
      teamMembers,
      sessions,
      revisions,
      documents,
      nodes,
      scenarios
    });
  } catch (err) {
    console.error('Error fetching full export data:', err);
    res.status(500).json({ message: err.message });
  }
});

// Bulk update sessions for a study
router.post('/:id/sessions', async (req, res) => {
  try {
    const Session = require('../models/Session');
    await Session.deleteMany({ studyId: req.params.id });
    const sessions = req.body.sessions.map(s => ({ ...s, studyId: req.params.id }));
    const inserted = await Session.insertMany(sessions);
    res.json(inserted);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk update revisions for a study
router.post('/:id/revisions', async (req, res) => {
  try {
    const StudyRevision = require('../models/StudyRevision');
    await StudyRevision.deleteMany({ studyId: req.params.id });
    const revisions = req.body.revisions.map(r => ({ ...r, studyId: req.params.id }));
    const inserted = await StudyRevision.insertMany(revisions);
    res.json(inserted);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
