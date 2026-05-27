"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Activity, ArrowUpDown, BarChart3, Download, ExternalLink, Filter, GitCompare, Info, Radar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Deal, sampleDeals } from "@/lib/deals";
import { formatCurrency, formatPercent } from "@/lib/utils";

type ApiPayload = {
  deals: Deal[];
  sectors: string[];
  status: {
    source: string;
    mode: "live" | "synthetic";
    refreshedAt: string;
    secSearchUrl: string;
  };
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const fallbackPayload: ApiPayload = {
  deals: sampleDeals,
  sectors: Array.from(new Set(sampleDeals.map((deal) => deal.sector))).sort(),
  status: {
    source: "SEC EDGAR public search with synthetic campaign metrics",
    mode: "synthetic",
    refreshedAt: "2026-05-27T00:00:00.000Z",
    secSearchUrl: "https://www.sec.gov/edgar/search/"
  }
};

export default function CrowdfundingDealRadarPage() {
  const [payload, setPayload] = useState<ApiPayload>(fallbackPayload);
  const [sector, setSector] = useState("All");
  const [portal, setPortal] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>(["CR-8201", "CR-8205"]);
  const [activeDealId, setActiveDealId] = useState("CR-8201");
  const [refreshedLabel, setRefreshedLabel] = useState("Pending client sync");
  const chartRef = useRef<HTMLDivElement>(null);
  const compareChartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/deals`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ApiPayload) => setPayload(data))
      .catch(() => setPayload(fallbackPayload));
  }, []);

  useEffect(() => {
    setRefreshedLabel(new Date(payload.status.refreshedAt).toLocaleString());
  }, [payload.status.refreshedAt]);

  const portals = useMemo(() => Array.from(new Set(payload.deals.map((deal) => deal.portal))).sort(), [payload.deals]);

  const filteredDeals = useMemo(
    () =>
      payload.deals.filter(
        (deal) => (sector === "All" || deal.sector === sector) && (portal === "All" || deal.portal === portal)
      ),
    [payload.deals, portal, sector]
  );

  const activeDeal = filteredDeals.find((deal) => deal.id === activeDealId) ?? filteredDeals[0] ?? payload.deals[0];
  const comparedDeals = payload.deals.filter((deal) => selectedIds.includes(deal.id));
  const totalCommitted = filteredDeals.reduce((sum, deal) => sum + deal.committed, 0);
  const avgTraction = d3.mean(filteredDeals, (deal) => deal.tractionScore) ?? 0;

  const columns = useMemo<ColumnDef<Deal>[]>(
    () => [
      {
        accessorKey: "issuer",
        header: "Issuer",
        cell: ({ row }) => (
          <button
            className="text-left font-medium text-slate-100 hover:text-cyan"
            onClick={() => setActiveDealId(row.original.id)}
            title="Focus this deal"
          >
            {row.original.issuer}
          </button>
        )
      },
      { accessorKey: "sector", header: "Sector" },
      { accessorKey: "portal", header: "Portal" },
      {
        accessorKey: "committed",
        header: "Committed",
        cell: ({ row }) => <span className="text-cyan">{formatCurrency(row.original.committed)}</span>
      },
      {
        accessorKey: "tractionScore",
        header: "Traction",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-cyan" style={{ width: `${row.original.tractionScore}%` }} />
            </div>
            <span>{row.original.tractionScore}</span>
          </div>
        )
      },
      {
        id: "compare",
        header: "Compare",
        cell: ({ row }) => {
          const checked = selectedIds.includes(row.original.id);
          return (
            <input
              aria-label={`Compare ${row.original.issuer}`}
              checked={checked}
              className="h-4 w-4 accent-cyan"
              type="checkbox"
              onChange={() => toggleCompare(row.original.id)}
            />
          );
        }
      }
    ],
    [selectedIds]
  );

  const table = useReactTable({ data: filteredDeals, columns, getCoreRowModel: getCoreRowModel() });

  function toggleCompare(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((dealId) => dealId !== id) : [...current.slice(-2), id]
    );
  }

  useEffect(() => {
    let mounted = true;
    async function renderChart() {
      if (!chartRef.current) return;
      const echarts = await import("echarts");
      if (!mounted || !chartRef.current) return;
      const chart = echarts.init(chartRef.current, "dark", { renderer: "canvas" });
      chart.setOption({
        backgroundColor: "transparent",
        color: ["#38BDF8", "#818CF8", "#22D3EE"],
        tooltip: {
          trigger: "axis",
          backgroundColor: "#0B1117",
          borderColor: "#1F2937",
          textStyle: { color: "#E5E7EB" }
        },
        grid: { top: 24, right: 24, bottom: 42, left: 54 },
        xAxis: {
          type: "category",
          data: filteredDeals.map((deal) => deal.issuer.replaceAll(" ", "\n")),
          axisLine: { lineStyle: { color: "#1F2937" } },
          axisLabel: { color: "#94A3B8", fontSize: 10 }
        },
        yAxis: {
          type: "value",
          max: 100,
          axisLine: { lineStyle: { color: "#1F2937" } },
          splitLine: { lineStyle: { color: "#111827" } },
          axisLabel: { color: "#94A3B8" }
        },
        series: [
          {
            name: "Traction score",
            type: "bar",
            data: filteredDeals.map((deal) => deal.tractionScore),
            barWidth: 18,
            itemStyle: { borderRadius: [4, 4, 0, 0] }
          },
          {
            name: "Visibility score",
            type: "line",
            smooth: true,
            data: filteredDeals.map((deal) => deal.visibilityScore),
            symbolSize: 8
          }
        ]
      });
      const resize = () => chart.resize();
      window.addEventListener("resize", resize);
      return () => {
        window.removeEventListener("resize", resize);
        chart.dispose();
      };
    }
    let cleanup: undefined | (() => void);
    renderChart().then((dispose) => {
      cleanup = dispose;
    });
    return () => {
      mounted = false;
      cleanup?.();
    };
  }, [filteredDeals]);

  useEffect(() => {
    let mounted = true;
    async function renderComparePlot() {
      if (!compareChartRef.current) return;
      const Plotly = (await import("plotly.js-dist-min")).default;
      if (!mounted || !compareChartRef.current) return;
      await Plotly.newPlot(
        compareChartRef.current,
        [
          {
            x: comparedDeals.map((deal) => deal.visibilityScore),
            y: comparedDeals.map((deal) => deal.termsScore),
            text: comparedDeals.map((deal) => deal.issuer),
            mode: "markers+text",
            type: "scatter",
            textposition: "top center",
            marker: {
              color: comparedDeals.map((deal) => deal.tractionScore),
              colorscale: [
                [0, "#818CF8"],
                [1, "#38BDF8"]
              ],
              size: comparedDeals.map((deal) => Math.max(14, deal.committed / 70000)),
              line: { color: "#38BDF8", width: 1 }
            }
          }
        ],
        {
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          margin: { l: 34, r: 10, t: 10, b: 34 },
          height: 190,
          font: { color: "#CBD5E1", size: 10 },
          xaxis: { title: "Visibility", gridcolor: "#111827", zerolinecolor: "#1F2937" },
          yaxis: { title: "Terms", gridcolor: "#111827", zerolinecolor: "#1F2937" },
          showlegend: false
        },
        { displayModeBar: false, responsive: true }
      );
    }
    renderComparePlot();
    return () => {
      mounted = false;
      if (compareChartRef.current) {
        import("plotly.js-dist-min").then((module) => module.default.purge(compareChartRef.current as HTMLElement));
      }
    };
  }, [comparedDeals]);

  const downloadHref = `${API_BASE}/api/deals/download?sector=${encodeURIComponent(sector)}&portal=${encodeURIComponent(portal)}`;

  return (
    <main className="min-h-screen bg-background text-slate-200">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <section className="w-full border-border lg:w-[70%] lg:border-r">
          <div className="border-b border-border px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan">
                  <Radar className="h-4 w-4" />
                  Capital Formation Rail
                </div>
                <h1 className="mt-2 text-2xl font-semibold text-white">Crowdfunding Deal Radar</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterSelect label="Sector" value={sector} values={["All", ...payload.sectors]} onChange={setSector} />
                <FilterSelect label="Portal" value={portal} values={["All", ...portals]} onChange={setPortal} />
                <Button asChild title="Download current filtered dataset">
                  <a href={downloadHref}>
                    <Download className="h-4 w-4" />
                    Sample Data
                  </a>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="min-h-[330px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan" />
                  Traction Snapshot
                </CardTitle>
                <Badge>{filteredDeals.length} active deals</Badge>
              </CardHeader>
              <CardContent>
                <div ref={chartRef} className="h-[280px] w-full" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-indigo" />
                  Compare Deals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div ref={compareChartRef} className="h-[190px] w-full" />
                {comparedDeals.map((deal) => (
                  <div key={deal.id} className="rounded-md border border-border bg-background/55 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{deal.issuer}</p>
                        <p className="text-xs text-slate-400">{deal.securityType} | {deal.portal}</p>
                      </div>
                      <Badge className="border-indigo/40 bg-indigo/10 text-indigo">{deal.tractionScore}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <Metric label="Committed" value={formatCurrency(deal.committed)} />
                      <Metric label="Valuation" value={formatCurrency(deal.valuationCap)} />
                      <Metric label="Growth" value={formatPercent(deal.revenueGrowth)} />
                    </div>
                  </div>
                ))}
                {comparedDeals.length === 0 && <p className="text-sm text-slate-400">Select deals from the table.</p>}
              </CardContent>
            </Card>
          </div>

          <div className="px-5 pb-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Public Deal Feed</CardTitle>
                <span className="flex items-center gap-1 text-xs text-slate-400" title="SEC EDGAR source link is retained for public filing lookup.">
                  <Info className="h-3.5 w-3.5 text-cyan" />
                  SEC EDGAR linked
                </span>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-white/[0.02] text-xs uppercase text-slate-400">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th key={header.id} className="px-4 py-3 text-left font-medium">
                            <span className="inline-flex items-center gap-1">
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.id !== "compare" && <ArrowUpDown className="h-3 w-3" />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={`border-t border-border transition hover:bg-cyan/5 ${row.original.id === activeDeal.id ? "bg-cyan/5" : ""}`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-slate-300">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </section>

        <aside className="w-full bg-[#050913] lg:w-[30%]">
          <div className="sticky top-0 space-y-4 p-5">
            <Card className="shadow-cyan">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan" />
                  Intelligence Sidebar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-slate-500">Filtered committed capital</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{formatCurrency(totalCommitted)}</p>
                  <p className="mt-1 text-sm text-slate-400">Average traction score: {avgTraction.toFixed(1)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Active issuer" value={activeDeal.issuer} />
                  <Metric label="Terms" value={activeDeal.securityType} />
                  <Metric label="Target" value={formatCurrency(activeDeal.targetRaise)} />
                  <Metric label="Max" value={formatCurrency(activeDeal.maxRaise)} />
                </div>
                <Button asChild variant="outline" className="w-full">
                  <a href={activeDeal.secSearchUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open SEC EDGAR
                  </a>
                </Button>
              </CardContent>
            </Card>

            <NarrativeCard title="Why This Matters">
              Makes alternative capital formation tangible to the public. The dashboard translates Form C visibility,
              terms, committed capital, and synthetic traction signals into a compact view of which issuers are gaining
              attention and how efficiently campaigns move from disclosure to investor demand.
            </NarrativeCard>

            <NarrativeCard title="Who Controls the Rail">
              Regulation crowdfunding is shaped by issuers, SEC disclosure rules, registered funding portals or
              broker-dealers, investor limits, and platform distribution. Deal visibility, terms, filings, and traction
              signals influence which companies can raise and which investors can evaluate opportunities.
            </NarrativeCard>

            <Card>
              <CardHeader>
                <CardTitle>Data Source Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mode</span>
                  <Badge className={payload.status.mode === "live" ? "" : "border-indigo/40 bg-indigo/10 text-indigo"}>
                    {payload.status.mode.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-slate-300">{payload.status.source}</p>
                <p className="text-xs text-slate-500">Refreshed: {refreshedLabel}</p>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-border bg-[#0B1117]/80 px-3 py-2 text-sm text-slate-300">
      <Filter className="h-4 w-4 text-cyan" />
      <span className="sr-only">{label}</span>
      <select
        className="bg-transparent text-sm outline-none"
        value={value}
        title={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((item) => (
          <option key={item} value={item} className="bg-[#0B1117]">
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/50 p-2">
      <p className="text-[11px] uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-slate-100" title={value}>
        {value}
      </p>
    </div>
  );
}

function NarrativeCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-slate-300">{children}</p>
      </CardContent>
    </Card>
  );
}
