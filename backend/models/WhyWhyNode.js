const mongoose = require('mongoose');

const whyWhyNodeSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
    index: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhyWhyNode',
    default: null, // null indicates root Problem Anchor
    index: true
  },
  statement: {
    type: String,
    required: true,
    trim: true
  },
  whyLevel: {
    type: Number,
    default: 0 // 0 = Problem Anchor, 1 = Why 1, 2 = Why 2, etc.
  },
  branchIndex: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Exploring', 'Validated', 'Disproven', 'Inconclusive'],
    default: 'Exploring'
  },
  isRootCause: {
    type: Boolean,
    default: false
  },
  rootCauseType: {
    type: String,
    enum: ['None', 'Primary Root Cause', 'Secondary Root Cause', 'Contributing Factor'],
    default: 'None'
  },
  api754Category: {
    type: String,
    default: ''
  },
  api754Subcategory: {
    type: String,
    default: ''
  },
  evidence: [{
    title: String,
    fileUrl: String,
    notes: String,
    addedBy: String,
    addedAt: { type: Date, default: Date.now }
  }],
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    default: 'CFT Investigator'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WhyWhyNode', whyWhyNodeSchema);
