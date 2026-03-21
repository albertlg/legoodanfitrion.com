# GEO Audit Report: LeGoodAnfitrion

**Audit Date:** 2026-03-21
**URL:** https://legoodanfitrion.com
**Business Type:** SaaS (Event Management & RSVP Platform)
**Pages Analyzed:** 8 public routes x 5 languages = 40 potential URLs (0 indexable)

---

## Executive Summary

**Overall GEO Score: 12/100 (Critical)**

LeGoodAnfitrion is effectively **invisible to all AI systems and search engines**. The site is a React SPA with no server-side rendering, and critically, AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are NOT included in the Prerender.io user-agent regex. This means every AI crawler sees only an empty HTML shell with the message "Necesitas activar JavaScript para usar LeGoodAnfitrion." Additionally, the site has zero Google-indexed pages, no robots.txt, no sitemap.xml, no llms.txt, no structured data, and no brand presence on any external platform. The good news: the codebase has solid SEO foundations (react-helmet-async, hreflang for 5 languages, OG tags) that simply aren't reaching crawlers. A single regex change in `vercel.json` plus a few static files would dramatically improve visibility.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 8/100 | 25% | 2.0 |
| Brand Authority | 3/100 | 20% | 0.6 |
| Content E-E-A-T | 14/100 | 20% | 2.8 |
| Technical GEO | 25/100 | 15% | 3.75 |
| Schema & Structured Data | 3/100 | 10% | 0.3 |
| Platform Optimization | 22/100 | 10% | 2.2 |
| **Overall GEO Score** | | | **11.65 ~ 12/100** |

---

## Critical Issues (Fix Immediately)

### 1. AI Crawlers See ZERO Content (FATAL)
- **Issue:** The site is a React SPA. Without JavaScript execution, crawlers see only `<div id="root"></div>` and a noscript message.
- **Root Cause:** The Prerender.io rewrite in `vercel.json` (line 13) only matches traditional bots (googlebot, bingbot, etc.). **GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot, Bytespider** are all excluded.
- **Fix:** Add AI crawler user agents to the regex in `vercel.json`:
  ```
  Add to existing regex: |GPTBot|ClaudeBot|PerplexityBot|CCBot|Google-Extended|Bytespider|Applebot-Extended|cohere-ai|OAI-SearchBot|ChatGPT-User|anthropic-ai|meta-externalagent|amazonbot
  ```
- **File:** `/vercel.json` line 13
- **Impact:** Unblocks ALL other GEO improvements

### 2. Zero Google Indexation
- **Issue:** `site:legoodanfitrion.com` returns **zero results**. Google has never indexed any page.
- **Root Cause:** No robots.txt, no sitemap.xml, empty Google Search Console verification token
- **Fix:** Create robots.txt, sitemap.xml, and complete GSC verification (see High Priority below)
- **Impact:** Without indexation, the site doesn't exist for any search or AI system

### 3. No Structured Data Whatsoever
- **Issue:** Zero JSON-LD, zero microdata, zero RDFa across the entire site
- **Fix:** Add Organization, SoftwareApplication, and WebSite schemas as static JSON-LD in `index.html`
- **Impact:** AI systems cannot classify or identify LeGoodAnfitrion as an entity

### 4. Brand Entity Does Not Exist
- **Issue:** "LeGoodAnfitrion" returns zero results on Google, YouTube, Reddit, LinkedIn, Wikipedia, Product Hunt, Twitter/X, or any platform
- **Impact:** AI models have zero training data about this brand -- it literally does not exist in their knowledge

---

## High Priority Issues

### 5. No robots.txt File
- **Issue:** `/robots.txt` returns the SPA shell (HTML, status 200) instead of a text file
- **Fix:** Create `/frontend/public/robots.txt`:
  ```
  User-agent: *
  Allow: /
  Disallow: /app/
  Disallow: /login
  Disallow: /rsvp/

  User-agent: GPTBot
  Allow: /

  User-agent: ClaudeBot
  Allow: /

  User-agent: PerplexityBot
  Allow: /

  User-agent: Google-Extended
  Allow: /

  Sitemap: https://legoodanfitrion.com/sitemap.xml
  ```

### 6. No XML Sitemap
- **Issue:** No sitemap.xml exists anywhere
- **Fix:** Create a static sitemap.xml with all public URLs in all 5 languages (home, features, pricing, contact, blog, privacy, terms = 35+ URLs with hreflang alternates)

