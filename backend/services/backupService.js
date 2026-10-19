const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const TARGET_BACKUP_DB = process.env.BACKUP_DB_NAME || 'PSM_Backup';
const BACKUP_RECIPIENT = process.env.BACKUP_ALERT_EMAIL || process.env.SMTP_USER || process.env.EMAIL_USER || 'perpetualnagpur@gmail.com';

/**
 * Helper to get active transporter for notification emails
 */
function getEmailTransporter() {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASS;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
}

/**
 * Sends an email notification about the backup result
 */
async function sendBackupEmailNotification(summary, isSuccess, errorMessage = '') {
  try {
    const transporter = getEmailTransporter();
    if (!transporter) {
      console.log('ℹ️ [Backup Service] SMTP credentials not provided, skipping email alert.');
      return;
    }

    const sender = process.env.EMAIL_USER || process.env.SMTP_USER;
    const istTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

    let subject = '';
    let htmlContent = '';

    if (isSuccess) {
      subject = `✅ [PSM Auto-Backup] MongoDB Backup (${TARGET_BACKUP_DB}) Created Successfully`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2e7d32; border-bottom: 2px solid #2e7d32; padding-bottom: 10px;">
            ✅ MongoDB Daily Backup Completed
          </h2>
          <p>The automated evening backup has replaced the previous backup with today's fresh live snapshot.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Target Database:</td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #1565c0; font-weight: bold;">${summary.targetDatabase}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Source Database:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${summary.sourceDatabase}</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Total Collections:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${summary.totalCollections}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Total Documents:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${summary.totalDocuments.toLocaleString()} records</td>
            </tr>
            <tr style="background-color: #f9f9f9;">
              <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Duration:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${summary.durationSeconds}s</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; border: 1px solid #ddd;">Timestamp (IST):</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${istTime}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 12px; background-color: #e8f5e9; border-radius: 6px; font-size: 13px; color: #2e7d32;">
            ℹ️ <strong>Status:</strong> Your previous backup was cleanly replaced with today's data. Zero storage overflow risk.
          </div>
        </div>
      `;
    } else {
      subject = `❌ [PSM ALERT] MongoDB Daily Backup Failed`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ffcdd2; border-radius: 8px;">
          <h2 style="color: #c62828; border-bottom: 2px solid #c62828; padding-bottom: 10px;">
            ❌ Daily MongoDB Backup Encountered an Error
          </h2>
          <p>The automated backup scheduled for 6:00 PM failed. Please inspect the server logs.</p>
          <div style="padding: 10px; background-color: #ffebee; border-radius: 6px; color: #b71c1c; font-family: monospace;">
            ${errorMessage}
          </div>
          <p style="margin-top: 15px; font-size: 13px; color: #666;">Time (IST): ${istTime}</p>
        </div>
      `;
    }

    await transporter.sendMail({
      from: `"PSM System" <${sender}>`,
      to: BACKUP_RECIPIENT,
      subject,
      html: htmlContent
    });

    console.log(`✉️ [Backup Service] Notification email sent to ${BACKUP_RECIPIENT}`);
  } catch (emailErr) {
    console.error('⚠️ [Backup Service] Failed to send email alert:', emailErr.message);
  }
}

/**
 * Core function to perform MongoDB Database Backup into `PSM_Backup`
 */
