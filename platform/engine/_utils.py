"""
QA-SQL Engine Utilities
- AES-256-GCM decrypt (compatible with Node.js crypto format)
- Supabase service_role client
- Storage upload/download helpers
- Engine factory from project config
"""
import os
import base64
import json
import datetime
from pathlib import Path


# ---------------------------------------------------------------------------
# Crypto
# ---------------------------------------------------------------------------

def decrypt(encrypted_data: str) -> str:
    """
    AES-256-GCM decryption compatible with Node.js encrypt().
    Format: "iv:authTag:ciphertext" (each part base64-encoded)
    ENCRYPTION_KEY env var: hex-encoded 32-byte key
    """
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key_hex = os.environ.get("ENCRYPTION_KEY", "")
    if not key_hex:
        raise ValueError("ENCRYPTION_KEY environment variable is not set")

    key = bytes.fromhex(key_hex)

    parts = encrypted_data.split(":")
    if len(parts) != 3:
        raise ValueError("Invalid encrypted format — expected iv:authTag:ciphertext")

    iv = base64.b64decode(parts[0])
    auth_tag = base64.b64decode(parts[1])
    ciphertext = base64.b64decode(parts[2])

    aesgcm = AESGCM(key)
    # AESGCM.decrypt expects ciphertext+tag concatenated
    plaintext = aesgcm.decrypt(iv, ciphertext + auth_tag, None)
    return plaintext.decode("utf-8")


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------

def get_supabase_client():
    """Return a Supabase service_role client."""
    from supabase import create_client

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise ValueError("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set")

    return create_client(url, key)


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

STORAGE_BUCKET = "schema-cache"


def upload_directory_to_storage(bucket: str, prefix: str, local_dir: Path) -> None:
    """Upload every file under local_dir to Supabase Storage at prefix/."""
    sb = get_supabase_client()
    for file_path in local_dir.rglob("*"):
        if not file_path.is_file():
            continue
        relative = file_path.relative_to(local_dir)
        storage_path = f"{prefix}/{str(relative).replace(chr(92), '/')}"
        data = file_path.read_bytes()
        content_type = "application/json" if file_path.suffix == ".json" else "application/octet-stream"
        sb.storage.from_(bucket).upload(
            storage_path,
            data,
            {"content-type": content_type, "upsert": "true"},
        )


def _download_recursive(sb, bucket: str, prefix: str, local_dir: Path) -> None:
    """Recursively download Storage objects under prefix into local_dir."""
    items = sb.storage.from_(bucket).list(prefix) or []
    for item in items:
        name = item.get("name", "")
        if not name:
            continue
        item_storage_path = f"{prefix}/{name}"
        if item.get("id") is None:
            # Folder — recurse
            sub_dir = local_dir / name
            sub_dir.mkdir(parents=True, exist_ok=True)
            _download_recursive(sb, bucket, item_storage_path, sub_dir)
        else:
            # File
            raw = sb.storage.from_(bucket).download(item_storage_path)
            out = local_dir / name
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(raw)


def download_directory_from_storage(bucket: str, prefix: str, local_dir: Path) -> None:
    """Download all files under prefix from Supabase Storage into local_dir."""
    local_dir.mkdir(parents=True, exist_ok=True)
    sb = get_supabase_client()
    _download_recursive(sb, bucket, prefix, local_dir)


# ---------------------------------------------------------------------------
# Engine factory
# ---------------------------------------------------------------------------

def build_engine_from_config(config: dict, output_dir: str = "/tmp/qasql_output"):
    """Build a QASQLEngine from a qasql_project_configs row (with encrypted fields)."""
    from qasql import QASQLEngine

    db_type = config.get("db_type", "")
    llm_provider = config.get("llm_provider", "anthropic")
    llm_model = config.get("llm_model") or None
    llm_base_url = config.get("llm_base_url") or "http://localhost:11434"

    # Inject LLM API key into environment
    if llm_provider in ("anthropic", "openai"):
        api_key_enc = config.get("llm_api_key_enc")
        if api_key_enc:
            env_key = "ANTHROPIC_API_KEY" if llm_provider == "anthropic" else "OPENAI_API_KEY"
            os.environ[env_key] = decrypt(api_key_enc)

    kwargs = {
        "llm_provider": llm_provider,
        "output_dir": output_dir,
    }
    if llm_model:
        kwargs["llm_model"] = llm_model
    if llm_provider == "ollama":
        kwargs["llm_base_url"] = llm_base_url

    if db_type == "postgresql":
        password = decrypt(config["db_password_enc"]) if config.get("db_password_enc") else ""
        kwargs.update(
            db_type="postgresql",
            db_host=config.get("db_host", "localhost"),
            db_port=int(config.get("db_port") or 5432),
            db_name=config.get("db_name", ""),
            db_user=config.get("db_user", ""),
            db_password=password,
            db_sslmode=config.get("db_sslmode", "prefer"),
        )
    elif db_type == "supabase":
        key = decrypt(config["supabase_key_enc"]) if config.get("supabase_key_enc") else ""
        kwargs.update(
            db_type="supabase",
            supabase_url=config.get("supabase_url", ""),
            supabase_key=key,
        )
    elif db_type == "mysql":
        password = decrypt(config["db_password_enc"]) if config.get("db_password_enc") else ""
        kwargs.update(
            db_type="mysql",
            db_host=config.get("db_host", "localhost"),
            db_port=int(config.get("db_port") or 3306),
            db_name=config.get("db_name", ""),
            db_user=config.get("db_user", ""),
            db_password=password,
        )
    elif db_type == "sqlite":
        kwargs.update(
            db_type="sqlite",
            db_uri=f"sqlite:///{config.get('db_path', '/tmp/db.sqlite')}",
        )

    return QASQLEngine(**kwargs)


# ---------------------------------------------------------------------------
# Self-test (CHK-05-1)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import secrets
    import sys as _sys

    # Force UTF-8 output on Windows
    if hasattr(_sys.stdout, "reconfigure"):
        _sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    print("=== CHK-05-1: AES-256-GCM 호환성 테스트 ===\n")

    test_key = secrets.token_bytes(32)
    original_env_key = os.environ.get("ENCRYPTION_KEY")

    try:
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM

        plaintext = "Hello, QA-SQL Engine! Korean: 안녕하세요"

        # Simulate Node.js encrypt(): iv:authTag:ciphertext (all base64)
        iv = secrets.token_bytes(12)
        aesgcm = AESGCM(test_key)
        ct_with_tag = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
        ciphertext = ct_with_tag[:-16]
        auth_tag = ct_with_tag[-16:]

        encrypted = ":".join([
            base64.b64encode(iv).decode(),
            base64.b64encode(auth_tag).decode(),
            base64.b64encode(ciphertext).decode(),
        ])
        print(f"  Encrypted (truncated): {encrypted[:50]}...")

        os.environ["ENCRYPTION_KEY"] = test_key.hex()
        result = decrypt(encrypted)

        assert result == plaintext, f"Mismatch: {result!r} != {plaintext!r}"
        print(f"  [OK] 복호화 성공: '{result}'")

        if original_env_key:
            print(f"\n  [OK] ENCRYPTION_KEY 환경변수 설정됨 ({len(original_env_key)}자)")
        else:
            print("\n  [WARN] ENCRYPTION_KEY 환경변수 미설정 (테스트용 임시 키 사용됨)")

    finally:
        if original_env_key is not None:
            os.environ["ENCRYPTION_KEY"] = original_env_key
        elif "ENCRYPTION_KEY" in os.environ:
            del os.environ["ENCRYPTION_KEY"]

    print("\nCHK-05-1 통과")
