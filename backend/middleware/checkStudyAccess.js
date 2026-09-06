const User = require('../models/User');
const TeamMember = require('../models/TeamMember');

module.exports = async function(req, res, next) {
  try {
    const user = await User.findById(req.user.userId);
    if (user && user.role === 'Admin') {
      return next(); // Admins can access any study
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

    const userEmail = user ? user.email : '';
    const membership = await TeamMember.findOne({ studyId: studyId, email: userEmail });
    
    if (!membership) {
      return res.status(403).json({ message: 'Access denied: You are not a team member of this study.' });
    }
    
    next();
  } catch (err) {
    console.error('Study Access Check Error:', err);
    res.status(500).json({ message: 'Internal server error during access check' });
  }
};
