/**
 * @param {string} inputText - The text to analyze for emotions
 * @returns {Promise<{rawResponse: Array, emotionsArray: Array<string>}>} - The API response and processed emotions
 */
async function sendTextForPrediction(inputText) {
  // Split the text by periods (.) and trim each sentence
  const sentences = inputText
    .split(".")
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0); // Remove empty strings

  // Create the request payload matching the format in the image
  const payload = {
    texts: sentences,
  };

  // Log the payload for verification
  console.log("Sending payload:", JSON.stringify(payload, null, 2));

  try {
    // Make the POST request to the API
    const response = await fetch("http://localhost:5050/predict-batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Parse the response
    const result = await response.json();
    console.log("Response:", result);

    // Process the results to create an array of emotions
    const emotionsArray = processEmotionsResponse(result);
    console.log("Processed emotions array:", emotionsArray);

    return {
      rawResponse: result,
      emotionsArray: emotionsArray,
    };
  } catch (error) {
    console.error("Error calling the prediction API:", error);
    throw error;
  }
}

function processEmotionsResponse(apiResponse) {
  return apiResponse.map((item) => {
    // If no dominant emotions, use 'neutral' as default
    return item.dominant_emotions && item.dominant_emotions.length > 0
      ? item.dominant_emotions[0] // Take the first emotion if multiple exist
      : "neutral";
  });
}

module.exports = { sendTextForPrediction, processEmotionsResponse };