const puppeteer = require('puppeteer');
const path = require('path');
const config = require('../config/config');
const { delay, buildUrl } = require('../utils/helpers');
const fs = require('fs'); 

let modelState = {
  hair: null,
  shirt: null,
  face: null
};


async function convertWebmToMp4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');
    
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',     // Use H.264 codec for video
        '-preset fast',     // Encoding preset (options: ultrafast, superfast, veryfast, faster, fast, medium, slow, slower, veryslow)
        '-crf 22',          // Constant Rate Factor (lower = better quality, higher = smaller file)
        '-pix_fmt yuv420p', // Pixel format for better compatibility
      ])
      .output(outputPath)
      .on('end', () => {
        console.log(`Successfully converted ${inputPath} to ${outputPath}`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error(`Error converting video: ${err.message}`);
        reject(err);
      })
      .run();
  });
}
function setModelParams(params) {
  modelState = { ...modelState, ...params };
}

async function captureVideo(duration, fps = config.ffmpeg.frameRate) {
  const browser = await puppeteer.launch({
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Build URL with query parameters
    const baseUrl = 'http://localhost:' + config.port;
    const url = buildUrl(baseUrl, {
      hair: modelState.hair,
      shirt: modelState.shirt,
      face: modelState.face
    });
    
    console.log(`Loading page: ${url}`);
    await page.goto(url, {
      waitUntil: ['domcontentloaded', 'networkidle0']
    });
    
    console.log('Waiting for canvas...');
    await page.waitForSelector('canvas#scene');
    
    console.log('Waiting for scene initialization...');
    await delay(2000);
    
    const hasRecordingFunction = await page.evaluate(() => {
      return typeof window.startRecording === 'function';
    });
    
    if (!hasRecordingFunction) {
      throw new Error('startRecording function not found in browser context');
    }
    
    console.log(`Scene is ready, starting recording for ${duration} seconds at ${fps} FPS...`);
    
    await page.evaluate((duration, fps) => {
      window.recordingPromise = window.startRecording(duration, fps);
    }, duration, fps);
    
    await delay((duration * 1000) + 500);
  
    const buffer = await page.evaluate(async () => {
      try {
        const blob = await window.recordingPromise;
        const arrayBuffer = await blob.arrayBuffer();
        
        return Array.from(new Uint8Array(arrayBuffer));
      } catch (error) {
        console.error('Error in browser context:', error);
        throw error;
      }
    });
    const tempWebmPath = path.join(config.directories.output, `temp-${Date.now()}.webm`);
    fs.writeFileSync(tempWebmPath, Buffer.from(buffer));
    
    const mp4Path = path.join(config.directories.output, `output-${Date.now()}.mp4`);
    await convertWebmToMp4(tempWebmPath, mp4Path);
    fs.unlinkSync(tempWebmPath);
    
    console.log(`Recording complete. Video saved to: ${mp4Path}`);
    return mp4Path;

  } catch (error) {
    console.error('Error during capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = {
  captureVideo,
  setModelParams
};