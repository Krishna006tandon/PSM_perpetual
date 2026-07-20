const mongoose = require('mongoose');

const studySchema = new mongoose.Schema({
  studyName: {
    type: String,
    required: true,
  },
  studyCoordinator: {
    type: String,
    required: true,
  },
  contactInfo: {
    type: String,
  },
  facility: {
    type: String,
    required: true,
  },
  owner: {
    type: String,
  },
  plantUnit: {
    type: String,
    required: true,
  },
  phaType: {
    type: String,
    default: 'HAZOP',
  },
  studyStatus: {
    type: String,
    default: 'Planned',
  },
  lastAccessed: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('Study', studySchema);
