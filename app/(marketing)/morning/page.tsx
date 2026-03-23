// =============================================================================
// HarvestFile — Phase 26 Build 4: Morning Farm Dashboard
// app/(marketing)/morning/page.tsx
//
// FREE TOOL #11 — "The Farmer's Bloomberg Terminal"
//
// One page. Every morning. Everything a farmer needs.
//
// This is the page that transforms HarvestFile from "a tool I visit sometimes"
// into "the first thing I check every morning." No competitor offers this.
// Not DTN ($500/yr). Not Pro Farmer ($300/yr). Not AgWeb (fragmented).
// Not Climate FieldView (agronomic only). Not any university tool.
//
// Data sources (all existing, zero new backend work):
//   /api/weather       → Current conditions, soil temps, GDD, forecast
//   /api/spray-window  → GO/CAUTION/NO-GO spray rating
//   /api/prices/futures → Corn, soybeans, wheat, oats, rice settlements
//   USDA calendar      → WASDE, Crop Progress, Grain Stocks dates
// =============================================================================

"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── Commodity Config (same as /markets) ─────────────────────────────────────

const COMMODITIES: Record<
  string,
  {
    name: string;
    emoji: string;
    unit: string;
    effectiveRefPrice: number;
    loanRate: number;
    color: string;
    yieldPerAcre: number;
  }
> = {
  CORN: { name: "Corn", emoji: "🌽", unit: "bu", effectiveRefPrice: 4.42, loanRate: 2.2, color: "#F59E0B", yieldPerAcre: 177 },
  SOYBEANS: { name: "Soybeans", emoji: "🫘", unit: "bu", effectiveRefPrice: 10.71, loanRate: 6.2, color: "#059669", yieldPerAcre: 51 },
  WHEAT: { name: "Wheat", emoji: "🌾", unit: "bu", effectiveRefPrice: 6.35, loanRate: 3.38, color: "#D97706", yieldPerAcre: 52 },
  OATS: { name: "Oats", emoji: "🌱", unit: "bu", effectiveRefPrice: 3.05, loanRate: 1.43, color: "#6B7280", yieldPerAcre: 64 },
  RICE: { name: "Rice", emoji: "🍚", unit: "cwt", effectiveRefPrice: 15.0, loanRate: 7.0, color: "#8B5CF6", yieldPerAcre: 75 },
};

const COMMODITY_ORDER = ["CORN", "SOYBEANS", "WHEAT", "OATS", "RICE"];

// ─── USDA Report Calendar ────────────────────────────────────────────────────

interface USDAReport {
  name: string;
  date: string;
  time: string;
  impact: "high" | "medium" | "low";
}

