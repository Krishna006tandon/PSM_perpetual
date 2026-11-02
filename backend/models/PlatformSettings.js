const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema({
  freeTrialEnabled: {
    type: Boolean,
    default: true
  },
  defaultTrialDays: {
    type: Number,
    default: 14 // Platform Owner can set any number of days, e.g. 7, 14, 30, etc.
  },
  trialFeatures: {
    type: [String],
    default: ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT']
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

platformSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      freeTrialEnabled: true,
      defaultTrialDays: 14,
      trialFeatures: ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT']
    });
  }
  return settings;
};

module.exports = mongoose.model('PlatformSettings', platformSettingsSchema);
