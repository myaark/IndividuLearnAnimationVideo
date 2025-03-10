// utils/helpers.js

/**
 * Creates a delay using Promise
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} - Promise that resolves after the delay
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Builds a URL with query parameters
 * @param {string} baseUrl - Base URL
 * @param {Object} params - Query parameters object
 * @returns {string} - URL with encoded query parameters
 */
const buildUrl = (baseUrl, params = {}) => {
  const queryParams = [];
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.push(`${key}=${encodeURIComponent(value)}`);
  });
  
  if (queryParams.length > 0) {
    return `${baseUrl}?${queryParams.join('&')}`;
  }
  
  return baseUrl;
};

module.exports = {
  delay,
  buildUrl
};