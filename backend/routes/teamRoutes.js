const express = require('express');
const router = express.Router();
const TeamMember = require('../models/TeamMember');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const auth = require('../middleware/auth');
const checkStudyAccess = require('../middleware/checkStudyAccess');

// Apply auth middleware to all team routes
router.use(auth);

// Apply checkStudyAccess middleware to routes targeting a specific study
router.use('/:studyId', checkStudyAccess);

// GET all team members for a specific study
router.get('/:studyId', async (req, res) => {
  try {
    const members = await TeamMember.find({ companyCode: req.user.companyCode, studyId: req.params.studyId }).sort({ createdAt: -1 });
    res.json(members);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new team member
router.post('/:studyId', async (req, res) => {
  const {
    fullName,
    email,
    phone,
    company,
    role,
    discipline
  } = req.body;

  try {
    const newMember = new TeamMember({ companyCode: req.user.companyCode, studyId: req.params.studyId,
      fullName,
      email,
      phone,
      company,
      role,
      discipline
    });

    const savedMember = await newMember.save();

    // Check if user account exists
    let user = await User.findOne({ companyCode: req.user.companyCode, email });
    let isNewUser = false;
    let randomPassword = '';

    if (!user) {
      // Create user account with random password
      randomPassword = Math.random().toString(36).slice(-8) + 'P@ss!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(randomPassword, salt);
      
      user = new User({ companyCode: req.user.companyCode, email,
        password: hashedPassword,
        role: role
      });
      await user.save();
      isNewUser = true;
    }

    // Send email using Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || process.env.SMTP_USER,
          pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
        }
      });

      let emailHtml = `
        <h2>Welcome ${fullName}!</h2>
        <p>You have been added to a HAZOP project as a <strong>${role}</strong>.</p>
      `;

      if (isNewUser) {
        emailHtml += `
          <p>Your account has been automatically created. Please use the following credentials to log in:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${randomPassword}</p>
          <p><em>Please change your password after logging in.</em></p>
        `;
      } else {
        emailHtml += `
          <p>You can log in with your existing account credentials.</p>
        `;
      }

      emailHtml += `<p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Login to the Portal</a></p>`;

      const mailOptions = {
        from: process.env.EMAIL_USER || process.env.SMTP_USER,
        to: email,
        subject: 'Welcome to the HAZOP Project Portal',
        html: emailHtml
      };

      await transporter.sendMail(mailOptions);
      console.log(`Invitation email sent to ${email}`);
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
      // We don't fail the request if the email fails, just log it
    }

    res.status(201).json(savedMember);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update a team member
router.put('/:id', async (req, res) => {
  try {
    const updatedMember = await TeamMember.findOneAndUpdate(
      { _id: req.params.id, companyCode: req.user.companyCode },
      { $set: req.body },
      { new: true }
    );
    if (!updatedMember) return res.status(404).json({ message: 'Team member not found' });
    
    // If role was updated, also try to update the user account's role
    if (req.body.role) {
      await User.findOneAndUpdate(
        { email: updatedMember.email, companyCode: req.user.companyCode },
        { $set: { role: req.body.role } }
      );
    }
    
    res.json(updatedMember);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a team member
router.delete('/:id', async (req, res) => {
  try {
    const { reason } = req.body; // Expecting reason in the request body
    const member = await TeamMember.findOneAndDelete({ _id: req.params.id, companyCode: req.user.companyCode });
    if (!member) return res.status(404).json({ message: 'Team member not found' });

    // Send email with the deletion reason
    if (reason) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || process.env.SMTP_USER,
            pass: process.env.EMAIL_PASS || process.env.SMTP_PASS
          }
        });

        const mailOptions = {
          from: process.env.EMAIL_USER || process.env.SMTP_USER,
          to: member.email,
          subject: 'Removed from HAZOP Project',
          html: `
            <h2>Hello ${member.fullName},</h2>
            <p>You have been removed from the HAZOP project.</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p>If you have any questions, please contact the project administrator.</p>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Removal email sent to ${member.email}`);
      } catch (emailErr) {
        console.error('Failed to send removal email:', emailErr);
      }
    }

    res.json({ message: 'Team member deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
