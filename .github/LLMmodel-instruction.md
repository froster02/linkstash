# LLM Model Instructions for LinkStash

## Context

You are working on **LinkStash**, a vanilla HTML/CSS/JS Progressive Web App (PWA) with no build tools, no frameworks, and zero external JS dependencies. It is deployed as a static site on **GitHub Pages**.

## Critical Constraints

> ⚠️ **No Build Step** — There is no bundler, transpiler, or package manager. All code must be vanilla browser-compatible JavaScript (ES2020+). Do not introduce npm packages, webpack, React, Vue, Tailwind, or any framework.

> ⚠️ **Single JS File** — All logic lives in `js/app.js`. Do not split into modules unless explicitly asked (no `import`/`export` — the file is loaded via `<script src>`).

> ⚠️ **CSS Specificity** — `css/apple.css` is loaded after `css/styles.css` and uses `!important` for theme overrides. When editing styles, be aware of which file's rules will win.

> ⚠️ **Service Worker Cache** — After changing any file, bump the cache version in `sw.js` (`const CACHE = 'linkstash-vN'`) so returning users get the update.

## File Roles

| File | Purpose | Edit Frequency |
|------|---------|----------------|
| `index.html` | HTML structure, no logic/styles | Rarely |
| `css/styles.css` | All base CSS (variables, layouts, components) | Often |
| `css/apple.css` | Theme overrides, responsive breakpoints | Sometimes |
| `js/app.js` | All application logic | Often |
| `manifest.json` | PWA install config, share target | Rarely |
| `sw.js` | Offline caching, version control | On deploy |

## Code Style

- **Variables**: Use `let`/`const`, never `var`
- **Functions**: Prefer named functions over arrow for top-level declarations
- **DOM access**: Cache elements in variables at the top of `app.js` (e.g., `const elLinkInput = ...`)
- **Event handling**: Use event delegation where possible (e.g., `#bottom-nav` click handler)
- **Naming**: camelCase for JS, kebab-case for CSS classes and IDs
- **Comments**: Use `// ═══` section dividers for major code sections

## Data Model

Each saved link is an object:

```js
{
  id: "uuid-string",
  url: "https://example.com",
  title: "Page Title",
  domain: "example.com",
  type: "article",       // youtube | twitter | github | article | docs | spotify | instagram | reddit | shopping | linkedin | link
  tags: ["#tech"],
  savedAt: 1710000000000, // Unix timestamp ms
  read: false
}
```

Storage: **IndexedDB** (`LinkStashDB` → `links` object store, keyed by `id`)

## Navigation System

The app uses a 3-tab SPA pattern:
- Pages: `#page-home`, `#page-feed`, `#page-settings`
- Active page gets CSS class `.active` (shows via `opacity: 1; pointer-events: all`)
- Navigation via `switchPage(pageName, tabElement)` function
- Event delegation on `#bottom-nav` (do not add individual click listeners to tabs)

## Testing

- `tests/test.js` — JSDOM smoke test (validates HTML parses without JS errors)
- `tests/test_puppeteer.js` — Browser test (starts local server, clicks tabs, verifies navigation)
- No test framework (assert manually, check console output)

## Deployment Checklist

1. Test locally with a static server (`python3 -m http.server 8080`)
2. Bump `sw.js` cache version if any file contents changed
3. Push to `main` branch — GitHub Pages auto-deploys
4. Verify at `https://<username>.github.io/linkstash/`

## Common Pitfalls

1. **Icon paths** — Icons are at `assets/icons/icon-{192,512}.png`, not in root
2. **Manifest paths** — `start_url` and `action` use `/linkstash/` prefix for GitHub Pages
3. **CSS load order** — `apple.css` intentionally overrides `styles.css` with `!important`
4. **Touch events** — Do NOT use `touchstart` for navigation; use `click` with event delegation
5. **IndexedDB** — Always use the `idbStore` wrapper, never raw `indexedDB` calls
6. **Inline styles in HTML** — Some elements use inline `style=""` for one-off layout; prefer CSS classes for reusable styles
