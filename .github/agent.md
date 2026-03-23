# LinkStash — Agent Guide

## Project Overview

LinkStash is a **Progressive Web App (PWA)** — a personal link manager designed for mobile-first use. It allows users to save, organize, search, and sync URLs across devices. It's deployed on **GitHub Pages** as a static site with no backend.

## Architecture

```
linkstash/
├── index.html            ← HTML structure only (no inline CSS/JS)
├── css/
│   ├── styles.css        ← Core styles (vars, layout, components)
│   └── apple.css         ← Apple-inspired theme overrides + responsive
├── js/
│   └── app.js            ← All application logic (single file)
├── assets/icons/         ← PWA icons (192px, 512px)
├── manifest.json         ← PWA manifest (install config, share target)
├── sw.js                 ← Service worker (offline & caching)
├── scripts/              ← Dev tooling (icon generation)
└── tests/                ← Test files (JSDOM, Puppeteer)
```

## Tech Stack

| Layer     | Technology                       |
| --------- | -------------------------------- |
| Frontend  | Vanilla HTML, CSS, JavaScript    |
| Storage   | IndexedDB (via `idbStore`)       |
| Sync      | GitHub Gist API (optional)       |
| Offline   | Service Worker (network-first)   |
| Hosting   | GitHub Pages (static)            |
| Fonts     | Google Fonts (JetBrains Mono, Clash Display) |

## Key Patterns

### Navigation
- **3-tab SPA** (Home, Feed, Settings) — uses CSS `.page.active` toggling
- **Event delegation** on `#bottom-nav` for cross-browser reliability
- `switchPage(page, tab)` function handles all tab switching

### Data Flow
- All links stored in **IndexedDB** via the `idbStore` object
- Optional cloud sync via **GitHub Gist** (token stored in localStorage)
- Links are arrays of objects with: `id`, `url`, `title`, `domain`, `type`, `tags`, `savedAt`, `read`

### Styling Architecture
- `css/styles.css` — base variables, layout, all component styles
- `css/apple.css` — Apple-inspired design overrides (loaded second, uses `!important`)
- CSS custom properties defined in `:root` for theming

### Service Worker
- **Network-first** strategy (fetch from network, fallback to cache)
- Cache name versioned (bump version when deploying file changes)

## Conventions

- **No build step** — everything is vanilla, no bundler/transpiler
- **No external JS libraries** — zero dependencies
- **Mobile-first design** — max-width 480px app shell
- **Emoji as icons** — link type badges, nav placeholders
- **SVG inline icons** — bottom navigation uses inline SVG

## Common Tasks

### Adding a new link type
1. Add detection rule in `detectType()` function in `js/app.js`
2. Add a filter pill in `#filter-scroll` in `index.html`
3. Add accent color mapping in `getTypeColor()` in `js/app.js`

### Modifying styles
1. Edit `css/styles.css` for core styles
2. Edit `css/apple.css` for theme-specific overrides
3. Apple.css loads second and uses `!important` — be aware of specificity

### Testing
- `tests/test.js` — JSDOM-based headless test
- `tests/test_puppeteer.js` — Puppeteer browser test
- Run with `node tests/test.js` or `node tests/test_puppeteer.js` (requires local server)
