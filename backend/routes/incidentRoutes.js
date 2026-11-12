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
const evidenceBarrierController = require('../controllers/evidenceBarrierController');
const timelinePhaController = require('../controllers/timelinePhaController');
const closureReportController = require('../controllers/closureReportController');

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

const evidenceAllowedMimePrefixes = ['image/'];
const evidenceAllowedMimes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain'
]);
const evidenceAllowedExts = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt']);

const createDocUploader = (folderName, filePrefix, errorMessage) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', folderName);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${filePrefix}-${uniqueSuffix}${ext}`);
    }
  });
  return multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const mimeOk =
        (file.mimetype && evidenceAllowedMimePrefixes.some((p) => file.mimetype.startsWith(p))) ||
        evidenceAllowedMimes.has(file.mimetype);
      if (mimeOk || evidenceAllowedExts.has(ext)) {
        return cb(null, true);
      }
      cb(new Error(errorMessage));
    }
  });
};

const evidenceUpload = createDocUploader(
  'evidence',
  'evidence',
  'Unsupported file type. Allowed: PDF, Images, Word, Excel, CSV, TXT.'
);

const witnessUpload = createDocUploader(
  'witnesses',
  'witness',
  'Unsupported file type for witness statement. Allowed: PDF, Images, Word, Excel, CSV, TXT.'
);

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

// Stage 3C: Barrier Effectiveness Analysis, Supporting Evidence Vault & Pending Classification Resolver
router.get('/:id/barriers-evidence', evidenceBarrierController.getBarrierAndEvidence);
router.put('/:id/barriers', evidenceBarrierController.saveBarrierAnalysis);
router.post('/:id/evidence/upload', evidenceUpload.single('file'), evidenceBarrierController.uploadEvidenceFile);
router.post('/:id/evidence', evidenceBarrierController.upsertEvidenceItem);
router.delete('/:id/evidence/:itemId', evidenceBarrierController.deleteEvidenceItem);
router.post('/:id/recalculate-classification', evidenceBarrierController.recalculateClassification);

// Stage 3D: Sequence-of-Events Timeline, Witness Statements & PHA / BowTie Revalidation Link
router.get('/:id/timeline-pha', timelinePhaController.getStage3DWorkspace);
router.post('/:id/timeline', timelinePhaController.upsertTimelineEvent);
router.delete('/:id/timeline/:eventId', timelinePhaController.deleteTimelineEvent);
router.post('/:id/witnesses/upload', witnessUpload.single('file'), timelinePhaController.uploadWitnessAttachment);
router.post('/:id/witnesses', timelinePhaController.upsertWitnessStatement);
router.delete('/:id/witnesses/:witnessId', timelinePhaController.deleteWitnessStatement);
router.put('/:id/pha-link', timelinePhaController.savePhaBowTieLink);

// Stage 4: Final Investigation Report, Closure Gatekeeper, Digital Sign-Off & Lessons Learned
router.get('/:id/closure-report', closureReportController.getClosureReportWorkspace);
router.put('/:id/lessons-learned', closureReportController.saveLessonsLearned);
router.post('/:id/signoff', closureReportController.submitClosureSignOff);
router.post('/:id/finalize-closure', closureReportController.finalizeIncidentClosure);
router.post('/:id/reopen', closureReportController.reopenIncident);

module.exports = router;
