require('dotenv').config();
const mongoose = require('mongoose');
const Deviation = require('./models/Deviation');

async function test() {
  try {
    await mongoose.connect('mongodb://localhost:27017/psm_perpetual', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected');
    
    const newDeviation = new Deviation({
      studyId: new mongoose.Types.ObjectId(),
      guidewords: 'More',
      parameter: 'Flow'
    });
    
    await newDeviation.save();
    console.log('Saved successfully');
  } catch (err) {
    console.error('Error saving:', err.message);
  } finally {
    mongoose.disconnect();
  }
}

test();
