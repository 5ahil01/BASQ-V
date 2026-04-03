import React from "react";
import PropTypes from "prop-types";

/**
 * TableView Component
 * Purpose: Prove charts are not fake by showing raw data in table format
 */
const TableView = ({ data }) => {
  // Validate data exists
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return (
      <div className="table-view-empty">
        <p>No data available to display</p>
      </div>
    );
  }

  // Convert data to array if it's a single object
  const tableData = Array.isArray(data) ? data : [data];

  // Extract dynamic headers from the first data item
  const getHeaders = () => {
    if (tableData.length === 0) return [];

    const firstItem = tableData[0];
    if (typeof firstItem !== "object") return ["Value"];

    return Object.keys(firstItem);
  };

  const headers = getHeaders();

  // Render cell value safely (handle nested objects, null, undefined)
  const renderCellValue = (value) => {
    if (value === null || value === undefined) {
      return "-";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    return String(value);
  };

  // Format header text (convert camelCase or snake_case to Title Case)
  const formatHeader = (header) => {
    return header
      .replace(/([A-Z])/g, " $1") // Add space before capital letters
      .replace(/_/g, " ") // Replace underscores with spaces
      .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
      .trim();
  };

  return (
    <div className="w-full bg-white rounded-2xl p-6 border border-gray-200 mt-5">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-[1.2rem] text-gray-800 m-0 font-semibold">
          Data Table
        </h3>
        <span className="text-gray-500 text-sm">
          {tableData.length} {tableData.length === 1 ? "row" : "rows"}
        </span>
      </div>

      {/* Scrollable container for large datasets */}
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4 text-gray-600 font-semibold w-12 text-center">
                #
              </th>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="py-3 px-4 text-gray-600 font-semibold"
                >
                  {formatHeader(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tableData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                <td className="py-3 px-4 text-gray-500 font-medium text-center">
                  {rowIndex + 1}
                </td>
                {headers.map((header, colIndex) => (
                  <td key={colIndex} className="py-3 px-4 text-gray-800">
                    {typeof row === "object"
                      ? renderCellValue(row[header])
                      : renderCellValue(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show scroll hint if data is large */}
      {tableData.length > 10 && (
        <div className="table-scroll-hint">↕ Scroll to view all rows</div>
      )}
    </div>
  );
};

// PropTypes for type checking
TableView.propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
};

// Default props
TableView.defaultProps = {
  data: null,
};

export default TableView;
