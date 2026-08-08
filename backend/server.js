const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const studyRoutes = require('./routes/studyRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
// || 'mongodb://127.0.0.1:27017/psm_perpetual'
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB:', err));

// Routes
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const teamRoutes = require('./routes/teamRoutes');
const documentRoutes = require('./routes/documentRoutes');
const nodeRoutes = require('./routes/nodeRoutes');
const deviationRoutes = require('./routes/deviationRoutes');
const causeRoutes = require('./routes/causeRoutes');
const scenarioRoutes = require('./routes/scenarioRoutes');
const columnRoutes = require('./routes/columnRoutes');
const riskCriteriaRoutes = require('./routes/riskCriteriaRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/studies', studyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/deviations', deviationRoutes);
app.use('/api/causes', causeRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/risk-criteria', riskCriteriaRoutes);

// ---- TEMPORARY SCRIPT TO GENERATE OWNER LOGIN ----
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const fs = require('fs');

mongoose.connection.once('open', async () => {
  try {
    const users = await User.find({});
    if (users.length > 0) {
      const ownerUser = users[users.length - 1]; // get any user
      const plainPassword = 'Owner@123!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      ownerUser.password = hashedPassword;
      await ownerUser.save();
      fs.writeFileSync('credentials.txt', `Email: ${ownerUser.email}\nPassword: ${plainPassword}`);
      console.log('Wrote credentials to credentials.txt');
    }
  } catch(e) {
    console.log('Error writing credentials', e);
  }
});
// ------------------------------------------------

// ---- TEMPORARY SCRIPT TO SEED MOCK REVENUE & PACKAGES ----
const Transaction = require('./models/Transaction');
const SubscriptionPackage = require('./models/SubscriptionPackage');

mongoose.connection.once('open', async () => {
  try {
    const txCount = await Transaction.countDocuments();
    if (txCount === 0) {
      await Transaction.create([
        { orderId: 'mock_1', paymentId: 'mock_pay_1', amount: 14999, status: 'Success' },
        { orderId: 'mock_2', paymentId: 'mock_pay_2', amount: 24999, status: 'Success' },
        { orderId: 'mock_3', paymentId: 'mock_pay_3', amount: 9999, status: 'Success' }
      ]);
      console.log('Seeded mock transactions');
    }

    // Wipe existing dummy packages and add realistic ones
    await SubscriptionPackage.deleteMany({});
    await SubscriptionPackage.create([
      {
        name: 'Starter Tier',
        price: 9999,
        billingCycle: 'Yearly',
        maxProjects: 5,
        maxUsers: 10,
        features: ['PHA'],
        isActive: true
      },
      {
        name: 'Professional Tier',
        price: 24999,
        billingCycle: 'Yearly',
        maxProjects: 15,
        maxUsers: 25,
        features: ['PHA', 'MOC'],
        isActive: true
      },
      {
        name: 'Enterprise Tier',
        price: 49999,
        billingCycle: 'Yearly',
        maxProjects: -1, // Unlimited
        maxUsers: -1, // Unlimited
        features: ['PHA', 'MOC', 'LOPA', 'Audits'],
        isActive: true
      }
    ]);
    console.log('Seeded realistic subscription packages');

    // ---- SEED DATA FOR FULL PDF EXPORT ----
    const Study = require('./models/Study');
    const Session = require('./models/Session');
    const StudyRevision = require('./models/StudyRevision');
    const StudyDocument = require('./models/StudyDocument');
    
    const sampleStudy = await Study.findOne();
    if (sampleStudy) {
      // Seed Assumptions
      if (!sampleStudy.assumptions || sampleStudy.assumptions.length === 0) {
        sampleStudy.executiveSummary = 'This report documents the results of the HAZOP study conducted at the facility. The team identified potential hazards and operability issues...';
        sampleStudy.scope = 'Complete HAZOP study of Plant 1';
        sampleStudy.objective = 'Systematically identify potential hazards and operability issues in a process to improve safety and efficiency.';
        sampleStudy.assumptions = [
          { assumption: 'The process will work in accordance to its design.', valid: 'Y', comments: 'Equipment works as expected.' },
          { assumption: 'Operators are competent and well trained.', valid: 'Y', comments: 'Training is provided to all new personnel.' }
        ];
        await sampleStudy.save();
      }

      // Seed Sessions
      const sessionCount = await Session.countDocuments({ studyId: sampleStudy._id });
      if (sessionCount === 0) {
        await Session.create([
          { studyId: sampleStudy._id, date: '23-Apr-25', duration: '7.75', description: 'Initiated with corresponding P&ID, 5 nodes completed.', placesUsed: 'Session: 1.1, 2.1', comment: '' },
          { studyId: sampleStudy._id, date: '24-Apr-25', duration: '8.50', description: 'Continued with Node 6.', placesUsed: 'Session: 6.1, 7.1', comment: '' }
        ]);
      }

      // Seed Revisions
      const revCount = await StudyRevision.countDocuments({ studyId: sampleStudy._id });
      if (revCount === 0) {
        await StudyRevision.create([
          { studyId: sampleStudy._id, revision: '00', startDate: '23-Apr-25', endDate: '24-Jun-25', changesMade: 'Report Preparation', changedBy: 'Admin', reviewBy: 'Manager', approvedBy: 'Director', comments: '' }
        ]);
      }

      // Seed Documents
      const docCount = await StudyDocument.countDocuments({ studyId: sampleStudy._id });
      if (docCount === 0) {
        await StudyDocument.create([
          { studyId: sampleStudy._id, documentType: 'P&ID', revisionNumber: '3', originalFileName: '112120-PR03-CP-0100', attachmentPath: '/docs/1.pdf', comment: '', placesUsed: 'Nodes: 1' },
          { studyId: sampleStudy._id, documentType: 'P&ID', revisionNumber: '4', originalFileName: '112120-PR03-CP-0101', attachmentPath: '/docs/2.pdf', comment: '', placesUsed: 'Nodes: 3' }
        ]);
      }
    }

  } catch(e) {
    console.log('Error seeding data', e);
  }
});
// ------------------------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
