const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const captureService = require('../services/captureService');
const ffmpegService = require('../services/ffmpegService');
const directoryService = require('../services/directoryService');
const config = require('../config/config');
const { textToSpeech } = require('../services/TTSservice'); 
const { uploadVideo }= require('../services/vimeoService');
const combineAnimations = require("../services/2dvideoService");
const {sendTextForPrediction}=require("../services/NLPservice");
const cleanText = require("../services/transcriptCleanUpService")

router.post('/create-2dvideo-with-audio', express.json(), async (req, res) => {
  try {
      // Extract text from request body
      const textToConvert = req.body.text || "Hello, this is a sample audio from Eleven Labs.";
      const cleanedText = cleanText(textToConvert)
      const emotionPrediction = await sendTextForPrediction(cleanedText);
      const emotions = emotionPrediction.emotionsArray;

      // Generate audio using Eleven Labs API
      const audioPath = await textToSpeech(cleanedText);
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
              description: `Video generated from text: "${cleanedText.substring(0, 100)}..."`,
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


router.post('/create-3dvideo-with-audio', express.json(), async (req, res) => {
  try {
      const textToConvert = req.body.text || "Hello, this is a sample audio from Eleven Labs.";
      const cleanedText = cleanText(textToConvert)
      const audioPath = await textToSpeech(cleanedText);
      console.log(audioPath)

      captureService.setModelParams({
          hair: req.query.hair,
          shirt: req.query.shirt,
          face: req.query.face
      });

      await directoryService.setupDirectories();
      
      const duration = await ffmpegService.getAudioDuration(audioPath);
      console.log(`Audio duration: ${duration} seconds`);
      
      const videoPath = await captureService.captureVideo(duration, config.ffmpeg.frameRate);
      const finalVideoName = `final_${Date.now()}.mp4`;
      const finalPath = await ffmpegService.mergeVideoWithAudio(videoPath, audioPath, finalVideoName);
      
      const vimeoResponse = await uploadVideo(finalPath, {
          name: `Generated Video ${Date.now()}`,
          description: `Video generated from text: "${cleanedText.substring(0, 100)}..."`,
          privacy: { view: 'anybody' } 
      });

      await directoryService.cleanupFrames();
      const videoUrl = `/output/${path.basename(finalPath)}`;

      res.json({
          success: true,
          message: 'Video created successfully and uploaded to Vimeo',
          videoUrl: videoUrl,
          vimeoUri: vimeoResponse.uri,
          vimeoLink: vimeoResponse.link,
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

module.exports = router;