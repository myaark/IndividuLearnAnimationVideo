// services/ffmpegService.js
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const config = require('../config/config');
const ffmpegPath = require('ffmpeg-static');
// const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
// Set FFmpeg path
// ffmpeg.setFfmpegPath(config.ffmpeg.path);

/**
 * Initialize FFmpeg and test if it's working
 */
function initFFmpeg() {
  return new Promise((resolve, reject) => {
    ffmpeg.getAvailableFormats(function(err, formats) {
      if (err) {
        console.error('FFmpeg error:', err);
        reject(err);
      } else {
        console.log('FFmpeg is working correctly');
        resolve(true);
      }
    });
  });
}

/**
 * Get audio file duration
 * @param {string} audioPath - Path to audio file
 * @returns {Promise<number>} - Duration in seconds
 */
function getAudioDuration(audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

/**
 * Create a silent video from frame images
 * @param {string} outputFileName - Output file name
 * @param {number} duration - Video duration in seconds
 * @param {number} fps - Frames per second
 * @returns {Promise<string>} - Path to created video
 */
function createSilentVideo(outputFileName, duration, fps = config.ffmpeg.frameRate) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), config.directories.output, outputFileName);
    
    ffmpeg()
      .input(path.join(config.directories.frames, 'frame-%04d.png'))
      .inputFPS(fps)
      .output(outputPath)
      .videoCodec('libx264')
      .outputFPS(fps)
      .duration(duration)
      .on('end', () => {
        console.log('Silent video creation finished');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error creating video:', err);
        reject(err);
      })
      .run();
  });
}

/**
 * Merge video with audio
 * @param {string} videoPath - Path to video file
 * @param {string} audioPath - Path to audio file
 * @param {string} outputFileName - Output file name
 * @returns {Promise<string>} - Path to merged video
 */
function mergeVideoWithAudio(videoPath, audioPath, outputFileName) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(process.cwd(), config.directories.output, outputFileName);
    
    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .outputOptions([
        '-map 0:v:0',  // Map video from first input
        '-map 1:a:0',  // Map audio from second input
        '-c:v copy',   // Copy video codec (no re-encoding)
        '-c:a aac',    // Use AAC audio codec
        '-shortest'    // End when shortest input ends
      ])
      .on('end', () => {
        console.log('Video and audio merged successfully');
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Error merging video and audio:', err);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = {
  initFFmpeg,
  getAudioDuration,
  createSilentVideo,
  mergeVideoWithAudio
};