/**
 * normalise.js
 *
 * One normaliser per chart type.
 * Each function receives raw API rows (array of plain objects) and returns
 * exactly the shape that its chart renderer needs — nothing more.
 *
 * Naming convention:
 *   normaliseFor<ChartType>(rawData) → specific shape
 *
 * Usage in ChartView:
 *   import { normalisers } from "./normalise";
 *   const norm = normalisers[chartType]?.(data) ?? normalisers.bar(data);
 */

import { PALETTE } from "./chartTokens"; // your colour constants

/* ─────────────────────────────────────────────────────────────
   Shared helpers
   ───────────────────────────────────────────────────────────── */

/** Check if a value is fundamentally numeric, even if returned as string from API */
const isNumeric = (val) => {
  if (typeof val === "number") return !isNaN(val);
  if (typeof val === "string" && val.trim() !== "") return !isNaN(Number(val));
  return false;
};

/** Safely parse a value to number */
const toNumber = (val) => {
  if (typeof val === "number") return val;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
};

/**
 * Pick the best label (X) column.
 * Preference order: first strictly string col → first col.
 */
const resolveXKey = (row, keys) => {
  return keys.find((k) => typeof row[k] === "string" && !isNumeric(row[k])) ?? keys[0];
};

/**
 * Pick the best value (Y) column.
 * Preference order: first numeric col → second col.
 */
const resolveYKey = (row, keys, excludeKey) => {
  return (
    keys.find((k) => k !== excludeKey && isNumeric(row[k])) ??
    keys[1] ??
    keys[0]
  );
};

/** All numeric columns that are not the primary X or Y. */
const extraNumericCols = (row, keys, xKey, yKey) =>
  keys.filter((k) => k !== xKey && k !== yKey && isNumeric(row[k]));

/** Guard: return true only for non-empty arrays. */
const isEmpty = (rawData) => !Array.isArray(rawData) || rawData.length === 0;

/** Shared empty result to avoid repeating the object literal. */
const EMPTY = {
  labels: [],
  values: [],
  extraSeries: [],
  rawRows: [],
  xKey: "",
  yKey: "",
};

/* ─────────────────────────────────────────────────────────────
   1. BAR  (vertical)
   Returns: { labels[], values[], extraSeries[], xKey, yKey }

   Each label → one bar.
   Extra numeric columns → additional datasets (grouped bar).
   ───────────────────────────────────────────────────────────── */
export const normaliseForBar = (rawData) => {
  if (isEmpty(rawData)) return EMPTY;

  const keys = Object.keys(rawData[0]);
  const rx = resolveXKey(rawData[0], keys);
  const ry = resolveYKey(rawData[0], keys, rx);
  const extra = extraNumericCols(rawData[0], keys, rx, ry);

  return {
    labels: rawData.map((r, i) => String(r[rx] ?? `Row ${i + 1}`)),
    values: rawData.map((r) => toNumber(r[ry])),
    extraSeries: extra.map((col, ci) => ({
      label: col,
      data: rawData.map((r) => toNumber(r[col])),
      backgroundColor: PALETTE[(ci + 1) % PALETTE.length],
      borderColor: PALETTE[(ci + 1) % PALETTE.length],
    })),
    rawRows: rawData,
    xKey: rx,
    yKey: ry,
  };
};

/* ─────────────────────────────────────────────────────────────
   2. HORIZONTAL BAR
   Same shape as bar — the renderer flips indexAxis.
   Sorts descending by value so the longest bar is always on top.
   ───────────────────────────────────────────────────────────── */
export const normaliseForHorizontalBar = (rawData) => {
  if (isEmpty(rawData)) return EMPTY;

  const keys = Object.keys(rawData[0]);
  const rx = resolveXKey(rawData[0], keys);
  const ry = resolveYKey(rawData[0], keys, rx);

  // Sort descending so the largest value sits at the top of the chart
  const sorted = [...rawData].sort((a, b) => toNumber(b[ry]) - toNumber(a[ry]));

  const extra = extraNumericCols(rawData[0], keys, rx, ry);

  return {
    labels: sorted.map((r, i) => String(r[rx] ?? `Row ${i + 1}`)),
    values: sorted.map((r) => toNumber(r[ry])),
    extraSeries: extra.map((col, ci) => ({
      label: col,
      data: sorted.map((r) => toNumber(r[col])),
      backgroundColor: PALETTE[(ci + 1) % PALETTE.length],
      borderColor: PALETTE[(ci + 1) % PALETTE.length],
    })),
    rawRows: sorted,
    xKey: rx,
    yKey: ry,
  };
};

/* ─────────────────────────────────────────────────────────────
   3. LINE
   Returns: { labels[], datasets[] }

   labels  = the X axis (time or ordered category)
   datasets = one per numeric column — each is a full Chart.js dataset object.

   Unlike bar, line charts often have multiple Y series (e.g. revenue + orders
   over the same months), so we build the full dataset array here rather than
   returning a flat values[].
   ───────────────────────────────────────────────────────────── */
