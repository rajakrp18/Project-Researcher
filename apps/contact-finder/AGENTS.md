# AGENTS.md

## Project Overview
IEPF Shareholder Tracer AI â€” finds mobile numbers for unclaimed shareholders using web search (TinyFish) + LLM extraction (Gemini).

## Development Methodology (feature-complete mode)
The system is feature-complete. NO NEW PHASES are created unless a real shareholder
investigation proves one is necessary. The benchmark is the REAL IEPF shareholder cases,
not synthetic datasets (synthetic benchmarks are regression tests only).

### Development loop (repeat per real batch)
1. Run the investigation on the batch.
2. Compare with expected phone numbers.
3. Produce a deterministic investigation report for EVERY case.
4. For every failed/incorrect case identify ONE primary root cause only (see taxonomy
   below).
5. Rank all root causes by frequency.
6. Identify the SINGLE highest-impact fix. Estimate: cases affected, expected recall
   improvement, implementation complexity, regression risk. Do NOT implement yet â€” wait
   for approval.
7. After approval: implement ONLY that single fix. No refactoring, no architecture
   changes, no unrelated cleanup, no new framework.
8. Re-run the EXACT SAME dataset. Generate a comparison table: expected phones, found
   phones, correct/incorrect, new phones recovered, phones lost, wrong phones, queries
   executed, providers used, evidence count, root cause before/after.
9. Measure: recall, precision, wrong-phone rate, false positives, false negatives, average
   queries, average fetches, provider contribution, investigation duration.
10. If recall improved â†’ repeat the loop. If not â†’ revert, analyse again, choose the next
    highest-impact root cause.

### Root-cause taxonomy (ONE per failed case)
QUERY_PLANNING, RETRIEVAL_COVERAGE, PROVIDER_LIMITATION, MISSING_SEARCH_INTENT,
FETCH_FAILURE, HTML_PARSING, PDF_PARSING, OCR_REQUIRED, NAME_EXTRACTION,
ADDRESS_EXTRACTION, ENTITY_RESOLUTION, CONTACT_ATTRIBUTION, PHONE_NORMALIZATION,
CONFIDENCE_REJECTION, WRONG_ENTITY_MERGE, EARLY_STOPPING, DUPLICATE_SUPPRESSION,
BUDGET_EXHAUSTED, UNKNOWN.

### Rules
- Never invent another development phase.
- Never add infrastructure unless a real failure proves it is required.
- Every production code change must be justified by an observed failure in a real
  shareholder investigation.
- Success metric: increase the % of real shareholders whose correct mobile numbers are
  recovered while keeping wrong-phone attribution at ZERO.
- Root-cause classifier lives in `engine/diagnostics/rootCause.ts`; the live loop runner
  is `docs/scripts/run-shareholder-diagnostics.ts`.

## Architecture (Gen-3 v1.0)
- **Frontend:** React 19 + Vite 6 + TypeScript frontend, built to `dist/`
- **Backend:** Node.js 20+ `node:http` server (`server/index.mjs`) serving both frontend + `/api/*`
- **Deployment:** Single Docker container (node:20-alpine), non-root user, health checks
- **Persistence:** File-based JSON sessions (`data/sessions/`), configurable via `PERSISTENCE_ROOT`
- **Security:** Backend API boundary â€” all provider keys server-side only

## Code Style
- TypeScript for frontend (React 19 + Vite + Tailwind CSS)
- ES modules (.mjs) for test scripts
- No comments in code unless explicitly requested
- Follow existing patterns in neighboring files

## Testing
- Run tests: `npm test`
- Batch test: `node docs/scripts/test-all-cases.mjs`
- Single test: `node docs/scripts/test-single.mjs`
- Unit tests: `npx jest` (runs all Jest test suites under `engine/`, `services/`)
- Unit test specific: `npx jest --testPathPatterns "EntityResolver.test"`
- Benchmarks: `npx tsx engine/benchmark/run-v3.ts`
- Verify accuracy does NOT decrease â€” only improvements allowed

