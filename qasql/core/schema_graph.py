"""
Schema Graph Module (T-112)

Models FK relationships as a graph to discover JOIN paths
and automatically include bridge tables between relevant tables.
"""

from collections import defaultdict, deque
from itertools import combinations
from typing import Any


class SchemaGraph:
    """
    FK relationship graph for discovering JOIN paths.

    Builds a bidirectional graph from foreign key definitions
    and provides BFS-based shortest path discovery.
    """

    MAX_PATH_LENGTH = 4  # Skip paths longer than this

    def __init__(self, schema: dict[str, Any]):
        self.adjacency: dict[str, set[str]] = defaultdict(set)
        self.edges: dict[tuple[str, str], dict] = {}
        self._build_graph(schema)

    def _build_graph(self, schema: dict[str, Any]):
        """Build bidirectional graph from FK relationships."""
        for table_name, table_info in schema.items():
            for fk in table_info.get("foreign_keys", []):
                ref_table = fk.get("references_table", "")
                if not ref_table or ref_table not in schema:
                    continue

                col = fk.get("column", "")
                ref_col = fk.get("references_column", "")

                # Bidirectional edges
                self.adjacency[table_name].add(ref_table)
                self.adjacency[ref_table].add(table_name)

                self.edges[(table_name, ref_table)] = {
                    "column": col,
                    "ref_column": ref_col,
                }
                self.edges[(ref_table, table_name)] = {
                    "column": ref_col,
                    "ref_column": col,
                }

    @property
    def has_edges(self) -> bool:
        """Check if the graph has any FK relationships."""
        return len(self.edges) > 0

    def find_join_path(self, table_a: str, table_b: str) -> list[str]:
        """
        Find shortest path between two tables via FK relationships (BFS).

        Returns:
            List of table names forming the path, or empty list if no path.
        """
        if table_a == table_b:
            return [table_a]
        if table_a not in self.adjacency or table_b not in self.adjacency:
            return []

        visited = {table_a}
        queue = deque([(table_a, [table_a])])

        while queue:
            current, path = queue.popleft()

            if len(path) > self.MAX_PATH_LENGTH:
                continue

            for neighbor in self.adjacency[current]:
                if neighbor == table_b:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))

        return []

    def expand_relevant_tables(self, tables: list[str]) -> list[str]:
        """
        Expand a set of relevant tables by including bridge tables
        that lie on the FK path between any pair.

        Args:
            tables: List of directly relevant table names

        Returns:
            Expanded list including bridge tables
        """
        if not self.has_edges or len(tables) < 2:
            return tables

        expanded = set(tables)

        for a, b in combinations(tables, 2):
            path = self.find_join_path(a, b)
            if path and len(path) <= self.MAX_PATH_LENGTH:
                expanded.update(path)

        return list(expanded)

    def get_join_conditions(self, path: list[str]) -> list[str]:
        """
        Generate JOIN ON conditions for a table path.

        Args:
            path: Ordered list of table names forming a join path

        Returns:
            List of "table_a.col = table_b.col" condition strings
        """
        conditions = []
        for i in range(len(path) - 1):
            a, b = path[i], path[i + 1]
            edge = self.edges.get((a, b))
            if edge:
                conditions.append(
                    f"{a}.{edge['column']} = {b}.{edge['ref_column']}"
                )
        return conditions

    def get_all_join_hints(self, tables: list[str]) -> list[str]:
        """
        Generate all unique JOIN condition hints for a set of relevant tables.

        Returns:
            List of "table_a.col = table_b.col" strings (deduplicated)
        """
        if not self.has_edges or len(tables) < 2:
            return []

        hints = []
        seen_conditions = set()
        seen_pairs = set()

        for a, b in combinations(tables, 2):
            pair_key = tuple(sorted([a, b]))
            if pair_key in seen_pairs:
                continue
            seen_pairs.add(pair_key)

            path = self.find_join_path(a, b)
            if path:
                for cond in self.get_join_conditions(path):
                    # Deduplicate by normalizing condition
                    parts = sorted(cond.split(" = "))
                    norm = " = ".join(parts)
                    if norm not in seen_conditions:
                        seen_conditions.add(norm)
                        hints.append(cond)

        return hints
