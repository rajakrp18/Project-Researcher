const puppeteer = require('puppeteer');
const path = require('path');

const outputPath = path.join(__dirname, '..', '..', 'Contact_Finder_Comprehensive_Documentation.pdf');

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Contact Finder — Enterprise OSINT Engine Technical Documentation</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 20mm 15mm;
    }
    
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    body {
      color: #0f172a;
      line-height: 1.5;
      font-size: 12px;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    
    .header {
      border-bottom: 2px solid #6366f1;
      padding-bottom: 15px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .header h1 {
      color: #0f172a;
      font-size: 20px;
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
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-purple { background: #f3e8ff; color: #6b21a8; }
    .badge-blue { background: #e0e7ff; color: #3730a3; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      border-left: 4px solid #6366f1;
      padding-left: 10px;
      margin: 20px 0 12px 0;
    }
    
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }

    .card-stat {
      text-align: center;
      padding: 10px 6px;
    }

    .card-stat .value {
      font-size: 18px;
      font-weight: 800;
      color: #4f46e5;
      margin-top: 2px;
    }

    .card-stat .label {
      font-size: 10px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
    }

    code {
      font-family: "Consolas", "Monaco", monospace;
      font-size: 11px;
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
      margin-top: 8px;
      margin-bottom: 15px;
      font-size: 11px;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 6px 10px;
      text-align: left;
    }
    
    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
    }
    
    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .formula-box {
      background: #0f172a;
      color: #f8fafc;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: "Consolas", monospace;
      font-size: 11px;
      margin: 12px 0;
      line-height: 1.6;
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
      <h1>Contact Finder 🕵️‍♂️🇮🇳</h1>
      <div class="subtitle">Enterprise OSINT Multi-Agent AI Engine — Comprehensive Technical Documentation</div>
    </div>
    <div class="meta">
      <div><strong>Version:</strong> 2.0 (Gemini 3.6 Flash)</div>
      <div><strong>Workspace:</strong> <code>apps/contact-finder</code></div>
      <div><strong>Date:</strong> Sept 14, 2026</div>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="card" style="background: #eef2ff; border-color: #c7d2fe;">
    <h3 style="margin: 0 0 4px 0; color: #3730a3; font-size: 13px;">📌 Project Purpose & Overview</h3>
    <p style="margin: 0; color: #312e81; font-size: 11.5px;">
      <strong>Contact Finder</strong> is an enterprise-grade multi-agent Open Source Intelligence (OSINT) system designed to track down, attribute, and verify Indian mobile numbers based on names, residential/business addresses, companies, and cities. It is tailored for high-stakes financial recovery (IEPF dividend claims), corporate directory lookups, legal skip tracing, and B2B contact enrichment.
    </p>
  </div>

  <!-- SECTION 1: MULTI-AGENT ARCHITECTURE -->
  <div class="section-title">1. Multi-Agent Intelligence Core</div>
  
  <div class="grid-2">
    <div class="card">
      <h4 style="margin: 0 0 6px 0; color: #4f46e5;"><code>CoordinatorAgent.ts</code></h4>
      <p style="margin: 0; font-size: 11px;">
        Master orchestrator. Manages search budgets, batch query execution, corporate entity detection, early exit triggers when confidence $\ge 75\%$, and fallback social proxy searches.
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 6px 0; color: #4f46e5;"><code>ResearcherAgent.ts</code></h4>
      <p style="margin: 0; font-size: 11px;">
        Query expansion & fetching. Generates targeted Google Dorks (combining house numbers, area, city, pincodes) and executes parallel calls across search/B2B APIs.
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 6px 0; color: #4f46e5;"><code>ExtractorAgent.ts</code></h4>
      <p style="margin: 0; font-size: 11px;">
        Content parsing engine. Runs 3-pass extraction: Pass-1 Regex, Pass-2 Local Vector Embeddings (<code>Transformers.js</code>), and Pass-3 LLM context parsing (<code>Gemini 3.6 Flash</code>).
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 6px 0; color: #4f46e5;"><code>VerifierAgent.ts</code></h4>
      <p style="margin: 0; font-size: 11px;">
        Identity resolution & memory. Evaluates name matching, fuzzy address distance (<code>Fuse.js</code>), domain trust, and maintains the persistent SQLite database cache.
      </p>
    </div>
  </div>

  <!-- SECTION 2: AI & ML ENGINE -->
  <div class="section-title">2. Cutting-Edge Technical Capabilities</div>

  <div class="card">
    <h4 style="margin: 0 0 6px 0; color: #0f172a;">⚡ Upgraded LLM Core — Gemini 3.6 Flash</h4>
    <p style="margin: 0 0 6px 0;">
      Powered by Google's <code>gemini-3.6-flash</code> via <code>@google/genai</code> (with OpenRouter Llama 3 fallback). Performs structured JSON context parsing, entity equivalence checking, and relationship resolution without fragile regex rules.
    </p>
  </div>

  <div class="card">
    <h4 style="margin: 0 0 6px 0; color: #0f172a;">🧠 Semantic Vector Embeddings (Transformers.js)</h4>
    <p style="margin: 0;">
      Loads an ONNX-quantized model (<code>Xenova/all-MiniLM-L6-v2</code>) locally in Node.js. Embeds document paragraphs into mathematical vector space to isolate target contact blocks in 30,000+ line HTML files instantly offline.
    </p>
  </div>

  <div class="card">
    <h4 style="margin: 0 0 6px 0; color: #0f172a;">🕵️ Stealth Puppeteer & Vision Fallback</h4>
    <p style="margin: 0;">
      Uses <code>puppeteer-extra-plugin-stealth</code> to spoof WebGL signatures and bypass Cloudflare/Akamai bot protection. If a website obfuscates phone numbers as canvas graphics, it captures a Base64 JPEG screenshot and feeds it to <strong>Gemini 3.6 Flash Vision OCR</strong>.
    </p>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 3: CONFIDENCE SCORING & ATTRIBUTION -->
  <div class="section-title">3. Comprehensive Confidence Scoring & Attribution Formula</div>

  <div class="formula-box">
    <strong>Total Score (0 - 100%) =</strong><br>
    S_NameMatch + S_Attribution + S_AddressMatch + S_LocalitySnippet + S_MultiSourceBonus + S_DomainTrust
  </div>

  <h4 style="color: #334155; margin-bottom: 6px;">Attribution Types & Decision Matrix</h4>
  <table>
    <thead>
      <tr>
        <th>Attribution Type</th>
        <th>Points</th>
        <th>Description & Context Match</th>
        <th>Tag</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong><code>DIRECT_PERSON</code></strong></td>
        <td><span class="badge badge-green">+20</span></td>
        <td>Direct line belonging to the subject or their father.</td>
        <td><code>self</code> / <code>father</code></td>
      </tr>
      <tr>
        <td><strong><code>PROXY_PERSON</code></strong></td>
        <td><span class="badge badge-blue">+10</span></td>
        <td>Verified colleague, co-director, or associate at same company.</td>
        <td><code>proxy</code> / <code>coworker</code></td>
      </tr>
      <tr>
        <td><strong><code>RWA</code></strong></td>
        <td><span class="badge badge-amber">+5</span></td>
        <td>Resident Welfare Association official or Society Secretary.</td>
        <td><code>rwa_official</code></td>
      </tr>
      <tr>
        <td><strong><code>BROKER</code></strong></td>
        <td><span class="badge badge-amber">+5</span></td>
        <td>Real estate agent or property dealer handling the premises.</td>
        <td><code>broker</code></td>
      </tr>
      <tr>
        <td><strong><code>ORGANIZATION</code></strong></td>
        <td><span class="badge badge-purple">+3</span></td>
        <td>Corporate office landline or reception desk.</td>
        <td><code>organization</code></td>
      </tr>
      <tr>
        <td><strong><code>GENERIC</code></strong></td>
        <td>0</td>
        <td>Header lines ("Contact Us") without specific entity names.</td>
        <td><code>generic</code></td>
      </tr>
      <tr>
        <td><strong><code>AMBIGUOUS</code></strong></td>
        <td>-5</td>
        <td>Multiple conflicting names listed nearby.</td>
        <td><code>ambiguous</code></td>
      </tr>
      <tr>
        <td><strong><code>UNKNOWN</code></strong></td>
        <td>-10</td>
        <td>Orphaned phone digits extracted without context.</td>
        <td><code>unknown</code></td>
      </tr>
    </tbody>
  </table>

  <h4 style="color: #334155; margin-bottom: 6px;">Scoring Breakdown Components</h4>
  <ul>
    <li><strong>Name Match (0 to +30 pts):</strong> Exact Match (+30), Variant/Middle Name (+20), Surname Only (+10), Partial (+5).</li>
    <li><strong>Address Match (0 to +40 pts):</strong> Exact House/Flat Number Match (+40), Area/Colony Match (+20), City Match (+5), Snippet Locality (+10).</li>
    <li><strong>Multi-Source Verification (+15 pts per domain):</strong> $15 \times (N - 1)$ bonus points for $N$ independent web domains discovering the same number.</li>
    <li><strong>Domain Trust (+5 to +10 pts):</strong> Government portals (<code>.gov.in</code>, <code>mca.gov.in</code>) (+10), Established B2B directories (<code>ZaubaCorp</code>, <code>IndiaMart</code>, <code>TradeIndia</code>) (+5).</li>
  </ul>

  <!-- SECTION 4: DATA PROVIDERS & INTEGRATIONS -->
  <div class="section-title">4. Integrated OSINT Data Providers</div>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th>Providers Integrated</th>
        <th>Primary Source File</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Search Engines</strong></td>
        <td>SerpAPI (Google), Perplexity AI (Sonar Pro), TinyFish</td>
        <td><code>SerpAPIProvider.ts</code>, <code>PerplexityProvider.ts</code></td>
      </tr>
      <tr>
        <td><strong>Corporate Registries</strong></td>
        <td>ZaubaCorp, QuickCompany, TheCompanyCheck, Explorium, Apify Zauba</td>
        <td><code>ZaubaCorpScraper.ts</code>, <code>ExploriumProvider.ts</code></td>
      </tr>
      <tr>
        <td><strong>B2B & Local Directories</strong></td>
        <td>IndiaMart, TradeIndia, JustDial</td>
        <td><code>IndiaMartProvider.ts</code>, <code>JustDialProvider.ts</code></td>
      </tr>
      <tr>
        <td><strong>LLM & Vision</strong></td>
        <td>Google Gemini 3.6 Flash, OpenRouter (Llama 3)</td>
        <td><code>GeminiService.ts</code>, <code>OpenRouterService.ts</code></td>
      </tr>
      <tr>
        <td><strong>Caller ID Services</strong></td>
        <td>Truecaller Lookup Proxy & Internal Knowledge Database</td>
        <td><code>CallerIdService.ts</code>, <code>DatabaseService.ts</code></td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 5: APPLICATION FEATURES -->
  <div class="section-title">5. Core Features & UI Applications</div>

  <div class="grid-2">
    <div class="card">
      <h4 style="margin: 0 0 4px 0;">1. Single Investigation UI (<code>/</code>)</h4>
      <p style="margin: 0; font-size: 11px;">
        Interactive search dashboard. Streams live OSINT progress, displays confidence badges, relationship tags, and complete evidence chains.
      </p>
    </div>
    <div class="card">
      <h4 style="margin: 0 0 4px 0;">2. Bulk CSV Engine (<code>/bulk</code>)</h4>
      <p style="margin: 0; font-size: 11px;">
        Processes datasets with hundreds of shareholder folios concurrently. Features styled Excel exports (<code>exportExcel.ts</code>) with hyperlinked sources.
      </p>
    </div>
  </div>

  <div class="card">
    <h4 style="margin: 0 0 4px 0;">3. PDF Parser & Converter (<code>/pdf-converter</code>)</h4>
    <p style="margin: 0; font-size: 11px;">
      Parses legal records, dividend filings, and scanned PDFs using <code>pdf-parse</code>, <code>pdf2json</code>, and <code>tesseract.js</code> OCR directly into investigation pipelines.
    </p>
  </div>

</body>
</html>
`;

async function generateDocPDF() {
  console.log('Launching browser for documentation PDF generation...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  console.log(`Generating PDF at: ${outputPath}...`);
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '15mm',
      right: '15mm'
    }
  });

  await browser.close();
  console.log('PDF generation complete!');
}

generateDocPDF().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
