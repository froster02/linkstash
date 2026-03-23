# 🔖 LinkStash

A fast, beautiful, offline-first link manager for your home screen. Save, organize, and retrieve links instantly with a native app experience.

## ✨ Features

- **📱 Install like a native app** — Add to your home screen from Safari
- **🌙 Apple-inspired design** — Clean dark UI with smooth interactions
- **🔗 Lightning-fast saving** — One-tap link capture from Safari share sheet
- **🚫 Works offline** — All your links available without internet
- **☁️ Cloud sync optional** — Keep links in sync across devices via GitHub Gist
- **🔍 Smart browsing** — Search and filter your links instantly
- **💾 Zero sign-up** — No account required (GitHub token is optional)

## 📂 Project Structure

```text
linkstash/
├── .github/
│   ├── agent.md                ← AI agent project guide
│   └── LLMmodel-instruction.md ← LLM coding instructions
├── css/
│   ├── styles.css              ← Core styles (variables, layout, components)
│   └── apple.css               ← Apple-inspired theme + responsive overrides
├── js/
│   └── app.js                  ← All application logic
├── assets/icons/
│   ├── icon-192.png            ← App icon (home screen)
│   └── icon-512.png            ← App icon (splash screen)
├── scripts/
│   └── gen_icons.py            ← Icon generation script
├── tests/
│   ├── test.js                 ← JSDOM smoke test
│   └── test_puppeteer.js       ← Puppeteer browser test
├── index.html                  ← HTML structure
├── manifest.json               ← PWA configuration
├── sw.js                       ← Service worker (offline support)
└── README.md
```

---

## 🚀 Quick Start (Deployment)

### Step 1: Create a GitHub Repository

1. Go to <https://github.com/new>
2. Name it: `linkstash`
3. Set to **Public** (required for free GitHub Pages)
4. Click **Create repository**

### Step 2: Upload Files

Push or upload the entire project directory to the repository.

### Step 3: Enable GitHub Pages

1. Go to **Settings** → **Pages** (left sidebar)
2. Under "Branch" select `main` and folder `/root`
3. Click **Save**
4. Wait ~60 seconds for deployment
5. Your app is now live at: `https://YOUR-USERNAME.github.io/linkstash/`

---

## 📲 Install on iPhone

1. Open the app URL in **Safari**
2. Tap **Share** (⬆️ in bottom bar)
3. Scroll down → tap **"Add to Home Screen"**
4. Name it `LinkStash` → tap **Add**

Done! LinkStash is now on your home screen like a native app.

---

## 💡 How to Use

### Save Links (Home Tab)

1. Open any webpage in Safari
2. Tap **Share** → find **LinkStash** in the list
3. The URL appears in LinkStash instantly
4. Optionally add tags/notes
5. Tap **Save**

### Browse Links (Feed Tab)

- **Search** — Find links by title, domain, or tags
- **Filter** — Sort by type, date, or tags
- **Tap a link** — Opens in new tab

### Settings Tab

- **Cloud sync** — Optional GitHub Gist integration
- **Data export** — Download your links as JSON, CSV, or plain text
- **Import/Clear** — Manage your data

---

## ☁️ Cloud Sync (Optional)

Keep your links in sync across all your devices:

1. Go to <https://github.com/settings/tokens/new>
2. Create a new token with note `LinkStash`
3. Check only the `gist` scope
4. Click **Generate token** and copy it
5. In LinkStash Settings → paste your GitHub token
6. Tap **Save & Connect**

Your links will now sync to a private GitHub Gist accessible from any device!

---

## 🛠 Technical Details

- **No backend required** — Everything runs in your browser
- **No dependencies** — Zero npm packages, pure vanilla JS
- **IndexedDB storage** — Fast, reliable local data
- **Service Worker** — Works completely offline
- **Responsive design** — Optimized for phones, tablets, and landscape
- **Safe area support** — Proper notch/Dynamic Island handling (iOS 13+)

---

## 📝 License & Contributing

This is an open-source project. Feel free to fork, modify, and deploy!
