import os
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")


def _resolve_backend_path(value):
    path = Path(value)
    if not path.is_absolute():
        path = _BACKEND_DIR / path
    return path


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
    GEMINI_API_KEY = (os.getenv("GEMINI_API_KEY") or "").strip() or None
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{(_BACKEND_DIR / 'instance' / 'hazardwatch.db').as_posix()}",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = str(_resolve_backend_path(os.getenv("UPLOAD_FOLDER", "uploads")))
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
