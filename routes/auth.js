 

const express = require('express');
const { body } = require('express-validator');
const {
  studentLogin,
  adminLogin,
  studentRegister,
  adminRegister,
  verifyOTP,
  resendOTP,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  verifyPasswordResetOTP  // Add this import
} = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Student login
router.post('/student/login', [
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
  body('password').notEmpty().withMessage('Password is required')
], studentLogin);

// Admin login
router.post('/admin/login', [
  body('adminId').trim().notEmpty().withMessage('Admin ID is required'),
  body('password').notEmpty().withMessage('Password is required')
], adminLogin);

// Student registration
router.post('/student/register', [
  body('studentId').trim().notEmpty().withMessage('Student ID is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('mobile').isMobilePhone().withMessage('Valid mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
  body('block').trim().notEmpty().withMessage('Block is required')
], studentRegister);

// Admin registration
router.post('/admin/register', [
  body('adminId').trim().notEmpty().withMessage('Admin ID is required'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('department').trim().notEmpty().withMessage('Department is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
], adminRegister);

// OTP Verification (for registration)
router.post('/verify-otp', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('userType').isIn(['student', 'admin']).withMessage('Valid user type is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], verifyOTP);

// Resend OTP (for registration)
router.post('/resend-otp', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('userType').isIn(['student', 'admin']).withMessage('Valid user type is required')
], resendOTP);

// Forgot password
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
], forgotPassword);

// Verify OTP for password reset
router.post('/verify-reset-otp', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], verifyPasswordResetOTP);

// Reset password
router.post('/reset-password', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], resetPassword);

// Get current user
router.get('/me', auth, getCurrentUser);

module.exports = router;
 