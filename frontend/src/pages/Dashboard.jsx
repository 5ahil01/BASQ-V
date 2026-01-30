import React, { useState } from 'react';
import QueryInput from '../components/QueryInput';
import ChartView from '../components/ChartView';
import TableView from '../components/TableView';
import ContextPanel from '../components/ContextPanel';
import ErrorBox from '../components/ErrorBox';
import '../styles/dashboard.css';
import { sendQuery } from '../services/api';

/**
 * Utility function to determine chart type and transform data based on query and data
 * @param {string} query - The user's query text
 * @param {Array} data - The table data from backend
 * @returns {object} - {chartType: string, transformedData: Array}
 */
const determineChartType = (query, data) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return { chartType: 'table', transformedData: data };
  }

  // Check for single scalar value (KPI)
  if (data.length === 1 && Object.keys(data[0]).length === 2) {
    const keys = Object.keys(data[0]);
    const value = data[0][keys[1]];
    if (typeof value === 'number' && !isNaN(value)) {
      return {
        chartType: 'kpi',
        transformedData: [{ label: keys[0], value: value }]
      };
    }
  }

  // Check for temporal data (line chart)
  const queryLower = query.toLowerCase();
  const temporalKeywords = ['time', 'date', 'month', 'year', 'day', 'over time', 'trend', 'historical'];
  const hasTemporalKeyword = temporalKeywords.some(keyword => queryLower.includes(keyword));

  // Check if data has date-like columns
  const hasDateColumn = data.some(row => {
    return Object.values(row).some(value => {
      return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value); // YYYY-MM-DD format
    });
  });

  if (hasTemporalKeyword || hasDateColumn) {
    // Transform data for line chart - assume first column is label, second is value
    const transformedData = data.map(row => {
      const keys = Object.keys(row);
      return {
        label: row[keys[0]]?.toString() || 'Unknown',
        value: typeof row[keys[1]] === 'number' ? row[keys[1]] : 0
      };
    });
    return { chartType: 'line', transformedData };
  }

  // Check for categorical data (< 6 items) - pie chart
  if (data.length < 6) {
    // Transform data for pie chart
    const transformedData = data.map(row => {
      const keys = Object.keys(row);
      return {
        label: row[keys[0]]?.toString() || 'Unknown',
        value: typeof row[keys[1]] === 'number' ? row[keys[1]] : 0
      };
    });
    return { chartType: 'pie', transformedData };
  }

  // Default to bar chart for comparative data (> 6 items)
  const transformedData = data.map(row => {
    const keys = Object.keys(row);
    return {
      label: row[keys[0]]?.toString() || 'Unknown',
      value: typeof row[keys[1]] === 'number' ? row[keys[1]] : 0
    };
  });
  return { chartType: 'bar', transformedData };
};

const Dashboard = () => {
  // State Management - Central orchestrator state
  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [contextUsed, setContextUsed] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Main query handler - orchestrates the entire flow
   * Flow: User enters query → Query sent to backend → Response stored → Components re-render
   */
  const handleQuery = async (query) => {
    // Step 1: Update query text and set loading state
    setQueryText(query);
    setLoading(true);
    setError(null);

    try {
      // Step 2: Call API (backend)
      const response = await sendQuery(query);

      // Step 3: Store response in state
      // Backend response: {query, sql_query, result: List[Dict[str, Any]]}
      // Map to frontend expected format
      const { chartType, transformedData } = determineChartType(query, response.result);
      setResponseData({
        charts: transformedData, // Use transformed data for charts
        tables: response.result, // Backend returns table data in 'result'
        chartType: chartType // Add determined chart type
      });
      setContextUsed({
        sources: [], // No context from backend yet
        metadata: { sql_query: response.sql_query } // Include generated SQL
      });
      setVerificationStatus({
        status: 'pending', // No verification from backend yet
        confidence: null
      });

      console.log('Query submitted:', query);
      console.log('Response received:', response);
    } catch (err) {
      // Step 4: Handle errors
      setError(err.message || 'An error occurred while processing your query');
      // Clear previous data on error
      setResponseData(null);
      setContextUsed(null);
      setVerificationStatus(null);
    } finally {
      // Step 5: Reset loading state
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>BASQ-V Dashboard</h1>
      </div>

      {/* Query Input - Top */}
      <div className="query-section">
        <QueryInput 
          onSubmit={handleQuery} 
          loading={loading}
          currentQuery={queryText}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-section">
          <ErrorBox 
            error={error} 
            onClose={() => setError(null)} 
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Charts - Center */}
        <div className="charts-section">
          <ChartView
            data={responseData?.charts}
            chartType={responseData?.chartType}
            loading={loading}
          />
        </div>

        {/* Table - Below Charts */}
        <div className="table-section">
          <TableView 
            data={responseData?.tables} 
            loading={loading}
          />
        </div>
      </div>

      {/* Context + Verification - Bottom/Side */}
      <div className="context-section">
        <ContextPanel 
          context={contextUsed}
          verification={verificationStatus}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default Dashboard;