### 7. No llms.txt File
- **Issue:** The emerging standard for AI systems to understand a site is completely absent
- **Fix:** Create `/frontend/public/llms.txt` describing: what LeGoodAnfitrion is, key features, target audience, pricing, and important page links

### 8. Empty Google Search Console Verification
- **Issue:** `<meta name="google-site-verification" content="">` in `index.html` line 15
- **Fix:** Add the actual verification token from Google Search Console, verify ownership, submit sitemap

### 9. No Static Meta Tags in index.html
- **Issue:** The base HTML has no `<title>` or `<meta name="description">` -- these are only injected client-side via JavaScript
- **Fix:** Add default fallback title and description directly in `index.html` `<head>`

### 10. Missing Organization Schema with sameAs
- **Issue:** No structured entity identity for AI models
- **Fix:** Add static JSON-LD Organization schema in `index.html` with sameAs links to social profiles (once created)

### 11. No About Page
- **Issue:** No `/about` route exists -- no founder story, company mission, or team information
- **Impact:** Massive E-E-A-T gap (Experience + Expertise + Authoritativeness)

---

## Medium Priority Issues

### 12. No Social Media Profiles Claimed
- LinkedIn company page: Missing
- Twitter/X: Missing
- YouTube channel: Missing
- These feed sameAs schema and third-party entity recognition

### 13. FAQ Content Too Thin
- Only 4 questions with single-sentence answers (15-25 words each)
- Expand to 10+ FAQs with 50-100 word self-contained answers
- Add FAQPage schema markup

### 14. No Product Screenshots on Landing Page
- Hero image is a stock Unsplash photo, not a product screenshot
- Replace with actual app screenshots for Experience signals

### 15. Blog Posts Lack Article Schema
- Blog posts from Sanity CMS have author, date, and content but no JSON-LD
- Add Article schema with author Person, datePublished, dateModified

### 16. Missing Security Headers
- No Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- `Access-Control-Allow-Origin: *` is overly permissive

### 17. No Bing Webmaster Tools Verification
- No `msvalidate.01` meta tag
- No IndexNow protocol support

### 18. Cookiebot Script Blocks Rendering
- Loaded synchronously in `<head>` -- add `async` attribute

### 19. No Reddit, Product Hunt, or Directory Presence
- Zero community validation signals that AI systems use for authority scoring

---

## Low Priority Issues

### 20. No BreadcrumbList Schema
- Helpful for navigation context but lower priority than Organization/Article schemas

### 21. CSS Bundle Size (358 KB Uncompressed)
- Consider purging unused Tailwind utilities

### 22. No `security.txt` File
- Not critical for GEO but a trust signal

### 23. Single Fabricated Testimonial
- "Maria G., anfitriona desde 2024" on auth screen reads as fabricated
- Replace with real user quotes when available

### 24. No Content Dates on Static Pages
- Landing, Features, Pricing pages have no publication or update dates

---

## Category Deep Dives

### AI Citability (8/100)

**The fundamental problem:** AI crawlers receive a blank page. Even if they could render the content, citability would be low:

- **Passage self-containment:** Weak (3/10). Content is marketing fragments, not informational passages. Feature descriptions are single sentences.
- **Answer block quality:** Weak (2/10). No "What is X?" definitional content. No how-to guides. Blog content is fetched client-side from Sanity API -- doubly invisible.
- **Statistical density:** Weak (2/10). Only hardcoded demo stats ("24 events, 142 guests, 67% RSVP rate") exist.
- **Question-answering format:** Moderate (5/10). 4 FAQ items in Q&A structure, but answers lack depth.

**Key actions:** Fix rendering first (vercel.json regex), then create informational content (blog posts on "How to manage RSVPs," "Event planning checklist"), expand FAQ answers to 50-100 words, add self-contained definitional passages.

### Brand Authority (3/100)

**Platform presence map:**

| Platform | Status | Mentions |
|---|---|---|
| Google Search | Absent | 0 indexed pages |
| YouTube | Absent | 0 videos |
| Reddit | Absent | 0 mentions |
| Wikipedia | Absent | No article |
| LinkedIn | Absent | No company page |
| Twitter/X | Absent | No account |
| Product Hunt | Absent | No listing |
| Crunchbase | Absent | No profile |
| GitHub | Absent | No public repos |
| Review Sites | Absent | 0 reviews |

