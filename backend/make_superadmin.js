const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pha_db')
  .then(async () => {
    // Find the first user or a specific user
    const user = await User.findOne();
    if (user) {
      user.role = 'SuperAdmin';
      await user.save();
      console.log(`Updated user ${user.email} to SuperAdmin!`);
    } else {
      console.log("No user found to update.");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
