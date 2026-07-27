const express = require('express');
const router = express.Router();
const ColumnSetting = require('../models/ColumnSetting');
const auth = require('../middleware/auth');

router.use(auth);

// GET columns for a specific registry type within a study
router.get('/:studyId/:registryType', async (req, res) => {
  try {
    const setting = await ColumnSetting.findOne({
      studyId: req.params.studyId,
      registryType: req.params.registryType
    });
    
    // If not found, return empty columns array (defaults)
    res.json(setting || { columns: [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST/PUT to save or update columns
router.put('/:studyId/:registryType', async (req, res) => {
  try {
    const updated = await ColumnSetting.findOneAndUpdate(
      { studyId: req.params.studyId, registryType: req.params.registryType },
      { $set: { columns: req.body.columns } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
