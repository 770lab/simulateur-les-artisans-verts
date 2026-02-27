# Export Pixel CRM – EXPORT ANTHO

Automated daily export of dossiers from Pixel CRM using the **EXPORT ANTHO** model, with upload to Google Drive.

## Prerequisites

- Python 3.9+
- A Google Cloud service account with the **Google Drive API** enabled
- The target Google Drive folder shared with the service account email (Editor permission)
- Pixel CRM credentials (email + password)

## Setup

```bash
cd export_pixel
pip install -r requirements.txt
```

Place your Google Service Account JSON file in this directory as `service_account.json`.

### Configuration

Set the following environment variables (or edit the values directly in `export_pixel_crm.py`):

| Variable | Description | Default |
|---|---|---|
| `PIXEL_EMAIL` | Pixel CRM login email | — |
| `PIXEL_PASSWORD` | Pixel CRM password | — |
| `MODEL_ID` | Export model UUID | `78ec69e7-01e7-48c0-7fbd-08dccc1d440f` |
| `GOOGLE_DRIVE_FOLDER_ID` | Target Drive folder ID | — |
| `GOOGLE_SERVICE_ACCOUNT_FILE` | Path to service account JSON | `./service_account.json` |
| `HEURE_EXPORT` | Daily export time (HH:MM) | `07:00` |

## Usage

```bash
python3 export_pixel_crm.py
```

The script will:

1. Run an export immediately on startup.
2. Then repeat every day at the configured time.
3. Each run authenticates to Pixel CRM, downloads the CSV, and uploads it to Google Drive as `export_antho_YYYY-MM-DD.csv`.

Keep the terminal open or use a process manager (e.g. `tmux`, `pm2`, `launchd`) to keep the script running in the background.
