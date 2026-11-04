const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const incidentController = require('../controllers/incidentController');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Optional auth middleware: parses user & companyCode if Authorization header is present
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        const decoded = jwt.verify(parts[1], JWT_SECRET);
        const user = await User.findById(decoded.userId || decoded);
        if (user) {
          req.user = {
            _id: user._id,
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            companyCode: user.companyCode
          };
        }
      }
    }
  } catch (err) {
    // Soft ignore invalid token for read routes or allow proceed
  }
  next();
};

router.use(optionalAuth);

// Routes
router.post('/', incidentController.createIncident);
router.get('/', incidentController.getAllIncidents);
router.get('/stats', incidentController.getIncidentStats);
router.get('/taxonomy', incidentController.getApi754Taxonomy);
router.post('/evaluate-live', incidentController.evaluateApi754Live);
router.get('/:id', incidentController.getIncidentById);
router.patch('/:id', incidentController.updateIncident);
router.patch('/:id/triage', incidentController.triageIncident);
router.delete('/:id', incidentController.deleteIncident);

module.exports = router;
