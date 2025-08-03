const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.accessKeyId,
  secretAccessKey: process.env.secretAccessKey,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 // 100KB limit as mentioned in your HTML
  },
  fileFilter: (req, file, cb) => {
    // Check file type - Accept JPG, PNG, and WebP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP files are allowed!'), false);
    }
  }
});

// Upload endpoint
app.post('/upload', upload.single('uploadImage'), async (req, res) => {
  try {
    console.log('Upload request received');
    
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${process.env.S3_UPLOAD_FOLDER}/${timestamp}${fileExtension}`;

    console.log('Generated filename:', fileName);

    // S3 upload parameters
    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
      // Removed ACL as it's not allowed on this bucket
    };

    console.log('Uploading to S3...');

    // Upload to S3
    const result = await s3.upload(uploadParams).promise();

    console.log('File uploaded successfully:', result.Location);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      imageUrl: result.Location,
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 100KB allowed.'
      });
    }

    if (error.message.includes('Only JPG, PNG, and WebP files are allowed!')) {
      return res.status(400).json({
        success: false,
        message: 'Only JPG, PNG, and WebP files are allowed!'
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'File upload failed'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    supportedFormats: ['JPG', 'PNG', 'WebP'],
    maxFileSize: '100KB'
  });
});

// Test AWS connection endpoint
app.get('/test-aws', async (req, res) => {
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME
    };
    
    await s3.headBucket(params).promise();
    res.json({
      status: 'AWS S3 connection successful',
      bucket: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
  } catch (error) {
    console.error('AWS connection error:', error);
    res.status(500).json({
      status: 'AWS S3 connection failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum 100KB allowed.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please use "uploadImage" field name.'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 AWS test: http://localhost:${PORT}/test-aws`);
  console.log(`📁 Supported formats: JPG, PNG, WebP`);
  console.log(`📏 Max file size: 100KB`);
  console.log(`📂 Upload folder: ${process.env.S3_UPLOAD_FOLDER || 'category'}`);
  console.log(`🪣 S3 Bucket: ${process.env.AWS_BUCKET_NAME || 'Not configured'}`);
});