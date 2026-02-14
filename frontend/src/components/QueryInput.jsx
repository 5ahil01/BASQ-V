import React, { useState } from 'react';

/**
 * QueryInput Component
 * Purpose: Accept user input safely with validation
 * 
 * Props:
 * - onSubmit(query): Function to call when user submits query
 * - loading: Boolean to disable input while processing
 */
const QueryInput = ({ onSubmit, loading, disabled = false }) => {
  const [inputText, setInputText] = useState('');
  const [validationError, setValidationError] = useState('');

  /**
   * Handle input change
   * Clears validation error when user starts typing
   */
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (validationError) {
      setValidationError('');
    }
  };

  /**
   * Handle form submission
   * Flow: User types text → Clicks submit → Validates → Calls onSubmit(query)
   */
  const handleSubmit = (e) => {
    e.preventDefault();

    // Basic validation: Check for empty input
    const trimmedInput = inputText.trim();
    
    if (!trimmedInput) {
      setValidationError('Please enter a query');
      return;
    }

    // Validation passed - call parent's onSubmit handler
    onSubmit(trimmedInput);
    
    // Optional: Clear input after successful submission
    // setInputText('');
  };

  /**
   * Handle key down for quick submission
   * Note: Shift+Enter should allow new lines in textarea
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="query-input-container">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-wrapper">
          {/* Text Area Input */}
          <textarea
            className={`query-textarea ${validationError ? 'error' : ''}`}
            placeholder="Enter your query here... (Shift+Enter for new line)"
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading || disabled}
            aria-label="Query input"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? "query-error" : undefined}
            rows={3}
          />
          
          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={loading || !inputText.trim() || disabled}
            aria-label="Submit query"
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Processing...
              </>
            ) : (
              'Submit'
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div id="query-error" className="validation-error" role="alert">
            {validationError}
          </div>
        )}
      </form>
    </div>
  );
};

export default QueryInput;
