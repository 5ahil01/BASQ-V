import React from 'react';
import PropTypes from 'prop-types';

/**
 * ErrorBox Component
 * Purpose: Handle errors honestly with clear, friendly messaging
 */
const ErrorBox = ({ error, onClose }) => {
  // If no error, don't render
  if (!error) return null;

  // Extract error message, handle different error types
  const getErrorMessage = () => {
    if (typeof error === 'string') {
      return error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  };

  // Create friendly error message
  const friendlyMessage = getErrorMessage()
    .replace(/Error:/gi, '') // Remove "Error:" prefix
    .replace(/stack trace/gi, '') // Remove stack trace mentions
    .trim();

  return (
    <div className="error-box">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <div className="error-message">
          <strong>Oops! Something went wrong.</strong>
          <p>{friendlyMessage}</p>
        </div>
        <button
          className="error-close"
          onClick={onClose}
          aria-label="Close error message"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// PropTypes for type checking
ErrorBox.propTypes = {
  error: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      message: PropTypes.string
    })
  ]),
  onClose: PropTypes.func.isRequired
};

// Default props
ErrorBox.defaultProps = {
  error: null
};

export default ErrorBox;
