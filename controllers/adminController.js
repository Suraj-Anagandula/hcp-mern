const Admin = require('../models/Admin');
const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { validationResult } = require('express-validator');

// Get all users (for admin)
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search.toUpperCase(), $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(filter);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user by ID (for admin)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user's complaints
    const complaints = await Complaint.find({ student: user._id })
      .sort({ createdAt: -1 })
      .select('ticketId title status createdAt category');

    res.json({ user, complaints });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new admin
exports.createAdmin = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { adminId, name, email, password, department, phone, permissions } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      $or: [{ adminId }, { email }]
    });

    if (existingAdmin) {
      return res.status(400).json({ 
        message: 'Admin already exists with this Admin ID or email' 
      });
    }

    const admin = new Admin({
      adminId,
      name,
      email: email.toLowerCase(),
      password,
      department,
      phone,
      permissions: permissions || {
        canManageComplaints: true,
        canManageUsers: false,
        canManageAdmins: false
      }
    });

    await admin.save();

    res.status(201).json({ 
      message: 'Admin created successfully',
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        email: admin.email,
        department: admin.department,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.json({ admins });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update admin permissions
exports.updateAdminPermissions = async (req, res) => {
  try {
    const { permissions } = req.body;

    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.permissions = { ...admin.permissions, ...permissions };
    await admin.save();

    res.json({ 
      message: 'Permissions updated successfully',
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Update admin permissions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle admin status
exports.toggleAdminStatus = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    admin.isActive = !admin.isActive;
    await admin.save();

    res.json({ 
      message: `Admin ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      admin: {
        id: admin._id,
        adminId: admin.adminId,
        name: admin.name,
        isActive: admin.isActive
      }
    });
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get admin dashboard overview
exports.getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalComplaints = await Complaint.countDocuments();
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });

    // Recent complaints
    const recentComplaints = await Complaint.find()
      .populate('student', 'name studentId')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('ticketId title status createdAt student');

    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name studentId email createdAt');

    res.json({
      totalUsers,
      totalComplaints,
      pendingComplaints,
      resolvedComplaints,
      recentComplaints,
      recentUsers
    });
  } catch (error) {
    console.error('Get admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's complaints
    await Complaint.deleteMany({ student: user._id });
    await User.findByIdAndDelete(user._id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};