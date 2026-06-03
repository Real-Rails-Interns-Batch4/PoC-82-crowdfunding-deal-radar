"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Download,
  ExternalLink,
  Filter,
  GitCompare,
  Info,
  Radar,
  X
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Deal, ApiPayload  } from "@/lib/deals";
import { formatCurrency, formatPercent } from "@/lib/utils";


const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const ACCENT = "#2DD4BF";
const SECONDARY = "#A78BFA";

export default function CrowdfundingDealRadarPage() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [sector, setSector] = useState("All");
  const [portal, setPortal] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDealId, setActiveDealId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [refreshedLabel, setRefreshedLabel] = useState("Pending client sync");
  const chartRef = useRef<HTMLDivElement>(null);
  const compareChartRef = useRef<HTMLDivElement>(null);

  const openDeal = (id: string) => {
    setActiveDealId(id);
    setPanelOpen(true);
  };

  const toggleCompare = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((dealId) => dealId !== id) : [...current.slice(-2), id]
    );
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/deals`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: ApiPayload) => {
        setPayload(data);
        // Pre-select first two deals for comparison once data arrives
        if (data.deals.length >= 2) {
          setSelectedIds([data.deals[0].id, data.deals[1].id]);
        }
      })
      .catch(() => setFetchError(true));
  }, []);

  useEffect(() => {
    if (payload) {
      setRefreshedLabel(new Date(payload.status.refreshedAt).toLocaleString());
    }
  }, [payload?.status.refreshedAt]);

  const portals = useMemo(() => {
    if (!payload?.deals) return [];
    return Array.from(new Set(payload.deals.map((deal) => deal.portal))).sort();
  }, [payload]);

  const filteredDeals = useMemo(() => {
    if (!payload?.deals) return [];
    return payload.deals.filter(
      (deal) => (sector === "All" || deal.sector === sector) && (portal === "All" || deal.portal === portal)
    );
  }, [payload, portal, sector]);

  const comparedDeals = useMemo(() => {
    if (!payload?.deals) return [];
    return payload.deals.filter((deal) => selectedIds.includes(deal.id));
  }, [payload, selectedIds]);

  const totalCommitted = useMemo(() => filteredDeals.reduce((sum, deal) => sum + deal.committed, 0), [filteredDeals]);
  const avgTraction = useMemo(() => d3.mean(filteredDeals, (deal) => deal.tractionScore) ?? 0, [filteredDeals]);

  const visibleDeal = useMemo(() => {
    if (!payload?.deals || payload.deals.length === 0) return null;
    return filteredDeals.find((deal) => deal.id === activeDealId) ?? filteredDeals[0] ?? payload.deals[0];
  }, [payload, filteredDeals, activeDealId]);

  const activeDeal = useMemo(() => {
    if (!payload?.deals) return null;
    return payload.deals.find((deal) => deal.id === activeDealId) ?? visibleDeal;
  }, [payload, activeDealId, visibleDeal]);

  const xScale = useMemo(() => {
    if (!payload?.deals || payload.deals.length === 0) return d3.scaleLinear().domain([0, 100]).range([14, 86]);
    const extent = d3.extent(payload.deals, (deal) => deal.visibilityScore);
    const domain = (extent[0] === undefined ? [0, 100] : extent) as [number, number];
    return d3.scaleLinear().domain(domain).range([14, 86]);
  }, [payload]);

  const yScale = useMemo(() => {
    if (!payload?.deals || payload.deals.length === 0) return d3.scaleLinear().domain([0, 100]).range([78, 22]);
    const extent = d3.extent(payload.deals, (deal) => deal.tractionScore);
    const domain = (extent[0] === undefined ? [0, 100] : extent) as [number, number];
    return d3.scaleLinear().domain(domain).range([78, 22]);
  }, [payload]);

  const columns = useMemo<ColumnDef<Deal>[]>(
    () => [
      {
        accessorKey: "issuer",
        header: "Issuer",
        cell: ({ row }) => (
          <button
            className="text-left font-medium text-slate-100 hover:text-cyan"
            onClick={() => openDeal(row.original.id)}
            title="Open this deal in the Intelligence Panel"
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
            <div className="h-1.5 w-20 rounded-full bg-slate-900">
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

  useEffect(() => {
    if (!panelOpen || filteredDeals.length === 0) return;
    let chartInstance: any = null;
    async function renderChart() {
      if (!chartRef.current) return;
      const echarts = await import("echarts");
      if (!chartRef.current) return;
      chartInstance = echarts.init(chartRef.current, "dark", { renderer: "canvas" });
      chartInstance.setOption({
        backgroundColor: "transparent",
        color: [ACCENT, SECONDARY],
        tooltip: {
          trigger: "axis",
          backgroundColor: "#0E111B",
          borderColor: "#2DD4BF",
          textStyle: { color: "#E5E7EB" }
        },
        grid: { top: 18, right: 18, bottom: 42, left: 42 },
        xAxis: {
          type: "category",
          data: filteredDeals.map((deal) => deal.issuer.replaceAll(" ", "\n")),
          axisLine: { lineStyle: { color: "#243042" } },
          axisLabel: { color: "#94A3B8", fontSize: 10 }
        },
        yAxis: {
          type: "value",
          max: 100,
          axisLine: { lineStyle: { color: "#243042" } },
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
      const resize = () => chartInstance?.resize();
      window.addEventListener("resize", resize);
    }
    renderChart();
    return () => {
      chartInstance?.dispose();
    };
  }, [filteredDeals, panelOpen]);

  useEffect(() => {
    if (!panelOpen || comparedDeals.length === 0) return;
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
                [0, SECONDARY],
                [1, ACCENT]
              ],
              size: comparedDeals.map((deal) => Math.max(14, deal.committed / 70000)),
              line: { color: ACCENT, width: 1 }
            }
          }
        ],
        {
          paper_bgcolor: "rgba(0,0,0,0)",
          plot_bgcolor: "rgba(0,0,0,0)",
          margin: { l: 34, r: 10, t: 10, b: 34 },
          height: 190,
          font: { color: "#CBD5E1", size: 10 },
          xaxis: { title: "Visibility", gridcolor: "#111827", zerolinecolor: "#243042" },
          yaxis: { title: "Terms", gridcolor: "#111827", zerolinecolor: "#243042" },
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
  }, [comparedDeals, panelOpen]);

  const downloadHref = `${API_BASE}/api/deals/download?sector=${encodeURIComponent(sector)}&portal=${encodeURIComponent(portal)}`;

  if (!payload) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background text-slate-200">
        <CinematicBackdrop />
        <div className="relative z-10 text-center">
          {fetchError ? (
            <>
              <p className="text-lg font-semibold text-red-400">Could not connect to backend</p>
              <p className="mt-2 text-sm text-slate-400">
                Make sure the FastAPI server is running at{" "}
                <code className="rounded bg-white/10 px-1 py-0.5">{API_BASE}</code>
              </p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => { setFetchError(false); window.location.reload(); }}
                >
                  Retry Connection
                </Button>
                <p className="text-[10px] text-slate-500 italic">
                  Note: If running in Docker, ensure both containers are healthy.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-cyan border-t-transparent" />
              <p className="text-sm text-slate-400">Loading deals from backend…</p>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-slate-200">
      <CinematicBackdrop />

      <header className="pointer-events-none fixed left-0 right-0 top-0 z-30 border-b border-white/10 bg-background/45 px-5 py-3 backdrop-blur-xl">
        <div className="pointer-events-auto flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan">
              <Radar className="h-4 w-4" />
              Capital Formation Rail
            </div>
            <h1 className="mt-1 text-xl font-semibold text-white">Crowdfunding Deal Radar</h1>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <FilterSelect label="Sector" value={sector} values={["All", ...(payload?.sectors ?? [])]} onChange={setSector} />
            <FilterSelect label="Portal" value={portal} values={["All", ...portals]} onChange={setPortal} />
            <Button
              aria-label="Open developer signature"
              size="icon"
              variant="outline"
              title="Developer signature"
              onClick={() => setSignatureOpen(true)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>


      <section className="relative z-10 flex min-h-screen flex-col justify-between px-5 pb-5 pt-28">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.28fr)_1fr]">
          <div className="max-w-xl">
            <Badge className="mb-3">Real Rails Intelligence Library</Badge>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Cinematic Capital Formation View</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">
              Public fundraising signals, mapped as capital velocity.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300">
              Click any issuer marker to open the Intelligence Panel. The stage plots traction against visibility so
              everyday viewers, builders, and allocators can see which campaigns are gathering momentum.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 self-start">
            <StageStat label="Filtered capital" value={formatCurrency(totalCommitted)} />
            <StageStat label="Active deals" value={String(filteredDeals.length)} />
            <StageStat label="Avg traction" value={avgTraction.toFixed(1)} />
          </div>
        </div>

        <div className="relative mt-5 min-h-[520px] flex-1 rounded-none border border-white/10 bg-[#080712]/60 shadow-[0_0_80px_rgba(45,212,191,0.08)] backdrop-blur-sm">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.08)_1px,transparent_1px)] bg-[size:64px_64px]" />
          <div className="absolute left-5 top-5 text-xs uppercase tracking-[0.2em] text-slate-500">
            Visibility axis / Traction axis
          </div>
          <div className="absolute bottom-5 left-5 max-w-sm rounded-md border border-white/10 bg-background/70 p-3 text-xs text-slate-400 backdrop-blur">
            Marker size reflects committed capital. Color intensity reflects rail-control pressure from portal,
            disclosure, and campaign timing signals.
          </div>

          {filteredDeals.map((deal) => {
            const isActive = activeDeal?.id === deal.id && panelOpen;
            const size = Math.max(42, Math.min(92, 34 + deal.committed / 36000));
            return (
              <button
                key={deal.id}
                className="group absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/60 bg-cyan/10 text-left shadow-[0_0_32px_rgba(45,212,191,0.24)] transition hover:scale-105 hover:bg-cyan/20 focus:outline-none focus:ring-1 focus:ring-cyan"
                style={{
                  left: `${xScale(deal.visibilityScore)}%`,
                  top: `${yScale(deal.tractionScore)}%`,
                  width: size,
                  height: size
                }}
                title={`${deal.issuer}: ${deal.sector}, ${formatCurrency(deal.committed)} committed`}
                onClick={() => openDeal(deal.id)}
              >
                <span className="absolute inset-1 rounded-full border border-white/10 bg-[#0E111B]/80" />
                <span
                  className={`absolute inset-0 rounded-full transition ${isActive ? "animate-ping bg-cyan/20" : "group-hover:bg-cyan/10"}`}
                />
                <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan" />
                <span className="absolute left-1/2 top-[calc(100%+8px)] w-40 -translate-x-1/2 text-center text-xs font-medium text-slate-200 opacity-80 group-hover:text-white">
                  {deal.issuer}
                </span>
              </button>
            );
          })}

          {filteredDeals.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">
              No deals match the selected filters.
            </div>
          )}
        </div>
      </section>

      <div
        className={`fixed inset-0 z-40 bg-black/35 transition ${panelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setPanelOpen(false)}
      />

      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-full max-w-[520px] overflow-y-auto border-l border-white/10 bg-[#080712]/95 shadow-[0_0_60px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-transform duration-300 ${panelOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#080712]/90 p-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cyan">Intelligence Panel</p>
            <h3 className="mt-1 text-lg font-semibold text-white">{activeDeal?.issuer ?? "No Deal Selected"}</h3>
          </div>
          <Button aria-label="Close Intelligence Panel" size="icon" variant="ghost" onClick={() => setPanelOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {activeDeal && (
          <div className="space-y-4 p-4">
            <Card className="shadow-cyan">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan" />
                  Deal Terms
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
                <Button asChild className="w-full" title="Download current filtered dataset">
                  <a href={downloadHref}>
                    <Download className="h-4 w-4" />
                    Download Sample Data
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-cyan" />
                  Traction Chart
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
                        <p className="text-xs text-slate-400">
                          {deal.securityType} | {deal.portal}
                        </p>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Deal Table</CardTitle>
                <span
                  className="flex items-center gap-1 text-xs text-slate-400"
                  title="SEC EDGAR source link is retained for public filing lookup."
                >
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
                        className={`border-t border-border transition hover:bg-cyan/5 ${activeDeal && row.original.id === activeDeal.id ? "bg-cyan/5" : ""}`}
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
        )}
      </aside>

      {signatureOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-end bg-black/40 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#080712]/95 p-4 shadow-cyan">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan">Developer Signature</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Infocreon Header</h3>
              </div>
              <Button aria-label="Close developer signature" size="icon" variant="ghost" onClick={() => setSignatureOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <SignatureRow label="Architect" value="Ananthakrishnan A H" />
              <SignatureRow label="Git user" value="Eternal66-6" />
              <SignatureRow label="Batch" value="Batch 4 Interns" />
              <SignatureRow label="Stack" value="Next.js, TypeScript, Tailwind CSS, FastAPI, Pandas, DuckDB, ECharts, Plotly" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function CinematicBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(45,212,191,0.12),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(167,139,250,0.10),transparent_28%),linear-gradient(135deg,#05040D_0%,#080712_48%,#030A0B_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.045),transparent_22%,transparent_74%,rgba(45,212,191,0.05))]" />
    </div>
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
    <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-[#0E111B]/80 px-3 text-sm text-slate-300 shadow-[0_0_18px_rgba(45,212,191,0.08)] backdrop-blur">
      <Filter className="h-4 w-4 text-cyan" />
      <span className="text-xs text-slate-500">{label}</span>
      <select
        className="max-w-[150px] bg-transparent text-sm outline-none"
        value={value}
        title={label}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((item) => (
          <option key={item} value={item} className="bg-[#0E111B]">
            {item}
          </option>
        ))}
      </select>
    </label>
  );
}

function StageStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0E111B]/72 p-3 backdrop-blur">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 truncate text-xl font-semibold text-white" title={value}>
        {value}
      </p>
    </div>
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

function SignatureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-slate-100">{value}</p>
    </div>
  );
}
