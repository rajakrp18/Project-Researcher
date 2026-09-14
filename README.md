# Contact Finder: Enterprise OSINT AI Engine 🕵️‍♂️🇮🇳

This repository houses the **Contact Finder**, a cutting-edge, multi-agent Open Source Intelligence (OSINT) engine designed to track down, attribute, and verify Indian mobile numbers based on names, companies, and residential/business addresses. 

The engine leverages local machine learning, vision models, headless stealth scraping, and a local knowledge graph to achieve unprecedented accuracy in finding private contact information for **IEPF dividend recovery, corporate directory lookups, legal skip tracing, and B2B contact enrichment**.

---

## 🚀 Key Architectural Features

The Contact Finder engine operates as a team of specialized AI agents working together in a unified pipeline:

### 1. Multi-Agent Reasoning Architecture
- **`CoordinatorAgent`** ([CoordinatorAgent.ts](file:///c:/project_researcher/apps/contact-finder/lib/engine/agents/CoordinatorAgent.ts)): Manages investigation budgets, batch query lifecycles, corporate entity detection, early exit logic, and secondary proxy social graph searches.
- **`ResearcherAgent`** ([ResearcherAgent.ts](file:///c:/project_researcher/apps/contact-finder/lib/engine/agents/ResearcherAgent.ts)): Generates highly targeted Google Dorks and orchestrates concurrent fetching across search and B2B providers.
- **`ExtractorAgent`** ([ExtractorAgent.ts](file:///c:/project_researcher/apps/contact-finder/lib/engine/agents/ExtractorAgent.ts)): Parses raw DOM trees, executes Pass-1 regex matching, runs Pass-2 semantic vector chunking, and manages Pass-3 LLM context extraction.
- **`VerifierAgent`** ([VerifierAgent.ts](file:///c:/project_researcher/apps/contact-finder/lib/engine/agents/VerifierAgent.ts)): Executes identity resolution, scores candidate confidence (0–100%), and maintains the SQLite knowledge graph.

### 2. Upgraded AI Core (`gemini-3.6-flash`)
The LLM engine is powered by **Google Gemini 3.6 Flash** via `@google/genai` (with OpenRouter Llama 3 fallback). It parses complex unstructured documents, extracts owner relationships, and verifies entity equivalence without relying on fragile hardcoded rules.

### 3. Semantic Vector Chunking (`Transformers.js`)
Instead of relying on basic keyword matching to find contact details in 30,000+ line HTML documents, the engine utilizes a local ONNX-quantized machine learning model (`Xenova/all-MiniLM-L6-v2`) via `Transformers.js`.
- Converts webpage paragraphs into **Vector Embeddings**.
- Runs local Cosine Similarity search to locate paragraphs containing target contact details completely offline.

### 4. Stealth Headless Scraper (`puppeteer-extra`)
Standard HTTP requests fail against modern enterprise directories. The engine uses `puppeteer-extra-plugin-stealth` to launch an invisible Chromium browser that spoofs WebGL signatures, hides WebDriver flags, and bypasses Cloudflare/Akamai protections to scrape sites like ZaubaCorp, Times of India, and JustDial.

### 5. Gemini 3.6 Flash Vision OCR Fallback
When websites render phone numbers as custom canvas graphics or images to prevent scraping, [GeminiService.ts](file:///c:/project_researcher/apps/contact-finder/lib/engine/llm/GeminiService.ts) captures a Base64 JPEG screenshot of the rendered page and passes it to **Gemini 3.6 Flash Vision**, which visually reads hidden digits.

### 6. Social Graph & Coworker Proxy Search
If a subject has zero direct digital footprint, the `CoordinatorAgent` automatically launches a **Secondary Proxy Search**. It queries corporate directories and LinkedIn for coworkers, directors, or managers at the subject's company, returning their numbers flagged as `PROXY_PERSON`.

### 7. Persistent Knowledge Graph (SQLite)
Maintains a persistent memory database using `better-sqlite3`. When a high-confidence phone number is verified, it is permanently saved. Future searches trigger an instant pre-flight cache hit, saving API query budgets.

---

## 📊 Comprehensive Confidence Scoring Algorithm

In [ConfidenceScorer.ts](file:///c:/project_researcher/apps/contact-finder/lib/engine/attribution/ConfidenceScorer.ts), candidate phone numbers are scored from **0% to 100%**:

$$\text{Total Score} = \min\Big(100,\, \max\big(0,\, S_{\text{NameMatch}} + S_{\text{Attribution}} + S_{\text{AddressMatch}} + S_{\text{LocalitySnippet}} + S_{\text{MultiSourceBonus}} + S_{\text{DomainTrust}}\big)\Big)$$

### Scoring Factors:
- **Name Match ($S_{\text{NameMatch}}$):** Exact (+30), Variant/Middle Name (+20), Surname Only (+10), Partial (+5).
- **Attribution ($S_{\text{Attribution}}$):** Direct Person (+20), Proxy/Coworker (+10), RWA/Society (+5), Broker (+5), Organization (+3), Ambiguous (-5), Unknown (-10).
- **Address Match ($S_{\text{AddressMatch}}$):** Exact House/Flat Number (+40), Area/Colony (+20), City (+5), Snippet Locality (+10).
- **Multi-Source Verification ($S_{\text{MultiSourceBonus}}$):** $+15$ pts per additional independent domain discovery ($N > 1$).
- **Source Domain Trust ($S_{\text{DomainTrust}}$):** Government domains (`.gov.in`, `mca.gov.in`) (+10), Established portals (`ZaubaCorp`, `IndiaMart`, `TradeIndia`) (+5).

### 🏷️ 8 Attribution Types
1. **`DIRECT_PERSON`**: Phone belongs directly to the subject or their father (`self`/`father`).
2. **`PROXY_PERSON`**: Belongs to a colleague, co-director, or associate (`proxy`/`coworker`).
3. **`RWA`**: Belongs to Resident Welfare Assoc or Society Secretary (`rwa_official`).
4. **`BROKER`**: Belongs to a real estate dealer or property agent (`broker`).
5. **`ORGANIZATION`**: General company reception or helpline.
6. **`GENERIC`**: Standard header line without entity details.
7. **`AMBIGUOUS`**: Context lists multiple conflicting third-party names.
8. **`UNKNOWN`**: Orphaned phone digits extracted without context.

---

## 🛠️ Tech Stack

- **Core**: Next.js 16, React 19, TypeScript, Tailwind / Vanilla CSS
- **Browser Automation**: `puppeteer-extra`, `puppeteer-extra-plugin-stealth`
- **Embeddings & ML**: `Transformers.js` (`Xenova/all-MiniLM-L6-v2`)
- **LLMs & Vision**: `@google/genai` (`gemini-3.6-flash`), OpenRouter (Llama 3)
- **Database**: `better-sqlite3`
- **Search & B2B Providers**: SerpAPI, Perplexity AI (Sonar Pro), TinyFish, ZaubaCorp, IndiaMart, TradeIndia, QuickCompany, Explorium, Apify
- **Excel & PDF Tools**: `exceljs`, `pdf-parse`, `pdf2json`, `tesseract.js`

---

## 💻 Getting Started

1. Clone the repository.
2. Run `npm install` from the root directory.
3. Configure your API keys in `apps/contact-finder/.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_key
   SERPAPI_API_KEY=your_serpapi_key
   PERPLEXITY_API_KEY=your_perplexity_key
   ```
4. Start the development server:
   ```bash
   npm run dev --workspace=contact-finder
   ```