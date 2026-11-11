import json
from pathlib import Path
from uuid import uuid4

from flask import Flask, jsonify, request, send_from_directory
from google import genai
from werkzeug.utils import secure_filename

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

    with app.app_context():
        db.create_all()
        report_columns = {
            column["name"]
            for column in db.inspect(db.engine).get_columns(HazardReport.__tablename__)
        }
        if "location" not in report_columns:
            with db.engine.begin() as connection:
                connection.execute(
                    db.text("ALTER TABLE hazard_report ADD COLUMN location VARCHAR(255)")
                )
        if HazardReport.query.count() == 0:
            db.session.add_all(
                [
                    HazardReport(
                        title="Demo: Roadside pothole",
                        description="A large pothole is slowing traffic near the main road.",
                        category="Road & Transport",
                        hazard_type="Pothole",
                        location="Near the main road (demo)",
                        latitude=30.1612,
                        longitude=71.5301,
                        priority="High",
                        status="Pending",
                    ),
                    HazardReport(
                        title="Demo: Damaged streetlight",
                        description="A streetlight is not working along the pedestrian path.",
                        category="Electrical & Utilities",
                        hazard_type="Streetlight outage",
                        location="Along the pedestrian path (demo)",
                        latitude=30.1549,
                        longitude=71.5198,
                        priority="Medium",
                        status="In review",
                    ),
                ]
            )
            db.session.commit()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/uploads/<path:filename>")
    def get_uploaded_image(filename):
        return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

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
        data = request.form
        required_fields = (
            "title",
            "description",
            "category",
            "hazard_type",
            "priority",
            "latitude",
            "longitude",
        )
        if any(not data.get(field, "").strip() for field in required_fields):
            return jsonify({"error": "Complete all required report fields"}), 400
        if data["category"] not in HAZARD_CATEGORIES:
            return jsonify({"error": "Choose a valid category"}), 400
        if data["priority"] not in {"Low", "Medium", "High"}:
            return jsonify({"error": "Choose a valid priority"}), 400

        try:
            latitude = float(data["latitude"])
            longitude = float(data["longitude"])
        except ValueError:
            return jsonify({"error": "Enter valid latitude and longitude"}), 400
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            return jsonify({"error": "Latitude or longitude is out of range"}), 400

        status = data.get("status", "Pending")
        if status not in {"Pending", "In review", "Resolved"}:
            return jsonify({"error": "Choose a valid status"}), 400

        image = request.files.get("image")
        image_path = None
        if image and image.filename:
            if image.mimetype not in {"image/jpeg", "image/png", "image/webp"}:
                return jsonify({"error": "Use a JPEG, PNG, or WebP image"}), 400
            filename = secure_filename(image.filename) or "image"
            image_path = f"{uuid4().hex}_{filename}"
            image.save(Path(app.config["UPLOAD_FOLDER"]) / image_path)

        report = HazardReport(
            title=data["title"].strip(),
            description=data["description"].strip(),
            category=data["category"],
            hazard_type=data["hazard_type"].strip(),
            location=data.get("location", "").strip() or None,
            image_path=image_path,
            latitude=latitude,
            longitude=longitude,
            priority=data["priority"],
            status=status,
        )
        try:
            db.session.add(report)
            db.session.commit()
        except Exception:
            db.session.rollback()
            app.logger.exception("Could not save hazard report")
            if image_path:
                (Path(app.config["UPLOAD_FOLDER"]) / image_path).unlink(missing_ok=True)
            return jsonify({"error": "Could not save the report"}), 500

        return jsonify(_report_to_dict(report)), 201

    @app.get("/api/reports")
    def get_reports():
        reports = HazardReport.query.order_by(
            HazardReport.created_at.desc(), HazardReport.id.desc()
        ).all()
        return jsonify([_report_to_dict(report) for report in reports])

    return app


def _report_to_dict(report):
    return {
        "id": report.id,
        "title": report.title,
        "description": report.description,
        "category": report.category,
        "hazard_type": report.hazard_type,
        "location": report.location,
        "image_path": report.image_path,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "priority": report.priority,
        "status": report.status,
        "created_at": report.created_at.isoformat(),
    }
