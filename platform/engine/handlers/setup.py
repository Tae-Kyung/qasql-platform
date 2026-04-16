"""
Vercel Python Serverless Function — POST /internal/engine/setup
Rewrites to: engine/handlers/setup.py

Receives: { project_id: string }
Header:   x-internal-secret: <INTERNAL_API_SECRET>

1. Verify internal secret
2. Fetch project config from Supabase
3. Decrypt DB/LLM credentials
4. Run QASQLEngine.setup() in a temp dir
5. Upload qasql_output/ to Supabase Storage (schema-cache bucket)
6. Update schema_status = 'done' (or 'error' on failure)
"""
import sys
import os
import json
import tempfile
import datetime
from pathlib import Path
from http.server import BaseHTTPRequestHandler

# Resolve engine/ root so _utils can be imported
_ENGINE_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _ENGINE_ROOT not in sys.path:
    sys.path.insert(0, _ENGINE_ROOT)

from _utils import (  # noqa: E402
    get_supabase_client,
    build_engine_from_config,
    upload_directory_to_storage,
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
            raw = self.rfile.read(content_length)
            body = json.loads(raw)

        project_id: str = body.get("project_id", "")
        if not project_id:
            self._respond(400, {
                "success": False,
                "error": "BAD_REQUEST",
                "message": "project_id is required",
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

        # 4. Run setup in isolated temp directory
        with tempfile.TemporaryDirectory() as tmp:
            output_dir = os.path.join(tmp, "qasql_output")
            try:
                engine = build_engine_from_config(config, output_dir=output_dir)
                setup_result = engine.setup(force=True)

                if not setup_result.success:
                    raise RuntimeError(
                        "Setup failed: " + "; ".join(setup_result.errors or [])
                    )

                # 5. Upload output files to Supabase Storage
                storage_prefix = f"projects/{project_id}/qasql_output"
                upload_directory_to_storage(
                    STORAGE_BUCKET,
                    storage_prefix,
                    Path(output_dir),
                )

                # 6. Mark as done
                sb.table("qasql_project_configs").update({
                    "schema_status": "done",
                    "schema_cache_path": storage_prefix,
                    "schema_updated_at": datetime.datetime.utcnow().isoformat(),
                }).eq("project_id", project_id).execute()

                self._respond(200, {
                    "success": True,
                    "data": {
                        "tables_found": setup_result.tables_found,
                        "schema_cache_path": storage_prefix,
                    },
                })

            except Exception as exc:
                safe_msg = str(exc).split("\n")[0][:200]
                try:
                    sb.table("qasql_project_configs").update({
                        "schema_status": "error",
                    }).eq("project_id", project_id).execute()
                except Exception:
                    pass
                self._respond(500, {
                    "success": False,
                    "error": "SETUP_FAILED",
                    "message": safe_msg,
                })

    # ------------------------------------------------------------------
    def _respond(self, status: int, body: dict) -> None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):  # suppress default stderr log
        pass
