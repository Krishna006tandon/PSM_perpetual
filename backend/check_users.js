const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/psm_perpetual')
  .then(async () => {
    console.log('MongoDB connected');
    const users = await User.find({});
    console.log("All Users in DB:");
    users.forEach(u => console.log(u.email, u.role, u.companyCode));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
