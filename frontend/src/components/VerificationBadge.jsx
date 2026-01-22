import React from 'react';
import PropTypes from 'prop-types';

/**
 * VerificationBadge Component
 * Purpose: Display backend verification result with status indicator and message text
 */
const VerificationBadge = ({ verificationStatus }) => {
  // Determine color and message based on verification status
  let color, message;
  switch (verificationStatus) {
    case 'verified':
      color = 'green';
      message = 'Verified';
      break;
    case 'partial':
      color = 'orange'; // Using orange for better visibility than yellow
      message = 'Partially Verified';
      break;
    case 'rejected':
      color = 'red';
      message = 'Rejected';
      break;
    default:
      color = 'gray';
      message = 'Unknown Status';
      break;
  }

  return (
    <div className="verification-badge" style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#f5f5f5' }}>
      <span
        className="status-indicator"
        style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: color,
          marginRight: '8px'
        }}
        aria-hidden="true"
      />
      <span className="status-message">{message}</span>
    </div>
  );
};

// PropTypes for type checking
VerificationBadge.propTypes = {
  verificationStatus: PropTypes.oneOf(['verified', 'partial', 'rejected']).isRequired
};

export default VerificationBadge;
