import React from "react";
import PropTypes from "prop-types";

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
      case "high":
        return "#34d399"; // green
      case "medium":
        return "#fbbf24"; // yellow/amber
      case "low":
        return "#f87171"; // red
      default:
        return "#94a3b8"; // gray
    }
  };

  // Format score as percentage
  const getPercentage = () => {
    if (score === null || score === undefined) return null;
    return Math.round(score * 100);
  };

  // Check if low confidence (show warning)
  const isLowConfidence =
    label?.toLowerCase() === "low" || (score !== null && score < 0.5);

  const color = getColor();
  const percentage = getPercentage();

  return (
    <div className="flex flex-col gap-3 min-w-[200px]">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm font-semibold tracking-wide">
          Confidence:
        </span>
        <span
          className="py-1 px-3 rounded-full font-bold text-xs uppercase tracking-wider border"
          style={{
            backgroundColor: `${color}20`,
            borderColor: color,
            color: color,
          }}
        >
          {label || "Unknown"}
          {percentage !== null && ` (${percentage}%)`}
        </span>
      </div>

      {/* Show reasons if available */}
      {reasons && reasons.length > 0 && (
        <div className="bg-slate-900/40 p-3 rounded-lg border border-white/5">
          <small className="text-slate-400 font-semibold block mb-1">
            Reasons:
          </small>
          <ul className="m-0 pl-4 text-slate-300 text-sm">
            {reasons.map((reason, index) => (
              <li key={index} className="py-0.5">
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Show warning for low confidence */}
      {isLowConfidence && (
        <div className="flex items-start gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-500/20 mt-1">
          <span className="text-lg">⚠️</span>
          <span className="text-sm font-medium">
            Low confidence - results may not be accurate. Consider rephrasing
            your query.
          </span>
        </div>
      )}

      {/* Visual progress bar */}
      {score !== null && (
        <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden mt-1">
          <div
            className="h-full rounded-full transition-all duration-[1s]"
            style={{
              width: `${percentage}%`,
              backgroundColor: color,
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
  reasons: PropTypes.arrayOf(PropTypes.string),
};

ConfidenceIndicator.defaultProps = {
  score: null,
  label: "",
  reasons: [],
};

export default ConfidenceIndicator;
