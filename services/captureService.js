// services/captureService.js
const puppeteer = require('puppeteer');
const path = require('path');
const config = require('../config/config');
const { delay, buildUrl } = require('../utils/helpers');

/**
 * Global model state variables
 */
let modelState = {
  hair: null,
  shirt: null,
  face: null
};

/**
 * Set model parameters
 * @param {Object} params - Model parameters
 */
function setModelParams(params) {
  modelState = { ...modelState, ...params };
}

/**
 * Capture frames using Puppeteer
 * @param {number} duration - Duration in seconds
 * @param {number} fps - Frames per second
 * @returns {Promise<void>}
 */
async function captureFrames(duration, fps = config.ffmpeg.frameRate) {
  const numFrames = Math.ceil(duration * fps);
  const browser = await puppeteer.launch({
    headless: 'new',
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
    await delay(1000);
    
    const isSceneReady = await page.evaluate(() => {
      return document.querySelector('canvas#scene') !== null;
    });

    if (!isSceneReady) {
      throw new Error('Scene failed to initialize');
    }

    console.log(`Scene is ready, capturing ${numFrames} frames...`);
    
    for (let i = 0; i < numFrames; i++) {
      const fileName = path.join(
        config.directories.frames, 
        `frame-${String(i).padStart(4, '0')}.png`
      );
      
      await page.screenshot({
        path: fileName,
        type: 'png'
      });
      
      console.log(`Captured frame ${i + 1}/${numFrames}`);
      await delay(1000 / fps);
    }
    
    console.log('Frame capture complete');
  } catch (error) {
    console.error('Error during capture:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = {
  captureFrames,
  setModelParams
};