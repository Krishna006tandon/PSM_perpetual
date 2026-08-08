const mongoose = require('mongoose');

const causeSchema = new mongoose.Schema({
  companyCode: { type: String },
  studyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  categoryType: {
    type: String,
    default: ''
  },
  equipment: {
    type: String,
    default: ''
  },
  instrument: {
    type: String,
    default: ''
  },
  sourceReference: {
    type: String,
    default: ''
  },
  comments: {
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

module.exports = mongoose.model('Cause', causeSchema);
