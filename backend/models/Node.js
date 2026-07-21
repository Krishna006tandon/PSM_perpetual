const mongoose = require('mongoose');

const nodeSchema = new mongoose.Schema({
  studyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Study',
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  intention: {
    type: String,
    default: ''
  },
  boundary: {
    type: String,
    default: ''
  },
  eqCount: {
    type: String,
    default: ''
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Node', nodeSchema);
