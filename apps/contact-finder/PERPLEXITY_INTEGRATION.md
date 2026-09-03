# Perplexity AI Integration for Contact Finder 🧠

This document outlines the architecture, progress, and future steps for the Perplexity AI integration within the Contact Finder OSINT engine.

## 🎯 What We Are Doing

Contact Finder operates by searching the web for public records, directories, and business listings to attribute phone numbers to individuals. While standard search engines (via SerpAPI) are effective, they rely on traditional keyword indexing.

By integrating **Perplexity AI** (specifically the `sonar-pro` model with `web_search` enabled), we effectively give our engine a "research assistant". 
When you search for a target, the engine asks Perplexity: 
> *"You are an OSINT extraction AI. Your goal is to find public phone numbers for the provided subject/query. Use web search to check directories, public records, business registries, and news articles."*

### 🏗️ How The Architecture Works
1. **The Synthesized Answer:** Perplexity searches the web, reads the pages, and synthesizes a direct text answer. We inject this text directly into our pipeline as a "Search Snippet", allowing our internal Regex to instantly extract phone numbers from it.
2. **The Citations (Deep Scraping):** Perplexity returns the raw URLs it used to formulate its answer. Instead of just trusting the AI, our engine takes those URLs and feeds them directly into our **Puppeteer Invisible Chrome Browser**. Our engine then physically scrapes those pages to verify the numbers and calculate an Evidence Confidence Score.

---

## 🚀 How Far We Are (Current Status)

The integration is **100% written and integrated** into the engine's core architecture.

- [x] **`PerplexityProvider.ts`**: The core provider class has been built. It successfully formats the request for the `sonar-pro` model, extracts the synthesized answer, and maps the citations to standard `SearchResult` URLs.
- [x] **Provider Registry Integration**: Perplexity has been added to `ProviderRegistry.ts` with a priority score of `15` (meaning it executes immediately after our direct database checks, before Google/SerpAPI).
- [x] **Graceful Degradation**: The system is designed to dynamically check for the presence of the API key via `isAvailable()`. Because the key is currently missing, the engine gracefully skips Perplexity and relies on its fallback engines (SerpAPI + Gemini) without crashing.

---

## 📋 What Needs to be Done

To activate the Perplexity integration and take it to the next level, the following steps must be completed:

### 1. Procure the API Key
Currently, Perplexity API requires paid credits to generate a key. 
- You must go to the [Perplexity API Dashboard](https://www.perplexity.ai/settings/api).
- Purchase credits to unlock API key generation.
- Generate a new API key.

### 2. Update Environment Variables
- Open `apps/contact-finder/.env.local`.
- Paste your key into the placeholder: `PERPLEXITY_API_KEY="your-new-key-here"`.
- Completely stop and restart the Next.js development server to load the new key into memory.

### 3. Future Enhancements (Optional)
Once active, you can further enhance the integration by:
- **Structured Outputs:** Upgrading the Perplexity call to use JSON schema enforcement, forcing Perplexity to return data in a strict `{"phone": "", "address": ""}` format rather than raw text.
- **Dynamic Prompting:** Passing the target's exact `city` and `company` directly into the Perplexity System Prompt to narrow down its search radius and reduce hallucinations.
- **Domain Constraints:** Instructing Perplexity to prioritize `.gov.in` or established directory domains during its web search.
