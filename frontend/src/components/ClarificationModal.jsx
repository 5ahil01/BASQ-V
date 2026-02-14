import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * ClarificationModal Component
 * Handles clarification questions from backend when ambiguous queries are detected
 * Shows as a modal that blocks background until answered
 */
const ClarificationModal = ({ 
  isOpen, 
  sessionId, 
  clarificationQuestion, 
  options, 
  onSubmit, 
  onCancel,
  loading 
}) => {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  // Don't render if not open
  if (!isOpen) return null;

  // Handle input change
  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
    if (error) {
      setError('');
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    setAnswer(option);
    if (error) {
      setError('');
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate answer
    if (!answer || !answer.trim()) {
      setError('Please provide an answer to continue');
      return;
    }

    // Submit the clarification answer with sessionId
    onSubmit(answer.trim(), sessionId);
  };

  // Handle cancel
  const handleCancel = () => {
    setAnswer('');
    setError('');
    onCancel();
  };

  return (
    <div className="clarification-modal-overlay">
      <div className="clarification-modal">
        <div className="clarification-modal-header">
          <div className="clarification-icon">🔍</div>
          <h2>Clarification Needed</h2>
          <p className="clarification-subtitle">
            Your query requires additional information to provide accurate results.
          </p>
        </div>

        <div className="clarification-modal-body">
          <div className="clarification-question-box">
            <label htmlFor="clarification-input">Question:</label>
            <p className="clarification-question-text">
              {clarificationQuestion || 'Please provide more details about your query.'}
            </p>
          </div>

          {/* If options exist, show as buttons/select; otherwise show text input */}
          {options && options.length > 0 ? (
            <div className="clarification-options">
              <label>Select an option:</label>
              <div className="options-grid">
                {options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`option-button ${answer === option ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(option)}
                    disabled={loading}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="clarification-input-wrapper">
              <label htmlFor="clarification-input">Your Answer:</label>
              <input
                id="clarification-input"
                type="text"
                value={answer}
                onChange={handleAnswerChange}
                placeholder="Type your answer here..."
                disabled={loading}
                autoFocus
                className={error ? 'error' : ''}
              />
            </div>
          )}

          {error && (
            <div className="clarification-error" role="alert">
              {error}
            </div>
          )}
        </div>

        <div className="clarification-modal-footer">
          <button
            type="button"
            className="clarification-cancel-btn"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="clarification-submit-btn"
            onClick={handleSubmit}
            disabled={loading || !answer.trim()}
          >
            {loading ? (
              <>
                <span className="loading-spinner-small"></span>
                Processing...
              </>
            ) : (
              'Submit Answer'
            )}
          </button>
        </div>

        <div className="clarification-notice">
          <small>
            Providing accurate clarification helps generate more precise business intelligence results.
          </small>
        </div>
      </div>
    </div>
  );
};

ClarificationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  sessionId: PropTypes.string,
  clarificationQuestion: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.string),
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  loading: PropTypes.bool
};

ClarificationModal.defaultProps = {
  sessionId: '',
  clarificationQuestion: '',
  options: [],
  loading: false
};

export default ClarificationModal;
