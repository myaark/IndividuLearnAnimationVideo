const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const ffmpeg = require('fluent-ffmpeg');
const fsSync = require('fs');

// Set FFmpeg path - pointing to the executable
const ffmpegPath = "C:\\ffmpeg-master-latest-win64-gpl\\bin\\ffmpeg.exe";
ffmpeg.setFfmpegPath(ffmpegPath);

// Test FFmpeg accessibility
ffmpeg.getAvailableFormats(function(err, formats) {
    if (err) {
        console.error('FFmpeg error:', err);
    } else {
        console.log('FFmpeg is working correctly');
    }
});

const app = express();
const port = 3000;

let ModelHair;
let ModelShirt;
let ModelFace;

// Serve static files from public directory
app.use(express.static('public'));
app.use('/output', express.static('output')); 
// Helper function for delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const frameRate = 30
// Create necessary directories
async function setupDirectories() {
    const dirs = ['frames', 'output'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir);
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
    }
}

// Get audio duration
async function getAudioDuration(audioPath) {
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

// Frame capture function with dynamic frame count based on duration
async function captureFrames(duration, fps = frameRate) {
    const numFrames = Math.ceil(duration * fps);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        
        let url = 'http://localhost:3000';
        const queryParams = [];
        
        if (hair) queryParams.push(`hair=${encodeURIComponent(ModelHair)}`);
        if (shirt) queryParams.push(`shirt=${encodeURIComponent(ModelShirt)}`);
        if (face) queryParams.push(`face=${encodeURIComponent(ModelFace)}`);
        
        if (queryParams.length > 0) {
            url += `?${queryParams.join('&')}`;
        }
        
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
            const fileName = `frames/frame-${String(i).padStart(4, '0')}.png`;
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

// Create silent video from frames
function createSilentVideo(outputFileName, duration, fps = frameRate) {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(__dirname, 'output', outputFileName);
        ffmpeg()
            .input('frames/frame-%04d.png')
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

// Function to clean up frames directory
async function cleanupFrames() {
    try {
        const files = await fs.readdir('frames');
        await Promise.all(files.map(file => 
            fs.unlink(path.join('frames', file))
        ));
        console.log('Frames cleanup complete');
    } catch (error) {
        console.error('Error cleaning up frames:', error);
    }
}

// Merge video with audio
const mergeVideoWithAudio = async (videoPath, audioPath, outputFileName) => {
    return new Promise((resolve, reject) => {
        const outputPath = path.join(__dirname, 'output', outputFileName);
        
        // Use FFmpeg with specific audio codec and mapping
        const command = ffmpeg()
            .input(videoPath)
            .input(audioPath)
            // Map both video and audio streams
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
};

// Routes
app.get('/capture', async (req, res) => {
    try {
        await setupDirectories();
        console.log('Starting frame capture...');
        await captureFrames(1000,30);
        res.send('Frames captured successfully!');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(`Error capturing frames: ${error.message}`);
    }
});

// New API endpoint for creating video
app.get('/create-video', async (req, res) => {
    try {
        const outputFileName = `animation_${Date.now()}.mp4`;
        const fps = parseInt(req.query.fps) || frameRate;
        
        console.log('Creating video...');
        const videoPath = await createSilentVideo(outputFileName,10000, fps);
        
        // Clean up frames after video creation
        await cleanupFrames();
        
        // Send video file URL in response
        const videoUrl = `/output/${outputFileName}`;
        res.json({
            success: true,
            message: 'Video created successfully',
            videoUrl: videoUrl
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: `Error creating video: ${error.message}`
        });
    }
});

const verifyAudioStream = async (videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) {
                reject(err);
                return;
            }
            
            const audioStreams = metadata.streams.filter(stream => 
                stream.codec_type === 'audio'
            );
            
            console.log('Audio streams found:', audioStreams.length);
            resolve(audioStreams.length > 0);
        });
    });
};

// Add API endpoint for creating video with audio
app.post('/create-video-with-audio', express.json(), async (req, res) => {
    try {
        // Make sure audio file exists
        const { hair, shirt, face } = req.query;
        ModelFace = face
        ModelShirt = shirt
        ModelHair = hair
        
        const audioPath = path.join(__dirname, req.body.audioFile);
        console.log("audio",req.body.audioFile)
        if (!fsSync.existsSync(audioPath)) {
            throw new Error('Audio file not found');
        }

        await setupDirectories();
        
        // Get audio duration
        const duration = await getAudioDuration(audioPath);
        console.log(`Audio duration: ${duration} seconds`);
        
        // Capture frames based on audio duration
        await captureFrames(duration, frameRate);
        
        // Create silent video
        const tempVideoName = `temp_${Date.now()}.mp4`;
        const videoPath = await createSilentVideo(tempVideoName, duration, frameRate);
        
        // Merge video with audio
        const finalVideoName = `final_${Date.now()}.mp4`;
        const finalPath = await mergeVideoWithAudio(videoPath, audioPath, finalVideoName);
        const hasAudio = await verifyAudioStream(finalPath);
        // console.log('Output video has audio:', hasAudio);

        // Clean up temporary files
        await fs.unlink(videoPath);
        await cleanupFrames();
        
        // Send final video URL
        const videoUrl = `/output/${finalVideoName}`;
        res.json({
            success: true,
            message: 'Video created successfully with audio',
            videoUrl: videoUrl,
            duration: duration
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            message: `Error creating video: ${error.message}`
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Capture frames at http://localhost:${port}/capture`);
    console.log(`Create video at http://localhost:${port}/create-video`);
    console.log(`Capture and create video at http://localhost:${port}/create-video-with-audio`);
});