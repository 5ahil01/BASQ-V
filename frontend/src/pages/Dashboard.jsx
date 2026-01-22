import React, { useState } from 'react';
import QueryInput from '../components/QueryInput';
import ChartView from '../components/ChartView';
import TableView from '../components/TableView';
import ContextPanel from '../components/ContextPanel';
import ErrorBox from '../components/ErrorBox';
import '../styles/dashboard.css';
import { sendQuery } from '../services/api';

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
      setResponseData({
        charts: [], // No charts from backend yet
        tables: response.result // Backend returns table data in 'result'
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
