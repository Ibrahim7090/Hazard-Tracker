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

ALLOWED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/pjpeg",
}

AI_BUSY_MESSAGE = "AI is busy, please fill the form manually"
DEMO_REPORTS = (
    {
        "title": "Demo: Deep pothole on main road",
        "description": "A deep pothole is forcing vehicles to slow down and swerve near the intersection.",
        "category": "Road & Transport",
        "hazard_type": "Pothole",
        "location": "Near a main-road intersection (sample)",
        "latitude": 30.1612,
        "longitude": 71.5301,
        "priority": "High",
        "status": "Pending",
    },
    {
        "title": "Demo: Streetlight out by crossing",
        "description": "A streetlight beside the pedestrian crossing is not working after dark.",
        "category": "Electrical & Utilities",
        "hazard_type": "Streetlight outage",
        "location": "Beside a pedestrian crossing (sample)",
        "latitude": 30.1549,
        "longitude": 71.5198,
        "priority": "Medium",
        "status": "In review",
    },
)
DEMO_REPORT_TITLES = {report["title"] for report in DEMO_REPORTS}


class AIBusyError(Exception):
    pass


def _is_rate_limit_error(error):
    if str(getattr(error, "code", "")) == "429":
        return True

    status = str(getattr(error, "status", "")).upper()
    return status == "RESOURCE_EXHAUSTED" or "RESOURCE_EXHAUSTED" in str(error).upper()


