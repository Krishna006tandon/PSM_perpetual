const mongoose = require('mongoose');
const User = require('../models/User');
const TeamMember = require('../models/TeamMember');
const Study = require('../models/Study');

module.exports = async function(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    const userRole = (user && user.role) ? user.role.toLowerCase() : '';
    if (user && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'owner')) {
      return next(); // Admins / SuperAdmins can access any study
    }

    // Determine the study ID from the request
    let studyId = null;

    if (req.params.studyId) {
      studyId = req.params.studyId;
    } else if (req.baseUrl && req.baseUrl.includes('/api/studies') && req.params.id) {
      studyId = req.params.id;
    }

    if (!studyId) {
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(studyId)) {
      return res.status(400).json({ message: 'Invalid Study ID format' });
    }

    // Check if user belongs to same companyCode as study
    let studyDoc = await Study.findById(studyId);

    // Some routes mount /:studyId middleware before /:id item routes (e.g. PUT /api/scenarios/:id).
    // If no Study matches studyId, resolve the parent studyId from the item document.
    if (!studyDoc && req.baseUrl) {
      let itemDoc = null;
      if (req.baseUrl.includes('/api/scenarios')) {
        const Scenario = require('../models/Scenario');
        itemDoc = await Scenario.findById(studyId).select('studyId');
      } else if (req.baseUrl.includes('/api/deviations')) {
        const Deviation = require('../models/Deviation');
        itemDoc = await Deviation.findById(studyId).select('studyId');
      } else if (req.baseUrl.includes('/api/causes')) {
        const Cause = require('../models/Cause');
        itemDoc = await Cause.findById(studyId).select('studyId');
      }
      if (itemDoc && itemDoc.studyId) {
        studyId = itemDoc.studyId;
        studyDoc = await Study.findById(studyId);
      }
    }
    if (studyDoc && user && studyDoc.companyCode && user.companyCode && 
        studyDoc.companyCode.trim().toLowerCase() === user.companyCode.trim().toLowerCase()) {
      return next();
    }

    const userEmail = user && user.email ? user.email.trim() : '';
    if (!userEmail) {
      return res.status(403).json({ message: 'Access denied: User email not found.' });
    }

    const membership = await TeamMember.findOne({
      studyId: studyId,
      email: { $regex: new RegExp(`^${userEmail.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
    });
    
    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a team member of this study.' });
    }
    
    next();
  } catch (err) {
    console.error('Study Access Check Error:', err);
    res.status(500).json({ message: 'Internal server error during access check' });
  }
};
