import React from "react";
import PropTypes from "prop-types";

/**
 * ChartView Component
 * Shows charts ONLY if data is valid with graceful error handling
 */
const ChartView = ({ data, chartType }) => {
  // Validate data exists and is not empty
  const isValidData = () => {
    if (!data) return false;
    if (Array.isArray(data) && data.length === 0) return false;
    if (typeof data === "object" && Object.keys(data).length === 0)
      return false;
    return true;
  };

  // If no data, show empty state message
  if (!isValidData()) {
    return (
      <div className="chart-view-empty">
        <p>No data available to display chart</p>
      </div>
    );
  }

  // Render chart based on chartType
  const renderChart = () => {
    try {
      switch (chartType?.toLowerCase()) {
        case "bar":
          return renderBarChart();

        case "line":
          return renderLineChart();

        case "pie":
          return renderPieChart();

        case "kpi":
          return renderKPI();

        case "table":
          return renderTableView();

        default:
          // Fallback for unsupported chart type
          return renderFallbackView();
      }
    } catch (error) {
      // Never crash UI - catch any rendering errors
      console.error("Error rendering chart:", error);
      return (
        <div className="chart-view-error">
          <p>Unable to render chart. Please try a different view.</p>
        </div>
      );
    }
  };

  // Bar Chart Implementation
  const renderBarChart = () => {
    return (
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">Bar Chart</h3>
        <div className="flex flex-col gap-4 w-full">
          {Array.isArray(data) &&
            data.map((item, index) => (
              <div key={index} className="flex items-center gap-4 w-full">
                <div className="w-[120px] text-slate-400 text-sm text-right shrink-0 whitespace-nowrap overflow-hidden text-ellipsis">
                  {item.label || item.name || `Item ${index + 1}`}
                </div>
                <div className="flex-1 bg-white/5 h-8 rounded-md overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-md flex items-center px-3 min-w-[40px] transition-all duration-[1s] ease-out shadow-[0_0_15px_rgba(96,165,250,0.3)]"
                    style={{
                      width: `${Math.min(100, (item.value / getMaxValue()) * 100)}%`,
                    }}
                  >
                    <span className="text-white font-semibold text-[0.85rem] drop-shadow-md">
                      {item.value}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Line Chart Implementation (simplified visualization)
  const renderLineChart = () => {
    return (
      <div className="chart-container line-chart">
        <h3>Line Chart</h3>
        <div className="chart-content">
          <svg width="100%" height="300" viewBox="0 0 500 300">
            {/* Background grid */}
            <line
              x1="50"
              y1="250"
              x2="450"
              y2="250"
              stroke="#ddd"
              strokeWidth="2"
            />
            <line
              x1="50"
              y1="50"
              x2="50"
              y2="250"
              stroke="#ddd"
              strokeWidth="2"
            />

            {/* Plot data points */}
            {Array.isArray(data) && renderLinePoints()}
          </svg>
          <div className="chart-legend">
            {Array.isArray(data) &&
              data.map((item, index) => (
                <div key={index} className="legend-item">
                  {item.label || item.name || `Point ${index + 1}`}:{" "}
                  {item.value}
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  // Helper to render line chart points
  const renderLinePoints = () => {
    if (!Array.isArray(data) || data.length === 0) return null;

    const maxValue = getMaxValue();
    const points = data.map((item, index) => {
      const x = 50 + index * (400 / (data.length - 1 || 1));
      const y = 250 - (item.value / maxValue) * 200;
      return { x, y, value: item.value };
    });

    return (
      <>
        {/* Line path */}
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke="#2196F3"
          strokeWidth="2"
        />
        {/* Data points */}
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="4" fill="#2196F3" />
        ))}
      </>
    );
  };

  // Pie Chart Implementation (simplified)
  const renderPieChart = () => {
    return (
      <div className="chart-container pie-chart">
        <h3>Pie Chart</h3>
        <div className="chart-content">
          <div className="pie-items">
            {Array.isArray(data) &&
              data.map((item, index) => {
                const percentage = (
                  (item.value / getTotalValue()) *
                  100
                ).toFixed(1);
                return (
                  <div key={index} className="pie-item">
                    <div
                      className="pie-color"
                      style={{ backgroundColor: getColor(index) }}
                    ></div>
                    <span className="pie-label">
                      {item.label || item.name || `Item ${index + 1}`}:{" "}
                      {item.value} ({percentage}%)
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  // KPI Card Implementation
  const renderKPI = () => {
    if (!Array.isArray(data) || data.length !== 1) {
      return renderFallbackView();
    }

    const item = data[0];
    const keys = Object.keys(item);
    const label = keys[0];
    const value = item[keys[1]];

    return (
      <div className="chart-container kpi-card">
        <h3>KPI</h3>
        <div className="kpi-content">
          <div className="kpi-value">{value}</div>
          <div className="kpi-label">{label}</div>
        </div>
      </div>
    );
  };

  // Table View as alternative
  const renderTableView = () => {
    return (
      <div className="chart-container table-view">
        <h3>Table View</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) &&
              data.map((item, index) => (
                <tr key={index}>
                  <td>{item.label || item.name || `Item ${index + 1}`}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Fallback view for unsupported chart types
  const renderFallbackView = () => {
    return (
      <div className="w-full">
        <div className="mb-4 text-slate-300 italic text-center">
          <p>Chart type "{chartType}" is not supported.</p>
          <p>Displaying data in table format:</p>
        </div>
        {renderTableView()}
      </div>
    );
  };

  // Helper function to get max value from data
  const getMaxValue = () => {
    if (!Array.isArray(data)) return 1;
    return Math.max(...data.map((item) => item.value || 0), 1);
  };

  // Helper function to get total value for percentage calculations
  const getTotalValue = () => {
    if (!Array.isArray(data)) return 1;
    return data.reduce((sum, item) => sum + (item.value || 0), 0) || 1;
  };

  // Helper function to get colors for pie chart
  const getColor = (index) => {
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="w-full min-h-[350px] bg-slate-900/40 rounded-2xl p-6 border border-white/5">
      {renderChart()}
    </div>
  );
};

// PropTypes for type checking
ChartView.propTypes = {
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  chartType: PropTypes.string,
};

// Default props
ChartView.defaultProps = {
  data: null,
  chartType: "bar",
};

export default ChartView;
