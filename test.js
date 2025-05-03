const path = require('path');
const fs = require('fs');
const captureService = require('./services/captureService');
const ffmpegService = require('./services/ffmpegService');
const directoryService = require('./services/directoryService');
const config = require('./config/config');
// const { textToSpeech } = require('./services/TTSservice'); 
const { uploadVideo }= require('./services/vimeoService');

async function create3dVideoWithAudio() {
    try {
      const modelParams = {};
      captureService.setModelParams({
        hair: modelParams.hair,
        shirt: modelParams.shirt,
        face: modelParams.face
      });
      const audioPath = "output/audio_1741908781393.mp3"
      await directoryService.setupDirectories();
      
      const duration = await ffmpegService.getAudioDuration(audioPath);
      console.log(`Audio duration: ${duration} seconds`);
      
      const videoPath = await captureService.captureVideo(duration, config.ffmpeg.frameRate);
      
      const finalVideoName = `final_${Date.now()}.mp4`;
      
      const finalPath = await ffmpegService.mergeVideoWithAudio(videoPath, audioPath, finalVideoName);
      
      const vimeoResponse = await uploadVideo(finalPath, {
        name: `Generated Video ${Date.now()}`,
        description: `Video generated in testing`,
        privacy: { view: 'anybody' } 
      });
  
      await directoryService.cleanupFrames();
      
      const videoUrl = `/output/${path.basename(finalPath)}`;
  
      return {
        success: true,
        message: 'Video created successfully and uploaded to Vimeo',
        videoUrl: videoUrl,
        vimeoUri: vimeoResponse.uri,
        vimeoLink: vimeoResponse.link,
        duration: duration
      };
    } catch (error) {
      console.error('Error:', error);
      throw new Error(`Error creating video: ${error.message}`);
    }
  }
  async function testVideoCreation() {
    try {
      const result = await create3dVideoWithAudio();
      
      console.log("Video creation successful:");
      console.log(result);
      return result;
    } catch (error) {
      console.error("Video creation failed:", error);
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  
testVideoCreation();
  