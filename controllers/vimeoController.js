const { Vimeo } = require('vimeo');
const CLIENT_ID = process.env.VIMEO_CLIENT_ID;
const CLIENT_SECRET = process.env.VIMEO_CLIENT_SECRET;
const ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
const express = require('express');
const app = express();

const client = new Vimeo(
  CLIENT_ID,
  CLIENT_SECRET,
  VIMEO_ACCESS_TOKEN
);

// Example route to fetch a user's videos
app.get('/videos', (req, res) => {
  client.request({
    method: 'GET',
    path: '/me/videos'
  }, (error, body, statusCode, headers) => {
    if (error) {
      console.log('Error:', error);
      return res.status(500).send('Error fetching videos');
    }
    
    res.json(body.data);
  });
});
// Example route to upload a video
app.post('/upload', (req, res) => {
    try {
        const filePath = req.file.path; 
        const title = req.body.title || 'My Video';
    
        // Pass that server-side file path to Vimeo
        vimeoClient.upload(
          filePath,
          { name: title },
          function (uri) {
            console.log('Video uploaded to Vimeo URI:', uri);
            return res.status(200).json({ success: true, uri });
          },
          function (bytesUploaded, bytesTotal) {
            const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
            console.log('Upload progress:', percentage + '%');
          },
          function (error) {
            console.error('Failed to upload video to Vimeo:', error);
            return res.status(500).json({ error: 'Upload failed', details: error });
          }
        );
      } catch (err) {
        console.error('Error in uploadVideo:', err);
        return res.status(500).json({ error: err.message });
      }
  });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});