import React from "react";
import PropTypes from "prop-types";

/**
 * ExplainabilityPanel Component
 * Shows context used - tables, columns, joins, filters, business rules, and SQL
 */
const ExplainabilityPanel = ({ explainability, sql }) => {
  // If no explainability and no sql, don't render
  if (!explainability && !sql) {
    return (
      <div className="w-full">
        <h3 className="text-[1.4rem] font-bold text-slate-100 m-0 pb-3 border-b-2 border-white/10 bg-gradient-to-br from-slate-200 to-slate-300 text-transparent bg-clip-text mb-5">
          Context Used
        </h3>
        <p className="text-slate-400 italic m-0 text-center py-10 px-5">
          No context information available
        </p>
      </div>
    );
  }

  // Extract explainability data
  const {
    tables = [],
    columns = [],
    joins = [],
    filters = [],
    businessRulesUsed = [],
  } = explainability || {};

  // Check if there's any content to show
  const hasContent =
    tables.length > 0 ||
    columns.length > 0 ||
    joins.length > 0 ||
    filters.length > 0 ||
    businessRulesUsed.length > 0 ||
    sql;

  if (!hasContent) {
    return (
      <div className="w-full">
        <h3 className="text-[1.4rem] font-bold text-slate-100 m-0 pb-3 border-b-2 border-white/10 bg-gradient-to-br from-slate-200 to-slate-300 text-transparent bg-clip-text mb-5">
          Context Used
        </h3>
        <p className="text-slate-400 italic m-0 text-center py-10 px-5">
          No context information available
        </p>
      </div>
    );
  }

  // Format list items
  const formatList = (items) => {
    if (!items || items.length === 0) return null;
    return items.map((item, index) => (
      <li key={index} className="py-2 text-slate-300 text-[0.95rem]">
        <code className="bg-slate-900/70 py-1 px-2.5 rounded-md font-mono text-[0.9rem] text-purple-400 border border-purple-400/20">
          {item}
        </code>
      </li>
    ));
  };

  return (
    <div className="w-full">
      <h3 className="text-[1.4rem] font-bold text-slate-100 m-0 pb-3 border-b-2 border-white/10 bg-gradient-to-br from-slate-200 to-slate-300 text-transparent bg-clip-text mb-5">
        Context Used
      </h3>

      {/* Tables Section */}
      {tables.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-3 text-slate-300 font-semibold text-[0.95rem]">
            <span className="text-[1.25rem] text-blue-400">📊</span>
            <strong>Tables:</strong>
          </div>
          <ul className="list-none p-0 m-0">{formatList(tables)}</ul>
        </div>
      )}

      {/* Columns Section */}
      {columns.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-3 text-slate-300 font-semibold text-[0.95rem]">
            <span className="text-[1.25rem] text-blue-400">📋</span>
            <strong>Columns:</strong>
          </div>
          <ul className="list-none p-0 m-0">{formatList(columns)}</ul>
        </div>
      )}

      {/* Joins Section */}
      {joins.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-3 text-slate-300 font-semibold text-[0.95rem]">
            <span className="text-[1.25rem] text-blue-400">🔗</span>
            <strong>Joins:</strong>
          </div>
          <ul className="list-none p-0 m-0">{formatList(joins)}</ul>
        </div>
      )}

      {/* Filters Section */}
      {filters.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-3 text-slate-300 font-semibold text-[0.95rem]">
            <span className="text-[1.25rem] text-blue-400">🔍</span>
            <strong>Filters:</strong>
          </div>
          <ul className="list-none p-0 m-0">{formatList(filters)}</ul>
        </div>
      )}

      {/* Business Rules Section */}
      {businessRulesUsed.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5 mb-3 text-slate-300 font-semibold text-[0.95rem]">
            <span className="text-[1.25rem] text-blue-400">💡</span>
            <strong>Business Rules:</strong>
          </div>
          <ul className="list-none p-0 m-0">
            {businessRulesUsed.map((rule, index) => (
              <li key={index} className="py-2 text-slate-300 text-[0.95rem]">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* SQL Section - Always show if available */}
      {sql && (
        <div className="mb-5 w-full">
          <div className="flex items-center gap-2.5 mb-3 text-slate-300 font-semibold text-[0.95rem]">
            <span className="text-[1.25rem] text-blue-400">📝</span>
            <strong>Generated SQL:</strong>
          </div>
          <pre className="bg-slate-900/70 p-5 rounded-xl font-mono text-[0.875rem] text-slate-400 m-0 overflow-x-auto border border-white/5 leading-relaxed">
            <code>{sql}</code>
          </pre>
        </div>
      )}

      {/* Summary */}
      <div className="border-t border-white/10 pt-4 mt-5">
        <small className="text-slate-400 text-[0.875rem]">
          {[
            tables.length > 0 &&
              `${tables.length} table${tables.length > 1 ? "s" : ""}`,
            columns.length > 0 &&
              `${columns.length} column${columns.length > 1 ? "s" : ""}`,
            joins.length > 0 &&
              `${joins.length} join${joins.length > 1 ? "s" : ""}`,
            filters.length > 0 &&
              `${filters.length} filter${filters.length > 1 ? "s" : ""}`,
            businessRulesUsed.length > 0 &&
              `${businessRulesUsed.length} rule${businessRulesUsed.length > 1 ? "s" : ""}`,
          ]
            .filter(Boolean)
            .join(" • ")}
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
    businessRulesUsed: PropTypes.arrayOf(PropTypes.string),
  }),
  sql: PropTypes.string,
};

ExplainabilityPanel.defaultProps = {
  explainability: null,
  sql: "",
};

export default ExplainabilityPanel;
