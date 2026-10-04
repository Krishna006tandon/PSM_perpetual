const mongoose = require('mongoose');

const barrierItemSchema = new mongoose.Schema({
  event_name: { type: String, default: '' },
  barrier_type: { type: String, enum: ['cause', 'consequence'], required: true },
  threat_or_consequence_name: { type: String, default: '' },
  pb: [{ type: String }],
  pb_tag_no: [{ type: String }],
  barrier_owner: [{ type: String }],
  escalation_factor: { type: String, default: '' },
  escalation_control: { type: String, default: '' },
  escalation_control_owner: { type: String, default: '' },
  available_new: { type: String, default: 'Available' },
  type: { type: String, default: 'Engg' },
  c: { type: Number, default: 0 },
  p: { type: Number, default: 0 },
  r: { type: Number, default: 0 },
  recommendation: { type: String, default: '' },
  c_rec: { type: Number, default: 0 },
  p_rec: { type: Number, default: 0 },
  r_rec: { type: Number, default: 0 },
  action_by: { type: String, default: '' },
  target_completion: { type: String, default: '' },
  remark: { type: String, default: '' },
  status: { type: String, default: 'Open' }
}, { timestamps: true });

const bowTieSchema = new mongoose.Schema({
  studyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Study',
    required: true,
    index: true
  },
  scenarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Scenario'
  },
  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Node'
  },
  deviationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deviation'
  },
  eventName: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    default: ''
  },
  hazardDescription: {
    type: String,
    default: ''
  },
  riskRating: {
    type: Number,
    default: 0
  },
  barriers: [barrierItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('BowTie', bowTieSchema);
