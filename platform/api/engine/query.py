"""
Vercel Python Serverless Function — POST /internal/engine/query
Rewrites to: api/engine/query.py

Receives: {
  project_id: string,
  question:   string,
  hint?:      string,
  execute?:   bool,
}
Header: x-internal-secret: <INTERNAL_API_SECRET>

1. Verify internal secret
2. Fetch project config + schema_cache_path from Supabase
3. Download qasql_output/ from Supabase Storage to /tmp/
4. Build QASQLEngine (schema already cached — setup() uses existing files)
5. Run engine.query(question, hint)
6. Optionally execute SQL via engine.execute_sql()
7. Return result JSON
"""
import sys
import os
import json
import tempfile
from pathlib import Path
from http.server import BaseHTTPRequestHandler

_ENGINE_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_ROOT not in sys.path:
    sys.path.insert(0, _ENGINE_ROOT)

from _utils import (  # noqa: E402
    get_supabase_client,
    build_engine_from_config,
    download_directory_from_storage,
    STORAGE_BUCKET,
)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1. Internal secret verification
        secret = self.headers.get("x-internal-secret", "")
        expected = os.environ.get("INTERNAL_API_SECRET", "")
        if not secret or secret != expected:
            self._respond(403, {
                "success": False,
                "error": "FORBIDDEN",
                "message": "Invalid internal secret",
            })
            return

        # 2. Parse body
        content_length = int(self.headers.get("Content-Length") or 0)
        body: dict = {}
        if content_length > 0:
            body = json.loads(self.rfile.read(content_length))

        project_id: str = body.get("project_id", "")
        question: str = body.get("question", "")
        hint: str | None = body.get("hint") or None
        execute: bool = bool(body.get("execute", False))

        if not project_id or not question:
            self._respond(400, {
                "success": False,
                "error": "BAD_REQUEST",
                "message": "project_id and question are required",
            })
            return

        sb = get_supabase_client()

        # 3. Fetch project config
        cfg_resp = (
            sb.table("qasql_project_configs")
            .select("*")
            .eq("project_id", project_id)
            .single()
            .execute()
        )
        config = cfg_resp.data
        if not config:
            self._respond(404, {
                "success": False,
                "error": "NOT_FOUND",
                "message": "Project config not found",
            })
            return

        schema_cache_path: str = config.get("schema_cache_path") or ""
        if not schema_cache_path:
            self._respond(400, {
                "success": False,
                "error": "BAD_REQUEST",
                "message": "Schema not initialized. Run setup first.",
            })
            return

        with tempfile.TemporaryDirectory() as tmp:
            output_dir = os.path.join(tmp, "qasql_output")
            try:
                # 4. Download schema files from Storage
                download_directory_from_storage(
                    STORAGE_BUCKET,
                    schema_cache_path,
                    Path(output_dir),
                )

                # 5. Build engine (setup() will detect existing files and skip LLM)
                engine = build_engine_from_config(config, output_dir=output_dir)
                setup_result = engine.setup()
                if not setup_result.success:
                    raise RuntimeError(
                        "Schema load failed: " + "; ".join(setup_result.errors or [])
                    )

                # 6. Generate SQL
                query_result = engine.query(question=question, hint=hint)

                response_data: dict = {
                    "sql": query_result.sql,
                    "confidence": query_result.confidence,
                    "reasoning": query_result.reasoning,
                    "candidates_tried": query_result.total_candidates,
                    "candidates_succeeded": query_result.successful_candidates,
                    "metadata": query_result.metadata,
                }

                # 7. Execute SQL if requested
                if execute and query_result.sql:
                    rows, columns = engine.execute_sql(query_result.sql)
                    response_data["rows"] = rows
                    response_data["columns"] = columns

                self._respond(200, {"success": True, "data": response_data})

            except Exception as exc:
                safe_msg = str(exc).split("\n")[0][:200]
                self._respond(500, {
                    "success": False,
                    "error": "QUERY_FAILED",
                    "message": safe_msg,
                })

    # ------------------------------------------------------------------
    def _respond(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):
        pass
