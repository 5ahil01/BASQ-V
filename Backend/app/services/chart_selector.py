import re
from enum import Enum
from typing import List, Dict, Any, Tuple, Optional
from pydantic import BaseModel

class ChartType(str, Enum):
    BAR = "bar"
    HORIZONTAL_BAR = "horizontalBar"
    LINE = "line"
    AREA = "area"
    PIE = "pie"
    DOUGHNUT = "doughnut"
    SCATTER = "scatter"
    HEATMAP = "heatmap"
    TABLE = "table"
    KPI = "kpi"

class VisualizationMetadata(BaseModel):
    reason: str
    analysis: Dict[str, Any]
    llm_hint_used: Optional[str] = None

class VisualizationResult(BaseModel):
    chart_type: ChartType
    metadata: VisualizationMetadata

class ChartSelector:
    """
    Hybrid chart selection system that combines rule-based algorithms with 
    optional LLM guidance to select optimal visualizations.
    """
    
    # Configuration Thresholds
    MAX_PIE_SEGMENTS = 7
    MAX_BAR_CATEGORIES = 20
    MIN_SCATTER_POINTS = 5
    HEATMAP_MIN_DIMENSIONS = 3
    MIN_LINE_POINTS = 3

    def _analyze_query(self, sql: str, results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract features from SQL and results."""
        sql_upper = sql.upper()
        
        num_rows = len(results)
        num_cols = len(results[0]) if num_rows > 0 else 0
        
        has_group_by = "GROUP BY" in sql_upper
        has_order_by = "ORDER BY" in sql_upper
        
        # Detect aggregations
        aggregations = ["SUM(", "AVG(", "COUNT(", "MAX(", "MIN("]
        has_aggregation = any(agg in sql_upper for agg in aggregations)
        
        is_single_value = num_rows == 1 and num_cols == 1
        
        data_types = self._infer_data_types(results)
        num_numeric_cols = sum(1 for t in data_types.values() if t == "numeric")
        num_string_cols = sum(1 for t in data_types.values() if t == "string")
        
        has_time = self._has_time_dimension(sql_upper, results)
        
        return {
            "num_rows": num_rows,
            "num_cols": num_cols,
            "has_group_by": has_group_by,
            "has_order_by": has_order_by,
            "has_aggregation": has_aggregation,
            "is_single_value": is_single_value,
            "data_types": data_types,
            "num_numeric_cols": num_numeric_cols,
            "num_string_cols": num_string_cols,
            "has_time_dimension": has_time
        }

    def _has_time_dimension(self, sql_upper: str, results: List[Dict[str, Any]]) -> bool:
        """Detect temporal queries."""
        time_keywords = ["DATE", "MONTH", "YEAR", "DAY", "QUARTER", "WEEK", "TIME"]
        
        # Check SQL for time extraction or keywords
        if any(keyword in sql_upper for keyword in time_keywords):
            return True
            
        # Optional: check column names in results
        if results:
            first_row = results[0]
            for col_name in first_row.keys():
                col_upper = col_name.upper()
                if any(keyword in col_upper for keyword in time_keywords):
                    return True
                
                # Check value structure (heuristic for Q1, months, YYYY-MM-DD)
                val = str(first_row[col_name])
                if re.match(r"^Q[1-4]$", val, re.IGNORECASE):
                    return True
                if re.match(r"^\d{4}-\d{2}", val):
                    return True
                if val.lower() in ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]:
                    return True
                    
        return False

    def _infer_data_types(self, results: List[Dict[str, Any]]) -> Dict[str, str]:
        """Analyze result data types."""
        types = {}
        if not results:
            return types
            
        first_row = results[0]
        for col_name, val in first_row.items():
            if isinstance(val, (int, float)):
                types[col_name] = "numeric"
            elif isinstance(val, str):
                if re.match(r"^\d{4}-\d{2}-\d{2}", val):
                    types[col_name] = "date"
                else:
                    types[col_name] = "string"
            else:
                types[col_name] = "unknown"
                
        return types

    def _validate_llm_hint(self, hint: str, analysis: Dict[str, Any]) -> bool:
        """Validate LLM hint against rules before using."""
        hint_lower = hint.lower()
        
        if hint_lower == ChartType.PIE:
            if analysis["num_rows"] > self.MAX_PIE_SEGMENTS:
                return False
        elif hint_lower == ChartType.LINE:
            if not analysis["has_time_dimension"]:
                return False
        elif hint_lower == ChartType.SCATTER:
            if analysis["num_cols"] != 2:
                return False
                
        return True

    def select_chart(
        self, 
        sql: str, 
        results: List[Dict[str, Any]], 
        confidence: float, 
        llm_hint: Optional[str] = None
    ) -> VisualizationResult:
        """Select optimal chart based on rules and optional LLM guidance."""
        
        if not results:
            return VisualizationResult(
                chart_type=ChartType.TABLE,
                metadata=VisualizationMetadata(
                    reason="Empty results", 
                    analysis={"num_rows": 0}
                )
            )
            
        analysis = self._analyze_query(sql, results)
        
        # 1. Check LLM Hint Override
        if llm_hint and confidence >= 0.85:
            # Normalize hint to standard chart types
            valid_hints = {t.value: t for t in ChartType}
            normalized_hint = llm_hint.lower()
            
            if normalized_hint in valid_hints:
                if self._validate_llm_hint(normalized_hint, analysis):
                    return VisualizationResult(
                        chart_type=valid_hints[normalized_hint],
                        metadata=VisualizationMetadata(
                            reason=f"LLM hint highly confident and valid",
                            analysis=analysis,
                            llm_hint_used=normalized_hint
                        )
                    )

        # 2. Decision Tree Rules
        
        # Single value
        if analysis["is_single_value"]:
            return VisualizationResult(
                chart_type=ChartType.KPI,
                metadata=VisualizationMetadata(
                    reason="Single value metric",
                    analysis=analysis
                )
            )
            
        # Low confidence
        if confidence < 0.60:
            ctype = ChartType.TABLE if analysis["num_rows"] > self.MAX_BAR_CATEGORIES else ChartType.BAR
            return VisualizationResult(
                chart_type=ctype,
                metadata=VisualizationMetadata(
                    reason="Low confidence response - using simple fallback",
                    analysis=analysis
                )
            )

        # Time-series
        if analysis["has_time_dimension"] and analysis["has_order_by"] and analysis["num_rows"] >= self.MIN_LINE_POINTS:
            return VisualizationResult(
                chart_type=ChartType.LINE,
                metadata=VisualizationMetadata(
                    reason=f"Time-series with {analysis['num_rows']} points",
                    analysis=analysis
                )
            )
            
        # Matrix data -> Heatmap
        if analysis["num_cols"] >= self.HEATMAP_MIN_DIMENSIONS and analysis["num_string_cols"] >= 2 and analysis["num_numeric_cols"] >= 1:
            return VisualizationResult(
                chart_type=ChartType.HEATMAP,
                metadata=VisualizationMetadata(
                    reason="Matrix data with string categories and numeric values",
                    analysis=analysis
                )
            )

        # Small Categories -> Pie
        if analysis["has_group_by"] and analysis["has_aggregation"] and analysis["num_rows"] <= self.MAX_PIE_SEGMENTS:
            return VisualizationResult(
                chart_type=ChartType.PIE,
                metadata=VisualizationMetadata(
                    reason=f"{analysis['num_rows']} categories - shows proportions",
                    analysis=analysis
                )
            )
            
        # Ordered categories -> Horizontal Bar
        if analysis["has_order_by"] and analysis["has_group_by"]:
            return VisualizationResult(
                chart_type=ChartType.HORIZONTAL_BAR,
                metadata=VisualizationMetadata(
                    reason=f"{analysis['num_rows']} ordered categories - ranking",
                    analysis=analysis
                )
            )
            
        # Medium categories -> Bar
        if analysis["has_group_by"] and analysis["num_rows"] <= self.MAX_BAR_CATEGORIES:
            return VisualizationResult(
                chart_type=ChartType.BAR,
                metadata=VisualizationMetadata(
                    reason=f"{analysis['num_rows']} categories - comparison",
                    analysis=analysis
                )
            )
            
        # Two numeric columns -> Scatter
        if not analysis["has_group_by"] and analysis["num_numeric_cols"] >= 2 and analysis["num_cols"] == 2 and analysis["num_rows"] >= self.MIN_SCATTER_POINTS:
            return VisualizationResult(
                chart_type=ChartType.SCATTER,
                metadata=VisualizationMetadata(
                    reason="Two numeric dimensions - scatter plot",
                    analysis=analysis
                )
            )
            
        # Many rows > 20
        if analysis["num_rows"] > self.MAX_BAR_CATEGORIES:
            return VisualizationResult(
                chart_type=ChartType.TABLE,
                metadata=VisualizationMetadata(
                    reason="Too many rows for chart visualization",
                    analysis=analysis
                )
            )
            
        # Default fallback
        return VisualizationResult(
            chart_type=ChartType.BAR,
            metadata=VisualizationMetadata(
                reason="Default fallback chart type",
                analysis=analysis
            )
        )
