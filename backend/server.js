const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Initialize the Express application
const app = express();

// Middleware (This allows your frontend to talk to your backend safely)
app.use(cors());
// This allows your server to read incoming JSON data
app.use(express.json());


const mocRoutes = require('./routes/mocRoutes');
app.use('/api/mocs', mocRoutes);

const checklistTemplateRoutes = require('./routes/checklistTemplateRoutes');
app.use('/api/checklist-templates', checklistTemplateRoutes);

// A simple test route to make sure the server is working
app.get('/api/test', (req, res) => {
    res.json({ message: 'MOC Backend Server is up and running!' });
});

// --- DATABASE CONNECTION ---
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas successfully.');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ Failed to connect to MongoDB Atlas:', err.message);
        process.exit(1);
    });