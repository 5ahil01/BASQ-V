/**
 * Response Mapper
 * Normalizes backend responses to frontend expected format
 */

// Map backend status to frontend status
export const mapStatus = (backendStatus) => {
  const statusMap = {
    clarification_required: "clarification_required",
    success: "success",
    rejected: "rejected",
    error: "error",
  };
  return statusMap[backendStatus] || "error";
};

/**
 * Normalize clarification response from backend
 * Backend format: { status, sessionId, clarification_question, options }
 * Frontend expected: { status, sessionId, question, options }
 */
export const normalizeClarification = (response) => {
  if (!response) return null;

  // Transform backend format to frontend format
  return {
    status: mapStatus(response.status),
    sessionId: response.sessionId,
    question: response.clarification_question || response.question || "",
    options: response.options || [],
    // For the ClarificationModal, we need to create a questions array
    questions: response.clarification_question
      ? [
          {
            id: "clarification_1",
            text: response.clarification_question,
            type:
              response.options && response.options.length > 0
                ? "select"
                : "text",
            options: response.options || null,
            required: true,
          },
        ]
      : [],
  };
};

/**
 * Normalize success response from backend
 * Backend format: { status, sessionId, sql, data, chart_suggestion, explainability, verification, confidence }
 */
export const normalizeSuccess = (response) => {
  if (!response) return null;

  return {
    status: mapStatus(response.status),
    sessionId: response.sessionId,
    sql: response.sql || response.sql_query || "",
    data: response.data || response.result || [],
    chartSuggestion: response.chart_suggestion || {
      type: "bar",
      x: null,
      y: null,
    },
    explainability: {
      tables: response.explainability?.tables || [],
      columns: response.explainability?.columns || [],
      joins: response.explainability?.joins || [],
      filters: response.explainability?.filters || [],
      businessRulesUsed: response.explainability?.business_rules_used || [],
    },
    verification: {
      status: response.verification?.status || "unknown",
      message: response.verification?.message || "",
    },
    confidence: {
      score:
        response.confidence?.score ??
        response.confidence ??
        response.sql_confidence ??
        null,
      label:
        response.confidence?.label ||
        getConfidenceLabel(
          response.confidence?.score ?? response.sql_confidence,
        ),
      reasons:
        response.confidence?.reasons ||
        (response.recommendation
          ? [`Recommendation: ${response.recommendation}`]
          : []),
    },
  };
};

/**
 * Normalize error/rejected response from backend
 * Backend format: { status, sessionId, verification, error }
 */
export const normalizeError = (response) => {
  if (!response) return null;

  return {
    status: mapStatus(response.status),
    sessionId: response.sessionId,
    verification: {
      status: response.verification?.status || "rejected",
      message: response.verification?.message || "",
    },
    error: {
      code: response.error?.code || "UNKNOWN_ERROR",
      message:
        response.error?.message ||
        response.message ||
        "An unknown error occurred",
    },
  };
};

/**
 * Main function to normalize any backend response
 * Returns the appropriate normalized response based on status
 */
export const normalizeResponse = (response) => {
  if (!response) return null;

  const status = response.status;

  switch (status) {
    case "clarification_required":
      return normalizeClarification(response);
    case "success":
      return normalizeSuccess(response);
    case "rejected":
    case "error":
      return normalizeError(response);
    default:
      // Unknown status - treat as error
      return normalizeError({
        ...response,
        status: "error",
        error: {
          code: "UNKNOWN_STATUS",
          message: `Unknown response status: ${status}`,
        },
      });
  }
};

/**
 * Helper to get confidence label from score
 */
const getConfidenceLabel = (score) => {
  if (score === null || score === undefined) return "unknown";
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
};

/**
 * Transform backend data for ChartView
 * Expected format: [{ label: string, value: number }]
 */
export const transformDataForChart = (data, chartSuggestion) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  // If data is already in correct format
  if (data[0] && data[0].label !== undefined && data[0].value !== undefined) {
    return data;
  }

  // Transform from backend format
  return data.map((row, index) => {
    const keys = Object.keys(row);
    if (keys.length >= 2) {
      return {
        label: String(row[keys[0]] || `Item ${index + 1}`),
        value: typeof row[keys[1]] === "number" ? row[keys[1]] : 0,
      };
    }
    return {
      label: `Item ${index + 1}`,
      value: 0,
    };
  });
};
