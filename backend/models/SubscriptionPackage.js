const mongoose = require('mongoose');

const subscriptionPackageSchema = new mongoose.Schema({
  companyCode: { type: String },
  name: { type: String, required: true },
  price: { type: Number, default: 0 }, // For backward compatibility
  billingCycle: { type: String, enum: ['One-time', 'Monthly', 'Yearly', 'Both'], default: 'Yearly' },
  // Dual payment options for the same package
  hasOneTime: { type: Boolean, default: false },
  oneTimePrice: { type: Number, default: 0 },
  hasAnnual: { type: Boolean, default: true },
  annualPrice: { type: Number, default: 0 },
  maxProjects: { type: Number, default: -1 }, // -1 implies unlimited
  maxUsers: { type: Number, default: -1 },
  features: { type: [String], default: ['PHA'] }, // e.g. ['PHA', 'MOC', 'LOPA', 'BOWTIE']
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SubscriptionPackage', subscriptionPackageSchema);
