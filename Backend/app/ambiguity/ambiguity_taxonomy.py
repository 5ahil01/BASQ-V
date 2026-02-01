"""
Ambiguity Taxonomy Definition
"""

AMBIGUITY_TAXONOMY = {
    "temporal": {
        "last year": {
            "options": ["Fiscal Year", "Calendar Year", "Last 12 Months"],
            "default": "Calendar Year",
            "question": "What do you mean by 'last year'?"
        },
        "this year": {
            "options": ["Fiscal Year to Date", "Calendar Year to Date"],
            "default": "Calendar Year to Date",
            "question": "What do you mean by 'this year'?"
        },
        "recent": {
             "options": ["Last 30 days", "Last 3 months", "Last 6 months"],
             "default": "Last 30 days",
             "question": "What time period do you consider 'recent'?"
        },
        "quarter": {
            "options": ["Fiscal Quarter", "Calendar Quarter"],
            "default": "Calendar Quarter",
            "question": "Which quarter definition?"
        },
        "month": {
            "options": ["Calendar Month", "Fiscal Period"],
            "default": "Calendar Month",
            "question": "Which month definition?"
        }
    },
    "metrics": {
        "revenue": {
            "options": ["Gross Revenue", "Net Revenue", "Recurring Revenue"],
            "default": "Net Revenue",
             "question": "Which revenue metric?"
        },
        "sales": {
            "options": ["Gross Sales", "Net Sales"],
            "default": "Net Sales",
            "question": "Which sales metric?"
        },
        "profit": {
            "options": ["Gross Profit", "Net Profit", "Operating Profit"],
            "default": "Net Profit",
            "question": "Which profit definition?"
        }
    },
    "aggregation": {
        "top": {
             "options": ["Top 5", "Top 10", "Top 20"],
             "default": "Top 5",
             "question": "How many items for 'top'?"
        },
        "average": {
             "options": ["Mean", "Median"],
             "default": "Mean",
             "question": "Which average?"
        }
    },
    "comparison": {
        "growth": {
            "options": ["Year-over-Year", "Month-over-Month", "Quarter-over-Quarter"],
            "default": "Year-over-Year",
            "question": "How should growth be calculated?"
        }
    }
}
