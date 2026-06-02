# Crowdfunding Deal Radar

Production-style PoC for the **Real Rails Intelligence Library**, focused on the **Capital Formation** rail.

This demo turns public crowdfunding deal information into a clean, dark intelligence dashboard for everyday viewers, builders, and allocators. It uses SEC EDGAR as the public filing reference point and clearly labeled synthetic campaign metrics where public portal-level event feeds are not available.

## Project Summary

**PoC ID:** 82  
**Rail Category:** Capital Formation  
**Core Topic:** Public deal feed, terms, sectors, and traction snapshots  
**Primary Source:** [SEC EDGAR Search](https://www.sec.gov/edgar/search/)  
**Mock Data Policy:** Synthetic campaign metrics are used for traction and portal-style signals.

## Features

- Deal table with issuer, sector, portal, committed capital, traction, and compare controls.
- Sector filter for scanning active deals by market category.
- Portal filter for viewing distribution across crowdfunding platforms.
- Terms cards for the selected deal, including security type, target raise, and maximum raise.
- Traction chart showing deal momentum and visibility signals.
- Compare deals panel for side-by-side terms and traction review.
- "Why This Matters" narrative panel.
- "Who Controls the Rail" power-dynamics panel.
- Data source status panel showing synthetic/live mode.
- Downloadable CSV sample data for the currently filtered dataset.
- SEC EDGAR link for public filing lookup.

## Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn-style reusable UI primitives
- TanStack Table
- Apache ECharts
- Plotly
- D3 utilities
- Lucide icons

### Backend

- Python FastAPI
- Pandas for normalization and metric calculation
- DuckDB for filtering/querying the in-memory dataset
- CSV export endpoint

## Data Approach

SEC EDGAR is used as the public source reference for issuer filing lookup. Because regulation crowdfunding portal campaign metrics are not uniformly available as a public event-level feed, this PoC uses representative synthetic data for:

- committed capital
- target raise
- maximum raise
- valuation cap
- investor count
- monthly revenue
- revenue growth
- traction score
- visibility score
- terms score
- rail control score

The app labels this mode as **Synthetic** in the Data Source Status panel.

## Project Structure

```text
.
|-- frontend/             # Next.js application
|   |-- app/              # App Router page and global styles
|   |-- components/ui/    # Reusable UI primitives
|   |-- lib/              # Shared frontend data/types/utilities
|   |-- types/            # Local TypeScript declarations
|   |-- package.json      # Frontend scripts and dependencies
|   |-- next.config.mjs
|   |-- tailwind.config.ts
|   |-- tsconfig.json
|   `-- postcss.config.js
|-- backend/              # FastAPI service and ETL-style normalization logic
|   |-- main.py           # FastAPI entry point
|   |-- requirements.txt  # Backend Python dependencies
|   `-- start-backend.ps1 # Windows backend launcher
|-- mock-data/            # Synthetic dataset for testing
|   |-- crowdfunding_deals_synthetic.json  # Primary data source
|   `-- crowdfunding_deals_synthetic.csv   # CSV reference
`-- README.md
```

## Running Locally

Clone the repository:

```powershell
git clone https://github.com/Real-Rails-Interns-Batch4/PoC-82-crowdfunding-deal-radar.git
cd PoC-82-crowdfunding-deal-radar
```

Install frontend dependencies:

```powershell
cd frontend
npm install
```

Start the Next.js frontend:

```powershell
npm run dev
```

Start the FastAPI backend in a second terminal:

```powershell
.\backend\start-backend.ps1
```

The backend now loads its dataset from `mock-data/crowdfunding_deals_synthetic.json`, ensuring consistency between the UI and the data model.

Open the frontend:

```text
http://localhost:3000
```

If port `3000` is already in use, Next.js may choose another port such as:

```text
http://localhost:3001
```

Backend health check:

```text
http://127.0.0.1:8000/api/health
```

## Running With Docker

This repo includes a production-style multi-stage `Dockerfile` and a `docker-compose.yml` file for running the full stack with one command.

### Prerequisite

Install and start Docker Desktop before running Docker commands:

```powershell
docker --version
docker compose version
```

If PowerShell says `docker` is not recognized, Docker Desktop is not installed, not running, or not available on PATH.

### Environment File

Create a local `.env` file from the example:

```powershell
copy .env.example .env
```

Edit `.env` only if you need to add keys or change ports:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=
MAPBOX_TOKEN=
DATA_API_KEY=
SEC_USER_AGENT=Crowdfunding Deal Radar PoC
FRONTEND_PORT=3000
BACKEND_PORT=8000
```

The real `.env` file is ignored by Git. Commit `.env.example`, not `.env`.

### Start The Full Stack

From the repository root:

```powershell
docker compose up --build
```

Open the frontend:

```text
http://localhost:3000
```

Check the backend:

```text
http://localhost:8000/api/health
```

Stop the stack:

```powershell
docker compose down
```

### Docker Architecture

The `Dockerfile` contains two production targets:

- `frontend-runner`: installs dependencies, builds the Next.js standalone output, and serves the frontend with Node.
- `backend-runner`: installs FastAPI/Pandas/DuckDB dependencies and serves the API with Uvicorn.

The compose file builds both services from the same `Dockerfile` using different targets.

Important: `NEXT_PUBLIC_*` variables are baked into the Next.js frontend at build time. If you change `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_MAPBOX_TOKEN`, rebuild the frontend image:

```powershell
docker compose build frontend
docker compose up
```

### Render Deployment Note

If Azure is not available, this project can be adapted to Render. The recommended Render setup is two Web Services:

- `backend`: FastAPI service from `backend/`, exposing port `8000`.
- `frontend`: Next.js service from `frontend/`, with `NEXT_PUBLIC_API_BASE_URL` pointing to the Render backend URL.

For Render environment variables, use the same names from `.env.example`.

## Backend Notes For Windows And Pandas

The Pandas issue is **not expected for everyone**. It mainly affects users running very new Python versions, especially Python 3.14, where some pinned data-science packages may not yet have prebuilt wheels.

If Python uses a compatible wheel, installation should work normally. If Python tries to build Pandas from source and fails with a Meson or Visual Studio toolchain error, use Python 3.13.

This project includes a Windows helper script:

```powershell
cd backend
.\start-backend.ps1
```

The script uses Python 3.13 and creates the backend virtual environment under:

```text
%LOCALAPPDATA%\dextere-radar\.venv313
```

This also avoids virtualenv launcher-copy issues that can happen on mapped drives such as `Z:`.

Recommended backend setup on Windows:

```powershell
py -3.13 --version
.\backend\start-backend.ps1
```

If `py -3.13 --version` fails, install Python 3.13 from python.org or use another Python version that can install `pandas==2.2.3` from a wheel.

Manual backend setup:

```powershell
py -3.13 -m venv "$env:LOCALAPPDATA\dextere-radar\.venv313"
& "$env:LOCALAPPDATA\dextere-radar\.venv313\Scripts\activate.ps1"
pip install -r backend\requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

```text
GET /api/health
```

Returns backend status and the SEC EDGAR source link.

```text
GET /api/deals
```

Returns normalized deal records, available sectors, and source status.

Optional query parameters:

```text
sector=Fintech
portal=Republic
```

```text
GET /api/deals/download
```

Downloads the filtered dataset as CSV.

Optional query parameters:

```text
sector=Climate%20Tech
portal=Wefunder
```

## Verification

The current implementation has been checked for:

- Next.js production build.
- FastAPI import and data response.
- Deal table rendering.
- Sector filtering.
- Terms cards.
- Traction chart rendering.
- Compare deals workflow.
- Downloadable sample data.
- DEXTERE dark dashboard styling.

Build command:

```powershell
cd frontend
npm run build
```

## Submission Note

This is a PoC-grade intelligence dashboard. It is intentionally scoped to a small representative dataset so reviewers can evaluate the workflow, visual language, and rail-intelligence framing without requiring live portal integrations.

Recommended supervisor note:

```text
This demo uses SEC EDGAR as the public filing reference and synthetic campaign metrics for crowdfunding traction signals because public portal-level event feeds are not uniformly available. The app demonstrates the required deal table, sector filtering, terms cards, traction chart, compare workflow, narrative rail panels, and CSV export.
```
