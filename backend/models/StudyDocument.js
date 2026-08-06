const mongoose = require('mongoose');

const studyDocumentSchema = new mongoose.Schema({
  companyCode: { type: String },
  studyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  drawingId: {
    type: String,
    default: ''
  },
  revision: {
    type: String,
    default: ''
  },
  documentType: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  hyperlink: {
    type: String,
    default: ''
  },
  attachmentPath: {
    type: String,
    default: ''
  },
  originalFileName: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  },
  comment: { type: String },
  placesUsed: { type: String },
  customData: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('StudyDocument', studyDocumentSchema);
