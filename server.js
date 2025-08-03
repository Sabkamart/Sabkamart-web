const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS only for your frontend domain
app.use(cors({
  origin: 'https://sabkamart.com',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Configure AWS credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Configure multer (memory storage + 100KB limit + file type filter)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 100 * 1024 }, // 100KB limit
  fileFilter: (req, file, cb) => {
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
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const timestamp = Date.now();
    const fileExtension = path.extname(req.file.originalname);
    const fileName = `${process.env.S3_UPLOAD_FOLDER}/${timestamp}${fileExtension}`;

    const uploadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const result = await s3.upload(uploadParams).promise();

    res.json({
      success: true,
      message: 'File uploaded successfully',
      imageUrl: result.Location,
      fileName: fileName
    });

  } catch (error) {
    console.error('Upload error:', error);
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

// AWS connection test
app.get('/test-aws', async (req, res) => {
  try {
    await s3.headBucket({ Bucket: process.env.AWS_BUCKET_NAME }).promise();
    res.json({
      status: 'AWS S3 connection successful',
      bucket: process.env.AWS_BUCKET_NAME,
      region: process.env.AWS_REGION
    });
  } catch (error) {
    console.error('AWS test error:', error);
    res.status(500).json({
      status: 'AWS S3 connection failed',
      error: error.message
    });
  }
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Max 100KB allowed.'
    });
  }
  res.status(500).json({
    success: false,
    message: error.message || 'Server error'
  });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server is running — ready to serve requests on your domain`);
});