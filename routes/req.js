// API Test Script using fetch
// Save this as test-api.js and run with Node.js

const fetch = require('node-fetch'); // Use: npm install node-fetch@2 (for Node.js < 18)
// For Node.js 18+, you can use the built-in fetch API

async function testAPI() {
  // API endpoint
  const url = 'http://localhost:3001/api/create-2dvideo-with-audio';
  
  // Request data
  const requestData = {
    text: "Wow, what an audience. But if I'm being honest, I don't care what you think of my talk. I don't. I care what the Internet thinks of my talk because they're the ones who get it seen and get it shared. And I think that's where most people get it wrong. They're talking to you here instead of talking to you. Random person scrolling Facebook thanks for the click. You see, back in 2009 we all had these weird little things called attention spans. Yeah, they're gone. They're gone. We killed them. They're dead. I'm trying to think of the last time I watched an 18 minute TED talk. It's been years. Literally years. So if you're giving a TED Talk, keep it quick. I'm doing mine in under a minute."
  };
  
  // Query parameters
  const queryParams = new URLSearchParams({
    hair: "BLACK",
    shirt: "BLACK"
  });
  
  // Full URL with query parameters
  const fullUrl = `${url}?${queryParams}`;
  
  // Request options
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestData)
  };
  
  console.log(`Sending request to: ${fullUrl}`);
  console.log('Request body:', JSON.stringify(requestData, null, 2));

  try {
    const response = await fetch(fullUrl, options);
    
    // Log response status
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Parse JSON response
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    return data;
  } catch (error) {
    console.error('Error details:', error);
    throw error;
  }
}

// Execute the test
testAPI()
  .then(result => console.log('API test completed successfully'))
  .catch(error => console.error('API test failed:', error.message));