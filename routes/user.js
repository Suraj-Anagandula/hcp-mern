const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const {auth} = require('../middleware/auth');

const router = express.Router();

 
// User Profile
 
router.get('/profile', auth, userController.getUserProfile);

router.put(
  '/profile',
  auth,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email format'),
    body('mobile')
      .optional()
      .isMobilePhone()
      .withMessage('Invalid mobile number'),
    body('roomNumber').optional().isString(),
    body('block').optional().isString(),
  ],
  userController.updateUserProfile
);

 
// Change Password
 
router.put(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters'),
  ],
  userController.changePassword
);

 
// Dashboard Stats
 
router.get('/dashboard', auth, userController.getDashboardStats);

 
// Delete Account
 
router.delete(
  '/delete',
  auth,
  [body('password').notEmpty().withMessage('Password is required')],
  userController.deleteAccount
);

module.exports = router;
