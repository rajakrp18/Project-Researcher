"use client";

import { useState } from "react";
import { Search, FileText, Activity, FolderTree, ExternalLink, Code2, Copy, Check, BarChart, ArrowRight } from "lucide-react";
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
        body: JSON.stringify({ query }),
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

      <form className="search-container" onSubmit={handleResearch}>
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

      {loading && (
        <div className="loading">
          <Code2 size={48} className="spin" />
          <p>Analyzing project space and generating architecture...</p>
        </div>
      )}

      {projectData && !loading && (
        <div className="results-grid">
          <div className="doc-panel glass">
            <div className="tabs">
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
