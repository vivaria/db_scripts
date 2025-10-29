// ==UserScript==
// @name         DuelingBook: Auto-download replay JSON
// @description  Download JSON responses from https://www.duelingbook.com/view-replay?id=... (captures fetch + XHR).
// @version      1.1
// @author       vivaria
// @license      MIT
// @homepageURL  https://github.com/vivaria/db_scripts
// @updateURL    https://github.com/vivaria/db_scripts/raw/main/tampermonkey/download_replay_json.user.js
// @downloadURL  https://github.com/vivaria/db_scripts/raw/main/tampermonkey/download_replay_json.user.js
// @match        *://www.duelingbook.com/replay*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ----- Configuration -----
  const REPLAY_URL_HOST = 'www.duelingbook.com';
  const REPLAY_PATH = '/view-replay';
  const BUTTON_RIGHT = '10px';
  const BUTTON_BASE_TOP_PX = 10; // top position of first button in px
  const BUTTON_SPACING_PX = 40; // vertical spacing per button (includes button height)
  const BUTTON_ZINDEX = 10000;

  // Toggle auto-download behavior:
  const AUTO_DOWNLOAD = false; // set to false to restore click-only behavior

  // Keep track
  const discovered = new Map(); // id -> {json, url}
  const downloaded = new Set(); // ids already auto-downloaded

  // Utility: create a button styled like user's existing style
  function createDownloadButton(id, url) {
    const index = discovered.size; // 0-based index
    const topPx = BUTTON_BASE_TOP_PX + index * BUTTON_SPACING_PX;

    const link = document.createElement('a');
    link.href = '#';
    link.dataset.replayId = id;
    link.textContent = `Download replay ${id}`;
    link.style.position = 'fixed';
    link.style.top = `${topPx}px`;
    link.style.right = BUTTON_RIGHT;
    link.style.zIndex = String(BUTTON_ZINDEX);
    link.style.background = '#f0f0f0';
    link.style.border = '1px solid #ccc';
    link.style.padding = '6px 10px';
    link.style.borderRadius = '6px';
    link.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    link.style.fontSize = '14px';
    link.style.textDecoration = 'none';
    link.style.color = '#333';
    link.style.cursor = 'pointer';
    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', `Download replay JSON for id ${id}`);

    link.addEventListener('click', (e) => {
      e.preventDefault();
      const record = discovered.get(id);
      if (!record || !record.json) {
        // Fallback: try to fetch directly if we don't have the body
        fetchReplayAndDownload(id);
        return;
      }
      triggerDownload(record.json, `duelingbook-replay-${id}.json`);
    });

    document.body.appendChild(link);
  }

  // Trigger file download from a JS object or string
  function triggerDownload(data, filename) {
    const jsonText = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    // Append and click to avoid popup blockers in some browsers
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // If we missed capturing the body, try to fetch it directly (with credentials)
  async function fetchReplayAndDownload(id) {
    const url = `${location.protocol}//${REPLAY_URL_HOST}${REPLAY_PATH}?id=${encodeURIComponent(id)}`;
    try {
      const resp = await fetch(url, { credentials: 'include' });
      const body = await resp.json();
      discovered.set(id, { json: body, url });
      // Create button if not present
      if (![...document.querySelectorAll('a')].some(a => a.dataset && a.dataset.replayId === id)) {
        createDownloadButton(id, url);
      }
      // Auto-download if enabled & not already downloaded
      if (AUTO_DOWNLOAD && !downloaded.has(id)) {
        downloaded.add(id);
        triggerDownload(body, `duelingbook-replay-${id}.json`);
      }
    } catch (err) {
      console.error('Failed to fetch replay JSON for', id, err);
    }
  }

  // Called when we detect and successfully obtain a JSON response for a replay
  function onReplayCaptured(id, json, url) {
    const already = discovered.has(id);
    discovered.set(id, { json, url });

    if (!already) {
      createDownloadButton(id, url);
    }

    // Auto-download if enabled and not yet downloaded
    if (AUTO_DOWNLOAD && !downloaded.has(id)) {
      try {
        downloaded.add(id);
        triggerDownload(json, `duelingbook-replay-${id}.json`);
        console.log(`Auto-downloaded replay ${id}`);
      } catch (err) {
        console.error('Auto-download failed for', id, err);
      }
    }
  }

  // Helper: check if a given URL corresponds to view-replay?id=...
  function parseReplayIdFromUrl(urlString) {
    try {
      const u = new URL(urlString, location.href);
      if (u.hostname !== REPLAY_URL_HOST) return null;
      if (!u.pathname.endsWith(REPLAY_PATH)) return null;
      return u.searchParams.get('id');
    } catch (e) {
      return null;
    }
  }

  // ---- Intercept fetch ----
  (function interceptFetch() {
    const originalFetch = window.fetch;
    if (!originalFetch) return;

    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);

      let requestUrl;
      try {
        requestUrl = (args[0] && args[0].url) || args[0];
      } catch (e) {
        requestUrl = null;
      }

      const id = requestUrl ? parseReplayIdFromUrl(requestUrl) : null;
      if (!id) {
        return response;
      }

      try {
        const cloned = response.clone();
        cloned.json().then((jsonBody) => {
          onReplayCaptured(id, jsonBody, requestUrl);
        }).catch((err) => {
          console.warn('Replay response not JSON or failed to parse for id', id, err);
        });
      } catch (err) {
        console.warn('Error handling fetch replay clone', err);
      }
      return response;
    };
  })();

  // ---- Intercept XMLHttpRequest ----
  (function interceptXHR() {
    const XHR = window.XMLHttpRequest;
    if (!XHR) return;

    function newXHR() {
      const realXHR = new XHR();
      let requestUrl = null;

      const origOpen = realXHR.open;
      realXHR.open = function (method, url, ...rest) {
        requestUrl = url;
        return origOpen.call(this, method, url, ...rest);
      };

      realXHR.addEventListener('readystatechange', function () {
        if (this.readyState === 4) { // DONE
          const id = parseReplayIdFromUrl(requestUrl);
          if (!id) return;

          try {
            if (this.responseType && this.responseType !== '' && this.responseType !== 'text') {
              const maybe = this.response;
              if (maybe) {
                onReplayCaptured(id, maybe, requestUrl);
                return;
              }
            }
            if (this.responseText) {
              const parsed = JSON.parse(this.responseText);
              onReplayCaptured(id, parsed, requestUrl);
            }
          } catch (err) {
            console.warn('Failed to parse XHR replay JSON for', id, err);
          }
        }
      });

      return realXHR;
    }

    try {
      const ProxyXHR = function () {
        return newXHR();
      };
      ProxyXHR.prototype = XHR.prototype;
      window.XMLHttpRequest = ProxyXHR;
    } catch (err) {
      console.warn('Failed to patch XMLHttpRequest', err);
    }
  })();

  // ---- Scan performance entries (if request already finished before script ran) ----
  (function scanPerformanceEntries() {
    try {
      const entries = performance.getEntriesByType('resource');
      for (const e of entries) {
        const id = parseReplayIdFromUrl(e.name);
        if (id && !discovered.has(id)) {
          discovered.set(id, { json: null, url: e.name });
          createDownloadButton(id, e.name);
          // If auto-download is enabled, attempt to fetch the body (with credentials)
          if (AUTO_DOWNLOAD && !downloaded.has(id)) {
            // fetch and download
            fetchReplayAndDownload(id);
          }
        }
      }
    } catch (err) {
      // ignore
    }
  })();

  // Done
})();
