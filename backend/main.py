from __future__ import annotations

from datetime import datetime, timezone
from io import StringIO
from typing import Literal

import duckdb
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel


SEC_SEARCH_URL = "https://www.sec.gov/edgar/search/"


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
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):30\d{2}$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


RAW_DEALS = [
    {
        "id": "CR-8201",
        "issuer": "Nautilus Grid Analytics",
        "sector": "Climate Tech",
        "portal": "Republic",
        "formType": "Form C",
        "filingDate": "2026-04-18",
        "state": "CA",
        "targetRaise": 125000,
        "maxRaise": 1240000,
        "committed": 842000,
        "valuationCap": 12000000,
        "securityType": "SAFE",
        "investorCount": 1186,
        "daysRemaining": 17,
        "monthlyRevenue": 146000,
        "revenueGrowth": 38.4,
        "secSearchUrl": SEC_SEARCH_URL,
    },
    {
        "id": "CR-8202",
        "issuer": "LedgerLane Health",
        "sector": "Health Tech",
        "portal": "Wefunder",
        "formType": "Form C/A",
        "filingDate": "2026-03-29",
        "state": "NY",
        "targetRaise": 75000,
        "maxRaise": 980000,
        "committed": 391000,
        "valuationCap": 9500000,
        "securityType": "Crowd Note",
        "investorCount": 642,
        "daysRemaining": 24,
        "monthlyRevenue": 89000,
        "revenueGrowth": 22.7,
        "secSearchUrl": SEC_SEARCH_URL,
    },
    {
        "id": "CR-8203",
        "issuer": "Aurora Pantry Systems",
        "sector": "Consumer",
        "portal": "StartEngine",
        "formType": "Form C",
        "filingDate": "2026-02-14",
        "state": "TX",
        "targetRaise": 100000,
        "maxRaise": 1500000,
        "committed": 1190000,
        "valuationCap": 18000000,
        "securityType": "Common Equity",
        "investorCount": 2211,
        "daysRemaining": 9,
        "monthlyRevenue": 238000,
        "revenueGrowth": 31.2,
        "secSearchUrl": SEC_SEARCH_URL,
    },
    {
        "id": "CR-8204",
        "issuer": "CipherForge Compliance",
        "sector": "Fintech",
        "portal": "Netcapital",
        "formType": "Form C",
        "filingDate": "2026-05-06",
        "state": "MA",
        "targetRaise": 50000,
        "maxRaise": 750000,
        "committed": 214000,
        "valuationCap": 7000000,
        "securityType": "SAFE",
        "investorCount": 336,
        "daysRemaining": 41,
        "monthlyRevenue": 62000,
        "revenueGrowth": 44.9,
        "secSearchUrl": SEC_SEARCH_URL,
    },
    {
        "id": "CR-8205",
        "issuer": "Meadow Robotics",
        "sector": "Industrial AI",
        "portal": "Republic",
        "formType": "Form C/A",
        "filingDate": "2026-01-27",
        "state": "PA",
        "targetRaise": 150000,
        "maxRaise": 2000000,
        "committed": 1574000,
        "valuationCap": 24000000,
        "securityType": "Preferred Equity",
        "investorCount": 1745,
        "daysRemaining": 13,
        "monthlyRevenue": 304000,
        "revenueGrowth": 29.6,
        "secSearchUrl": SEC_SEARCH_URL,
    },
    {
        "id": "CR-8206",
        "issuer": "Northstar Learning Lab",
        "sector": "Education",
        "portal": "Wefunder",
        "formType": "Form C",
        "filingDate": "2026-04-02",
        "state": "IL",
        "targetRaise": 25000,
        "maxRaise": 500000,
        "committed": 184000,
        "valuationCap": 5400000,
        "securityType": "Revenue Share",
        "investorCount": 487,
        "daysRemaining": 32,
        "monthlyRevenue": 41000,
        "revenueGrowth": 18.3,
        "secSearchUrl": SEC_SEARCH_URL,
    },
]


def normalized_deals() -> pd.DataFrame:
    frame = pd.DataFrame(RAW_DEALS)
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
