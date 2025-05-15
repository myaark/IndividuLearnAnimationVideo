// Server-side CORS configuration (add to your app.js)

const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/api');
const ffmpegService = require('./services/ffmpegService');

// Initialize express app
const app = express();
const port = config.port;

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:3000', // Allow your React app domain
  credentials: true,               // Allow credentials (cookies, authorization headers)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
};

// Enable CORS with options
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});


// Initialize FFmpeg
ffmpegService.initFFmpeg()
  .then(() => console.log('FFmpeg initialized successfully'))
  .catch(err => {
    console.error('Failed to initialize FFmpeg:', err);
    process.exit(1);
  });

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/output', express.static(config.directories.output));

// API Routes
app.use('/api', apiRoutes);

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, config.directories.public, '/index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('API endpoints:');
  console.log(`- Capture frames: http://localhost:${port}/api/capture`);
  console.log(`- Create video: http://localhost:${port}/api/create-video`);
  console.log(`- Create video with audio: http://localhost:${port}/api/create-2dvideo-with-audio (POST)`);
});

module.exports = app;