## Git Conventions
- Branch: main
- Remote: https://github.com/kunalprabhakarphd-sketch/IEPF-ShareHolder-Tracker.git
- Commit style: concise, descriptive messages
- Session files (session.md, session25-07.md, agent.md, migration.md) are in .gitignore â€” do not commit
- Pre-hardening baseline JSON files are gitignored â€” do not commit

## API Keys (in .env.local, not in git)
- TINYFISH_API_KEY: Web search provider
- GEMINI_API_KEY: LLM extraction (primary and secondary keys available)
- MISTRAL_API_KEY: Optional LLM fallback
- GROQ_API_KEY: Optional LLM fallback

## Key Constraints
1. Must NOT decrease existing accuracy â€” only increase it
2. Gemini API has rate limits (429 errors) â€” use retry with exponential backoff
3. TinyFish results are non-deterministic â€” same query returns different pages each run
4. RETRIES_PER_CASE: 2 (reduced from 3 due to API rate limits)
5. ScoringConfig frozen at v1.1 â€” do not modify scoring weights
6. Docker image must not contain API keys â€” inject at runtime

## File Organization
- `docs/reports/` â€” accuracy reports and test results
- `docs/scripts/` â€” test runners and accuracy evaluation scripts
- `docs/screenshots/` â€” UI screenshots from testing
- `docs/releases/` â€” phase documentation and release manifests
- `docs/operations/` â€” deployment and incident runbooks
- `docs/security/` â€” security and threat model documentation
- `components/` â€” React UI components
- `services/` â€” API integrations (webSearch, geminiService, etc.)
- `engine/` â€” investigation engine (evidence, confidence, entity, runtime, providers, benchmark)
- `server/` â€” production backend API server
- `hooks/` â€” React hooks

## Phase 12a â€” Contact Attribution Resolver (July 2026)

### Architecture
- `engine/evidence/ContactAttributionResolver.ts` â€” new module. Maps each phone to a `ContactAttributionType`:
  - **DIRECT_PERSON** â€” subject name in phone context window, no other names â†’ `isProxied=false` â†’ +12 score preserved
  - **PROXY_PERSON** â€” explicit proxy patterns (`secretary Mr X`, `neighbour Mr Y`, `contact through`) or surname-only/partial match without strong direct patterns
  - **RWA** â€” `contact through society`, `rwa secretary`, etc.
  - **BROKER** â€” `broker`, `property dealer`, etc.
  - **ORGANIZATION** â€” `office phone`, `reception`, `helpline`, etc.
  - **GENERIC** â€” `contact us`, `reach us`, `get in touch` without person name
  - **AMBIGUOUS** â€” multiple person names in phone context window
  - **UNKNOWN** â€” no name match anywhere

### Resolution priority (top-to-bottom):
1. Explicit RWA patterns â†’ RWA
2. Explicit broker patterns â†’ BROKER
3. Explicit proxy patterns (secretary/neighbour/contact through) â†’ PROXY_PERSON
4. Explicit org patterns â†’ ORGANIZATION
5. Generic page contact (without person name) â†’ GENERIC
6. Proximity-based:
   - EXACT/VARIANT match: if other person names in context â†’ AMBIGUOUS, else â†’ DIRECT_PERSON
   - SURNAME_ONLY/PARTIAL: if other person names â†’ AMBIGUOUS, strong direct pattern â†’ DIRECT_PERSON, else â†’ PROXY_PERSON
   - No match: subject in raw text â†’ PROXY_PERSON, else â†’ UNKNOWN

### Non-Person Name Filter (multi-person detection)
- `NonPersonSurnames` set in ContactAttributionResolver.ts filters out extracted names like "Industrial Area", "East Street", "Raj Nagar" from triggering ambiguous detection.
- Covers: area, road, street, nagar, colony, garden, park, vihar, puri, grove, enclave, layout, company suffixes (Pvt Ltd, Corp, Enterprises, etc.)
- Applied via `filterPersonNames()` before checking for other names in context.

