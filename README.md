# Buildr 3.0

AI-powered website builder using Claude Opus 4.5. Describe what you want, get a stunning website in seconds.

## Features

- 🤖 **Claude Opus 4.5** - Most advanced AI for code generation
- ⚡ **Real-time preview** - See your site as it's built
- 🎨 **Premium designs** - Awwwards-quality output
- 📱 **Fully responsive** - Works on all devices
- 💾 **Download code** - Export clean HTML

## Quick Start

### 1. First Time Setup

1. Download and unzip this folder
2. Install [Git](https://git-scm.com/download/win) if you don't have it
3. Install [Node.js](https://nodejs.org/) if you don't have it

### 2. Set Your API Key

Open `.env.local` and replace `your_api_key_here` with your actual Claude API key from [console.anthropic.com](https://console.anthropic.com/)

### 3. Push to GitHub & Deploy

**Windows:** Double-click `PUSH-TO-GITHUB.bat`

**Mac/Linux:** Run `./push-to-github.sh` in terminal

The script will:
1. Ask you to create a GitHub repo (first time only)
2. Push your code to GitHub
3. Vercel will auto-deploy (if connected)

### 4. Connect to Vercel (First Time)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Import your `buildr-3` repository
4. Add environment variable: `ANTHROPIC_API_KEY` = your key
5. Deploy!

## Updating

Whenever you want to update the live site:

1. Make changes to any files
2. Double-click `PUSH-TO-GITHUB.bat` (Windows) or run `./push-to-github.sh` (Mac)
3. Done! Vercel auto-deploys in ~60 seconds

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

Built with ❤️ using Claude