function getUpcomingUSDAReports(): USDAReport[] {
  const now = new Date();
  const reports: USDAReport[] = [
    { name: "Prospective Plantings", date: "2026-03-31", time: "12:00 PM ET", impact: "high" },
    { name: "Grain Stocks", date: "2026-03-31", time: "12:00 PM ET", impact: "high" },
    { name: "WASDE", date: "2026-04-09", time: "12:00 PM ET", impact: "high" },
    { name: "Crop Progress", date: "2026-04-06", time: "4:00 PM ET", impact: "medium" },
    { name: "Export Sales", date: "2026-03-26", time: "8:30 AM ET", impact: "medium" },
    { name: "Export Inspections", date: "2026-03-23", time: "11:00 AM ET", impact: "low" },
    { name: "Export Sales", date: "2026-04-02", time: "8:30 AM ET", impact: "medium" },
    { name: "Crop Progress", date: "2026-04-13", time: "4:00 PM ET", impact: "medium" },
    { name: "WASDE", date: "2026-05-12", time: "12:00 PM ET", impact: "high" },
  ];
  return reports
    .filter((r) => new Date(r.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
}

// ─── Time-aware greeting ─────────────────────────────────────────────────────

function getGreeting(): { text: string; emoji: string; period: string } {
  const h = new Date().getHours();
  if (h < 5) return { text: "Up early", emoji: "🌙", period: "night" };
  if (h < 12) return { text: "Good morning", emoji: "☀️", period: "morning" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️", period: "afternoon" };
  if (h < 21) return { text: "Good evening", emoji: "🌅", period: "evening" };
  return { text: "Good night", emoji: "🌙", period: "night" };
}

function formatDateHeader(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string): number {
  return Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Market Status ───────────────────────────────────────────────────────────

function getMarketStatus(): { label: string; isOpen: boolean } {
  const ct = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const day = ct.getDay();
  const h = ct.getHours() + ct.getMinutes() / 60;
  if (day === 0 || day === 6) return { label: "Closed — Weekend", isOpen: false };
  if (day === 5 && h >= 13.33) return { label: "Closed — Weekend", isOpen: false };
  if (h >= 19 || h < 7.75) return { label: "Overnight Session", isOpen: true };
  if (h >= 8.5 && h < 13.33) return { label: "Day Session Open", isOpen: true };
  if (h >= 7.75 && h < 8.5) return { label: "Pre-Market Break", isOpen: false };
  return { label: "After Hours", isOpen: false };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeatherData {
  location: any;
  current: any;
  soil: any;
  gdd: any;
  forecast: any[];
  planting: any[];
  alerts: any[];
}

interface SprayData {
  current_rating: "GO" | "CAUTION" | "NO_GO";
  current_score: number;
  current_reasons: string[];
  next_go_window: string | null;
  best_window_today: { start: string; end: string } | null;
  daily_summary: any[];
}

interface FuturesData {
  [key: string]: {
    latestSettle: number | null;
    change: number | null;
    changePct: number | null;
    prices: { date: string; settle: number | null }[];
  };
}

// ─── Location Search ─────────────────────────────────────────────────────────

function LocationSearch({
  onSelect,
  loading,
}: {
  onSelect: (lat: number, lng: number, name: string) => void;
  loading: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json&country_code=US`
        );
        const data = await res.json();
        setResults(data.results || []);
        setShowResults(true);
      } catch { setResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const useGeo = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSelect(pos.coords.latitude, pos.coords.longitude, "Your Location");
        setGeoLoading(false);
      },
      () => { setGeoLoading(false); alert("Could not access your location."); },
      { timeout: 10000 }
    );
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", position: "relative" }}>
      <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
        <input
          type="text"
          placeholder="Search city or zip..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #E8E8E4",
            fontSize: 14,
            background: "#FFFFFF",
            color: "#1a1a1a",
            outline: "none",
          }}
        />
        {showResults && results.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "#FFFFFF",
              borderRadius: 10,
              border: "1px solid #E8E8E4",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              zIndex: 50,
              overflow: "hidden",
            }}
          >
            {results.map((r: any, i: number) => (
              <button
                key={i}
                onMouseDown={() => {
                  onSelect(r.latitude, r.longitude, `${r.name}, ${r.admin1}`);
                  setQuery(`${r.name}, ${r.admin1}`);
                  setShowResults(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  textAlign: "left",
                  border: "none",
                  borderBottom: i < results.length - 1 ? "1px solid #F0F0EC" : "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  color: "#1a1a1a",
                }}
              >
                {r.name}, {r.admin1}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={useGeo}
        disabled={geoLoading || loading}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "1px solid #E8E8E4",
          background: "#FFFFFF",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          color: "#1a1a1a",
          whiteSpace: "nowrap",
          opacity: geoLoading ? 0.6 : 1,
        }}
      >
        {geoLoading ? "Locating..." : "📍 Use My Location"}
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MorningDashboard() {
  const [location, setLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [spray, setSpray] = useState<SprayData | null>(null);
  const [futures, setFutures] = useState<FuturesData | null>(null);
  const [loadingW, setLoadingW] = useState(false);
  const [loadingS, setLoadingS] = useState(false);
  const [loadingF, setLoadingF] = useState(true);
  const [greeting, setGreeting] = useState(getGreeting());
  const [dateStr, setDateStr] = useState("");
  const marketStatus = useMemo(() => getMarketStatus(), []);
  const usdaReports = useMemo(() => getUpcomingUSDAReports(), []);

  // Hydration-safe date
  useEffect(() => {
    setGreeting(getGreeting());
    setDateStr(formatDateHeader());
  }, []);

  // Fetch futures (no location needed)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/prices/futures?commodities=CORN,SOYBEANS,WHEAT,OATS,RICE&days=14");
        const json = await res.json();
        if (json.success) setFutures(json.data);
      } catch {}
      setLoadingF(false);
    })();
  }, []);

  // Fetch weather + spray when location changes
  const fetchLocationData = useCallback(async (lat: number, lng: number) => {
    setLoadingW(true);
    setLoadingS(true);

    // Parallel fetch
    const [wRes, sRes] = await Promise.allSettled([
      fetch(`/api/weather?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      fetch(`/api/spray-window?lat=${lat}&lng=${lng}`).then((r) => r.json()),
    ]);

    if (wRes.status === "fulfilled" && wRes.value?.data) setWeather(wRes.value.data);
    if (sRes.status === "fulfilled" && sRes.value?.success) setSpray(sRes.value.data);
    setLoadingW(false);
    setLoadingS(false);
  }, []);

  const handleLocationSelect = useCallback(
    (lat: number, lng: number, name: string) => {
      setLocation({ lat, lng, name });
      fetchLocationData(lat, lng);
    },
    [fetchLocationData]
  );

  // Spray rating colors
  const sprayColors: Record<string, { bg: string; text: string; label: string }> = {
    GO: { bg: "rgba(5,150,105,0.1)", text: "#059669", label: "GO — Safe to Spray" },
    CAUTION: { bg: "rgba(217,119,6,0.1)", text: "#D97706", label: "CAUTION" },
    NO_GO: { bg: "rgba(220,38,38,0.1)", text: "#DC2626", label: "NO-GO" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8" }}>
      {/* ═══ HERO ═══ */}
      <section
        style={{
          background: "linear-gradient(135deg, #0C1F17 0%, #1B4332 50%, #0f2b1e 100%)",
          padding: "48px 20px 36px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.03,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
        />
        <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "5px 14px",
              borderRadius: 100,
              background: "rgba(34,197,94,0.12)",
              border: "1px solid rgba(34,197,94,0.2)",
              color: "#4ADE80",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80" }} />
            Free Tool — No Account Required
          </span>

          {/* Greeting */}
          <h1
            style={{
              fontSize: "clamp(28px, 5vw, 44px)",
              fontWeight: 800,
              color: "#FFFFFF",
              lineHeight: 1.1,
              margin: "0 0 6px 0",
              letterSpacing: "-0.02em",
            }}
          >
            {greeting.emoji}{" "}
            <span style={{ color: "#C9A84C" }}>{greeting.text}</span>
          </h1>
          <p
            style={{
              fontSize: "clamp(14px, 2vw, 17px)",
              color: "rgba(255,255,255,0.5)",
              margin: "0 0 20px 0",
            }}
          >
            {dateStr || "Loading..."} {location ? `• ${location.name}` : ""}
          </p>

          {/* Location Search */}
          <LocationSearch onSelect={handleLocationSelect} loading={loadingW} />
        </div>
      </section>

      {/* ═══ DASHBOARD GRID ═══ */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px 60px" }}>
        {/* ── Row 1: Weather + Spray ──────────────────────────────── */}
        {location && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Weather Card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                border: "1px solid #E8E8E4",
                padding: 20,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Current Weather
                  </div>
                  {weather?.location?.name && (
                    <div style={{ fontSize: 13, color: "#6B7280", marginTop: 2 }}>
                      {weather.location.name}
                    </div>
                  )}
                </div>
                <Link
                  href="/weather"
                  style={{ fontSize: 12, fontWeight: 600, color: "#1B4332", textDecoration: "none" }}
                >
                  Full Forecast →
                </Link>
              </div>

              {loadingW ? (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E8E8E4", borderTopColor: "#1B4332", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : weather?.current ? (
                <div>
                  {/* Temp + Conditions */}
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 16 }}>
                    <span style={{ fontSize: 48, fontWeight: 800, color: "#1a1a1a", lineHeight: 1 }}>
                      {weather.current.high || "—"}°
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280" }}>
                        {weather.current.low}° Low
                      </div>
                      <div style={{ fontSize: 14, color: "#9B9B9B" }}>
                        {weather.current.conditions || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <MiniStat label="Wind" value={`${weather.current.wind_max || "—"} mph`} />
                    <MiniStat label="Rain" value={`${weather.current.precip_chance || 0}%`} />
                    <MiniStat
                      label="Soil 2in"
                      value={weather.soil ? `${weather.soil.temp_2in?.toFixed(1)}°F` : "—"}
                      highlight={weather.soil?.temp_2in >= 50 ? "#22C55E" : "#F59E0B"}
                    />
                    <MiniStat
                      label="GDD Today"
                      value={weather.gdd ? `${weather.gdd.total || 0}` : "—"}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#9B9B9B", fontSize: 14 }}>
                  Enter a location to see weather
                </div>
              )}
            </div>

            {/* Spray Window Card */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                border: spray
                  ? `1px solid ${spray.current_rating === "GO" ? "rgba(5,150,105,0.2)" : spray.current_rating === "CAUTION" ? "rgba(217,119,6,0.2)" : "rgba(220,38,38,0.2)"}`
                  : "1px solid #E8E8E4",
                padding: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Spray Window
                </div>
                <Link
                  href="/spray-window"
                  style={{ fontSize: 12, fontWeight: 600, color: "#1B4332", textDecoration: "none" }}
                >
                  72-Hour Forecast →
                </Link>
              </div>

              {loadingS ? (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E8E8E4", borderTopColor: "#1B4332", animation: "spin 0.8s linear infinite" }} />
                </div>
              ) : spray ? (
                <div>
                  {/* Big Rating Badge */}
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 16px",
                      borderRadius: 10,
                      background: sprayColors[spray.current_rating].bg,
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: sprayColors[spray.current_rating].text,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: sprayColors[spray.current_rating].text,
                      }}
                    >
                      {sprayColors[spray.current_rating].label}
                    </span>
                  </div>

                  {/* Score */}
                  <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 8 }}>
                    Conditions score: {spray.current_score}/100
                  </div>

                  {/* Top reason */}
                  {spray.current_reasons?.[0] && (
                    <div style={{ fontSize: 13, color: "#9B9B9B", lineHeight: 1.5 }}>
                      {spray.current_reasons[0]}
                    </div>
                  )}

                  {/* Best window */}
                  {spray.best_window_today && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(5,150,105,0.06)",
                        border: "1px solid rgba(5,150,105,0.12)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#059669",
                      }}
                    >
                      Best today:{" "}
                      {new Date(spray.best_window_today.start).toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}
                      {" – "}
                      {new Date(spray.best_window_today.end).toLocaleTimeString("en-US", { hour: "numeric", hour12: true })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: "#9B9B9B", fontSize: 14 }}>
                  Enter a location to see spray conditions
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Row 2: Commodity Futures ─────────────────────────── */}
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: 16,
            border: "1px solid #E8E8E4",
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Commodity Futures
              </div>
              <div style={{ fontSize: 12, color: "#B0B0B0", marginTop: 2 }}>
                CME settlement prices •{" "}
                <span
                  style={{
                    color: marketStatus.isOpen ? "#22C55E" : "#9B9B9B",
                    fontWeight: 600,
                  }}
                >
                  {marketStatus.label}
                </span>
              </div>
            </div>
            <Link
              href="/markets"
              style={{ fontSize: 12, fontWeight: 600, color: "#1B4332", textDecoration: "none" }}
            >
              Full Markets →
            </Link>
          </div>

          {loadingF ? (
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid #E8E8E4", borderTopColor: "#1B4332", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {COMMODITY_ORDER.map((code) => {
                const cfg = COMMODITIES[code];
                const d = futures?.[code];
                const price = d?.latestSettle ?? null;
                const change = d?.change ?? null;
                const isUp = change !== null && change >= 0;
                const plcRate = price
                  ? Math.max(0, cfg.effectiveRefPrice - Math.max(price, cfg.loanRate))
                  : 0;
                const priceHistory = d?.prices?.filter((p) => p.settle !== null) || [];

                return (
                  <div
                    key={code}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto auto",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 8px",
                      borderRadius: 10,
                      transition: "background 0.15s",
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{cfg.emoji}</span>

                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a1a" }}>
                        {cfg.name}
                      </div>
                      {plcRate > 0 && price && (
                        <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>
                          PLC: ${plcRate.toFixed(2)}/{cfg.unit}
                        </div>
                      )}
                    </div>

                    {/* Mini sparkline */}
                    <div style={{ width: 70, height: 28 }}>
                      {priceHistory.length > 2 && (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={priceHistory}>
                            <defs>
                              <linearGradient id={`ms-${code}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={cfg.color} stopOpacity={0.2} />
                                <stop offset="100%" stopColor={cfg.color} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <Area
                              type="monotone"
                              dataKey="settle"
                              stroke={cfg.color}
                              strokeWidth={1.5}
                              fill={`url(#ms-${code})`}
                              isAnimationActive={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    <div style={{ textAlign: "right", minWidth: 80 }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a1a" }}>
                        {price ? `$${price.toFixed(2)}` : "—"}
                      </div>
                      {change !== null && (
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: isUp ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {isUp ? "▲" : "▼"} {change >= 0 ? "+" : ""}
                          {change.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Row 3: USDA Calendar + Quick Links ─────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* USDA Calendar */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E8E8E4",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                📅 Upcoming USDA Reports
              </div>
              <Link href="/calendar" style={{ fontSize: 12, fontWeight: 600, color: "#1B4332", textDecoration: "none" }}>
                Full Calendar →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {usdaReports.map((r, i) => {
                const days = daysUntil(r.date);
                return (
                  <div
                    key={`${r.name}-${r.date}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: days <= 3 ? "rgba(245,158,11,0.05)" : "#FAFAF8",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 6 }}>
                        {r.name}
                        <span
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: 3,
                            background: r.impact === "high" ? "rgba(239,68,68,0.1)" : r.impact === "medium" ? "rgba(245,158,11,0.1)" : "rgba(107,114,128,0.1)",
                            color: r.impact === "high" ? "#EF4444" : r.impact === "medium" ? "#F59E0B" : "#6B7280",
                            textTransform: "uppercase",
                          }}
                        >
                          {r.impact}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "#9B9B9B" }}>{formatShortDate(r.date)}</div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: days <= 3 ? "#F59E0B" : "#6B7280",
                      }}
                    >
                      {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Tools Grid */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              border: "1px solid #E8E8E4",
              padding: 20,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 14 }}>
              🚜 Quick Tools
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { href: "/check", emoji: "📊", label: "ARC/PLC Calc", desc: "Compare programs" },
                { href: "/payments", emoji: "💰", label: "Payment Est.", desc: "Estimate payments" },
                { href: "/optimize", emoji: "🎯", label: "Optimizer", desc: "Monte Carlo analysis" },
                { href: "/insurance", emoji: "🛡️", label: "Insurance", desc: "RP + SCO + ECO" },
                { href: "/fba", emoji: "📐", label: "Base Acres", desc: "Farmer Bridge" },
                { href: "/sdrp", emoji: "📋", label: "SDRP", desc: "Spot price relief" },
              ].map((tool) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "#FAFAF8",
                    border: "1px solid #F0F0EC",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "border-color 0.15s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{tool.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a" }}>{tool.label}</div>
                    <div style={{ fontSize: 11, color: "#9B9B9B" }}>{tool.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Data Source Note ─────────────────────────────────── */}
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: "#F5F5F1",
            border: "1px solid #E8E8E4",
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 12, color: "#9B9B9B", lineHeight: 1.6 }}>
            <strong style={{ color: "#6B7280" }}>Data Sources:</strong>{" "}
            Weather from Open-Meteo + NWS. Futures from Nasdaq Data Link (CME). Spray conditions calculated from 7 weather parameters.
            Reference prices per OBBBA (Pub. L. 119-21). All data free and updated automatically.
          </div>
        </div>

        {/* ═══ CTA ═══ */}
        <div
          style={{
            padding: "36px 24px",
            borderRadius: 20,
            background: "linear-gradient(135deg, #0C1F17 0%, #1B4332 50%, #0f2b1e 100%)",
            textAlign: "center",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.03,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: "128px 128px",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h3
              style={{
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: 800,
                color: "#FFFFFF",
                margin: "0 0 8px 0",
              }}
            >
              Get This Briefing Delivered Daily
            </h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.6 }}>
              Pro members receive a personalized morning briefing by email and SMS at 5:30 AM — before anyone else sees the data.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link
                href="/signup"
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: "#C9A84C",
                  color: "#0C1F17",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Create Free Account →
              </Link>
              <Link
                href="/pricing"
                style={{
                  padding: "12px 28px",
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                View Pro Plans
              </Link>
            </div>
          </div>
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: string;
}) {
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        background: "#FAFAF8",
        border: "1px solid #F0F0EC",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 600, color: "#9B9B9B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: highlight || "#1a1a1a", marginTop: 2 }}>
        {value}
      </div>
    </div>
  );
}
