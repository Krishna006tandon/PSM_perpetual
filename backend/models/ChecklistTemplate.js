const mongoose = require('mongoose');

const checklistTemplateSchema = new mongoose.Schema({
  departmentId: { type: String, required: true, unique: true },
  departmentName: String,
  questions: [{
    questionText: String,
    isRequired: { type: Boolean, default: true },
    addedBy: String,
    addedAt: { type: Date, default: Date.now }
  }],
  stageApplicable: { type: Number, default: 5 }
});

module.exports = mongoose.model('ChecklistTemplate', checklistTemplateSchema);
