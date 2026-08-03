const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

console.log("Connecting to:", process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    // Find all users and make the first one a SuperAdmin
    const users = await User.find();
    if (users.length > 0) {
      const user = users[0];
      user.role = 'SuperAdmin';
      await user.save();
      console.log(`Successfully upgraded ${user.email} to SuperAdmin!`);
    } else {
      console.log("No users found in the database to upgrade.");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error("Connection error:", err);
    process.exit(1);
  });
