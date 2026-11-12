const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const incidentController = require('../controllers/incidentController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const whyWhyController = require('../controllers/whyWhyController');
const capaController = require('../controllers/capaController');

const capaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'capa');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `capa-${uniqueSuffix}${ext}`);
  }
});

const capaPhotoUpload = multer({
  storage: capaStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Only image files (PNG, JPG, WEBP, GIF) are allowed for CAPA photo verification.'));
  }
});

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

// Stage 3A: Why-Why RCA Tree & API RP 754 Causal Factor Tagging
router.get('/:id/why-nodes', whyWhyController.getWhyWhyNodes);
router.post('/:id/why-nodes', whyWhyController.createWhyWhyNode);
router.patch('/:id/why-nodes/:nodeId', whyWhyController.updateWhyWhyNode);
router.delete('/:id/why-nodes/:nodeId', whyWhyController.deleteWhyWhyNode);
router.post('/:id/why-nodes/:nodeId/evidence', whyWhyController.addWhyNodeEvidence);
router.delete('/:id/why-nodes/:nodeId/evidence/:evidenceId', whyWhyController.removeWhyNodeEvidence);

// Stage 3B: CAPA Action Engine, Verification & MOC Link
router.post('/:id/capas/upload-photo', capaPhotoUpload.single('photo'), capaController.uploadCapaPhoto);
router.get('/:id/capas', capaController.getIncidentCapas);
router.post('/:id/capas', capaController.createCapa);
router.patch('/:id/capas/:capaId', capaController.updateCapa);
router.post('/:id/capas/:capaId/submit', capaController.submitCapaForVerification);
router.post('/:id/capas/:capaId/verify', capaController.verifyCapa);
router.post('/:id/capas/:capaId/escalate', capaController.escalateCapa);
router.post('/:id/capas/:capaId/initiate-moc', capaController.initiateCapaMoc);
router.delete('/:id/capas/:capaId', capaController.deleteCapa);

module.exports = router;
