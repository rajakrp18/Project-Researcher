"use client";

import { useState, useRef, useMemo } from "react";
import { Upload, FileDown, RefreshCw, CheckCircle2, Table as TableIcon, FileSpreadsheet, Search, Database, DollarSign } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";

interface ParsedRow {
  folio?: string;
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  investmentType?: string;
  amount?: string | number;
  proposedDate?: string;
  year?: string;
  [key: string]: any;
}

export default function PdfConverterPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedRows, setParsedRows] = useState<ParsedRow[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a valid PDF file.");
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setError(null);
    setParsedRows(null);
    setProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", file);
      
      setProgress(40);

      const res = await fetch("/api/convert-pdf", {
        method: "POST",
        body: formData,
      });
      
      setProgress(85);

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!data.rows || data.rows.length === 0) {
        throw new Error("No tabular data could be extracted from this PDF. Please verify it contains text or table rows.");
      }

      setParsedRows(data.rows);
      setProgress(100);
      
    } catch (err: any) {
      setError(err.message || "Failed to process the PDF");
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (!parsedRows) return [];
    if (!searchQuery.trim()) return parsedRows;

    const query = searchQuery.toLowerCase().trim();
    return parsedRows.filter(r => 
      (r.folio && r.folio.toLowerCase().includes(query)) ||
      (r.name && r.name.toLowerCase().includes(query)) ||
      (r.address && r.address.toLowerCase().includes(query)) ||
      (r.city && r.city.toLowerCase().includes(query)) ||
      (r.state && r.state.toLowerCase().includes(query)) ||
      (r.pincode && r.pincode.toLowerCase().includes(query)) ||
      (r.amount && String(r.amount).toLowerCase().includes(query)) ||
      (r.year && String(r.year).toLowerCase().includes(query))
    );
  }, [parsedRows, searchQuery]);

  const totalAmountSum = useMemo(() => {
    if (!parsedRows) return 0;
    return parsedRows.reduce((acc, row) => {
      if (!row.amount) return acc;
      const num = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount).replace(/,/g, ''));
      return acc + (isNaN(num) ? 0 : num);
    }, 0);
  }, [parsedRows]);

  const handleDownloadCSV = () => {
    if (!parsedRows || parsedRows.length === 0) return;
    
    const headers = [
      "YEAR", "FOLIO_DEMAT_AC", "INVESTOR_NAME", "FIRST_NAME", "MIDDLE_NAME", "LAST_NAME",
      "ADDRESS", "CITY_DISTRICT", "STATE", "COUNTRY", "PINCODE", "INVESTMENT_TYPE", "AMOUNT_DUE", "PROPOSED_DATE"
    ];
    
    const csvLines = [headers.join(",")];

    parsedRows.forEach(r => {
      const line = [
        `"${String(r.year ?? '').replace(/"/g, '""')}"`,
        `"${String(r.folio ?? '').replace(/"/g, '""')}"`,
        `"${String(r.name ?? '').replace(/"/g, '""')}"`,
        `"${String(r.firstName ?? '').replace(/"/g, '""')}"`,
        `"${String(r.middleName ?? '').replace(/"/g, '""')}"`,
        `"${String(r.lastName ?? '').replace(/"/g, '""')}"`,
        `"${String(r.address ?? '').replace(/"/g, '""')}"`,
        `"${String(r.city ?? '').replace(/"/g, '""')}"`,
        `"${String(r.state ?? '').replace(/"/g, '""')}"`,
        `"${String(r.country ?? '').replace(/"/g, '""')}"`,
        `"${String(r.pincode ?? '').replace(/"/g, '""')}"`,
        `"${String(r.investmentType ?? '').replace(/"/g, '""')}"`,
        `"${String(r.amount ?? '').replace(/"/g, '""')}"`,
        `"${String(r.proposedDate ?? '').replace(/"/g, '""')}"`,
      ];
      csvLines.push(line.join(","));
    });
    
    const blob = new Blob([csvLines.join("\n")], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = (fileName ? fileName.replace(/\.pdf$/i, '') : 'extracted_data') + '.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDownloadExcel = async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    setIsDownloadingExcel(true);
    try {
      const res = await fetch("/api/export-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: parsedRows,
          filename: fileName
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to generate Excel file");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (fileName ? fileName.replace(/\.pdf$/i, '') : 'extracted_data') + '.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Excel download error: " + err.message);
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  return (
    <div style={{ padding: "80px 40px 40px 40px", maxWidth: "1280px", margin: "0 auto", color: "var(--text-main)", fontFamily: "var(--font-inter), sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", top: "40px", left: "40px" }}>
        <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none", fontWeight: 600, padding: "10px 20px", borderRadius: "12px", display: "inline-flex", alignItems: "center", gap: "8px", background: "var(--surface)", border: "1px solid var(--border)", transition: "all 0.2s", boxShadow: "var(--shadow-sm)" }} onMouseOver={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }} onMouseOut={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "var(--shadow-sm)"; }}>
          &larr; Back to Dashboard
        </Link>
      </div>
      <div style={{ position: "absolute", top: "40px", right: "40px" }}>
        <ThemeToggle />
      </div>

      <header style={{ marginBottom: "36px", textAlign: "center" }}>
        <h1 style={{ fontSize: "3.2rem", marginBottom: "14px", fontWeight: "800", background: "linear-gradient(90deg, var(--accent), #8b5cf6, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.02em" }}>
          PDF to CSV & Excel Converter
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "1.15rem", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
          Upload IEPF Unpaid Dividend PDFs or shareholder directories. Intelligent multi-strategy extraction converts messy tables into structured CSV & Excel (.xlsx) files.
        </p>
      </header>

      <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "24px", padding: "36px", boxShadow: "var(--shadow-lg)", backdropFilter: "blur(16px)" }}>
        
        {!isProcessing && !parsedRows && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            style={{ border: "2px dashed var(--accent)", borderRadius: "20px", padding: "60px 20px", cursor: "pointer", background: "var(--accent-dim)", textAlign: "center", transition: "all 0.3s ease", transform: "scale(1)" }}
            onMouseOver={e => { e.currentTarget.style.transform = "scale(1.01)"; e.currentTarget.style.borderColor = "var(--accent-hover)"; e.currentTarget.style.background = "rgba(37, 99, 235, 0.1)"; }}
            onMouseOut={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.background = "var(--accent-dim)"; }}
          >
            <div style={{ background: "var(--surface)", width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "var(--shadow-md)" }}>
              <Upload size={40} style={{ color: "var(--accent)" }} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "10px", color: "var(--text-main)" }}>Click or drop your PDF document here</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Supports IEPF dividend disclosures, Trent reports, and custom PDF tables.</p>
          </div>
        )}

        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileUpload} 
          style={{ display: "none" }} 
          ref={fileInputRef} 
        />

        {isProcessing && (
          <div style={{ padding: "60px 20px", textAlign: "center" }}>
            <div style={{ position: "relative", width: "80px", height: "80px", margin: "0 auto 30px" }}>
              <div style={{ position: "absolute", inset: 0, border: "4px solid var(--accent-dim)", borderRadius: "50%" }}></div>
              <div style={{ position: "absolute", inset: 0, border: "4px solid var(--accent)", borderRadius: "50%", borderTopColor: "transparent", animation: "spin 1s linear infinite" }}></div>
              <RefreshCw size={32} style={{ color: "var(--accent)", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
            </div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "16px", color: "var(--text-main)" }}>Parsing document tables...</h3>
            <div style={{ height: "10px", background: "var(--surface-active)", borderRadius: "5px", overflow: "hidden", maxWidth: "500px", margin: "0 auto 16px" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, var(--accent), #8b5cf6)", transition: "width 0.4s ease" }} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "1.05rem" }}>Running multi-strategy spatial & layout analysis...</p>
          </div>
        )}

        {parsedRows && !isProcessing && (
          <div style={{ padding: "10px 0" }}>
            {/* Header Metrics Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "28px" }}>
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ background: "rgba(16, 185, 129, 0.15)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Total Records</div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)" }}>{parsedRows.length.toLocaleString()}</div>
                </div>
              </div>

              {totalAmountSum > 0 && (
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ background: "rgba(59, 130, 246, 0.15)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6" }}>
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Unclaimed Amount Sum</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-main)" }}>₹{totalAmountSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              )}

              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ background: "rgba(139, 92, 246, 0.15)", width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b5cf6" }}>
                  <Database size={28} />
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Source File</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fileName || "Document.pdf"}</div>
                </div>
              </div>
            </div>

            {/* Action Bar: Search & Export Buttons */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
              <div style={{ position: "relative", minWidth: "300px", flex: "1" }}>
                <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                <input 
                  type="text" 
                  placeholder="Search folio, investor name, address, amount..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px 12px 42px", borderRadius: "12px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-main)", fontSize: "0.95rem", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button 
                  onClick={handleDownloadCSV}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", background: "linear-gradient(135deg, var(--accent), var(--accent-hover))", color: "white", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)" }}
                  onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  <FileDown size={18} /> Download CSV
                </button>

                <button 
                  onClick={handleDownloadExcel}
                  disabled={isDownloadingExcel}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px", background: "linear-gradient(135deg, #10b981, #059669)", color: "white", border: "none", borderRadius: "12px", fontWeight: 700, fontSize: "0.95rem", cursor: isDownloadingExcel ? "wait" : "pointer", transition: "all 0.2s", boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)" }}
                  onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                  onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                >
                  {isDownloadingExcel ? <RefreshCw size={18} className="animate-spin" /> : <FileSpreadsheet size={18} />} 
                  {isDownloadingExcel ? "Generating Excel..." : "Download Excel (.xlsx)"}
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px", overflow: "hidden", marginBottom: "24px", boxShadow: "var(--shadow-md)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface-hover)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <TableIcon size={20} style={{ color: "var(--text-muted)" }} />
                  <span style={{ fontWeight: 700, color: "var(--text-main)", fontSize: "1.05rem" }}>Data Preview</span>
                </div>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  Showing {filteredRows.length} of {parsedRows.length} rows
                </span>
              </div>
              <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "550px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--surface)", zIndex: 1, boxShadow: "0 1px 0 var(--border)" }}>
                    <tr>
                      <th style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "120px" }}>Folio / Demat</th>
                      <th style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: "180px" }}>Investor Name</th>
                      <th style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: "260px" }}>Address</th>
                      <th style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "140px" }}>City / State</th>
                      <th style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "120px", textAlign: "right" }}>Amount (₹)</th>
                      <th style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", width: "140px" }}>Proposed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row, idx) => (
                      <tr key={idx} style={{ borderTop: "1px solid var(--border)", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "var(--surface-hover)"} onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                        <td style={{ padding: "14px 18px", color: "var(--accent)", fontWeight: 700, fontSize: "0.88rem", fontFamily: "monospace" }}>{row.folio || '-'}</td>
                        <td style={{ padding: "14px 18px", color: "var(--text-main)", fontWeight: 600 }}>{row.name || '-'}</td>
                        <td style={{ padding: "14px 18px", color: "var(--text-muted)", lineHeight: "1.4", whiteSpace: "normal" }}>{row.address || '-'}</td>
                        <td style={{ padding: "14px 18px", color: "var(--text-main)" }}>{[row.city, row.state].filter(Boolean).join(', ') || '-'}</td>
                        <td style={{ padding: "14px 18px", color: "#10b981", fontWeight: 700, textAlign: "right" }}>{row.amount ? `₹${row.amount}` : '-'}</td>
                        <td style={{ padding: "14px 18px", color: "var(--text-muted)", fontSize: "0.85rem" }}>{row.proposedDate || row.year || '-'}</td>
                      </tr>
                    ))}
                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                          No records matched your search query "{searchQuery}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div style={{ textAlign: "center" }}>
              <button 
                onClick={() => { setParsedRows(null); setProgress(0); setSearchQuery(""); setFileName(""); }}
                style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontSize: "0.95rem", fontWeight: 600, transition: "all 0.2s ease" }}
                onMouseOver={e => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text-main)"; e.currentTarget.style.borderColor = "var(--border-hover)"; }}
                onMouseOut={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                Upload another PDF
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: "24px", padding: "18px 24px", background: "rgba(239, 68, 68, 0.08)", color: "#ef4444", borderRadius: "14px", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "1rem", display: "flex", alignItems: "center", gap: "12px", justifyContent: "center", fontWeight: 500 }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span> {error}
          </div>
        )}
      </div>
    </div>
  );
}