async function performDatabaseBackup() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('🔄 [Backup Service] Starting MongoDB Daily Backup...');
  console.log(`⏰ Time (IST): ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })}`);

  // Ensure mongoose connection is ready
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Mongoose connection is not open. Ready state: ' + mongoose.connection.readyState);
  }

  const client = mongoose.connection.getClient();
  const sourceDbName = mongoose.connection.name || 'test';

  // CRITICAL SAFETY CHECK: Target DB MUST NOT be the same as Source DB
  if (sourceDbName.toLowerCase() === TARGET_BACKUP_DB.toLowerCase()) {
    throw new Error(`CRITICAL SAFETY ERROR: Source DB (${sourceDbName}) and Target DB (${TARGET_BACKUP_DB}) cannot be the same! Backup aborted to protect data.`);
  }

  const sourceDb = client.db(sourceDbName);
  const targetDb = client.db(TARGET_BACKUP_DB);

  // 1. Fetch collections from source DB
  const rawCollections = await sourceDb.listCollections().toArray();
  const collectionsToCopy = rawCollections.filter(c => !c.name.startsWith('system.'));

  if (collectionsToCopy.length === 0) {
    throw new Error(`Safety Check Failed: Source database "${sourceDbName}" has no collections. Aborting backup to avoid dropping existing backup.`);
  }

  console.log(`📦 [Backup Service] Source DB: "${sourceDbName}" | Target DB: "${TARGET_BACKUP_DB}"`);
  console.log(`📋 Found ${collectionsToCopy.length} collections to backup.`);

  // 2. Drop the old backup DB so previous day's backup is cleanly replaced
  console.log(`🗑️ [Backup Service] Dropping previous "${TARGET_BACKUP_DB}" database...`);
  await targetDb.dropDatabase();
  console.log(`✅ [Backup Service] Old "${TARGET_BACKUP_DB}" dropped successfully.`);

  // 3. Copy each collection & rebuild secondary indexes
  let totalDocsCopied = 0;
  const collectionStats = [];

  for (const collInfo of collectionsToCopy) {
    const collName = collInfo.name;
    const docCount = await sourceDb.collection(collName).countDocuments();

    if (docCount > 0) {
      // Use internal $out aggregation for fast native copy
      await sourceDb.collection(collName).aggregate([{ $out: { db: TARGET_BACKUP_DB, coll: collName } }]).toArray();
    } else {
      // Create empty collection
      await targetDb.createCollection(collName);
    }

    // Recreate custom indexes (excluding _id_)
    try {
      const sourceIndexes = await sourceDb.collection(collName).indexes();
      const customIndexes = sourceIndexes
        .filter(idx => idx.name !== '_id_')
        .map(idx => {
          const indexDef = { key: idx.key, name: idx.name };
          if (idx.unique) indexDef.unique = true;
          if (idx.sparse) indexDef.sparse = true;
          if (idx.expireAfterSeconds !== undefined) indexDef.expireAfterSeconds = idx.expireAfterSeconds;
          return indexDef;
        });

      if (customIndexes.length > 0) {
        await targetDb.collection(collName).createIndexes(customIndexes);
      }
    } catch (idxErr) {
      console.warn(`⚠️ [Backup Service] Note: Could not copy indexes for "${collName}": ${idxErr.message}`);
    }

    totalDocsCopied += docCount;
    collectionStats.push({ name: collName, count: docCount });
    console.log(`   ↳ Copied "${collName}": ${docCount} documents`);
  }

  const durationSeconds = Number(((Date.now() - startTime) / 1000).toFixed(2));

  // 4. Record metadata in target DB
  const summary = {
    backupDate: new Date(),
    backupDateIST: new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
    sourceDatabase: sourceDbName,
    targetDatabase: TARGET_BACKUP_DB,
    totalCollections: collectionsToCopy.length,
    totalDocuments: totalDocsCopied,
    durationSeconds,
    status: 'SUCCESS',
    collections: collectionStats
  };

  await targetDb.collection('_backup_info').insertOne(summary);

  console.log(`🎉 [Backup Service] Backup finished in ${durationSeconds}s! Total docs: ${totalDocsCopied}`);
  console.log('====================================================');

  // 5. Send notification email
  await sendBackupEmailNotification(summary, true);

  return summary;
}

/**
 * Get the latest backup status from `PSM_Backup._backup_info`
 */
async function getBackupStatus() {
  try {
    if (mongoose.connection.readyState !== 1) {
      return { status: 'DATABASE_DISCONNECTED' };
    }

    const client = mongoose.connection.getClient();
    const targetDb = client.db(TARGET_BACKUP_DB);

    const latest = await targetDb.collection('_backup_info')
      .find({})
      .sort({ backupDate: -1 })
      .limit(1)
      .toArray();

    if (!latest || latest.length === 0) {
      return {
        exists: false,
        message: `No backup found in database "${TARGET_BACKUP_DB}" yet.`
      };
    }

    const info = latest[0];
    return {
      exists: true,
      targetDatabase: TARGET_BACKUP_DB,
      sourceDatabase: info.sourceDatabase,
      lastBackupDate: info.backupDate,
      lastBackupDateIST: info.backupDateIST,
      totalCollections: info.totalCollections,
      totalDocuments: info.totalDocuments,
      durationSeconds: info.durationSeconds,
      status: info.status,
      schedule: process.env.BACKUP_CRON_SCHEDULE || '0 18 * * *',
      collections: info.collections
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Helper to convert 5-part cron expression to friendly time (e.g. '0 18 * * *' -> '6:00 PM')
 */
function formatCronToHumanReadable(cronExp) {
  try {
    const parts = (cronExp || '').trim().split(/\s+/);
    if (parts.length === 5 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const h = parseInt(parts[1], 10);
      const m = parseInt(parts[0], 10);
      const period = h >= 12 ? 'PM' : 'AM';
      const formattedHour = h % 12 === 0 ? 12 : h % 12;
      const formattedMin = m < 10 ? `0${m}` : m;
      return `${formattedHour}:${formattedMin} ${period}`;
    }
  } catch (e) {}
  return cronExp;
}

/**
 * Initializes the daily cron job scheduled in IST
 */
function initBackupScheduler() {
  const envSchedule = process.env.BACKUP_CRON_SCHEDULE;
  const cronExpression = envSchedule || '0 18 * * *';
  const humanReadableTime = formatCronToHumanReadable(cronExpression);
  const sourceInfo = envSchedule ? '(from .env)' : '(default fallback)';
  
  console.log(`⏰ [Backup Scheduler] Initialized daily MongoDB backup job at ${humanReadableTime} IST [Cron: ${cronExpression}] ${sourceInfo}`);

  cron.schedule(cronExpression, async () => {
    console.log(`🔔 [Backup Scheduler] Triggering daily backup scheduled for ${humanReadableTime} IST...`);
    try {
      await performDatabaseBackup();
    } catch (err) {
      console.error('❌ [Backup Scheduler] Error executing daily backup:', err);
      await sendBackupEmailNotification(null, false, err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });
}

module.exports = {
  performDatabaseBackup,
  getBackupStatus,
  initBackupScheduler,
  TARGET_BACKUP_DB
};
