const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs').promises;

async function trimAudio(inputPath, outputPath, duration = 5) {
    // Validate input file exists
    try {
        await fs.access(inputPath);
    } catch (error) {
        throw new Error(`Input file not found: ${inputPath}`);
    }

    // Create output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    try {
        await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
        console.warn(`Directory creation failed: ${error.message}`);
    }

    return new Promise((resolve, reject) => {
        const ffmpegProcess = spawn(ffmpeg, [
            '-i', inputPath,           // Input file
            '-t', duration.toString(), // Duration in seconds
            '-acodec', 'copy',         // Copy audio codec (faster than re-encoding)
            '-y',                      // Overwrite output file if exists
            outputPath                 // Output file
        ]);

        // Handle process events
        ffmpegProcess.stderr.on('data', (data) => {
            console.log(`ffmpeg: ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            if (code === 0) {
                resolve(`Successfully trimmed audio to ${duration} seconds`);
            } else {
                reject(new Error(`FFmpeg process exited with code ${code}`));
            }
        });

        ffmpegProcess.on('error', (err) => {
            reject(new Error(`Failed to start FFmpeg process: ${err.message}`));
        });
    });
}

// Example usage
async function main() {
    const inputFile = 'public/audio/audio.mp3';
    const outputFile = './trimmed.mp3';
    
    try {
        const result = await trimAudio(inputFile, outputFile);
        console.log(result);
    } catch (error) {
        console.error('Error trimming audio:', error.message);
    }
}

main();