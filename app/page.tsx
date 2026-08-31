"use client";

import { useState, useRef } from "react";
import { Search, FileText, Activity, FolderTree, ExternalLink, Code2, Download, MessageSquare, Terminal, Copy, Check, BarChart } from "lucide-react";
import ReactMarkdown from "react-markdown";

type ProjectData = {
  projectName: string;
  details: string;
  source?: {
    platform: string;
    name: string;
    url: string;
  } | null;
  links: { type?: string; title: string; url: string }[];
  prd: string;
  trd: string;
  flow: string;
  fileStructure: string;
  analysis: string;
  devPrompt: string;
};

const GithubIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const LinkedinIcon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<"prd" | "trd" | "flow" | "fileStructure" | "analysis" | "devPrompt">("prd");
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to fetch project data");
      }

      setData(result);
      setActiveTab("prd");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async () => {
    if (!pdfRef.current || !data) return;
    try {
      setIsDownloading(true);
      const html2pdf = (await import("html2pdf.js")).default;
      const opt = {
        margin: [15, 15, 15, 15],
        filename: `${data.projectName.replace(/\s+/g, "_")}_Documentation.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      
      await html2pdf().set(opt).from(pdfRef.current).save();
    } catch (err) {
      console.error("Failed to generate PDF", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!data?.devPrompt) return;
    try {
      await navigator.clipboard.writeText(data.devPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  const renderActiveDocument = () => {
    if (!data) return null;
    const content = data[activeTab];
    return (
      <div className="markdown-body">
        {activeTab === "devPrompt" && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={handleCopyPrompt}
              style={{
                padding: "8px 16px",
                background: "var(--primary)",
                border: "none",
                color: "white",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                fontWeight: 500,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
              {isCopied ? "Copied to Clipboard!" : "Copy Full AI Prompt"}
            </button>
          </div>
        )}
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  };

  const getIconForLink = (type?: string, color = "var(--primary)") => {
    if (type === 'github') return <GithubIcon size={18} color={color} />;
    if (type === 'linkedin') return <LinkedinIcon size={18} color={color} />;
    if (type === 'reddit') return <MessageSquare size={18} style={{ color: "#ff4500" }} />;
    return <ExternalLink size={18} style={{ color: color }} />;
  };

  return (
    <main className="container">
      <header className="header" style={{ position: "relative" }}>
        {/* PDF Download Button in Header */}
        {data && (
          <button 
            onClick={downloadPdf} 
            disabled={isDownloading}
            style={{ position: "absolute", top: 0, right: 0, padding: "0.5rem 1rem", borderRadius: "8px", background: "var(--primary)", color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontFamily: "inherit" }}
          >
            <Download size={18} />
            {isDownloading ? "Generating PDF..." : "Download Documentation (PDF)"}
          </button>
        )}
        <h1>Project Researcher</h1>
        <p>Discover project ideas, generate architectures, and find similar codebases instantly.</p>
      </header>

      <form className="search-container" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="e.g. Real-time collaborative code editor"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
          <Search size={20} />
          {loading ? "Searching..." : "Research"}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}

      {loading && (
        <div className="loading">
          <Code2 size={48} className="mx-auto mb-4" />
          <p>Analyzing project space and generating architecture...</p>
        </div>
      )}

      {data && !loading && (
        <>
          <div className="results-grid">
            {/* Left Panel: Documents */}
            <div className="doc-panel glass">
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === "prd" ? "active" : ""}`}
                  onClick={() => setActiveTab("prd")}
                >
                  <FileText size={16} className="inline mr-2" />
                  PRD
                </button>
                <button
                  className={`tab-btn ${activeTab === "trd" ? "active" : ""}`}
                  onClick={() => setActiveTab("trd")}
                >
                  <Code2 size={16} className="inline mr-2" />
                  TRD
                </button>
                <button
                  className={`tab-btn ${activeTab === "flow" ? "active" : ""}`}
                  onClick={() => setActiveTab("flow")}
                >
                  <Activity size={16} className="inline mr-2" />
                  Flow
                </button>
                <button
                  className={`tab-btn ${activeTab === "fileStructure" ? "active" : ""}`}
                  onClick={() => setActiveTab("fileStructure")}
                >
                  <FolderTree size={16} className="inline mr-2" />
                  File Structure
                </button>
                <button
                  className={`tab-btn ${activeTab === "analysis" ? "active" : ""}`}
                  onClick={() => setActiveTab("analysis")}
                >
                  <BarChart size={16} className="inline mr-2" />
                  Analysis
                </button>
                <button
                  className={`tab-btn ${activeTab === "devPrompt" ? "active" : ""}`}
                  onClick={() => setActiveTab("devPrompt")}
                >
                  <Terminal size={16} className="inline mr-2" />
                  AI Prompt
                </button>
              </div>
              
              <div className="doc-content">
                {renderActiveDocument()}
              </div>
            </div>

            {/* Right Panel: Project Details */}
            <div className="details-panel glass" style={{ position: 'relative' }}>
              {data.source ? (
                <a href={data.source.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--surface-hover)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', color: 'var(--text-main)', textDecoration: 'none', border: '1px solid var(--border)' }}>
                  {getIconForLink(data.source.platform, "var(--text-main)")}
                  <span style={{ fontWeight: 500 }}>{data.source.name}</span>
                </a>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', marginBottom: '16px', color: 'var(--text-muted)' }}>
                  <span>✨</span> AI Generated Concept
                </div>
              )}
              
              <h2 className="project-title" style={{ color: "var(--text-main)" }}>{data.projectName}</h2>
              <p className="project-desc">{data.details}</p>
              
              <div className="links-section">
                <h3 style={{ marginBottom: "1rem", color: "var(--text-main)" }}>Similar Real-World Projects</h3>
                {data.links.length === 0 && <p style={{color: 'var(--text-muted)'}}>No exact matches found.</p>}
                {data.links.map((link, idx) => (
                  <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="link-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="link-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {getIconForLink(link.type, "var(--primary)")}
                      {link.title}
                    </span>
                    <ExternalLink size={16} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Hidden Container for PDF Export */}
          <div style={{ display: 'none' }}>
            <div ref={pdfRef} className="pdf-export-container" style={{ width: "800px", padding: "20px 40px", fontFamily: "sans-serif" }}>
              <div style={{ textAlign: "center", marginBottom: "40px" }}>
                <h1 style={{ fontSize: "32px", color: "black", marginBottom: "10px" }}>{data.projectName}</h1>
                <p style={{ fontSize: "16px", color: "#444" }}>{data.details}</p>
              </div>
              
              <h2 style={{ fontSize: "24px", color: "black", borderBottom: "2px solid #eaeaea", paddingBottom: "10px", marginTop: "30px", marginBottom: "20px" }}>
                Product Requirements Document (PRD)
              </h2>
              <div className="markdown-body pdf-export-container">
                <ReactMarkdown>{data.prd}</ReactMarkdown>
              </div>
              
              <div style={{ pageBreakBefore: 'always', height: "20px" }} />
              
              <h2 style={{ fontSize: "24px", color: "black", borderBottom: "2px solid #eaeaea", paddingBottom: "10px", marginTop: "30px", marginBottom: "20px" }}>
                Technical Requirements Document (TRD)
              </h2>
              <div className="markdown-body pdf-export-container">
                <ReactMarkdown>{data.trd}</ReactMarkdown>
              </div>

              <div style={{ pageBreakBefore: 'always', height: "20px" }} />
              
              <h2 style={{ fontSize: "24px", color: "black", borderBottom: "2px solid #eaeaea", paddingBottom: "10px", marginTop: "30px", marginBottom: "20px" }}>
                Architecture & Flow
              </h2>
              <div className="markdown-body pdf-export-container">
                <ReactMarkdown>{data.flow}</ReactMarkdown>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
