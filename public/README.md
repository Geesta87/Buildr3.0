# Buildr 3.0

AI-powered website builder using Claude. Describe what you want, get a stunning website in seconds.

## Features

### Core Features
- 🤖 **Claude AI** - Smart website generation with deep understanding
- ⚡ **Real-time preview** - See your site as it's built
- 🎨 **Premium designs** - Professional quality output
- 📱 **Fully responsive** - Works on all devices
- 💾 **Project saving** - Save and revisit your projects
- 🖼️ **Smart images** - Auto-fetches relevant images from Unsplash
- 🎬 **Video backgrounds** - HD videos from Pexels
- 🔤 **Google Fonts** - Beautiful typography
- 🎯 **Iconify icons** - Thousands of icons

### Enhanced Features (NEW!)
- ✨ **AOS Scroll Animations** - Sections animate in beautifully
- 🌓 **Dark/Light Mode Toggle** - User theme preference
- ⌨️ **Typed.js Typewriter** - Dynamic hero headlines  
- 🎉 **Confetti Celebration** - Form submission celebration
- 🗺️ **Leaflet Maps** - Interactive maps (FREE, no API key!)
- 📝 **Web3Forms** - Working contact forms (FREE)
- 💬 **Tawk.to Chat** - Live chat widget (FREE)
- 📲 **PWA Support** - Installable as an app
- 🎨 **AI Images** - Custom AI-generated images (Replicate)

## Environment Variables

Create `.env.local` with:

```
ANTHROPIC_API_KEY=your_key          # Required
UNSPLASH_ACCESS_KEY=your_key        # Required for images
PEXELS_API_KEY=your_key             # Required for videos
REPLICATE_API_KEY=your_key          # Optional for AI images
NEXT_PUBLIC_SUPABASE_URL=your_url   # Required for saving
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

## Quick Start

### 1. First Time Setup

1. Download and unzip this folder
2. Install [Git](https://git-scm.com/download/win) if you don't have it
3. Install [Node.js](https://nodejs.org/) if you don't have it

### 2. Set Your API Keys

Open `.env.local` and add your API keys

### 3. Push to GitHub & Deploy

**Windows:** Double-click `PUSH-TO-GITHUB.bat`

**Mac/Linux:** Run `./push-to-github.sh` in terminal

### 4. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Import your `buildr-3` repository
4. Add environment variables
5. Deploy!

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Free Services Used

| Service | Purpose | Cost |
|---------|---------|------|
| AOS.js | Scroll animations | FREE |
| Typed.js | Typewriter effect | FREE |
| Confetti | Celebration | FREE |
| Leaflet | Interactive maps | FREE |
| Web3Forms | Contact forms | FREE |
| Tawk.to | Live chat | FREE |
| LottieFiles | Animations | FREE |

---

Built with ❤️ using Claude
