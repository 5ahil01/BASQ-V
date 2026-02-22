import React from "react";
import PropTypes from "prop-types";

/**
 * ErrorBox Component
 * Purpose: Handle errors honestly with clear, friendly messaging
 */
const ErrorBox = ({ error, onClose }) => {
  // If no error, don't render
  if (!error) return null;

  // Extract error message, handle different error types
  const getErrorMessage = () => {
    if (typeof error === "string") {
      return error;
    }
    if (error.message) {
      return error.message;
    }
    return "An unexpected error occurred. Please try again.";
  };

  // Create friendly error message
  const friendlyMessage = getErrorMessage()
    .replace(/Error:/gi, "") // Remove "Error:" prefix
    .replace(/stack trace/gi, "") // Remove stack trace mentions
    .trim();

  return (
    <div className="bg-red-500/10 border border-red-400/30 rounded-xl py-4 px-5 mb-4 backdrop-blur-md animate-[shake_0.5s_ease-in-out]">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0 text-red-300">⚠️</div>
        <div className="m-0 text-slate-300">
          <strong className="block text-red-300 mb-1 font-semibold">
            Oops! Something went wrong.
          </strong>
          <p className="m-0">{friendlyMessage}</p>
        </div>
        <button
          className="bg-transparent border-none text-xl cursor-pointer text-slate-400 p-0 ml-auto shrink-0 transition-all duration-200 hover:text-red-300 hover:scale-110"
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
      message: PropTypes.string,
    }),
  ]),
  onClose: PropTypes.func.isRequired,
};

// Default props
ErrorBox.defaultProps = {
  error: null,
};

export default ErrorBox;
