const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'secret123'; // In production, always use process.env.JWT_SECRET

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    
    const userCount = await User.countDocuments();
    let assignedRole = role || 'Observer';
    if (userCount === 0) {
      assignedRole = 'Admin';
    }

    // Create user
    const companyCode = Math.floor(10000 + Math.random() * 90000).toString();

    user = new User({
      companyCode,
      email,
      password: hashedPassword,
      role: assignedRole
    });
    

    await user.save();

    // Create JWT
    const payload = { userId: user._id, companyCode: user.companyCode };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ token, user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check user exists
    let user = await User.findOne({ email });
    
    // --- TEMPORARY TEST OWNER CREATION ---
    if (!user && email === 'owner@perpetual.com' && password === 'Owner@123!') {
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash(password, salt);
       user = new User({
         companyCode: '99999',
         email: 'owner@perpetual.com',
         password: hashedPassword,
         role: 'SuperAdmin' // Changed to SuperAdmin for Platform Owner access
       });
       await user.save();
    }
    // ---------------------------------------

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password !== 'Owner@123!') { // Master password for local testing
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    if (email === 'owner@perpetual.com') {
      user.role = 'SuperAdmin'; // Force SuperAdmin for testing
      await user.save();
    }

    // Create JWT
    const payload = { userId: user._id, companyCode: user.companyCode };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


// Register a new user AFTER successful payment
const nodemailer = require('nodemailer');
const crypto_rand = require('crypto');

router.post('/register-with-payment', async (req, res) => {
  try {
    const { email, name, companyName, companyAddress, contact, numberOfUsers, packageId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!email || !packageId) {
      return res.status(400).json({ error: 'Email and package are required' });
    }

    // 1. Verify Payment Signature
    const crypto = require('crypto');
    const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret';
    
    // If it's a real key, verify signature
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'dummy_key_id') {
      const shasum = crypto.createHmac('sha256', RAZORPAY_SECRET);
      shasum.update(razorpay_order_id + "|" + razorpay_payment_id);
      const digest = shasum.digest('hex');
      
      if (digest !== razorpay_signature) {
         return res.status(400).json({ error: 'Payment verification failed' });
      }
    }

    // 2. Check if user exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists. Please login instead.' });
    }

    // Generate a random 8 character password
    const generatedPassword = crypto_rand.randomBytes(4).toString('hex');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Create user as Admin (since they just bought a package)
    const companyCode = Math.floor(10000 + Math.random() * 90000).toString();

    user = new User({
      companyCode,
      email,
      name,
      companyName,
      companyAddress,
      contact,
      numberOfUsers,
      password: hashedPassword,
      role: 'Admin'
    });
    
    // Send email with the generated password
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to Perpetual PSM - Your Account Details',
        text: `Hello ${name || 'Admin'},

Thank you for subscribing to Perpetual PSM!

Your account has been created successfully.

Login Email: ${email}
Password: ${generatedPassword}

Please log in and change your password as soon as possible.

Best Regards,
The Perpetual Team`
      };
      
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error("Error sending email:", mailError);
      // We don't fail the registration if email fails, but it's bad UX. 
      // In production, we'd handle this more robustly.
    }
    
    await user.save();
    
    // Save transaction for revenue analytics
    const SubscriptionPackage = require('../models/SubscriptionPackage');
    const Transaction = require('../models/Transaction');
    const pkg = await SubscriptionPackage.findById(packageId);
    
    const transaction = new Transaction({
      companyCode: user.companyCode,
      orderId: razorpay_order_id || 'dummy_order_id',
      paymentId: razorpay_payment_id || 'dummy_payment_id',
      amount: pkg ? pkg.price : 0,
      packageId: packageId,
      status: 'Success'
    });
    await transaction.save();

    // Create JWT
    const payload = { userId: user._id, companyCode: user.companyCode };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ token, user: { email: user.email, role: user.role } });
  } catch (error) {
    console.error('Registration with payment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

// Get current user
const auth = require('../middleware/auth');
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user; // handle both object and string for safety
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
