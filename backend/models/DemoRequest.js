const mongoose = require('mongoose');

const DemoRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  industry: {
    type: String,
    trim: true,
    default: 'Chemicals / Petrochemicals'
  },
  interest: {
    type: String,
    trim: true,
    default: 'Full Suite'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Pending', 'Contacted', 'Scheduled', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  meetingLink: {
    type: String,
    trim: true,
    default: ''
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  scheduledMessage: {
    type: String,
    trim: true,
    default: ''
  },
  adminNotes: {
    type: String,
    default: ''
  },
  ipAddress: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DemoRequest', DemoRequestSchema);