export const normaliseForLine = (rawData, area = false) => {
  if (isEmpty(rawData)) return { labels: [], datasets: [], rawRows: [] };

  const keys = Object.keys(rawData[0]);
  const rx = resolveXKey(rawData[0], keys);
  const ry = resolveYKey(rawData[0], keys, rx);
  const extra = extraNumericCols(rawData[0], keys, rx, ry);

  const allYCols = [ry, ...extra]; // primary series first, then extras

  const datasets = allYCols.map((col, ci) => ({
    label: col,
    data: rawData.map((r) => toNumber(r[col])),
    borderColor: PALETTE[ci % PALETTE.length],
    backgroundColor: area
      ? `${PALETTE[ci % PALETTE.length]}33` // 20 % opacity fill for area
      : "transparent",
    fill: area,
    tension: 0.35,
    pointRadius: rawData.length > 60 ? 0 : 3, // hide points on dense series
    pointHoverRadius: 5,
  }));

  return {
    labels: rawData.map((r, i) => String(r[rx] ?? `Row ${i + 1}`)),
    datasets,
    rawRows: rawData,
    xKey: rx,
  };
};

/* ─────────────────────────────────────────────────────────────
   4. AREA
   Identical to line but area = true baked in.
   ───────────────────────────────────────────────────────────── */
export const normaliseForArea = (rawData) => normaliseForLine(rawData, true);

/* ─────────────────────────────────────────────────────────────
   5. PIE  /  6. DOUGHNUT
   Returns: { labels[], values[], colors[] }

   Pie needs proportional data — every value must be positive.
   Negative values are clamped to 0 with a warning.
   Limited to MAX_SEGMENTS slices; remainder collapsed to "Other".
   ───────────────────────────────────────────────────────────── */
const MAX_PIE_SEGMENTS = 7;

const _normaliseForPieFamily = (rawData) => {
  if (isEmpty(rawData))
    return { labels: [], values: [], colors: [], rawRows: [] };

  const keys = Object.keys(rawData[0]);
  const rx = resolveXKey(rawData[0], keys);
  const ry = resolveYKey(rawData[0], keys, rx);

  // Sort descending so the largest slice comes first
  const sorted = [...rawData].sort((a, b) => toNumber(b[ry]) - toNumber(a[ry]));

  let rows = sorted;
  let hasOther = false;

  if (sorted.length > MAX_PIE_SEGMENTS) {
    const top = sorted.slice(0, MAX_PIE_SEGMENTS - 1);
    const rest = sorted.slice(MAX_PIE_SEGMENTS - 1);
    const otherSum = rest.reduce((acc, r) => acc + (toNumber(r[ry]) || 0), 0);
    rows = [...top, { [rx]: "Other", [ry]: otherSum }];
    hasOther = true;
  }

  const labels = rows.map((r) => String(r[rx] ?? "Unknown"));
  const values = rows.map((r) => Math.max(0, toNumber(r[ry]))); // clamp negatives
  const colors = labels.map((_, i) => PALETTE[i % PALETTE.length]);

  return {
    labels,
    values,
    colors,
    rawRows: rawData,
    xKey: rx,
    yKey: ry,
    hasOther,
  };
};

export const normaliseForPie = (rawData) => _normaliseForPieFamily(rawData);
export const normaliseForDoughnut = (rawData) =>
  _normaliseForPieFamily(rawData);

/* ─────────────────────────────────────────────────────────────
   7. SCATTER
   Returns: { points[], xLabel, yLabel }

   Requires exactly 2 numeric columns.
   An optional third string column is used as the point label in tooltips.
   ───────────────────────────────────────────────────────────── */
export const normaliseForScatter = (rawData) => {
  if (isEmpty(rawData))
    return { points: [], xLabel: "", yLabel: "", rawRows: [] };

  const keys = Object.keys(rawData[0]);
  const numericCols = keys.filter((k) => isNumeric(rawData[0][k]));
  const stringCols = keys.filter((k) => typeof rawData[0][k] === "string" && !isNumeric(rawData[0][k]));

  // Resolve X and Y from numeric columns
  const rx = numericCols[0] ?? keys[0];
  const ry = numericCols.find((k) => k !== rx) ?? keys[1] ?? keys[0];

  // Optional label column for tooltip identification
  const labelCol = stringCols[0] ?? null;

  const points = rawData
    .filter((r) => isNumeric(r[rx]) && isNumeric(r[ry]))
    .map((r) => ({
      x: toNumber(r[rx]),
      y: toNumber(r[ry]),
      label: labelCol ? String(r[labelCol]) : null, // used in tooltip callback
    }));

  return {
    points,
    xLabel: rx,
    yLabel: ry,
    rawRows: rawData,
  };
};

