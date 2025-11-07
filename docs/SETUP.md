# Setup Guide

Detailed step-by-step setup instructions for different environments.

## Local Development Setup

### 1. Install Node.js

**macOS (using Homebrew):**

```bash
brew install node@18
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/)

**Linux (Ubuntu/Debian):**

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. Install Chrome/Chromium

**macOS:**

```bash
brew install --cask google-chrome
```

**Windows:**
Download from [google.com/chrome](https://www.google.com/chrome/)

**Linux (Ubuntu/Debian):**

```bash
sudo apt-get install chromium-browser
```

### 3. Get OpenAI API Key

1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key
5. Copy and save it securely

### 3.5 Get Browserless.io API Token

1. Visit [browserless.io/sign-up](https://www.browserless.io/sign-up)
2. Sign up for free tier account
3. Verify your email
4. Go to Dashboard → API Tokens
5. Copy your token (starts with a UUID)
6. Keep it secure

**Free Tier Includes:**

- 1000 browser sessions per month
- 1 concurrent sessions
- US West (San Francisco) region
- Perfect for portfolio projects

### 4. Configure Environment

Create `.env.local`:

```env
# Required: OpenAI API for fix suggestions
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxx

# Required for Vercel deployment: Browserless token
BROWSERLESS_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Local development only
NODE_ENV=development
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

````

### 5. Install Dependencies

```bash
npm install
````

### 6. Verify Installation

```bash
# Check Node version
node --version  # Should be 18.17+

# Check npm version
npm --version

# Run development server
npm run dev
```

Visit `http://localhost:3000` - you should see the app!

**Test with these URLs:**

- `https://example.com` - Should complete in 3-5 seconds
- `https://www.w3.org/WAI/demos/bad/` - Should find multiple issues
- `https://developer.mozilla.org/` - Should handle modern site structure

## Production Deployment

### Vercel Deployment

1. **Prepare Repository:**

```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/accessibility-auditor.git
   git push -u origin main
```

2. **Deploy to Vercel:**

   - Go to [vercel.com/new](https://vercel.com/new)
   - Import your GitHub repository
   - Configure project settings:
     - Framework: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add these three variables:

```
     OPENAI_API_KEY = sk-your-key-here
     BROWSERLESS_TOKEN = your-browserless-token
     NODE_ENV = production
```

⚠️ **Important:** Without BROWSERLESS_TOKEN, scans will fail in production!

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Your app is live!

### Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown
4. Wait for DNS propagation (5-30 minutes)

## Troubleshooting

### Common Issues

**Issue: "Cannot find Chrome" (Local Development Only)**

```bash
# Set Chrome path in .env.local
CHROME_EXECUTABLE_PATH=/path/to/chrome
```

**Note:** This only affects local development. Production uses Browserless.io.

**Issue: "OpenAI API key not configured"**

```bash
# Verify .env.local exists and has correct key
cat .env.local
```

**Issue: "Page timeout during scan"**

- Try a simpler/faster website
- Increase timeout in `lib/scanner.ts`
- Upgrade to Vercel Pro for 60-second timeout

**Issue: "Failed to connect to browser" (Production)**

- Check BROWSERLESS_TOKEN is set in Vercel
- Verify token is valid at browserless.io dashboard
- Check you haven't exceeded 1000 sessions/month
- Verify WebSocket connections allowed in your network

**Issue: "Browserless session limit exceeded"**

- Check usage at browserless.io dashboard
- Free tier: 1000 sessions/month
- Consider upgrading to Pro plan if needed
- Or wait for monthly reset

### Getting Help

- Check [GitHub Issues](https://github.com/YOUR_USERNAME/accessibility-auditor/issues)
- Read [Next.js Docs](https://nextjs.org/docs)
- Ask on [Stack Overflow](https://stackoverflow.com/questions/tagged/nextjs)
