import React, { useMemo } from "react";
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
  Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { normalisers } from "../utils/Normalise";
import {
  PALETTE,
  GRID_COLOR,
  TICK_COLOR,
  TOOLTIP_BG,
  AXIS_DEFAULTS,
} from "../utils/chartTokens";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Filler,
);

/* ─────────────────────────────────────────────
   Shared options factory
   ───────────────────────────────────────────── */
const baseOptions = (extra = {}) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: TOOLTIP_BG,
      titleColor: "#f1f5f9",
      bodyColor: "#cbd5e1",
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: (ctx) =>
          ` ${ctx.dataset.label ?? "Value"}: ${Number(
            ctx.parsed.y ?? ctx.parsed,
          ).toLocaleString()}`,
      },
    },
  },
  ...extra,
});

/* ─────────────────────────────────────────────
   Custom legend strip
   ───────────────────────────────────────────── */
const ChartLegend = ({ items }) => (
  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
    {items.map(({ label, color }) => (
      <span
        key={label}
        className="flex items-center gap-1.5 text-xs text-slate-400"
      >
        <span
          className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
          style={{ background: color }}
        />
        {label}
      </span>
    ))}
  </div>
);

/* ─────────────────────────────────────────────
   Chart renderers
   ───────────────────────────────────────────── */

/* Bar / Horizontal Bar */
const BarChart = ({ norm, horizontal }) => {
  const datasets = [
    {
      label: norm.yKey,
      data: norm.values,
      backgroundColor: norm.values.map((_, i) => PALETTE[i % PALETTE.length]),
      borderRadius: 4,
      borderSkipped: false,
    },
    ...norm.extraSeries,
  ];

  const options = baseOptions({
    indexAxis: horizontal ? "y" : "x",
    scales: {
      x: {
        ...AXIS_DEFAULTS,
        ticks: { ...AXIS_DEFAULTS.ticks, maxRotation: 40 },
      },
      y: { ...AXIS_DEFAULTS },
    },
  });

  const height = horizontal ? Math.max(280, norm.labels.length * 36 + 60) : 320;
  const legendItems = datasets.map((ds, i) => ({
    label: ds.label,
    color: Array.isArray(ds.backgroundColor)
      ? PALETTE[i % PALETTE.length]
      : ds.backgroundColor,
  }));

  return (
    <>
      <div style={{ height }} className="w-full">
        <Bar data={{ labels: norm.labels, datasets }} options={options} />
      </div>
      <ChartLegend items={legendItems} />
    </>
  );
};

