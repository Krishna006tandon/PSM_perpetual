const express = require('express');
const router = express.Router();
const mocController = require('../controllers/mocController');

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

module.exports = router;
