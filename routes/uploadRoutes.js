 



const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/') // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

// Alternatively, use memory storage if you want to store buffers in MongoDB
const memoryStorage = multer.memoryStorage();

const upload = multer({ 
  storage: storage, // Use diskStorage for local files or memoryStorage for buffers
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Single file upload
router.post('/image', upload.single('image'), uploadController.uploadImage);

// Multiple files upload (max 5)
router.post('/images', upload.array('images', 5), uploadController.uploadMultipleImages);

// Delete image
router.delete('/image', uploadController.deleteImage);

// Get image
router.get('/image/:filename', uploadController.getImage);

module.exports = router;
