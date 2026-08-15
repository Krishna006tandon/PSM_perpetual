const mongoose = require('mongoose');
const crypto_rand = require('crypto');
const nodemailer = require('nodemailer');
const User = require('./models/User');
const Study = require('./models/Study');
const TeamMember = require('./models/TeamMember');
const RiskCriteria = require('./models/RiskCriteria');
const ColumnSetting = require('./models/ColumnSetting');
const StudyDocument = require('./models/StudyDocument');
require('dotenv').config({ path: 'g:/project/PSM_perpetual/backend/.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for Atlas migration'))
  .catch(err => console.error(err));

async function runMigration() {
  const users = await User.find({ companyCode: { $exists: false } });
  console.log(`Found ${users.length} users to migrate in Atlas.`);
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  for (let user of users) {
    const companyCode = Math.floor(10000 + Math.random() * 90000).toString();
    user.companyCode = companyCode;
    user.role = 'Admin';
    user.name = user.name || 'Super Admin';
    
    // Hardcode password to Admin@123 since email might fail
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash("Admin@123", salt);
    
    await user.save();
    console.log(`Updated user ${user.email} with companyCode ${companyCode} and set password to Admin@123`);
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Perpetual PSM - Account Update & Credentials',
      text: `Hello ${user.name},\n\nYour account has been upgraded to a multi-tenant workspace!\n\nYour unique Company Code is: ${companyCode}\n\nLogin Email: ${user.email}\nNew Password: Admin@123\n\nPlease log in and update your password.\n\nBest Regards,\nThe Perpetual Team`
    };
    
    try {
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${user.email}`);
    } catch (e) {
      console.error(`Failed to send email to ${user.email}:`, e.message);
    }
    
    // Backfill ALL other collections
    await Study.updateMany({ companyCode: { $exists: false } }, { $set: { companyCode: companyCode } });
    await TeamMember.updateMany({ companyCode: { $exists: false } }, { $set: { companyCode: companyCode } });
    await RiskCriteria.updateMany({ companyCode: { $exists: false } }, { $set: { companyCode: companyCode } });
    await ColumnSetting.updateMany({ companyCode: { $exists: false } }, { $set: { companyCode: companyCode } });
    await StudyDocument.updateMany({ companyCode: { $exists: false } }, { $set: { companyCode: companyCode } });
  }
  
  console.log("Migration complete.");
  process.exit();
}

setTimeout(runMigration, 1000);
