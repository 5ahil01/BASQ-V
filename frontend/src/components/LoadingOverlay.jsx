import React from "react";
import PropTypes from "prop-types";

/**
 * LoadingOverlay Component
 * Full-screen loading overlay shown during API calls
 */
const LoadingOverlay = ({ isLoading, message }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[1000] flex justify-center items-center opacity-0 animate-[fadeIn_0.3s_ease-out_forwards]">
      <div className="bg-slate-800/90 py-10 px-12 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/10 flex flex-col items-center gap-5 translate-y-5 animate-[slideUp_0.4s_cubic-bezier(0.16,1,0.3,1)_0.1s_forwards] max-w-[90%] text-center">
        <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-blue-400 animate-spin shadow-[0_0_15px_rgba(96,165,250,0.5)]"></div>
        <p className="m-0 text-slate-200 text-xl font-medium tracking-wide drop-shadow-sm">
          {message || "Processing your query..."}
        </p>
        <small className="text-slate-400 text-sm mt-[-10px]">
          This may take a few moments
        </small>
      </div>
    </div>
  );
};

LoadingOverlay.propTypes = {
  isLoading: PropTypes.bool,
  message: PropTypes.string,
};

LoadingOverlay.defaultProps = {
  isLoading: false,
  message: "",
};

export default LoadingOverlay;
