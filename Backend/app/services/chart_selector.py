import os
import re
import json
from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage


# ---------------------------------------------------------------------------
# Enums & Models
# ---------------------------------------------------------------------------

class ChartType(str, Enum):
    BAR             = "bar"
    HORIZONTAL_BAR  = "horizontalBar"
    LINE            = "line"
    AREA            = "area"
    PIE             = "pie"
    DOUGHNUT        = "doughnut"
    SCATTER         = "scatter"
    HEATMAP         = "heatmap"
    TABLE           = "table"
    KPI             = "kpi"


class StructuralSummary(BaseModel):
    """Output of Stage 1 — the algorithm's analysis of the SQL result."""
    num_rows: int
    num_cols: int
    data_types: Dict[str, str]          # col_name -> "numeric" | "string" | "date"
    num_numeric_cols: int
    num_string_cols: int
    num_date_cols: int
    has_time_dimension: bool
    has_group_by: bool
    has_order_by: bool
    has_aggregation: bool
    is_single_value: bool
    category_cardinality: int           # distinct values in the first string column
    # Candidate chart types derived purely from structure (passed to LLM as hints)
    structural_candidates: List[str]


class VisualizationMetadata(BaseModel):
    reason: str
    structural_summary: Dict[str, Any]
    llm_intent: Optional[str] = None
    llm_chart_suggestion: Optional[str] = None
    validation_passed: bool = True


class VisualizationResult(BaseModel):
    chart_type: ChartType
    metadata: VisualizationMetadata


# ---------------------------------------------------------------------------
# Stage 1 — Rule-based structural analyser
# ---------------------------------------------------------------------------

