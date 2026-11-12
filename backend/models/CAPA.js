const mongoose = require('mongoose');

const capaSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
    index: true
  },
  whyNodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WhyWhyNode',
    default: null
  },
  actionNumber: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    enum: ['Corrective', 'Preventive'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  assignee: {
    name: { type: String, required: true },
    email: { type: String, default: '' },
    designation: { type: String, default: '' }
  },
  targetDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Submitted For Verification', 'Verified & Closed', 'Rejected / Rework'],
    default: 'Open'
  },

  // Module 6: CAPA Digital Verification & Field Sign-Off
  verification: {
    assigneeNotes: String,
    beforePhotoUrl: String,
    afterPhotoUrl: String,
    submittedAt: Date,
    submittedBy: String,

    reviewedBy: String,
    reviewedAt: Date,
    reviewComments: String,
    isAccepted: Boolean
  },

  mocReference: {
    requiresMoc: { type: Boolean, default: false },
    mocId: { type: mongoose.Schema.Types.ObjectId, ref: 'MOCTicket', default: null },
    mocNumber: { type: String, default: '' }
  },

  escalation: {
    isEscalated: { type: Boolean, default: false },
    escalationDate: Date,
    escalationReason: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CAPA', capaSchema);
