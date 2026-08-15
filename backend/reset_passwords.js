const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/psm_perpetual')
  .then(async () => {
    const users = await User.find({});
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash("Admin@123", salt);
    
    for (let u of users) {
       u.password = newPassword;
       await u.save();
       console.log(`Reset ${u.email} (Code: ${u.companyCode}) to password: Admin@123`);
    }
    process.exit(0);
  });
