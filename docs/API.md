# API Documentation

Complete API reference for the Accessibility Auditor.

## Base URL

- **Development:** `http://localhost:3000`
- **Production:** `https://your-app.vercel.app`

## Authentication

No authentication required for public deployment. For production, consider adding API key authentication.

## Endpoints

### POST `/api/scan`

Scans a URL for accessibility issues using axe-core.

#### Request

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "url": "https://example.com",
  "includeScreenshot": false
}
```

**Parameters:**

| Parameter           | Type    | Required | Description                              |
| ------------------- | ------- | -------- | ---------------------------------------- |
| `url`               | string  | Yes      | Valid URL to scan                        |
| `includeScreenshot` | boolean | No       | Include page screenshot (default: false) |

#### Response

**Success (200):**

```json
{
  "url": "https://example.com",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "violations": [
    {
      "id": "image-alt",
      "impact": "critical",
      "description": "Ensures <img> elements have alternate text...",
      "help": "Images must have alternate text",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.8/image-alt",
      "tags": ["cat.text-alternatives", "wcag2a", "wcag111"],
      "nodes": [
        {
          "html": "<img src=\"logo.png\">",
          "target": ["#header > img"],
          "failureSummary": "Fix any of the following:\n  Element does not have an alt attribute"
        }
      ]
    }
  ],
  "passes": 45,
  "incomplete": 2,
  "summary": {
    "critical": 2,
    "serious": 5,
    "moderate": 8,
    "minor": 3
  }
}
```

**Error (400 - Bad Request):**

```json
{
  "error": "URL is required"
}
```

**Error (408 - Timeout):**

```json
{
  "error": "Page took too long to load. The free tier has a 10-second limit."
}
```

**Error (500 - Server Error):**

```json
{
  "error": "Failed to scan URL: <error details>"
}
```

#### Example Usage

**JavaScript/Fetch:**

```javascript
const response = await fetch("/api/scan", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://example.com",
  }),
})

const data = await response.json()
console.log(data.violations)
```

**cURL:**

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

**Python:**

```python
import requests

response = requests.post(
    'http://localhost:3000/api/scan',
    json={'url': 'https://example.com'}
)

data = response.json()
print(f"Found {len(data['violations'])} issues")
```

---

### POST `/api/fix-suggestions`

Generates AI-powered fix suggestions for accessibility issues.

#### Request

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "issues": [
    {
      "id": "image-alt",
      "impact": "critical",
      "description": "Ensures <img> elements have alternate text",
      "help": "Images must have alternate text",
      "helpUrl": "https://dequeuniversity.com/rules/axe/4.8/image-alt",
      "tags": ["cat.text-alternatives", "wcag2a"],
      "nodes": [
        {
          "html": "<img src=\"logo.png\">",
          "target": ["#header > img"],
          "failureSummary": "Element does not have an alt attribute"
        }
      ]
    }
  ],
  "limit": 5
}
```

**Parameters:**

| Parameter | Type   | Required | Description                                           |
| --------- | ------ | -------- | ----------------------------------------------------- |
| `issues`  | array  | Yes      | Array of accessibility issues from scan               |
| `limit`   | number | No       | Max number of fixes to generate (default: 5, max: 10) |

#### Response

**Success (200):**

```json
{
  "fixes": [
    {
      "issueId": "image-alt",
      "originalCode": "<img src=\"logo.png\">",
      "suggestedFix": "<img src=\"logo.png\" alt=\"Company Logo\">",
      "explanation": "Added descriptive alt text 'Company Logo' to the image. Alt text should describe the image's content or function. Since this appears to be a company logo in the header, 'Company Logo' is appropriate.",
      "confidence": "high"
    }
  ],
  "count": 1
}
```

**Error (400 - Bad Request):**

```json
{
  "error": "Issues array is required"
}
```

**Error (500 - Server Error):**

```json
{
  "error": "OpenAI API key not configured"
}
```

#### Example Usage

**JavaScript/Fetch:**

```javascript
const response = await fetch("/api/fix-suggestions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    issues: scanResult.violations,
    limit: 3,
  }),
})

const data = await response.json()
console.log(data.fixes)
```

---

## Rate Limits

### Vercel Free Tier

- **Bandwidth:** 100GB/month
- **Serverless Execution:** 100 hours/month
- **Function Timeout:** 10 seconds per request
- **Memory:** 1024MB per function

### OpenAI API

- **Rate Limit:** Varies by plan (typically 3-60 requests/minute)
- **Token Limit:** GPT-4o-mini: ~16,000 tokens per request
- **Cost:** ~$0.001-0.003 per fix suggestion

## Error Codes

| Code | Meaning             | Solution                                |
| ---- | ------------------- | --------------------------------------- |
| 400  | Bad Request         | Check request format and parameters     |
| 408  | Timeout             | Use simpler site or upgrade Vercel plan |
| 500  | Server Error        | Check logs for details                  |
| 503  | Service Unavailable | OpenAI API may be down, retry later     |

## Best Practices

1. **Batch Requests:** Request fixes for multiple issues at once
2. **Cache Results:** Store scan results to avoid re-scanning
3. **Error Handling:** Always handle timeout and error responses
4. **Rate Limiting:** Implement client-side rate limiting
5. **Validation:** Validate URLs before sending to API

## Response Types (TypeScript)

```typescript
interface ScanResult {
  url: string
  timestamp: string
  violations: AccessibilityIssue[]
  passes: number
  incomplete: number
  summary: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
}

interface AccessibilityIssue {
  id: string
  impact: "minor" | "moderate" | "serious" | "critical"
  description: string
  help: string
  helpUrl: string
  tags: string[]
  nodes: {
    html: string
    target: string[]
    failureSummary: string
  }[]
}

interface FixSuggestion {
  issueId: string
  originalCode: string
  suggestedFix: string
  explanation: string
  confidence: "high" | "medium" | "low"
}
```
