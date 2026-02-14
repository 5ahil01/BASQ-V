import React from 'react';
import PropTypes from 'prop-types';
import ChartView from './ChartView';
import TableView from './TableView';
import ExplainabilityPanel from './ExplainabilityPanel';
import VerificationBadge from './VerificationBadge';
import ConfidenceIndicator from './ConfidenceIndicator';

/**
 * ResultsPanel Component
 * Central component to display query results - charts, table, and explainability
 * Handles both success and rejected/error states
 */
const ResultsPanel = ({ response, loading }) => {
  // If no response and not loading, don't render
  if (!response && !loading) {
    return null;
  }

  // If loading, show loading state
  if (loading) {
    return (
      <div className="results-panel results-loading">
        <p>Loading results...</p>
      </div>
    );
  }

  // Handle rejected/error state
  if (response.status === 'rejected' || response.status === 'error') {
    return (
      <div className="results-panel results-rejected">
        <div className="results-header">
          <h2>Query Result</h2>
        </div>
        
        {/* Show verification status for rejected queries */}
        {response.verification && (
          <div className="verification-status">
            <VerificationBadge 
              verificationStatus={response.verification.status} 
              message={response.verification.message}
            />
          </div>
        )}

        {/* Show error message */}
        {response.error && (
          <div className="error-message-box">
            <h3>Query Rejected</h3>
            <p>{response.error.message}</p>
            {response.error.code && (
              <small>Error Code: {response.error.code}</small>
            )}
          </div>
        )}

        {/* Also show explainability if available */}
        {response.explainability && (
          <ExplainabilityPanel 
            explainability={response.explainability} 
            sql={response.sql}
          />
        )}
      </div>
    );
  }

  // Handle success state
  if (response.status === 'success') {
    // Transform data for chart
    const chartData = transformDataForChart(response.data, response.chartSuggestion);

    return (
      <div className="results-panel results-success">
        <div className="results-header">
          <h2>Query Results</h2>
        </div>

        {/* Show verification and confidence */}
        <div className="results-meta">
          {response.verification && (
            <VerificationBadge 
              verificationStatus={response.verification.status}
              message={response.verification.message}
            />
          )}
          
          {response.confidence && (
            <ConfidenceIndicator 
              score={response.confidence.score}
              label={response.confidence.label}
              reasons={response.confidence.reasons}
            />
          )}
        </div>

        {/* Show chart if data exists */}
        {response.data && response.data.length > 0 && (
          <div className="results-chart">
            <ChartView 
              data={chartData} 
              chartType={response.chartSuggestion?.type || 'bar'}
            />
          </div>
        )}

        {/* Show table */}
        {response.data && response.data.length > 0 && (
          <div className="results-table">
            <TableView data={response.data} />
          </div>
        )}

        {/* Show explainability panel */}
        <div className="results-explainability">
          <ExplainabilityPanel 
            explainability={response.explainability}
            sql={response.sql}
          />
        </div>
      </div>
    );
  }

  // Default: unknown state
  return (
    <div className="results-panel results-unknown">
      <p>Unknown response status</p>
    </div>
  );
};

/**
 * Transform backend data for ChartView
 * Expected format: [{ label: string, value: number }]
 */
const transformDataForChart = (data, chartSuggestion) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  // If data is already in correct format
  if (data[0] && data[0].label !== undefined && data[0].value !== undefined) {
    return data;
  }

  // Get suggested x and y from chartSuggestion if available
  const suggestedX = chartSuggestion?.x;
  const suggestedY = chartSuggestion?.y;

  // Transform from backend format
  return data.map((row, index) => {
    const keys = Object.keys(row);
    
    // Use suggested columns if available
    const labelKey = suggestedX && row[suggestedX] !== undefined ? suggestedX : (keys[0] || `Item ${index + 1}`);
    const valueKey = suggestedY && row[suggestedY] !== undefined ? suggestedY : (keys[1] || 'value');
    
    return {
      label: String(row[labelKey] || `Item ${index + 1}`),
      value: typeof row[valueKey] === 'number' ? row[valueKey] : 0
    };
  });
};

ResultsPanel.propTypes = {
  response: PropTypes.shape({
    status: PropTypes.oneOf(['clarification_required', 'success', 'rejected', 'error']),
    sessionId: PropTypes.string,
    sql: PropTypes.string,
    data: PropTypes.array,
    chartSuggestion: PropTypes.shape({
      type: PropTypes.string,
      x: PropTypes.string,
      y: PropTypes.string
    }),
    explainability: PropTypes.shape({
      tables: PropTypes.arrayOf(PropTypes.string),
      columns: PropTypes.arrayOf(PropTypes.string),
      joins: PropTypes.arrayOf(PropTypes.string),
      filters: PropTypes.arrayOf(PropTypes.string),
      businessRulesUsed: PropTypes.arrayOf(PropTypes.string)
    }),
    verification: PropTypes.shape({
      status: PropTypes.string,
      message: PropTypes.string
    }),
    confidence: PropTypes.shape({
      score: PropTypes.number,
      label: PropTypes.string,
      reasons: PropTypes.arrayOf(PropTypes.string)
    }),
    error: PropTypes.shape({
      code: PropTypes.string,
      message: PropTypes.string
    })
  }),
  loading: PropTypes.bool
};

ResultsPanel.defaultProps = {
  response: null,
  loading: false
};

export default ResultsPanel;
