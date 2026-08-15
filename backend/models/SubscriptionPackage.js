const mongoose = require('mongoose');

const subscriptionPackageSchema = new mongoose.Schema({
  companyCode: { type: String },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  billingCycle: { type: String, enum: ['One-time', 'Monthly', 'Yearly'], default: 'Monthly' },
  maxProjects: { type: Number, default: -1 }, // -1 implies unlimited
  maxUsers: { type: Number, default: -1 },
  features: { type: [String], default: [] }, // e.g. ['PHA', 'LOPA', 'MOC']
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SubscriptionPackage', subscriptionPackageSchema);
