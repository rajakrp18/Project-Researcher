"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileSpreadsheet,
  FileDown,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Trash2,
  Filter,
  BarChart3,
  Sparkles,
  Info,
  ExternalLink
} from "lucide-react";
import { exportToExcel, getCleanSourceLabel, getOwnerTag, BatchRowData } from "@/lib/exportExcel";
import { isDummyOrSpamPhone } from "@/lib/engine/extractors/PhoneExtractor";

export default function AnalysisPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BatchRowData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [minConfidence, setMinConfidence] = useState<number>(25);
  const [enableNoiseFilter, setEnableNoiseFilter] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("batch_analysis_data");
      if (stored) {
        setRows(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load batch data from localStorage", e);
    }
  }, []);

  // Compute Cleaned Data
  const cleanedRows = useMemo(() => {
    return rows.map((r) => {
      const candidates = (r.candidates || []).filter((c) => {
        if (!c.phone || c.phone === "Not Found") return false;
        if (enableNoiseFilter && isDummyOrSpamPhone(c.phone, c.sourceUrl)) return false;
        if (c.confidence < minConfidence) return false;
        return true;
      });

      return {
        ...r,
        cleanedCandidates: candidates,
        hasMatch: candidates.length > 0
      };
    });
  }, [rows, enableNoiseFilter, minConfidence]);

  // Filtered Rows for display
  const displayedRows = useMemo(() => {
    return cleanedRows.filter((r) => {
      // Status filter
      if (statusFilter === "MATCHED" && !r.hasMatch) return false;
      if (statusFilter === "NO_MATCH" && r.hasMatch) return false;

      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesFolio = r.folio.toLowerCase().includes(query);
        const matchesName = r.name.toLowerCase().includes(query);
        const matchesAddress = r.address.toLowerCase().includes(query);
        const matchesPhone = r.cleanedCandidates.some((c) => c.phone.includes(query) || (c.owner && c.owner.toLowerCase().includes(query)));
        return matchesFolio || matchesName || matchesAddress || matchesPhone;
      }

      return true;
    });
  }, [cleanedRows, statusFilter, searchTerm]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = rows.length;
    const totalRawMatches = rows.filter((r) => r.candidates?.some((c) => c.phone && c.phone !== "Not Found")).length;
    const totalCleanMatches = cleanedRows.filter((r) => r.hasMatch).length;
    const noiseFilteredCount = rows.reduce((acc, r) => {
      const rawCount = (r.candidates || []).filter((c) => c.phone && c.phone !== "Not Found").length;
      const cleanCount = (cleanedRows.find((cr) => cr.folio === r.folio)?.cleanedCandidates || []).length;
      return acc + (rawCount - cleanCount);
    }, 0);

    const highConfCount = cleanedRows.filter((r) => r.cleanedCandidates.some((c) => c.confidence >= 50)).length;
    const mediumConfCount = cleanedRows.filter((r) => r.cleanedCandidates.some((c) => c.confidence >= 25 && c.confidence < 50)).length;

    const matchRate = total > 0 ? Math.round((totalCleanMatches / total) * 100) : 0;

    return {
      total,
      totalRawMatches,
      totalCleanMatches,
      noiseFilteredCount,
      highConfCount,
      mediumConfCount,
      matchRate
    };
  }, [rows, cleanedRows]);

  const handleExportCleanedExcel = () => {
    // Export data with active filters applied
    const exportData = rows.map((r) => {
      const cleaned = cleanedRows.find((cr) => cr.folio === r.folio);
      return {
        ...r,
        candidates: cleaned ? cleaned.cleanedCandidates : []
      };
    });
    exportToExcel(exportData, {
      filename: `cleaned_investigation_results_${new Date().toISOString().slice(0, 10)}.xlsx`,
      minConfidence
    });
  };

  const downloadCSV = () => {
    const header = "FOLIO,NAME,ADDRESS,CITY,PHONE_RESULTS,CONFIDENCE_SCORES,SOURCES\n";
    const csv = cleanedRows
      .map((r) => {
        const phones = r.cleanedCandidates.map((c) => `${c.phone} (${getOwnerTag(c, r.name)})`).join(" | ") || "Not Found";
        const scores = r.cleanedCandidates.map((c) => `${c.confidence}%`).join(" | ") || "-";
        const sources = r.cleanedCandidates.map((c) => c.sourceUrl || "-").join(" | ") || "-";
        return `"${r.folio}","${r.name}","${r.address}","${r.city}","${phones}","${scores}","${sources}"`;
      })
      .join("\n");

    const blob = new Blob([header + csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cleaned_investigation_results.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1600px", margin: "0 auto", color: "var(--foreground)", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Header */}
      <header style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <button
            onClick={() => router.push("/bulk")}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.95rem",
              fontWeight: 500,
              marginBottom: "10px",
              padding: 0
            }}
          >
            <ArrowLeft size={16} /> Back to Batch Engine
          </button>
          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "12px" }}>
            <Sparkles style={{ color: "#10b981" }} size={32} />
            Data Intelligence & Cleaning Hub
          </h1>
          <p style={{ opacity: 0.7, fontSize: "1.05rem" }}>Analyze extractions, apply noise filters, tag relationships, and export verified results.</p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={handleExportCleanedExcel}
            style={{
              padding: "12px 24px",
              background: "#10b981",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "white",
              fontWeight: 600,
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)",
              transition: "all 0.2s"
            }}
          >
            <FileSpreadsheet size={20} /> Export Cleaned Excel (.xlsx)
          </button>
          <button
            onClick={downloadCSV}
            style={{
              padding: "12px 18px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--text-main)",
              fontWeight: 500,
              transition: "all 0.2s"
            }}
          >
            <FileDown size={18} /> CSV
          </button>
        </div>
      </header>

      {/* Analytics Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>Total Folios</div>
          <div style={{ fontSize: "2rem", fontWeight: 800 }}>{metrics.total}</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>Verified Matches</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#10b981", display: "flex", alignItems: "baseline", gap: "8px" }}>
            {metrics.totalCleanMatches}
            <span style={{ fontSize: "0.9rem", opacity: 0.8, fontWeight: 500 }}>({metrics.matchRate}%)</span>
          </div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>High Confidence (≥50%)</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{metrics.highConfCount}</div>
        </div>

        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: "0.85rem", color: "#f59e0b", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px" }}>Medium Match (25-49%)</div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f59e0b" }}>{metrics.mediumConfCount}</div>
        </div>

        <div style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "20px", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: 600, textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Trash2 size={14} /> Noise Numbers Purged
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#ef4444" }}>{metrics.noiseFilteredCount}</div>
        </div>
      </div>

      {/* Cleaning Controls Bar */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "20px 24px", borderRadius: "16px", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search Folio, Name, Address, or Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 42px",
              background: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              fontSize: "0.95rem",
              color: "var(--text-main)",
              outline: "none"
            }}
          />
        </div>

        {/* Noise Filter Toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none", fontWeight: 600, fontSize: "0.95rem", background: "var(--background)", padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <input
            type="checkbox"
            checked={enableNoiseFilter}
            onChange={(e) => setEnableNoiseFilter(e.target.checked)}
            style={{ accentColor: "#10b981", width: "18px", height: "18px" }}
          />
          <ShieldCheck size={18} style={{ color: enableNoiseFilter ? "#10b981" : "var(--text-muted)" }} />
          Purge Placeholders & Dummy Numbers
        </label>

        {/* Confidence Threshold */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "var(--background)", padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
          <Filter size={16} style={{ color: "var(--accent)" }} />
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Min Confidence:</span>
          <select
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            style={{ background: "transparent", border: "none", color: "var(--text-main)", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer", outline: "none" }}
          >
            <option value={50}>High Only (≥ 50%)</option>
            <option value={25}>Medium & High (≥ 25%)</option>
            <option value={0}>All Candidates (≥ 0%)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {["ALL", "MATCHED", "NO_MATCH"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                background: statusFilter === st ? "var(--accent)" : "var(--background)",
                color: statusFilter === st ? "white" : "var(--text-main)",
                transition: "all 0.2s"
              }}
            >
              {st === "ALL" ? "All Status" : st === "MATCHED" ? "Matched Only" : "No Match Only"}
            </button>
          ))}
        </div>
      </div>

      {/* Cleaned Dataset Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "16px 24px", background: "var(--background)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-muted)" }}>
            Showing {displayedRows.length} of {rows.length} records
          </div>
          <div style={{ fontSize: "0.85rem", color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
            <Info size={14} /> Active Cleaning Filter: Dummy & Repetitive Numbers Filtered Out
          </div>
        </div>

        <div style={{ overflowX: "auto", maxHeight: "650px", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
            <thead style={{ background: "var(--background)", position: "sticky", top: 0, zIndex: 10, borderBottom: "1px solid var(--border)" }}>
              <tr>
                <th style={{ padding: "16px", fontWeight: 600, width: "8%" }}>Status</th>
                <th style={{ padding: "16px", fontWeight: 600, width: "12%" }}>Folio</th>
                <th style={{ padding: "16px", fontWeight: 600, width: "20%" }}>Name</th>
                <th style={{ padding: "16px", fontWeight: 600, width: "26%" }}>Address</th>
                <th style={{ padding: "16px", fontWeight: 600, width: "18%" }}>Refined Phone & Owner</th>
                <th style={{ padding: "16px", fontWeight: 600, width: "8%", textAlign: "center" }}>Confidence</th>
                <th style={{ padding: "16px", fontWeight: 600, width: "12%" }}>Source Domain</th>
              </tr>
            </thead>
            <tbody>
              {displayedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                    No records match the current cleaning filter criteria.
                  </td>
                </tr>
              ) : (
                displayedRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)", transition: "background 0.2s" }}>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top" }}>
                      {r.hasMatch ? (
                        <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 700 }}>
                          Matched
                        </span>
                      ) : (
                        <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>
                          No Match
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "16px", fontSize: "0.95em", fontFamily: "monospace", color: "var(--accent)", verticalAlign: "top", wordBreak: "break-all" }}>
                      {r.folio}
                    </td>

                    <td style={{ padding: "16px", verticalAlign: "top", fontWeight: 500 }}>
                      {r.name}
                    </td>

                    <td style={{ padding: "16px", verticalAlign: "top", fontSize: "0.9em", opacity: 0.85 }}>
                      {r.address}
                    </td>

                    <td style={{ padding: "16px", fontWeight: 600, verticalAlign: "top" }}>
                      {r.hasMatch ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {r.cleanedCandidates.map((c, idx) => {
                            const ownerTag = getOwnerTag(c, r.name);
                            return (
                              <div key={idx} style={{ color: "#10b981" }}>
                                {c.phone}
                                {ownerTag && (
                                  <span style={{ fontSize: "0.8em", color: "var(--text-muted)", display: "block", fontWeight: 400 }}>
                                    ({ownerTag})
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>Not Found</span>
                      )}
                    </td>

                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top" }}>
                      {r.hasMatch ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {r.cleanedCandidates.map((c, idx) => {
                            const ownerTag = getOwnerTag(c, r.name);
                            const hasOwner = Boolean(ownerTag);
                            return (
                              <div key={idx} style={{ height: hasOwner ? "38px" : "20px" }}>
                                <span
                                  style={{
                                    padding: "2px 8px",
                                    borderRadius: "6px",
                                    fontSize: "0.85em",
                                    fontWeight: 700,
                                    background: c.confidence >= 50 ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                                    color: c.confidence >= 50 ? "#10b981" : "#f59e0b"
                                  }}
                                >
                                  {c.confidence}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>-</span>
                      )}
                    </td>

                    <td style={{ padding: "16px", fontSize: "0.85em", color: "var(--accent)", verticalAlign: "top" }}>
                      {r.hasMatch ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                          {r.cleanedCandidates.map((c, idx) => {
                            const ownerTag = getOwnerTag(c, r.name);
                            const hasOwner = Boolean(ownerTag);
                            const cleanLabel = getCleanSourceLabel(c.sourceUrl);
                            return (
                              <div key={idx} style={{ height: hasOwner ? "38px" : "20px" }}>
                                {c.sourceUrl ? (
                                  <a
                                    href={c.sourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "inherit", textDecoration: "underline", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px" }}
                                  >
                                    {cleanLabel} <ExternalLink size={12} />
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span style={{ opacity: 0.5 }}>-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
