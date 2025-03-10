// routes/api.js
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const captureService = require('../services/captureService');
const ffmpegService = require('../services/ffmpegService');
const directoryService = require('../services/directoryService');
const vimeoService = require('../services/vimeoService');
const config = require('../config/config');

// Route to capture frames only
router.get('/capture', async (req, res) => {
  try {
    await directoryService.setupDirectories();
    console.log('Starting frame capture...');
    await captureService.captureFrames(10, config.ffmpeg.frameRate);
    res.send('Frames captured successfully!');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send(`Error capturing frames: ${error.message}`);
  }
});

// Route to create video from existing frames
router.get('/create-video', async (req, res) => {
  try {
    const outputFileName = `animation_${Date.now()}.mp4`;
    const fps = parseInt(req.query.fps) || config.ffmpeg.frameRate;
    const duration = parseInt(req.query.duration) || 10;
    
    console.log('Creating video...');
    const videoPath = await ffmpegService.createSilentVideo(outputFileName, duration, fps);
    
    // Clean up frames after video creation
    await directoryService.cleanupFrames();
    
    // Send video file URL in response
    const videoUrl = `/output/${path.basename(videoPath)}`;
    res.json({
      success: true,
      message: 'Video created successfully',
      videoUrl: videoUrl
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: `Error creating video: ${error.message}`
    });
  }
});

// Route to create video with audio
router.post('/create-video-with-audio', express.json(), async (req, res) => {
  try {
    // Set model parameters from query
    captureService.setModelParams({
      hair: req.query.hair,
      shirt: req.query.shirt,
      face: req.query.face
    });
    
    // Make sure audio file exists
    const audioPath = path.join(process.cwd(), req.body.audioFile);
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not found');
    }

    await directoryService.setupDirectories();
    
    // Get audio duration
    const duration = await ffmpegService.getAudioDuration(audioPath);
    console.log(`Audio duration: ${duration} seconds`);
    
    // Capture frames based on audio duration
    await captureService.captureFrames(duration, config.ffmpeg.frameRate);
    
    // Create silent video
    const tempVideoName = `temp_${Date.now()}.mp4`;
    const videoPath = await ffmpegService.createSilentVideo(tempVideoName, duration, config.ffmpeg.frameRate);
    
    // Merge video with audio
    const finalVideoName = `final_${Date.now()}.mp4`;
    const finalPath = await ffmpegService.mergeVideoWithAudio(videoPath, audioPath, finalVideoName);

    // Clean up temporary files
    fs.promises.unlink(videoPath).catch(err => console.error('Error deleting temp video:', err));
    await directoryService.cleanupFrames();
    
    // Send final video URL
    const videoUrl = `/output/${path.basename(finalPath)}`;
    res.json({
      success: true,
      message: 'Video created successfully with audio',
      videoUrl: videoUrl,
      duration: duration
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      message: `Error creating video: ${error.message}`
    });
  }
});

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