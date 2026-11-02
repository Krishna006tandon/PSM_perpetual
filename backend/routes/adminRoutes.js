const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Study = require('../models/Study');
const TeamMember = require('../models/TeamMember');
const SubscriptionPackage = require('../models/SubscriptionPackage');
const Transaction = require('../models/Transaction');
const PlatformSettings = require('../models/PlatformSettings');

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

// Delete User (Owner only)
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'SuperAdmin') {
      return res.status(403).json({ error: 'Cannot delete SuperAdmin Platform Owner account' });
    }

    // Delete user from User collection
    await User.findByIdAndDelete(req.params.id);

    // Clean up associated TeamMember records if any
    try {
      await TeamMember.deleteMany({ email: user.email });
    } catch (teamErr) {
      console.warn('Non-fatal error cleaning team members for deleted user:', teamErr.message);
    }

    res.json({ success: true, message: `User ${user.email} successfully deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Global Free Trial Settings Endpoints
router.get('/settings/trial', async (req, res) => {
  try {
    const settings = await PlatformSettings.getSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/settings/trial', async (req, res) => {
  try {
    const { freeTrialEnabled, defaultTrialDays, trialFeatures } = req.body;
    const settings = await PlatformSettings.getSettings();
    if (freeTrialEnabled !== undefined) settings.freeTrialEnabled = Boolean(freeTrialEnabled);
    if (defaultTrialDays !== undefined) settings.defaultTrialDays = Math.max(1, Number(defaultTrialDays));
    if (Array.isArray(trialFeatures)) settings.trialFeatures = trialFeatures;
    settings.updatedAt = new Date();
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update or Extend User Free Trial
router.put('/users/:id/trial', async (req, res) => {
  try {
    const { isTrial, trialDays, addDays, subscriptionStatus, trialEndDate } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'SuperAdmin') return res.status(403).json({ error: 'Cannot modify SuperAdmin' });

    if (addDays) {
      const daysToAdd = Number(addDays);
      const currentEnd = user.trialEndDate && new Date(user.trialEndDate) > new Date() 
        ? new Date(user.trialEndDate) 
        : new Date();
      user.trialEndDate = new Date(currentEnd.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
      user.isTrial = true;
      user.subscriptionStatus = 'trial';
      user.trialDays = (user.trialDays || 0) + daysToAdd;
    } else if (trialEndDate) {
      user.trialEndDate = new Date(trialEndDate);
      user.isTrial = true;
      user.subscriptionStatus = new Date(trialEndDate) > new Date() ? 'trial' : 'expired';
    } else if (trialDays !== undefined) {
      const days = Math.max(1, Number(trialDays));
      user.trialDays = days;
      user.isTrial = true;
      user.trialStartDate = user.trialStartDate || new Date();
      user.trialEndDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      user.subscriptionStatus = 'trial';
    }

    if (isTrial !== undefined) {
      user.isTrial = Boolean(isTrial);
      if (!user.isTrial) {
        user.subscriptionStatus = subscriptionStatus || 'active';
      }
    }

    if (subscriptionStatus && !addDays && !trialEndDate && trialDays === undefined) {
      user.subscriptionStatus = subscriptionStatus;
      if (subscriptionStatus === 'active') {
        user.isTrial = false;
      }
    }

    await user.save();
    const updated = await User.findById(user._id).select('-password').populate('packageId');
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

