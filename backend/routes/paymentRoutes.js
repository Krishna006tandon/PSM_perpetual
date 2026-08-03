const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
require('dotenv').config();

// Note: Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are in .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});

// Create Order
router.get('/config', (req, res) => {
  res.json({ key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key_id' });
});

// Create Order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt = 'receipt#1' } = req.body;
    const options = {
      amount: amount * 100, // amount in smallest currency unit
      currency,
      receipt
    };
    
    // Check if real keys are present, if not just return a dummy order for testing
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'dummy_key_id') {
      const order = await razorpay.orders.create(options);
      res.json(order);
    } else {
      res.json({ id: 'order_dummy_123', amount: options.amount, currency: options.currency });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Signature
router.post('/verify-signature', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, packageId } = req.body;
    
    // If testing without real keys, auto-verify
    if (!process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET === 'dummy_key_secret') {
      return res.json({ success: true, message: 'Dummy payment verified successfully' });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      const transaction = new Transaction({
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: amount || 0,
        packageId: packageId || null
      });
      await transaction.save();
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
