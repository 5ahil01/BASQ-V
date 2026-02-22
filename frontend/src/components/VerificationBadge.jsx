import React from "react";
import PropTypes from "prop-types";

/**
 * VerificationBadge Component
 * Purpose: Display backend verification result with status indicator and message text
 */
const VerificationBadge = ({ verificationStatus }) => {
  // Determine color and message based on verification status
  let color, message;
  switch (verificationStatus) {
    case "verified":
      color = "green";
      message = "Verified";
      break;
    case "partial":
      color = "orange"; // Using orange for better visibility than yellow
      message = "Partially Verified";
      break;
    case "rejected":
      color = "red";
      message = "Rejected";
      break;
    default:
      color = "gray";
      message = "Unknown Status";
      break;
  }

  return (
    <div className="inline-flex items-center py-1.5 px-3 rounded-full bg-slate-800/80 border border-white/10 shadow-[inner_0_1px_3px_rgba(0,0,0,0.3)]">
      <span
        className="inline-block w-2.5 h-2.5 rounded-full mr-2 shadow-[0_0_8px_currentColor] animate-[pulse_2s_infinite]"
        style={{
          backgroundColor: color,
          color: color,
        }}
        aria-hidden="true"
      />
      <span
        className="text-slate-200 text-sm font-semibold tracking-wide"
        style={{ color: color }}
      >
        {message}
      </span>
    </div>
  );
};

// PropTypes for type checking
VerificationBadge.propTypes = {
  verificationStatus: PropTypes.oneOf(["verified", "partial", "rejected"])
    .isRequired,
};

export default VerificationBadge;
