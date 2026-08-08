const mongoose = require('mongoose');
const Study = require('./models/Study');
require('dotenv').config({ path: 'g:/project/PSM_perpetual/backend/.env' });

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const studies = await Study.find({});
    console.log("Studies in DB:");
    studies.forEach(s => console.log(s.studyName, "| CompanyCode:", s.companyCode));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
