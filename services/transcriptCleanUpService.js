/**
 * Cleans text by removing specified characters
 * @param {string} text - The input text to clean
 * @param {Object} options - Configuration options
 * @param {string|Array<string>} [options.charactersToRemove=['*']] - Characters to remove from text
 * @param {boolean} [options.trimWhitespace=true] - Whether to trim whitespace from the result
 * @returns {Promise<string>} - The cleaned text
 */
async function cleanText(text, options = {}) {
  // Default options
  const defaultOptions = {
    charactersToRemove: ['*'],
    trimWhitespace: true
  };

  // Merge provided options with defaults
  const config = { ...defaultOptions, ...options };
  
  // Convert charactersToRemove to array if it's a string
  if (typeof config.charactersToRemove === 'string') {
    config.charactersToRemove = [...config.charactersToRemove];
  }
  
  // Create a regular expression to match any of the characters to remove
  // We need to escape special regex characters to avoid errors
  const escapedChars = config.charactersToRemove.map(char => 
    char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const regex = new RegExp(`[${escapedChars.join('')}]`, 'g');
  
  try {
    // Clean the text by replacing matched characters with empty string
    let cleanedText = text.replace(regex, '');
    
    // Trim whitespace if configured
    if (config.trimWhitespace) {
      cleanedText = cleanedText.trim();
    }
    
    return cleanedText;
  } catch (error) {
    throw new Error(`Failed to clean text: ${error.message}`);
  }
}

// Example usage:
// Basic usage with default settings (removes asterisks)
// cleanText("Hello *world*!").then(result => console.log(result));
// Output: "Hello world!"

// Custom characters to remove
// cleanText("Hello #world# @example@", { charactersToRemove: ['#', '@'] }).then(result => console.log(result));
// Output: "Hello world example"

// Multiple types of characters as an array
// cleanText("**Bold** and _italic_", { charactersToRemove: ['*', '_'] }).then(result => console.log(result));
// Output: "Bold and italic"

// Keep whitespace (don't trim)
// cleanText("  spaces  ", { trimWhitespace: false }).then(result => console.log(result));
// Output: "  spaces  "

module.exports = cleanText;