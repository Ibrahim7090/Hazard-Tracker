import json
from pathlib import Path

from flask import Flask, jsonify, request
from google import genai

from .config import Config
from .constants import HAZARD_CATEGORIES
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

    @app.post("/api/analyze-image")
    def analyze_image():
        if not app.config["GEMINI_API_KEY"]:
            return jsonify({"error": "Gemini API key is not configured"}), 503

        image = request.files.get("image")
        if not image or not image.filename:
            return jsonify({"error": "Choose an image to analyze"}), 400

        if image.mimetype not in {"image/jpeg", "image/png", "image/webp"}:
            return jsonify({"error": "Use a JPEG, PNG, or WebP image"}), 400

        prompt = f"""Analyze this photo for a public hazard report. Return JSON with these fields:
title: a short report title
category: exactly one of {", ".join(HAZARD_CATEGORIES)}
hazard_type: the specific visible hazard
priority: exactly Low, Medium, or High
description: a concise description of what is visible

Use only evidence visible in the photo. Do not guess the location. Use High for an
immediate danger, Medium when timely attention is needed, and Low for a minor issue."""

        try:
            client = genai.Client(api_key=app.config["GEMINI_API_KEY"])
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(
                        data=image.read(),
                        mime_type=image.mimetype,
                    ),
                ],
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json"
                ),
            )
            result = json.loads(response.text or "{}")

            required_fields = ("title", "category", "hazard_type", "priority", "description")
            if any(not isinstance(result.get(field), str) or not result[field].strip() for field in required_fields):
                raise ValueError("Gemini returned incomplete report details")
            if result["category"] not in HAZARD_CATEGORIES:
                raise ValueError("Gemini returned an unknown category")
            if result["priority"] not in {"Low", "Medium", "High"}:
                raise ValueError("Gemini returned an unknown priority")

            return jsonify({field: result[field].strip() for field in required_fields})
        except (json.JSONDecodeError, TypeError, ValueError):
            return jsonify({"error": "Could not read the analysis. Try another image."}), 502
        except Exception:
            return jsonify({"error": "Image analysis failed. Check your Gemini API key and try again."}), 502

    @app.post("/api/reports")
    def create_report():
        data = request.get_json(silent=True) or request.form.to_dict()

        if not data.get("title"):
            return jsonify({"error": "Title is required"}), 400

        return jsonify(
            {
                "status": "ok",
                "message": "Report received",
                "title": data.get("title"),
            }
        ), 201

    return app