### Must-not-regress cases audited:
- **C007** (Ravi Kumar, Industrial Area, Ludhiana): NameExtractor extracts "Industrial Area" + "Ravi Kumar". NonPersonSurnames filter discards "Area" â†’ DIRECT_PERSON âœ“
- **C025** (Deepa Nair, East Street, Trivandrum): NameExtractor extracts "East Street" + "Deepa Nair". NonPersonSurnames filter discards "Street" â†’ DIRECT_PERSON âœ“
- **C042** (Amit Singh, Raj Nagar, Ghaziabad): NameExtractor extracts "Raj Nagar" + "Amit Singh". NonPersonSurnames filter discards "Nagar" â†’ DIRECT_PERSON âœ“
- **C044** (Sunita Verma, Palm Grove, Contact through society): Explicit RWA pattern catches "contact through society" â†’ RWA âœ“
- **C023** (Amit Singh, RWA Raj Nagar, Secretary Mr Gupta): Explicit proxy pattern catches "Secretary Mr Gupta" â†’ PROXY_PERSON âœ“
- **C027** (Sunita Verma, Broker Vikas Properties): Explicit broker pattern catches "broker" â†’ BROKER âœ“

### Known constraints
- `isGenericPageContact()` checks for `contact us`/`reach us` patterns and requires NO person name in the snippet. This prevents false GENERIC classification when person names appear near generic sections.
- The `isNonPersonName()` filter is intentionally conservative â€” only filters clearly non-person surname words. False negatives (non-person names not in the set) could trigger false AMBIGUOUS, which is safer than false DIRECT_PERSON.

## Current Accuracy
- Batch 1 (11 cases): 46%
- Batch 2 (7 cases): 0-27% (variable)

## Phase 13 â€” Gen-3.2 Retrieval Diagnostics (measurement-only, Aug 2026)

### Scope
Diagnostics and measurement ONLY. No production behavior changes: no scoring weights, no
confidence changes, no benchmark edits, no threshold tuning, no query-template changes,
no engine redesign. The live runs use the relaxed StageDecider harness (test-only).

### Module layout
- `engine/diagnostics/` â€” `types.ts`, `intent.ts` (`inferIntent`), `instrument.ts`
  (`InstrumentedRun`, `InstrumentingSearchProvider`, `InstrumentingFetchProvider`),
  `funnel.ts` (`computeFunnel`/`aggregateFunnel`/`normalizePhone`/`validPhones`),
  `rootCause.ts` (`analyzeRootCause` â€” 13 reasons), `intentEffectiveness.ts`,
  `providerCoverage.ts`, `missingEvidence.ts`, `pdfCoverage.ts`, `recommendations.ts`,
  `report.ts` (`buildCaseDiagnostics`/`buildDiagnosticsReport`), `render.ts`
  (`renderMarkdown`), `index.ts` barrel.
- Tests: `engine/diagnostics/__tests__/` (9 suites / 47 tests). Full suite: 816 tests.
- Live runner: `docs/scripts/run-shareholder-diagnostics.ts` (tsx; instruments the real
  TinyFish providers, builds a `DiagnosticsReport`, writes
  `docs/reports/gen-3.2-diagnostics-<date>.md`). On Windows, dynamic imports must use
  `pathToFileURL(resolve(REPO_ROOT, 'x.ts')).href` â€” raw absolute paths fail under the ESM
  loader (`ERR_UNSUPPORTED_ESM_URL_SCHEME`).

### Phone normalization (critical, engine canonical format)
`normalizePhone` must decode the engine's canonical phone form before validation: strip a
leading `91` from 12-digit numbers (or `0` from 11-digit), then require `/^[6-9]\d{9}$/`.
The engine's `PhoneExtractor` (`engine/evidence/extractors/PhoneExtractor.ts`) stores
phones as `+919876543210`. A strict "exactly 10 digits" rule is WRONG for this codebase â€”
it reports EVIDENCE_NO_PHONES for every case. See funnel unit test
`normalizes engine-format (+91 / 91-prefixed) numbers and rejects junk`.

### Funnel subject exclusion
There is no `EntityType.SUBJECT` â€” the subject is a `PERSON` entity whose `name` equals the
case name. Filter it with `e.name !== subjectName` (never `e.type !== 'SUBJECT'`).

