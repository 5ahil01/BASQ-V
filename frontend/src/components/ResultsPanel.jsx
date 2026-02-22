import React from "react";
import PropTypes from "prop-types";
import ChartView from "./ChartView";
import TableView from "./TableView";
import ExplainabilityPanel from "./ExplainabilityPanel";
import VerificationBadge from "./VerificationBadge";
import ConfidenceIndicator from "./ConfidenceIndicator";

/* ----------------------- */
/* Panel Wrapper Component */
/* ----------------------- */
const PanelWrapper = ({ children, className = "" }) => (
  <div
    className={`relative w-full rounded-[20px] border border-white/10
    bg-slate-800/70 backdrop-blur-xl p-8
    shadow-xl flex flex-col gap-6 overflow-hidden
    animate-fade-in ${className}`}
  >
    {/* Gradient Top Border */}
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-1
      bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
    />
    {children}
  </div>
);

/* ----------------------- */
/* Section Title */
/* ----------------------- */
const SectionTitle = ({ children }) => (
  <h2 className="text-[1.6rem] font-bold bg-gradient-to-br from-slate-200 to-slate-300 bg-clip-text text-transparent">
    {children}
  </h2>
);

/* ----------------------- */
/* Main Results Panel */
/* ----------------------- */
const ResultsPanel = ({ response, loading }) => {
  if (!response && !loading) return null;

  /* ---------- Loading State ---------- */
  if (loading) {
    return (
      <PanelWrapper>
        <div className="flex h-40 items-center justify-center text-slate-300 italic text-[1.1rem]">
          Loading results...
        </div>
      </PanelWrapper>
    );
  }

  /* ---------- Error / Rejected ---------- */
  if (response.status === "rejected" || response.status === "error") {
    return (
      <PanelWrapper>
        <SectionTitle>Query Result</SectionTitle>

        {response.verification && (
          <VerificationBadge
            verificationStatus={response.verification.status}
            message={response.verification.message}
          />
        )}

        {response.error && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-4">
            <h3 className="mb-2 text-xl font-bold text-red-300">
              Query Rejected
            </h3>
            <p className="text-slate-300">{response.error.message}</p>

            {response.error.code && (
              <small className="mt-2 block text-sm text-slate-400">
                Error Code: {response.error.code}
              </small>
            )}
          </div>
        )}

        {response.explainability && (
          <ExplainabilityPanel
            explainability={response.explainability}
            sql={response.sql}
          />
        )}
      </PanelWrapper>
    );
  }

  /* ---------- Success ---------- */
  if (response.status === "success") {
    const chartData = transformDataForChart(
      response.data,
      response.chartSuggestion,
    );

    return (
      <PanelWrapper>
        <SectionTitle>Query Results</SectionTitle>

        {/* Verification & Confidence */}
        <div className="flex flex-wrap items-center gap-4 border-b border-white/5 pb-5">
          {response.verification && (
            <VerificationBadge
              verificationStatus={response.verification.status}
              message={response.verification.message}
            />
          )}

          {response.confidence && (
            <ConfidenceIndicator
              score={response.confidence.score}
              label={response.confidence.label}
              reasons={response.confidence.reasons}
            />
          )}
        </div>

        {/* Chart */}
        {response.data?.length > 0 && (
          <ChartView
            data={chartData}
            chartType={response.chartSuggestion?.type || "bar"}
          />
        )}

        {/* Table */}
        {response.data?.length > 0 && <TableView data={response.data} />}

        {/* Explainability */}
        {response.explainability && (
          <ExplainabilityPanel
            explainability={response.explainability}
            sql={response.sql}
          />
        )}
      </PanelWrapper>
    );
  }

  /* ---------- Fallback ---------- */
  return (
    <div className="w-full rounded-[20px] border border-white/10 bg-slate-800/70 p-8 text-slate-300">
      Unknown response status
    </div>
  );
};

/* ----------------------- */
/* Chart Data Transformer */
/* ----------------------- */
const transformDataForChart = (data, chartSuggestion) => {
  if (!Array.isArray(data) || data.length === 0) return [];

  if (data[0]?.label !== undefined && data[0]?.value !== undefined) {
    return data;
  }

  const suggestedX = chartSuggestion?.x;
  const suggestedY = chartSuggestion?.y;

  return data.map((row, index) => {
    const keys = Object.keys(row);

    const labelKey =
      suggestedX && row[suggestedX] !== undefined ? suggestedX : keys[0];

    const valueKey =
      suggestedY && row[suggestedY] !== undefined ? suggestedY : keys[1];

    return {
      label: String(row[labelKey] ?? `Item ${index + 1}`),
      value: typeof row[valueKey] === "number" ? row[valueKey] : 0,
    };
  });
};

/* ----------------------- */
/* Prop Types */
/* ----------------------- */
ResultsPanel.propTypes = {
  response: PropTypes.shape({
    status: PropTypes.oneOf([
      "clarification_required",
      "success",
      "rejected",
      "error",
    ]),
    sessionId: PropTypes.string,
    sql: PropTypes.string,
    data: PropTypes.array,
    chartSuggestion: PropTypes.shape({
      type: PropTypes.string,
      x: PropTypes.string,
      y: PropTypes.string,
    }),
    explainability: PropTypes.object,
    verification: PropTypes.object,
    confidence: PropTypes.object,
    error: PropTypes.object,
  }),
  loading: PropTypes.bool,
};

ResultsPanel.defaultProps = {
  response: null,
  loading: false,
};

export default ResultsPanel;
