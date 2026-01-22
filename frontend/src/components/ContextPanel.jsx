import React from 'react';
import PropTypes from 'prop-types';
import VerificationBadge from './VerificationBadge';

/**
 * ContextPanel Component
 * Purpose: Expose context awareness visually
 * Shows what tables, columns, and business definitions were used
 */
const ContextPanel = ({ context, verification }) => {
  // If no context provided, show empty state
  if (!context || Object.keys(context).length === 0) {
    return (
      <div className="context-panel context-panel-empty">
        <h3>Context Used</h3>
        <p className="no-context-message">No context information available</p>
      </div>
    );
  }

  // Extract context information with defaults
  const {
    tables = [],
    columns = [],
    definitions = [],
    metadata = null
  } = context;

  // Format table names (handle string or array)
  const formatTables = () => {
    if (!tables || tables.length === 0) return null;
    const tableList = Array.isArray(tables) ? tables : [tables];
    return tableList.map(table => String(table).trim());
  };

  // Format column names (handle string or array)
  const formatColumns = () => {
    if (!columns || columns.length === 0) return null;
    const columnList = Array.isArray(columns) ? columns : [columns];
    return columnList.map(col => String(col).trim());
  };

  // Format definitions (handle string or array)
  const formatDefinitions = () => {
    if (!definitions || definitions.length === 0) return null;
    const defList = Array.isArray(definitions) ? definitions : [definitions];
    return defList.map(def => String(def).trim());
  };

  const formattedTables = formatTables();
  const formattedColumns = formatColumns();
  const formattedDefinitions = formatDefinitions();

  return (
    <div className="context-panel">
      <h3>Context Used</h3>
      {verification && verification.status && (
        <div className="verification-section">
          <VerificationBadge verificationStatus={verification.status} />
        </div>
      )}

      <div className="context-content">
        {/* Tables Section */}
        {formattedTables && formattedTables.length > 0 && (
          <div className="context-section">
            <div className="context-label">
              <span className="context-icon">📊</span>
              <strong>
                {formattedTables.length === 1 ? 'Table:' : 'Tables:'}
              </strong>
            </div>
            <ul className="context-list">
              {formattedTables.map((table, index) => (
                <li key={index} className="context-item">
                  <code>{table}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Columns Section */}
        {formattedColumns && formattedColumns.length > 0 && (
          <div className="context-section">
            <div className="context-label">
              <span className="context-icon">📋</span>
              <strong>
                {formattedColumns.length === 1 ? 'Column:' : 'Columns:'}
              </strong>
            </div>
            <ul className="context-list">
              {formattedColumns.map((column, index) => (
                <li key={index} className="context-item">
                  <code>{column}</code>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Business Definitions Section */}
        {formattedDefinitions && formattedDefinitions.length > 0 && (
          <div className="context-section">
            <div className="context-label">
              <span className="context-icon">💡</span>
              <strong>
                {formattedDefinitions.length === 1 ? 'Definition:' : 'Definitions:'}
              </strong>
            </div>
            <ul className="context-list">
              {formattedDefinitions.map((definition, index) => (
                <li key={index} className="context-item definition-item">
                  {definition}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Additional Metadata (if provided) */}
        {metadata && (
          <div className="context-section context-metadata">
            <div className="context-label">
              <span className="context-icon">ℹ️</span>
              <strong>Additional Info:</strong>
            </div>
            <div className="context-metadata-content">
              {typeof metadata === 'string' ? (
                <p>{metadata}</p>
              ) : (
                <pre>{JSON.stringify(metadata, null, 2)}</pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary badge */}
      {(formattedTables || formattedColumns || formattedDefinitions) && (
        <div className="context-summary">
          <small>
            {[
              formattedTables?.length && `${formattedTables.length} table${formattedTables.length > 1 ? 's' : ''}`,
              formattedColumns?.length && `${formattedColumns.length} column${formattedColumns.length > 1 ? 's' : ''}`,
              formattedDefinitions?.length && `${formattedDefinitions.length} definition${formattedDefinitions.length > 1 ? 's' : ''}`
            ].filter(Boolean).join(' • ')}
          </small>
        </div>
      )}
    </div>
  );
};

// PropTypes for type checking
ContextPanel.propTypes = {
  context: PropTypes.shape({
    tables: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string)
    ]),
    columns: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string)
    ]),
    definitions: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.arrayOf(PropTypes.string)
    ]),
    metadata: PropTypes.any
  }),
  verification: PropTypes.shape({
    status: PropTypes.oneOf(['verified', 'partial', 'rejected'])
  })
};

// Default props
ContextPanel.defaultProps = {
  context: null
};

export default ContextPanel;
