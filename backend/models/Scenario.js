const mongoose = require('mongoose');

const scenarioSchema = new mongoose.Schema({
  studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true },
  nodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Node', required: true },
  
  // We can reference existing models, or we can just store strings if we want them decoupled.
  // Based on the user's requirement to "fetch", we will reference the exact documents.
  deviationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Deviation' },
  causeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Cause' },
  
  consequenceGroupId: { type: String },
  consequencesImmediate: { type: String, default: '' },
  consequencesUltimate: { type: String, default: '' },
  
  inherentRiskS: { type: String, default: '' },
  inherentRiskL: { type: String, default: '' },
  inherentRiskRR: { type: String, default: '' },
  
  presentProtection: { type: String, default: '' },
  
  mitigatedRiskS: { type: String, default: '' },
  mitigatedRiskL: { type: String, default: '' },
  mitigatedRiskRR: { type: String, default: '' },
  
  residualRiskS: { type: String, default: '' },
  residualRiskL: { type: String, default: '' },
  residualRiskRR: { type: String, default: '' },
  
  additionalProtection: { type: String, default: '' },
  remarks: { type: String, default: '' },
  status: { type: String, default: '' },

  // Dynamic custom data maps for new tabs
  safeguardData: { type: Map, of: String, default: {} },
  recommendationData: { type: Map, of: String, default: {} },
  riskData: { type: Map, of: String, default: {} },
  
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Scenario', scenarioSchema);
