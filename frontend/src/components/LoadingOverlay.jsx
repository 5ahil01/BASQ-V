import React from 'react';
import PropTypes from 'prop-types';

/**
 * LoadingOverlay Component
 * Full-screen loading overlay shown during API calls
 */
const LoadingOverlay = ({ isLoading, message }) => {
  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        <div className="loading-spinner-large"></div>
        <p className="loading-message">
          {message || 'Processing your query...'}
        </p>
        <small className="loading-submessage">
          This may take a few moments
        </small>
      </div>
    </div>
  );
};

LoadingOverlay.propTypes = {
  isLoading: PropTypes.bool,
  message: PropTypes.string
};

LoadingOverlay.defaultProps = {
  isLoading: false,
  message: ''
};

export default LoadingOverlay;
