import React, { useState, useCallback } from "react";
import QueryInput from "../components/QueryInput";
import ClarificationModal from "../components/ClarificationModal";
import ResultsPanel from "../components/ResultsPanel";
import ErrorBox from "../components/ErrorBox";
import LoadingOverlay from "../components/LoadingOverlay";
import HeaderBar from "../components/HeaderBar";
import { sendQuery, sendClarification } from "../services/api";
import { normalizeResponse } from "../utils/responseMapper";

const Dashboard = () => {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading]     = useState(false);
  const [response, setResponse]   = useState(null);
  const [error, setError]         = useState(null);

  const [clarificationState, setClarificationState] = useState({
    isOpen: false, question: "", options: [], sessionId: null,
  });

  const handleQuery = useCallback(async (query) => {
    setLoading(true); setError(null); setResponse(null);
    try {
      const apiResponse        = await sendQuery(query, sessionId);
      const normalizedResponse = normalizeResponse(apiResponse);
      if (normalizedResponse.status === "clarification_required") {
        setSessionId(normalizedResponse.sessionId);
        setClarificationState({ isOpen: true, question: normalizedResponse.question, options: normalizedResponse.options, sessionId: normalizedResponse.sessionId });
        setResponse(null);
      } else if (["success","rejected","error"].includes(normalizedResponse.status)) {
        if (normalizedResponse.sessionId) setSessionId(normalizedResponse.sessionId);
        setResponse(normalizedResponse);
      } else {
        setError("Received an unknown response from the server. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An error occurred while processing your query");
    } finally { setLoading(false); }
  }, [sessionId]);

  const handleClarificationSubmit = useCallback(async (answer, clarificationSessionId) => {
    setLoading(true); setError(null);
    setClarificationState((prev) => ({ ...prev, isOpen: false }));
    try {
      const apiResponse        = await sendClarification(answer, clarificationSessionId);
      const normalizedResponse = normalizeResponse(apiResponse);
      if (["success","rejected","error"].includes(normalizedResponse.status)) {
        if (normalizedResponse.sessionId) setSessionId(normalizedResponse.sessionId);
        setResponse(normalizedResponse);
      } else if (normalizedResponse.status === "clarification_required") {
        setSessionId(normalizedResponse.sessionId);
        setClarificationState({ isOpen: true, question: normalizedResponse.question, options: normalizedResponse.options, sessionId: normalizedResponse.sessionId });
      } else {
        setError("Received an unknown response after clarification. Please try again.");
      }
    } catch (err) {
      setError(err.message || "An error occurred while submitting your answer");
    } finally { setLoading(false); }
  }, []);

  const handleClarificationCancel = useCallback(() => {
    setClarificationState({ isOpen: false, question: "", options: [], sessionId: null });
    setError(null);
  }, []);

  const handleErrorClose = useCallback(() => setError(null), []);

  return (
    <div className="dv-page">

      {/* ── Top navbar ── */}
      <nav className="dv-navbar">
        <div className="dv-navbar-inner">
          <div className="dv-navbar-brand">
            <span className="dv-brand-icon">B</span>
            <span className="dv-brand-name">BASQ<span>-V</span></span>
          </div>
          <span className="dv-navbar-live">
            <span className="dv-live-dot" />
            Live
          </span>
        </div>
      </nav>

      {/* ── Page body ── */}
      <main className="dv-body">

        {/* ── Header section ── */}
        <div className="dv-header-section">
          <HeaderBar
            title="BASQ-V"
            subtitle="Business Analytics through Schema-Aware Query Validation"
          />
        </div>

        {/* ── Query card ── */}
        <section className="dv-query-section">
          <div className="dv-section-label">Ask a question</div>
          <div className="dv-query-card">
            <QueryInput onSubmit={handleQuery} loading={loading} disabled={loading} />
          </div>
          <p className="dv-query-hint">
            Press <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
          </p>
        </section>

        {/* ── Error ── */}
        {error && (
          <section className="dv-error-section">
            <ErrorBox error={error} onClose={handleErrorClose} />
          </section>
        )}

        {/* ── Results ── */}
        <section className="dv-results-section">
          <ResultsPanel response={response} loading={loading} />
        </section>

      </main>

      <ClarificationModal
        isOpen={clarificationState.isOpen}
        sessionId={clarificationState.sessionId}
        clarificationQuestion={clarificationState.question}
        options={clarificationState.options}
        onSubmit={handleClarificationSubmit}
        onCancel={handleClarificationCancel}
        loading={loading}
      />

      <LoadingOverlay isLoading={loading} message="Processing your query..." />
    </div>
  );
};

export default Dashboard;