class StructuralAnalyser:
    """
    Extracts objective facts from the SQL query and result set.
    Produces a StructuralSummary and a list of structurally valid chart
    candidates.  Does NOT read the user's natural-language query.
    """

    # Thresholds
    MAX_PIE_SEGMENTS      = 7
    MAX_BAR_CATEGORIES    = 20
    MIN_LINE_POINTS       = 3
    MIN_SCATTER_POINTS    = 5
    HEATMAP_MIN_COLS      = 3

    TIME_SQL_KEYWORDS = {
        "DATE", "MONTH", "YEAR", "DAY", "QUARTER", "WEEK",
        "TIME", "TIMESTAMP", "DATETIME",
    }
    AGGREGATION_FUNCTIONS = {"SUM(", "AVG(", "COUNT(", "MAX(", "MIN("}

    # ------------------------------------------------------------------ #

    def analyse(self, sql: str, results: List[Dict[str, Any]]) -> StructuralSummary:
        sql_upper = sql.upper()
        num_rows  = len(results)
        num_cols  = len(results[0]) if num_rows > 0 else 0

        data_types        = self._infer_data_types(results)
        num_numeric_cols  = sum(1 for t in data_types.values() if t == "numeric")
        num_string_cols   = sum(1 for t in data_types.values() if t == "string")
        num_date_cols     = sum(1 for t in data_types.values() if t == "date")

        has_group_by    = "GROUP BY" in sql_upper
        has_order_by    = "ORDER BY" in sql_upper
        has_aggregation = any(fn in sql_upper for fn in self.AGGREGATION_FUNCTIONS)
        has_time        = self._has_time_dimension(sql_upper, results, data_types)
        is_single_value = num_rows == 1 and num_cols == 1

        category_cardinality = self._category_cardinality(results, data_types)

        candidates = self._derive_candidates(
            num_rows=num_rows,
            num_cols=num_cols,
            num_numeric_cols=num_numeric_cols,
            num_string_cols=num_string_cols,
            num_date_cols=num_date_cols,
            has_time=has_time,
            has_group_by=has_group_by,
            has_order_by=has_order_by,
            has_aggregation=has_aggregation,
            is_single_value=is_single_value,
            category_cardinality=category_cardinality,
        )

        return StructuralSummary(
            num_rows=num_rows,
            num_cols=num_cols,
            data_types=data_types,
            num_numeric_cols=num_numeric_cols,
            num_string_cols=num_string_cols,
            num_date_cols=num_date_cols,
            has_time_dimension=has_time,
            has_group_by=has_group_by,
            has_order_by=has_order_by,
            has_aggregation=has_aggregation,
            is_single_value=is_single_value,
            category_cardinality=category_cardinality,
            structural_candidates=candidates,
        )

    # ------------------------------------------------------------------ #
    # Private helpers
    # ------------------------------------------------------------------ #

    def _infer_data_types(self, results: List[Dict[str, Any]]) -> Dict[str, str]:
        types: Dict[str, str] = {}
        if not results:
            return types
        for col, val in results[0].items():
            if isinstance(val, (int, float)):
                types[col] = "numeric"
            elif isinstance(val, str):
                if re.match(r"^\d{4}-\d{2}", val):
                    types[col] = "date"
                else:
                    types[col] = "string"
            else:
                types[col] = "unknown"
        return types

    def _has_time_dimension(
        self,
        sql_upper: str,
        results: List[Dict[str, Any]],
        data_types: Dict[str, str],
    ) -> bool:
        if any(kw in sql_upper for kw in self.TIME_SQL_KEYWORDS):
            return True
        if not results:
            return False
        for col, dtype in data_types.items():
            if dtype == "date":
                return True
            col_up = col.upper()
            if any(kw in col_up for kw in self.TIME_SQL_KEYWORDS):
                return True
        # value-level heuristics (Q1, month abbreviations)
        for col, val in results[0].items():
            s = str(val)
            if re.match(r"^Q[1-4]$", s, re.IGNORECASE):
                return True
            if s.lower() in {
                "jan","feb","mar","apr","may","jun",
                "jul","aug","sep","oct","nov","dec",
            }:
                return True
        return False

    def _category_cardinality(
        self,
        results: List[Dict[str, Any]],
        data_types: Dict[str, str],
    ) -> int:
        """Return the number of distinct values in the first string column."""
        if not results:
            return 0
        for col, dtype in data_types.items():
            if dtype == "string":
                return len({str(row.get(col)) for row in results})
        return 0

    def _derive_candidates(
        self,
        num_rows: int,
        num_cols: int,
        num_numeric_cols: int,
        num_string_cols: int,
        num_date_cols: int,
        has_time: bool,
        has_group_by: bool,
        has_order_by: bool,
        has_aggregation: bool,
        is_single_value: bool,
        category_cardinality: int,
    ) -> List[str]:
        """
        Return every chart type that is structurally valid for this result set.
        The LLM will choose the best one given the user's question.
        """
        if is_single_value:
            return [ChartType.KPI]

        candidates: List[str] = []

        # Time-series family
        if has_time and num_rows >= self.MIN_LINE_POINTS:
            candidates += [ChartType.LINE, ChartType.AREA]

        # Categorical / grouped family
        if has_group_by or num_string_cols >= 1:
            if category_cardinality <= self.MAX_PIE_SEGMENTS and has_aggregation:
                candidates += [ChartType.PIE, ChartType.DOUGHNUT]
            if category_cardinality <= self.MAX_BAR_CATEGORIES:
                candidates.append(ChartType.BAR)
            if category_cardinality > self.MAX_PIE_SEGMENTS or has_order_by:
                candidates.append(ChartType.HORIZONTAL_BAR)

        # Correlation / scatter
        if (
            num_numeric_cols >= 2
            and num_string_cols == 0
            and num_date_cols == 0
            and num_rows >= self.MIN_SCATTER_POINTS
        ):
            candidates.append(ChartType.SCATTER)

        # Heatmap — needs 2 string dims + 1 numeric
        if (
            num_cols >= self.HEATMAP_MIN_COLS
            and num_string_cols >= 2
            and num_numeric_cols >= 1
        ):
            candidates.append(ChartType.HEATMAP)

        # Table — always valid, last resort
        if num_rows > self.MAX_BAR_CATEGORIES:
            candidates.append(ChartType.TABLE)

        # Deduplicate while preserving order
        seen: set = set()
        deduped: List[str] = []
        for c in candidates:
            if c not in seen:
                seen.add(c)
                deduped.append(c)

        return deduped or [ChartType.BAR]


# ---------------------------------------------------------------------------
# Stage 2 — LLM intent classifier
# ---------------------------------------------------------------------------

