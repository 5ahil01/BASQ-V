import React, { useState } from "react";

/**
 * QueryInput Component
 * Purpose: Accept user input safely with validation
 *
 * Props:
 * - onSubmit(query): Function to call when user submits query
 * - loading: Boolean to disable input while processing
 */
const QueryInput = ({ onSubmit, loading, disabled = false }) => {
  const [inputText, setInputText] = useState("");
  const [validationError, setValidationError] = useState("");

  /**
   * Handle input change
   * Clears validation error when user starts typing
   */
  const handleInputChange = (e) => {
    setInputText(e.target.value);
    if (validationError) {
      setValidationError("");
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
      setValidationError("Please enter a query");
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="flex gap-5 items-stretch justify-center flex-wrap w-full max-w-[800px] mx-auto xl:mx-[180px] flex-col md:flex-row"
      >
        <div className="relative w-full flex flex-col">
          {/* Text Area Input */}
          <textarea
            className={`w-full min-h-[80px] py-4 pr-20 pl-6 text-[1.05rem] leading-relaxed bg-slate-900/90 border-2 border-blue-400/25 rounded-[18px] text-slate-100 outline-none transition-all duration-300 shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_4px_20px_rgba(0,0,0,0.1)] resize-none placeholder-slate-500 hover:border-blue-400/50 hover:bg-slate-900/95 focus:border-blue-400 focus:bg-slate-900 focus:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3),0_0_0_4px_rgba(96,165,250,0.15),0_8px_30px_rgba(96,165,250,0.15)] focus:-translate-y-0.5 ${validationError ? "border-red-500/50 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.15),0_4px_20px_rgba(239,68,68,0.1)]" : ""}`}
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
            className="absolute right-3 bottom-3 py-2.5 px-5 text-sm font-bold bg-gradient-to-br from-blue-400 to-purple-400 border-none rounded-xl text-white cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(96,165,250,0.3)] uppercase tracking-wide flex items-center gap-2 disabled:bg-slate-600/50 disabled:shadow-none disabled:cursor-not-allowed disabled:text-white/50 disabled:transform-none hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_25px_rgba(96,165,250,0.4)] hover:not-disabled:bg-gradient-to-br hover:not-disabled:from-blue-500 hover:not-disabled:to-purple-500 active:not-disabled:translate-y-0"
            disabled={loading || !inputText.trim() || disabled}
            aria-label="Submit query"
            title="Send Query"
          >
            {loading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 rounded-full border-t-white animate-spin"></span>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transform: "translateX(-1px) translateY(1px)" }}
              >
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div
            id="query-error"
            className="text-red-300 text-sm mt-2 pl-3 animate-[fadeIn_0.3s_ease-in]"
            role="alert"
          >
            {validationError}
          </div>
        )}
      </form>
    </div>
  );
};

export default QueryInput;