def _generate_content_with_fallback(client, app, contents, config):
    try:
        return client.models.generate_content(
            model=app.config["GEMINI_MODEL"],
            contents=contents,
            config=config,
        )
    except Exception as primary_error:
        if not _is_rate_limit_error(primary_error):
            raise

        app.logger.warning(
            "Gemini primary model %s was rate limited; retrying with fallback model %s",
            app.config["GEMINI_MODEL"],
            app.config["GEMINI_FALLBACK_MODEL"],
        )
        try:
            return client.models.generate_content(
                model=app.config["GEMINI_FALLBACK_MODEL"],
                contents=contents,
                config=config,
            )
        except Exception as fallback_error:
            app.logger.exception("Gemini fallback model failed after primary rate limit")
            raise AIBusyError from fallback_error


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
        reports = HazardReport.query.order_by(HazardReport.id).all()
        if not reports:
            db.session.add_all(HazardReport(**data) for data in DEMO_REPORTS)
            db.session.commit()
        else:
            test_reports = [
                report
                for report in reports
                if report.title == "Test"
                and report.description == "Test"
                and report.category == "Road & Transport"
                and report.hazard_type == "Test"
                and report.location is None
                and report.latitude == 0
                and report.longitude == 0
                and report.priority.lower() == "low"
                and report.status.lower() == "pending"
            ]
            for index, report in enumerate(test_reports):
                for field, value in DEMO_REPORTS[index % len(DEMO_REPORTS)].items():
                    setattr(report, field, value)
            if test_reports:
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
            return jsonify({"error": "Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env"}), 503

        image = request.files.get("image")
        if not image or not image.filename:
            return jsonify({"error": "Choose an image to analyze"}), 400

        mime_type = (image.mimetype or "").lower()
        if mime_type not in ALLOWED_IMAGE_MIME_TYPES:
            return jsonify({"error": "Use a JPG, JPEG, PNG, or WebP image"}), 400

        image_bytes = image.read()
        if not image_bytes:
            return jsonify({"error": "The uploaded image is empty"}), 400

        prompt = f"""Analyze this photo for a public hazard report. Return JSON with these fields:
title: a short report title
category: exactly one of {", ".join(HAZARD_CATEGORIES)}
hazard_type: the specific visible hazard
priority: exactly Low, Medium, or High
description: a concise description of what is visible

Use only evidence visible in the photo. Do not guess the location. Use High for an
immediate danger, Medium when timely attention is needed, and Low for a minor issue."""

        try:
            client = app.extensions.get("gemini_client")
            if client is None:
                client = genai.Client(api_key=app.config["GEMINI_API_KEY"])
                app.extensions["gemini_client"] = client

            response = _generate_content_with_fallback(
                client,
                app,
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=mime_type,
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
            app.logger.exception("Image analysis returned invalid JSON")
            return jsonify({"error": "Could not read the analysis. Try another image."}), 502
        except AIBusyError:
            return jsonify({"error": AI_BUSY_MESSAGE}), 503
        except Exception as exc:
            app.logger.exception("Image analysis failed")
            return jsonify({"error": f"Image analysis failed: {exc}"}), 502

    @app.post("/api/reports/<int:report_id>/summary")
    def summarize_report(report_id):
        report = db.session.get(HazardReport, report_id)
        if report is None:
            return jsonify({"error": "Report not found"}), 404
        if not app.config["GEMINI_API_KEY"]:
            return jsonify({"error": "Gemini API key is not configured. Add GEMINI_API_KEY to backend/.env"}), 503

        report_facts = {
            "title": report.title,
            "category": report.category,
            "hazard_type": report.hazard_type,
            "description": report.description,
            "priority": report.priority,
            "status": report.status,
        }
        prompt = f"""Using only these report facts, write one factual present-tense sentence of
12 words or fewer. Do not infer or invent details. Return JSON with exactly:
summary (string), danger_level (one of Low, Moderate, High).

Report data:
{json.dumps(report_facts, ensure_ascii=False)}"""

        try:
            client = app.extensions.get("gemini_client")
            if client is None:
                client = genai.Client(api_key=app.config["GEMINI_API_KEY"])
                app.extensions["gemini_client"] = client

            response = _generate_content_with_fallback(
                client,
                app,
                contents=[prompt],
                config=genai.types.GenerateContentConfig(
                    response_mime_type="application/json",
                    max_output_tokens=64,
                    thinking_config=genai.types.ThinkingConfig(
                        thinking_level="MINIMAL"
                    ),
                ),
            )
            result = json.loads(response.text or "{}")
            summary = result.get("summary")
            danger_level = result.get("danger_level")
            if not isinstance(summary, str) or not summary.strip():
                raise ValueError("Gemini returned an empty summary")
            if danger_level not in {"Low", "Moderate", "High"}:
                raise ValueError("Gemini returned an invalid danger level")

            return jsonify(
                {
                    "summary": summary.strip(),
                    "danger_level": danger_level,
                }
            )
        except (json.JSONDecodeError, TypeError, ValueError):
            app.logger.exception("Report summary returned invalid JSON")
            return jsonify({"error": "Could not read the AI summary. Please try again."}), 502
        except AIBusyError:
            return jsonify({"error": AI_BUSY_MESSAGE}), 503
        except Exception as exc:
            app.logger.exception("Report summary failed")
            return jsonify({"error": f"AI summary failed: {exc}"}), 502

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

    @app.delete("/api/reports/<int:report_id>")
    def delete_report(report_id):
        report = db.session.get(HazardReport, report_id)
        if report is None:
            return jsonify({"error": "Report not found"}), 404
        if report.title in DEMO_REPORT_TITLES:
            return jsonify({"error": "Sample hazards cannot be deleted"}), 403

        image_path = report.image_path
        try:
            db.session.delete(report)
            db.session.commit()
        except Exception:
            db.session.rollback()
            app.logger.exception("Could not delete hazard report %s", report_id)
            return jsonify({"error": "Could not delete the report"}), 500

        if image_path:
            try:
                (Path(app.config["UPLOAD_FOLDER"]) / image_path).unlink(missing_ok=True)
            except OSError:
                app.logger.exception("Could not remove uploaded image for report %s", report_id)

        return "", 204

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
        "is_demo": report.title in DEMO_REPORT_TITLES,
    }
