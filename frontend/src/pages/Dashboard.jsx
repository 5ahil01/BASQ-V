import React, { useState, useCallback } from 'react';
import QueryInput from '../components/QueryInput';
import ClarificationModal from '../components/ClarificationModal';
import ResultsPanel from '../components/ResultsPanel';
import ErrorBox from '../components/ErrorBox';
import LoadingOverlay from '../components/LoadingOverlay';
import HeaderBar from '../components/HeaderBar';
import { sendQuery, sendClarification } from '../services/api';
import { normalizeResponse } from '../utils/responseMapper';
import '../styles/dashboard.css';

/**
 * Dashboard Component
 * Central state store for the BASQ-V Analytics UI
 * Handles: query input, clarification, results display, error handling
 */
const Dashboard = () => {
  // Central state management
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);

  // Clarification state
  const [clarificationState, setClarificationState] = useState({
    isOpen: false,
    question: '',
    options: [],
    sessionId: null
  });

  /**
   * Handle query submission
   * Flow: User enters query → API call → Handle response states
   */
  const handleQuery = useCallback(async (query) => {
    // Set loading state
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Call API with query and sessionId if available
      const apiResponse = await sendQuery(query, sessionId);

      // Normalize the response using responseMapper
      const normalizedResponse = normalizeResponse(apiResponse);

      // Handle different response states
      if (normalizedResponse.status === 'clarification_required') {
        // Open clarification modal
        setSessionId(normalizedResponse.sessionId);
        setClarificationState({
          isOpen: true,
          question: normalizedResponse.question,
          options: normalizedResponse.options,
          sessionId: normalizedResponse.sessionId
        });
        setResponse(null);
      } else if (normalizedResponse.status === 'success' || 
                 normalizedResponse.status === 'rejected' ||
                 normalizedResponse.status === 'error') {
        // Store sessionId for future requests
        if (normalizedResponse.sessionId) {
          setSessionId(normalizedResponse.sessionId);
        }
        setResponse(normalizedResponse);
      } else {
        // Unknown status - treat as error
        setError('Received an unknown response from the server. Please try again.');
      }

    } catch (err) {
      // Handle API errors
      setError(err.message || 'An error occurred while processing your query');
      console.error('Query error:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  /**
   * Handle clarification submission
   * Flow: User answers clarification → API call → Handle response
   */
  const handleClarificationSubmit = useCallback(async (answer, clarificationSessionId) => {
    setLoading(true);
    setError(null);
    setClarificationState(prev => ({ ...prev, isOpen: false }));

    try {
      // Send clarification answer to backend
      const apiResponse = await sendClarification(answer, clarificationSessionId);

      // Normalize the response
      const normalizedResponse = normalizeResponse(apiResponse);

      // Handle the response
      if (normalizedResponse.status === 'success' || 
          normalizedResponse.status === 'rejected' ||
          normalizedResponse.status === 'error') {
        // Store sessionId for future requests
        if (normalizedResponse.sessionId) {
          setSessionId(normalizedResponse.sessionId);
        }
        setResponse(normalizedResponse);
      } else if (normalizedResponse.status === 'clarification_required') {
        // Another clarification is needed
        setSessionId(normalizedResponse.sessionId);
        setClarificationState({
          isOpen: true,
          question: normalizedResponse.question,
          options: normalizedResponse.options,
          sessionId: normalizedResponse.sessionId
        });
      } else {
        setError('Received an unknown response after clarification. Please try again.');
      }

    } catch (err) {
      setError(err.message || 'An error occurred while submitting your answer');
      console.error('Clarification error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Handle clarification cancellation
   */
  const handleClarificationCancel = useCallback(() => {
    setClarificationState({
      isOpen: false,
      question: '',
      options: [],
      sessionId: null
    });
    setError(null);
  }, []);

  /**
   * Handle error close
   */
  const handleErrorClose = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div className="dashboard">
      {/* Header Bar */}
      <HeaderBar 
        title="BASQ-V" 
        subtitle="Business-Aware Self-Reflective RAG Analytics"
      />

      {/* Query Input Section */}
      <div className="query-section">
        <QueryInput
          onSubmit={handleQuery}
          loading={loading}
          disabled={loading}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-section">
          <ErrorBox
            error={error}
            onClose={handleErrorClose}
          />
        </div>
      )}

      {/* Results Panel */}
      <div className="results-section">
        <ResultsPanel 
          response={response}
          loading={loading}
        />
      </div>

      {/* Clarification Modal */}
      <ClarificationModal
        isOpen={clarificationState.isOpen}
        sessionId={clarificationState.sessionId}
        clarificationQuestion={clarificationState.question}
        options={clarificationState.options}
        onSubmit={handleClarificationSubmit}
        onCancel={handleClarificationCancel}
        loading={loading}
      />

      {/* Loading Overlay */}
      <LoadingOverlay 
        isLoading={loading}
        message="Processing your query..."
      />
    </div>
  );
};

export default Dashboard;
