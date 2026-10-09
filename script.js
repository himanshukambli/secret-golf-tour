/*
  SECRET GOLF TOUR — AUTOMATIC YOUTUBE PLAYLIST GALLERY

  1. Replace PASTE_YOUR_API_KEY_HERE with your Google Cloud API key.
  2. Keep the key restricted to YouTube Data API v3 and your GitHub Pages referrer.
  3. Upload this file to the root of your GitHub repository.

  Playlist: PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n
*/
const YOUTUBE_API_KEY = "PASTE_YOUR_API_KEY_HERE";
const PLAYLIST_ID = "PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n";
const PAGE_SIZE = 24;

const grid = document.getElementById("video-grid");
const statusBox = document.getElementById("status");
const loadMoreWrap = document.getElementById("load-more-wrap");
const errorHelp = document.getElementById("error-help");
let nextPageToken = "";
let loading = false;

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function getThumbnail(thumbnails) {
  return thumbnails?.maxres?.url || thumbnails?.standard?.url ||
    thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.default?.url || "";
}

function renderItems(items) {
  const html = items.map(item => {
    const snippet = item.snippet || {};
    const resource = snippet.resourceId || {};
    const videoId = resource.videoId;
    if (!videoId || videoId === "..." || snippet.title === "Deleted video" || snippet.title === "Private video") return "";
    const title = escapeHtml(snippet.title || "Secret Golf Tour video");
    const thumb = getThumbnail(snippet.thumbnails) || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
    const category = escapeHtml(snippet.videoOwnerChannelTitle || "Secret Golf Tour");
    return `
      <article class="video-card">
        <a class="video-thumb" href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}" target="_blank" rel="noopener noreferrer" aria-label="Watch ${title} on YouTube">
          <img src="${escapeHtml(thumb)}" alt="${title}" loading="lazy">
          <span class="play-badge">▶ WATCH VIDEO</span>
        </a>
        <div class="video-info">
          <h3>${title}</h3>
          <div class="video-actions">
            <span class="video-category">${category}</span>
            <a class="watch-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}" target="_blank" rel="noopener noreferrer">WATCH ON YOUTUBE ↗</a>
          </div>
        </div>
      </article>`;
  }).join("");
  grid.insertAdjacentHTML("beforeend", html);
}

async function loadVideos(append = false) {
  if (loading) return;
  if (!YOUTUBE_API_KEY || YOUTUBE_API_KEY === "PASTE_YOUR_API_KEY_HERE") {
    statusBox.textContent = "The video gallery is ready, but the API key still needs to be added to script.js.";
    errorHelp.hidden = false;
    return;
  }

  loading = true;
  statusBox.textContent = append ? "Loading more videos…" : "Loading Secret Golf Tour videos…";
  errorHelp.hidden = true;
  loadMoreWrap.hidden = true;

  try {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      playlistId: PLAYLIST_ID,
      maxResults: String(PAGE_SIZE),
      key: YOUTUBE_API_KEY
    });
    if (nextPageToken) params.set("pageToken", nextPageToken);
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params.toString()}`);
    const data = await response.json();

    if (!response.ok || data.error) {
      const message = data.error?.message || `YouTube API returned HTTP ${response.status}`;
      throw new Error(message);
    }

    if (!append) grid.innerHTML = "";
    const items = data.items || [];
    renderItems(items);
    nextPageToken = data.nextPageToken || "";

    const count = grid.querySelectorAll(".video-card").length;
    statusBox.textContent = count
      ? `${count} video${count === 1 ? "" : "s"} loaded from the Secret Golf Tour playlist.`
      : "No public videos were found in this playlist yet.";
    loadMoreWrap.hidden = !nextPageToken;
  } catch (error) {
    console.error("YouTube playlist error:", error);
    statusBox.textContent = "We couldn't load the video list automatically.";
    errorHelp.hidden = false;
    const p = errorHelp.querySelector("p");
    if (p) p.textContent = "Check that the API key is entered in script.js, YouTube Data API v3 is enabled, and the key's website restriction includes https://himanshukambli.github.io/secret-golf-tour/. If you just changed the key restrictions, wait a few minutes and refresh. Technical detail: " + error.message;
  } finally {
    loading = false;
  }
}

document.getElementById("year").textContent = new Date().getFullYear();
const menuButton = document.querySelector(".menu");
menuButton.addEventListener("click", () => {
  const nav = document.querySelector("nav");
  const isOpen = nav.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});
document.getElementById("load-more").addEventListener("click", () => loadVideos(true));
loadVideos();
