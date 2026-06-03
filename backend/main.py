from __future__ import annotations

import os
import json
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
from typing import Literal

import duckdb
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


SEC_SEARCH_URL = "https://www.sec.gov/edgar/search/"
MOCK_DATA_PATH = Path(__file__).parent.parent / "mock-data" / "crowdfunding_deals_synthetic.json"


class SourceStatus(BaseModel):
    source: str
    mode: Literal["live", "synthetic"]
    refreshedAt: str
    secSearchUrl: str


class DealPayload(BaseModel):
    deals: list[dict]
    sectors: list[str]
    status: SourceStatus


app = FastAPI(title="DEXTERE Crowdfunding Deal Radar", version="0.1.0")

# Dynamic CORS origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_mock_deals() -> list[dict]:
    if not MOCK_DATA_PATH.exists():
        return []
    with open(MOCK_DATA_PATH, "r") as f:
        data = json.load(f)
    return data.get("entities", {}).get("CrowdfundingDeal", [])


def normalized_deals() -> pd.DataFrame:
    raw_deals = load_mock_deals()
    frame = pd.DataFrame(raw_deals)
    if frame.empty:
        return frame

    # Ensure monthlyRevenue is not None for calculations
    frame["monthlyRevenue"] = frame["monthlyRevenue"].fillna(0)

    frame["commitmentRatio"] = frame["committed"] / frame["maxRaise"]
    frame["tractionScore"] = (
        (frame["commitmentRatio"].clip(upper=1) * 42)
        + (frame["revenueGrowth"].clip(upper=50) / 50 * 28)
        + (frame["investorCount"].clip(upper=2200) / 2200 * 30)
    ).round()
    frame["visibilityScore"] = (
        (frame["investorCount"].clip(upper=2200) / 2200 * 55)
        + (frame["commitmentRatio"].clip(upper=1) * 45)
    ).round()
    frame["termsScore"] = (
        100
        - (frame["valuationCap"] / frame["monthlyRevenue"].replace(0, 1)).clip(upper=260) / 260 * 32
        + (frame["targetRaise"] / frame["maxRaise"] * 18)
    ).clip(lower=0, upper=100).round()
    frame["railControlScore"] = (
        40
        + frame["portal"].map({"Republic": 21, "Wefunder": 18, "StartEngine": 24, "Netcapital": 16}).fillna(15)
        + frame["formType"].map({"Form C/A": 10, "Form C": 6}).fillna(5)
        + (frame["daysRemaining"].clip(upper=45) / 45 * 18)
    ).clip(upper=100).round()
    score_columns = ["tractionScore", "visibilityScore", "termsScore", "railControlScore"]
    frame[score_columns] = frame[score_columns].astype(int)
    return frame


def filter_deals(frame: pd.DataFrame, sector: str | None, portal: str | None) -> pd.DataFrame:
    conn = duckdb.connect(database=":memory:")
    conn.register("deals", frame)
    clauses: list[str] = []
    params: list[str] = []
    if sector and sector != "All":
        clauses.append("sector = ?")
        params.append(sector)
    if portal and portal != "All":
        clauses.append("portal = ?")
        params.append(portal)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    return conn.execute(f"SELECT * FROM deals {where} ORDER BY committed DESC", params).df()


def source_status() -> SourceStatus:
    return SourceStatus(
        source="SEC EDGAR public search with synthetic campaign metrics",
        mode="synthetic",
        refreshedAt=datetime.now(timezone.utc).isoformat(),
        secSearchUrl=SEC_SEARCH_URL,
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "source": SEC_SEARCH_URL}


@app.get("/api/deals", response_model=DealPayload)
def get_deals(
    sector: str | None = None,
    portal: str | None = None,
) -> DealPayload:
    frame = normalized_deals()
    filtered = filter_deals(frame, sector, portal)
    sectors = sorted(frame["sector"].unique().tolist())
    return DealPayload(
        deals=filtered.to_dict(orient="records"),
        sectors=sectors,
        status=source_status(),
    )


@app.get("/api/deals/download")
def download_deals(
    sector: str | None = None,
    portal: str | None = None,
) -> StreamingResponse:
    frame = filter_deals(normalized_deals(), sector, portal)
    buffer = StringIO()
    frame.to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="crowdfunding_deal_radar_sample.csv"'},
    )
