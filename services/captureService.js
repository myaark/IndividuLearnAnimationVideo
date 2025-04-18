// services/captureService.js
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

function setModelParams(params) {
  modelState = { ...modelState, ...params };
}
// Change your captureFrames function to captureVideo
async function captureFrames(duration, fps = config.ffmpeg.frameRate) {
  const browser = await puppeteer.launch({
    headless: false, // Use headed mode to ensure media capabilities
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
    
    // Verify if the recording function is available
    const hasRecordingFunction = await page.evaluate(() => {
      return typeof window.startRecording === 'function';
    });
    
    if (!hasRecordingFunction) {
      throw new Error('startRecording function not found in browser context');
    }
    
    console.log(`Scene is ready, starting recording for ${duration} seconds at ${fps} FPS...`);
    
    // Start recording and store the promise
    await page.evaluate((duration, fps) => {
      window.recordingPromise = window.startRecording(duration, fps);
    }, duration, fps);
    
    // Wait for the recording to complete
    await delay((duration * 1000) + 500);
    
    // Get the recorded blob as an ArrayBuffer
    const buffer = await page.evaluate(async () => {
      try {
        // Wait for the recording promise to resolve
        const blob = await window.recordingPromise;
        
        // Read the blob as an ArrayBuffer
        const arrayBuffer = await blob.arrayBuffer();
        
        // Convert ArrayBuffer to a format that can be serialized
        return Array.from(new Uint8Array(arrayBuffer));
      } catch (error) {
        console.error('Error in browser context:', error);
        throw error;
      }
    });
    // Now in Node.js context, save the buffer to a file
    const videoPath = path.join(config.directories.output, `output-${Date.now()}.webm`);
    fs.writeFileSync(videoPath, Buffer.from(buffer));
    
    console.log(`Recording complete. Video saved to: ${videoPath}`);
    return videoPath;
  } catch (error) {
    console.error('Error during capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Also update your exports to include the new function
module.exports = {
  captureFrames,
  // captureVideo,
  setModelParams
};