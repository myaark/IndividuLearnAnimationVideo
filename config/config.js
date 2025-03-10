// config/config.js
require('dotenv').config(); // If using .env file

module.exports = {
  port: process.env.PORT || 3000,
  
  vimeo: {
    clientId: process.env.VIMEO_CLIENT_ID,
    clientSecret: process.env.VIMEO_CLIENT_SECRET,
    accessToken: process.env.VIMEO_ACCESS_TOKEN
  },
  
  ffmpeg: {
    path: "C:\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe",
    frameRate: 30
  },
  
  directories: {
    frames: 'frames',
    output: 'output',
    public: 'public'
  }
};