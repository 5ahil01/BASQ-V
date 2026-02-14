import React from 'react';
import PropTypes from 'prop-types';

/**
 * ConfidenceIndicator Component
 * Shows confidence score, label, and reasons
 * Shows warning for low confidence
 */
const ConfidenceIndicator = ({ score, label, reasons }) => {
  // If no confidence data, don't render
  if (score === null && !label) {
    return null;
  }

  // Determine color based on label
  const getColor = () => {
    switch (label?.toLowerCase()) {
      case 'high':
        return '#34d399'; // green
      case 'medium':
        return '#fbbf24'; // yellow/amber
      case 'low':
        return '#f87171'; // red
      default:
        return '#94a3b8'; // gray
    }
  };

  // Format score as percentage
  const getPercentage = () => {
    if (score === null || score === undefined) return null;
    return Math.round(score * 100);
  };

  // Check if low confidence (show warning)
  const isLowConfidence = label?.toLowerCase() === 'low' || (score !== null && score < 0.5);

  const color = getColor();
  const percentage = getPercentage();

  return (
    <div className="confidence-indicator">
      <div className="confidence-header">
        <span className="confidence-label">Confidence:</span>
        <span 
          className="confidence-badge"
          style={{ 
            backgroundColor: `${color}20`, 
            borderColor: color,
            color: color 
          }}
        >
          {label || 'Unknown'}
          {percentage !== null && ` (${percentage}%)`}
        </span>
      </div>

      {/* Show reasons if available */}
      {reasons && reasons.length > 0 && (
        <div className="confidence-reasons">
          <small>Reasons:</small>
          <ul>
            {reasons.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Show warning for low confidence */}
      {isLowConfidence && (
        <div className="confidence-warning">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">
            Low confidence - results may not be accurate. Consider rephrasing your query.
          </span>
        </div>
      )}

      {/* Visual progress bar */}
      {score !== null && (
        <div className="confidence-bar-container">
          <div 
            className="confidence-bar"
            style={{ 
              width: `${percentage}%`,
              backgroundColor: color
            }}
          />
        </div>
      )}
    </div>
  );
};

ConfidenceIndicator.propTypes = {
  score: PropTypes.number,
  label: PropTypes.string,
  reasons: PropTypes.arrayOf(PropTypes.string)
};

ConfidenceIndicator.defaultProps = {
  score: null,
  label: '',
  reasons: []
};

export default ConfidenceIndicator;
