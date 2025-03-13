const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Combines multiple MP4 video animations to match a specific duration
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.videoFiles - Array of paths to MP4 video files to combine
 * @param {string} options.outputFile - Path for the generated output video
 * @param {number} options.duration - Duration of the output video in seconds
 * @param {boolean} [options.loop=true] - Whether to loop videos if specified duration is longer than total video duration
 * @param {number} [options.fadeTransition=0.5] - Duration of fade transition between videos in seconds
 * @returns {Promise<string>} - Path to the output file
 */
async function combineAnimations(options) {
  const {
    videoFiles,
    outputFile,
    duration,
    loop = true,
    fadeTransition = 0.5,
    rootDir = process.cwd() // Default to current working directory
  } = options;
  
  // Helper function to resolve paths relative to root directory
  const resolvePath = (filePath) => {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(rootDir, filePath);
  };

  if (!videoFiles || !Array.isArray(videoFiles) || videoFiles.length === 0) {
    throw new Error('videoFiles must be a non-empty array of file paths');
  }

  if (!outputFile) {
    throw new Error('outputFile is required');
  }

  if (duration === undefined || isNaN(duration) || duration <= 0) {
    throw new Error('duration must be a positive number');
  }
  
  // Ensure output directory exists
  const outputDir = path.dirname(resolvePath(outputFile));
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Resolve all paths relative to root directory
  const resolvedVideoFiles = videoFiles.map(resolvePath);
  const resolvedOutputFile = resolvePath(outputFile);
  
  // Create temp directory for intermediate files
  const tempDir = path.join(path.dirname(resolvedOutputFile), 'temp_combine_' + Date.now());
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    console.log(`Target duration: ${duration} seconds`);

    // Get info about each video
    const videoInfo = await Promise.all(
      resolvedVideoFiles.map(async (file, index) => {
        // Check if file exists before processing
        if (!fs.existsSync(file)) {
          throw new Error(`Video file not found: ${file}`);
        }
        
        const { stdout: durationOutput } = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`
        );
        const videoDuration = parseFloat(durationOutput.trim());

        return {
          file,
          duration: videoDuration,
          index
        };
      })
    );

    // Calculate total video duration
    let totalVideoDuration = videoInfo.reduce((acc, info) => acc + info.duration, 0);
    let iterations = 1;

    if (loop && totalVideoDuration < duration) {
      // Calculate how many iterations we need to cover the target duration
      iterations = Math.ceil(duration / totalVideoDuration);
      console.log(`Looping videos ${iterations} times to match target duration`);
    }

    // Prepare each video segment (with potential fade transitions)
    const processedFiles = [];
    
    for (let iteration = 0; iteration < iterations; iteration++) {
      for (let i = 0; i < videoInfo.length; i++) {
        const { file, duration: videoDuration } = videoInfo[i];
        const segmentOutput = path.join(tempDir, `segment_${iteration}_${i}.mp4`);
        
        // Trim the last video if needed to match target duration
        let actualDuration = videoDuration;
        const currentTimestamp = iteration * totalVideoDuration + 
            videoInfo.slice(0, i).reduce((acc, info) => acc + info.duration, 0);
        
        // If we'd exceed the target duration with this clip, trim it
        if (!loop && currentTimestamp + videoDuration > duration) {
          actualDuration = Math.max(0, duration - currentTimestamp);
          
          if (actualDuration <= 0) {
            // We've reached our target duration, no need to process this file
            break;
          }
          
          // Trim the video to match the remaining duration
          await execAsync(
            `ffmpeg -i "${file}" -t ${actualDuration} -c copy "${segmentOutput}"`
          );
        } else if (i < videoInfo.length - 1 && fadeTransition > 0) {
          // Add fade out transition except for the last video
          const fadeDuration = Math.min(fadeTransition, videoDuration / 3);
          const fadeStart = videoDuration - fadeDuration;
          
          await execAsync(
            `ffmpeg -i "${file}" -vf "fade=t=out:st=${fadeStart}:d=${fadeDuration}" -c:a copy "${segmentOutput}"`
          );
        } else {
          // Just copy the file without modification
          await execAsync(`ffmpeg -i "${file}" -c copy "${segmentOutput}"`);
        }
        
        processedFiles.push(segmentOutput);
        
        // If we've reached our target duration, exit the loop
        if (currentTimestamp + actualDuration >= duration && !loop) {
          break;
        }
      }
      
      // If we've reached our target duration, exit the loop
      if (processedFiles.length > 0 && !loop) {
        const lastFileInfo = await execAsync(
          `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${processedFiles[processedFiles.length - 1]}"`
        );
        const lastFileDuration = parseFloat(lastFileInfo.stdout.trim());
        const totalDuration = (iteration * totalVideoDuration) + 
            videoInfo.slice(0, videoInfo.length - 1).reduce((acc, info) => acc + info.duration, 0) + 
            lastFileDuration;
            
        if (totalDuration >= duration) {
          break;
        }
      }
    }

    // Create a file list for concatenation
    const fileListPath = path.join(tempDir, 'filelist.txt');
    const fileListContent = processedFiles.map(file => `file '${file.replace(/'/g, "'\\''")}'`).join('\n');
    fs.writeFileSync(fileListPath, fileListContent);

    // Concatenate all videos
    const concatenatedOutput = path.join(tempDir, 'concatenated.mp4');
    await execAsync(`ffmpeg -f concat -safe 0 -i "${fileListPath}" -c copy "${concatenatedOutput}"`);

    // Trim the concatenated video to match target duration
    const trimmedOutput = path.join(tempDir, 'trimmed.mp4');
    await execAsync(`ffmpeg -i "${concatenatedOutput}" -t ${duration} -c copy "${trimmedOutput}"`);

    // Copy the trimmed file to the output
    fs.copyFileSync(trimmedOutput, resolvedOutputFile);

    console.log(`Successfully created combined video at: ${resolvedOutputFile}`);
    return resolvedOutputFile;
  } catch (error) {
    console.error('Error combining animations:', error);
    throw error;
  } finally {
    // Clean up temporary files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('Warning: Could not clean up temporary files:', cleanupError);
    }
  }
}

module.exports = combineAnimations;

// Example usage:

// const combineAnimations = require('./combineAnimations');
// const path = require('path');

// async function run() {
//   try {
//     // Define the root directory (one level up from where this script is running)
//     const rootDir = path.resolve(__dirname, '../');
    
//     const result = await combineAnimations({
//         videoFiles: [
//             'public/animations/happyHAIRBLACKSHIRTBLACK.mp4',
//             'public/animations/neutralHAIRBLACKSHIRTBLACK.mp4',
//             ],
//       outputFile: 'public/output/final_animation.mp4',
//       duration: 60, // 60 seconds output video
//       loop: true,
//       fadeTransition: 0.5,
//       rootDir: rootDir // Pass the root directory
//     });
    
//     console.log('Animation created successfully:', result);
//   } catch (error) {
//     console.error('Failed to create animation:', error);
//   }
// }

// run();
