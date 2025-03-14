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
const { textToSpeech } = require('../services/TTSservice'); 
const { uploadVideo }= require('../services/vimeoService')
const combineAnimations = require("../services/2dvideoService")
const {sendTextForPrediction}=require("../services/NLPservice")


// Route to capture frames only
router.get('/capture', async (req, res) => {
  try {
    await directoryService.setupDirectories();
    console.log('Starting frame capture...');
    await captureService.captureFrames(2, config.ffmpeg.frameRate);
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

router.post('/create-2dvideo-with-audio', express.json(), async (req, res) => {
  try {
      // Extract text from request body
      const textToConvert = req.body.text || "Hello, this is a sample audio from Eleven Labs.";

      const emotionPrediction = await sendTextForPrediction(textToConvert);
      const emotions = emotionPrediction.emotionsArray;

      // Generate audio using Eleven Labs API
      const audioPath = await textToSpeech(textToConvert);
      console.log(audioPath);

      // Get model parameters
      const hairColor = req.query.hair || "BLACK";
      const shirtColor = req.query.shirt || "BLACK";
      
      // Set model params for reference (in case needed elsewhere)
      captureService.setModelParams({
          hair: hairColor,
          shirt: shirtColor,
          face: req.query.face
      });

      await directoryService.setupDirectories();
      
      // Get the duration of generated audio
      const audioDuration = await ffmpegService.getAudioDuration(audioPath);
      console.log(`Audio duration: ${audioDuration} seconds`);
      
      // Define video files based on hair and shirt parameters only
      const videoFiles = [
          `public/animations/happyHAIR${hairColor}SHIRT${shirtColor}.mp4`,
          `public/animations/neutralHAIR${hairColor}SHIRT${shirtColor}.mp4`
      ];
      
      // Create output filename
      const tempVideoName = `temp_${Date.now()}.mp4`;
      
      // Fix: Define outputDir if config.outputDir is not available
      const outputDir = config.outputDir || path.join(process.cwd(), 'output');
      const videoOutputPath = path.join(outputDir, tempVideoName);
      
      // Use combineAnimations instead of captureFrames and createSilentVideo
      const videoPath = await combineAnimations({
          videoFiles: videoFiles,
          outputFile: videoOutputPath,
          duration: audioDuration, // Use audio duration for the video
          loop: true,
          fadeTransition: 0.5,
          rootDir: process.cwd(),
          emotions: emotions 
      });
      
      // Merge video with generated audio
      const finalVideoName = `final_${Date.now()}.mp4`;
      const finalPath = await ffmpegService.mergeVideoWithAudio(videoPath, audioPath, finalVideoName);
      
      // Upload to Vimeo if configured
      let vimeoResponse = null;
      if (typeof uploadVideo === 'function') {
          vimeoResponse = await uploadVideo(finalPath, {
              name: `Generated Video ${Date.now()}`,
              description: `Video generated from text: "${textToConvert.substring(0, 100)}..."`,
              privacy: { view: 'anybody' }
          });
      }
      
      // Prepare response
      const videoUrl = `/output/${path.basename(finalPath)}`;
      const response = {
          success: true,
          message: 'Video created successfully with generated audio',
          videoUrl: videoUrl,
          duration: audioDuration
      };
      
      // Add Vimeo info if available
      if (vimeoResponse) {
          response.message = 'Video created successfully and uploaded to Vimeo';
          response.vimeoUri = vimeoResponse.uri;
          response.vimeoLink = vimeoResponse.link;
      }
      
      res.json(response);
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
      // Extract text from request body
      const textToConvert = req.body.text || "Hello, this is a sample audio from Eleven Labs.";

      // Generate audio using Eleven Labs API
      const audioPath = await textToSpeech(textToConvert);
      console.log(audioPath)


      captureService.setModelParams({
          hair: req.query.hair,
          shirt: req.query.shirt,
          face: req.query.face
      });

      await directoryService.setupDirectories();
      
      // Get the duration of generated audio
      const duration = await ffmpegService.getAudioDuration(audioPath);
      console.log(`Audio duration: ${duration} seconds`);
      
      // Capture video frames
      await captureService.captureFrames(duration, config.ffmpeg.frameRate);
      
      // Create a silent video
      const tempVideoName = `temp_${Date.now()}.mp4`;
      const videoPath = await ffmpegService.createSilentVideo(tempVideoName, duration, config.ffmpeg.frameRate);
      
      // Merge video with generated audio
      const finalVideoName = `final_${Date.now()}.mp4`;
      const finalPath = await ffmpegService.mergeVideoWithAudio(videoPath, audioPath, finalVideoName);
      
      const vimeoResponse = await uploadVideo(finalPath, {
          name: `Generated Video ${Date.now()}`,
          description: `Video generated from text: "${textToConvert.substring(0, 100)}..."`,
          privacy: { view: 'anybody' } // or 'password', 'nobody', etc.
      });

      // Clean up temporary files
      // fs.promises.unlink(videoPath).catch(err => console.error('Error deleting temp video:', err));
      await directoryService.cleanupFrames();
      
      // Send final video URL and Vimeo info
      const videoUrl = `/output/${path.basename(finalPath)}`;
      res.json({
          success: true,
          message: 'Video created successfully and uploaded to Vimeo',
          videoUrl: videoUrl,
          vimeoUri: vimeoResponse.uri,
          vimeoLink: vimeoResponse.link,
          duration: duration
      });
      res.json({
          success: true,
          message: 'Video created successfully with generated audio',
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