### Known results (live, 7 shareholders, 11 expected phones)
- run3 (canonical): 0/11 matched. Root causes: WRONG_PHONES 2, EVIDENCE_NO_PHONES 3,
  STOPPED_EARLY 2. Only 3 queries/case (HypothesisEngine ends after ~3 actions; budget of
  15 unused). Largest funnel drop-off: Entities resolved â†’ Phone contact candidates
  (lost ~90%). SHAREHOLDER_LOOKUP is the top-yield intent (â‰ˆ12 phones/query);
  PHONE_LOOKUP yields zero. 0 Tier-A/Tier-B entities hold a phone. PDF-only phones are
  dropped (fetch provider does not convert PDFs to text).
- Reports: `docs/reports/gen-3.2-diagnostics-2026-08-01{.md,-run1.md,-run2.md}`.


## Phase 13b — Gen-3.3 Multi-Source Retrieval Expansion (Aug 2026, in progress)
User directive: add retrieval providers ONE at a time, benchmark after each on the real
7-case dataset via `docs/scripts/run-gen33-provider-contribution.ts`. Production engine is
FROZEN (confidence/entity/investigation/evidence, scoring, thresholds, benchmarks). The
`engine/retrieval/` layer is NOT wired into production.

- **Provider order:** TinyFish (exists) -> Wayback (DONE, free) -> JustDial (DONE) -> IndiaMart
  (DONE) -> TradeIndia (DONE) -> CompanyCheck (DONE) -> MCA (DONE) -> SerpAPI (only if a significant
  gap remains).
- **Brave is PAID:** keep `BraveProvider` but it is KEY-GATED - registered only when
  `BRAVE_API_KEY` is present in `.env.local`; harness reports a NOTE when it is absent.
- **WaybackProvider (done):** ARCHIVE+FETCH, free. Fetches `https://web.archive.org/web/{url}`
  (302 -> latest snapshot; 404 = unarchived). Do NOT use `archive.org/wayback/available` -
  it is rate-limited (429) for this IP; CDX and `web/` both work. Do NOT `unref()` the
  requestDelayMs throttle timer - Node drains the loop and tsx exits with "unsettled top-level
  await".
- **JustDialProvider (done):** DIRECTORY, URL-only, no API key. `search()` constructs
  `justdial.com/{City}/{Name}` URLs from planner queries (quoted subject/company phrase or a
  leading non-address run + city detection from a ~40-city table; `location`/config fallback).
  SEARCH-only capability (no FETCH - pages are fetched by TinyFish; JustDial serves 200 + full
  HTML to plain HTTP, no captcha). Priority 40.
- **IndiaMartProvider (done):** DIRECTORY, URL-only, no API key. `search()` constructs
  `dir.indiamart.com/search.mp?ss={entity}` URLs from planner queries (quoted subject/company
  phrase or a leading non-address run; `+` for spaces). SEARCH-only capability (no FETCH - pages
  are fetched by TinyFish; search.mp serves 200 + full HTML to plain HTTP, verified live).
  Priority 50.
- **TradeIndiaProvider (done):** DIRECTORY, URL-only, no API key. `search()` constructs
  `tradeindia.com/search.html?keyword={entity}` URLs (quoted subject/company phrase or a leading
  non-address run; `+` for spaces). SEARCH-only capability (no FETCH - pages fetched by TinyFish;
  serves 200 + server-rendered keyword content to plain HTTP, verified live - keyword preserved,
  ~37 hits/201KB). TradeIndia is otherwise NOT URL-consumable: `/products/{kw}.html` 301-redirects
  to the generic `/products/` (keyword dropped) and all other keyword/company/seller/city
  patterns 404; the homepage is a JS SPA with no server-side search form. `search.html?keyword=`
  is the ONLY working constructor. Priority 60.
