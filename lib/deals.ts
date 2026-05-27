export type Deal = {
  id: string;
  issuer: string;
  sector: string;
  portal: string;
  formType: string;
  filingDate: string;
  state: string;
  targetRaise: number;
  maxRaise: number;
  committed: number;
  valuationCap: number;
  securityType: string;
  investorCount: number;
  daysRemaining: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  tractionScore: number;
  visibilityScore: number;
  termsScore: number;
  railControlScore: number;
  secSearchUrl: string;
};

export const sampleDeals: Deal[] = [
  {
    id: "CR-8201",
    issuer: "Nautilus Grid Analytics",
    sector: "Climate Tech",
    portal: "Republic",
    formType: "Form C",
    filingDate: "2026-04-18",
    state: "CA",
    targetRaise: 125000,
    maxRaise: 1240000,
    committed: 842000,
    valuationCap: 12000000,
    securityType: "SAFE",
    investorCount: 1186,
    daysRemaining: 17,
    monthlyRevenue: 146000,
    revenueGrowth: 38.4,
    tractionScore: 91,
    visibilityScore: 87,
    termsScore: 76,
    railControlScore: 68,
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  },
  {
    id: "CR-8202",
    issuer: "LedgerLane Health",
    sector: "Health Tech",
    portal: "Wefunder",
    formType: "Form C/A",
    filingDate: "2026-03-29",
    state: "NY",
    targetRaise: 75000,
    maxRaise: 980000,
    committed: 391000,
    valuationCap: 9500000,
    securityType: "Crowd Note",
    investorCount: 642,
    daysRemaining: 24,
    monthlyRevenue: 89000,
    revenueGrowth: 22.7,
    tractionScore: 74,
    visibilityScore: 78,
    termsScore: 81,
    railControlScore: 72,
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  },
  {
    id: "CR-8203",
    issuer: "Aurora Pantry Systems",
    sector: "Consumer",
    portal: "StartEngine",
    formType: "Form C",
    filingDate: "2026-02-14",
    state: "TX",
    targetRaise: 100000,
    maxRaise: 1500000,
    committed: 1190000,
    valuationCap: 18000000,
    securityType: "Common Equity",
    investorCount: 2211,
    daysRemaining: 9,
    monthlyRevenue: 238000,
    revenueGrowth: 31.2,
    tractionScore: 88,
    visibilityScore: 93,
    termsScore: 69,
    railControlScore: 64,
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  },
  {
    id: "CR-8204",
    issuer: "CipherForge Compliance",
    sector: "Fintech",
    portal: "Netcapital",
    formType: "Form C",
    filingDate: "2026-05-06",
    state: "MA",
    targetRaise: 50000,
    maxRaise: 750000,
    committed: 214000,
    valuationCap: 7000000,
    securityType: "SAFE",
    investorCount: 336,
    daysRemaining: 41,
    monthlyRevenue: 62000,
    revenueGrowth: 44.9,
    tractionScore: 70,
    visibilityScore: 66,
    termsScore: 84,
    railControlScore: 79,
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  },
  {
    id: "CR-8205",
    issuer: "Meadow Robotics",
    sector: "Industrial AI",
    portal: "Republic",
    formType: "Form C/A",
    filingDate: "2026-01-27",
    state: "PA",
    targetRaise: 150000,
    maxRaise: 2000000,
    committed: 1574000,
    valuationCap: 24000000,
    securityType: "Preferred Equity",
    investorCount: 1745,
    daysRemaining: 13,
    monthlyRevenue: 304000,
    revenueGrowth: 29.6,
    tractionScore: 93,
    visibilityScore: 89,
    termsScore: 71,
    railControlScore: 61,
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  },
  {
    id: "CR-8206",
    issuer: "Northstar Learning Lab",
    sector: "Education",
    portal: "Wefunder",
    formType: "Form C",
    filingDate: "2026-04-02",
    state: "IL",
    targetRaise: 25000,
    maxRaise: 500000,
    committed: 184000,
    valuationCap: 5400000,
    securityType: "Revenue Share",
    investorCount: 487,
    daysRemaining: 32,
    monthlyRevenue: 41000,
    revenueGrowth: 18.3,
    tractionScore: 65,
    visibilityScore: 72,
    termsScore: 88,
    railControlScore: 76,
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  }
];
