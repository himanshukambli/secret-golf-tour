/*
  SECRET GOLF TOUR — separate playlist gallery for each category.
  The YouTube API key remains in the Cloudflare Worker secret.
*/
const WORKER_URL = "https://secret-golf-playlist.kambli-himanshu.workers.dev/videos";
const PAGE_SIZE = 50;

const PLAYLISTS = [
  { id: "PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n", section: "golf-influencers", grid: "influencers-grid", note: "influencers-note", label: "Golf Influencers" },
  { id: "PL1m3Bw6VGCWSIkzpxSfnm5nvOKjBQDlIj", section: "lpga-klpga", grid: "lpga-grid", note: "lpga-note", label: "LPGA & KLPGA" },
  { id: "PL1m3Bw6VGCWTFtTx9KRJRmKZ_dSWkgJlv", section: "swing-analysis", grid: "swing-grid", note: "swing-note", label: "Swing Analysis" },
  { id: "PL1m3Bw6VGCWSUW80LYY9bilDhW-FpYUsK", section: "golf-stories", grid: "stories-grid", note: "stories-note", label: "Golf Stories" }
];

const state = { allVideos: [], nextPageTokens: {}, loading: false };

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}
function thumbFor(video) {
  return video.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(video.videoId)}/hqdefault.jpg`;
}
function dateFor(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function renderCard(video) {
  const id = String(video.videoId || "").trim();
  if (!id) return "";
  const title = escapeHtml(video.title || "Secret Golf Tour video");
  return `
    <article class="video-card" data-video-id="${escapeHtml(id)}" data-video-title="${title}">
      <div class="inline-player" hidden></div>
      <button class="video-thumb play-inline-button" type="button" aria-label="Play ${title} on this website">
        <img src="${escapeHtml(thumbFor(video))}" alt="${title}" loading="lazy">
        <span class="play-badge">▶ PLAY VIDEO</span>
      </button>
      <div class="video-info">
        <h3>${title}</h3>
        ${video.publishedAt ? `<p class="video-date">${escapeHtml(dateFor(video.publishedAt))}</p>` : ""}
        <button class="watch-button play-inline-button" type="button">Play on this website ▶</button>
      </div>
    </article>`;
}
function playInCard(card) {
  const id = card?.dataset.videoId;
  if (!id) return;
  const player = card.querySelector(".inline-player");
  const thumb = card.querySelector(".video-thumb");
  const watch = card.querySelector(".watch-button");
  // Stop other videos currently playing, to avoid multiple audio streams.
  document.querySelectorAll(".inline-player").forEach(node => {
    if (node !== player) { node.innerHTML = ""; node.hidden = true; }
  });
  document.querySelectorAll(".video-thumb").forEach(node => { if (node !== thumb) node.hidden = false; });
  document.querySelectorAll(".watch-button").forEach(node => { if (node !== watch) node.hidden = false; });
  player.hidden = false;
  player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0"
    title="${escapeHtml(card.dataset.videoTitle || "Secret Golf Tour video")}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  thumb.hidden = true;
  if (watch) watch.hidden = true;
}
function mountCards(element, videos) {
  if (element) element.innerHTML = videos.map(renderCard).join("");
}
async function fetchPlaylist(playlistId, pageToken = "") {
  const url = new URL(WORKER_URL);
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("maxResults", String(PAGE_SIZE));
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}
async function loadAllPlaylists() {
  const status = document.getElementById("status");
  const allGrid = document.getElementById("video-grid");
  const errorHelp = document.getElementById("error-help");
  if (state.loading) return;
  state.loading = true;
  if (status) status.textContent = "Loading videos from all four category playlists…";
  try {
    const results = await Promise.all(PLAYLISTS.map(async playlist => {
      const data = await fetchPlaylist(playlist.id);
      state.nextPageTokens[playlist.id] = data.nextPageToken || "";
      const videos = Array.isArray(data.videos) ? data.videos : [];
      const target = document.getElementById(playlist.grid);
      const note = document.getElementById(playlist.note);
      mountCards(target, videos);
      if (note) note.textContent = `${videos.length} videos loaded from the ${playlist.label} playlist.`;
      return videos.map(video => ({ ...video, categoryPlaylistId: playlist.id }));
    }));
    state.allVideos = results.flat();
    // Keep All Videos useful while preventing repeated videos when playlists overlap.
    const unique = [];
    const seen = new Set();
    state.allVideos.forEach(video => {
      if (video.videoId && !seen.has(video.videoId)) { seen.add(video.videoId); unique.push(video); }
    });
    mountCards(allGrid, unique);
    if (status) status.textContent = `${unique.length} videos loaded from your four Secret Golf Tour playlists. Choose a thumbnail to play directly on this website.`;
    if (errorHelp) errorHelp.hidden = true;
    const moreWrap = document.getElementById("load-more-wrap");
    if (moreWrap) moreWrap.hidden = !PLAYLISTS.some(p => state.nextPageTokens[p.id]);
  } catch (error) {
    console.error("Playlist loading error:", error);
    if (status) status.textContent = "We couldn't load one or more playlists automatically.";
    if (errorHelp) {
      errorHelp.hidden = false;
      const p = errorHelp.querySelector("p");
      if (p) p.textContent = "Please check that the Cloudflare Worker has been updated with the new multi-playlist code and the YOUTUBE_API_KEY secret is configured.";
    }
    PLAYLISTS.forEach(playlist => {
      const note = document.getElementById(playlist.note);
      if (note) note.textContent = "This category playlist could not be loaded. Please check the Cloudflare Worker configuration.";
    });
  } finally {
    state.loading = false;
  }
}
async function loadMoreVideos() {
  if (state.loading) return;
  state.loading = true;
  const status = document.getElementById("status");
  try {
    const moreResults = await Promise.all(PLAYLISTS.map(async playlist => {
      const token = state.nextPageTokens[playlist.id];
      if (!token) return [];
      const data = await fetchPlaylist(playlist.id, token);
      state.nextPageTokens[playlist.id] = data.nextPageToken || "";
      const newVideos = Array.isArray(data.videos) ? data.videos : [];
      const grid = document.getElementById(playlist.grid);
      if (grid && newVideos.length) grid.insertAdjacentHTML("beforeend", newVideos.map(renderCard).join(""));
      const note = document.getElementById(playlist.note);
      if (note) {
        const count = grid ? grid.querySelectorAll(".video-card").length : newVideos.length;
        note.textContent = `${count} videos loaded from the ${playlist.label} playlist.`;
      }
      return newVideos;
    }));
    const allGrid = document.getElementById("video-grid");
    const current = state.allVideos.slice();
    moreResults.flat().forEach(video => current.push(video));
    state.allVideos = current;
    const unique = [];
    const seen = new Set();
    current.forEach(video => { if (video.videoId && !seen.has(video.videoId)) { seen.add(video.videoId); unique.push(video); } });
    mountCards(allGrid, unique);
    if (status) status.textContent = `${unique.length} videos loaded from your four Secret Golf Tour playlists.`;
    const moreWrap = document.getElementById("load-more-wrap");
    if (moreWrap) moreWrap.hidden = !PLAYLISTS.some(p => state.nextPageTokens[p.id]);
  } catch (error) {
    console.error("Load more error:", error);
    if (status) status.textContent = "Couldn't load more videos. Please try again.";
  } finally {
    state.loading = false;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
  const menuButton = document.getElementById("menu-button");
  if (menuButton) menuButton.addEventListener("click", () => {
    const nav = document.querySelector("nav");
    if (nav) {
      const open = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(open));
    }
  });
  document.addEventListener("click", event => {
    const button = event.target.closest(".play-inline-button");
    if (button) playInCard(button.closest(".video-card"));
  });
  const more = document.getElementById("load-more");
  if (more) more.addEventListener("click", loadMoreVideos);
  loadAllPlaylists();
});
