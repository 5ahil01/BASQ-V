import pytest
from app.services.chart_selector import ChartSelector, ChartType

@pytest.fixture
def selector():
    return ChartSelector()

def test_scenario_a_time_series(selector):
    sql = "SELECT month, SUM(revenue) FROM sales WHERE year=2025 GROUP BY month ORDER BY month"
    # 12 rows, 2 columns
    results = [{"month": f"2025-{str(i).zfill(2)}-01", "revenue": 100 * i} for i in range(1, 13)]
    
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint=None)
    
    assert result.chart_type == ChartType.LINE
    assert result.metadata.analysis["has_time_dimension"] is True
    assert result.metadata.analysis["has_order_by"] is True

def test_scenario_b_category_comparison(selector):
    sql = "SELECT region, SUM(revenue) FROM sales GROUP BY region"
    results = [
        {"region": "North", "revenue": 1000},
        {"region": "South", "revenue": 1500},
        {"region": "East", "revenue": 800},
        {"region": "West", "revenue": 1200}
    ]
    
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint=None)
    
    assert result.chart_type == ChartType.PIE
    assert result.metadata.analysis["num_rows"] <= ChartSelector.MAX_PIE_SEGMENTS

def test_scenario_c_ranking(selector):
    sql = "SELECT product, SUM(sales) FROM orders GROUP BY product ORDER BY SUM(sales) DESC LIMIT 10"
    results = [{"product": f"Product {i}", "sales": 1000 - i * 10} for i in range(10)]
    
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint=None)
    
    assert result.chart_type == ChartType.HORIZONTAL_BAR

def test_scenario_d_llm_override_rejected(selector):
    sql = "SELECT product, SUM(sales) FROM orders GROUP BY product ORDER BY SUM(sales) DESC LIMIT 15"
    results = [{"product": f"Product {i}", "sales": 1000 - i * 10} for i in range(15)]
    
    # LLM suggests pie, but num_rows = 15 > MAX_PIE_SEGMENTS (7), so it should be rejected
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint="pie")
    
    # Defaults to Horizontal Bar due to ORDER BY
    assert result.chart_type == ChartType.HORIZONTAL_BAR
    assert result.metadata.llm_hint_used is None

def test_scenario_e_single_metric(selector):
    sql = "SELECT SUM(revenue) FROM sales WHERE quarter='Q4'"
    results = [{"sum": 50000}]
    
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint=None)
    
    assert result.chart_type == ChartType.KPI
    assert result.metadata.analysis["is_single_value"] is True

def test_llm_hint_accepted(selector):
    sql = "SELECT product, SUM(sales) FROM orders GROUP BY product"
    results = [{"product": f"Product {i}", "sales": 1000 - i * 10} for i in range(5)]
    
    # Default might be PIE or BAR, but LLM hint 'bar' should be accepted
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint="bar")
    
    assert result.chart_type == ChartType.BAR
    assert result.metadata.llm_hint_used == "bar"

def test_low_confidence_fallback(selector):
    sql = "SELECT product, SUM(sales) FROM orders GROUP BY product"
    results = [{"product": f"Product {i}", "sales": 1000 - i * 10} for i in range(5)]
    
    # Low confidence < 0.60
    result = selector.select_chart(sql, results, confidence=0.5, llm_hint="pie")
    
    # Falls back to BAR for small datasets despite hint
    assert result.chart_type == ChartType.BAR
    assert result.metadata.llm_hint_used is None

def test_empty_results(selector):
    sql = "SELECT * FROM sales WHERE 1=0"
    results = []
    
    result = selector.select_chart(sql, results, confidence=1.0, llm_hint="bar")
    
    assert result.chart_type == ChartType.TABLE
    assert result.metadata.reason == "Empty results"

def test_scatter_plot(selector):
    sql = "SELECT age, income FROM users"
    results = [{"age": 25 + i, "income": 50000 + i * 1000} for i in range(10)]
    
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint=None)
    
    assert result.chart_type == ChartType.SCATTER
    assert result.metadata.analysis["num_numeric_cols"] == 2

def test_heatmap(selector):
    sql = "SELECT region, product_category, SUM(sales) FROM sales GROUP BY region, product_category"
    results = [
        {"region": "North", "category": "Electronics", "sales": 500},
        {"region": "South", "category": "Clothing", "sales": 300},
        {"region": "North", "category": "Clothing", "sales": 200},
    ]
    
    result = selector.select_chart(sql, results, confidence=0.9, llm_hint=None)
    
    assert result.chart_type == ChartType.HEATMAP
    assert result.metadata.analysis["num_cols"] == 3
    assert result.metadata.analysis["num_string_cols"] >= 2
    assert result.metadata.analysis["num_numeric_cols"] >= 1
