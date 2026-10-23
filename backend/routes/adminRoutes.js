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
    const totalAdmins = await User.countDocuments({ role: 'Admin' });
    const totalProjects = await Study.countDocuments();
    
    const revenueAgg = await Transaction.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    
    // Recent projects
    const recentProjects = await Study.find({}).sort({ createdAt: -1 }).limit(5);

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
    const packages = await SubscriptionPackage.find({}).sort({ createdAt: -1 });
    res.json(packages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/packages', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.hasAnnual && data.annualPrice) {
      data.price = Number(data.annualPrice);
      data.billingCycle = data.hasOneTime ? 'Both' : 'Yearly';
    } else if (data.hasOneTime && data.oneTimePrice) {
      data.price = Number(data.oneTimePrice);
      data.billingCycle = 'One-time';
    }
    const pkg = new SubscriptionPackage(data);
    const saved = await pkg.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/packages/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.hasAnnual && data.annualPrice) {
      data.price = Number(data.annualPrice);
      data.billingCycle = data.hasOneTime ? 'Both' : 'Yearly';
    } else if (data.hasOneTime && data.oneTimePrice) {
      data.price = Number(data.oneTimePrice);
      data.billingCycle = 'One-time';
    }
    const updated = await SubscriptionPackage.findByIdAndUpdate(req.params.id, data, { new: true });
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

// Users & Features Management for Owner
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'SuperAdmin' } })
      .select('-password')
      .populate('packageId')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/users/:id/features', async (req, res) => {
  try {
    const { features } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { features: Array.isArray(features) ? features : [] },
      { new: true }
    ).select('-password');
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Backup Management Endpoints
const { getBackupStatus, performDatabaseBackup } = require('../services/backupService');

router.get('/backup-status', async (req, res) => {
  try {
    const status = await getBackupStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/trigger-backup', async (req, res) => {
  try {
    const summary = await performDatabaseBackup();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

