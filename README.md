# 🍽 Dishwise

Synthesized recipes, ad-free. Search any dish, get a clean recipe built from the best sources, build your week plan, and generate a combined grocery list.

---

## Deploy in ~10 minutes

### Step 1 — Download & unzip
Unzip the `dishwise.zip` file you downloaded. You'll have a `dishwise/` folder.

---

### Step 2 — Open GitHub and create a repository

1. Go to **github.com** and sign in
2. Click the **+** icon (top right) → **New repository**
3. Name it `dishwise`
4. Set it to **Private**
5. Click **Create repository**
6. GitHub will show you a page with setup commands — keep this tab open

---

### Step 3 — Upload your code to GitHub

If you're comfortable with the terminal, open it in the `dishwise/` folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/dishwise.git
git push -u origin main
```

**No terminal?** Use GitHub Desktop (free at desktop.github.com):
1. Download and install GitHub Desktop
2. File → Add Local Repository → select your `dishwise/` folder
3. Click "Publish repository" → make it Private → Publish

---

### Step 4 — Deploy on Vercel

1. Go to **vercel.com** and sign in
2. Click **"Add New Project"**
3. Click **"Import"** next to your `dishwise` repository
4. Vercel will auto-detect Next.js — no config changes needed
5. **Before clicking Deploy**, click **"Environment Variables"** and add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-...` (your full Anthropic API key)
6. Click **Deploy**
7. Wait ~60 seconds — Vercel will give you a live URL like `dishwise.vercel.app`

---

### Step 5 — Add to your phone (optional but great)

**iPhone:**
1. Open your Vercel URL in Safari
2. Tap the Share button (box with arrow)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add** — Dishwise now lives on your home screen like an app

**Android:**
1. Open your Vercel URL in Chrome
2. Tap the three-dot menu
3. Tap **"Add to Home screen"**

---

## Add app icons (optional)

The manifest references `icon-192.png` and `icon-512.png` in the `public/` folder.
To add real icons:
1. Create a square PNG image (your logo or any food icon)
2. Save a 192×192px version as `public/icon-192.png`
3. Save a 512×512px version as `public/icon-512.png`
4. Push to GitHub — Vercel redeploys automatically

Free icon generators: **favicon.io** or **realfavicongenerator.net**

---

## Local development

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
npm run dev
# Open http://localhost:3000
```

---

## Cost estimate

Anthropic charges per token. A typical recipe search uses ~1,000–1,500 tokens.
At current Sonnet pricing (~$3/million input tokens):
- 100 recipe searches ≈ $0.30–0.45
- Personal use: likely under $2/month

Monitor usage at **console.anthropic.com**

---

## Project structure

```
dishwise/
├── app/
│   ├── layout.tsx          # PWA meta tags, fonts
│   ├── page.tsx            # Root page
│   └── api/recipe/
│       └── route.ts        # Server-side Anthropic proxy (key stays safe here)
├── components/
│   └── App.tsx             # Full React app
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── icon-192.png        # App icon (add your own)
│   └── icon-512.png        # App icon (add your own)
├── .env.local.example      # Copy to .env.local, add your key
├── .gitignore              # Keeps .env.local out of Git
└── README.md
```
