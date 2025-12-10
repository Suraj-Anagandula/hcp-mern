const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');

// ==========================
// User Management (Admin)
// ==========================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.delete('/users/:id', adminController.deleteUser);

// ==========================
// Admin Management
// ==========================
router.post(
  '/create',
  [
    body('adminId').notEmpty().withMessage('Admin ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('department').notEmpty().withMessage('Department is required'),
    body('phone').notEmpty().withMessage('Phone number is required')
  ],
  adminController.createAdmin
);

router.get('/', adminController.getAllAdmins);
router.put('/:id/permissions', adminController.updateAdminPermissions);
router.patch('/:id/toggle-status', adminController.toggleAdminStatus);

// ==========================
// Dashboard
// ==========================
router.get('/dashboard/overview', adminController.getAdminDashboard);




module.exports = router;
