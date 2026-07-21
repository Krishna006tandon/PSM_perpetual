const mongoose = require('mongoose');

const deviationSchema = new mongoose.Schema({
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
}, { timestamps: true });

// Pre-save hook to automatically compute deviationAuto
deviationSchema.pre('save', function() {
  this.deviationAuto = `${this.guidewords || ''} ${this.parameter || ''} of ${this.processFlowMaterial || ''} from ${this.locationFrom || ''} to ${this.locationTo || ''}`.trim();
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
