

const mongoose = require('mongoose');

const express = require('express');
const { body, validationResult } = require('express-validator');
const Complaint = require('../models/Complaint');
const { auth, requireStudent, requireAdmin } = require('../middleware/auth');

const router = express.Router();

 
 const { uploadMultiple, handleUploadError } = require('../middleware/upload');
 


router.post(
  '/',
  [
    auth,
    requireStudent,
    body('category').isIn(['electrical', 'plumbing', 'carpentry', 'internet', 'sanitation', 'other']),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('location').trim().notEmpty().withMessage('Location is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Get ALL data from request body (including images array)
      const { category, title, description, location, priority, urgency, images } = req.body;

      //  Generate unique ticketId
      const ticketId = `CMP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      //  Make sure to save ticketId into complaint
      const complaint = new Complaint({
        student: req.user._id,
        ticketId, // <-- FIXED (this was missing)
        category,
        title,
        description,
        location,
        priority: priority || 'medium',
        urgency: urgency || 'moderate',
        images: images || []
      });

      await complaint.save();
      await complaint.populate('student', 'name studentId roomNumber block');

      res.status(201).json({
        message: 'Complaint submitted successfully',
        complaint,
        ticketId: complaint.ticketId
      });
    } catch (error) {
      console.error('Create complaint error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


 

// Get all complaints for student
router.get('/my-complaints', auth, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { student: req.user._id };
    
    if (status && status !== 'all') {
      filter.status = status;
    }

    const complaints = await Complaint.find(filter)
      .populate('student', 'name studentId roomNumber block')
      .populate('assignedTo', 'name department')
      .populate('resolutionDetails.resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all complaints (Admin only)
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, assigned } = req.query;
    const filter = {};
    
    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (assigned === 'me') filter.assignedTo = req.user._id;
    if (assigned === 'unassigned') filter.assignedTo = null;

    const complaints = await Complaint.find(filter)
      .populate('student', 'name studentId roomNumber block')
      .populate('assignedTo', 'name department')
      .populate('resolutionDetails.resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Complaint.countDocuments(filter);

    res.json({
      complaints,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
 
router.get('/stats/overview', auth, requireAdmin, async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'in-progress' });

    // Category-wise statistics with all status counts
    const categoryStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          }
        }
      }
    ]);

    // Recent resolved complaints (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentlyResolved = await Complaint.countDocuments({
      status: 'resolved',
      'resolutionDetails.resolvedAt': { $gte: sevenDaysAgo }
    });

    // Calculate average resolution time in days
    const resolutionStats = await Complaint.aggregate([
      {
        $match: { 
          status: 'resolved',
          'resolutionDetails.resolvedAt': { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$resolutionDetails.resolvedAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    const avgResolutionTime = resolutionStats[0]?.avgResolutionTime || 0;

    res.json({
      total: totalComplaints,
      resolved: resolvedComplaints,
      pending: pendingComplaints,
      inProgress: inProgressComplaints,
      resolutionRate: totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0,
      categoryStats,
      recentlyResolved,
      avgResolutionTime: avgResolutionTime ? parseFloat(avgResolutionTime.toFixed(1)) : 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



 
 

// Get complaint by ID

router.get('/stats/home/overview', async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'in-progress' });

    // Calculate average resolution time in days
    const resolutionStats = await Complaint.aggregate([
      {
        $match: { 
          status: 'resolved',
          'resolutionDetails.resolvedAt': { $exists: true },
          createdAt: { $exists: true }
        }
      },
      {
        $addFields: {
          resolutionTime: {
            $divide: [
              { $subtract: ['$resolutionDetails.resolvedAt', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: { $avg: '$resolutionTime' }
        }
      }
    ]);

    const avgResolutionTime = resolutionStats[0]?.avgResolutionTime || 0;

    res.json({
      totalComplaints: totalComplaints,
      resolvedComplaints: resolvedComplaints,
      pendingComplaints: pendingComplaints,
      inProgressComplaints: inProgressComplaints,
      resolutionRate: totalComplaints > 0 ? Math.round((resolvedComplaints / totalComplaints) * 100) : 0,
      avgDaysToResolve: avgResolutionTime ? parseFloat(avgResolutionTime.toFixed(1)) : 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



router.get('/:id', auth, async (req, res) => {
  try {
    // ✅ Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name studentId roomNumber block')
      .populate('assignedTo', 'name department email phone')
      .populate('resolutionDetails.resolvedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user has access to this complaint
    if (req.userType === 'student' && !complaint.student._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});






// Get recent complaints for home page (public route - no auth required)
router.get('/recent/public', async (req, res) => {
  try {
    const recentComplaints = await Complaint.find()
      .sort({ createdAt: -1 }) // Sort by newest first
      .limit(14) // Limit to 10 most recent complaints
      .populate('student', 'name') // Only get student name for privacy
      .select('title category status createdAt'); // Only select necessary fields

    res.json({ complaints: recentComplaints });
  } catch (error) {
    console.error('Get recent complaints error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single complaint by ID (with auth - keep your existing route)
router.get('/:id', auth, async (req, res) => {
  try {
    // ✅ Check if valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid complaint ID' });
    }

    const complaint = await Complaint.findById(req.params.id)
      .populate('student', 'name studentId roomNumber block')
      .populate('assignedTo', 'name department email phone')
      .populate('resolutionDetails.resolvedBy', 'name');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user has access to this complaint
    if (req.userType === 'student' && !complaint.student._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ complaint });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});





// Update complaint status (Admin only)
router.patch('/:id/status', [
  auth,
  requireAdmin,
  body('status').isIn(['pending', 'in-progress', 'resolved', 'rejected'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;

    if (status === 'resolved') {
      complaint.resolutionDetails = {
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        notes: notes || ''
      };
    }

    if (status === 'in-progress' && !complaint.assignedTo) {
      complaint.assignedTo = req.user._id;
    }

    await complaint.save();
    await complaint.populate('student', 'name studentId roomNumber block');
    await complaint.populate('assignedTo', 'name department');
    await complaint.populate('resolutionDetails.resolvedBy', 'name');

    res.json({ 
      message: 'Complaint status updated successfully',
      complaint 
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add rating and feedback (Student only)
router.post('/:id/rating', [
  auth,
  requireStudent,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('feedback').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, feedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if complaint belongs to student
    if (!complaint.student.equals(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Check if complaint is resolved
    if (complaint.status !== 'resolved') {
      return res.status(400).json({ message: 'Only resolved complaints can be rated' });
    }

    complaint.rating = {
      score: rating,
      feedback: feedback || '',
      ratedAt: new Date()
    };

    await complaint.save();

    res.json({ message: 'Rating submitted successfully', complaint });
  } catch (error) {
    console.error('Add rating error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
