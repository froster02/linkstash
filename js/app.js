    // ═══════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════
    let links = [];
    let currentFilter = 'all';
    let currentSort = 'newest';
    let currentTagFilter = '';
    let detectedType = 'link';
    let selectedTags = [];
    let gistId = null;
    let gistToken = null;
    let isBulkMode = false;
    let selectedLinkIds = new Set();
    let feedRenderCount = 0;
    const FEED_CHUNK_SIZE = 30;

    // frequently used elements (cached on DOMContentLoaded)
    let elLinkInput, elPreviewBox, elTagRow, elTotalCount, elFeedBadge;
    let elRecentList, elFeedList, elSearchInput, elToast;
    let elGistTokenInput, elGistStatus, elSyncDot, elImportBtn, elImportFile, elFeedStats;
    let elPreviewEmoji, elPreviewType, elPreviewDomain, elPreviewFavicon, elPreviewTitle;

    function cacheElements() {
      elLinkInput = document.getElementById('link-input');
      elPreviewBox = document.getElementById('preview-box');
      elTagRow = document.getElementById('tag-row');
      elTotalCount = document.getElementById('total-count');
      elFeedBadge = document.getElementById('feed-badge');
      elRecentList = document.getElementById('recent-list');
      elFeedList = document.getElementById('feed-list');
      elSearchInput = document.getElementById('search-input');
      elToast = document.getElementById('toast');
      elGistTokenInput = document.getElementById('gist-token-input');
      elGistStatus = document.getElementById('gist-status');
      elSyncDot = document.getElementById('sync-dot');
      elImportBtn = document.getElementById('import-btn');
      elImportFile = document.getElementById('import-file');
      elFeedStats = document.getElementById('feed-stats');
      elPreviewEmoji = document.getElementById('preview-emoji');
      elPreviewType = document.getElementById('preview-type');
      elPreviewDomain = document.getElementById('preview-domain');
      elPreviewFavicon = document.getElementById('preview-favicon');
      elPreviewTitle = document.getElementById('preview-title');
    }


    // ═══════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════
    async function init() {
      // Cache DOM elements first
      cacheElements();

      // Load data — wrapped in try/catch so UI always works
      // even if IndexedDB fails (Safari Private, restricted browsers)
      try {
        await idbStore.init();
        links = await idbStore.getAll();
      } catch (err) {
        console.error('IndexedDB init failed:', err);
        // App still works — just without persisted data
      }

      gistToken = localStorage.getItem('ls_gist_token') || '';
      gistId = localStorage.getItem('ls_gist_id') || '';
      if (gistToken && elGistTokenInput) elGistTokenInput.value = gistToken;

      updateUI();

      // attach event listeners
      elSearchInput.addEventListener('input', debounce(() => {
        const clearBtn = document.getElementById('search-clear');
        if (clearBtn) clearBtn.classList.toggle('visible', elSearchInput.value.length > 0);
        renderFeed();
      }, 150));

      // clear search button
      const elSearchClear = document.getElementById('search-clear');
      if (elSearchClear) {
        elSearchClear.addEventListener('click', () => {
          elSearchInput.value = '';
          elSearchClear.classList.remove('visible');
          renderFeed();
          elSearchInput.focus();
        });
      }

      elLinkInput.addEventListener('input', function () {
        const val = this.value.trim();
        if (val.startsWith('http')) analyzeUrl(val);
        else { elPreviewBox.classList.remove('visible'); elTagRow.classList.remove('visible'); selectedTags = []; }
      });
      document.getElementById('paste-btn').addEventListener('click', pasteFromClipboard);
      document.getElementById('save-btn').addEventListener('click', handleSave);
      elImportBtn.addEventListener('click', () => elImportFile.click());
      document.getElementById('save-gist-btn').addEventListener('click', saveGistToken);
      document.getElementById('sync-btn').addEventListener('click', syncNow);
      document.getElementById('export-btn').addEventListener('click', exportLinks);
      document.getElementById('clear-btn').addEventListener('click', clearAll);

      document.getElementById('close-edit-btn').addEventListener('click', closeEditModal);
      document.getElementById('save-edit-btn').addEventListener('click', saveEditModal);
      document.getElementById('confirm-cancel-btn').addEventListener('click', () => document.getElementById('confirm-modal').classList.remove('visible'));

      // filter pills delegation — click + keyboard
      document.getElementById('filter-scroll').addEventListener('click', e => {
        const pill = e.target.closest('.filter-pill');
        if (!pill) return;
        if (pill.dataset.filter) {
          setFilter(pill.dataset.filter, pill);
        } else if (pill.dataset.tag) {
          currentTagFilter = currentTagFilter === pill.dataset.tag ? '' : pill.dataset.tag;
          renderFeed();
        }
      });
      document.getElementById('filter-scroll').addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          const pill = e.target.closest('.filter-pill');
          if (pill) { e.preventDefault(); pill.click(); }
        }
      });

      // bulk toggle button
      document.getElementById('bulk-toggle-btn').addEventListener('click', () => {
        isBulkMode = !isBulkMode;
        if (!isBulkMode) selectedLinkIds.clear();
        updateBulkUI();
        renderFeed(true);
      });

      document.getElementById('bulk-cancel-btn').addEventListener('click', () => {
        isBulkMode = false;
        selectedLinkIds.clear();
        updateBulkUI();
        renderFeed(true);
      });

      // Notification init
      const notifyBtn = document.getElementById('notify-btn');
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          notifyBtn.textContent = 'Enabled';
          notifyBtn.classList.add('green');
        } else if (Notification.permission === 'denied') {
          notifyBtn.textContent = 'Blocked';
        }
        notifyBtn.addEventListener('click', async () => {
          if (Notification.permission === 'granted') return showToast('Reminders already enabled', 'success');
          try {
            const perm = await Notification.requestPermission();
            if (perm === 'granted') {
              notifyBtn.textContent = 'Enabled';
              notifyBtn.classList.add('green');
              showToast('🔔 Reminders enabled!', 'success');
              scheduleReminder();
            } else {
              notifyBtn.textContent = 'Blocked';
              showToast('Notifications blocked by browser', 'error');
            }
          } catch (err) {
            console.error(err);
            showToast('Error requesting notification permission', 'error');
          }
        });
      } else {
        notifyBtn.textContent = 'Not Supported';
        notifyBtn.disabled = true;
        notifyBtn.style.opacity = '0.5';
      }

      document.getElementById('bulk-delete-btn').addEventListener('click', async () => {
        if (!selectedLinkIds.size) return;
        showConfirmModal(`Delete ${selectedLinkIds.size} links?`, 'This cannot be undone.', 'Delete', async () => {
          links = links.filter(l => !selectedLinkIds.has(l.id));
          selectedLinkIds.clear();
          isBulkMode = false;
          await idbStore.replaceAll(links);
          updateUI();
          showToast('🗑 Selected links deleted', '');
        });
      });

      document.getElementById('bulk-export-btn').addEventListener('click', () => {
        if (!selectedLinkIds.size) return;
        const selectedLinks = links.filter(l => selectedLinkIds.has(l.id));
        const data = JSON.stringify({ links: selectedLinks, exported: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'linkstash-bulk-export.json';
        a.click();

        isBulkMode = false;
        selectedLinkIds.clear();
        updateBulkUI();
        renderFeed(true);
        showToast('📥 Selected links exported!', 'success');
      });

      document.getElementById('bulk-tag-btn').addEventListener('click', () => {
        if (!selectedLinkIds.size) return;
        document.getElementById('bulk-tags-input').value = '';
        document.getElementById('bulk-tag-modal').classList.add('visible');
        setTimeout(() => document.getElementById('bulk-tags-input').focus(), 100);
      });

      document.getElementById('close-bulk-tag-btn').addEventListener('click', () => {
        document.getElementById('bulk-tag-modal').classList.remove('visible');
      });

      document.getElementById('save-bulk-tag-btn').addEventListener('click', async () => {
        const val = document.getElementById('bulk-tags-input').value.trim();
        if (!val) {
          document.getElementById('bulk-tag-modal').classList.remove('visible');
          return;
        }
        const newTags = val.split(',').map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean).map(t => '#' + t);

        // Add new tags to all selected links
        let updatedCount = 0;
        links.forEach(l => {
          if (selectedLinkIds.has(l.id)) {
            const currentTags = l.tags || (l.tag ? [l.tag] : []);
            const merged = new Set([...currentTags, ...newTags]);
            l.tags = Array.from(merged);
            updatedCount++;
          }
        });

        await idbStore.replaceAll(links);
        document.getElementById('bulk-tag-modal').classList.remove('visible');
        isBulkMode = false;
        selectedLinkIds.clear();
        updateBulkUI();
        renderFeed(true);
        showToast(`🏷 Tags added to ${updatedCount} links`, 'success');
        if (gistToken) syncToGist();
      });

      // sort controls delegation
      document.getElementById('sort-controls').addEventListener('click', e => {
        if (e.target.id === 'bulk-toggle-btn') return;
        const btn = e.target.closest('.sort-btn');
        if (!btn) return;
        currentSort = btn.dataset.sort;
        document.querySelectorAll('.sort-btn:not(#bulk-toggle-btn)').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderFeed(true);
      });

      // bottom nav selection — click + keyboard + touch
      document.querySelectorAll('.nav-tab').forEach(tab => {
        const switchHandler = (e) => {
          if (e.type === 'touchstart') e.preventDefault(); // prevent double fire with click
          switchPage(tab.dataset.page, tab);
        };
        tab.addEventListener('click', switchHandler);
        tab.addEventListener('touchstart', switchHandler, { passive: false });
        tab.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            switchPage(tab.dataset.page, tab);
          }
        });
      });

      // Check if opened via share sheet (URL params)
      const params = new URLSearchParams(window.location.search);
      const sharedUrl = params.get('url') || params.get('text') || params.get('title');
      if (sharedUrl) {
        elLinkInput.value = sharedUrl;
        analyzeUrl(sharedUrl);
        showToast('📥 Link received from share!', 'success');
      }

      // Auto sync if token set
      if (gistToken && gistId) setTimeout(syncFromGist, 800);

      // Handle PWA shortcuts ?page= param
      const shortcutPage = params.get('page');
      if (shortcutPage && ['home', 'feed', 'settings'].includes(shortcutPage)) {
        const tab = document.querySelector(`.nav-tab[data-page="${shortcutPage}"]`);
        if (tab) switchPage(shortcutPage, tab);
      }

      // ── Google Drive Sync ──
      initDriveSync();
    }

    // ═══════════════════════════════════════════
    // GOOGLE DRIVE UI WIRING
    // ═══════════════════════════════════════════
    function initDriveSync() {
      if (typeof driveSync === 'undefined') return;

      driveSync.init((isSignedIn, profile) => {
        updateDriveUI(isSignedIn, profile);
        if (isSignedIn) {
          showToast(`✅ Successfully signed in as ${profile.name || 'Google User'}`, 'success');
          // Check last backup info
          driveSync.getBackupInfo().then(info => {
            const el = document.getElementById('drive-last-backup');
            if (info && el) {
              el.textContent = `Last backup: ${formatDriveTime(info.modifiedTime)}`;
            } else if (el) {
              el.textContent = 'No backup yet';
            }
          });
        }
      });

      // Sign in
      const signInBtn = document.getElementById('drive-signin-btn');
      if (signInBtn) {
        signInBtn.addEventListener('click', () => driveSync.signIn());
      }

      // Backup
      const backupBtn = document.getElementById('drive-backup-btn');
      if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
          try {
            backupBtn.textContent = 'Backing up...';
            backupBtn.disabled = true;
            await driveSync.backup(links);
            const el = document.getElementById('drive-last-backup');
            if (el) el.textContent = `Last backup: just now`;
            showToast('☁️ Backed up to Google Drive!', 'success');
          } catch (err) {
            console.error('Backup failed:', err);
            showToast('Backup failed: ' + err.message, 'error');
          } finally {
            backupBtn.textContent = '☁️ Backup Now';
            backupBtn.disabled = false;
          }
        });
      }

      // Restore
      const restoreBtn = document.getElementById('drive-restore-btn');
      if (restoreBtn) {
        restoreBtn.addEventListener('click', async () => {
          try {
            restoreBtn.textContent = 'Restoring...';
            restoreBtn.disabled = true;
            const data = await driveSync.restore();
            if (!data || !data.links) {
              showToast('No backup found on Drive', 'error');
              return;
            }
            // Merge: add links that don't exist locally (by URL)
            const existingUrls = new Set(links.map(l => l.url));
            let added = 0;
            for (const l of data.links) {
              if (!existingUrls.has(l.url)) {
                links.push(l);
                existingUrls.add(l.url);
                added++;
              }
            }
            if (added > 0) {
              await idbStore.replaceAll(links);
              updateUI();
            }
            showToast(`📥 Restored ${added} new links from Drive`, 'success');
          } catch (err) {
            console.error('Restore failed:', err);
            showToast('Restore failed: ' + err.message, 'error');
          } finally {
            restoreBtn.textContent = '📥 Restore';
            restoreBtn.disabled = false;
          }
        });
      }

      // Sign out
      const signOutBtn = document.getElementById('drive-signout-btn');
      if (signOutBtn) {
        signOutBtn.addEventListener('click', () => driveSync.signOut());
      }
    }

    function updateDriveUI(isSignedIn, profile) {
      const signedOutEl = document.getElementById('drive-signed-out');
      const signedInEl = document.getElementById('drive-signed-in');
      if (!signedOutEl || !signedInEl) return;

      if (isSignedIn) {
        signedOutEl.style.display = 'none';
        signedInEl.style.display = 'flex';
        const avatarEl = document.getElementById('drive-avatar');
        const nameEl = document.getElementById('drive-name');
        const emailEl = document.getElementById('drive-email');
        if (avatarEl) avatarEl.src = profile?.picture || '';
        if (nameEl) nameEl.textContent = profile?.name || 'Google User';
        if (emailEl) emailEl.textContent = profile?.email || '';
      } else {
        signedOutEl.style.display = 'flex';
        signedInEl.style.display = 'none';
      }
    }

    function formatDriveTime(isoString) {
      try {
        const d = new Date(isoString);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
        return d.toLocaleDateString();
      } catch { return isoString; }
    }

    // ═══════════════════════════════════════════
    // STORAGE (IndexedDB)
    // ═══════════════════════════════════════════
    const idbStore = {
      db: null,
      async init() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('LinkStashDB', 1);
          request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('links')) {
              db.createObjectStore('links', { keyPath: 'id' });
            }
          };
          request.onsuccess = async e => {
            this.db = e.target.result;
            // Migration from localStorage
            const oldData = localStorage.getItem('linkstash_v1');
            if (oldData) {
              try {
                const parsed = JSON.parse(oldData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  await this.replaceAll(parsed);
                  localStorage.removeItem('linkstash_v1');
                  console.log('Migrated data to IndexedDB');
                }
              } catch (err) { console.error('Migration failed', err); }
            }
            resolve();
          };
          request.onerror = e => reject(e.target.error);
        });
      },
      async getAll() {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction('links', 'readonly');
          const store = tx.objectStore('links');
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result.sort((a, b) => new Date(b.saved) - new Date(a.saved)));
          req.onerror = () => reject(req.error);
        });
      },
      async put(link) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction('links', 'readwrite');
          const store = tx.objectStore('links');
          const req = store.put(link);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      },
      async delete(id) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction('links', 'readwrite');
          const store = tx.objectStore('links');
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      },
      async replaceAll(newLinks) {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction('links', 'readwrite');
          const store = tx.objectStore('links');
          store.clear();
          newLinks.forEach(l => store.put(l));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      },
      async clear() {
        return new Promise((resolve, reject) => {
          const tx = this.db.transaction('links', 'readwrite');
          const store = tx.objectStore('links');
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }
    };

    // ═══════════════════════════════════════════
    // TYPE DETECTION
    // ═══════════════════════════════════════════
    const TYPE_MAP = [
      { type: 'youtube', emoji: '🎥', label: 'YouTube Video', patterns: [/youtube\.com/, /youtu\.be/] },
      { type: 'twitter', emoji: '🐦', label: 'Twitter / X', patterns: [/twitter\.com/, /x\.com/] },
      { type: 'github', emoji: '💻', label: 'GitHub', patterns: [/github\.com/] },
      { type: 'spotify', emoji: '🎵', label: 'Spotify', patterns: [/spotify\.com/, /open\.spotify/] },
      { type: 'instagram', emoji: '📸', label: 'Instagram', patterns: [/instagram\.com/] },
      { type: 'reddit', emoji: '🤖', label: 'Reddit', patterns: [/reddit\.com/, /redd\.it/] },
      { type: 'linkedin', emoji: '💼', label: 'LinkedIn', patterns: [/linkedin\.com/] },
      { type: 'docs', emoji: '📄', label: 'Documentation', patterns: [/docs\./, /developer\./, /developers\./, /wiki\./] },
      { type: 'shopping', emoji: '🛍', label: 'Shopping', patterns: [/amazon\./, /flipkart\./, /myntra\./, /meesho\./, /ajio\./, /shop\./] },
      { type: 'article', emoji: '📰', label: 'Article', patterns: [/medium\.com/, /dev\.to/, /hashnode/, /substack/, /blog\./] },
    ];

    function detectType(url) {
      for (const t of TYPE_MAP) {
        if (t.patterns.some(p => p.test(url))) return t;
      }
      return { type: 'link', emoji: '🔗', label: 'Link' };
    }

    function getDomain(url) {
      try {
        return new URL(url).hostname.replace(/^www\./, '');
      } catch { return url; }
    }

    function getFaviconUrl(url) {
      try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      } catch { return null; }
    }

    // ═══════════════════════════════════════════
    // ANALYZE URL (preview + tags)
    // ═══════════════════════════════════════════
    function analyzeUrl(url) {
      if (!url || !url.startsWith('http')) return;

      const info = detectType(url);
      detectedType = info.type;

      // Update preview
      const box = elPreviewBox;
      box.classList.add('visible');

      elPreviewEmoji.textContent = info.emoji;
      elPreviewType.textContent = info.label;
      elPreviewDomain.textContent = getDomain(url);

      // Try loading favicon as img
      const faviconUrl = getFaviconUrl(url);
      if (faviconUrl) {
        const faviconDiv = elPreviewFavicon;
        const safeEmojiAttr = escAttr(info.emoji);
        faviconDiv.innerHTML = `<img src="${faviconUrl}" onerror="this.outerHTML='${safeEmojiAttr}'" />`;
      }

      // Title — try to guess from URL path, then fetch real title
      try {
        const path = new URL(url).pathname;
        const parts = path.split('/').filter(Boolean);
        const last = parts[parts.length - 1] || '';
        const guessedTitle = decodeURIComponent(last.replace(/[-_]/g, ' ')).replace(/\.[^.]+$/, '') || getDomain(url);
        elPreviewTitle.textContent = guessedTitle.length > 60
          ? guessedTitle.slice(0, 60) + '…'
          : guessedTitle || 'Untitled';
      } catch {
        elPreviewTitle.textContent = getDomain(url);
      }

      // Try to fetch real title via metadata proxy
      fetchPageTitle(url);

      // Build tag suggestions
      buildTagSuggestions(info.type);
    }

    async function fetchPageTitle(url) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) return;
        const text = await res.text();
        // Extract <title> or og:title
        const ogMatch = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
          || text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
        const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
        const realTitle = ogMatch?.[1] || titleMatch?.[1] || '';
        if (realTitle && elPreviewTitle) {
          const decoded = realTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
          elPreviewTitle.textContent = decoded.length > 60 ? decoded.slice(0, 60) + '…' : decoded;
        }
      } catch {
        // Silently fail — we already have a guessed title
      }
    }

    const TAG_SUGGESTIONS = {
      youtube: ['#learning', '#entertainment', '#tutorial', '#later'],
      twitter: ['#inspo', '#news', '#thread', '#saved'],
      github: ['#dev', '#tools', '#reference', '#oss'],
      spotify: ['#music', '#podcast', '#playlist'],
      instagram: ['#inspo', '#saved', '#art'],
      reddit: ['#read', '#discussion', '#saved'],
      linkedin: ['#career', '#networking', '#jobs'],
      docs: ['#reference', '#dev', '#learning'],
      shopping: ['#buy', '#wishlist', '#compare'],
      article: ['#read', '#learning', '#research'],
      link: ['#saved', '#later', '#important', '#misc'],
    };

    function buildTagSuggestions(type) {
      const suggestions = TAG_SUGGESTIONS[type] || TAG_SUGGESTIONS.link;
      selectedTags = [suggestions[0]];

      const row = elTagRow;
      row.innerHTML = `<span style="font-size:10px;color:var(--text3);letter-spacing:1px;width:100%;margin-bottom:4px;">TAGS</span>`;

      suggestions.forEach(tag => {
        const chip = document.createElement('div');
        chip.className = 'tag-chip' + (selectedTags.includes(tag) ? ' selected' : '');
        chip.textContent = tag;
        chip.onclick = () => {
          if (selectedTags.includes(tag)) {
            selectedTags = selectedTags.filter(t => t !== tag);
            chip.classList.remove('selected');
          } else {
            selectedTags.push(tag);
            chip.classList.add('selected');
          }
        };
        row.appendChild(chip);
      });

      const customInput = document.createElement('input');
      customInput.id = 'custom-tag';
      customInput.className = '';
      customInput.style.cssText = 'flex:1;min-width:100px;background:var(--bg);border:1px solid var(--border2);border-radius:20px;padding:4px 14px;font-family:var(--mono);font-size:11px;color:var(--text);outline:none;';
      customInput.placeholder = '+ custom tag (press Enter)';

      customInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = customInput.value.trim();
          if (val) {
            const newTag = val.startsWith('#') ? val : '#' + val;
            if (!selectedTags.includes(newTag)) {
              selectedTags.push(newTag);
              // Create new chip for it
              const chip = document.createElement('div');
              chip.className = 'tag-chip selected';
              chip.textContent = newTag;
              chip.onclick = () => {
                selectedTags = selectedTags.filter(t => t !== newTag);
                chip.remove();
              };
              row.insertBefore(chip, customInput);
            }
            customInput.value = '';
          }
        }
      });
      row.appendChild(customInput);
      row.classList.add('visible');
    }

    // ═══════════════════════════════════════════
    // PASTE FROM CLIPBOARD
    // ═══════════════════════════════════════════
    async function pasteFromClipboard() {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          elLinkInput.value = text;
          analyzeUrl(text.trim());
        }
      } catch {
        showToast('📋 Tap into the text box and paste manually', 'error');
      }
    }

    // ═══════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════
    function debounce(fn, delay) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    // ═══════════════════════════════════════════
    // SAVE LINK
    // ═══════════════════════════════════════════
    async function handleSave() {
      const raw = elLinkInput.value.trim();
      if (!raw) { showToast('⚠️ Paste a URL first', 'error'); return; }

      let url = raw;
      if (!url.startsWith('http')) url = 'https://' + url;

      // URL Deduplication check
      if (links.some(l => l.url === url)) {
        showToast('⚠️ Link already saved!', 'error');
        return;
      }

      const info = detectType(url);
      const tagsToSave = selectedTags.length ? [...selectedTags] : ['#saved'];
      const title = document.getElementById('preview-title').textContent || getDomain(url);
      const domain = getDomain(url);

      const link = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
        url,
        title,
        domain,
        type: info.type,
        emoji: info.emoji,
        typeLabel: info.label,
        tags: tagsToSave,
        saved: new Date().toISOString(),
        read: false,
      };

      links.unshift(link);
      await idbStore.put(link);

      // Clear input
      elLinkInput.value = '';
      elPreviewBox.classList.remove('visible');
      document.getElementById('tag-row').classList.remove('visible');
      selectedTags = [];

      updateUI();
      showToast(`${info.emoji} Link saved!`, 'success');

      // Sync to gist in background
      if (gistToken) syncToGist();
      // Auto-backup to Drive if signed in
      if (typeof driveSync !== 'undefined' && driveSync.isSignedIn()) {
        driveSync.backup(links).catch(err => console.error('Auto Drive backup failed:', err));
      }
    }

    // ═══════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════
    function updateUI() {
      document.getElementById('total-count').textContent = links.length;
      const badge = document.getElementById('feed-badge');
      if (links.length > 0) {
        badge.textContent = links.length > 99 ? '99+' : links.length;
        badge.classList.add('show');
      } else {
        badge.classList.remove('show');
      }
      renderRecent();
      renderFeed();
    }

    function createCardElement(l) {
      const div = document.createElement('div');
      div.className = 'link-card' + (l.read ? ' read' : '');
      div.id = `card-${l.id}`;
      const timeAgo = getTimeAgo(l.saved);
      const faviconUrl = getFaviconUrl(l.url);
      const safeEmoji = escHtml(l.emoji || '🔗');
      const safeEmojiAttr = escAttr(safeEmoji);
      const faviconHtml = faviconUrl
        ? `<img src="${faviconUrl}" onerror="this.outerHTML='${safeEmojiAttr}'" />`
        : safeEmoji;

      const linkTags = l.tags || (l.tag ? [l.tag] : []);
      const tagsHtml = linkTags.map(t => `<span class="link-tag tag-${l.type}">${escHtml(t)}</span>`).join('');

      div.innerHTML = `
      <div class="link-card-accent accent-${l.type}"></div>
      <div class="link-card-body">
        <div class="link-card-top">
          <div class="link-favicon">${faviconHtml}</div>
          <div class="link-title-container">
            <div class="link-title">${escHtml(l.title)}</div>
            <a class="open-icon" href="${l.url}" target="_blank" title="Open link" aria-label="Open link">Open</a>
          </div>
        </div>
        <div class="link-card-meta">
          <span class="link-domain">${l.domain}</span>
          ${tagsHtml}
          <span class="link-time">${timeAgo}</span>
        </div>
        <div class="link-card-actions">
          <span class="link-type-badge">${l.typeLabel}</span>
          <div class="card-btns">
            <button class="card-btn" data-action="toggle-read" aria-label="${l.read ? 'Mark as unread' : 'Mark as read'}">${l.read ? '📖' : '✓'}</button>
            <button class="card-btn" data-action="edit" aria-label="Edit link">✏️</button>
            <button class="card-btn" data-action="copy" aria-label="Copy URL">⎘</button>
            <button class="card-btn del" data-action="delete" aria-label="Delete link">✕</button>
          </div>
        </div>
      </div>
    `;
      // attach listeners to buttons
      const readBtn = div.querySelector('button[data-action="toggle-read"]');
      const editBtn = div.querySelector('button[data-action="edit"]');
      const copyBtn = div.querySelector('button[data-action="copy"]');
      const delBtn = div.querySelector('button[data-action="delete"]');
      if (readBtn) readBtn.addEventListener('click', () => toggleRead(l.id));
      if (editBtn) editBtn.addEventListener('click', () => openEditModal(l.id));
      if (copyBtn) copyBtn.addEventListener('click', () => copyLink(l.url));
      if (delBtn) delBtn.addEventListener('click', () => deleteLink(l.id));

      const bulkCheck = div.querySelector('.bulk-checkbox');
      bulkCheck.addEventListener('change', e => {
        if (e.target.checked) selectedLinkIds.add(l.id);
        else selectedLinkIds.delete(l.id);
        updateBulkUI();
      });
      // also toggle checkbox when clicking the card background in bulk mode
      div.addEventListener('click', e => {
        if (isBulkMode && e.target === div || e.target.closest('.link-card-body') && !e.target.closest('button') && !e.target.closest('a')) {
          bulkCheck.checked = !bulkCheck.checked;
          bulkCheck.dispatchEvent(new Event('change'));
        }
      });

      return div;
    }

    function updateBulkUI() {
      const bar = document.getElementById('bulk-bar');
      const count = document.getElementById('bulk-count');
      const feedList = elFeedList;

      if (isBulkMode) {
        bar.classList.add('visible');
        feedList.classList.add('bulk-mode');
        count.textContent = `${selectedLinkIds.size} selected`;
      } else {
        bar.classList.remove('visible');
        feedList.classList.remove('bulk-mode');
      }

      document.getElementById('bulk-toggle-btn').classList.toggle('active', isBulkMode);
    }

    // Single intersection observer for infinite scroll
    const feedObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) renderFeed(false);
    }, { rootMargin: '100px' });

    function renderRecent() {
      const container = elRecentList;
      if (!container) return;
      container.innerHTML = '';
      if (!links.length) {
        document.getElementById('last-saved-section').style.display = 'none';
        return;
      }
      document.getElementById('last-saved-section').style.display = 'block';
      const recent = links.slice(0, 3);
      recent.forEach(l => container.appendChild(createCardElement(l)));
    }

    let currentFilteredLinks = [];

    function renderFeed(reset = true) {
      const container = elFeedList;

      if (reset) {
        feedRenderCount = 0;
        const query = elSearchInput?.value.toLowerCase() || '';

        currentFilteredLinks = [...links];
        if (currentFilter !== 'all') currentFilteredLinks = currentFilteredLinks.filter(l => l.type === currentFilter);
        if (currentTagFilter) {
          currentFilteredLinks = currentFilteredLinks.filter(l => {
            const lt = l.tags || (l.tag ? [l.tag] : []);
            return lt.includes(currentTagFilter);
          });
        }
        if (query) {
          currentFilteredLinks = currentFilteredLinks.filter(l => {
            const matchTitle = l.title.toLowerCase().includes(query);
            const matchDomain = l.domain.toLowerCase().includes(query);
            const matchUrl = l.url.toLowerCase().includes(query);
            const linkTags = l.tags || (l.tag ? [l.tag] : []);
            const matchTags = linkTags.some(t => t.toLowerCase().includes(query));
            return matchTitle || matchDomain || matchUrl || matchTags;
          });
        }

        // Sort
        switch (currentSort) {
          case 'oldest': currentFilteredLinks.sort((a, b) => new Date(a.saved) - new Date(b.saved)); break;
          case 'az': currentFilteredLinks.sort((a, b) => a.title.localeCompare(b.title)); break;
          case 'za': currentFilteredLinks.sort((a, b) => b.title.localeCompare(a.title)); break;
          default: currentFilteredLinks.sort((a, b) => new Date(b.saved) - new Date(a.saved)); break;
        }

        // Update stats text
        const statsText = document.getElementById('feed-stats-text');
        if (statsText) {
          statsText.textContent = currentFilteredLinks.length !== links.length
            ? `Showing ${currentFilteredLinks.length} of ${links.length} links`
            : `${links.length} links saved`;
        }

        // Build dynamic tag pills
        buildDynamicTagPills();

        if (!currentFilteredLinks.length) {
          container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">${links.length ? '🔍' : '📂'}</div>
        <div class="empty-title">${links.length ? 'No matches' : 'Your feed is empty'}</div>
        <div class="empty-sub">${links.length ? 'Try a different search or filter' : 'Save links from the Home tab to see them here'}</div>
      </div>`;
          return;
        }

        container.innerHTML = '';
        if (isBulkMode) container.classList.add('bulk-mode');
        else container.classList.remove('bulk-mode');
      }

      // Progressive render chunk
      const chunk = currentFilteredLinks.slice(feedRenderCount, feedRenderCount + FEED_CHUNK_SIZE);
      if (!chunk.length) return; // Nothing more to render

      // Remove old observer target if exists
      const oldTrigger = document.getElementById('load-more-trigger');
      if (oldTrigger) feedObserver.unobserve(oldTrigger);

      chunk.forEach(l => container.appendChild(createCardElement(l)));
      feedRenderCount += chunk.length;

      // Add new observer target if more remaining
      if (feedRenderCount < currentFilteredLinks.length) {
        const trigger = document.createElement('div');
        trigger.id = 'load-more-trigger';
        trigger.style.height = '20px';
        container.appendChild(trigger);
        feedObserver.observe(trigger);
      }
    }

    function buildDynamicTagPills() {
      // Remove old dynamic pills
      document.querySelectorAll('.filter-pill.tag-pill').forEach(p => p.remove());

      // Collect unique tags from all links
      const tagSet = new Set();
      links.forEach(l => {
        const lt = l.tags || (l.tag ? [l.tag] : []);
        lt.forEach(t => tagSet.add(t));
      });

      if (!tagSet.size) return;

      const scroll = document.getElementById('filter-scroll');
      tagSet.forEach(tag => {
        const pill = document.createElement('div');
        pill.className = 'filter-pill tag-pill' + (currentTagFilter === tag ? ' active' : '');
        pill.dataset.tag = tag;
        pill.setAttribute('role', 'button');
        pill.setAttribute('tabindex', '0');
        pill.setAttribute('aria-pressed', currentTagFilter === tag ? 'true' : 'false');
        pill.textContent = tag;
        scroll.appendChild(pill);
      });
    }



    function escHtml(s) { return s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : ''; }
    function escAttr(s) { return s ? String(s).replace(/'/g, "\\'") : ''; }

    function getTimeAgo(iso) {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      if (d < 7) return `${d}d ago`;
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // ═══════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════
    let editingLinkId = null;

    function openEditModal(id) {
      const link = links.find(l => l.id === id);
      if (!link) return;
      editingLinkId = id;
      document.getElementById('edit-title-input').value = link.title;
      const linkTags = link.tags || (link.tag ? [link.tag] : []);
      document.getElementById('edit-tags-input').value = linkTags.join(', ');
      document.getElementById('edit-modal').classList.add('visible');
    }

    function closeEditModal() {
      editingLinkId = null;
      document.getElementById('edit-modal').classList.remove('visible');
    }

    async function saveEditModal() {
      if (!editingLinkId) return;
      const link = links.find(l => l.id === editingLinkId);
      if (!link) return;

      const title = document.getElementById('edit-title-input').value.trim();
      if (title) link.title = title;

      const tagsRaw = document.getElementById('edit-tags-input').value;
      const tagsRawArr = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);
      const finalTags = tagsRawArr.map(t => t.startsWith('#') ? t : '#' + t);
      link.tags = finalTags.length ? finalTags : ['#saved'];
      link.tag = finalTags.length ? finalTags[0] : '#saved'; // backcompat

      await idbStore.put(link);
      updateUI();
      closeEditModal();
      if (gistToken) syncToGist();
      showToast('✏️ Link updated', 'success');
    }

    async function toggleRead(id) {
      const link = links.find(l => l.id === id);
      if (!link) return;
      link.read = !link.read;
      await idbStore.put(link);
      updateUI();
      if (gistToken) syncToGist();
    }

    let deletedLinkCache = null;
    let deleteTimeout = null;

    async function commitDelete() {
      if (!deletedLinkCache) return;
      await idbStore.delete(deletedLinkCache.id);
      if (gistToken) syncToGist();
      deletedLinkCache = null;
    }

    async function deleteLink(id) {
      if (deletedLinkCache) await commitDelete();

      const link = links.find(l => l.id === id);
      if (!link) return;

      deletedLinkCache = link;
      links = links.filter(l => l.id !== id);
      updateUI();

      const t = document.getElementById('toast');
      t.innerHTML = `<span>🗑 Link deleted</span> <button id="undo-btn" style="background:transparent;border:1px solid rgba(255,255,255,0.2);color:var(--text);border-radius:6px;padding:3px 10px;margin-left:12px;cursor:pointer;font-size:11px;transition:0.15s;">Undo</button>`;
      t.className = 'show';

      const undoBtn = document.getElementById('undo-btn');
      undoBtn.onmouseenter = () => undoBtn.style.background = 'rgba(255,255,255,0.1)';
      undoBtn.onmouseleave = () => undoBtn.style.background = 'transparent';
      undoBtn.onclick = () => {
        clearTimeout(deleteTimeout);
        links.unshift(deletedLinkCache);
        links.sort((a, b) => new Date(b.saved) - new Date(a.saved));
        deletedLinkCache = null;
        updateUI();
        showToast('↩️ Link restored', 'success');
      };

      clearTimeout(toastTimer);
      clearTimeout(deleteTimeout);
      deleteTimeout = setTimeout(async () => {
        await commitDelete();
        t.classList.remove('show');
      }, 5000);
    }

    function copyLink(url) {
      navigator.clipboard.writeText(url).then(() => showToast('⎘ URL copied!', 'success')).catch(() => showToast('Copy failed', 'error'));
    }

    // ═══════════════════════════════════════════
    // FILTER
    // ═══════════════════════════════════════════
    function setFilter(filter, el) {
      currentFilter = filter;
      currentTagFilter = '';
      document.querySelectorAll('.filter-pill').forEach(p => {
        p.classList.remove('active');
        p.setAttribute('aria-pressed', 'false');
      });
      el.classList.add('active');
      el.setAttribute('aria-pressed', 'true');
      renderFeed();
    }

    // ═══════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════
    function switchPage(page, el) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('active');
        t.removeAttribute('aria-current');
      });
      document.getElementById('page-' + page).classList.add('active');
      el.classList.add('active');
      el.setAttribute('aria-current', 'page');
      if (page === 'feed') renderFeed();
    }

    // ═══════════════════════════════════════════
    // TOAST
    // ═══════════════════════════════════════════
    let toastTimer;
    function showToast(msg, type) {
      if (deletedLinkCache && msg !== '↩️ Link restored') {
        commitDelete();
        clearTimeout(deleteTimeout);
      }
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.className = 'show ' + (type || '');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
    }

    // ═══════════════════════════════════════════
    // GITHUB GIST SYNC
    // ═══════════════════════════════════════════
    async function findExistingGist(token) {
      try {
        const res = await fetch('https://api.github.com/gists', {
          headers: { 'Authorization': `token ${token}` }
        });
        if (!res.ok) return null;
        const gists = await res.json();
        const existing = gists.find(g => g.description === 'LinkStash — My saved links' && g.files['linkstash.json']);
        return existing || null;
      } catch (e) {
        return null;
      }
    }

    async function saveGistToken() {
      const token = document.getElementById('gist-token-input').value.trim();
      if (!token) { showToast('⚠️ Enter a token first', 'error'); return; }
      gistToken = token;
      localStorage.setItem('ls_gist_token', token);
      showToast('🔐 Token saved! Searching for existing gist...', '');
      const existing = await findExistingGist(token);
      if (existing) {
        gistId = existing.id;
        localStorage.setItem('ls_gist_id', gistId);
        showToast('✓ Connected to existing gist!', 'success');
        const statusEl = document.getElementById('gist-status');
        statusEl.textContent = `✓ Connected · Gist ID: ${gistId}`;
        statusEl.className = 'gist-status ok';
        await syncFromGist();
      } else {
        showToast('Creating new gist...', '');
        await syncToGist();
      }
    }

    function setSyncStatus(s) {
      const dot = document.getElementById('sync-dot');
      if (!dot) return;
      dot.className = s;
    }

    async function syncToGist() {
      if (!gistToken) return;
      setSyncStatus('syncing');
      try {
        const data = JSON.stringify({ links }, null, 2);
        const body = {
          description: 'LinkStash — My saved links',
          public: false,
          files: { 'linkstash.json': { content: data } }
        };

        let res;
        if (gistId) {
          res = await fetch(`https://api.github.com/gists/${gistId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${gistToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
        } else {
          res = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 'Authorization': `token ${gistToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          });
        }

        if (!res.ok) throw new Error('API error ' + res.status);
        const json = await res.json();
        gistId = json.id;
        localStorage.setItem('ls_gist_id', gistId);
        setSyncStatus('synced');
        const statusEl = document.getElementById('gist-status');
        statusEl.textContent = `✓ Connected · Gist ID: ${gistId}`;
        statusEl.className = 'gist-status ok';
      } catch (e) {
        setSyncStatus('error');
        const statusEl = document.getElementById('gist-status');
        statusEl.textContent = '✕ Sync failed. Check your token.';
        statusEl.className = 'gist-status err';
      }
    }

    async function syncFromGist() {
      if (!gistToken || !gistId) return;
      try {
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
          headers: { 'Authorization': `token ${gistToken}` }
        });
        if (!res.ok) return;
        const json = await res.json();
        const content = json.files?.['linkstash.json']?.content;
        if (content) {
          const parsed = JSON.parse(content);
          if (parsed.links && Array.isArray(parsed.links)) {
            // Only update if gist has different data (merge strategy)
            const cloudHash = JSON.stringify(parsed.links).slice(0, 50);
            const localHash = JSON.stringify(links).slice(0, 50);
            if (cloudHash !== localHash) {
              // Merge: keep local + add missing cloud links
              const existingIds = new Set(links.map(l => l.id));
              const newLinks = parsed.links.filter(l => !existingIds.has(l.id));
              links = [...links, ...newLinks].sort((a, b) => new Date(b.saved) - new Date(a.saved));
              await idbStore.replaceAll(links);
              updateUI();
              if (newLinks.length > 0) showToast(`🔄 Synced ${newLinks.length} new link(s)`, 'success');
            }
          }
        }
      } catch (e) { }
    }

    async function syncNow() {
      await syncToGist();
      await syncFromGist();
      showToast('🔄 Sync complete!', 'success');
    }

    // ═══════════════════════════════════════════
    // EXPORT / IMPORT / CLEAR
    // ═══════════════════════════════════════════
    function exportLinks() {
      const format = document.getElementById('export-format')?.value || 'json';
      let data, mime, filename;
      if (format === 'csv') {
        const header = ['url', 'title', 'domain', 'type', 'tag', 'saved', 'read'];
        const rows = links.map(l => header.map(k => {
          let v = l[k] || '';
          return '"' + String(v).replace(/"/g, '""') + '"';
        }).join(','));
        data = [header.join(','), ...rows].join('\n');
        mime = 'text/csv';
        filename = 'linkstash-export.csv';
      } else if (format === 'txt') {
        data = links.map(l => l.url).join('\n');
        mime = 'text/plain';
        filename = 'linkstash-export.txt';
      } else {
        data = JSON.stringify({ links, exported: new Date().toISOString() }, null, 2);
        mime = 'application/json';
        filename = 'linkstash-export.json';
      }
      const blob = new Blob([data], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      showToast('📥 Export downloaded!', 'success');
    }

    // ═══════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════
    function scheduleReminder() {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const unread = links.filter(l => !l.read).length;
      if (unread === 0) return;

      // Schedule a notification for 2 hours from now if there are unread links.
      // In a real PWA, you'd use Periodic Background Sync or Web Push API, 
      // but setTimeout works fine while the app is active/backgrounded.
      setTimeout(async () => {
        try {
          const sw = await navigator.serviceWorker.ready;
          sw.showNotification('LinkStash Reminder', {
            body: `You have ${unread} unread links piled up. Take a moment to read them!`,
            icon: '/linkstash/icon-192.png',
            badge: '/linkstash/icon-192.png',
            tag: 'unread-reminder',
          });
        } catch (e) {
          console.error("Failed to show notification:", e);
        }
      }, 1000 * 60 * 60 * 2); // 2 hours
    }

    function importLinks(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = JSON.parse(e.target.result);
          const imported = data.links || data;
          if (!Array.isArray(imported)) throw new Error();
          // Merge, avoid duplicates by id
          const existingIds = new Set(links.map(l => l.id));
          const newLinks = imported.filter(l => !existingIds.has(l.id));
          links = [...newLinks, ...links];
          idbStore.replaceAll(links);
          updateUI();
          showToast(`✓ Imported ${newLinks.length} new links`, 'success');
        } catch {
          showToast('✕ Invalid file format', 'error');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    async function clearAll() {
      showConfirmModal('Delete ALL saved links?', 'This action cannot be undone. All your saved links will be permanently deleted.', 'Delete All', async () => {
        links = [];
        await idbStore.clear();
        updateUI();
        showToast('🗑 All links cleared', '');
      });
    }

    function showConfirmModal(title, message, actionLabel, onConfirm) {
      document.getElementById('confirm-title').textContent = title;
      document.getElementById('confirm-message').textContent = message;
      const okBtn = document.getElementById('confirm-ok-btn');
      okBtn.textContent = actionLabel;
      okBtn.onclick = () => {
        document.getElementById('confirm-modal').classList.remove('visible');
        onConfirm();
      };
      document.getElementById('confirm-modal').classList.add('visible');
    }

    // ═══════════════════════════════════════════
    // SERVICE WORKER REGISTRATION
    // ═══════════════════════════════════════════
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { });
      });
    }

    // ═══════════════════════════════════════════
    // SHARE TARGET HANDLER (Web Share Target API)
    // ═══════════════════════════════════════════
    window.addEventListener('DOMContentLoaded', () => {
      init();
    });
