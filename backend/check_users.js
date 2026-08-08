const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config({ path: 'g:/project/PSM_perpetual/backend/.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const users = await User.find({});
    console.log("Users in DB:");
    users.forEach(u => console.log(u.email, "| Role:", u.role, "| Company:", u.companyCode));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
