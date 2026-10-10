"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Upload, Play, CheckCircle2, AlertCircle, RefreshCw, FileDown, Search, FileSpreadsheet, Sparkles } from "lucide-react";
import { exportToExcel, getCleanSourceLabel, getOwnerTag } from "@/lib/exportExcel";




interface BatchRow {
  folio: string;
  name: string;
  address: string;
  city: string;
  status: "pending" | "processing" | "success" | "error";
  candidates?: Array<{
    phone: string;
    owner?: string;
    confidence: number;
    sourceUrl?: string;
  }>;
  company?: string;
  error?: string;
}

export default function BulkPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [forceRerun, setForceRerun] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCancelledRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processedCount = rows.filter(r => r.status === 'success' || r.status === 'error').length;
  const totalCount = rows.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((processedCount / totalCount) * 100);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    if (file.name.endsWith('.pdf')) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/parse-pdf', {
          method: 'POST',
          body: formData
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        // Remove artificial limit, load the full dataset!
        setRows(data.rows);
      } catch (err: any) {
        alert("Error parsing PDF: " + err.message);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Handle CSV
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        const parsedRows: BatchRow[] = [];
        
        const headers = lines[0].toUpperCase().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        const idxFolio = headers.indexOf('FOLIO');
        const idxName = headers.indexOf('NAME');
        const idxAdd1 = headers.findIndex(h => h.includes('ADDRESS') || h === 'ADD1');
        const idxAdd2 = headers.indexOf('ADD2');
        const idxAdd3 = headers.indexOf('ADD3');
        const idxCity = headers.indexOf('CITY');
        const idxPin = headers.indexOf('PIN');
        
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
          if (cols.length < 3) continue;
          
          const folio = idxFolio !== -1 ? cols[idxFolio] : `UNKNOWN-${i}`;
          const name = idxName !== -1 ? cols[idxName] : cols[1];
          const add1 = idxAdd1 !== -1 ? cols[idxAdd1] : '';
          const add2 = idxAdd2 !== -1 ? cols[idxAdd2] : '';
          const add3 = idxAdd3 !== -1 ? cols[idxAdd3] : '';
          const city = idxCity !== -1 ? cols[idxCity] : '';
          const pin = idxPin !== -1 ? cols[idxPin] : '';
          
          const fullAddress = [add1, add2, add3, pin].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();
          
          parsedRows.push({
            folio,
            name,
            address: fullAddress,
            city,
            status: "pending"
          });
        }
        setRows(parsedRows); 
        setIsUploading(false);
      };
      reader.readAsText(file);
    }
  };

  const processBatch = async () => {
    setIsProcessing(true);
    isCancelledRef.current = false;
    
    for (let i = 0; i < rows.length; i++) {
      if (isCancelledRef.current) break;
      if (rows[i].status === "success" && !forceRerun) continue;

      setRows(prev => {
        const next = [...prev];
        next[i].status = "processing";
        return next;
      });

      let isCached = false;
      try {
          // Extract company if it's in parentheses in the address
          let finalAddress = rows[i].address;
          let finalCompany = '';
          const match = finalAddress.match(/\(([^)]+)\)$/);
          if (match) {
            finalCompany = match[1];
            finalAddress = finalAddress.replace(/\([^)]+\)$/, '').trim();
          }

          abortControllerRef.current = new AbortController();
          const res = await fetch("/api/investigate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: rows[i].name,
              address: finalAddress,
              company: finalCompany,
              city: rows[i].city,
              notes: rows[i].folio,
              forceRerun: forceRerun
            }),
            signal: abortControllerRef.current.signal
          });

        const result = await res.json();
        isCached = result.isCached === true;
        
        if (!res.ok) throw new Error(result.error);
        
        setRows(prev => {
          const next = [...prev];
          next[i].status = "success";
          const candidates = (result.phones || []).slice(0, 3).map((p: any) => ({
             phone: p.phone || "Not Found",
             owner: p.owner || "Unknown",
             confidence: p.confidence || 0,
             sourceUrl: p.evidence?.[0]?.sourceUrl || ""
          }));
          next[i].candidates = candidates.length > 0 ? candidates : [{ phone: "Not Found", confidence: 0 }];
          return next;
        });

      } catch (err: any) {
        if (err.name === 'AbortError') {
          setRows(prev => {
            const next = [...prev];
            next[i].status = "pending"; // Reset to pending if aborted
            return next;
          });
          break; // Exit loop immediately
        }
        setRows(prev => {
          const next = [...prev];
          next[i].status = "error";
          next[i].error = err.message;
          return next;
        });
      }

      // ⚠️ ARTIFICIAL DELAY ⚠️
      // Enforce a strict 25-second delay between cases to prevent Google Gemini API 429 Quota Rate Limits (15 Requests Per Minute free tier).
      if (i < rows.length - 1 && !isCancelledRef.current && !isCached) {
        let elapsed = 0;
        while (elapsed < 25000) {
          if (isCancelledRef.current) break;
          await new Promise(resolve => setTimeout(resolve, 500));
          elapsed += 500;
        }
      }
    }
    
    setIsProcessing(false);
  };

  const handleStopAndAnalyze = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsProcessing(false);
    try {
      localStorage.setItem("batch_analysis_data", JSON.stringify(rows));
    } catch (e) {
      console.error("Failed to store batch data", e);
    }
    router.push("/bulk/analysis");
  };

  const goToAnalysis = () => {
    try {
      localStorage.setItem("batch_analysis_data", JSON.stringify(rows));
    } catch (e) {
      console.error("Failed to store batch data", e);
    }
    router.push("/bulk/analysis");
  };

  const handleExportExcel = () => {
    exportToExcel(rows);
  };

  const downloadCSV = () => {
    const header = "FOLIO,NAME,ADDRESS,CITY,PHONE_RESULTS,CONFIDENCE_SCORES,SOURCES\n";
    const csv = rows.map(r => {
      const phones = (r.candidates || []).map(c => c.phone).join(" | ");
      const scores = (r.candidates || []).map(c => c.confidence).join(" | ");
      const sources = (r.candidates || []).map(c => c.sourceUrl).join(" | ");
      return `"${r.folio}","${r.name}","${r.address}","${r.city}","${phones}","${scores}","${sources}"`;
    }).join("\n");
    
    const blob = new Blob([header + csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'investigation_results.csv';
    a.click();
  };


  return (
    <div style={{ padding: "40px", maxWidth: "1600px", margin: "0 auto", color: "var(--foreground)", fontFamily: "var(--font-inter), sans-serif" }}>
      <header style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "8px", fontWeight: "bold" }}>Batch Processing Engine</h1>
          <p style={{ opacity: 0.7, fontSize: "1.1rem" }}>Powered by Gemini Deep Research & Puppeteer</p>
        </div>
        <a href="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500, background: "rgba(37, 99, 235, 0.1)", padding: "8px 16px", borderRadius: "8px" }}>&larr; Back to Single Search</a>
      </header>

      <div style={{ display: "flex", gap: "20px", marginBottom: "30px", background: "var(--surface)", padding: "16px 24px", borderRadius: "16px", border: "1px solid var(--border)", alignItems: "center", flexWrap: "wrap", boxShadow: "var(--shadow-sm)" }}>
        <input 
          type="file" 
          accept=".csv,.pdf" 
          onChange={handleFileUpload} 
          style={{ display: "none" }} 
          ref={fileInputRef} 
        />
        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isProcessing}
          style={{ padding: "10px 20px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "10px", cursor: (isUploading || isProcessing) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-main)", fontWeight: 500, transition: "all 0.2s" }}
        >
          {isUploading ? <RefreshCw size={18} className="spin" /> : <Upload size={18} />} 
          {isUploading ? "Uploading Data..." : "Upload PDF / CSV"}
        </button>

        <div style={{ width: "1px", height: "30px", background: "var(--border)" }}></div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            onClick={processBatch}
            disabled={rows.length === 0 || isProcessing || isUploading}
            style={{ padding: "10px 20px", background: (rows.length === 0 || isProcessing || isUploading) ? "var(--border)" : "var(--accent)", border: "none", borderRadius: "10px", cursor: (rows.length === 0 || isProcessing || isUploading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px", color: (rows.length === 0 || isProcessing || isUploading) ? "var(--text-muted)" : "white", fontWeight: 600, opacity: (rows.length === 0 || isProcessing || isUploading) ? 0.7 : 1, transition: "all 0.2s" }}
          >
            {isProcessing ? <RefreshCw size={18} className="spin" /> : <Search size={18} />} 
            {isProcessing ? "Investigating..." : "Start Deep Research Batch"}
          </button>

          {isProcessing && (
            <button 
              onClick={handleStopAndAnalyze}
              style={{ padding: "10px 20px", background: "#ef4444", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 600, transition: "all 0.2s" }}
              title="Stop investigation & open Data Intelligence Hub"
            >
              Stop & Analyze
            </button>
          )}
          
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.9rem", color: "var(--text-muted)", cursor: "pointer", fontWeight: 500, userSelect: "none", padding: "8px 12px", borderRadius: "8px", background: "var(--background)", border: "1px solid var(--border)" }}>
            <input 
              type="checkbox" 
              checked={forceRerun}
              onChange={(e) => setForceRerun(e.target.checked)}
              disabled={isProcessing}
              style={{ accentColor: "var(--accent)", width: "16px", height: "16px", cursor: "pointer" }}
            />
            Ignore Cache
          </label>
        </div>

        {rows.length > 0 && (
          <div style={{ marginLeft: "auto", flex: 1, paddingLeft: "40px", minWidth: "300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem", fontWeight: 600 }}>
              <span style={{ display: "flex", gap: "16px" }}>
                <span style={{ color: "var(--text-main)" }}>Progress: {processedCount} / {totalCount}</span>
                <span style={{ color: "#10b981" }}>• Matches: {rows.filter(r => r.candidates?.some(c => c.phone !== 'Not Found')).length}</span>
              </span>
              <span style={{ color: "var(--accent)" }}>{progressPercent}%</span>
            </div>
            <div style={{ height: "6px", background: "var(--background)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, background: "var(--accent)", transition: "width 0.3s ease" }} />
            </div>
          </div>
        )}

        {rows.some(r => r.status === 'success') && (
          <div style={{ display: "flex", gap: "10px", marginLeft: "20px" }}>
            <button 
              onClick={goToAnalysis}
              style={{ padding: "10px 20px", background: "#3b82f6", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 600, transition: "all 0.2s" }}
              title="Open Data Intelligence & Cleaning Hub"
            >
              <Sparkles size={18} /> Analyze & Clean Results
            </button>
            <button 
              onClick={handleExportExcel}
              style={{ padding: "10px 18px", background: "#10b981", border: "none", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", color: "white", fontWeight: 600, transition: "all 0.2s" }}
              title="Export formatted Excel (.xlsx) with multi-line cells"
            >
              <FileSpreadsheet size={18} /> Export Excel
            </button>
            <button 
              onClick={downloadCSV}
              style={{ padding: "10px 14px", background: "var(--background)", border: "1px solid var(--border)", borderRadius: "10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", color: "var(--text-main)", fontWeight: 500, transition: "all 0.2s" }}
              title="Export CSV file"
            >
              <FileDown size={16} /> CSV
            </button>
          </div>
        )}

      </div>

      {rows.length > 0 && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", height: "600px", display: "flex", flexDirection: "column", boxShadow: "0 10px 30px rgba(0,0,0,0.05)" }}>
          <div style={{ overflowY: "auto", flex: 1, overflowX: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", tableLayout: "fixed" }}>
              <thead style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: "16px", fontWeight: 600, width: "6%" }}>Status</th>
                  <th style={{ padding: "16px", fontWeight: 600, width: "12%" }}>Folio</th>
                  <th style={{ padding: "16px", fontWeight: 600, width: "20%" }}>Name</th>
                  <th style={{ padding: "16px", fontWeight: 600, width: "30%" }}>Address</th>
                  <th style={{ padding: "16px", fontWeight: 600, width: "12%" }}>Phone Found</th>
                  <th style={{ padding: "16px", fontWeight: 600, width: "8%", textAlign: "center" }}>Confidence</th>
                  <th style={{ padding: "16px", fontWeight: 600, width: "12%" }}>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: r.status === 'processing' ? 'rgba(37, 99, 235, 0.05)' : 'transparent', transition: "background 0.2s" }}>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top" }}>
                      {r.status === 'pending' && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--border)", display: "inline-block", marginTop: "6px" }} title="Pending" />}
                      {r.status === 'processing' && <RefreshCw size={18} className="spin" style={{ color: "var(--accent)" }} />}
                      {r.status === 'success' && <CheckCircle2 size={18} style={{ color: "#10b981" }} />}
                      {r.status === 'error' && <span title={r.error}><AlertCircle size={18} style={{ color: "#ef4444" }} /></span>}
                    </td>
                    <td style={{ padding: "16px", fontSize: "0.95em", fontFamily: "monospace", color: "var(--accent)", verticalAlign: "top", wordBreak: "break-all" }}>{r.folio}</td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 500, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {r.name}
                      </div>
                    </td>
                    <td style={{ padding: "16px", verticalAlign: "top" }}>
                      <div style={{ fontSize: "0.95em", opacity: 0.8, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {r.address}
                      </div>
                    </td>
                    <td style={{ padding: "16px", fontWeight: 600, verticalAlign: "top" }}>
                      {r.candidates && r.candidates.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {r.candidates.map((c, idx) => {
                            const ownerTag = getOwnerTag(c, r.name);
                            return (
                              <div key={idx} style={{ color: c.phone !== 'Not Found' ? '#10b981' : 'inherit' }}>
                                 {c.phone} 
                                 {ownerTag && c.phone !== 'Not Found' && (
                                   <span style={{ fontSize: '0.8em', color: 'var(--text-muted)', display: 'block', fontWeight: 400 }}>
                                     ({ownerTag})
                                   </span>
                                 )}
                              </div>
                            );
                          })}
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: "16px", textAlign: "center", verticalAlign: "top" }}>
                      {r.candidates && r.candidates.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {r.candidates.map((c, idx) => {
                            const ownerTag = getOwnerTag(c, r.name);
                            const hasOwner = Boolean(ownerTag && c.phone !== 'Not Found');
                            return (
                              <div key={idx} style={{ height: hasOwner ? '38px' : '20px' }}>
                                <span style={{ 
                                  padding: "2px 6px", 
                                  borderRadius: "4px", 
                                  fontSize: "0.85em", 
                                  fontWeight: 600,
                                  background: c.confidence >= 50 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                                  color: c.confidence >= 50 ? "#10b981" : "#ef4444"
                                }}>
                                  {c.confidence}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: "16px", fontSize: "0.85em", color: "var(--accent)", verticalAlign: "top" }}>
                      {r.candidates && r.candidates.length > 0 ? (
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                           {r.candidates.map((c, idx) => {
                             const ownerTag = getOwnerTag(c, r.name);
                             const hasOwner = Boolean(ownerTag && c.phone !== 'Not Found');
                             const cleanLabel = getCleanSourceLabel(c.sourceUrl);
                             return (
                               <div key={idx} style={{ height: hasOwner ? '38px' : '20px' }}>
                                 {c.sourceUrl ? (
                                   <a href={c.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "underline", fontWeight: 500 }}>
                                     {cleanLabel}
                                   </a>
                                 ) : '-'}
                               </div>
                             );
                           })}
                         </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
