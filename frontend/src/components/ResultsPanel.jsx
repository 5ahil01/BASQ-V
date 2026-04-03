import React from "react";
import PropTypes from "prop-types";
import ChartView from "./ChartView";
import TableView from "./TableView";
import ExplainabilityPanel from "./ExplainabilityPanel";

/* ─────────────────────────────────────────────
   Panel shell
   ───────────────────────────────────────────── */
const Panel = ({ children, className = "" }) => (
  <div
    className={`relative w-full rounded-[20px] border border-white/10
      bg-slate-800/70 backdrop-blur-xl p-8 shadow-xl
      flex flex-col gap-6 overflow-hidden animate-fade-in ${className}`}
  >
    {children}
  </div>
);

/* ─────────────────────────────────────────────
   Confidence badge
   Maps numeric score → label + colour
   ───────────────────────────────────────────── */
const ConfidenceBadge = ({ score, label }) => {
  const pct = Math.round((score ?? 0) * 100);

  const colour =
    pct >= 70
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : pct >= 40
        ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
        : "bg-red-500/20 text-red-300 border-red-500/30";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colour}`}
    >
      SQL confidence: {label ?? `${pct}%`}
    </span>
  );
};

/* ─────────────────────────────────────────────
   Recommendation badge
   Shows REVIEW / APPROVE etc. from the API
   ───────────────────────────────────────────── */
const RecommendationBadge = ({ recommendation }) => {
  if (!recommendation) return null;

  const colour =
    recommendation === "APPROVE"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : "bg-amber-500/20 text-amber-300 border-amber-500/30";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${colour}`}
    >
      {recommendation}
    </span>
  );
};

/* ─────────────────────────────────────────────
   SQL disclosure block
   ───────────────────────────────────────────── */
const SqlBlock = ({ sql }) => {
  if (!sql) return null;
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors select-none">
        View generated SQL
      </summary>
      <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900/60 border border-white/10 p-4 text-xs text-slate-300 font-mono leading-relaxed">
        {sql}
      </pre>
    </details>
  );
};

/* ─────────────────────────────────────────────
   ResultsPanel
   ───────────────────────────────────────────── */
const ResultsPanel = ({ response, loading }) => {
  /* Nothing to show */
  if (!response && !loading) return null;

  /* Loading */
  if (loading) {
    return (
      <Panel>
        <div className="flex h-40 items-center justify-center text-slate-300 italic text-base">
          Running query…
        </div>
      </Panel>
    );
  }

  /* ── Error / Rejected ── */
  if (response.status === "rejected" || response.status === "error") {
    return (
      <Panel>
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-5 py-4">
          <h3 className="mb-1.5 text-lg font-semibold text-red-300">
            {response.status === "rejected" ? "Query Rejected" : "Error"}
          </h3>
          <p className="text-slate-300 text-sm">
            {response.error?.message ?? "An unexpected error occurred."}
          </p>
          {response.error?.code && (
            <p className="mt-1.5 text-xs text-slate-500">
              Code: {response.error.code}
            </p>
          )}
        </div>

        {response.explainability && (
          <ExplainabilityPanel
            explainability={response.explainability}
            sql={response.sql_query}
          />
        )}
      </Panel>
    );
  }

  /* ── Success ── */
  if (response.status === "success") {
    const {
      result, // actual row data  (API field name)
      data, // fallback alias
      chart_suggestion, // { type, x?, y?, metadata? }
      sql_query,
      sql_confidence,
      recommendation,
      explainability,
    } = response;

    const rows = result ?? data ?? [];
    const chartType = chart_suggestion?.type ?? "bar";

    return (
      <Panel>
        {/* Header row — badges */}
        <div className="flex flex-wrap items-center gap-3">
          {sql_confidence !== undefined && (
            <ConfidenceBadge score={sql_confidence} />
          )}
          <RecommendationBadge recommendation={recommendation} />
        </div>

        {/* Chart */}
        {rows.length > 0 && <ChartView data={rows} chartType={chartType} />}

        {/* Chart metadata (the LLM reason string) */}
        {chart_suggestion?.metadata && (
          <p className="text-xs text-slate-500 italic leading-relaxed">
            {chart_suggestion.metadata}
          </p>
        )}

        {/* Table — always shown below chart */}
        {rows.length > 0 && <TableView data={rows} />}

        {/* SQL disclosure */}
        <SqlBlock sql={sql_query} />

        {/* Explainability */}
        {explainability && (
          <ExplainabilityPanel
            explainability={explainability}
            sql={sql_query}
          />
        )}
      </Panel>
    );
  }

  /* ── Fallback ── */
  return (
    <div className="w-full rounded-[20px] border border-white/10 bg-slate-800/70 p-8 text-slate-400 text-sm">
      Unknown response status: {response.status}
    </div>
  );
};

/* Prop types*/
ResultsPanel.propTypes = {
  response: PropTypes.shape({
    status: PropTypes.oneOf([
      "success",
      "rejected",
      "error",
      "clarification_required",
    ]),
    result: PropTypes.array, // primary data field from API
    data: PropTypes.array, // legacy alias
    chart_suggestion: PropTypes.shape({
      type: PropTypes.string,
      x: PropTypes.string,
      y: PropTypes.string,
      metadata: PropTypes.string,
    }),
    sql_query: PropTypes.string,
    sql_confidence: PropTypes.number,
    recommendation: PropTypes.string,
    explainability: PropTypes.object,
    error: PropTypes.shape({
      message: PropTypes.string,
      code: PropTypes.string,
    }),
  }),
  loading: PropTypes.bool,
};

ResultsPanel.defaultProps = {
  response: null,
  loading: false,
};

export default ResultsPanel;
