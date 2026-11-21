const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: [
        'Bug / Error',
        'Performance / Lag',
        'Calculation / Formula',
        'Feature Request',
        'UI / Display',
        'Access / Permission',
        'Other'
      ],
      default: 'Bug / Error'
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Under Review', 'Resolved', 'Closed'],
      default: 'Open'
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    customerName: {
      type: String,
      trim: true,
      default: 'Anonymous Customer'
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    companyName: {
      type: String,
      trim: true,
      default: 'N/A'
    },
    companyCode: {
      type: String,
      trim: true,
      default: ''
    },
    contact: {
      type: String,
      trim: true,
      default: ''
    },
    systemInfo: {
      currentUrl: { type: String, default: '' },
      studyId: { type: String, default: '' },
      studyName: { type: String, default: '' },
      browser: { type: String, default: '' },
      os: { type: String, default: '' },
      screenResolution: { type: String, default: '' },
      pingMs: { type: Number, default: null },
      memoryMB: { type: Number, default: null }
    },
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, default: '' },
        mimetype: { type: String, default: '' },
        size: { type: Number, default: 0 }
      }
    ],
    assignedDev: {
      type: String,
      default: 'nexbyte.dev@gmail.com'
    },
    resolutionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    resolvedAt: {
      type: Date
    },
    timeline: [
      {
        action: { type: String, required: true }, // e.g., 'Ticket Created', 'Status Updated', 'Resolution Note Added'
        status: { type: String },
        actor: { type: String, default: 'System' }, // 'Customer', 'NexByte_Core', 'Owner'
        actorEmail: { type: String, default: '' },
        note: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
    messages: [
      {
        sender: {
          type: String,
          enum: ['Customer', 'Developer', 'Owner'],
          required: true
        },
        senderName: { type: String, default: '' },
        senderEmail: { type: String, default: '' },
        message: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Ticket', TicketSchema);
