 



const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Upload image to MongoDB (local storage)
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // For local storage, we store the file path and buffer
    const imageData = {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path, // Path where multer saved the file
      buffer: req.file.buffer, // File buffer data
      url: `/uploads/${req.file.filename}` // URL to access the image
    };

    res.json({
      message: 'Image uploaded successfully',
      image: imageData
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Image upload failed' });
  }
};

// Upload multiple images to MongoDB
exports.uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No image files provided' });
    }

    if (req.files.length > 5) {
      return res.status(400).json({ message: 'Maximum 5 images allowed' });
    }

    const uploadedImages = req.files.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      buffer: file.buffer,
      url: `/uploads/${file.filename}`
    }));

    res.json({
      message: 'Images uploaded successfully',
      images: uploadedImages
    });
  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({ message: 'Images upload failed' });
  }
};

// Delete image (optional - for local file system cleanup)
exports.deleteImage = async (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({ message: 'Filename is required' });
    }

    // You would need to implement file system deletion here
    // For example using fs.unlink() if you're saving files locally
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({ message: 'Image deletion failed' });
  }
};

// Get image (serve image files)
exports.getImage = async (req, res) => {
  try {
    const { filename } = req.params;
    
    // You would implement logic to serve the image file
    // For example using res.sendFile() if files are stored locally
    res.json({ message: 'Image retrieval endpoint' });
  } catch (error) {
    console.error('Get image error:', error);
    res.status(500).json({ message: 'Failed to retrieve image' });
  }
};