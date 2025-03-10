// services/directoryService.js
const fs = require('fs').promises;
const path = require('path');
const config = require('../config/config');

/**
 * Creates necessary directories if they don't exist
 * @returns {Promise<void>}
 */
async function setupDirectories() {
  const dirs = [config.directories.frames, config.directories.output];
  
  for (const dir of dirs) {
    try {
      await fs.mkdir(dir);
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }
}

/**
 * Removes all files from the frames directory
 * @returns {Promise<void>}
 */
async function cleanupFrames() {
  try {
    const framesDir = config.directories.frames;
    const files = await fs.readdir(framesDir);
    
    await Promise.all(
      files.map(file => fs.unlink(path.join(framesDir, file)))
    );
    
    console.log('Frames cleanup complete');
  } catch (error) {
    console.error('Error cleaning up frames:', error);
    throw error;
  }
}

module.exports = {
  setupDirectories,
  cleanupFrames
};