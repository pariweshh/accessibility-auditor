# Architecture Documentation

## System Overview

The Accessibility Auditor is a serverless Next.js application that combines browser automation, accessibility testing, and AI-powered suggestions.

```
┌─────────────┐
│   Browser   │
│   (User)    │
└──────┬──────┘
       │
       │ HTTP Request
       ▼
┌─────────────────────────────┐
│      Next.js Frontend        │
│  (React Components + UI)     │
└──────────┬──────────────────┘
           │
           │ API Calls
           ▼
┌─────────────────────────────┐
│   Next.js API Routes         │
│   (Serverless Functions)     │
└──────┬────────────┬─────────┘
       │            │
       │            │
       ▼            ▼
┌──────────┐  ┌──────────┐
│Puppeteer │  │ OpenAI   │
│ + axe    │  │   API    │
└──────────┘  └──────────┘
```

## Component Architecture

### Frontend Layer

**Location:** `app/`, `components/`

1. **Page Component** (`app/page.tsx`)

   - Root component
   - Manages scan state
   - Renders ScanForm or ResultsDisplay

2. **ScanForm** (`components/ScanForm.tsx`)

   - URL input validation
   - API request handling
   - Loading states

3. **ResultsDisplay** (`components/ResultsDisplay.tsx`)

   - Summary statistics
   - Issue list rendering
   - Navigation controls

4. **IssueCard** (`components/IssueCard.tsx`)
   - Individual issue display
   - AI fix request handling
   - Expandable details

### API Layer

**Location:** `app/api/`

1. **Scan Route** (`app/api/scan/route.ts`)

   - URL validation
   - Security checks
   - Puppeteer orchestration
   - Response formatting

2. **Fix Suggestions Route** (`app/api/fix-suggestions/route.ts`)
   - Issue prioritization
   - OpenAI API calls
   - Batch processing

### Business Logic Layer

**Location:** `lib/`

1. **Scanner** (`lib/scanner.ts`)

   - Browser lifecycle management
   - Page rendering
   - axe-core integration
   - Result processing

2. **AI Fixer** (`lib/ai-fixer.ts`)

   - Prompt engineering
   - OpenAI API integration
   - Response parsing
   - Error handling

3. **Types** (`lib/types.ts`)
   - TypeScript interfaces
   - Type definitions
   - Shared contracts

## Data Flow

### Scan Flow

```
1. User enters URL
   ↓
2. ScanForm validates URL
   ↓
3. POST /api/scan
   ↓
4. scanner.ts launches browser
   ↓
5. Puppeteer loads page
   ↓
6. axe-core injected and runs
   ↓
7. Results processed and categorized
   ↓
8. Response sent to frontend
   ↓
9. ResultsDisplay renders issues
```

### AI Fix Flow

```
1. User clicks "Get AI Fix"
   ↓
2. IssueCard requests fix
   ↓
3. POST /api/fix-suggestions
   ↓
4. ai-fixer.ts formats prompt
   ↓
5. OpenAI API call
   ↓
6. Response parsed
   ↓
7. Fix displayed in UI
```

## Technology Decisions

### Why Next.js 16?

- **App Router:** Server components by default
- **API Routes:** Built-in serverless functions
- **TypeScript:** First-class support
- **Deployment:** Optimized for Vercel
- **Performance:** Automatic code splitting

### Why Puppeteer?

- **Real Browser:** Tests actual rendered output
- **JavaScript Execution:** Handles SPAs correctly
- **Industry Standard:** Well-maintained and documented
- **Headless Mode:** Efficient for servers

### Why axe-core?

- **Comprehensive:** Tests 90+ WCAG rules
- **Accurate:** Industry-leading false-positive rate
- **Open Source:** Free and community-driven
- **Integration:** Easy to use with Puppeteer

### Why OpenAI GPT-4o-mini?

- **Cost-Effective:** 10x cheaper than GPT-4
- **Quality:** Sufficient for accessibility fixes
- **Speed:** Fast response times
- **JSON Mode:** Structured output support

## Performance Considerations

### Browser Reuse

```typescript
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) {
    return browser; // Reuse existing instance
  }
  browser = await puppeteer.launch({...});
  return browser;
}
```

**Benefits:**

- 1-2 second faster subsequent scans
- Reduced memory usage
- Lower CPU overhead

### Lazy Loading

- Components loaded on-demand
- axe-core loaded via CDN (not bundled)
- Dynamic imports for heavy libraries

### Timeout Optimization

```typescript
await page.goto(url, {
  waitUntil: "domcontentloaded", // Faster than 'networkidle2'
  timeout: 15000, // Stays within 10s Vercel limit
})
```

## Security Architecture

### Input Validation

```typescript
// URL validation
new URL(url) // Throws if invalid

// Blocked hosts
if (hostname === "localhost" || hostname.startsWith("192.168.")) {
  return error("Cannot scan internal URLs")
}
```

### API Key Protection

```typescript
// Server-side only
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Never exposed to client
})
```

### External Link Security

```html
<a target="_blank" rel="noopener noreferrer">
  <!-- Prevents tabnabbing attacks -->
</a>
```

## Scalability Considerations

### Current Limitations

- **Single Region:** Vercel deploys to one region (free tier)
- **No Caching:** Each scan is fresh
- **Sequential Processing:** One scan at a time per function

### Future Improvements

1. **Caching Layer:**

```typescript
// Redis/Upstash for scan results
const cached = await redis.get(`scan:${url}`)
if (cached) return cached
```

2. **Database Storage:**

```typescript
// PostgreSQL/Supabase for history
await db.scans.create({ url, result, timestamp })
```

3. **Queue System:**

```typescript
// Background jobs for large scans
await queue.add("scan", { url })
```

## Monitoring & Observability

### Logging

```typescript
console.error("Scan error:", error) // Vercel captures these
```

### Metrics (Future)

- Scan duration
- Success/failure rate
- API costs
- Error types

## Deployment Architecture

### Vercel Serverless
