// app.js - Main application file
const express = require('express');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/api');
const ffmpegService = require('./services/ffmpegService');

// Initialize express app
const app = express();
const port = config.port;

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
  console.log(`- Create video with audio: http://localhost:${port}/api/create-video-with-audio (POST)`);
});

module.exports = app;