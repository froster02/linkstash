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

## 📂 Project Files

```
index.html      ← Main app (HTML structure)
apple.css       ← Apple-inspired dark theme + responsive layout
sw.js           ← Service worker (offline support)
manifest.json   ← PWA config (for home screen install)
icon-192.png    ← App icon (home screen)
icon-512.png    ← App icon (splash screen)
```

---

## 🚀 Quick Start (Deployment)

### Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Name it: `linkstash`
3. Set to **Public** (required for free GitHub Pages)
4. Click **Create repository**

### Step 2: Upload Files

Click **"Upload Files"** and add all 6 files:
- `index.html`
- `apple.css`
- `manifest.json`
- `sw.js`
- `icon-192.png`
- `icon-512.png`

Then commit changes.

### Step 3: Enable GitHub Pages

1. Go to **Settings** → **Pages** (left sidebar)
2. Under "Branch" select `main` and folder `/root`
3. Click **Save**
4. Wait ~60 seconds for deployment
5. Your app is now live at: `https://YOUR-USERNAME.github.io/linkstash/`

---

## 📲 Install on iPhone

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

### Browse Links (Discover Tab)
- **Search** — Find links by title, domain, or tags
- **Filter** — Sort by type, date, or tags
- **Tap a link** — Opens in new tab

### Organize (Feed Tab)
- View all saved links with metadata
- See domain, saved time, and custom tags
- Delete or share links

### Settings Tab
- **Dark mode** — Always on (Apple-inspired dark theme)
- **Cloud sync** — Optional GitHub Gist integration
- **Data export** — Download your links as JSON

---

## ☁️ Cloud Sync (Optional)

Keep your links in sync across all your devices:

1. Go to https://github.com/settings/tokens/new
2. Create a new token with note `LinkStash`
3. Check only the `gist` scope
4. Click **Generate token** and copy it
5. In LinkStash Settings → paste your GitHub token
6. Tap **Save & Connect**

Your links will now sync to a private GitHub Gist accessible from any device!

---

## 🛠 Technical Details

- **No backend required** — Everything runs in your browser
- **IndexedDB storage** — Fast, reliable local data
- **Service Worker** — Works completely offline
- **Responsive design** — Optimized for phones, tablets, and landscape
- **Safe area support** — Proper notch/Dynamic Island handling (iOS 13+)

---

## 📝 License & Contributing

This is an open-source project. Feel free to fork, modify, and deploy!

---

## 🎨 Design

LinkStash features a modern Apple-inspired dark interface with:
- Clean typography using system fonts
- Subtle shadows and glass-morphism effects
- Smooth animations and transitions
- Full dark mode with proper contrast
- Responsive layout for all screen sizes
