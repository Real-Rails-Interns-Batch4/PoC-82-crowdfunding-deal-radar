// frontend/lib/deals.ts
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

export type ApiPayload = {
  deals: Deal[];
  sectors: string[];
  status: {
    source: string;
    mode: "live" | "synthetic";
    refreshedAt: string;
    secSearchUrl: string;
  };
};