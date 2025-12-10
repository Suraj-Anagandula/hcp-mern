 


const User = require('../models/User');
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Generate JWT token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

 


const HttpsProxyAgent = require('https-proxy-agent');

// Create nodemailer transporter that works for both proxy and normal WiFi
const createTransporter = () => {
  // College proxy configuration - replace with your actual college proxy
   const collegeProxyUrl = 'http://staffnet.rgukt.ac.in:3128';
  
  try {
    // Try with proxy first (for college WiFi)
    const agent = new HttpsProxyAgent(collegeProxyUrl);
    
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      agent: agent
    });
  } catch (proxyError) {
    // Fallback to normal connection (for home/other WiFi)
    console.log('Proxy failed, using direct connection...');
    
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
};

const sendVerificationEmail = async (email, otp, name, userType) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `Email Verification - ${userType === 'student' ? 'Student' : 'Admin'} Registration`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering as a ${userType}. Please use the following OTP to verify your email address:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #333; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this registration, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};




// Send password reset email
const sendPasswordResetEmail = async (email, otp, name) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hello ${name},</p>
          <p>You have requested to reset your password. Please use the following OTP to proceed:</p>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
            <h1 style="margin: 0; color: #333; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Password reset email sending error:', error);
    return false;
  }
};

// Student login
exports.studentLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, password } = req.body;

    // Find user by studentId
    const user = await User.findOne({ studentId: studentId.toUpperCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, 'student');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        studentId: user.studentId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        roomNumber: user.roomNumber,
        block: user.block
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin login
exports.adminLogin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { adminId, password } = req.body;

    // Find admin by adminId
    const admin = await Admin.findOne({ adminId });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(admin._id, 'admin');

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        department: admin.department
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Student registration
exports.studentRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { studentId, name, email, mobile, password, roomNumber, block } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ studentId: studentId.toUpperCase() }, { email }, { mobile }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists with this Student ID, email, or mobile number' 
      });
    }

    // Generate OTP and expiry
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new user with verification fields
    const user = new User({
      studentId: studentId.toUpperCase(),
      name,
      email: email.toLowerCase(),
      mobile,
      password,
      roomNumber,
      block,
      otp,
      otpExpiry,
      isVerified: false
    });

    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(email, otp, name, 'student');
    
    if (!emailSent) {
      // If email fails, delete the user
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    res.status(201).json({ 
      message: 'Registration successful. Please check your email for verification OTP.',
      userId: user._id,
      userType: 'student'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin registration
exports.adminRegister = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { adminId, name, department, email, password, phone } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ adminId }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({
        message: 'Admin already exists with this Admin ID or email'
      });
    }

    // Generate OTP and expiry
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create new admin with verification fields
    const admin = new Admin({
      adminId,
      name,
      department,
      email: email.toLowerCase(),
      password,
      phone,
      otp,
      otpExpiry,
      isVerified: false
    });

    await admin.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(email, otp, name, 'admin');
    
    if (!emailSent) {
      // If email fails, delete the admin
      await Admin.findByIdAndDelete(admin._id);
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    res.status(201).json({
      message: 'Admin registration successful. Please check your email for verification OTP.',
      adminId: admin._id,
      userType: 'admin'
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Verify OTP for both student and admin
exports.verifyOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, userType, otp } = req.body;

    console.log('OTP Verification Request:', { userId, userType, otp });

    let user;
    if (userType === 'student') {
      user = await User.findById(userId);
    } else if (userType === 'admin') {
      user = await Admin.findById(userId);
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Stored OTP:', user.otp, 'Input OTP:', otp);
    console.log('OTP Expiry:', user.otpExpiry, 'Current Time:', new Date());

    // Check if OTP is expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check if OTP matches (string comparison)
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Mark as verified and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ 
      message: 'Account verified successfully! You can now login.',
      verified: true 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Resend OTP
exports.resendOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, userType } = req.body;

    let user;
    if (userType === 'student') {
      user = await User.findById(userId);
    } else if (userType === 'admin') {
      user = await Admin.findById(userId);
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account is already verified' });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send verification email
    const emailSent = await sendVerificationEmail(user.email, otp, user.name, userType);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send verification email. Please try again.' });
    }

    res.json({ 
      message: 'New OTP sent to your email address.',
      userId: user._id 
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email address' });
    }

    // Generate OTP for password reset
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(user.email, otp, user.name);
    
    if (!emailSent) {
      return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
    }

    res.json({ 
      message: 'OTP sent to your registered email address',
      userId: user._id
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reset password
// exports.resetPassword = async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { userId, otp, newPassword } = req.body;

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     console.log('Password Reset - Stored OTP:', user.otp, 'Input OTP:', otp);

//     // Check if OTP is expired
//     if (user.otpExpiry < new Date()) {
//       return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
//     }

//     // Check if OTP matches
//     if (user.otp !== otp) {
//       return res.status(400).json({ message: 'Invalid OTP' });
//     }

//     // Update password (this will trigger the pre-save hook to hash it)
//     user.password = newPassword;
//     user.otp = undefined;
//     user.otpExpiry = undefined;
//     await user.save();

//     res.json({ message: 'Password reset successfully' });
//   } catch (error) {
//     console.error('Reset password error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };





// Add this new function for password reset OTP verification
exports.verifyPasswordResetOTP = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, otp } = req.body;

    console.log('Password Reset OTP Verification:', { userId, otp });

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Stored OTP:', user.otp, 'Input OTP:', otp);
    console.log('OTP Expiry:', user.otpExpiry, 'Current Time:', new Date());

    // Check if OTP is expired
    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Check if OTP matches
    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // For password reset, we don't mark as verified, just return success
    res.json({ 
      message: 'OTP verified successfully. You can now reset your password.',
      verified: true 
    });
  } catch (error) {
    console.error('Password reset OTP verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update the resetPassword function to remove OTP requirement
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId, newPassword } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password (this will trigger the pre-save hook to hash it)
    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};




// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    if (req.userType === 'student') {
      res.json({ user: req.user, userType: 'student' });
    } else {
      res.json({ user: req.user, userType: 'admin' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};