import React, { useState } from 'react';

/**
 * QueryInput Component
 * Purpose: Accept user input safely with validation
 * 
 * Props:
 * - onSubmit(query): Function to call when user submits query
 * - loading: Boolean to disable input while processing
 */
const QueryInput = ({ onSubmit, loading }) => {
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
   * Handle Enter key press for quick submission
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div className="query-input-container">
      <form onSubmit={handleSubmit} className="query-form">
        <div className="input-wrapper">
          {/* Text Input */}
          <input
            type="text"
            className={`query-input ${validationError ? 'error' : ''}`}
            placeholder="Enter your query here..."
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={loading}
            aria-label="Query input"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? "query-error" : undefined}
          />
          
          {/* Submit Button */}
          <button
            type="submit"
            className="submit-button"
            disabled={loading || !inputText.trim()}
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
