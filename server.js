const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with more detailed configuration
app.use(cors({
  origin: ['https://sabkamart.com', 'http://localhost:5000'], // Add localhost for testing
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configure AWS credentials with validation
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Validate required environment variables
const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'AWS_BUCKET_NAME', 'S3_UPLOAD_FOLDER'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Configure multer with better error handling
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 100 * 1024, // 100KB limit
    files: 1 // Only one file at a time
  },
  fileFilter: (req, file, cb) => {
    console.log('File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Only JPG, PNG, and WebP files are allowed!`), false);
    }
  }
});

// Upload endpoint with enhanced logging
app.post('/upload', (req, res) => {
  console.log('Upload request received');
  
  upload.single('uploadImage')(req, res, async (err) => {
    try {
      // Handle multer errors
      if (err instanceof multer.MulterError) {
        console.error('Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum 100KB allowed.'
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`
        });
      } else if (err) {
        console.error('File filter error:', err);
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      // Check if file exists
      if (!req.file) {
        console.error('No file in request');
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer.length
      });

      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const fileExtension = path.extname(req.file.originalname).toLowerCase();
      const fileName = `${process.env.S3_UPLOAD_FOLDER}/${timestamp}_${randomString}${fileExtension}`;

      console.log('Generated filename:', fileName);

      // S3 upload parameters
      const uploadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        // Add public read access if needed
        // ACL: 'public-read'
      };

      console.log('Starting S3 upload...');

      // Upload to S3
      const result = await s3.upload(uploadParams).promise();
      
      console.log('S3 upload successful:', {
        location: result.Location,
        bucket: result.Bucket,
        key: result.Key
      });

      res.json({
        success: true,
        message: 'File uploaded successfully',
        imageUrl: result.Location,
        fileName: fileName,
        originalName: req.file.originalname,
        fileSize: req.file.size
      });

    } catch (error) {
      console.error('S3 upload error:', {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      });

      // Handle specific AWS errors
      let errorMessage = 'File upload failed';
      if (error.code === 'NoSuchBucket') {
        errorMessage = 'S3 bucket not found';
      } else if (error.code === 'InvalidAccessKeyId') {
        errorMessage = 'Invalid AWS credentials';
      } else if (error.code === 'SignatureDoesNotMatch') {
        errorMessage = 'AWS signature mismatch';
      } else if (error.code === 'AccessDenied') {
        errorMessage = 'AWS access denied';
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        errorCode: error.code || 'UNKNOWN_ERROR'
      });
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'Server is running!',
    timestamp: new Date().toISOString(),
    supportedFormats: ['JPG', 'PNG', 'WebP'],
    maxFileSize: '100KB',
    environment: {
      nodeVersion: process.version,
      awsRegion: process.env.AWS_REGION,
      bucketName: process.env.AWS_BUCKET_NAME,
      uploadFolder: process.env.S3_UPLOAD_FOLDER
    }
  });
});

// AWS connection test
app.get('/test-aws', async (req, res) => {
  try {
    console.log('Testing AWS connection...');
    
    // Test bucket access
    const bucketExists = await s3.headBucket({ 
      Bucket: process.env.AWS_BUCKET_NAME 
    }).promise();
    
    console.log('Bucket test successful');

    // Test listing objects (optional)
    const listParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      MaxKeys: 1,
      Prefix: process.env.S3_UPLOAD_FOLDER + '/'
    };
    
    const listResult = await s3.listObjectsV2(listParams).promise();
    
    res.json({
      status: 'AWS S3 connection successful',
      bucket: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION,
      uploadFolder: process.env.S3_UPLOAD_FOLDER,
      bucketAccess: 'OK',
      objectCount: listResult.KeyCount || 0
    });
    
  } catch (error) {
    console.error('AWS test error:', error);
    res.status(500).json({
      status: 'AWS S3 connection failed',
      error: error.message,
      errorCode: error.code,
      bucket: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
  }
});

// Debug endpoint to check environment
app.get('/debug', (req, res) => {
  res.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      AWS_REGION: process.env.AWS_REGION,
      AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
      S3_UPLOAD_FOLDER: process.env.S3_UPLOAD_FOLDER,
      AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET'
    },
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
  
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Max 100KB allowed.'
    });
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'Server error',
    errorCode: error.code || 'UNKNOWN_ERROR'
  });
});

// 404 fallback
app.use((req, res) => {
  console.log('404 - Endpoint not found:', req.method, req.url);
  res.status(404).json({ 
    success: false, 
    message: 'Endpoint not found',
    method: req.method,
    url: req.url
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 AWS test: http://localhost:${PORT}/test-aws`);
  console.log(`🐛 Debug info: http://localhost:${PORT}/debug`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});