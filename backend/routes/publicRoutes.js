const express = require('express');
const router = express.Router();
const SubscriptionPackage = require('../models/SubscriptionPackage');
const PlatformSettings = require('../models/PlatformSettings');

// Get active packages for the landing page
router.get('/packages', async (req, res) => {
  try {
    const packages = await SubscriptionPackage.find({ isActive: true }).sort({ price: 1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public free trial settings
router.get('/trial-settings', async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.json({
      freeTrialEnabled: settings.freeTrialEnabled !== false,
      defaultTrialDays: settings.defaultTrialDays || 14,
      trialFeatures: Array.isArray(settings.trialFeatures) && settings.trialFeatures.length > 0
        ? settings.trialFeatures
        : ['PHA', 'MOC', 'LOPA', 'BOWTIE', 'INCIDENT']
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
