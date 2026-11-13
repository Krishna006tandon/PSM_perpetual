const express = require('express');
const router = express.Router();
const SubscriptionPackage = require('../models/SubscriptionPackage');
const PlatformSettings = require('../models/PlatformSettings');
const DemoRequest = require('../models/DemoRequest');
const nodemailer = require('nodemailer');

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

// Book / Request a live demo
router.post('/book-demo', async (req, res) => {
  try {
    const { name, email, company, phone, industry, interest, notes } = req.body;

    if (!name || !email || !company) {
      return res.status(400).json({ error: 'Name, work email, and company name are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name).trim();
    const cleanCompany = String(company).trim();

    const demo = new DemoRequest({
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      phone: (phone || '').trim(),
      industry: industry || 'Chemicals / Petrochemicals',
      interest: interest || 'Full Suite',
      notes: (notes || '').trim(),
      ipAddress: req.ip || req.headers['x-forwarded-for'] || ''
    });

    await demo.save();

    // Send confirmation emails if SMTP credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // 1. Email to the user
      const clientMail = {
        from: `"PS-MagnaShield Team" <${process.env.EMAIL_USER}>`,
        to: cleanEmail,
        subject: `Your PS-MagnaShield Live Demo Request is Confirmed`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #00a896; margin: 0 0 6px 0;">PS-MagnaShield</h2>
              <p style="color: #64748b; margin: 0; font-size: 0.9rem;">Next-Generation Process Safety & Risk Management Suite</p>
            </div>
            <p>Dear <strong>${cleanName}</strong>,</p>
            <p>Thank you for requesting a personalized live demonstration of <strong>PS-MagnaShield</strong> for <strong>${cleanCompany}</strong>!</p>
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Company / Facility:</strong> ${cleanCompany}</p>
              <p style="margin: 4px 0;"><strong>Industry Sector:</strong> ${demo.industry}</p>
              <p style="margin: 4px 0;"><strong>Modules of Interest:</strong> ${demo.interest}</p>
              ${demo.phone ? `<p style="margin: 4px 0;"><strong>Phone / Contact:</strong> ${demo.phone}</p>` : ''}
              <p style="margin: 4px 0;"><strong>Status:</strong> Confirmed & Assigned to Process Safety Specialist</p>
            </div>
            <p>Our Senior Process Safety Consultant will contact you at <strong>${cleanEmail}</strong> within 2 business hours with calendar invites to tailor the walkthrough around your plant units, P&IDs, and regulatory mandates (OSHA 1910.119 / CCPS / API RP 754).</p>
            <p style="color: #64748b; font-size: 0.9em; margin-top: 24px;">If you have any immediate questions, simply reply directly to this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 0.85rem; color: #94a3b8; text-align: center; margin: 0;">
              Perpetual Solutions &bull; Empowering Engineering Teams
            </p>
          </div>
        `
      };

      // 2. Alert to admin
      const adminMail = {
        from: `"PSM Demo Alerts" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `🚨 New Live Demo Request: ${cleanName} (${cleanCompany})`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; max-width: 600px;">
            <h3 style="color: #0066cc; margin-top: 0;">New Inbound Demo Lead</h3>
            <p>A new live product demonstration has been requested from the landing page:</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.95rem;">
              <tr><td style="padding: 6px; font-weight: bold; width: 140px;">Name:</td><td style="padding: 6px;">${cleanName}</td></tr>
              <tr><td style="padding: 6px; font-weight: bold;">Work Email:</td><td style="padding: 6px;"><a href="mailto:${cleanEmail}">${cleanEmail}</a></td></tr>
              <tr><td style="padding: 6px; font-weight: bold;">Company:</td><td style="padding: 6px;">${cleanCompany}</td></tr>
              <tr><td style="padding: 6px; font-weight: bold;">Phone:</td><td style="padding: 6px;">${demo.phone || 'Not provided'}</td></tr>
              <tr><td style="padding: 6px; font-weight: bold;">Industry:</td><td style="padding: 6px;">${demo.industry}</td></tr>
              <tr><td style="padding: 6px; font-weight: bold;">Interest:</td><td style="padding: 6px; color: #00a896; font-weight: bold;">${demo.interest}</td></tr>
              ${demo.notes ? `<tr><td style="padding: 6px; font-weight: bold;">Notes:</td><td style="padding: 6px;">${demo.notes}</td></tr>` : ''}
              <tr><td style="padding: 6px; font-weight: bold;">Timestamp:</td><td style="padding: 6px;">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</td></tr>
            </table>
            <p style="margin-top: 20px; font-size: 0.85rem; color: #64748b;">
              Please contact this lead within 2 business hours. You can also view this request in the Platform Owner Dashboard.
            </p>
          </div>
        `
      };

      Promise.all([
        transporter.sendMail(clientMail).catch(e => console.warn('Demo client email error:', e.message)),
        transporter.sendMail(adminMail).catch(e => console.warn('Demo admin email error:', e.message))
      ]);
    }

    res.json({
      success: true,
      message: 'Demo request registered successfully! Our team will contact you shortly.',
      id: demo._id
    });
  } catch (err) {
    console.error('Error booking demo:', err);
    res.status(500).json({ error: err.message || 'Failed to submit demo request' });
  }
});

// Alias route
router.post('/request-demo', (req, res, next) => {
  req.url = '/book-demo';
  router.handle(req, res, next);
});

module.exports = router;
