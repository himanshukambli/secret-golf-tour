/*
  SECRET GOLF TOUR — AUTOMATIC YOUTUBE PLAYLIST GALLERY
  This file calls your Cloudflare Worker. Keep the YouTube API key in
  Cloudflare as a secret; never put it in this public file.
*/

const WORKER_URL = "https://secret-golf-playlist.kambli-himanshu.workers.dev/videos";
const PAGE_SIZE = 24;

const grid = document.getElementById("video-grid");
const statusBox = document.getElementById("status");
const loadMoreWrap = document.getElementById("load-more-wrap");
const errorHelp = document.getElementById("error-help");

let nextPageToken = "";
let loading = false;
let loadedCount = 0;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getThumbnail(video) {
  return video.thumbnail ||
    `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function renderVideos(videos) {
  const html = videos.map((video) => {
    const videoId = String(video.videoId || "").trim();
    if (!videoId) return "";

    const title = escapeHtml(video.title || "Secret Golf Tour video");
    const thumbnail = escapeHtml(getThumbnail(video));
    const description = escapeHtml(video.description || "");
    const published = formatDate(video.publishedAt);
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

    return `
      <article class="video-card">
        <a class="video-thumb" href="${watchUrl}" target="_blank"
           rel="noopener noreferrer" aria-label="Watch ${title} on YouTube">
          <img src="${thumbnail}" alt="${title}" loading="lazy"
               onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg';">
          <span class="play-badge">▶ WATCH VIDEO</span>
        </a>
        <div class="video-info">
          <h3>${title}</h3>
          ${published ? `<p class="video-date">${escapeHtml(published)}</p>` : ""}
          ${description ? `<p class="video-description">${description}</p>` : ""}
          <a class="watch-button" href="${watchUrl}" target="_blank"
             rel="noopener noreferrer">Watch on YouTube ↗</a>
        </div>
      </article>
    `;
  }).join("");

  if (html) {
    grid.insertAdjacentHTML("beforeend", html);
    loadedCount = grid.querySelectorAll(".video-card").length;
  }
}

async function loadVideos(append = false) {
  if (loading || !grid || !statusBox) return;

  loading = true;
  statusBox.textContent = append
    ? "Loading more videos…"
    : "Loading Secret Golf Tour videos…";

  if (errorHelp) errorHelp.hidden = true;
  if (loadMoreWrap) loadMoreWrap.hidden = true;

  try {
    const requestUrl = new URL(WORKER_URL);
    if (nextPageToken) requestUrl.searchParams.set("pageToken", nextPageToken);
    requestUrl.searchParams.set("maxResults", String(PAGE_SIZE));

    const response = await fetch(requestUrl.toString(), {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error("The Worker returned a response that was not valid JSON.");
    }

    if (!response.ok || data.error) {
      throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
    }

    // Expected Worker response: { videos: [...], nextPageToken: "..." }
    const videos = Array.isArray(data.videos) ? data.videos : [];
    if (!append) {
      grid.innerHTML = "";
      loadedCount = 0;
    }

    renderVideos(videos);
    nextPageToken = data.nextPageToken || "";

    statusBox.textContent = loadedCount
      ? `${loadedCount} video${loadedCount === 1 ? "" : "s"} loaded from the Secret Golf Tour playlist.`
      : "No public videos were found in this playlist yet.";

    if (loadMoreWrap) loadMoreWrap.hidden = !nextPageToken;
  } catch (error) {
    console.error("Secret Golf Tour playlist error:", error);
    statusBox.textContent = "We couldn't load the video list automatically.";

    if (errorHelp) {
      errorHelp.hidden = false;
      const paragraph = errorHelp.querySelector("p");
      if (paragraph) {
        paragraph.textContent =
          "Please check that the Cloudflare Worker is deployed, its YOUTUBE_API_KEY secret is configured, and the Worker /videos endpoint is working.";
      }
    }

    if (loadMoreWrap) loadMoreWrap.hidden = true;
  } finally {
    loading = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const yearElement = document.getElementById("year");
  if (yearElement) yearElement.textContent = String(new Date().getFullYear());

  const menuButton = document.getElementById("menu-button");
  if (menuButton) {
    menuButton.addEventListener("click", () => {
      const nav = document.querySelector("nav");
      if (!nav) return;
      const isOpen = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const loadMoreButton = document.getElementById("load-more");
  if (loadMoreButton) {
    loadMoreButton.addEventListener("click", () => loadVideos(true));
  }

  if (!grid || !statusBox) {
    console.error("The gallery HTML is missing #video-grid or #status.");
    return;
  }

  loadVideos();
});
