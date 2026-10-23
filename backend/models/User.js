const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  companyCode: { type: String },
  name: { type: String },
  companyName: { type: String },
  companyAddress: { type: String },
  contact: { type: String },
  numberOfUsers: { type: Number },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    default: 'Observer'
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPackage'
  },
  billingType: {
    type: String,
    enum: ['One-time', 'Annual', 'Monthly', 'Yearly']
  },
  features: {
    type: [String],
    default: ['PHA', 'MOC', 'LOPA', 'BOWTIE']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordOtp: {
    type: String
  },
  resetPasswordOtpExpire: {
    type: Date
  }
});

module.exports = mongoose.model('User', userSchema);
