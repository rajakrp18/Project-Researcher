# Contact Finder: Advanced OSINT Investigation Engine 🕵️‍♂️🇮🇳

This repository houses the **Contact Finder**, an enterprise-grade, multi-provider Open Source Intelligence (OSINT) engine specifically engineered to track down and attribute Indian mobile numbers based on names and residential/business addresses.

---

## 📖 The Journey: How We Started

Contact Finder began as a simple proof-of-concept Next.js application. The original architecture was basic:
1. Take a user's target (e.g., "Purshottam Varshneya at E-862 Saraswati Vihar").
2. Run a simple Google search using SerpAPI.
3. Fetch the underlying HTML using a standard HTTP request.
4. Pass the text to Google Gemini to see if an AI could spot a phone number.

**The Problem:** We quickly realized that the real world of Indian data scraping is messy. Standard HTTP requests were immediately blocked by Cloudflare and Akamai bot-protections (especially on sites like Times of India and JustDial). Phone numbers were mashed together with zip codes (e.g., `9582888440444`), causing standard Regex to fail. Finally, generic searches yielded thousands of junk pages, causing our API budgets and safety timeouts to max out before we could find the needle in the haystack.

---

## 🚀 Where We Are Now: The Advanced Engine

Through a series of intense, iterative architectural overhauls, the engine has evolved into an unstoppable, highly-optimized OSINT machine. 

Here are the major upgrades that brought us here:

### 1. The Invisible Browser (Puppeteer)
We ripped out the standard HTTP fetcher and replaced it with a stealth **Puppeteer Headless Chrome Browser**. The engine now physically opens an invisible browser window, spoofs its user agent, blocks unnecessary images/CSS to maximize speed, and slices straight through Cloudflare and Akamai bot protections to read the raw DOM.

### 2. High-Signal Strategy Shifting
We discovered that obituaries, Resident Welfare Association (RWA) directories, and local public records are the best sources for private residential numbers. We completely rebuilt the `QueryGenerator.ts` to dynamically prioritize highly-specific fallback queries. For example, it now uses `[House Number] + [Area] + [Surname]` as **Strategy #1**, guaranteeing a hit within the first 10 seconds of the run.

### 3. Google SERP Snippet Harvesting
To beat the 180-second timeout limit, we realized we didn't always need to visit the website. We built a pipeline to instantly harvest phone numbers directly from the 1-sentence **Google Search Snippets**. If the phone number is visible on the Google search page, the engine grabs it instantly, completely bypassing the need to fight bot protections.

### 4. Advanced Regex & AI Scoring
Indian data is messy. We built a relaxed, robust Regex engine capable of plucking 10-digit Indian mobile numbers out of mashed strings, while carefully rejecting 10-digit calendar dates. Every number found is then passed into our **Confidence Scorer**, which analyzes the surrounding context text (200 characters) to verify if the target's exact house number or city is mentioned nearby, awarding points dynamically.

### 5. Multi-Provider & Perplexity Integration
The engine now uses a robust `ProviderRegistry` capable of executing concurrent searches across SerpAPI, TinyFish, and direct scrapers (like ZaubaCorp). 
Most recently, we integrated the **Perplexity AI (Sonar Pro)** API as a first-class Search Provider. The engine asks Perplexity to autonomously research the target, extracts phones directly from Perplexity's synthesized answers, and feeds Perplexity's cited URLs directly into our Puppeteer browser for deep-scrape verification!

---

## 🛠️ What Needs To Be Done (The Roadmap)

While the core extraction engine is enterprise-ready, the following steps are required to move this from a local development environment into a scalable production application:

### 1. Production API Keys
The engine relies on heavily throttled free-tier keys. To run at scale, we need:
- **Perplexity API Key**: To unlock the Sonar Pro autonomous web search.
- **SerpAPI / TinyFish Keys**: To increase the concurrency limit of Google searches.
- **Truecaller API Key**: We built a `CallerIdService` mock architecture. To activate it, a production Truecaller/Whoscall API key is needed to reverse-verify the ownership of the numbers we extract.

### 2. Background Queue Processing (Redis/BullMQ)
Currently, the Next.js API route holds the connection open for up to 180 seconds while the Puppeteer browser scrapes the web. Serverless platforms like Vercel will kill the request after 60 seconds. 
**Next Step:** Implement a background queue (like BullMQ). When the user clicks "Investigate", the job is sent to a background worker, and the UI polls for the result via WebSockets.

### 3. Database Caching (PostgreSQL / Prisma)
We need to implement a caching layer. Every time a number is found for a specific target/address, it should be permanently saved to a database. If a user searches for the same target twice, it should return the cached result instantly, saving us API budget and compute time.

### 4. CAPTCHA Solving Infrastructure
While Puppeteer bypasses basic bot protections, advanced directories (like IndiaMart) will occasionally throw hard CAPTCHAs. Integrating a service like **2Captcha** or **Anti-Captcha** directly into the `BrowserFetcher` will allow the invisible browser to solve these automatically.

---

## 💻 Getting Started (For Developers)

1. Clone the repository.
2. Run `npm install` from the root directory.
3. Configure your API keys in `apps/contact-finder/.env.local`:
   ```env
   GEMINI_API_KEY=your_gemini_key
   TINYFISH_API_KEY=your_tinyfish_key
   SERPAPI_API_KEY=your_serpapi_key
   PERPLEXITY_API_KEY=your_perplexity_key (optional)
   ```
4. Start the engine: `npm run dev --workspace=contact-finder -- -p 3001`