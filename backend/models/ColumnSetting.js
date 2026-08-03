const mongoose = require('mongoose');

const columnDefSchema = new mongoose.Schema({
  companyCode: { type: String },
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, default: 'text' },
  options: [{ type: String }],
  dataSource: { type: String },
  formulaString: { type: String },
  isSystem: { type: Boolean, default: false }
});

const columnSettingSchema = new mongoose.Schema({
  studyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Study', required: true },
  registryType: { type: String, required: true },
  columns: [columnDefSchema]
}, { timestamps: true });

// Ensure one configuration per study per registry type
columnSettingSchema.index({ studyId: 1, registryType: 1 }, { unique: true });

module.exports = mongoose.model('ColumnSetting', columnSettingSchema);
