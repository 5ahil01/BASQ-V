import React, { useState } from "react";
import PropTypes from "prop-types";

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
  loading,
}) => {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  // Don't render if not open
  if (!isOpen) return null;

  // Handle input change
  const handleAnswerChange = (e) => {
    setAnswer(e.target.value);
    if (error) {
      setError("");
    }
  };

  // Handle option selection
  const handleOptionSelect = (option) => {
    setAnswer(option);
    if (error) {
      setError("");
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate answer
    if (!answer || !answer.trim()) {
      setError("Please provide an answer to continue");
      return;
    }

    // Submit the clarification answer with sessionId
    onSubmit(answer.trim(), sessionId);
  };

  // Handle cancel
  const handleCancel = () => {
    setAnswer("");
    setError("");
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex justify-center items-center opacity-0 animate-[fadeIn_0.3s_ease-out_forwards] p-5">
      <div className="bg-slate-800/90 w-[90%] max-w-[500px] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10 flex flex-col overflow-hidden relative translate-y-5 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_0.1s_forwards]">
        <div className="py-6 px-8 border-b border-white/10 flex flex-col items-center bg-slate-900/50">
          <div className="text-4xl mb-3 drop-shadow-[0_0_10px_rgba(96,165,250,0.4)]">
            🔍
          </div>
          <h2 className="text-2xl font-bold text-slate-100 m-0 bg-gradient-to-br from-blue-300 to-purple-300 text-transparent bg-clip-text drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
            Clarification Needed
          </h2>
          <p className="m-0 mt-2 text-slate-400 text-[0.95rem] text-center max-w-[90%] leading-snug">
            Your query requires additional information to provide accurate
            results.
          </p>
        </div>

        <div className="p-8 pb-6 flex flex-col gap-6">
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-5 border-l-4 border-l-blue-400">
            <label
              htmlFor="clarification-input"
              className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2"
            >
              Question:
            </label>
            <p className="m-0 text-slate-200 text-lg leading-relaxed font-medium">
              {clarificationQuestion ||
                "Please provide more details about your query."}
            </p>
          </div>

          {/* If options exist, show as buttons/select; otherwise show text input */}
          {options && options.length > 0 ? (
            <div className="flex flex-col gap-3">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider ml-1">
                Select an option:
              </label>
              <div className="flex flex-col gap-2.5">
                {options.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`bg-slate-700/50 border border-slate-600/50 rounded-xl py-3.5 px-5 text-left text-slate-200 text-base font-medium cursor-pointer transition-all duration-200 hover:bg-slate-600/60 hover:border-slate-500/50 hover:-translate-y-0.5 ${answer === option ? "bg-blue-600/20 border-blue-500 box-shadow-[0_0_0_1px_#3b82f6] text-blue-100" : ""} disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                    onClick={() => handleOptionSelect(option)}
                    disabled={loading}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="clarification-input"
                className="text-slate-400 text-xs font-bold uppercase tracking-wider ml-1"
              >
                Your Answer:
              </label>
              <input
                id="clarification-input"
                type="text"
                value={answer}
                onChange={handleAnswerChange}
                placeholder="Type your answer here..."
                disabled={loading}
                autoFocus
                className={`w-full bg-slate-900/80 border-2 border-slate-700/50 rounded-xl py-4 px-5 text-base text-slate-100 outline-none transition-all duration-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] placeholder-slate-500 hover:border-slate-600/80 focus:border-blue-500 focus:bg-slate-900 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_1px_3px_rgba(0,0,0,0.1),0_0_0_3px_rgba(59,130,246,0.15)] disabled:bg-slate-900/50 disabled:text-slate-400 disabled:cursor-not-allowed ${error ? "border-red-500/50 focus:border-red-400 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.2),0_0_0_3px_rgba(239,68,68,0.15)] bg-red-900/10" : ""}`}
              />
            </div>
          )}

          {error && (
            <div
              className="text-red-400 text-sm mt-0 pl-1 animate-[fadeIn_0.3s_ease-out]"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>

        <div className="py-5 px-8 pt-4 bg-slate-900/30 border-t border-slate-700/30 flex justify-end gap-3.5">
          <button
            type="button"
            className="bg-transparent border-none text-slate-400 py-2.5 px-4 rounded-lg font-semibold cursor-pointer transition-colors duration-200 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center justify-center gap-2 m-0 py-2.5 px-6 font-bold bg-gradient-to-br from-blue-500 to-purple-500 border-none rounded-lg text-white cursor-pointer transition-all duration-300 shadow-[0_4px_15px_rgba(59,130,246,0.3)] disabled:bg-slate-600/50 disabled:shadow-none disabled:cursor-not-allowed hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_8px_20px_rgba(59,130,246,0.4)]"
            onClick={handleSubmit}
            disabled={loading || !answer.trim()}
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 rounded-full border-t-white animate-spin"></span>
                Processing...
              </>
            ) : (
              "Submit Answer"
            )}
          </button>
        </div>

        <div className="text-center py-3 bg-blue-900/20 text-blue-300/80 border-t border-blue-500/10">
          <small className="text-[0.8rem] block px-4 py-1">
            Providing accurate clarification helps generate more precise
            business intelligence results.
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
  loading: PropTypes.bool,
};

ClarificationModal.defaultProps = {
  sessionId: "",
  clarificationQuestion: "",
  options: [],
  loading: false,
};

export default ClarificationModal;
