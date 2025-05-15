// Route to capture frames only
router.get('/capture', async (req, res) => {
    try {
      await directoryService.setupDirectories();
      console.log('Starting frame capture...');
      await captureService.captureVideo(2, config.ffmpeg.frameRate);
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