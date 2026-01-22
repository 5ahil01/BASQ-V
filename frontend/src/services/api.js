/**
 * API Service
 * Single place to talk to backend
 */

// Base URL for backend API
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Generic POST request function with error handling
 * @param {string} endpoint - API endpoint (relative to BASE_URL)
 * @param {object} data - Data to send in request body
 * @returns {Promise<object>} - Response data
 * @throws {Error} - Throws error with meaningful message
 */
const postRequest = async (endpoint, data = {}) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || 
        errorData.error || 
        `HTTP error! status: ${response.status}`
      );
    }

    // Parse and return response data
    const responseData = await response.json();
    return responseData;

  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to the server');
    }
    
    // Re-throw other errors with context
    throw new Error(`API Error: ${error.message}`);
  }
};

/**
 * Send a query to the backend
 * @param {string} queryText - The query text to send
 * @returns {Promise<object>} - Query response from backend
 */
export const sendQuery = async (queryText) => {
  if (!queryText || queryText.trim() === '') {
    throw new Error('Query text cannot be empty');
  }

  try {
    const response = await postRequest('/query', {
      query: queryText,
    });
    
    return response;
  } catch (error) {
    console.error('Error sending query:', error);
    throw error;
  }
};

// Export base URL for reference if needed
export { BASE_URL };
