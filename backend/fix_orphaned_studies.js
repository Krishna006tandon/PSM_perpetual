const mongoose = require('mongoose');
const Study = require('./models/Study');
const TeamMember = require('./models/TeamMember');
require('dotenv').config({ path: 'g:/project/PSM_perpetual/backend/.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    // We know the user's companyCode is '37203'
    const result = await Study.updateMany({ companyCode: { $exists: false } }, { $set: { companyCode: '37203' } });
    console.log(`Updated ${result.modifiedCount} orphaned studies`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
