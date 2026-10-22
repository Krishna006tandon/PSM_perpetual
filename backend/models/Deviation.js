const mongoose = require('mongoose');

const deviationSchema = new mongoose.Schema({
  companyCode: { type: String },
  studyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  guidewords: {
    type: String,
    default: ''
  },
  parameter: {
    type: String,
    default: ''
  },
  processFlowMaterial: {
    type: String,
    default: ''
  },
  locationFrom: {
    type: String,
    default: ''
  },
  locationTo: {
    type: String,
    default: ''
  },
  deviationAuto: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
,
  customData: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Helper to build deviationAuto from components
const computeDeviationText = (doc) => {
  const parts = [];
  if (doc.guidewords && doc.guidewords.trim()) parts.push(doc.guidewords.trim());
  if (doc.parameter && doc.parameter.trim()) parts.push(doc.parameter.trim());
  if (doc.processFlowMaterial && doc.processFlowMaterial.trim()) parts.push(`of ${doc.processFlowMaterial.trim()}`);
  if (doc.locationFrom && doc.locationFrom.trim()) parts.push(`from ${doc.locationFrom.trim()}`);
  if (doc.locationTo && doc.locationTo.trim()) parts.push(`to ${doc.locationTo.trim()}`);
  return parts.join(' ').trim();
};

// Pre-save hook to automatically compute deviationAuto
deviationSchema.pre('save', function() {
  const computed = computeDeviationText(this);
  if (computed) {
    this.deviationAuto = computed;
  } else if (!this.deviationAuto || this.deviationAuto.replace(/\s+/g, ' ').trim() === 'of from to') {
    this.deviationAuto = '';
  }
});

// Pre-findOneAndUpdate hook to automatically compute deviationAuto on update
deviationSchema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  // If using $set
  if (update.$set) {
    const doc = { ...this._conditions, ...update.$set }; // Approximation for auto-compute
    if (update.$set.guidewords !== undefined || update.$set.parameter !== undefined || 
        update.$set.processFlowMaterial !== undefined || update.$set.locationFrom !== undefined || 
        update.$set.locationTo !== undefined) {
      // Handled by frontend for now
    }
  }
});

module.exports = mongoose.model('Deviation', deviationSchema);
