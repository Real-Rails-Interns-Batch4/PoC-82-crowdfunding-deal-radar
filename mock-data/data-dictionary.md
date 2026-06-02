# Data Dictionary: Crowdfunding Deal Radar

## Entity: CrowdfundingDeal

Represents a synthetic regulation crowdfunding campaign-style deal record, enriched with mocked traction and terms signals.

## Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| id | string | Yes | Synthetic internal deal identifier. |
| issuer | string | Yes | Synthetic issuer/company name. |
| sector | string | Yes | Market sector used for filtering and analysis. |
| portal | string | Yes | Synthetic funding portal or broker-dealer distribution channel. |
| formType | string | Yes | SEC filing style represented in the demo, such as Form C or Form C/A. |
| filingDate | string | Yes | ISO date for the synthetic filing reference. |
| state | string | Yes | US state abbreviation for issuer location. |
| targetRaise | number | Yes | Minimum or target campaign raise in USD. |
| maxRaise | number | Yes | Maximum campaign raise in USD. |
| committed | number | Yes | Synthetic committed capital in USD. |
| valuationCap | number | Yes | Synthetic valuation cap or implied valuation in USD. |
| securityType | string | Yes | Instrument type, such as SAFE, Crowd Note, Common Equity, Preferred Equity, or Revenue Share. |
| investorCount | number | Yes | Synthetic number of participating investors. |
| daysRemaining | number | Yes | Synthetic days remaining in campaign. Negative values represent expired/deadline edge cases. |
| monthlyRevenue | number | Yes | Synthetic monthly revenue in USD. |
| revenueGrowth | number | Yes | Synthetic monthly or recent-period revenue growth percentage. |
| tractionScore | number | Yes | Synthetic 0-100 score summarizing investor demand and growth. |
| visibilityScore | number | Yes | Synthetic 0-100 score representing public campaign visibility. |
| termsScore | number | Yes | Synthetic 0-100 score representing investor-friendliness of terms. |
| railControlScore | number | Yes | Synthetic 0-100 score representing portal, disclosure, and timing control pressure. |
| secSearchUrl | string | Yes | SEC EDGAR public search URL used as source reference. |
| isSynthetic | boolean | Yes | Always true for this package. |
| syntheticLabel | string | Yes | Human-readable label declaring the record synthetic. |
| dataQualityStatus | string | Yes | Demo data health state: normal, warning, or error. |
| edgeCaseType | string | Yes | Scenario tag for UI and validation testing. |
| edgeCaseNote | string | Yes | Explanation of normal or unusual behavior represented by the row. |

## Entity: SourceStatus

Represents source-level metadata for the dataset.

| Field | Type | Required | Description |
|---|---|---:|---|
| source | string | Yes | Source reference used for filing lookup. |
| mode | string | Yes | `synthetic` for this package. |
| refreshedAt | string | Yes | ISO timestamp of package generation or refresh. |
| secSearchUrl | string | Yes | SEC EDGAR search URL. |