class LLMIntentClassifier:
    """
    Reads the user's natural-language query and the structural summary,
    then returns the single best chart type from the candidate list.
    """

    SYSTEM_PROMPT = """You are a data visualisation expert embedded in an analytics pipeline.

You will receive:
1. A user's natural-language analytics question.
2. A structural summary of the SQL result set (column types, row count, sample values).
3. A list of structurally valid chart types for this data.

Your job is to select the single best chart type from the candidate list.

═══════════════════════════════════════════════
CHART SELECTION RULES — follow in priority order
═══════════════════════════════════════════════
0. DATA TABLE (override) → chart_type: "table" 
   • result has NO numeric column at all 
   • No chart of any kind is possible without a measure 
   • Example: "list countries", "show all categories"

1. KPI CARD  →  chart_type: "kpi"
   • result is exactly 1 row × 1 numeric column
   • Example: "What is total revenue this month?"

2. LINE CHART  →  chart_type: "line"
   • one temporal column (date/month/year/quarter)
   • one OR MORE numeric measure columns
   • row count >= 3
   • Example: "Show sales trend over the last 6 months"
   • Example: "Compare revenue and profit trends over the past year"

3. AREA CHART  →  chart_type: "area"
   • same rules as LINE CHART, but the question implies
     cumulative volume, filled region, or stacked area
   • Example: "Show cumulative revenue growth over time"

4. PIE CHART  →  chart_type: "pie"
   • one categorical column + one numeric column
   • row count between 2 and 6
   • question implies proportion, share, or composition
   • Example: "What is the revenue share by product category?"
   • DO NOT use if row count > 6

5. DONUT CHART  →  chart_type: "doughnut"
   • same rules as PIE CHART, but the question uses
     words like "donut", "ring", or explicitly asks for a donut
   • Default to pie when ambiguous

6. BAR CHART  →  chart_type: "bar"
   • one categorical column + one numeric column
   • row count between 7 and 20
   • question implies comparison across groups
   • category labels are short (<= 12 characters)
   • Example: "Compare sales across all regions"

7. HORIZONTAL BAR CHART  →  chart_type: "horizontalbar"
   • same as BAR CHART, but:
     category labels are long (> 12 characters) OR
     the question implies ranking or ordering
   • Example: "Rank the top 10 products by revenue"

8. SCATTER PLOT  →  chart_type: "scatter"
   • exactly two numeric columns (neither temporal)
   • no categorical grouping column
   • row count >= 5
   • question implies correlation or relationship
   • Example: "Is there a relationship between ad spend and sales?"

9. HEATMAP  →  chart_type: "heatmap"
   • exactly two categorical columns + one numeric column
   • data forms a matrix structure
   • Example: "Show sales volume by region and product category"

10. DATA TABLE  →  chart_type: "table"
    • row count > 20 with no clear chart pattern, OR
    • question asks for a list, records, or raw details
    • Example: "Show me all orders placed last week"

═══════════════════════════════════════════════
KEYWORD SIGNALS (use to break ties)
═══════════════════════════════════════════════
"trend / over time / monthly / quarterly"     → line or area
"share / proportion / breakdown / percentage" → pie or doughnut
"compare / vs / across"                       → bar or horizontalbar
"relationship / correlation"                  → scatter
"top N / ranking / highest / lowest"          → horizontalbar
"breakdown by X and Y"                        → heatmap
"total / single number"                       → kpi

═══════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════
- NEVER default to bar without checking all rules above.
- Pie/doughnut is ALWAYS preferred over bar when row count <= 6
  and the question implies share, proportion, or composition.
- You MUST choose from the provided candidates list only.
- If no rule matches perfectly, choose the closest structural fit.

═══════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════
Return ONLY a valid JSON object. No markdown. No explanation outside the JSON.

{
  "intent": "<one of: trend | comparison | composition | distribution | correlation | ranking | detail>",
  "chart_type": "<must be one of: kpi | line | area | pie | doughnut | bar | horizontalbar | scatter | heatmap | table>",
  "x_axis": "<column name for x-axis or category>",
  "y_axis": "<column name(s) for y-axis or measure>",
  "reason": "<one sentence: which rule matched and why this chart fits>"
}
"""

    def __init__(self):
        self._llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            temperature=0,
            max_retries=3,
            api_key=os.getenv("GROQ_API_KEY"),
        )

    def classify(
        self,
        nl_query: str,
        summary: StructuralSummary,
    ) -> Dict[str, str]:
        """
        Returns a dict with keys: intent, chart_type, reason.
        Falls back to the first structural candidate on any failure.
        """
        human_content = (
            f"User question: {nl_query}\n\n"
            f"Structural summary:\n{summary.model_dump_json(indent=2)}\n\n"
            f"Candidate chart types: {summary.structural_candidates}"
        )

        try:
            response = self._llm.invoke([
                SystemMessage(content=self.SYSTEM_PROMPT),
                HumanMessage(content=human_content),
            ])
            raw = response.content.strip()
            # Strip accidental markdown fences
            raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.IGNORECASE)
            raw = re.sub(r"\n?```$", "", raw, flags=re.IGNORECASE)
            return json.loads(raw)

        except Exception as exc:
            # Graceful fallback — never crash the pipeline
            fallback = summary.structural_candidates[0] if summary.structural_candidates else ChartType.TABLE
            return {
                "intent": "unknown",
                "chart_type": fallback,
                "reason": f"LLM call failed ({exc}); using first structural candidate.",
            }


