require('dotenv').config(); 

module.exports = {
  port: process.env.PORT || 3000,
  
  vimeo: {
    clientId: process.env.VIMEO_CLIENT_ID,
    clientSecret: process.env.VIMEO_CLIENT_SECRET,
    accessToken: process.env.VIMEO_ACCESS_TOKEN
  },
  elevenLabsApiKey: process.env.ELEVEN_LABS_API_KEY,
  
  ffmpeg: {
    path: "C:\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe",
    frameRate:30
  },
  
  directories: {
    frames: 'frames',
    output: 'output',
    public: 'public'
  }
};