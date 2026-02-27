#!/usr/bin/env python3
"""
Automated daily export of dossiers from Pixel CRM ("EXPORT ANTHO" model)
and upload of the resulting CSV file to Google Drive.

Usage:
    1. Install dependencies:  pip install -r requirements.txt
    2. Configure the variables below (or set them as environment variables).
    3. Place your Google Service Account JSON at the path specified by
       GOOGLE_SERVICE_ACCOUNT_FILE.
    4. Share the target Google Drive folder with the service account email
       (Editor permission).
    5. Run:  python3 export_pixel_crm.py
"""

import datetime
import logging
import os
import sys
import time

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv is optional

import requests
import schedule
from bs4 import BeautifulSoup
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaInMemoryUpload

# ---------------------------------------------------------------------------
# Configuration – override with environment variables or edit directly
# ---------------------------------------------------------------------------
PIXEL_EMAIL = os.getenv("PIXEL_EMAIL", "votre_email@example.com")
PIXEL_PASSWORD = os.getenv("PIXEL_PASSWORD", "votre_mot_de_passe")
MODEL_ID = os.getenv(
    "MODEL_ID", "78ec69e7-01e7-48c0-7fbd-08dccc1d440f"
)  # EXPORT ANTHO
GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "votre_folder_id")
GOOGLE_SERVICE_ACCOUNT_FILE = os.getenv(
    "GOOGLE_SERVICE_ACCOUNT_FILE",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "service_account.json"),
)
HEURE_EXPORT = os.getenv("HEURE_EXPORT", "07:00")

# Pixel CRM URLs
LOGIN_URL = "https://crm.pixel-crm.fr/Account/Login"
RECHERCHE_URL = "https://crm.pixel-crm.fr/Dossiers/Isolation/Fiche/Recherche"
EXPORT_URL = "https://crm.pixel-crm.fr/Dossiers/Isolation/Fiche/ModelsCsv"

# Google Drive API scopes
SCOPES = ["https://www.googleapis.com/auth/drive.file"]

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pixel CRM helpers
# ---------------------------------------------------------------------------
def pixel_login(session: requests.Session) -> None:
    """Authenticate against Pixel CRM and store session cookies."""
    log.info("Fetching login page to obtain CSRF token …")
    resp = session.get(LOGIN_URL, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    token_input = soup.find("input", {"name": "__RequestVerificationToken"})
    if token_input is None:
        raise RuntimeError("CSRF token not found on login page")

    csrf_token = token_input["value"]

    log.info("Logging in as %s …", PIXEL_EMAIL)
    login_data = {
        "__RequestVerificationToken": csrf_token,
        "Email": PIXEL_EMAIL,
        "Password": PIXEL_PASSWORD,
    }
    resp = session.post(LOGIN_URL, data=login_data, timeout=30)
    resp.raise_for_status()

    if "Login" in resp.url and "Account/Login" in resp.url:
        raise RuntimeError(
            "Login failed – check PIXEL_EMAIL and PIXEL_PASSWORD"
        )

    log.info("Login successful.")


def fetch_recherche_token(session: requests.Session) -> str:
    """Fetch the Recherche page and return the CSRF token."""
    log.info("Fetching Recherche page for export token …")
    resp = session.get(RECHERCHE_URL, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    token_input = soup.find("input", {"name": "__RequestVerificationToken"})
    if token_input is None:
        raise RuntimeError("CSRF token not found on Recherche page")

    return token_input["value"]


def export_csv(session: requests.Session, csrf_token: str) -> bytes:
    """POST to ModelsCsv endpoint and return the raw CSV bytes."""
    log.info("Requesting CSV export (model %s) …", MODEL_ID)

    export_data = {
        "__RequestVerificationToken": csrf_token,
        "modelId": MODEL_ID,
    }
    resp = session.post(EXPORT_URL, data=export_data, timeout=120)
    resp.raise_for_status()

    content_type = resp.headers.get("Content-Type", "")
    if "text/csv" not in content_type and "application/octet-stream" not in content_type:
        # Some CRM endpoints return CSV with a generic content-type; accept
        # the response if it looks like CSV text.
        if not resp.text.strip() or "<html" in resp.text[:500].lower():
            raise RuntimeError(
                f"Unexpected response content-type: {content_type}"
            )

    log.info("CSV export received (%d bytes).", len(resp.content))
    return resp.content


# ---------------------------------------------------------------------------
# Google Drive helpers
# ---------------------------------------------------------------------------
def get_drive_service():
    """Build and return an authenticated Google Drive API service."""
    creds = service_account.Credentials.from_service_account_file(
        GOOGLE_SERVICE_ACCOUNT_FILE, scopes=SCOPES
    )
    return build("drive", "v3", credentials=creds)


def upload_to_drive(csv_bytes: bytes, filename: str) -> str:
    """Upload *csv_bytes* to Google Drive and return the file ID."""
    service = get_drive_service()

    file_metadata = {
        "name": filename,
        "parents": [GOOGLE_DRIVE_FOLDER_ID],
    }
    media = MediaInMemoryUpload(csv_bytes, mimetype="text/csv", resumable=True)

    log.info("Uploading %s to Google Drive folder %s …", filename, GOOGLE_DRIVE_FOLDER_ID)
    uploaded = (
        service.files()
        .create(body=file_metadata, media_body=media, fields="id")
        .execute()
    )
    file_id = uploaded.get("id")
    log.info("Upload complete – Drive file ID: %s", file_id)
    return file_id


# ---------------------------------------------------------------------------
# Main export routine
# ---------------------------------------------------------------------------
def run_export() -> None:
    """Execute the full export-and-upload pipeline."""
    log.info("=== Starting daily export ===")
    try:
        session = requests.Session()
        session.headers.update(
            {"User-Agent": "PixelCRM-Exporter/1.0"}
        )

        pixel_login(session)
        csrf_token = fetch_recherche_token(session)
        csv_bytes = export_csv(session, csrf_token)

        today = datetime.date.today().isoformat()
        filename = f"export_antho_{today}.csv"

        upload_to_drive(csv_bytes, filename)
        log.info("=== Export completed successfully ===")
    except Exception:
        log.exception("Export failed")


# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
def main() -> None:
    log.info("Pixel CRM exporter started.")
    log.info("Scheduled daily export at %s.", HEURE_EXPORT)

    # Run once immediately on startup for verification, then schedule daily.
    run_export()

    schedule.every().day.at(HEURE_EXPORT).do(run_export)

    try:
        while True:
            schedule.run_pending()
            time.sleep(30)
    except KeyboardInterrupt:
        log.info("Exporter stopped by user.")
        sys.exit(0)


if __name__ == "__main__":
    main()
