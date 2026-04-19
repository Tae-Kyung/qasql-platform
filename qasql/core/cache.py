"""
Query Cache Module (T-114)

Caches NL-to-SQL results to avoid re-computation for identical queries.
Uses hash-based exact matching with TTL expiration and LRU eviction.
"""

import hashlib
import json
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional


@dataclass
class CacheEntry:
    """A cached query result."""
    question: str
    hint: str
    sql: str
    confidence: float
    reasoning: str
    timestamp: float
    hit_count: int = 0


class QueryCache:
    """
    Hash-based query cache with TTL and disk persistence.

    Exact-match on normalized (question + hint) key.
    """

    def __init__(
        self,
        cache_dir: Path = None,
        max_entries: int = 1000,
        ttl_seconds: float = 86400,
        min_confidence: float = 0.5,
    ):
        self.cache_dir = Path(cache_dir) if cache_dir else None
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self.min_confidence = min_confidence
        self._cache: dict[str, CacheEntry] = {}

        if self.cache_dir:
            self._load_from_disk()

    @staticmethod
    def _make_key(question: str, hint: str = "") -> str:
        """Create a normalized hash key from question + hint."""
        normalized = question.strip().lower() + "|" + (hint or "").strip().lower()
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:16]

    def get(self, question: str, hint: str = "") -> Optional[CacheEntry]:
        """
        Look up a cached result.

        Returns:
            CacheEntry if found and not expired, None otherwise.
        """
        key = self._make_key(question, hint)
        entry = self._cache.get(key)

        if entry is None:
            return None

        # Check TTL
        if (time.time() - entry.timestamp) >= self.ttl_seconds:
            del self._cache[key]
            return None

        entry.hit_count += 1
        return entry

    def put(self, question: str, hint: str, sql: str, confidence: float, reasoning: str = ""):
        """
        Store a query result in cache.

        Only caches results above min_confidence threshold.
        """
        if confidence < self.min_confidence:
            return

        key = self._make_key(question, hint)
        self._cache[key] = CacheEntry(
            question=question,
            hint=hint or "",
            sql=sql,
            confidence=confidence,
            reasoning=reasoning,
            timestamp=time.time(),
        )

        self._evict_if_needed()

        if self.cache_dir:
            self._save_to_disk()

    def remove(self, question: str, hint: str = ""):
        """Remove a specific entry from cache."""
        key = self._make_key(question, hint)
        self._cache.pop(key, None)

    def clear(self):
        """Clear all cached entries."""
        self._cache.clear()
        if self.cache_dir:
            self._save_to_disk()

    @property
    def size(self) -> int:
        """Number of entries in cache."""
        return len(self._cache)

    def _evict_if_needed(self):
        """Evict oldest entries if cache exceeds max size (LRU)."""
        if len(self._cache) <= self.max_entries:
            return

        sorted_keys = sorted(
            self._cache.keys(),
            key=lambda k: self._cache[k].timestamp,
        )
        to_remove = len(self._cache) - self.max_entries
        for key in sorted_keys[:to_remove]:
            del self._cache[key]

    def _save_to_disk(self):
        """Persist cache to disk as JSON."""
        if not self.cache_dir:
            return
        try:
            self.cache_dir.mkdir(parents=True, exist_ok=True)
            cache_file = self.cache_dir / "query_cache.json"
            data = {k: asdict(v) for k, v in self._cache.items()}
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
        except Exception:
            pass  # Cache persistence is best-effort

    def _load_from_disk(self):
        """Load cache from disk."""
        if not self.cache_dir:
            return
        cache_file = self.cache_dir / "query_cache.json"
        if not cache_file.exists():
            return
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            now = time.time()
            for key, entry_data in data.items():
                entry = CacheEntry(**entry_data)
                # Skip expired entries on load
                if (now - entry.timestamp) < self.ttl_seconds:
                    self._cache[key] = entry
        except Exception:
            pass  # Cache loading is best-effort
