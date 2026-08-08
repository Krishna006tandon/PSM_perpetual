const express = require('express');
const router = express.Router();
const SubscriptionPackage = require('../models/SubscriptionPackage');

// Get active packages for the landing page
router.get('/packages', async (req, res) => {
  try {
    const packages = await SubscriptionPackage.find({ isActive: true }).sort({ price: 1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
