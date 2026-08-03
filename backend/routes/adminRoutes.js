const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Study = require('../models/Study');
const TeamMember = require('../models/TeamMember');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const Transaction = require('../models/Transaction');

// Middleware to enforce SuperAdmin access
const requireSuperAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Access denied. SuperAdmin only.' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.use(auth);
router.use(requireSuperAdmin);

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAdmins = await User.countDocuments({ companyCode: req.user.companyCode, role: 'Admin' });
    const totalProjects = await Study.countDocuments();
    
    const revenueAgg = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    
    // Recent projects
    const recentProjects = await Study.find({ companyCode: req.user.companyCode, companyCode: req.user.companyCode }).sort({ createdAt: -1 }).limit(5);

    res.json({
      totalUsers,
      totalAdmins,
      totalProjects,
      totalRevenue,
      recentProjects
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Packages CRUD
router.get('/packages', async (req, res) => {
  try {
    const packages = await SubscriptionPackage.find({ companyCode: req.user.companyCode, companyCode: req.user.companyCode }).sort({ createdAt: -1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const pkg = new SubscriptionPackage(req.body);
    const saved = await pkg.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/packages/:id', async (req, res) => {
  try {
    const updated = await SubscriptionPackage.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/packages/:id', async (req, res) => {
  try {
    await SubscriptionPackage.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
