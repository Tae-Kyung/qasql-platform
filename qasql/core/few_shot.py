"""
Few-Shot Example Library (T-110)

Provides query classification and relevant few-shot example selection
to improve SQL generation accuracy for complex query patterns.
"""

import re
from typing import Any


# --- Few-shot examples by query pattern ---
FEW_SHOT_EXAMPLES = {
    "simple_select": [
        {
            "question": "Show all customers",
            "sql": "SELECT * FROM customers",
        },
        {
            "question": "List product names and prices",
            "sql": "SELECT name, price FROM products",
        },
    ],
    "aggregation": [
        {
            "question": "Total sales by region",
            "sql": "SELECT region, SUM(amount) AS total_sales FROM orders GROUP BY region",
        },
        {
            "question": "Average order value",
            "sql": "SELECT AVG(total) AS avg_order_value FROM orders",
        },
        {
            "question": "Count of active users",
            "sql": "SELECT COUNT(*) FROM users WHERE status = 'active'",
        },
    ],
    "join": [
        {
            "question": "Orders with customer names",
            "sql": "SELECT c.name, o.id, o.total FROM orders o JOIN customers c ON o.customer_id = c.id",
        },
        {
            "question": "Products sold in each category",
            "sql": "SELECT c.name AS category, COUNT(p.id) AS product_count FROM products p JOIN categories c ON p.category_id = c.id GROUP BY c.name",
        },
    ],
    "subquery": [
        {
            "question": "Customers who ordered more than average",
            "sql": "SELECT name FROM customers WHERE id IN (SELECT customer_id FROM orders GROUP BY customer_id HAVING COUNT(*) > (SELECT AVG(cnt) FROM (SELECT COUNT(*) AS cnt FROM orders GROUP BY customer_id) t))",
        },
    ],
    "window_function": [
        {
            "question": "Rank products by total sales",
            "sql": "SELECT name, total_sales, RANK() OVER (ORDER BY total_sales DESC) AS rank FROM (SELECT p.name, SUM(oi.quantity * oi.price) AS total_sales FROM order_items oi JOIN products p ON oi.product_id = p.id GROUP BY p.name) t",
        },
    ],
    "date_filter": [
        {
            "question": "Orders from last month",
            "sql": "SELECT * FROM orders WHERE order_date >= DATE('now', '-1 month')",
        },
        {
            "question": "Sales this year",
            "sql": "SELECT * FROM sales WHERE sale_date >= DATE('now', 'start of year')",
        },
    ],
    "case_when": [
        {
            "question": "Categorize orders by size",
            "sql": "SELECT id, total, CASE WHEN total > 1000 THEN 'large' WHEN total > 100 THEN 'medium' ELSE 'small' END AS order_size FROM orders",
        },
    ],
}

# All valid category names
VALID_CATEGORIES = list(FEW_SHOT_EXAMPLES.keys())


class QueryClassifier:
    """Classifies NL queries into SQL pattern categories using LLM."""

    def __init__(self, llm_client: Any):
        self.llm_client = llm_client

    def classify(self, nl_query: str) -> list[str]:
        """
        Classify a query into one or more SQL pattern categories.

        Returns:
            List of category names (e.g., ["aggregation", "join"])
        """
        categories_str = ", ".join(VALID_CATEGORIES)
        prompt = f"""Classify this database question into one or more SQL pattern categories.

Categories: {categories_str}

Question: "{nl_query}"

Return ONLY the matching category names, comma-separated. If multiple apply, list all."""

        try:
            response = self.llm_client.complete(prompt=prompt, max_tokens=50)
            raw_categories = [c.strip().lower().replace(" ", "_") for c in response.split(",")]
            # Filter to valid categories only
            return [c for c in raw_categories if c in VALID_CATEGORIES] or ["simple_select"]
        except Exception:
            return self._fallback_classify(nl_query)

    def _fallback_classify(self, nl_query: str) -> list[str]:
        """Rule-based fallback classification when LLM fails."""
        query_lower = nl_query.lower()
        categories = []

        # Aggregation keywords
        agg_keywords = ["total", "sum", "count", "average", "avg", "max", "min",
                        "how many", "number of", "합계", "총", "평균", "개수"]
        if any(kw in query_lower for kw in agg_keywords):
            categories.append("aggregation")

        # Join indicators
        join_keywords = ["with", "and their", "along with", "including",
                         "for each", "per", "별", "포함"]
        if any(kw in query_lower for kw in join_keywords):
            categories.append("join")

        # Date keywords
        date_keywords = ["last month", "this year", "yesterday", "today",
                         "between", "since", "before", "after",
                         "지난", "이번", "올해", "작년"]
        if any(kw in query_lower for kw in date_keywords):
            categories.append("date_filter")

        # Subquery indicators
        sub_keywords = ["more than average", "above average", "top",
                        "highest", "lowest", "most", "least",
                        "가장", "최대", "최소", "이상"]
        if any(kw in query_lower for kw in sub_keywords):
            categories.append("subquery")

        # Ranking/window
        rank_keywords = ["rank", "ranking", "top n", "순위", "nth"]
        if any(kw in query_lower for kw in rank_keywords):
            categories.append("window_function")

        # CASE WHEN indicators
        case_keywords = ["categorize", "classify", "label", "group into",
                         "분류", "구분"]
        if any(kw in query_lower for kw in case_keywords):
            categories.append("case_when")

        return categories if categories else ["simple_select"]


def get_relevant_examples(categories: list[str], max_examples: int = 3) -> list[dict]:
    """
    Select relevant few-shot examples based on query categories.

    Args:
        categories: List of query pattern categories
        max_examples: Maximum number of examples to return

    Returns:
        List of {"question": ..., "sql": ...} dicts
    """
    examples = []
    seen = set()

    for cat in categories:
        for ex in FEW_SHOT_EXAMPLES.get(cat, []):
            key = ex["sql"]
            if key not in seen:
                seen.add(key)
                examples.append(ex)
            if len(examples) >= max_examples:
                break
        if len(examples) >= max_examples:
            break

    return examples[:max_examples]


def format_few_shot_section(examples: list[dict]) -> str:
    """Format few-shot examples into a prompt section string."""
    if not examples:
        return ""

    lines = ["Examples:"]
    for ex in examples:
        lines.append(f"Q: {ex['question']}")
        lines.append(f"SQL: {ex['sql']}")
        lines.append("")

    return "\n".join(lines)
