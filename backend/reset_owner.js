const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/psm_perpetual', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('Connected to DB');
    
    let users = await User.find({});
    if (users.length === 0) {
      console.log("No users found.");
      process.exit(0);
    }
    
    // Pick the most recent user or the one with a specific role
    let ownerUser = users[users.length - 1]; // just grab the last created one
    
    console.log(`Found user: ${ownerUser.email}`);
    
    const plainPassword = 'Owner@123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    
    ownerUser.password = hashedPassword;
    await ownerUser.save();
    
    console.log('--- CREDENTIALS ---');
    console.log(`Login Email: ${ownerUser.email}`);
    console.log(`Password: ${plainPassword}`);
    console.log('-------------------');
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
