const mongoose = require('mongoose');

const mocTicketSchema = new mongoose.Schema({
  mocId: { type: String, unique: true },
  title: { type: String, required: true },
  description: String,
  plant: String,
  department: String,
  changeType: { type: String, enum: ['Permanent', 'Temporary'] },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
  urgency: String,
  requestor: {
    name: String,
    designation: String,
    contact: String,
    orgNumber: String
  },
  currentStageIndex: { type: Number, default: 0, min: 0, max: 10 },
  status: { type: String, enum: ['Active', 'Closed', 'Rejected'], default: 'Active' },
  stageHistory: [{
    stageIndex: Number,
    action: { type: String, enum: ['Approved', 'Rejected', 'Query Sent', 'Submitted'] },
    actor: { name: String, designation: String },
    comments: String,
    timestamp: { type: Date, default: Date.now }
  }],
  checklistResponses: {
    stage3: [{ 
      question: String, 
      status: { type: String, enum: ['Yes', 'No', 'NA', 'Pending'], default: 'Pending' }, 
      remarks: String 
    }],
    stage5: mongoose.Schema.Types.Mixed
  },
  costEstimation: {
    departments: [{
      name: String,
      materialCost: { type: Number, default: 0 },
      thirdPartyCost: { type: Number, default: 0 },
      remarks: String
    }]
  },
  queries: [{
    from: String,
    to: String,
    description: String,
    timestamp: { type: Date, default: Date.now }
  }],
  assignedPM: {
    name: String,
    department: String,
    assignedBy: String,
    assignedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('MOCTicket', mocTicketSchema);
