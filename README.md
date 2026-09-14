# Contact Finder: Enterprise OSINT AI Engine 🕵️‍♂️🇮🇳

This repository houses the **Contact Finder**, a cutting-edge, multi-agent Open Source Intelligence (OSINT) engine designed to track down and attribute Indian mobile numbers based on names, companies, and residential/business addresses. 

The engine leverages local machine learning, vision models, headless stealth scraping, and a local knowledge graph to achieve unprecedented accuracy in finding private contact information.

---

## 🚀 Key Architectural Features

The Contact Finder engine operates as a team of specialized AI agents working together in a unified pipeline:

### 1. Multi-Agent Reasoning
The monolithic scraping loop was refactored into a highly scalable, modular architecture:
- **`CoordinatorAgent`**: Manages the investigation budget, loop lifecycles, and triggers fallback proxy searches.
- **`ResearcherAgent`**: Generates highly targeted Google Dorks and orchestrates concurrent fetching across providers.
- **`ExtractorAgent`**: Parses raw DOM trees, runs regex matching, and executes the Semantic Chunking pipeline.
- **`VerifierAgent`**: Executes identity resolution, scores attribution confidence (0-100), and maintains the Knowledge Graph.

### 2. Semantic Vector Chunking (`Transformers.js`)
Instead of relying on fragile keyword matching to find contact details in 30,000+ line HTML documents, the engine utilizes a local machine learning model (`Xenova/all-MiniLM-L6-v2`) via Transformers.js. 
- It mathematically converts webpage paragraphs into **Vector Embeddings**.
- It runs a local Cosine Similarity search to flawlessly locate the specific paragraphs containing the target's contact information, completely offline and instantly.

### 3. Stealth Headless Scraper (`puppeteer-extra`)
Standard HTTP requests fail against modern enterprise directories. The engine uses `puppeteer-extra-plugin-stealth` to launch an invisible Chrome browser that spoofs its WebGL signature, removes WebDriver flags, and mimics real human behavior. This allows the engine to silently slice through Cloudflare and Akamai bot protections to scrape sites like ZaubaCorp and Times of India.

### 4. Gemini 1.5 Pro Vision Fallback
If the text-based extraction fails (e.g., the website renders phone numbers as custom canvas fonts or images to prevent scraping), the engine automatically captures a Base64 JPEG screenshot of the rendered webpage. It passes this image to Google's Gemini 1.5 Pro Vision model, which visually reads the image to extract the hidden phone number.

### 5. Social Graph Proxy Searching
If the engine fails to find a high-confidence direct line for the target (e.g., they have zero digital footprint), the Coordinator Agent automatically launches a **Secondary Proxy Search**. It queries LinkedIn for the target's company and city, identifies their coworkers, and extracts the coworkers' numbers—flagging them as `PROXY_PERSON`.

### 6. The Knowledge Graph (SQLite)
The engine maintains a persistent memory database using `better-sqlite3`. When a high-confidence phone number is verified, it is permanently saved. Future searches for that entity trigger a "Pre-Flight Check," instantly loading the verified phone number from memory and saving API query budgets.

---

## 📖 How It Works

1. **Input**: User provides Name, Address, and Company.
2. **Memory Check**: SQLite is queried for past verified results.
3. **Query Generation**: The engine generates 15 targeted Google Dorks.
4. **Scraping**: The Stealth Puppeteer browser fetches the raw DOMs, bypassing CAPTCHAs.
5. **Extraction**: Transformers.js chunks the text, Gemini extracts the relationships, and Regex catches raw digits.
6. **Scoring**: A strict fuzzy-matching algorithm verifies the address boundaries and assigns a confidence score.
7. **Social Fallback**: If the score is low, coworkers' numbers are found.
8. **Delivery**: Results are presented in a sleek, real-time Next.js frontend UI.

---

## 🛠️ Tech Stack

- **Core**: Next.js 14, TypeScript, React
- **Browser Automation**: `puppeteer-extra`, `puppeteer-extra-plugin-stealth`
- **Embeddings/ML**: `Transformers.js` (`all-MiniLM-L6-v2`)
- **LLMs**: Google GenAI (`gemini-1.5-pro`, `gemini-1.5-flash`), OpenRouter (Llama 3)
- **Database**: `better-sqlite3`
- **Search Providers**: SerpAPI, TinyFish, Perplexity AI (Sonar Pro)

---

## 💻 Getting Started

1. Clone the repository.
2. Run `npm install` from the root directory.
3. Configure your API keys in `apps/contact-finder/.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_key
   TINYFISH_API_KEY=your_tinyfish_key
   SERPAPI_API_KEY=your_serpapi_key
   ```
4. Start the engine: `npm run dev --workspace=contact-finder -- -p 3001`