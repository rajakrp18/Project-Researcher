"use client";

import { useState } from "react";
import { Scan, Search } from "lucide-react";
import InvestigationForm from "./components/InvestigationForm";
import InvestigationResults from "./components/InvestigationResults";
import { InvestigationResult } from "@/lib/engine/types";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investigationResult, setInvestigationResult] = useState<InvestigationResult | null>(null);

  const handleInvestigate = async (data: { name: string; fatherName?: string; address: string; city?: string; company?: string; notes?: string }) => {
    setLoading(true);
    setError(null);
    setInvestigationResult(null);
    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Investigation failed");
      setInvestigationResult(result);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Left Panel: Search Form */}
      <aside className="left-panel">
        <header className="header">
          <div className="logo-row">
            <div className="logo-icon">
              <Scan size={26} strokeWidth={2.5} />
            </div>
            <h1>Contact Finder</h1>
          </div>
          <p>Indian contact investigation engine. Find and attribute phone numbers with precision.</p>
        </header>

        {error && <div className="error-message">{error}</div>}

        <InvestigationForm onSubmit={handleInvestigate} loading={loading} />
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
