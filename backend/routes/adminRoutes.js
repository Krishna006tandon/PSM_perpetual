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

// ================= DEMO REQUESTS / LEADS =================
const DemoRequest = require('../models/DemoRequest');

router.get('/demo-requests', async (req, res) => {
  try {
    const requests = await DemoRequest.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/demo-requests/:id', async (req, res) => {
  try {
    const { status, adminNotes, meetingLink, scheduledAt, scheduledMessage, sendEmail = true } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (scheduledMessage !== undefined) updateData.scheduledMessage = scheduledMessage;
    updateData.updatedAt = new Date();

    const updated = await DemoRequest.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: 'Demo request not found' });

    // Send automated status-update email if sendEmail is true and SMTP credentials configured
    if (sendEmail && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        let emailSubject = '';
        let emailHtml = '';
        const targetEmail = updated.email;
        const targetName = updated.name || 'Valued Client';
        const targetCompany = updated.company || 'Organization';

        if (updated.status === 'Scheduled') {
          const dateStr = updated.scheduledAt 
            ? new Date(updated.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' }) + ' IST'
            : 'To be confirmed / As coordinated';
          
          emailSubject = `🗓️ PS-MagnaShield Live Demo Scheduled: ${targetCompany}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: #00a896; margin: 0 0 6px 0;">PS-MagnaShield</h2>
                <p style="color: #64748b; margin: 0; font-size: 0.9rem;">Next-Generation Process Safety & Risk Management Suite</p>
              </div>
              <p>Dear <strong>${targetName}</strong>,</p>
              <p>Your live 1-on-1 demonstration of <strong>PS-MagnaShield</strong> for <strong>${targetCompany}</strong> has been officially scheduled!</p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 10px; margin: 20px 0;">
                <p style="margin: 6px 0;"><strong>📅 Date & Time:</strong> <span style="color: #15803d; font-size: 1.05rem; font-weight: bold;">${dateStr}</span></p>
                ${updated.meetingLink ? `
                  <p style="margin: 12px 0 6px 0;"><strong>🔗 Meeting Join Link:</strong></p>
                  <div style="margin: 10px 0;">
                    <a href="${updated.meetingLink}" target="_blank" rel="noopener noreferrer" style="background-color: #00a896; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
                      👉 Join Video Meeting
                    </a>
                  </div>
                  <p style="margin: 4px 0; font-size: 0.85rem; color: #64748b; word-break: break-all;">${updated.meetingLink}</p>
                ` : '<p style="margin: 6px 0; color: #64748b;">(Meeting link will be shared via calendar invitation)</p>'}
                <p style="margin: 8px 0 4px 0;"><strong>🎯 Modules to Review:</strong> ${updated.interest}</p>
              </div>

              ${updated.scheduledMessage ? `
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; margin-bottom: 20px;">
                  <p style="margin: 0 0 4px 0; font-weight: bold; color: #475569; font-size: 0.85rem; text-transform: uppercase;">Message from Senior Safety Consultant:</p>
                  <p style="margin: 0; color: #1e293b; font-size: 0.92rem; white-space: pre-line;">${updated.scheduledMessage}</p>
                </div>
              ` : ''}

              <p style="font-size: 0.92rem; color: #334155; line-height: 1.5;">
                During the session, our consultant will walk through your unit scenarios, HAZOP/LOPA worksheets, 7-stage MOC governance, BowTie risk diagrams, and 5-stage Incident Investigation workflows.
              </p>
              <p style="font-size: 0.88rem; color: #64748b;">
                Need to reschedule or invite colleagues? Simply reply directly to this email.
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 0.85rem; color: #94a3b8; text-align: center; margin: 0;">
                Perpetual Solutions &bull; Empowering Engineering Teams
              </p>
            </div>
          `;
        } else if (updated.status === 'Contacted') {
          emailSubject = `Reviewing Your PS-MagnaShield Demo Request - ${targetCompany}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #00a896; margin-top: 0;">PS-MagnaShield Demonstration</h2>
              <p>Dear <strong>${targetName}</strong>,</p>
              <p>Our Senior Process Safety Engineering team has reviewed your demo request for <strong>${targetCompany}</strong>.</p>
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Company:</strong> ${targetCompany}</p>
                <p style="margin: 4px 0;"><strong>Focus Area:</strong> ${updated.interest}</p>
                <p style="margin: 4px 0;"><strong>Status:</strong> Under Consultant Review & Scheduling</p>
              </div>
              <p>A specialist will reach out shortly to coordinate a convenient meeting window for you and your safety committee.</p>
              <p style="color: #64748b; font-size: 0.9em;">If you have immediate questions or want to provide sample P&IDs/units in advance, feel free to reply directly to this email.</p>
              <p>Best Regards,<br/><strong>The Perpetual Solutions Team</strong></p>
            </div>
          `;
        } else if (updated.status === 'Completed') {
          emailSubject = `Thank You for Attending the PS-MagnaShield Demonstration - ${targetCompany}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #00a896; margin-top: 0;">Thank You for Joining Us!</h2>
              <p>Dear <strong>${targetName}</strong>,</p>
              <p>Thank you for taking the time to participate in our live demonstration of <strong>PS-MagnaShield</strong> today for <strong>${targetCompany}</strong>.</p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Demonstration Status:</strong> Completed</p>
                <p style="margin: 4px 0;"><strong>Focus Modules Covered:</strong> ${updated.interest}</p>
              </div>
              <p>We hope the session provided valuable insights into how your team can streamline HAZOP, LOPA, MOC, BowTie, and Incident Investigation workflows while ensuring strict compliance.</p>
              <p><strong>Next Steps:</strong> You can evaluate the platform with your team via our no-risk Free Trial or request a customized multi-user proposal.</p>
              <p style="color: #64748b; font-size: 0.9em;">If you need any follow-up documentation or trial credentials, reply directly to this thread.</p>
              <p>Best Regards,<br/><strong>The Perpetual Solutions Team</strong></p>
            </div>
          `;
        } else if (updated.status === 'Cancelled') {
          emailSubject = `Update on Your PS-MagnaShield Demo Request - ${targetCompany}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #dc2626; margin-top: 0;">Demo Request Update</h2>
              <p>Dear <strong>${targetName}</strong>,</p>
              <p>This is to confirm that your demo request for <strong>${targetCompany}</strong> has been marked as cancelled.</p>
              <p>If this was in error, or if you would like to reschedule at any point in the future, please feel free to submit a new request on our website or reply directly to this email.</p>
              <p>Best Regards,<br/><strong>The Perpetual Solutions Team</strong></p>
            </div>
          `;
        } else if (updated.status === 'Pending') {
          emailSubject = `PS-MagnaShield Demo Request Status: Pending Review`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #00a896; margin-top: 0;">PS-MagnaShield Demonstration</h2>
              <p>Dear <strong>${targetName}</strong>,</p>
              <p>Your demo request for <strong>${targetCompany}</strong> has been received and is currently in queue for review by our engineering team.</p>
              <p>Best Regards,<br/><strong>The Perpetual Solutions Team</strong></p>
            </div>
          `;
        }

        if (emailSubject && emailHtml) {
          transporter.sendMail({
            from: `"PS-MagnaShield Team" <${process.env.EMAIL_USER}>`,
            to: targetEmail,
            subject: emailSubject,
            html: emailHtml
          }).catch(err => console.error('Error sending demo status email:', err.message));
        }
      } catch (mailErr) {
        console.error('Mail transporter error in demo status update:', mailErr);
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/demo-requests/:id', async (req, res) => {
  try {
    await DemoRequest.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Demo request deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

