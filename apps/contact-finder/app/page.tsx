"use client";

import { useState, useRef } from "react";
import { Scan, Search } from "lucide-react";
import InvestigationForm from "./components/InvestigationForm";
import InvestigationResults from "./components/InvestigationResults";
import { InvestigationResult } from "@/lib/engine/types";
import ThemeToggle from "./components/ThemeToggle";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInvestigate = async (data: { name: string; fatherName?: string; address: string; city?: string; company?: string; notes?: string }) => {
    setLoading(true);
    setError(null);
    setInvestigationResult(null);
    abortControllerRef.current = new AbortController();
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        signal: abortControllerRef.current.signal
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Investigation failed");
      setInvestigationResult(result);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError("Investigation stopped by user.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Left Panel: Search Form */}
      <aside className="left-panel">
        <header className="header">
          <div className="logo-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h1>Contact Finder</h1>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <a href="/bulk" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, background: "var(--accent-dim)", padding: "6px 12px", borderRadius: "6px", textAlign: "center", flex: 1, border: "1px solid var(--border)" }}>
                  Batch (CSV) &rarr;
                </a>
                <ThemeToggle />
              </div>
              <a href="/pdf-converter" style={{ color: "var(--accent)", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500, background: "rgba(139, 92, 246, 0.1)", padding: "6px 12px", borderRadius: "6px", textAlign: "center", border: "1px solid rgba(139, 92, 246, 0.2)" }}>
                AI PDF to CSV &rarr;
              </a>
            </div>
          </div>
          <p className="subtitle">Indian contact investigation engine. Find and attribute phone numbers with precision.</p>
        </header>

        {error && <div className="error-message">{error}</div>}

        <InvestigationForm onSubmit={handleInvestigate} loading={loading} onStop={handleStop} />
      </aside>

      {/* Right Panel: Results & Loading States */}
      <main className="right-panel">
        {loading && (
          <div className="loading-view">
            <Scan size={56} className="spin" strokeWidth={1.5} />
            <h3>Investigating Contact...</h3>
            <p>Searching Google, TinyFish, and 5 directories. Running context extraction.</p>
          </div>
        )}

        {!loading && !investigationResult && (
          <div className="empty-state">
            <Search size={64} strokeWidth={1} />
            <h3>Ready to investigate</h3>
            <p>Enter a target's name and known address to begin scraping the web for associated phone numbers.</p>
          </div>
        )}

        {investigationResult && !loading && (
          <InvestigationResults result={investigationResult} />
        )}
      </main>
    </div>
  );
}
