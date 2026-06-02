# Mock Data Package: Crowdfunding Deal Radar

This folder contains synthetic data for the **Crowdfunding Deal Radar** PoC.

Every record is synthetic and is designed for product demonstration, UI testing, filter behavior, and error-state handling. The records are not investment recommendations and do not represent real offerings.

## Files

- `data-dictionary.md` - entity and field definitions.
- `crowdfunding_deals_synthetic.csv` - CSV export for spreadsheet or BI review.
- `crowdfunding_deals_synthetic.json` - JSON export for application and API testing.

## Synthetic Data Labeling

Each record includes:

- `isSynthetic`: `true`
- `syntheticLabel`: `Synthetic demo record`
- `dataQualityStatus`: normal, warning, or error-state classification
- `edgeCaseType`: normal, missing_metric, stale_filing, over_subscribed, zero_revenue, deadline_expired, portal_unknown, or malformed_terms

## Intended Use

Use this package to test:

- deal table rendering
- sector and portal filters
- terms cards
- traction chart
- compare deals workflow
- CSV download behavior
- empty, warning, and error-state UI messaging

