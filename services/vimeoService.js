// services/vimeoService.js
const { Vimeo } = require('vimeo');
const config = require('../config/config');

// Initialize Vimeo client
const client = new Vimeo(
  config.vimeo.clientId,
  config.vimeo.clientSecret,
  config.vimeo.accessToken
);

/**
 * Fetch videos from Vimeo account
 * @returns {Promise<Array>} - Array of video data
 */
function fetchVideos() {
  return new Promise((resolve, reject) => {
    client.request({
      method: 'GET',
      path: '/me/videos'
    }, (error, body, statusCode, headers) => {
      if (error) {
        console.log('Error:', error);
        reject(error);
        return;
      }
      
      resolve(body.data);
    });
  });
}

/**
 * Upload a video to Vimeo
 * @param {string} filePath - Path to the video file
 * @param {Object} options - Upload options
 * @param {string} options.title - Video title (default: 'My Video')
 * @param {Function} progressCallback - Optional callback for upload progress
 * @returns {Promise<Object>} - Upload result with URI
 */
function uploadVideo(filePath, options = {}, progressCallback = null) {
  return new Promise((resolve, reject) => {
    const title = options.title || 'My Video';
    
    try {
      client.upload(
        filePath,
        { name: title },
        function (uri) {
          console.log('Video uploaded to Vimeo URI:', uri);
          resolve({ success: true, uri });
        },
        function (bytesUploaded, bytesTotal) {
          const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
          console.log('Upload progress:', percentage + '%');
          
          if (progressCallback && typeof progressCallback === 'function') {
            progressCallback(bytesUploaded, bytesTotal, percentage);
          }
        },
        function (error) {
          console.error('Failed to upload video to Vimeo:', error);
          reject(error);
        }
      );
    } catch (err) {
      console.error('Error in uploadVideo:', err);
      reject(err);
    }
  });
}

module.exports = {
  client,
  fetchVideos,
  uploadVideo
};