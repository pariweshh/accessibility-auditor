# Architecture Documentation

## System Overview

The Accessibility Auditor is a serverless Next.js application that combines browser automation, accessibility testing, and AI-powered suggestions.

```
┌─────────────┐
│ Browser │
│ (User) │
└──────┬──────┘
│
│ HTTP Request
▼
┌─────────────────────────────┐
│ Next.js Frontend │
│ (React Components + UI) │
└──────────┬──────────────────┘
│
│ API Calls
▼
┌─────────────────────────────┐
│ Next.js API Routes │
│ (Serverless Functions) │
└──────┬────────────┬─────────┘
│ │
│ │
▼ ▼
┌──────────────┐ ┌──────────┐
│ Browserless │ │ OpenAI │
│ + Puppeteer │ │ API │
│ + axe-core │ │ │
└──────────────┘ └──────────┘
```

## Component Architecture

### Frontend Layer (`app/`, `components/`)

- **Page Component** - Manages scan state, renders UI
- **ScanForm** - URL input and validation
- **ResultsDisplay** - Shows scan summary
- **IssueCard** - Individual issue with AI fix integration

### API Layer (`app/api/`)

- **Scan Route** - URL validation, Puppeteer orchestration
- **Fix Suggestions Route** - OpenAI integration, batch processing

### Business Logic (`lib/`)

- **Scanner** - Browserless connection, axe-core integration
- **AI Fixer** - Prompt engineering, OpenAI API calls
- **Types** - TypeScript interfaces

## Data Flow

### Scan FlowUser enters URL → Validate → Connect to Browserless → Load page →

Inject axe-core → Run tests → Process results → Display issues

### AI Fix FlowUser clicks "Get AI Fix" → Send issue to API → Format prompt →

Call OpenAI → Parse response → Display fix

## Key Technology Decisions

### Why Browserless.io?

**Problem:** Puppeteer needs Chromium (~300MB), but Vercel's free tier limits functions to 50MB.

**Solution:** Offload browser to managed infrastructure via WebSocket connection.

**Benefits:**

- ✅ Deployment size < 5MB (vs 50MB+ with bundled Chrome)
- ✅ Cold start ~200ms (vs 2-3s launching local Chrome)
- ✅ No Chrome version management
- ✅ Free tier covers 1000 sessions/month

**Trade-offs:**

- ⚠️ +15-20ms latency (WebSocket overhead)
- ⚠️ External service dependency

### Other Technology Choices

| Technology         | Why We Chose It                                   |
| ------------------ | ------------------------------------------------- |
| **Next.js 16**     | Serverless-ready, App Router, TypeScript support  |
| **Puppeteer Core** | Industry standard browser automation              |
| **axe-core**       | Comprehensive WCAG testing (90+ rules)            |
| **GPT-4o-mini**    | Cost-effective AI ($0.001/fix vs $0.03 for GPT-4) |
| **Vercel**         | Zero-config deployment, generous free tier        |

## Performance

### Typical Scan Duration

- Simple site (example.com): 3-5 seconds
- Medium complexity: 6-8 seconds
- Complex SPA: 8-12 seconds

### Optimization Strategies

- Browser connection reuse (local dev)
- axe-core loaded via CDN (not bundled)
- `waitUntil: 'domcontentloaded'` for faster loads
- Parallel AI fix generation (future)

## Security

### Key Protections

- ✅ Server-side API keys (never exposed to client)
- ✅ URL validation and internal IP blocking
- ✅ `rel="noopener noreferrer"` on external links
- ✅ React's automatic XSS protection
- ✅ 10-second timeout prevents DoS

### Environment Variables

```envOPENAI_API_KEY=xxx # Server-side only
BROWSERLESS_TOKEN=xxx      # Server-side only
```

## Deployment Architecture

```
┌─────────────────┐
│   CDN (Edge)    │ ← Static assets (HTML, CSS, JS)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel Lambda  │ ← API routes (lightweight)
│  (Serverless)   │ ← Next.js + Puppeteer client only
└────┬────────┬───┘
     │        │
     │        └────────────┐
     ▼                     ▼
┌──────────────┐    ┌─────────────────┐
│ Browserless  │    │  External APIs  │
│  (Managed    │    │  • OpenAI       │
│   Chrome)    │    │  • axe-core CDN │
└──────────────┘    └─────────────────┘
```

**Benefits:**

- Lightweight serverless functions
- Managed browser infrastructure
- Only pay for actual usage
- Auto-scaling built-in

## Cost Breakdown (Monthly)

**Free Tier (0-1000 scans):**

- Vercel: $0
- Browserless: $0 (1000 sessions included)
- OpenAI: $5-10 (AI fixes only)
- **Total: $5-10/month**

**At Scale (10,000 scans):**

- Vercel: $0 (still within limits)
- Browserless: $90 (9,000 × $0.01) _or_ $50/month Pro plan
- OpenAI: $50 (5,000 AI fixes)
- **Total: $100-140/month**

## Error Handling

### Strategy

- **Frontend:** User-friendly messages, no technical jargon
- **Backend:** Detailed logging, graceful degradation
- **Cleanup:** Always close browser connections

### Common Errors

| Error             | Cause                   | Solution              |
| ----------------- | ----------------------- | --------------------- |
| Timeout           | Page load > 10s         | Suggest simpler sites |
| Connection Failed | Browserless unreachable | Retry with backoff    |
| Invalid URL       | Bad user input          | Validate client-side  |

## Scalability Considerations

### Current Limitations

- 10-second timeout (Vercel free tier)
- 1000 Browserless sessions/month
- No caching (every scan is fresh)
- No concurrent scan limits

### Future Improvements

1. Redis caching (60-min TTL for results)
2. Database for scan history
3. Background job queue for large scans
4. Multi-region Browserless deployment

## Development Workflow

### Local Setup

```bash
npm install
cp .env.example .env.local  # Add your API keys
npm run dev
```

### Deployment

```bash
git push origin main  # Auto-deploys to Vercel
```

### Environment Detection

```typescript
const browserlessToken = process.env.BROWSERLESS_TOKEN;if (browserlessToken) {
// Production: Connect to Browserless
browser = await puppeteer.connect({...});
} else {
// Local: Use system Chrome
browser = await puppeteer.launch({...});
}
```

## Lessons Learned

### What Went Well

✅ Browserless solved deployment constraints elegantly
✅ TypeScript caught bugs early
✅ Serverless = zero infrastructure management
✅ Modular architecture makes changes easy

### What Could Improve

⚠️ Add automated testing
⚠️ Implement result caching
⚠️ Better error monitoring (Sentry)
⚠️ Rate limiting per user

```
**Last Updated:** January 2025
**Version:** 1.0
```
