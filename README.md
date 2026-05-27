# DEXTERE Crowdfunding Deal Radar

Full-stack PoC for project `82 - Crowdfunding Deal Radar`.

## Run

```bash
npm install
npm run dev
```

In another terminal:

```bash
.\start-backend.ps1
```

On this workstation, Python 3.14 is the default and may try to build Pandas from source. The `start-backend.ps1` launcher creates the Python 3.13 environment under `%LOCALAPPDATA%\dextere-radar\.venv313` because virtualenv launcher creation can fail on the mapped `Z:` drive. To run it manually:

```bash
py -3.13 -m venv "$env:LOCALAPPDATA\dextere-radar\.venv313"
& "$env:LOCALAPPDATA\dextere-radar\.venv313\Scripts\activate.ps1"
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The frontend falls back to the same synthetic dataset if the FastAPI service is not running.

## Source

Primary public filing lookup: [SEC EDGAR Search](https://www.sec.gov/edgar/search/).