The brand has zero external digital footprint. AI models trained on web data have no knowledge of LeGoodAnfitrion.

**Key actions:** Claim LinkedIn, Twitter/X, YouTube immediately. Register on Product Hunt and Crunchbase. Seed Reddit presence in r/SaaS, r/startups, r/spain. Target Spanish tech press (El Referente, Xataka).

### Content E-E-A-T (14/100)

| Dimension | Score | Key Finding |
|---|---|---|
| Experience | 3/25 | No case studies, no original data, stock hero image, fabricated testimonial |
| Expertise | 5/25 | "Albert L.G." in footer only -- no bio, no credentials, no author page |
| Authoritativeness | 5/25 | No About page, no external citations, no press coverage, no awards |
| Trustworthiness | 9/25 | HTTPS present, privacy/terms exist, Cookiebot consent; but no address, empty GSC verification |

**Key actions:** Create an About page with founder story. Replace stock images with product screenshots. Build real testimonials from beta users. Add author bios with credentials. Add outbound citations to authoritative sources.

### Technical GEO (25/100)

| Component | Score | Status |
|---|---|---|
| SSR/Rendering | 5/100 | Pure CSR SPA -- AI crawlers see nothing |
| Meta Tags & Indexability | 15/100 | Client-side only via react-helmet-async |
| Crawlability | 10/100 | No robots.txt, no sitemap, no llms.txt |
| Security Headers | 30/100 | HTTPS + HSTS only; missing CSP, X-Frame-Options, etc. |
| Core Web Vitals Risk | 30/100 | High LCP/CLS risk from full CSR; 1.08 MB JS bundles |
| Mobile Optimization | 60/100 | Viewport tag correct, TailwindCSS responsive |
| URL Structure | 75/100 | Clean multilingual URL routing |

**Key actions:** Add AI crawlers to Prerender.io regex (1 line change). Create robots.txt + sitemap.xml + llms.txt. Add static fallback meta tags in index.html. Add security headers via vercel.json. Long-term: evaluate SSR migration.

### Schema & Structured Data (3/100)

**Current state:** Zero structured data implementation. No JSON-LD, Microdata, or RDFa anywhere.

**Missing schemas by priority:**

| Schema | Priority | Impact |
|---|---|---|
| Organization + sameAs | Critical | Entity identity for AI models |
| SoftwareApplication | Critical | Product classification |
| WebSite | Critical | Site-level identity |
| Article (blog posts) | High | Content metadata for AI |
| Person (author) | High | Author credibility signals |
| FAQPage | Medium | Semantic FAQ structure |
| BreadcrumbList | Low | Navigation context |
| speakable | Low | AI assistant readiness |

**Key actions:** Add Organization, SoftwareApplication, and WebSite schemas as STATIC JSON-LD in `index.html` (visible to all crawlers without JS). Add Article schema to blog posts via react-helmet-async.

### Platform Optimization (22/100)

| Platform | Score | Key Gap |
|---|---|---|
| Google AI Overviews | 28/100 | Not indexed; no structured data |
| Google Gemini | 20/100 | No YouTube, no Google Business Profile |
| Bing Copilot | 18/100 | No IndexNow, no Microsoft ecosystem presence |
| ChatGPT Web Search | 15/100 | GPTBot not in Prerender; zero entity signals |
| Perplexity AI | 12/100 | PerplexityBot blocked; no Reddit presence |

**Key actions:** Fix Prerender.io regex for all AI crawlers. Create LinkedIn (Bing Copilot), YouTube (Gemini), Reddit posts (Perplexity). Implement IndexNow for Bing instant indexing.

---

## Quick Wins (Implement This Week)

1. **Add AI crawler user agents to `vercel.json` Prerender.io regex** -- Single line change, unblocks all AI visibility. Expected impact: +30-40 points potential across all categories.

2. **Create `robots.txt` in `/frontend/public/`** -- 10 lines of text, allows crawlers and points to sitemap. Expected impact: Enables proper crawling.

3. **Create `llms.txt` in `/frontend/public/`** -- Plain text file describing the product for AI systems. Expected impact: Immediate AI discoverability signal.

4. **Add static fallback `<title>` and `<meta name="description">` to `index.html`** -- Safety net when prerendering fails. Expected impact: Basic indexability for all crawlers.

5. **Add Organization + SoftwareApplication JSON-LD to `index.html`** -- Static structured data visible to all crawlers. Expected impact: Entity recognition by AI models and search engines.

