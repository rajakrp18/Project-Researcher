const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, 'Todays_Work_Summary_and_Results_Analysis.pdf');

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Today's Work Summary & Results Analysis</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 15mm 20mm 15mm;
      @bottom-right {
        content: counter(page) " of " counter(pages);
      }
    }
    
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    body {
      color: #1e293b;
      line-height: 1.5;
      font-size: 13px;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
    }
    
    .header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 25px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .header h1 {
      color: #0f172a;
      font-size: 22px;
      margin: 0 0 6px 0;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .header .subtitle {
      color: #64748b;
      font-size: 13px;
      font-weight: 500;
    }
    
    .header .meta {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-blue { background: #e0e7ff; color: #3730a3; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      border-left: 4px solid #4f46e5;
      padding-left: 10px;
      margin: 25px 0 15px 0;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    
    .card-stat {
      text-align: center;
      padding: 12px 8px;
    }
    
    .card-stat .value {
      font-size: 22px;
      font-weight: 700;
      color: #4f46e5;
      margin-top: 4px;
    }
    
    .card-stat .label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    ul {
      margin: 0;
      padding-left: 18px;
    }
    
    li {
      margin-bottom: 6px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
      font-size: 12px;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 12px;
      text-align: left;
    }
    
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 600;
    }
    
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    
    .recommendation-box {
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 14px;
      margin-top: 15px;
    }
    
    .recommendation-box h4 {
      margin: 0 0 8px 0;
      color: #166534;
      font-size: 14px;
    }

    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <h1>Contact Finder — Daily Summary & Analysis Report</h1>
      <div class="subtitle">Comprehensive Overview of Development Updates & Dataset Investigation</div>
    </div>
    <div class="meta">
      <div><strong>Date:</strong> Sept 9, 2026</div>
      <div><strong>Target File:</strong> <code>investigation_results (2).csv</code></div>
    </div>
  </div>

  <!-- EXECUTIVE SUMMARY -->
  <div class="card" style="background: #eef2ff; border-color: #c7d2fe; margin-bottom: 20px;">
    <h3 style="margin: 0 0 6px 0; color: #3730a3; font-size: 14px;">📌 Executive Summary</h3>
    <p style="margin: 0; color: #312e81;">
      Today's development focused on resolving critical performance bottlenecks, fixing bulk processing count bugs, implementing abort controls, and auditing search engine resource costs. An in-depth analysis of <strong>2,165 records</strong> in <code>investigation_results (2).csv</code> was conducted, revealing an <strong>87.5% contact hit rate</strong> on processed samples, alongside actionable paths to increase confidence scores and optimize search runtime from 7.5 minutes down to ~1-2 minutes.
    </p>
  </div>

  <!-- SECTION 1: TODAY'S DEVELOPMENT WORK -->
  <div class="section-title">1. Summary of Today's Development Work</div>
  
  <div class="card" style="margin-bottom: 15px;">
    <h4 style="margin: 0 0 8px 0; color: #0f172a;">🐛 Bug Fixes & Engine Stability</h4>
    <ul>
      <li><strong>Bulk Processing Match Counter Fix:</strong> Resolved logic issue where bulk processing completed successfully but falsely reported <code>Matches: 0</code>.</li>
      <li><strong>Abort Controller Integration:</strong> Added "Stop" capability to single and batch search flows using standard <code>AbortController</code> signals, allowing safe user cancellation without data loss.</li>
      <li><strong>Instant Cache Hits:</strong> Fixed a bug where cached records were still subjected to a 25-second rate-limiting throttle delay. Cache hits now resolve instantly in milliseconds.</li>
    </ul>
  </div>

  <div class="card" style="margin-bottom: 15px;">
    <h4 style="margin: 0 0 8px 0; color: #0f172a;">🎨 UI & Branding Enhancements</h4>
    <ul>
      <li><strong>Favicon Overhaul:</strong> Designed and implemented a vector-based, borderless transparent SVG favicon (<code>icon.svg</code>), replacing legacy bordered assets.</li>
    </ul>
  </div>

  <div class="card">
    <h4 style="margin: 0 0 8px 0; color: #0f172a;">⚡ Performance & API Cost Optimization</h4>
    <ul>
      <li><strong>Parallel Deep Search Engine:</strong> Parallelized the search, fetch, and extraction pipeline inside <code>CoordinatorAgent.ts</code> for multi-threaded processing.</li>
      <li><strong>ScrapingBee vs. Puppeteer Audit:</strong> Identified that ScrapingBee burned ~150–200 credits per person (exhausting 1,000 credits in ~5 searches) due to 15 queries/person and forced JS rendering (5x multiplier).</li>
      <li><strong>Zero-Cost Architecture:</strong> Safely rolled back the engine to local Puppeteer (<code>BrowserFetcher.ts</code>) operating 3 parallel headless tabs, maintaining high speed with <strong>$0 API overhead</strong>.</li>
    </ul>
  </div>

  <!-- SECTION 2: DATASET ANALYSIS -->
  <div class="section-title">2. Results Analysis: <code>investigation_results (2).csv</code></div>

  <div class="grid-4">
    <div class="card card-stat">
      <div class="label">Total Records</div>
      <div class="value">2,165</div>
    </div>
    <div class="card card-stat">
      <div class="label">Processed Sample</div>
      <div class="value">64</div>
    </div>
    <div class="card card-stat">
      <div class="label">Phone Hit Rate</div>
      <div class="value" style="color: #059669;">87.5%</div>
    </div>
    <div class="card card-stat">
      <div class="label">Avg Confidence</div>
      <div class="value" style="color: #d97706;">26.41%</div>
    </div>
  </div>

  <h4 style="color: #334155; margin-bottom: 8px;">Confidence Score Tier Breakdown</h4>
  <table>
    <thead>
      <tr>
        <th>Confidence Tier</th>
        <th>Count</th>
        <th>Percentage</th>
        <th>Characteristics & Source Types</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>High Confidence (>60%)</strong></td>
        <td>16 numbers</td>
        <td><span class="badge badge-green">11.0%</span></td>
        <td>Official shareholder lists, tax portals (e.g. ComTax), direct registry matches.</td>
      </tr>
      <tr>
        <td><strong>Medium Confidence (30%–60%)</strong></td>
        <td>28 numbers</td>
        <td><span class="badge badge-blue">19.2%</span></td>
        <td>Regional business directories matching subject name and city.</td>
      </tr>
      <tr>
        <td><strong>Low Confidence (<30%)</strong></td>
        <td>102 numbers</td>
        <td><span class="badge badge-amber">69.8%</span></td>
        <td>Multi-page PDF documents (Scribd), B2B directories, broad web scrapings.</td>
      </tr>
    </tbody>
  </table>

  <h4 style="color: #334155; margin-bottom: 8px;">Top Data Sources & Domain Attribution</h4>
  <table>
    <thead>
      <tr>
        <th>Domain</th>
        <th>Matches</th>
        <th>Primary Content Type</th>
        <th>Quality Rating</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>scribd.com</code></td>
        <td>53</td>
        <td>IEPF dividend filings, court lists, gazette documents</td>
        <td>High Recall / Variable Precision</td>
      </tr>
      <tr>
        <td><code>tradeindia.com</code> / <code>indiamart.com</code></td>
        <td>14</td>
        <td>B2B supplier listings</td>
        <td>Medium (Often returns vendor line)</td>
      </tr>
      <tr>
        <td><code>in.marketscreener.com</code></td>
        <td>10</td>
        <td>Corporate dividend default notices</td>
        <td>High Recall</td>
      </tr>
      <tr>
        <td><code>pdfcoffee.com</code></td>
        <td>6</td>
        <td>PDF document search portal</td>
        <td>Medium</td>
      </tr>
      <tr>
        <td><code>comtax.up.nic.in</code></td>
        <td>5</td>
        <td>State Commercial Tax registrations</td>
        <td>High Precision (80%+ score)</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 3: STRATEGIC RECOMMENDATIONS -->
  <div class="section-title">3. Strategic Recommendations for Discussion</div>

  <div class="recommendation-box">
    <h4>🚀 Actionable Enhancements</h4>
    <ul>
      <li><strong>1. Search Query Optimization:</strong> Reduce search expansion from 15 queries per subject down to 4–5 precision queries (combining Name + Pincode + Address). This will cut search duration from <strong>7.5 minutes down to ~1–2 minutes</strong>.</li>
      <li><strong>2. Domain Noise Filtering:</strong> Blacklist non-relevant search domains (e.g. Merriam-Webster, generic dictionary tools) to eliminate false positives.</li>
      <li><strong>3. Caller ID / Truecaller Post-Validation:</strong> Run extracted candidate phone numbers through a Caller ID / Reverse Phone lookup API to verify that the registered account owner's name matches the target subject.</li>
      <li><strong>4. Batch Input Deduplication:</strong> Add pre-run deduplication logic to skip duplicate input subjects (e.g. <code>SANJAY KUMAR</code> duplicated in CSV lines 13 & 14).</li>
    </ul>
  </div>

</body>
</html>
`;

async function generatePDF() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  console.log('Generating PDF...');
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
  console.log(`PDF successfully generated at: ${outputPath}`);
}

generatePDF().catch(err => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
