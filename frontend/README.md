# HazardWatch

## Hackathon MVP

HazardWatch is a community hazard-reporting app that helps people report, find, and review local public-safety issues. Residents can submit a hazard with its location and an optional photo, while others can explore reports on a map or browse and filter them in a list.

## The problem

Everyday hazards such as potholes, blocked drains, damaged streetlights, and unsafe infrastructure can go unnoticed or be difficult to communicate clearly. Reports may lack useful details or a precise location, making it harder for communities and responders to understand what needs attention.

## The solution

HazardWatch provides a simple place to create and view structured hazard reports. Browser geolocation attaches coordinates to a new report, and an interactive map shows the user's location separately from hazard markers. Optional AI features can draft report details from an uploaded image and create a short, text-only summary of an existing report with a danger level.

## How it works

1. A resident opens the map or nearby-hazards page to explore reports.
2. They create a report with a title, category, hazard type, priority, description, and current location. A photo is optional.
3. If a photo is uploaded, Gemini suggests draft report fields based on what is visible. The resident can review and edit the suggestions before submitting.
4. The Flask API saves report details in a local SQLite database and stores uploaded photos in the backend uploads folder.
5. The map and reports pages load the saved reports. Users can search, filter, sort nearby hazards, and request a concise AI summary based only on a report's saved text.
6. Users can delete their own reports. Built-in sample reports are labeled as demos and cannot be deleted.

AI-generated text is a convenience for understanding and drafting reports, not a substitute for checking the reported hazard or dispatching emergency services.

## MVP features

- Interactive hazard map with distinct user-location and hazard markers.
- Browser geolocation for map centering, nearby sorting, and report coordinates.
- Hazard report form with categories, priority, status, description, and optional location text/photo.
- Optional Gemini image analysis for a first draft of report details.
- Reports list with title search, category/status filters, and per-report AI summaries.
- User-report deletion; sample/demo records are protected.
- SQLite persistence and local photo uploads.

## Technology

- Frontend: React, Vite, React Bootstrap, React Router, Leaflet, and React-Leaflet.
- Backend: Python, Flask, Flask-SQLAlchemy, and Flask-CORS.
- Database: SQLite by default.
- AI: Google Gemini API, configured with `GEMINI_API_KEY`.

