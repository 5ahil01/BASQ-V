import React from 'react';
import PropTypes from 'prop-types';

/**
 * ExplainabilityPanel Component
 * Shows context used - tables, columns, joins, filters, business rules, and SQL
 */
const ExplainabilityPanel = ({ explainability, sql }) => {
  // If no explainability and no sql, don't render
  if (!explainability && !sql) {
    return (
      <div className="explainability-panel explainability-empty">
        <h3>Context Used</h3>
        <p className="no-context-message">No context information available</p>
      </div>
    );
  }

  // Extract explainability data
  const {
    tables = [],
    columns = [],
    joins = [],
    filters = [],
    businessRulesUsed = []
  } = explainability || {};

  // Check if there's any content to show
  const hasContent = tables.length > 0 || columns.length > 0 || 
                    joins.length > 0 || filters.length > 0 || 
                    businessRulesUsed.length > 0 || sql;

  if (!hasContent) {
    return (
      <div className="explainability-panel explainability-empty">
        <h3>Context Used</h3>
        <p className="no-context-message">No context information available</p>
      </div>
    );
  }

  // Format list items
  const formatList = (items) => {
    if (!items || items.length === 0) return null;
    return items.map((item, index) => (
      <li key={index} className="explainability-item">
        <code>{item}</code>
      </li>
    ));
  };

  return (
    <div className="explainability-panel">
      <h3>Context Used</h3>

      {/* Tables Section */}
      {tables.length > 0 && (
        <div className="explainability-section">
          <div className="explainability-label">
            <span className="explainability-icon">📊</span>
            <strong>Tables:</strong>
          </div>
          <ul className="explainability-list">
            {formatList(tables)}
          </ul>
        </div>
      )}

      {/* Columns Section */}
      {columns.length > 0 && (
        <div className="explainability-section">
          <div className="explainability-label">
            <span className="explainability-icon">📋</span>
            <strong>Columns:</strong>
          </div>
          <ul className="explainability-list">
            {formatList(columns)}
          </ul>
        </div>
      )}

      {/* Joins Section */}
      {joins.length > 0 && (
        <div className="explainability-section">
          <div className="explainability-label">
            <span className="explainability-icon">🔗</span>
            <strong>Joins:</strong>
          </div>
          <ul className="explainability-list">
            {formatList(joins)}
          </ul>
        </div>
      )}

      {/* Filters Section */}
      {filters.length > 0 && (
        <div className="explainability-section">
          <div className="explainability-label">
            <span className="explainability-icon">🔍</span>
            <strong>Filters:</strong>
          </div>
          <ul className="explainability-list">
            {formatList(filters)}
          </ul>
        </div>
      )}

      {/* Business Rules Section */}
      {businessRulesUsed.length > 0 && (
        <div className="explainability-section">
          <div className="explainability-label">
            <span className="explainability-icon">💡</span>
            <strong>Business Rules:</strong>
          </div>
          <ul className="explainability-list">
            {businessRulesUsed.map((rule, index) => (
              <li key={index} className="explainability-item rule-item">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SQL Section - Always show if available */}
      {sql && (
        <div className="explainability-section explainability-sql">
          <div className="explainability-label">
            <span className="explainability-icon">📝</span>
            <strong>Generated SQL:</strong>
          </div>
          <pre className="sql-code">
            <code>{sql}</code>
          </pre>
        </div>
      )}

      {/* Summary */}
      <div className="explainability-summary">
        <small>
          {[
            tables.length > 0 && `${tables.length} table${tables.length > 1 ? 's' : ''}`,
            columns.length > 0 && `${columns.length} column${columns.length > 1 ? 's' : ''}`,
            joins.length > 0 && `${joins.length} join${joins.length > 1 ? 's' : ''}`,
            filters.length > 0 && `${filters.length} filter${filters.length > 1 ? 's' : ''}`,
            businessRulesUsed.length > 0 && `${businessRulesUsed.length} rule${businessRulesUsed.length > 1 ? 's' : ''}`
          ].filter(Boolean).join(' • ')}
        </small>
      </div>
    </div>
  );
};

ExplainabilityPanel.propTypes = {
  explainability: PropTypes.shape({
    tables: PropTypes.arrayOf(PropTypes.string),
    columns: PropTypes.arrayOf(PropTypes.string),
    joins: PropTypes.arrayOf(PropTypes.string),
    filters: PropTypes.arrayOf(PropTypes.string),
    businessRulesUsed: PropTypes.arrayOf(PropTypes.string)
  }),
  sql: PropTypes.string
};

ExplainabilityPanel.defaultProps = {
  explainability: null,
  sql: ''
};

export default ExplainabilityPanel;
