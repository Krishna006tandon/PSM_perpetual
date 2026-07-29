const mongoose = require('mongoose');

const riskCriteriaSchema = new mongoose.Schema({
  studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true, unique: true },
  
  consequenceCategories: [{ type: String }],

  severityLevels: [{
    level: { type: Number, required: true },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    consequences: { type: Map, of: String, default: {} }
  }],
  
  likelihoodLevels: [{
    level: { type: Number, required: true },
    name: { type: String, default: '' },
    description: { type: String, default: '' },
    frequency: { type: String, default: '' }
  }],
  
  matrixCells: [{
    severityLevel: { type: Number, required: true },
    likelihoodLevel: { type: Number, required: true },
    score: { type: Number, default: 0 },
    category: { type: String, default: '' }
  }],
  
  riskCategories: [{
    name: { type: String, required: true },
    color: { type: String, default: '#ffffff' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('RiskCriteria', riskCriteriaSchema);
