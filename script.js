/*
  SECRET GOLF TOUR — CATEGORY PLAYLIST LOADER
  Full replacement script.js

  Loads each category from its own playlist through the Cloudflare Worker.
  Each video opens inside its own card; other players are not removed.
  The API key must remain a Cloudflare Worker secret named YOUTUBE_API_KEY.
*/
"use strict";

const WORKER_URL = "https://secret-golf-playlist.kambli-himanshu.workers.dev/videos";
const PAGE_SIZE = 12;

const PLAYLISTS = [
  { key: "influencers", id: "PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n", grid: "influencers-grid", note: "influencers-note", label: "Golf Influencers" },
  { key: "lpga", id: "PL1m3Bw6VGCWSIkzpxSfnm5nvOKjBQDlIj", grid: "lpga-grid", note: "lpga-note", label: "LPGA & KLPGA" },
  { key: "swing", id: "PL1m3Bw6VGCWTFtTx9KRJRmKZ_dSWkgJlv", grid: "swing-grid", note: "swing-note", label: "Swing Analysis" },
  { key: "stories", id: "PL1m3Bw6VGCWSUW80LYY9bilDhW-FpYUsK", grid: "stories-grid", note: "stories-note", label: "Golf Stories" }
];

const allGrid = document.getElementById("video-grid");
const allStatus = document.getElementById("status");
const loadMoreWrap = document.getElementById("load-more-wrap");
const errorHelp = document.getElementById("error-help");
const loadedVideos = new Map();
const categoryNextTokens = new Map();

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function thumbnailFor(video) {
  return video.thumbnail ||
    `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function videoCardHtml(video) {
  const videoId = String(video.videoId || "").trim();
  if (!videoId) return "";
  const title = escapeHtml(video.title || "Secret Golf Tour video");
  const thumb = escapeHtml(thumbnailFor(video));
  const date = formatDate(video.publishedAt);
  return `
    <article class="video-card" data-video-id="${escapeHtml(videoId)}" data-video-title="${title}">
      <div class="inline-player" hidden style="display:none"></div>
      <button class="video-thumb play-inline-button" type="button" aria-label="Play ${title} on this website">
        <img src="${thumb}" alt="${title}" loading="lazy">
        <span class="play-badge">▶ PLAY VIDEO</span>
      </button>
      <div class="video-info">
        <h3>${title}</h3>
        ${date ? `<p class="video-date">${escapeHtml(date)}</p>` : ""}
        <button class="watch-button play-inline-button" type="button">Play on this website ▶</button>
      </div>
    </article>`;
}

function appendVideos(grid, videos, uniqueAcrossPage = false) {
  if (!grid || !Array.isArray(videos)) return;
  const html = [];
  for (const video of videos) {
    if (!video || !video.videoId) continue;
    const id = String(video.videoId);
    if (uniqueAcrossPage && loadedVideos.has(id)) continue;
    if (uniqueAcrossPage) loadedVideos.set(id, video);
    html.push(videoCardHtml(video));
  }
  if (html.length) grid.insertAdjacentHTML("beforeend", html.join(""));
}

async function fetchPlaylist(playlistId, maxResults = PAGE_SIZE, pageToken = "") {
  const url = new URL(WORKER_URL);
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(maxResults));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || `Playlist request failed (HTTP ${response.status}).`);
  }
  return data;
}

async function loadCategory(playlist) {
  const grid = document.getElementById(playlist.grid);
  const note = document.getElementById(playlist.note);
  if (!grid || !note) return [];
  note.textContent = `Loading ${playlist.label} videos…`;
  try {
    const data = await fetchPlaylist(playlist.id, PAGE_SIZE);
    const videos = Array.isArray(data.videos) ? data.videos : [];
    appendVideos(grid, videos);
    if (data.nextPageToken) categoryNextTokens.set(playlist.key, data.nextPageToken);
    note.textContent = videos.length
      ? `${videos.length} ${playlist.label} videos loaded.`
      : `No public videos were returned for ${playlist.label}.`;
    return videos;
  } catch (error) {
    console.error(`Secret Golf Tour ${playlist.label} playlist error:`, error);
    note.textContent = `Could not load ${playlist.label} videos. Please use “Open full playlist on YouTube” below.`;
    return [];
  }
}

async function loadAllVideos() {
  if (!allGrid || !allStatus) return;
  allStatus.textContent = "Loading videos from all four Secret Golf Tour playlists…";
  if (errorHelp) errorHelp.hidden = true;
  try {
    const results = await Promise.all(PLAYLISTS.map(async (playlist) => {
      try {
        const data = await fetchPlaylist(playlist.id, 6);
        return Array.isArray(data.videos) ? data.videos : [];
      } catch (error) {
        console.error(`Could not load ${playlist.label} for All Videos:`, error);
        return [];
      }
    }));
    const merged = [];
    const seen = new Set();
    for (const videos of results) {
      for (const video of videos) {
        if (video.videoId && !seen.has(video.videoId)) {
          seen.add(video.videoId);
          merged.push(video);
        }
      }
    }
    appendVideos(allGrid, merged, true);
    allStatus.textContent = merged.length
      ? `${merged.length} videos loaded from the four category playlists.`
      : "No videos loaded. Check the Cloudflare Worker and its YOUTUBE_API_KEY secret.";
    if (loadMoreWrap) loadMoreWrap.hidden = true;
    if (!merged.length && errorHelp) errorHelp.hidden = false;
  } catch (error) {
    console.error("Secret Golf Tour all-videos error:", error);
    allStatus.textContent = "We couldn't load the videos. Please check the Cloudflare Worker.";
    if (errorHelp) errorHelp.hidden = false;
  }
}

function playVideoInCard(card) {
  if (!card) return;
  const videoId = String(card.dataset.videoId || "").trim();
  const player = card.querySelector(".inline-player");
  const thumbnailButton = card.querySelector(".video-thumb");
  const playButton = card.querySelector(".watch-button");
  if (!videoId || !player) return;

  // Preserve an existing player rather than restarting it.
  if (player.querySelector("iframe")) return;

  player.hidden = false;
  player.style.display = "block";
  player.style.width = "100%";
  player.style.aspectRatio = "16 / 9";
  player.style.position = "relative";
  player.style.overflow = "hidden";
  player.style.background = "#000";

  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`;
  iframe.title = card.dataset.videoTitle || "Secret Golf Tour video";
  iframe.loading = "eager";
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  Object.assign(iframe.style, {
    position: "absolute", inset: "0", width: "100%", height: "100%",
    border: "0", display: "block"
  });
  player.appendChild(iframe);

  if (thumbnailButton) {
    thumbnailButton.hidden = true;
    thumbnailButton.style.display = "none";
  }
  if (playButton) {
    playButton.textContent = "Playing on this page";
    playButton.disabled = true;
    playButton.style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const menuButton = document.getElementById("menu-button");
  if (menuButton) {
    menuButton.addEventListener("click", () => {
      const nav = document.querySelector("nav");
      if (!nav) return;
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    });
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".play-inline-button");
    if (button) playVideoInCard(button.closest(".video-card"));
  });

  // Load category playlists and the combined All Videos grid independently.
  Promise.all(PLAYLISTS.map(loadCategory));
  loadAllVideos();
});
