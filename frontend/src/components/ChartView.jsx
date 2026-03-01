import React from "react";
import PropTypes from "prop-types";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import { Pie, Bar, Line, Doughnut } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

/**
 * ChartView Component
 * Shows charts using Chart.js library with graceful error handling
 */
const ChartView = ({ data, chartType }) => {
  // Chart.js color palette
  const chartColors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#FF6384",
    "#C9CBCF",
  ];

  // Validate data exists and is not empty
  const isValidData = () => {
    if (!data) return false;
    if (Array.isArray(data) && data.length === 0) return false;
    if (typeof data === "object" && Object.keys(data).length === 0)
      return false;
    return true;
  };

  // Prepare Chart.js data format
  const getChartData = () => {
    if (!Array.isArray(data) || data.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = data.map((item) => item.label || item.name || "Unknown");
    const values = data.map((item) => item.value || 0);

    return {
      labels,
      datasets: [
        {
          label: "Value",
          data: values,
          backgroundColor: chartColors,
          borderColor: chartColors.map((color) => color),
          borderWidth: 1,
        },
      ],
    };
  };

  // Chart.js options
  const getChartOptions = (title) => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#94a3b8",
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: false,
          text: title,
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          titleColor: "#f1f5f9",
          bodyColor: "#cbd5e1",
          borderColor: "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
        },
      },
    };
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
    const chartData = getChartData();

    try {
      switch (chartType?.toLowerCase()) {
        case "bar":
        case "horizontalbar":
          return renderBarChart(chartData);

        case "line":
        case "area":
          return renderLineChart(chartData);

        case "pie":
          return renderPieChart(chartData);

        case "doughnut":
          return renderDoughnutChart(chartData);

        case "kpi":
          return renderKPI();

        case "table":
          return renderTableView();

        case "heatmap":
          return renderHeatmapChart();

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

  // Bar Chart Implementation using Chart.js
  const renderBarChart = (chartData) => {
    const options = {
      ...getChartOptions("Bar Chart"),
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
        },
        y: {
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
        },
      },
    };

    return (
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">Bar Chart</h3>
        <div className="h-[350px] w-full">
          <Bar data={chartData} options={options} />
        </div>
      </div>
    );
  };

  // Line Chart Implementation using Chart.js
  const renderLineChart = (chartData) => {
    // Update dataset for line chart styling
    const lineData = {
      ...chartData,
      datasets: chartData.datasets.map((ds) => ({
        ...ds,
        borderColor: "#36A2EB",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        fill: chartType?.toLowerCase() === "area",
        tension: 0.4,
      })),
    };

    const options = {
      ...getChartOptions("Line Chart"),
      scales: {
        x: {
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
        },
        y: {
          ticks: {
            color: "#94a3b8",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.05)",
          },
        },
      },
    };

    return (
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">
          {chartType?.toLowerCase() === "area" ? "Area Chart" : "Line Chart"}
        </h3>
        <div className="h-[350px] w-full">
          <Line data={lineData} options={options} />
        </div>
      </div>
    );
  };

  // Pie Chart Implementation using Chart.js
  const renderPieChart = (chartData) => {
    const options = getChartOptions("Pie Chart");

    return (
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">Pie Chart</h3>
        <div className="h-[350px] w-full flex justify-center">
          <Pie data={chartData} options={options} />
        </div>
      </div>
    );
  };

  // Doughnut Chart Implementation using Chart.js
  const renderDoughnutChart = (chartData) => {
    const options = getChartOptions("Doughnut Chart");

    return (
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">Doughnut Chart</h3>
        <div className="h-[350px] w-full flex justify-center">
          <Doughnut data={chartData} options={options} />
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
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">KPI</h3>
        <div className="flex items-center justify-center h-[200px] bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
              {typeof value === "number" ? value.toLocaleString() : value}
            </div>
            <div className="text-slate-400 text-lg">{label}</div>
          </div>
        </div>
      </div>
    );
  };

  // Heatmap Chart Implementation (keeping manual for now as Chart.js doesn't have built-in heatmap)
  const renderHeatmapChart = () => {
    const maxValue = getMaxValue();
    return (
      <div className="w-full">
        <h3 className="text-lg text-slate-300 mb-5 font-semibold">Heatmap</h3>
        <div className="flex flex-wrap gap-3 w-full p-2">
          {Array.isArray(data) &&
            data.map((item, index) => {
              const intensity = Math.min(
                1,
                Math.max(0.15, (item.value || 0) / (maxValue || 1))
              );
              return (
                <div
                  key={index}
                  className="flex flex-col items-center gap-2 group relative"
                >
                  <div
                    className="w-20 h-20 rounded-md flex items-center justify-center transition-all duration-300 hover:scale-110 hover:z-10 cursor-pointer border border-white/10"
                    style={{
                      backgroundColor: `rgba(239, 68, 68, ${intensity})`,
                      boxShadow: `0 0 15px rgba(239, 68, 68, ${intensity * 0.5})`,
                    }}
                    title={
                      (item.label || item.name || "Item " + (index + 1)) +
                      ": " +
                      item.value
                    }
                  >
                    <span className="text-white font-semibold text-sm drop-shadow-md">
                      {item.value}
                    </span>
                  </div>
                  <div className="text-slate-400 text-xs w-20 text-center overflow-hidden text-ellipsis whitespace-nowrap">
                    {item.label || item.name || `Item ${index + 1}`}
                  </div>
                </div>
              );
            })}
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
