import React, { useState, useCallback } from "react";
import QueryInput from "../components/QueryInput";
import ClarificationModal from "../components/ClarificationModal";
import ResultsPanel from "../components/ResultsPanel";
import ErrorBox from "../components/ErrorBox";
import LoadingOverlay from "../components/LoadingOverlay";
import { sendQuery, sendClarification } from "../services/api";
import { normalizeResponse } from "../utils/responseMapper";

/* ── Tiny inline SVGs (zero extra deps) ──────────────── */
const IconSend = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IconChat = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
const IconPlus = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const HISTORY = [];

const SUGGESTIONS = [
  // "What drove revenue last quarter?",
  // "Show me top performing products",
  // "Customer churn by segment",
  // "Sales vs target by region",
];

const Dashboard = () => {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [activeIdx, setActiveIdx] = useState(null);

  const [clarificationState, setClarificationState] = useState({
    isOpen: false,
    question: "",
    options: [],
    sessionId: null,
  });

  const handleQuery = useCallback(
    async (query) => {
      setLoading(true);
      setError(null);
      setResponse(null);
      try {
        const raw = await sendQuery(query, sessionId);
        const norm = normalizeResponse(raw);

        if (norm.status === "clarification_required") {
          setSessionId(norm.sessionId);
          setClarificationState({
            isOpen: true,
            question: norm.question,
            options: norm.options,
            sessionId: norm.sessionId,
          });
        } else if (["success", "rejected", "error"].includes(norm.status)) {
          if (norm.sessionId) setSessionId(norm.sessionId);
          setResponse(norm);
        } else {
          setError(
            "Received an unknown response from the server. Please try again.",
          );
        }
      } catch (err) {
        setError(
          err.message || "An error occurred while processing your query",
        );
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  const handleClarificationSubmit = useCallback(
    async (answer, clarSessionId) => {
      setLoading(true);
      setError(null);
      setClarificationState((p) => ({ ...p, isOpen: false }));
      try {
        const raw = await sendClarification(answer, clarSessionId);
        const norm = normalizeResponse(raw);
        if (["success", "rejected", "error"].includes(norm.status)) {
          if (norm.sessionId) setSessionId(norm.sessionId);
          setResponse(norm);
        } else if (norm.status === "clarification_required") {
          setSessionId(norm.sessionId);
          setClarificationState({
            isOpen: true,
            question: norm.question,
            options: norm.options,
            sessionId: norm.sessionId,
          });
        } else {
          setError(
            "Received an unknown response after clarification. Please try again.",
          );
        }
      } catch (err) {
        setError(
          err.message || "An error occurred while submitting your answer",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleClarificationCancel = useCallback(() => {
    setClarificationState({
      isOpen: false,
      question: "",
      options: [],
      sessionId: null,
    });
    setError(null);
  }, []);

  const handleErrorClose = useCallback(() => setError(null), []);
  const handleNewChat = () => {
    setResponse(null);
    setError(null);
    setSessionId(null);
    setActiveIdx(null);
  };

  return (
    <div className="bv-shell">
      {/* ════ MAIN ════ */}
      <div className="bv-main">
        {/* Chat scroll area */}
        <div className="bv-chat">
          {/* Welcome state — shown when no response and no error */}
          {!response && !error && (
            <div className="bv-welcome">
              <h1 className="bv-welcome-title">
                Ask your business data anything
              </h1>
              <p className="bv-welcome-sub">
                BASQ-V understands your business context and delivers precise,
                source-backed analytics answers — just ask in plain language.
              </p>
              <div className="bv-chip-row">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="bv-suggestion"
                    onClick={() => handleQuery(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bv-error-wrap">
              <ErrorBox error={error} onClose={handleErrorClose} />
            </div>
          )}

          {/* Results */}
          {response && (
            <div className="bv-results-wrap">
              <ResultsPanel response={response} loading={loading} />
            </div>
          )}
        </div>

        {/* Input footer */}
        <div className="bv-input-footer">
          <div className="bv-input-label">Ask a business question</div>
          <div className="bv-input-box px-[100px] ">
            <QueryInput
              onSubmit={handleQuery}
              loading={loading}
              disabled={loading}
            />
          </div>
          <p className="bv-input-hint">
            <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for
            new line
          </p>
        </div>
      </div>
      {/* /bv-main */}

      {/* Modals */}
      <ClarificationModal
        isOpen={clarificationState.isOpen}
        sessionId={clarificationState.sessionId}
        clarificationQuestion={clarificationState.question}
        options={clarificationState.options}
        onSubmit={handleClarificationSubmit}
        onCancel={handleClarificationCancel}
        loading={loading}
      />

      <LoadingOverlay
        isLoading={loading}
        message="Analyzing your business data…"
      />
    </div>
  );
};

export default Dashboard;
