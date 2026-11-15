const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const checklistTemplateController = require('../controllers/checklistTemplateController');

// Protect checklist template routes
router.use(auth);

router.get('/', checklistTemplateController.getAllTemplates);
router.get('/:deptId', checklistTemplateController.getTemplateByDept);
router.put('/:deptId', checklistTemplateController.upsertTemplate);
router.post('/:deptId/questions', checklistTemplateController.addQuestion);
router.delete('/:deptId/questions/:index', checklistTemplateController.removeQuestion);

module.exports = router;
