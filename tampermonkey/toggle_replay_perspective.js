// ==UserScript==
// @name         Toggle Replay Perspective (Player Name & ID Version)
// @match        https://www.duelingbook.com/replay?id=*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Parse current player and replay ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const idParam = urlParams.get("id"); // e.g., "1152984-69223469"
  const [currentPlayerId, replayId] = idParam?.split("-") || [];

  if (!currentPlayerId || !replayId) {
    console.warn("⚠️ Failed to parse current player ID or replay ID.");
    return;
  }

  // Hook fetch
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = args[0];
    if (typeof url === "string" && url.includes("/view-replay")) {
      return originalFetch.apply(this, args).then(async response => {
        const clone = response.clone();
        try {
          const json = await clone.json();
          handleReplayJSON(json);
        } catch (err) {
          console.error("❌ Fetch JSON parse failed", err);
        }
        return response;
      });
    }

    return originalFetch.apply(this, args);
  };

  // Hook XHR
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    this.addEventListener('load', function () {
      const url = this._url;
      if (url.includes("/view-replay")) {
        try {
          const json = JSON.parse(this.responseText);
          handleReplayJSON(json);
        } catch (err) {
          console.error("❌ XHR JSON parse failed", err);
        }
      }
    });

    return originalSend.apply(this, arguments);
  };

  function handleReplayJSON(json) {
    const p1_id = json?.player1?.user_id?.toString();
    const p2_id = json?.player2?.user_id?.toString();
    const p1_name = json?.player1?.username || "Player 1";
    const p2_name = json?.player2?.username || "Player 2";

    if (p1_id && p2_id) {
      const isViewingP1 = currentPlayerId === p1_id;
      const otherId = isViewingP1 ? p2_id : p1_id;
      const otherName = isViewingP1 ? p2_name : p1_name;

      const newURL = `https://www.duelingbook.com/replay?id=${otherId}-${replayId}`;
      insertLink(newURL, p1_name, p1_id, p2_name, p2_id);
    } else {
      console.warn("⚠️ Missing one or both player IDs in response.");
    }
  }

  function insertLink(url, p1_name, p1_id, p2_name, p2_id) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => addLink(url, p1_name, p1_id, p2_name, p2_id));
    } else {
      addLink(url, p1_name, p1_id, p2_name, p2_id);
    }
  }

  function addLink(url, p1_name, p1_id, p2_name, p2_id) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.textContent = `Switch player perspectives`;
    link.style.position = "fixed";
    link.style.top = "10px";
    link.style.right = "10px";
    link.style.zIndex = "10000";
    link.style.background = "#f0f0f0";
    link.style.border = "1px solid #ccc";
    link.style.padding = "6px 10px";
    link.style.borderRadius = "6px";
    link.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
    link.style.fontSize = "14px";
    link.style.textDecoration = "none";
    link.style.color = "#333";

    document.body.appendChild(link);
  }
})();

