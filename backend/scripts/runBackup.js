const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { performDatabaseBackup } = require('../services/backupService');

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI is missing in .env');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully.');

    const summary = await performDatabaseBackup();
    console.log('✅ Backup operation completed successfully.');
    console.log(JSON.stringify(summary, null, 2));
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup failed with error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

run();