- **CompanyCheckProvider (done):** DIRECTORY, URL-only, no API key. The legacy CompanyCheck India
  domain `companycheck.co.in` has NO DNS (dead); `companycheck.co.uk` is UK-only and 403s to plain
  HTTP. Web search points to the rebranded Indian successor **`thecompanycheck.com`** (MCA-derived
  Indian company data). `search()` constructs `thecompanycheck.com/search/{slug}` URLs (hyphenated
  lowercase slug from quoted subject/company phrase or a leading non-address run; `+` -> 404, use
  hyphens). SEARCH-only capability (no FETCH - pages fetched by TinyFish). Verified live:
  `/search/godrej-industries` (hyphen) and `%20` forms serve 200 + ~190KB server-rendered keyword
  results (~21 hits, phone candidates present); company pages live at `/company/b/{slug}/{hash}` and
  `/company/{slug}/{CIN}` but need a CIN/hash (NOT constructible from a name). Priority 70.
- **MCAProvider (done):** DIRECTORY, URL-only, no API key. Targets the MCA-derived registry
  **quickcompany.in** (mca.gov.in is 403 to plain HTTP; zaubacorp.com 500s on search/company
  endpoints; tofler.in serves a JS shell with 0 keyword hits; companyvakil has weak content).
  `search()` constructs `quickcompany.in/search?q={entity}` URLs (quoted subject/company phrase or
  a leading non-address run; `+` for spaces). SEARCH-only capability (no FETCH - pages fetched by
  TinyFish). Verified live: `/search?q=Steelcast+Ltd` serves 200 + ~64KB server-rendered keyword
  results (~13 hits, real `/company/{slug}` links); company pages serve 200 + real MCA data (CIN,
  ROC, incorporation date, director names, capital). Priority 80.
- **Fetch-null fix (critical):** `DocumentParser.parseByKind`/`parsePdf`/`parseDocx` now guard
  `Buffer.from(content)` with `content ?? ''`. TinyFish returns `null` text for some URLs; an
  unguarded `Buffer.from(null)` threw and aborted the WHOLE fetch batch, so EVERY harness run
  reported 0 docs. This is why the earlier Gen-3.3 runs were 0/11 - fetch attribution was dead,
  not the providers. After the fix the contribution pass fetches 60+ docs and recovered 2/11
  expected phones (PURSHOTTAM 8506008881, 9212269002, both in TinyFish-fetched unclaimed-dividend
  PDFs).
- **Registry:** `RetrievalProviderRegistry.getAll()` sorts ascending by `priority`
  (TinyFish=10, Brave=20, Wayback=30, JustDial=40, IndiaMart=50, TradeIndia=60, CompanyCheck=70, default 100). The orchestrator dedups fetched
  docs by URL (first fetcher wins), so lower-priority fetchers only recover URLs earlier fetchers
  failed to fetch live.
- **Retrieval-path baseline = 0/11** expected phones (legacy path = 2/11). After the fetch-null
  fix the full six-provider pass (TinyFish+Wayback+JustDial+IndiaMart+TradeIndia+CompanyCheck)
  recovered 2/11 (PURSHOTTAM 8506008881, 9212269002 - both via TinyFish-fetched unclaimed-dividend
  PDFs; 61 docs fetched by TinyFish, 3 by Wayback). The URL-only directory providers add candidate
  URLs but NO phones so far (companycheck 25, indiamart 25, tradeindia 25, justdial 16, mca 1-25;
  their search pages do not contain personal phones). Dominant remaining blocker is query-plan
  coverage
  (`engine/retrieval/intents.ts` has weaker templates than legacy `searchShareholder` - no
  `site:timesofindia.com`, no `site:locatemyfamily.com`). Do NOT fix the planner without approval;
  provider count does not explain the gap.
- Harness arg notes: `--passes=baseline|contribution|both`, `--queries`, `--fetchMax`,
  `--waybackDelay`, `--cases=1-7` (accepts comma lists and `N-M` ranges), `--providers=tinyfish,brave,wayback,justdial,indiamart,tradeindia,companycheck,mca`. Redirect stdout
  `*>` to a file (output pipes buffer and hang when piped). Full both-passes run ~30-60 min;
  use `--passes=contribution` when only the added-provider delta is needed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
