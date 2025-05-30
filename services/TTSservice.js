const path = require("path");
require("dotenv").config();
const fs = require("fs");

const API_KEY = "sk_fe24a18baf02663523562cf5e5643fb78fe5813c2c0f5b72";
const VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

async function textToSpeech(text) {
    try {
        // Use the text parameter that was passed, not the TEXT constant
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": API_KEY
            },
            body: JSON.stringify({
                text: text, // Use the parameter, not the constant
                model_id: "eleven_monolingual_v1",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();
        const audioFileName = `audio_${Date.now()}.mp3`;
        const audioPath = path.join(process.cwd(), 'output', audioFileName);
        
        // Ensure directory exists
        if (!fs.existsSync(path.dirname(audioPath))) {
            fs.mkdirSync(path.dirname(audioPath), { recursive: true });
        }
        
        fs.writeFileSync(audioPath, Buffer.from(audioBuffer));
                
        console.log(`Generated audio saved at: ${audioPath}`);
        return audioPath;
    } catch (error) {
        console.error("Error in textToSpeech:", error.message);
        throw error; // Re-throw the error to be handled by the caller
    }
}

module.exports = {
    textToSpeech
};