---

## 30-Day Action Plan

### Week 1: Fix Crawlability (CRITICAL)
- [ ] Add AI crawler user agents to Prerender.io regex in `vercel.json`
- [ ] Verify Prerender.io is actually working (test: `https://service.prerender.io/Pcx95YMiMcvsLMjJrvxj/https://legoodanfitrion.com/`)
- [ ] Create `robots.txt` with AI crawler directives in `/frontend/public/`
- [ ] Create `sitemap.xml` with all public URLs in 5 languages
- [ ] Create `llms.txt` describing the product
- [ ] Add static fallback title + description to `index.html`
- [ ] Fill Google Search Console verification token and submit sitemap
- [ ] Add Bing Webmaster Tools verification (`msvalidate.01`)

### Week 2: Add Structured Data
- [ ] Add Organization JSON-LD (static, in `index.html`)
- [ ] Add SoftwareApplication JSON-LD (static, in `index.html`)
- [ ] Add WebSite JSON-LD (static, in `index.html`)
- [ ] Add Article schema to blog post component (`blog-post-screen.jsx`)
- [ ] Add FAQPage schema to landing page FAQ section
- [ ] Add BreadcrumbList schema to SEO component
- [ ] Make Cookiebot script async

### Week 3: Build Brand Presence
- [ ] Create LinkedIn company page for LeGoodAnfitrion
- [ ] Claim Twitter/X handle
- [ ] Create YouTube channel and publish 1 product demo video
- [ ] Register on Product Hunt (upcoming)
- [ ] Create Crunchbase profile
- [ ] List on AlternativeTo.net under event management
- [ ] Update Organization schema sameAs with new profile URLs

### Week 4: Content & Authority
- [ ] Create an About page (`/about`) with founder story and team info
- [ ] Replace stock hero image with product screenshots
- [ ] Expand FAQ to 10+ questions with 50-100 word answers
- [ ] Publish 2-3 SEO-optimized blog posts ("How to manage RSVPs," "Event planning checklist")
- [ ] Seed Reddit posts in r/SaaS, r/startups, r/spain
- [ ] Add security headers via `vercel.json`
- [ ] Implement IndexNow for Bing

---

## Appendix: Pages Analyzed

| URL | Title | GEO Issues |
|---|---|---|
| https://legoodanfitrion.com/ | (empty - JS only) | 12: No SSR, no robots.txt, no sitemap, no structured data, no llms.txt, thin content, stock image, no about page, no entity signals |
| https://legoodanfitrion.com/features | (empty - JS only) | 8: No SSR, no structured data, thin content (~150 words), no comparison tables |
| https://legoodanfitrion.com/pricing | (empty - JS only) | 7: No SSR, no structured data, no pricing schema, thin content (~120 words) |
| https://legoodanfitrion.com/contact | (empty - JS only) | 6: No SSR, no structured data, thin content (~100 words) |
| https://legoodanfitrion.com/blog | (empty - JS only) | 7: No SSR, no Article schema, client-side Sanity fetch, no blog-specific sitemap |
| https://legoodanfitrion.com/privacy | (empty - JS only) | 4: No SSR, no structured data |
| https://legoodanfitrion.com/terms | (empty - JS only) | 4: No SSR, no structured data |
| https://legoodanfitrion.com/robots.txt | (returns SPA shell) | 1: File does not exist |
| https://legoodanfitrion.com/sitemap.xml | (returns SPA shell) | 1: File does not exist |
| https://legoodanfitrion.com/llms.txt | (returns SPA shell) | 1: File does not exist |

**Note:** All pages return identical empty HTML to non-JS crawlers. The "title" column shows "(empty - JS only)" because no `<title>` tag exists in the static HTML.

---

## Key Files for Implementation

| File | What to Change |
|---|---|
| `/vercel.json` (line 13) | Add AI crawler user agents to Prerender.io regex |
| `/frontend/index.html` | Add static title, description, JSON-LD schemas, GSC/Bing verification |
| `/frontend/public/robots.txt` | Create new file |
| `/frontend/public/sitemap.xml` | Create new file |
| `/frontend/public/llms.txt` | Create new file |
| `/frontend/src/components/seo.jsx` | Add JSON-LD injection capability |
| `/frontend/src/screens/blog-post-screen.jsx` | Add Article schema |
| `/frontend/src/screens/landing-screen.jsx` | Add FAQPage schema |
