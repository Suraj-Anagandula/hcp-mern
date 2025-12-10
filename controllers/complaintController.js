const Complaint = require('../models/Complaint');
const { validationResult } = require('express-validator');



const Complaint = require('../models/Complaint');
const { validationResult } = require('express-validator');

// Create a new complaint
exports.createComplaint = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category, title, description, location, priority, urgency } = req.body;

    // Handle uploaded files
    const images = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url: `/uploads/${file.filename}`
    })) : [];

    const complaint = new Complaint({
      student: req.user._id,
      category,
      title,
      description,
      location,
      priority: priority || 'medium',
      urgency: urgency || 'moderate',
      images: images
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
};

 

// Get all complaints for student
exports.getStudentComplaints = async (req, res) => {
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
};

// Get all complaints for admin
exports.getAllComplaints = async (req, res) => {
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
};

// Get complaint by ID
exports.getComplaintById = async (req, res) => {
  try {
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
};

// Update complaint status
exports.updateComplaintStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, notes, solution } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.status = status;

    if (status === 'resolved') {
      complaint.resolutionDetails = {
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        notes: notes || '',
        solution: solution || ''
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
};

// Add rating and feedback
exports.addRating = async (req, res) => {
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
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const totalComplaints = await Complaint.countDocuments();
    const resolvedComplaints = await Complaint.countDocuments({ status: 'resolved' });
    const pendingComplaints = await Complaint.countDocuments({ status: 'pending' });
    const inProgressComplaints = await Complaint.countDocuments({ status: 'in-progress' });

    // Category-wise statistics
    const categoryStats = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
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

    // Average resolution time
    const resolutionStats = await Complaint.aggregate([
      {
        $match: { status: 'resolved' }
      },
      {
        $group: {
          _id: null,
          avgResolutionTime: {
            $avg: {
              $divide: [
                { $subtract: ['$resolutionDetails.resolvedAt', '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        }
      }
    ]);

    res.json({
      total: totalComplaints,
      resolved: resolvedComplaints,
      pending: pendingComplaints,
      inProgress: inProgressComplaints,
      resolutionRate: totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0,
      categoryStats,
      recentlyResolved,
      avgResolutionTime: resolutionStats[0]?.avgResolutionTime || 0
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Assign complaint to admin
exports.assignComplaint = async (req, res) => {
  try {
    const { adminId } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    complaint.assignedTo = adminId;
    complaint.status = 'in-progress';
    await complaint.save();

    await complaint.populate('assignedTo', 'name department');
    await complaint.populate('student', 'name studentId roomNumber block');

    res.json({ 
      message: 'Complaint assigned successfully',
      complaint 
    });
  } catch (error) {
    console.error('Assign complaint error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



 