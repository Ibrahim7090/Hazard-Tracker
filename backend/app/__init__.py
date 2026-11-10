from pathlib import Path

from flask import Flask

from .config import Config
from .extensions import cors, db
from .models.report import HazardReport

__all__ = ["create_app", "HazardReport"]


def create_app():
    app = Flask(
        __name__,
        static_folder=None,
        instance_path=str(Path(__file__).resolve().parent.parent / "instance"),
        instance_relative_config=True,
    )
    app.config.from_object(Config)

    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True)

    db.init_app(app)
    cors.init_app(app)

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    return app
