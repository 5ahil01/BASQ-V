/**
 * API Service
 * Single place to talk to backend
 */

// Base URL for backend API
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Send a query to the backend
 * @param {string} queryText - The query text to send
 * @param {string} sessionId - Optional session ID for continuing a conversation
 * @returns {Promise<object>} - Query response from backend
 */

export const dummyQueryResponse = {
  query: "Show me total sales by region",
  sql_query:
    "SELECT region, sum(sales_amount) as total_sales \nFROM sales \nGROUP BY region;",
  result: [
    {
      region: "North America",
      total_sales: 15400,
    },
    {
      region: "Europe",
      total_sales: 12200,
    },
    {
      region: "Asia",
      total_sales: 9800,
    },
    {
      region: "South America",
      total_sales: 4500,
    },
  ],
  sql_confidence: 0.95,
  retrieval_confidence: 0.88,
  status: "success",
  correction_attempts: 0,
  total_time_ms: 150,
  self_reflection_log: [
    "SQL syntax validated successfully",
    "Query structure matches the requested tables",
    "No schema hallucinations detected",
  ],
  recommendation: "CORRECT",
};

export const sendQuery = async (queryText, sessionId = null) => {
  if (!queryText || queryText.trim() === "") {
    throw new Error("Query text cannot be empty");
  }

  const requestData = {
    query: queryText,
  };

  // Add sessionId if provided
  if (sessionId) {
    requestData.sessionId = sessionId;
  }

  try {
    const response = await fetch(`${BASE_URL}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          errorData.error ||
          `HTTP error! status: ${response.status}`,
      );
    }

    // Parse and return response data
    const responseData = await response.json();
    console.log(responseData);

    return responseData;
  } catch (error) {
    // Network errors or fetch failures
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Unable to connect to the server");
    }

    throw new Error(`API Error: ${error.message}`);
  }
};

/**
 * Send a clarification answer to the backend
 * @param {string} answer - The user's answer to the clarification question
 * @param {string} sessionId - The session ID from the clarification request
 * @returns {Promise<object>} - Query response from backend after clarification
 */
export const sendClarification = async (answer, sessionId) => {
  if (!answer || answer.trim() === "") {
    throw new Error("Answer cannot be empty");
  }

  if (!sessionId) {
    throw new Error("Session ID is required for clarification");
  }

  try {
    const response = await fetch(`${BASE_URL}/clarification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        answer: answer.trim(),
        sessionId: sessionId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message ||
          errorData.error ||
          `HTTP error! status: ${response.status}`,
      );
    }

    const responseData = await response.json();
    console.log(responseData);

    return responseData;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new Error("Network error: Unable to connect to the server");
    }

    throw new Error(`API Error: ${error.message}`);
  }
};

// Export base URL for reference if needed
export { BASE_URL };
