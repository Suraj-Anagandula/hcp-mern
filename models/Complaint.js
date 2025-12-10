 


const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['electrical', 'plumbing', 'carpentry', 'internet', 'sanitation', 'other']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  urgency: {
    type: String,
    enum: ['minor', 'moderate', 'critical'],
    default: 'moderate'
  },
  images: [{
  url: String, // This will store base64 encoded image data
  filename: String,
  originalname: String,
  mimetype: String,
  size: Number
  // Remove any file path fields since we're not storing files on disk
}],
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'resolved', 'rejected'],
    default: 'pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  resolutionDetails: {
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
    },
    resolvedAt: Date,
    notes: String,
    solution: String
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  }
}, {
  timestamps: true
});

// Pre-save hook to generate ticketId
complaintSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      let unique = false;
      let count = 0;
      while (!unique) {
        const newTicketId = `TKT${String(await mongoose.model('Complaint').countDocuments() + 1 + count).padStart(6, '0')}`;
        const exists = await mongoose.model('Complaint').findOne({ ticketId: newTicketId });
        if (!exists) {
          this.ticketId = newTicketId;
          unique = true;
        } else {
          count++;
        }
      }
    } catch (err) {
      return next(err);
    }
  }
  next();
});

module.exports = mongoose.model('Complaint', complaintSchema);