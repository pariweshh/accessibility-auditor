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

### 4. Configure Environment

Create `.env.local`:

```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxx
NODE_ENV=development

# Optional: Specify Chrome path
CHROME_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

### 5. Install Dependencies

```bash
npm install
```

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
   - Add: `OPENAI_API_KEY` = `sk-your-key`
   - Add: `NODE_ENV` = `production`

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

**Issue: "Cannot find Chrome"**

```bash
# Set Chrome path in .env.local
CHROME_EXECUTABLE_PATH=/path/to/chrome
```

**Issue: "OpenAI API key not configured"**

```bash
# Verify .env.local exists and has correct key
cat .env.local
```

**Issue: "Page timeout during scan"**

- Try a simpler/faster website
- Increase timeout in `lib/scanner.ts`
- Upgrade to Vercel Pro for 60-second timeout

**Issue: "Out of memory"**

- Scan simpler pages
- Reduce concurrent scans
- Upgrade to Vercel Pro for more memory

### Getting Help

- Check [GitHub Issues](https://github.com/YOUR_USERNAME/accessibility-auditor/issues)
- Read [Next.js Docs](https://nextjs.org/docs)
- Ask on [Stack Overflow](https://stackoverflow.com/questions/tagged/nextjs)