/* Line / Area */
const LineChart = ({ norm, area }) => {
  const datasets = [
    {
      label: norm.yKey,
      data: norm.values,
      borderColor: PALETTE[0],
      backgroundColor: area ? `${PALETTE[0]}33` : "transparent",
      fill: area,
      tension: 0.35,
      pointRadius: norm.values.length > 60 ? 0 : 3,
      pointHoverRadius: 5,
    },
    ...norm.extraSeries.map((s, i) => ({
      ...s,
      borderColor: PALETTE[i + 1],
      backgroundColor: "transparent",
      fill: false,
      tension: 0.35,
      pointRadius: 3,
    })),
  ];

  const options = baseOptions({
    scales: {
      x: {
        ...AXIS_DEFAULTS,
        ticks: { ...AXIS_DEFAULTS.ticks, maxRotation: 40 },
      },
      y: { ...AXIS_DEFAULTS },
    },
  });

  const legendItems = datasets.map((ds, i) => ({
    label: ds.label,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <>
      <div style={{ height: 320 }} className="w-full">
        <Line data={{ labels: norm.labels, datasets }} options={options} />
      </div>
      <ChartLegend items={legendItems} />
    </>
  );
};

/* Pie / Doughnut */
const PieChart = ({ norm, doughnut }) => {
  const data = {
    labels: norm.labels,
    datasets: [
      {
        data: norm.values,
        backgroundColor: norm.labels.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 2,
        borderColor: "#1e293b",
        hoverOffset: 6,
      },
    ],
  };

  const options = baseOptions({
    plugins: {
      ...baseOptions().plugins,
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
            return ` ${ctx.label}: ${Number(ctx.parsed).toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  });

  const legendItems = norm.labels.map((label, i) => ({
    label,
    color: PALETTE[i % PALETTE.length],
  }));

  const Component = doughnut ? Doughnut : Pie;

  return (
    <>
      <div style={{ height: 300 }} className="flex justify-center w-full">
        <Component data={data} options={options} />
      </div>
      <ChartLegend items={legendItems} />
    </>
  );
};

/* Scatter */
const ScatterChart = ({ rawData, xKey, yKey }) => {
  const keys = rawData.length ? Object.keys(rawData[0]) : [];
  const rx = xKey || keys[0];
  const ry = yKey || keys[1];

  const points = rawData
    .filter((r) => typeof r[rx] === "number" && typeof r[ry] === "number")
    .map((r) => ({ x: r[rx], y: r[ry] }));

  const data = {
    datasets: [
      {
        label: `${rx} vs ${ry}`,
        data: points,
        backgroundColor: `${PALETTE[0]}bb`,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
    ],
  };

  const options = baseOptions({
    plugins: {
      ...baseOptions().plugins,
      tooltip: {
        ...baseOptions().plugins.tooltip,
        callbacks: {
          label: (ctx) => ` (${ctx.parsed.x}, ${ctx.parsed.y})`,
        },
      },
    },
    scales: {
      x: {
        ...AXIS_DEFAULTS,
        type: "linear",
        title: { display: true, text: rx, color: TICK_COLOR },
      },
      y: {
        ...AXIS_DEFAULTS,
        title: { display: true, text: ry, color: TICK_COLOR },
      },
    },
  });

  return (
    <>
      <div style={{ height: 320 }} className="w-full">
        <Scatter data={data} options={options} />
      </div>
      <ChartLegend items={[{ label: `${rx} vs ${ry}`, color: PALETTE[0] }]} />
    </>
  );
};

/* KPI card */
const KpiCard = ({ rawData }) => {
  const row = rawData?.[0] ?? {};
  const keys = Object.keys(row);
  const label = keys[0] ?? "Result";
  const value = row[keys[1]] ?? row[keys[0]];

  return (
    <div className="flex items-center justify-center h-48 rounded-2xl bg-slate-700/40 border border-white/10">
      <div className="text-center">
        <div className="text-5xl font-bold text-white tracking-tight">
          {typeof value === "number"
            ? value.toLocaleString()
            : String(value ?? "—")}
        </div>
        <div className="mt-2 text-slate-400 text-base">{label}</div>
      </div>
    </div>
  );
};

/* True CSS grid heatmap — no plugin required */
const HeatmapChart = ({ norm }) => {
  const { rawRows, xKey, yKey } = norm;
  if (!rawRows?.length) return null;

  const keys = Object.keys(rawRows[0]);
  const rowKey = xKey || keys[0];
  const colKey = yKey || keys[1];
  const valueKey =
    keys.find((k) => k !== rowKey && k !== colKey) || keys[2] || keys[1];

  const rowLabels = [...new Set(rawRows.map((r) => r[rowKey]))];
  const colLabels = [...new Set(rawRows.map((r) => r[colKey]))];
  const allValues = rawRows.map((r) => Number(r[valueKey]) || 0);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  const lookup = new Map(
    rawRows.map((r) => [
      `${r[rowKey]}||${r[colKey]}`,
      Number(r[valueKey]) || 0,
    ]),
  );

  const cellBg = (v) => {
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return `rgba(55,138,221,${(0.15 + t * 0.75).toFixed(2)})`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>
            <th className="p-2 text-slate-500 text-left font-medium">
              {rowKey} \ {colKey}
            </th>
            {colLabels.map((c) => (
              <th
                key={c}
                className="p-2 text-slate-400 font-medium text-center whitespace-nowrap"
              >
                {String(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowLabels.map((row) => (
            <tr key={row}>
              <td className="p-2 text-slate-400 font-medium whitespace-nowrap">
                {String(row)}
              </td>
              {colLabels.map((col) => {
                const v = lookup.get(`${row}||${col}`);
                return (
                  <td
                    key={col}
                    title={v !== undefined ? `${valueKey}: ${v}` : "No data"}
                    className="p-1.5 text-center rounded text-slate-200 font-mono"
                    style={{
                      background:
                        v !== undefined ? cellBg(v) : "rgba(30,41,59,0.4)",
                    }}
                  >
                    {v !== undefined ? v.toLocaleString() : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* Data table (fallback + explicit "table" type) */
const DataTable = ({ rawData }) => {
  if (!rawData?.length) return null;
  const cols = Object.keys(rawData[0]);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-700/60 text-slate-300">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-4 py-2.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-slate-300 divide-y divide-white/5">
          {rawData.map((row, i) => (
            <tr key={i} className="hover:bg-white/5 transition-colors">
              {cols.map((c) => (
                <td key={c} className="px-4 py-2.5 font-mono text-xs">
                  {typeof row[c] === "number"
                    ? row[c].toLocaleString()
                    : String(row[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ChartView = ({ data, chartType }) => {
  const type = (chartType ?? "bar").toLowerCase();

  const norm = useMemo(() => {
    return normalisers[type]?.(data) ?? normalisers.bar(data);
  }, [data, type]);

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-slate-700/30 text-slate-400 text-sm italic">
        No data to display
      </div>
    );
  }

  const renderChart = () => {
    try {
      console.log(type);

      switch (type) {
        case "bar":
          return <BarChart norm={norm} horizontal={false} />;
        case "horizontalbar":
          return <BarChart norm={norm} horizontal />;
        case "line":
          return <LineChart norm={norm} area={false} />;
        case "area":
          return <LineChart norm={norm} area />;
        case "pie":
          return <PieChart norm={norm} doughnut={false} />;
        case "doughnut":
          return <PieChart norm={norm} doughnut />;
        case "scatter":
          return <ScatterChart rawData={data} xKey={xKey} yKey={yKey} />;
        case "heatmap":
          return <HeatmapChart norm={norm} />;
        case "kpi":
          return <KpiCard rawData={data} />;
        case "table":
          return <DataTable rawData={data} />;
        default:
          return (
            <div className="space-y-3">
              <p className="text-slate-400 text-sm italic text-center">
                Unknown chart type "{chartType}" — showing table instead.
              </p>
              <DataTable rawData={data} />
            </div>
          );
      }
    } catch (err) {
      console.error("[ChartView] render error:", err);
      return (
        <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-red-300 text-sm space-y-3">
          <p>Failed to render chart. Showing raw data instead.</p>
          <DataTable rawData={data} />
        </div>
      );
    }
  };

  return (
    <div className="w-full rounded-2xl bg-slate-800/60 border border-white/10 p-6">
      {renderChart()}
    </div>
  );
};

ChartView.propTypes = {
  data: PropTypes.array,
  chartType: PropTypes.string,
  xKey: PropTypes.string,
  yKey: PropTypes.string,
};

ChartView.defaultProps = {
  data: [],
  chartType: "bar",
  xKey: null,
  yKey: null,
};

export default ChartView;
