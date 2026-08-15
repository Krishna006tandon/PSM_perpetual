const mongoose = require('mongoose');

const studyRevisionSchema = new mongoose.Schema({
  companyCode: { type: String },
  studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true },
  revision: { type: String, required: true }, // e.g., '00'
  startDate: { type: String }, // e.g., '23-Apr-25'
  endDate: { type: String },
  changesMade: { type: String },
  changedBy: { type: String },
  reviewBy: { type: String },
  approvedBy: { type: String },
  comments: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('StudyRevision', studyRevisionSchema);
