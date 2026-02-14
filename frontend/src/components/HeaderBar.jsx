import React from 'react';
import PropTypes from 'prop-types';

/**
 * HeaderBar Component
 * Project title and subtitle (no login/logout - out of scope)
 */
const HeaderBar = ({ title, subtitle }) => {
  return (
    <div className="header-bar">
      <div className="header-content">
        <h1 className="header-title">
          {title || 'BASQ-V'}
        </h1>
        {subtitle && (
          <p className="header-subtitle">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

HeaderBar.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string
};

HeaderBar.defaultProps = {
  title: 'BASQ-V',
  subtitle: 'Business-Aware Self-Reflective RAG Analytics'
};

export default HeaderBar;
