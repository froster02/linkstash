# 🔖 LinkStash — Deployment Guide

## Files in this folder
```
index.html      ← Main app
manifest.json   ← PWA config (for iPhone home screen)
sw.js           ← Service worker (offline support)
icon-192.png    ← App icon
icon-512.png    ← App icon (large)
```

---

## Step 1: Create a GitHub Repository

1. Go to https://github.com/new
2. Name it: `linkstash` (or anything you like)
3. Set to **Public** ← required for free GitHub Pages
4. Click **Create repository**

---

## Step 2: Upload Files

On the repo page, click **"uploading an existing file"** and drag all 5 files:
- index.html
- manifest.json
- sw.js
- icon-192.png
- icon-512.png

Click **Commit changes**.

---

## Step 3: Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages** (left sidebar)
2. Under "Branch" → select `main` → folder `/root`
3. Click **Save**
4. Wait ~60 seconds → your app is live at:
   **`https://YOUR-USERNAME.github.io/linkstash/`**

---

## Step 4: Install on iPhone

1. Open the URL above in **Safari** on your iPhone
2. Tap the **Share button** (the box with arrow at bottom)
3. Scroll down → tap **"Add to Home Screen"**
4. Tap **Add**

LinkStash is now installed like a native app! 🎉

---

## Step 5: Use from Safari Share Sheet

1. Open any webpage in Safari
2. Tap **Share** (□↑)
3. Scroll through apps → find **LinkStash**
4. Tap it → app opens with the URL ready to save

---

## Step 6: Enable Cloud Sync (optional, keeps links across devices)

1. Go to https://github.com/settings/tokens/new
2. Set note: `LinkStash`
3. Check only the `gist` scope
4. Click **Generate token** → copy it
5. In LinkStash → Settings tab → paste token → tap **Save & Connect**

Your links now sync to a private GitHub Gist — accessible from all devices!

---

## That's it! 🚀

- **Save links**: Paste URL on Home tab → Save
- **Browse links**: Feed tab with search + filters
- **Share from Safari**: Share sheet → LinkStash
- **Cross-device sync**: Settings → GitHub token
