const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  companyCode: { type: String },
  orderId: { type: String, required: true },
  paymentId: { type: String, required: true },
  amount: { type: Number, required: true }, // stored in INR
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPackage' },
  status: { type: String, default: 'Success' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
