const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const vimeoService = require('../services/vimeoService');
// Route to fetch videos from Vimeo
router.get('/videos', async (req, res) => {
  try {
    const videos = await vimeoService.fetchVideos();
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).send('Error fetching videos');
  }
});

// Route to upload video to Vimeo
router.post('/upload-to-vimeo', express.json(), async (req, res) => {
  try {
    const { videoPath, title } = req.body;
    const fullPath = path.join(process.cwd(), videoPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }
    
    const result = await vimeoService.uploadVideo(fullPath, { title });
    res.json(result);
  } catch (error) {
    console.error('Error uploading to Vimeo:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

module.exports = router;