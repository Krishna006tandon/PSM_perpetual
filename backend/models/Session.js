const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  companyCode: { type: String },
  studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true },
  date: { type: String, required: true }, // Format: DD-MMM-YY
  duration: { type: String }, // e.g., '7.75 hrs'
  description: { type: String },
  placesUsed: { type: String },
  comment: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
