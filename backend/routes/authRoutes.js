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

// --- FORGOT PASSWORD (LINK -> OTP) FLOW ---

// 1. Send Link
router.post('/forgot-password-link', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({ message: 'If an account with this email exists, a reset link has been sent.' });
    }

    // Securely encode the email in the link
    const frontendUrl = process.env.FRONTEND_URL || 'https://psm.perpetualsolutions.co.in';
    const resetUrl = `${frontendUrl}/reset-password?email=${encodeURIComponent(email)}`;

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
        subject: 'Password Reset Link - Perpetual PSM',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
            <h2>Password Reset Request</h2>
            <p>You have requested to reset your password. Click the button below to proceed.</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">
              Reset Password
            </a>
            <p style="margin-top: 20px; font-size: 0.9em; color: #666;">If you did not request this, please ignore this email.</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error("Error sending link email:", mailError);
      console.log(`[DEV ONLY] Reset Link for ${email} is: ${resetUrl}`);
    }

    res.status(200).json({ message: 'If an account with this email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password link error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 1. Generate and Send OTP
router.post('/forgot-password-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    // IMPORTANT: Always return success to prevent user enumeration
    if (!user) {
      return res.status(200).json({ message: 'If an account with this email exists, an OTP has been sent.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Hash OTP before storing
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // Send Email
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail', // or appropriate service matching .env
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP - Perpetual PSM',
        text: `Your OTP for password reset is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`
      };
      
      await transporter.sendMail(mailOptions);
    } catch (mailError) {
      console.error("Error sending OTP email:", mailError);
      // Even if email fails locally, we might want to log the OTP for testing
      console.log(`[DEV ONLY] OTP for ${email} is: ${otp}`);
    }

    res.status(200).json({ message: 'If an account with this email exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

    const user = await User.findOne({ 
      email,
      resetPasswordOtpExpire: { $gt: Date.now() }
    });

    if (!user || !user.resetPasswordOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// 3. Reset Password
router.post('/reset-password-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    const user = await User.findOne({ 
      email,
      resetPasswordOtpExpire: { $gt: Date.now() }
    });

    if (!user || !user.resetPasswordOtp) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const isMatch = await bcrypt.compare(otp, user.resetPasswordOtp);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // OTP matches, update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear OTP fields
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpire = undefined;
    
    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can now login.' });
  } catch (error) {
    console.error('Reset password error:', error);
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
