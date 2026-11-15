const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const mocController = require('../controllers/mocController');

// Multer storage for MOC drawings, P&IDs and technical attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', 'moc');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${safeBase}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Protect all MOC routes with JWT auth middleware
router.use(auth);

router.post('/', mocController.createMOC);
router.get('/', mocController.getAllMOCs);
router.get('/:mocId', mocController.getMOCById);
router.patch('/:mocId/advance', mocController.advanceStage);
router.patch('/:mocId/reject', mocController.rejectMOC);
router.patch('/:mocId/query', mocController.addQuery);
router.patch('/:mocId/resolve-query', mocController.resolveQuery);
router.patch('/:mocId/checklist', mocController.submitChecklist);
router.patch('/:mocId/cost', mocController.submitCostEstimation);
router.patch('/:mocId/secondary-approval', mocController.submitSecondaryApproval);
router.patch('/:mocId/assign-pm', mocController.assignPM);
router.patch('/:mocId/close', mocController.closeMOC);
router.patch('/:mocId/unreject', mocController.unrejectMOC);
router.patch('/:mocId/archive', mocController.archiveMOC);
router.patch('/:mocId/unarchive', mocController.unarchiveMOC);
router.delete('/:mocId', mocController.deleteMOC);

// Attachment routes
router.post('/:mocId/attachments', upload.single('file'), mocController.uploadAttachment);
router.delete('/:mocId/attachments/:attachmentId', mocController.deleteAttachment);

module.exports = router;
