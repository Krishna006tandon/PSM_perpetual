const express = require('express');
const router = express.Router();
const RiskCriteria = require('../models/RiskCriteria');
const auth = require('../middleware/auth');

router.use(auth);

// Helper to generate default matrix if none exists
const generateDefaultRiskCriteria = (studyId) => {
  const categories = [
    { name: 'Low', color: '#4ade80' },    // Green
    { name: 'Medium', color: '#facc15' }, // Yellow
    { name: 'High', color: '#f97316' },   // Orange
    { name: 'Extreme', color: '#ef4444' } // Red
  ];

  const consequenceCategories = ['Safety', 'Environment', 'Asset', 'Reputation'];

  const severityLevels = [1, 2, 3, 4, 5].map(lvl => {
    const consequences = {};
    consequenceCategories.forEach(cat => consequences[cat] = '');
    return { level: lvl, name: `Severity ${lvl}`, description: '', consequences };
  });

  const likelihoodLevels = [1, 2, 3, 4, 5].map(lvl => ({ level: lvl, name: `Likelihood ${lvl}`, description: '', frequency: '' }));

  const matrixCells = [];
  for (let s = 1; s <= 5; s++) {
    for (let l = 1; l <= 5; l++) {
      const score = s * l;
      let category = 'Low';
      if (score >= 20) category = 'Extreme';
      else if (score >= 12) category = 'High';
      else if (score >= 6) category = 'Medium';

      matrixCells.push({
        severityLevel: s,
        likelihoodLevel: l,
        score,
        category
      });
    }
  }

  return {
    studyId,
    consequenceCategories,
    severityLevels,
    likelihoodLevels,
    matrixCells,
    riskCategories: categories
  };
};

// GET risk criteria for a study
router.get('/:studyId', async (req, res) => {
  try {
    let criteria = await RiskCriteria.findOne({ studyId: req.params.studyId });
    if (!criteria) {
      // Create defaults
      const defaults = generateDefaultRiskCriteria(req.params.studyId);
      defaults.companyCode = req.user.companyCode;
      criteria = new RiskCriteria(defaults);
      await criteria.save();
    } else {
      // Migrate existing records that might lack consequence categories
      let modified = false;
      if (!criteria.consequenceCategories || criteria.consequenceCategories.length === 0) {
        criteria.consequenceCategories = ['Safety', 'Environment', 'Asset', 'Reputation'];
        modified = true;
      }
      criteria.severityLevels.forEach(s => {
        if (!s.consequences) {
          s.consequences = new Map();
          modified = true;
        }
        criteria.consequenceCategories.forEach(cat => {
          if (!s.consequences.has(cat)) {
            s.consequences.set(cat, '');
            modified = true;
          }
        });
      });
      if (modified) await criteria.save();
    }
    res.json(criteria);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT to update risk criteria
router.put('/:studyId', async (req, res) => {
  try {
    const updated = await RiskCriteria.findOneAndUpdate(
      { studyId: req.params.studyId },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
