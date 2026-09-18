const puppeteer = require('puppeteer');
const path = require('path');

const outputPath = path.join(__dirname, '..', '..', 'Project_Status_Summary.pdf');

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Project Status & Architecture Summary</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 18mm 15mm;
    }
    
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    body {
      color: #0f172a;
      line-height: 1.5;
      font-size: 11.5px;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    
    .header {
      border-bottom: 3px solid #6366f1;
      padding-bottom: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .header h1 {
      color: #0f172a;
      font-size: 22px;
      margin: 0 0 4px 0;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    
    .header .subtitle {
      color: #4f46e5;
      font-size: 12px;
      font-weight: 600;
    }
    
    .header .meta {
      text-align: right;
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 10px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-blue { background: #e0e7ff; color: #3730a3; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    
    .section-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      border-left: 4px solid #6366f1;
      padding-left: 10px;
      margin: 18px 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
    }

    code {
      font-family: "Consolas", "Monaco", monospace;
      font-size: 10.5px;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      color: #4338ca;
    }
    
    ul {
      margin: 0;
      padding-left: 18px;
    }
    
    li {
      margin-bottom: 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 8px;
      text-align: left;
    }
    
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
    }
    
    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .formula-box {
      background: #0f172a;
      color: #38bdf8;
      border-radius: 8px;
      padding: 10px 14px;
      font-family: "Consolas", monospace;
      font-size: 10.5px;
      margin: 10px 0;
      line-height: 1.5;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div>
      <h1>Contact Finder & OSINT Engine 🕵️‍♂️🇮🇳</h1>
      <div class="subtitle">Comprehensive Project Status & Architecture Report</div>
    </div>
    <div class="meta">
      <div><strong>Repository:</strong> <code>rajakrp18/Project-Researcher</code></div>
      <div><strong>Primary Model:</strong> Gemini 3.6 Flash</div>
      <div><strong>Generated:</strong> September 17, 2026</div>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="card" style="background: #eef2ff; border-color: #c7d2fe;">
    <h3 style="margin: 0 0 4px 0; color: #3730a3; font-size: 13px;">📌 Executive Overview</h3>
    <p style="margin: 0; color: #312e81;">
      This monorepo repository (<code>c:\project_researcher</code>) houses an enterprise-grade Multi-Agent Open Source Intelligence (OSINT) AI engine designed to locate, attribute, and verify Indian mobile numbers based on names, residential/business addresses, companies, and cities. Primary use cases include <strong>IEPF dividend recovery, corporate directory lookups, legal skip tracing, and B2B contact enrichment</strong>.
    </p>
  </div>

  <!-- SECTION 1: MONOREPO STRUCTURE -->
  <div class="section-title">1. Monorepo Workspace Structure</div>
  <table>
    <thead>
      <tr>
        <th>Workspace Directory</th>
        <th>App Name</th>
        <th>Purpose & Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>apps/contact-finder</code></td>
        <td><strong>Contact Finder</strong></td>
        <td>Multi-agent OSINT engine, Puppeteer stealth scrapers, vector embeddings, confidence scoring & Next.js dashboard.</td>
      </tr>
      <tr>
        <td><code>apps/project-researcher</code></td>
        <td><strong>Project Researcher</strong></td>
        <td>Secondary research workspace, PDF parsing tools, and report synthesis AI agent.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 2: MULTI-AGENT INTELLIGENCE CORE -->
  <div class="section-title">2. Multi-Agent Reasoning Architecture</div>
  <div class="grid-2">
    <div class="card">
      <h4 style="margin: 0 0 4px 0; color: #4f46e5;">CoordinatorAgent</h4>
      <p style="margin: 0;">
        Master controller. Manages search budgets, batch query lifecycles, corporate entity detection, early exit triggers (&ge; 75% confidence), and social proxy searches.
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 4px 0; color: #4f46e5;">ResearcherAgent</h4>
      <p style="margin: 0;">
        Query generator & fetcher. Builds Google Dorks (combining address, city, pincodes) and coordinates parallel API calls across providers.
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 4px 0; color: #4f46e5;">ExtractorAgent</h4>
      <p style="margin: 0;">
        3-pass parsing engine: <strong>Pass 1:</strong> Regex matching ('+91'/'0'), <strong>Pass 2:</strong> Semantic vector embeddings, <strong>Pass 3:</strong> LLM context extraction.
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 4px 0; color: #4f46e5;">VerifierAgent</h4>
      <p style="margin: 0;">
        Identity resolution. Calculates fuzzy string distance (<code>Fuse.js</code>), evaluates domain trust, and maintains persistent SQLite database storage.
      </p>
    </div>
  </div>

  <!-- SECTION 3: KEY TECHNICAL CAPABILITIES -->
  <div class="section-title">3. Key Technical Capabilities & Technologies</div>
  <div class="card">
    <h4 style="margin: 0 0 3px 0; color: #0f172a;">⚡ Upgraded LLM & Vision OCR Core — Gemini 3.6 Flash</h4>
    <p style="margin: 0;">
      Powered by Google's <code>gemini-3.6-flash</code> via <code>@google/genai</code> (with OpenRouter fallback). If target pages display obfuscated phone numbers as images or HTML canvas elements, <strong>Gemini Vision OCR</strong> captures Base64 screenshots and visually extracts the digits.
    </p>
  </div>

  <div class="card">
    <h4 style="margin: 0 0 3px 0; color: #0f172a;">🧠 Offline Semantic Vector Embeddings (Transformers.js)</h4>
    <p style="margin: 0;">
      Loads an ONNX-quantized model (<code>Xenova/all-MiniLM-L6-v2</code>) locally. Converts webpage paragraphs into vector embeddings and executes Cosine Similarity search completely offline to isolate contact blocks in 30,000+ line documents.
    </p>
  </div>

  <div class="card">
    <h4 style="margin: 0 0 3px 0; color: #0f172a;">🕵️ Stealth Scraper & Persistent Knowledge Graph</h4>
    <p style="margin: 0;">
      Uses <code>puppeteer-extra-plugin-stealth</code> to spoof WebGL fingerprints and bypass Cloudflare/Akamai bot protection. Verifications are saved in a local SQLite (<code>better-sqlite3</code>) graph for instant pre-flight cache hits.
    </p>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 4: CONFIDENCE SCORING & ATTRIBUTION -->
  <div class="section-title">4. Comprehensive Confidence Scoring & Attribution</div>

  <div class="formula-box">
    <strong>Total Score (0 – 100%) =</strong> min(100, max(0, S_NameMatch + S_Attribution + S_AddressMatch + S_LocalitySnippet + S_MultiSourceBonus + S_DomainTrust))
  </div>

  <h4 style="color: #334155; margin-bottom: 4px; font-size: 11px;">Attribution Classification Matrix</h4>
  <table>
    <thead>
      <tr>
        <th>Attribution Category</th>
        <th>Score Impact</th>
        <th>Description & Attribution Context</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>DIRECT_PERSON</strong></td>
        <td><span class="badge badge-green">+20 pts</span></td>
        <td>Direct line belonging strictly to the subject or their father (<code>self</code>/<code>father</code>).</td>
      </tr>
      <tr>
        <td><strong>PROXY_PERSON</strong></td>
        <td><span class="badge badge-blue">+10 pts</span></td>
        <td>Belongs to a colleague, co-director, or associate (<code>proxy</code>/<code>coworker</code>).</td>
      </tr>
      <tr>
        <td><strong>RWA</strong></td>
        <td><span class="badge badge-amber">+5 pts</span></td>
        <td>Resident Welfare Assoc or Society Secretary (<code>rwa_official</code>).</td>
      </tr>
      <tr>
        <td><strong>BROKER</strong></td>
        <td><span class="badge badge-amber">+5 pts</span></td>
        <td>Real estate dealer or property agent handling premises (<code>broker</code>).</td>
      </tr>
      <tr>
        <td><strong>ORGANIZATION</strong></td>
        <td><span class="badge badge-purple">+3 pts</span></td>
        <td>Corporate reception desk or general company landline.</td>
      </tr>
      <tr>
        <td><strong>GENERIC</strong></td>
        <td>0 pts</td>
        <td>Standard header lines without specific entity names.</td>
      </tr>
      <tr>
        <td><strong>AMBIGUOUS</strong></td>
        <td><span class="badge badge-red">-5 pts</span></td>
        <td>Multiple conflicting third-party names listed nearby.</td>
      </tr>
      <tr>
        <td><strong>UNKNOWN</strong></td>
        <td><span class="badge badge-red">-10 pts</span></td>
        <td>Orphaned phone digits extracted without contextual text.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5: DATA PROVIDER ECOSYSTEM -->
  <div class="section-title">5. Data Provider Ecosystem</div>
  <table>
    <thead>
      <tr>
        <th>Provider / Service</th>
        <th>Status & Integration Details</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>SerpAPI (Google)</strong></td>
        <td><span class="badge badge-green">Active</span> Key configured in <code>.env.local</code>. Primary web search provider.</td>
      </tr>
      <tr>
        <td><strong>Gemini 3.6 Flash</strong></td>
        <td><span class="badge badge-green">Active</span> Key configured. Drives LLM context parsing and Vision OCR.</td>
      </tr>
      <tr>
        <td><strong>Perplexity AI (Sonar Pro)</strong></td>
        <td><span class="badge badge-blue">Ready / Standby</span> Integrated into <code>ProviderRegistry.ts</code> (Priority 15). Pending API key activation.</td>
      </tr>
      <tr>
        <td><strong>TinyFish & Explorium</strong></td>
        <td><span class="badge badge-green">Active</span> Active keys configured for stealth deep web scraping and B2B lookup.</td>
      </tr>
      <tr>
        <td><strong>Directories (ZaubaCorp, IndiaMart, TradeIndia)</strong></td>
        <td><span class="badge badge-green">Active</span> Automated scraping modules via stealth Puppeteer.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 6: WEB UI & WORKFLOWS -->
  <div class="section-title">6. Dashboard Interfaces & Scripts</div>
  <div class="grid-2">
    <div class="card">
      <h4 style="margin: 0 0 3px 0;">Interactive Dashboard (<code>/</code>)</h4>
      <p style="margin: 0;">Target search form with live progress, stop signal, confidence gauge, and interactive evidence trace.</p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 3px 0;">Bulk CSV Processing (<code>/bulk</code>)</h4>
      <p style="margin: 0;">Processes large datasets concurrently with styled Excel exports (<code>exceljs</code>).</p>
    </div>
  </div>

  <div class="card" style="background: #f1f5f9; margin-top: 10px;">
    <h4 style="margin: 0 0 3px 0; color: #1e293b;">⚡ Execution Commands</h4>
    <code>npm run dev:contact-finder</code> — Starts Contact Finder dashboard on port 3001.<br>
    <code>npm run dev:researcher</code> — Starts Project Researcher workspace.
  </div>

</body>
</html>
`;

async function generateSummaryPDF() {
  console.log('Launching Puppeteer for summary PDF generation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  console.log(`Saving summary PDF to: ${outputPath}`);
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '12mm',
      bottom: '12mm',
      left: '12mm',
      right: '12mm'
    }
  });

  await browser.close();
  console.log('PDF generated successfully!');
}

generateSummaryPDF().catch(err => {
  console.error('Error generating summary PDF:', err);
  process.exit(1);
});
