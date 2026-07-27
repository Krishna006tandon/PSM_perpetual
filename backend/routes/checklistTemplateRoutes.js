const express = require('express');
const router = express.Router();
const checklistTemplateController = require('../controllers/checklistTemplateController');

router.get('/', checklistTemplateController.getAllTemplates);
router.get('/:deptId', checklistTemplateController.getTemplateByDept);
router.put('/:deptId', checklistTemplateController.upsertTemplate);
router.post('/:deptId/questions', checklistTemplateController.addQuestion);
router.delete('/:deptId/questions/:index', checklistTemplateController.removeQuestion);

module.exports = router;
