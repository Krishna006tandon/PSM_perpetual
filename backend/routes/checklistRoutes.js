const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');

// POST request to submit a checklist
// The full URL for this endpoint will be: POST http://localhost:5000/api/checklists/submit
router.post('/submit', checklistController.submitChecklist);

module.exports = router;