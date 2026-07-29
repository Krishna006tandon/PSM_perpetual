const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const studyRoutes = require('./routes/studyRoutes');

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
const teamRoutes = require('./routes/teamRoutes');
const documentRoutes = require('./routes/documentRoutes');
const nodeRoutes = require('./routes/nodeRoutes');
const deviationRoutes = require('./routes/deviationRoutes');
const causeRoutes = require('./routes/causeRoutes');
const scenarioRoutes = require('./routes/scenarioRoutes');
const columnRoutes = require('./routes/columnRoutes');
const riskCriteriaRoutes = require('./routes/riskCriteriaRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/studies', studyRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/nodes', nodeRoutes);
app.use('/api/deviations', deviationRoutes);
app.use('/api/causes', causeRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/columns', columnRoutes);
app.use('/api/risk-criteria', riskCriteriaRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
