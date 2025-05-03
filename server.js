const express = require('express');
const path = require('path');
const config = require('./config/config');
const apiRoutes = require('./routes/videoCreationRoutes');
const ffmpegService = require('./services/ffmpegService');

const app = express();
const port = config.port;

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
  console.log(`- Create video with audio: http://localhost:${port}/api/create-3dvideo-with-audio (POST)`);
  console.log(`- Create video with audio: http://localhost:${port}/api/create-2dvideo-with-audio (POST)`);
});

module.exports = app;