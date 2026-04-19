"""
Prompt Templates for SQL Generation Strategies

5 strategies for generating SQL candidates:
1. Full Schema - Complete database schema
2. SME Metadata - Schema with domain expert hints (SKIPPED if no hint)
3. Minimal Profile - Column names only
4. Focused Schema - Filtered relevant tables
5. Full Profile - Schema with descriptions and samples
"""

from enum import Enum


class ContextStrategy(Enum):
    """SQL generation strategies."""
    FULL_SCHEMA = "full_schema"
    SME_METADATA = "sme_metadata"
    MINIMAL_PROFILE = "minimal_profile"
    FOCUSED_SCHEMA = "focused_schema"
    FULL_PROFILE = "full_profile"
    COT_FOCUSED = "cot_focused"  # T-111: Chain-of-Thought


# --- T-100: DB Dialect Hints ---
DIALECT_HINTS = {
    "sqlite": "Use SQLite syntax. No FULL OUTER JOIN. Use || for string concatenation. Date functions: date(), strftime(). Use LIMIT (no FETCH/OFFSET syntax). CAST() for type conversion. Use IFNULL() instead of COALESCE where possible.",
    "postgresql": "Use PostgreSQL syntax. Use :: for type casting. String concat with ||. Date functions: DATE_TRUNC(), EXTRACT(), TO_CHAR(). Window functions supported. Use ILIKE for case-insensitive LIKE.",
    "mysql": "Use MySQL syntax. Use CONCAT() for string concatenation. Use LIMIT (not FETCH). Date functions: DATE_FORMAT(), DATEDIFF(), NOW(). Use backticks for reserved word escaping. No FULL OUTER JOIN.",
    "supabase": "Use PostgreSQL syntax (Supabase uses PostgreSQL). Use :: for type casting. String concat with ||. Date functions: DATE_TRUNC(), EXTRACT(), TO_CHAR(). Window functions supported.",
}


def _build_system_prompt(extra: str = "", dialect: str = "") -> str:
    """Build system prompt with optional dialect hint and extra instructions."""
    dialect_hint = DIALECT_HINTS.get(dialect, "")
    base = f"""You are an expert SQL query generator. Generate accurate SQL queries based on the provided schema and question.

Rules:
1. Generate ONLY the SQL query, no explanations
2. Use proper SQL syntax
3. Use exact column and table names from the schema
4. Do NOT use DISTINCT unless explicitly asked for unique/distinct values
5. Return only the SQL query"""
    if dialect_hint:
        base += f"\n\nSQL Dialect: {dialect_hint}"
    if extra:
        base += f"\n\n{extra}"
    return base


SYSTEM_BASE = _build_system_prompt()


PROMPTS = {
    ContextStrategy.FULL_SCHEMA: {
        "name": "full_schema",
        "temperature": 0.0,
        "system_extra": "",
        "user_template": """Database Schema:
{schema}

Question: {question}

Generate the SQL query."""
    },

    ContextStrategy.SME_METADATA: {
        "name": "sme_metadata",
        "temperature": 0.0,
        "system_extra": """CRITICAL - SME EVIDENCE IS MANDATORY:
- If evidence specifies a formula, you MUST use that EXACT formula
- If evidence specifies a column mapping, you MUST use that EXACT column
- Evidence is the GROUND TRUTH - follow it literally""",
        "user_template": """Database Schema:
{schema}

SME Evidence (MANDATORY - follow exactly): {hint}

Question: {question}

Generate the SQL query following the evidence precisely."""
    },

    ContextStrategy.MINIMAL_PROFILE: {
        "name": "minimal_profile",
        "temperature": 0.2,
        "system_extra": "",
        "user_template": """Database Tables and Columns:
{schema}

Question: {question}

Generate the SQL query using only the column names provided."""
    },

    ContextStrategy.FOCUSED_SCHEMA: {
        "name": "focused_schema",
        "temperature": 0.1,
        "system_extra": "Note: The schema has been filtered to show only relevant tables.",
        "user_template": """Relevant Database Schema:
{schema}

Question: {question}

Generate the SQL query using only the tables shown."""
    },

    ContextStrategy.FULL_PROFILE: {
        "name": "full_profile",
        "temperature": 0.3,
        "system_extra": "Use the column descriptions to understand the semantic meaning of each column.",
        "user_template": """Database Schema with Descriptions:
{schema}

Question: {question}

Generate the SQL query using the column descriptions to guide your choice."""
    },
}


# --- T-111: Chain-of-Thought system prompt ---
COT_SYSTEM_EXTRA = """Think step-by-step before writing the final SQL.

For each question, follow these steps:
Step 1: Identify the entities (tables) mentioned or implied in the question.
Step 2: Determine the required columns, aggregations, and computed fields.
Step 3: Identify the JOIN conditions between tables (using foreign keys).
Step 4: Determine the WHERE/HAVING filter conditions.
Step 5: Determine the ORDER BY and LIMIT clauses if needed.
Step 6: Write the final SQL query.

Show your brief reasoning for each step, then output the final SQL inside ```sql ... ``` code block.
Note: The schema has been filtered to show only relevant tables."""

PROMPTS[ContextStrategy.COT_FOCUSED] = {
    "name": "cot_focused",
    "temperature": 0.0,
    "system_extra": COT_SYSTEM_EXTRA,
    "user_template": """Database Schema (relevant tables only):
{schema}

Question: {question}

Think step-by-step and generate the SQL query."""
}


def get_system_prompt(strategy: ContextStrategy, dialect: str = "") -> str:
    """Get the full system prompt for a strategy with dialect hint."""
    config = PROMPTS[strategy]
    return _build_system_prompt(extra=config.get("system_extra", ""), dialect=dialect)


JUDGE_PROMPT = {
    "system": """You are a Senior SQL Reviewer. Your job is to select the BEST SQL query from multiple candidates.

Evaluate each candidate based on:
1. Correctness - Does it answer the question?
2. Result shape - Does the number of rows/columns make sense for the question?
   - Aggregation questions (total, average, count) should return few rows
   - List questions (show all, list) should return multiple rows
   - Count questions should return a single number
3. Completeness - Does it include all required columns?
4. Efficiency - Is it well-structured?
5. Result data - Do the sample output values look reasonable?

Return your selection in JSON format:
{
    "selected_id": <candidate_id>,
    "confidence": <0.0-1.0>,
    "reasoning": "<brief explanation>"
}""",

    "user_template": """Question: {question}

{hint_section}

Candidates:
{candidates}

Select the BEST candidate. Return only JSON."""
}


REFINEMENT_PROMPT = {
    "system": """You are an SQL expert. Fix the SQL query based on the error message.

Rules:
1. Return ONLY the corrected SQL query
2. Do not explain the changes
3. Maintain the original query intent
4. Do NOT repeat mistakes from previous attempts""",

    "user_template": """Original SQL:
{sql}

Current Error:
{error}

{error_history}Schema:
{schema}

Question: {question}

Return only the corrected SQL query."""
}


LAST_RESORT_PROMPT = {
    "system": """You are an SQL expert. All previous attempts failed. Generate a simple, safe SQL query.

Rules:
1. Use simple, straightforward SQL
2. Avoid complex JOINs if possible
3. Use basic WHERE clauses
4. Return ONLY the SQL query""",

    "user_template": """Schema:
{schema}

Question: {question}

{hint_section}

Previous errors:
{errors}

Generate a simple SQL query that avoids the previous errors."""
}