# ---------------------------------------------------------------------------
# Stage 3 — Algorithm validator (guardrail)
# ---------------------------------------------------------------------------

class ChartValidator:
    """
    Checks whether the LLM's chart suggestion is still valid given the
    structural facts.  If not, substitutes the safest structural candidate.
    """

    MAX_PIE_SEGMENTS = 7
    MIN_LINE_POINTS  = 3
    MIN_SCATTER_COLS = 2

    def validate(
        self,
        suggested: str,
        summary: StructuralSummary,
    ) -> Tuple[str, bool]:
        """
        Returns (final_chart_type, validation_passed).
        If validation_passed is False the suggestion was overridden.
        """
        s = suggested.lower()

        if s in (ChartType.PIE, ChartType.DOUGHNUT):
            if summary.num_rows > self.MAX_PIE_SEGMENTS:
                return self._fallback(summary), False

        if s == ChartType.LINE:
            if not summary.has_time_dimension or summary.num_rows < self.MIN_LINE_POINTS:
                return self._fallback(summary), False

        if s == ChartType.SCATTER:
            if summary.num_numeric_cols < self.MIN_SCATTER_COLS:
                return self._fallback(summary), False

        if s == ChartType.HEATMAP:
            if summary.num_string_cols < 2 or summary.num_numeric_cols < 1:
                return self._fallback(summary), False

        # Check the suggestion is a known chart type
        valid_values = {t.value for t in ChartType}
        if s not in valid_values:
            return self._fallback(summary), False

        return s, True

    def _fallback(self, summary: StructuralSummary) -> str:
        """Return the first structural candidate that isn't the failing one."""
        return summary.structural_candidates[0] if summary.structural_candidates else ChartType.TABLE


# ---------------------------------------------------------------------------
# Public facade — ChartSelector
# ---------------------------------------------------------------------------

# Needed for the validator return type hint
from typing import Tuple  # noqa: E402 (placed here to avoid circular issue in snippet)


class ChartSelector:
    """
    Hybrid chart selection system.

    Pipeline:
        Stage 1  →  StructuralAnalyser   (algorithm, free, instant)
        Stage 2  →  LLMIntentClassifier  (reads NL query + candidates)
        Stage 3  →  ChartValidator       (algorithm guardrail on LLM output)

    Usage:
        selector = ChartSelector()
        result   = selector.select_chart(sql, results, nl_query)
        print(result.chart_type)
    """

    def __init__(self):
        self._analyser  = StructuralAnalyser()
        self._llm       = LLMIntentClassifier()
        self._validator = ChartValidator()

    def select_chart(
        self,
        sql: str,
        results: List[Dict[str, Any]],
        nl_query: str,
    ) -> VisualizationResult:

        # ── Guard: empty results ────────────────────────────────────────
        if not results:
            return VisualizationResult(
                chart_type=ChartType.TABLE,
                metadata=VisualizationMetadata(
                    reason="Empty result set — nothing to visualise.",
                    structural_summary={"num_rows": 0},
                    validation_passed=True,
                ),
            )

        # ── Stage 1: structural analysis (algorithm) ────────────────────
        summary = self._analyser.analyse(sql, results)

        # Short-circuit: single KPI value needs no LLM
        if summary.is_single_value:
            return VisualizationResult(
                chart_type=ChartType.KPI,
                metadata=VisualizationMetadata(
                    reason="Single scalar value — displayed as KPI card.",
                    structural_summary=summary.model_dump(),
                    validation_passed=True,
                ),
            )

        # ── Stage 2: LLM reads intent from NL query ────────────────────
        llm_output = self._llm.classify(nl_query, summary)
        llm_suggestion = llm_output.get("chart_type", summary.structural_candidates[0])
        llm_intent     = llm_output.get("intent", "unknown")
        llm_reason     = llm_output.get("reason", "")

        # ── Stage 3: algorithm validates LLM suggestion ─────────────────
        final_chart, passed = self._validator.validate(llm_suggestion, summary)

        reason = (
            llm_reason
            if passed
            else (
                f"LLM suggested '{llm_suggestion}' but it failed structural "
                f"validation — overridden with '{final_chart}'."
            )
        )

        return VisualizationResult(
            chart_type=ChartType(final_chart),
            metadata=VisualizationMetadata(
                reason=reason,
                structural_summary=summary.model_dump(),
                llm_intent=llm_intent,
                llm_chart_suggestion=llm_suggestion,
                validation_passed=passed,
            ),
        )