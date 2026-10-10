"use client";

import { useState, useEffect } from "react";
import { Search, FileText, Activity, FolderTree, ExternalLink, Code2, Copy, Check, BarChart, ArrowRight, Download, Key, Eye, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import ThemeToggle from "./components/ThemeToggle";

type ProjectData = {
  projectName: string;
  details: string;
  source?: { platform: string; name: string; url: string } | null;
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

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [activeTab, setActiveTab] = useState<"prd" | "trd" | "flow" | "fileStructure" | "analysis" | "devPrompt">("prd");
  const [isCopied, setIsCopied] = useState(false);
  const [customGeminiKey, setCustomGeminiKey] = useState("");
  const [customOpenrouterKey, setCustomOpenrouterKey] = useState("");
  const [customTinyfishKey, setCustomTinyfishKey] = useState("");
  const [customSerperKey, setCustomSerperKey] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [serverKeyStatus, setServerKeyStatus] = useState<Record<string, boolean>>({});
  const [serverMaskedKeys, setServerMaskedKeys] = useState<Record<string, string | null>>({});
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleVisibility = (key: string) => setVisibleKeys(prev => ({ ...prev, [key]: !prev[key] }));

  const openSettings = async () => {
    setShowSettings(true);
    try {
      const [statusRes, maskedRes] = await Promise.all([
        fetch('/api/config-status'),
        fetch('/api/config-keys-masked')
      ]);
      setServerKeyStatus(await statusRes.json());
      setServerMaskedKeys(await maskedRes.json());
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    // Load saved custom keys, but validate they match expected prefixes to avoid cross-contamination
    const savedGemini = localStorage.getItem("customGeminiKey") || "";
    const savedOpenrouter = localStorage.getItem("customOpenrouterKey") || "";
    const savedTinyfish = localStorage.getItem("customTinyfishKey") || "";
    const savedSerper = localStorage.getItem("customSerperKey") || "";

    // Auto-clear known wrong values (e.g. Serper key stored in Gemini slot)
    const isGemini = (k: string) => !k || k.startsWith("AQ.") || k.startsWith("AIza");
    const isOpenRouter = (k: string) => !k || k.startsWith("sk-or-");
    const isTinyfish = (k: string) => !k || k.startsWith("sk-tinyfish");
    const isSerper = (k: string) => !k || /^[a-f0-9]{32,}$/.test(k);

    setCustomGeminiKey(isGemini(savedGemini) ? savedGemini : "");
    setCustomOpenrouterKey(isOpenRouter(savedOpenrouter) ? savedOpenrouter : "");
    setCustomTinyfishKey(isTinyfish(savedTinyfish) ? savedTinyfish : "");
    setCustomSerperKey(isSerper(savedSerper) ? savedSerper : "");

    if (!isGemini(savedGemini)) localStorage.removeItem("customGeminiKey");
    if (!isOpenRouter(savedOpenrouter)) localStorage.removeItem("customOpenrouterKey");
    if (!isTinyfish(savedTinyfish)) localStorage.removeItem("customTinyfishKey");
    if (!isSerper(savedSerper)) localStorage.removeItem("customSerperKey");
  }, []);

  const clearAllOverrides = () => {
    ["customGeminiKey", "customOpenrouterKey", "customTinyfishKey", "customSerperKey"].forEach(k => localStorage.removeItem(k));
    setCustomGeminiKey("");
    setCustomOpenrouterKey("");
    setCustomTinyfishKey("");
    setCustomSerperKey("");
  };

  const handleKeyChange = (setter: React.Dispatch<React.SetStateAction<string>>, storageKey: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    localStorage.setItem(storageKey, e.target.value);
  };

  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setProjectData(null);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query, 
          customGeminiKey,
          customOpenrouterKey,
          customTinyfishKey,
          customSerperKey
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to fetch project data");
      setProjectData(result);
      setActiveTab("prd");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = async () => {
    if (!projectData?.devPrompt) return;
    await navigator.clipboard.writeText(projectData.devPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadAll = async () => {
    if (!projectData || isDownloading) return;
    setIsDownloading(true);

    try {
      const marked = (await import('marked')).marked;
      
      const sections = [
        { title: 'Product Requirements Document (PRD)', body: projectData.prd },
        { title: 'Technical Requirements Document (TRD)', body: projectData.trd },
        { title: 'Architecture & Flow', body: projectData.flow },
        { title: 'File Structure', body: projectData.fileStructure },
        { title: 'Analysis', body: projectData.analysis },
        { title: 'AI Dev Prompt', body: projectData.devPrompt },
      ];

      const escapeHtml = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

      // Build a full, standalone HTML document string
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(projectData.projectName)} - Architecture Report</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            @page {
              margin: 2cm;
              size: A4 portrait;
            }

            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              color: #1a1a2e;
              line-height: 1.6;
              font-size: 11pt;
              margin: 0;
              padding: 0;
            }

            .header {
              border-bottom: 3px solid #6366f1;
              padding-bottom: 24px;
              margin-bottom: 32px;
            }

            .header h1 {
              font-size: 26pt;
              font-weight: 700;
              color: #111827;
              margin: 0 0 8px 0;
            }

            .header p.details {
              color: #4b5563;
              font-size: 13pt;
              margin: 0 0 16px 0;
              line-height: 1.5;
            }

            .header .meta {
              font-size: 9pt;
              color: #6b7280;
              margin: 0;
            }

            .section {
              page-break-inside: avoid;
              margin-bottom: 40px;
            }

            .section-title {
              font-size: 16pt;
              font-weight: 700;
              color: #4f46e5;
              border-bottom: 2px solid #e0e7ff;
              padding-bottom: 8px;
              margin-top: 24px;
              margin-bottom: 16px;
              page-break-after: avoid;
            }

            /* Markdown Styles */
            h1, h2, h3, h4 {
              color: #1f2937;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
              page-break-after: avoid;
            }
            h1 { font-size: 16pt; }
            h2 { font-size: 14pt; }
            h3 { font-size: 12pt; }
            
            p {
              margin: 0 0 1em 0;
            }

            ul, ol {
              margin: 0 0 1em 0;
              padding-left: 1.5em;
            }

            li {
              margin-bottom: 0.25em;
            }

            strong {
              color: #111827;
              font-weight: 600;
            }

            code {
              font-family: 'Consolas', 'Monaco', monospace;
              background-color: #f3f4f6;
              padding: 0.2em 0.4em;
              border-radius: 3px;
              font-size: 0.9em;
              color: #ec4899;
            }

            pre {
              background-color: #f8f9fa;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 16px;
              overflow-x: hidden;
              white-space: pre-wrap;
              word-wrap: break-word;
              page-break-inside: avoid;
            }

            pre code {
              background-color: transparent;
              padding: 0;
              color: #374151;
              font-size: 9pt;
            }

            a {
              color: #6366f1;
              text-decoration: none;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 1em 0;
              page-break-inside: avoid;
            }

            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
            }
            
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escapeHtml(projectData.projectName)}</h1>
            <p class="details">${escapeHtml(projectData.details)}</p>
            ${projectData.source ? `<p class="meta"><strong>Source:</strong> <a href="${projectData.source.url}">${escapeHtml(projectData.source.name)}</a></p>` : ''}
            <p class="meta">Generated by Project Researcher &bull; ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}</p>
          </div>

          ${await Promise.all(sections.map(async (s) => `
            <div class="section">
              <div class="section-title">${s.title}</div>
              <div class="markdown-content">
                ${await marked.parse(s.body)}
              </div>
            </div>
          `)).then(res => res.join('\n'))}
        </body>
        </html>
      `;

      // Create a hidden iframe
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '-10000px';
      iframe.style.bottom = '-10000px';
      iframe.style.width = '1000px';
      iframe.style.height = '1000px';
      document.body.appendChild(iframe);

      // Write content to iframe and trigger print
      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
        
        // Wait for fonts/rendering to finish
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // Cleanup after print dialog closes
          setTimeout(() => {
            document.body.removeChild(iframe);
            setIsDownloading(false);
          }, 1000);
        }, 500);
      } else {
        throw new Error("Could not access print frame");
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
      setIsDownloading(false);
    }
  };


  const getIconForLink = (type?: string, color = "var(--accent)") => {
    if (type === 'github') return <GithubIcon size={18} color={color} />;
    return <ExternalLink size={18} style={{ color }} />;
  };

  return (
    <main className="container">
      <header className="header">
        <div className="theme-toggle-wrapper">
          <ThemeToggle />
        </div>
        <div className="logo-row">
          <div className="logo-icon">
            <Code2 size={28} />
          </div>
          <h1>Project Researcher</h1>
        </div>
        <p>Discover project ideas, generate architectures, and find similar codebases.</p>
      </header>

      {error && <div className="error-message">{error}</div>}

      <form className="search-container" onSubmit={handleResearch} style={{ marginBottom: showSettings ? "1rem" : "3rem", flexDirection: "column" }}>
        <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
          <input
            type="text"
            className="search-input"
            placeholder="e.g. Real-time collaborative code editor"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button type="button" onClick={openSettings} className="search-btn" style={{ padding: "0 1rem", background: "var(--surface-hover)", color: "var(--text-main)" }} title="API Settings">
            <Key size={20} />
          </button>
          <button type="submit" className="search-btn" disabled={loading || !query.trim()}>
            <Search size={20} />
            {loading ? "Searching..." : "Research"}
          </button>
        </div>
        {showSettings && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <div className="glass" style={{ width: "100%", maxWidth: "500px", padding: "2rem", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "1rem", background: "var(--surface)" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>API Settings</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6 }}>
                Add your own keys to override the server defaults — or leave blank to use server-configured keys.
              </p>

              <div style={{ padding: "10px 12px", borderRadius: "8px", background: "var(--surface-hover)", border: "1px solid var(--border)", fontSize: "13px", color: "var(--text-muted)" }}>
                <strong style={{ color: "var(--text-main)" }}>Server Key Status</strong> — these are already active even if you leave the fields below empty:
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {[{label: "Gemini", key: "gemini"}, {label: "OpenRouter", key: "openrouter"}, {label: "Tinyfish", key: "tinyfish"}, {label: "Serper", key: "serper"}].map(({label, key}) => (
                    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: 500, background: serverKeyStatus[key] ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)", color: serverKeyStatus[key] ? "#4ade80" : "#f87171", border: `1px solid ${serverKeyStatus[key] ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"}` }}>
                      {serverKeyStatus[key] ? "✓" : "✗"} {label}
                    </span>
                  ))}
                </div>
              </div>

              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "-4px" }}>Only fill below if you want to use your own keys instead of the server ones:</p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "8px", maxHeight: "400px", overflowY: "auto", paddingRight: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>Gemini API Key</label>
                    {!customGeminiKey && serverMaskedKeys.gemini && <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace" }}>Server: {serverMaskedKeys.gemini}</span>}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={visibleKeys["gemini"] ? "text" : "password"}
                      className="search-input"
                      style={{ padding: "0.8rem 2.5rem 0.8rem 1rem", fontSize: "14px", width: "100%" }}
                      placeholder={serverMaskedKeys.gemini ? `Server: ${serverMaskedKeys.gemini}` : "AQ.Ab8RN..."}
                      value={customGeminiKey}
                      onChange={handleKeyChange(setCustomGeminiKey, "customGeminiKey")}
                    />
                    <button type="button" onClick={() => toggleVisibility("gemini")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                      {visibleKeys["gemini"] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>OpenRouter API Key (Fallback)</label>
                    {!customOpenrouterKey && serverMaskedKeys.openrouter && <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace" }}>Server: {serverMaskedKeys.openrouter}</span>}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={visibleKeys["openrouter"] ? "text" : "password"}
                      className="search-input"
                      style={{ padding: "0.8rem 2.5rem 0.8rem 1rem", fontSize: "14px", width: "100%" }}
                      placeholder={serverMaskedKeys.openrouter ? `Server: ${serverMaskedKeys.openrouter}` : "sk-or-v1-..."}
                      value={customOpenrouterKey}
                      onChange={handleKeyChange(setCustomOpenrouterKey, "customOpenrouterKey")}
                    />
                    <button type="button" onClick={() => toggleVisibility("openrouter")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                      {visibleKeys["openrouter"] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>Tinyfish API Key</label>
                    {!customTinyfishKey && serverMaskedKeys.tinyfish && <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace" }}>Server: {serverMaskedKeys.tinyfish}</span>}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={visibleKeys["tinyfish"] ? "text" : "password"}
                      className="search-input"
                      style={{ padding: "0.8rem 2.5rem 0.8rem 1rem", fontSize: "14px", width: "100%" }}
                      placeholder={serverMaskedKeys.tinyfish ? `Server: ${serverMaskedKeys.tinyfish}` : "sk-tinyfish-..."}
                      value={customTinyfishKey}
                      onChange={handleKeyChange(setCustomTinyfishKey, "customTinyfishKey")}
                    />
                    <button type="button" onClick={() => toggleVisibility("tinyfish")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                      {visibleKeys["tinyfish"] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>Serper API Key</label>
                    {!customSerperKey && serverMaskedKeys.serper && <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace" }}>Server: {serverMaskedKeys.serper}</span>}
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={visibleKeys["serper"] ? "text" : "password"}
                      className="search-input"
                      style={{ padding: "0.8rem 2.5rem 0.8rem 1rem", fontSize: "14px", width: "100%" }}
                      placeholder={serverMaskedKeys.serper ? `Server: ${serverMaskedKeys.serper}` : "357165..."}
                      value={customSerperKey}
                      onChange={handleKeyChange(setCustomSerperKey, "customSerperKey")}
                    />
                    <button type="button" onClick={() => toggleVisibility("serper")} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                      {visibleKeys["serper"] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginTop: "1rem" }}>
                <button type="button" onClick={clearAllOverrides} style={{ padding: "10px 16px", background: "none", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                  Clear All Overrides
                </button>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" onClick={() => setShowSettings(false)} className="search-btn" style={{ background: "var(--surface-hover)", color: "var(--text-main)", padding: "10px 20px" }}>
                    Cancel
                  </button>
                  <button type="button" onClick={() => setShowSettings(false)} className="search-btn" style={{ padding: "10px 20px" }}>
                    <Check size={16} /> Save Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {loading && (
        <div className="loading">
          <Code2 size={48} className="spin" />
          <p>Analyzing project space and generating architecture...</p>
        </div>
      )}

      {projectData && !loading && (
        <div className="results-grid">
          <div className="doc-panel glass">
            <div className="tabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "4px", overflowX: "auto" }}>
                {(["prd", "trd", "flow", "fileStructure", "analysis", "devPrompt"] as const).map(tab => (
                  <button key={tab} className={`tab-btn ${activeTab === tab ? "active" : ""}`} onClick={() => setActiveTab(tab)}>
                    {tab === "prd" && <><FileText size={16} /> PRD</>}
                    {tab === "trd" && <><Code2 size={16} /> TRD</>}
                    {tab === "flow" && <><Activity size={16} /> Flow</>}
                    {tab === "fileStructure" && <><FolderTree size={16} /> Files</>}
                    {tab === "analysis" && <><BarChart size={16} /> Analysis</>}
                    {tab === "devPrompt" && <><Code2 size={16} /> AI Prompt</>}
                  </button>
                ))}
              </div>
              <button onClick={handleDownloadAll} disabled={isDownloading} className="search-btn" style={{ padding: "6px 12px", fontSize: "13px", borderRadius: "8px", background: "var(--surface-hover)", color: "var(--text-main)", border: "1px solid var(--border)", opacity: isDownloading ? 0.7 : 1 }}>
                <Download size={14} /> {isDownloading ? "Generating PDF..." : "Download PDF"}
              </button>
            </div>
            <div className="doc-content">
              <div className="markdown-body">
                {activeTab === "devPrompt" && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button onClick={handleCopyPrompt} className="search-btn" style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '14px' }}>
                      {isCopied ? <Check size={16} /> : <Copy size={16} />}
                      {isCopied ? "Copied!" : "Copy AI Prompt"}
                    </button>
                  </div>
                )}
                <ReactMarkdown>{projectData[activeTab]}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="details-panel glass">
            {projectData.source ? (
              <a href={projectData.source.url} target="_blank" rel="noreferrer" className="source-badge">
                {getIconForLink(projectData.source.platform, "var(--text-main)")}
                <span style={{ fontWeight: 500 }}>{projectData.source.name}</span>
              </a>
            ) : (
              <div className="source-badge" style={{ cursor: 'default' }}>
                <span>✨</span> AI Generated Concept
              </div>
            )}
            <h2 className="project-title">{projectData.projectName}</h2>
            <p className="project-desc">{projectData.details}</p>
            <div className="links-section">
              <h3 style={{ marginBottom: "1rem", color: "var(--text-main)" }}>Similar Projects</h3>
              {projectData.links.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No exact matches found.</p>}
              {projectData.links.map((link, idx) => (
                <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="link-card" title={link.title}>
                  <span className="link-title">
                    {getIconForLink(link.type)}
                    <span className="link-text">{link.title}</span>
                  </span>
                  <ArrowRight size={16} style={{ color: "var(--text-muted)", opacity: 0.5, flexShrink: 0 }} />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
