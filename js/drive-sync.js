// ═══════════════════════════════════════════
// GOOGLE DRIVE SYNC MODULE
// ═══════════════════════════════════════════
// Uses Google Identity Services (GIS) for OAuth 2.0
// and Google Drive API v3 appDataFolder for private backup.
// No backend required — runs entirely in the browser.

const driveSync = (() => {
  // ── CONFIG ──
  const CLIENT_ID = '968567278491-t8fjcbug4aoffust7f20950n2dm1gjeh.apps.googleusercontent.com';
  const SCOPES = 'https://www.googleapis.com/auth/drive.appdata profile email';
  const BACKUP_FILENAME = 'linkstash_backup.json';
  const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

  let tokenClient = null;
  let accessToken = null;
  let userProfile = null;
  let gapiInited = false;
  let gisInited = false;
  let onAuthChange = null; // callback: (isSignedIn, profile) => {}

  // ── INITIALIZATION ──

  function initGapiClient() {
    return new Promise((resolve, reject) => {
      if (typeof gapi === 'undefined') {
        console.warn('Google API client not loaded');
        return reject(new Error('gapi not loaded'));
      }
      gapi.load('client', async () => {
        try {
          await gapi.client.init({});
          await gapi.client.load(DISCOVERY_DOC);
          gapiInited = true;
          resolve();
        } catch (err) {
          console.error('GAPI init error:', err);
          reject(err);
        }
      });
    });
  }

  function initTokenClient() {
    if (typeof google === 'undefined' || !google.accounts) {
      console.warn('Google Identity Services not loaded');
      return;
    }
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) {
          console.error('OAuth error:', resp);
          return;
        }
        accessToken = resp.access_token;
        localStorage.setItem('ls_drive_linked', 'true');
        // Immediately notify UI of sign-in (don't wait for profile)
        if (onAuthChange) onAuthChange(true, null);
        // Then fetch profile in background and update UI again
        fetchUserProfile().then(() => {
          if (onAuthChange) onAuthChange(true, userProfile);
        }).catch(err => {
          console.warn('Profile fetch failed, but sign-in succeeded:', err);
        });
      },
    });
    gisInited = true;
  }

  async function init(authChangeCallback) {
    onAuthChange = authChangeCallback;
    try {
      await initGapiClient();
    } catch (e) {
      // gapi not available — Drive sync disabled
    }
    initTokenClient();
  }

  // ── AUTH ──

  function signIn() {
    if (!tokenClient) {
      console.error('Token client not initialized. Is the Google script loaded?');
      return;
    }
    if (accessToken) {
      // Already have a token, request consent again (for re-auth)
      tokenClient.requestAccessToken({ prompt: '' });
    } else {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    }
  }

  function autoSignIn() {
    if (localStorage.getItem('ls_drive_linked') === 'true' && tokenClient) {
      // Refresh token silently without prompting the user
      tokenClient.requestAccessToken({ prompt: '' });
    }
  }

  function signOut() {
    localStorage.removeItem('ls_drive_linked');
    if (accessToken) {
      google.accounts.oauth2.revoke(accessToken, () => {
        accessToken = null;
        userProfile = null;
        if (onAuthChange) onAuthChange(false, null);
      });
    } else {
      if (onAuthChange) onAuthChange(false, null);
    }
  }

  function isSignedIn() {
    return !!accessToken;
  }

  function getProfile() {
    return userProfile;
  }

  async function fetchUserProfile() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) {
        userProfile = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch user profile:', e);
    }
  }

  // ── DRIVE FILE OPERATIONS ──

  async function findBackupFile() {
    try {
      const response = await gapi.client.drive.files.list({
        spaces: 'appDataFolder',
        fields: 'files(id, name, modifiedTime)',
        q: `name='${BACKUP_FILENAME}'`,
        pageSize: 1,
      });
      const files = response.result.files;
      return files && files.length > 0 ? files[0] : null;
    } catch (err) {
      console.error('Drive list error:', err);
      throw err;
    }
  }

  async function backup(links) {
    if (!accessToken || !gapiInited) {
      throw new Error('Not authenticated or GAPI not ready');
    }

    const data = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      linkCount: links.length,
      links: links,
    }, null, 2);

    const existing = await findBackupFile();

    if (existing) {
      // Update existing file
      return updateFile(existing.id, data);
    } else {
      // Create new file
      return createFile(data);
    }
  }

  async function createFile(content) {
    const metadata = {
      name: BACKUP_FILENAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([content], { type: 'application/json' }));

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      body: form,
    });

    if (!res.ok) throw new Error(`Create file failed: ${res.status}`);
    return res.json();
  }

  async function updateFile(fileId, content) {
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: content,
    });

    if (!res.ok) throw new Error(`Update file failed: ${res.status}`);
    return res.json();
  }

  async function restore() {
    if (!accessToken || !gapiInited) {
      throw new Error('Not authenticated or GAPI not ready');
    }

    const file = await findBackupFile();
    if (!file) {
      return null; // No backup exists
    }

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const data = await res.json();
    return data;
  }

  async function getBackupInfo() {
    if (!accessToken || !gapiInited) return null;
    try {
      const file = await findBackupFile();
      if (!file) return null;
      return {
        id: file.id,
        modifiedTime: file.modifiedTime,
      };
    } catch {
      return null;
    }
  }

  // ── PUBLIC API ──
  return {
    init,
    signIn,
    autoSignIn,
    signOut,
    isSignedIn,
    getProfile,
    backup,
    restore,
    getBackupInfo,
  };
})();