/* ─────────────────────────────────────────────────────────────
   8. HEATMAP
   Returns: { rowLabels[], colLabels[], cellMap, valueKey, min, max }

   Expects 3 columns: row dimension, column dimension, numeric value.
   cellMap is a Map keyed by "rowVal||colVal" for O(1) lookup in the renderer.
   ───────────────────────────────────────────────────────────── */
export const normaliseForHeatmap = (rawData) => {
  if (isEmpty(rawData))
    return {
      rowLabels: [],
      colLabels: [],
      cellMap: new Map(),
      valueKey: "",
      min: 0,
      max: 0,
      rawRows: [],
    };

  const keys = Object.keys(rawData[0]);
  const stringCols = keys.filter((k) => typeof rawData[0][k] === "string" && !isNumeric(rawData[0][k]));
  const numCols = keys.filter((k) => isNumeric(rawData[0][k]));

  // Row dimension = first string col
  const rowKey = stringCols[0] ?? keys[0];
  // Column dimension = second string col
  const colKey = stringCols[1] ?? keys[1] ?? keys[0];
  // Value = first numeric col that isn't row/col key
  const valueKey =
    numCols.find((k) => k !== rowKey && k !== colKey) ??
    numCols[0] ??
    keys[2] ??
    keys[1];

  // Preserve insertion order for axis labels
  const rowLabels = [...new Map(rawData.map((r) => [r[rowKey], true])).keys()];
  const colLabels = [...new Map(rawData.map((r) => [r[colKey], true])).keys()];

  const cellMap = new Map(
    rawData.map((r) => [
      `${r[rowKey]}||${r[colKey]}`,
      toNumber(r[valueKey]),
    ]),
  );

  const allValues = [...cellMap.values()];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return {
    rowLabels,
    colLabels,
    cellMap,
    valueKey,
    min,
    max,
    rawRows: rawData,
  };
};

/* ─────────────────────────────────────────────────────────────
   9. KPI
   Returns: { value, label, secondaryStats[] }

   Single-value display.
   If the result has exactly 1 row, the first numeric col is the headline.
   If there are multiple rows (e.g. comparison KPIs), each row becomes a card.
   ───────────────────────────────────────────────────────────── */
export const normaliseForKpi = (rawData) => {
  if (isEmpty(rawData))
    return { value: null, label: "—", secondaryStats: [], rawRows: [] };

  const keys = Object.keys(rawData[0]);
  const numericKey =
    keys.find((k) => isNumeric(rawData[0][k])) ?? keys[0];
  const labelKey = keys.find((k) => typeof rawData[0][k] === "string" && !isNumeric(rawData[0][k])) ?? null;

  // Single value KPI
  if (rawData.length === 1) {
    const row = rawData[0];
    return {
      value: row[numericKey] !== undefined ? toNumber(row[numericKey]) : null,
      label: labelKey ? String(row[labelKey]) : numericKey,
      secondaryStats: keys
        .filter(
          (k) =>
            k !== numericKey && k !== labelKey && isNumeric(row[k]),
        )
        .map((k) => ({ label: k, value: toNumber(row[k]) })),
      rawRows: rawData,
    };
  }

  // Multiple rows → return all as individual stat cards
  return {
    value: null, // no single headline
    label: numericKey,
    cards: rawData.map((r) => ({
      label: labelKey ? String(r[labelKey]) : String(r[keys[0]]),
      value: r[numericKey] !== undefined ? toNumber(r[numericKey]) : null,
    })),
    rawRows: rawData,
  };
};

/* ─────────────────────────────────────────────────────────────
   10. TABLE
   Returns: { columns[], rows[] }

   columns: ordered list of column definitions for the table header.
   rows:    raw data rows (no transformation needed — passed through).
   ───────────────────────────────────────────────────────────── */
export const normaliseForTable = (rawData) => {
  if (isEmpty(rawData)) return { columns: [], rows: [], rawRows: [] };

  const columns = Object.keys(rawData[0]).map((key) => ({
    key,
    label: key, // display header
    numeric: isNumeric(rawData[0][key]), // right-align numeric cols
  }));

  return { columns, rows: rawData, rawRows: rawData };
};

/* ─────────────────────────────────────────────────────────────
   Dispatcher map
   Import this in ChartView and call:
     const norm = normalisers[chartType]?.(data)
                   ?? normalisers.bar(data);
   ───────────────────────────────────────────────────────────── */
export const normalisers = {
  bar: normaliseForBar,
  horizontalbar: normaliseForHorizontalBar,
  line: normaliseForLine,
  area: normaliseForArea,
  pie: normaliseForPie,
  doughnut: normaliseForDoughnut,
  scatter: normaliseForScatter,
  heatmap: normaliseForHeatmap,
  kpi: normaliseForKpi,
  table: normaliseForTable,
};
