/*
  SECRET GOLF TOUR — playlist gallery and category sections.
  The YouTube API key stays in the Cloudflare Worker secret, never in this public file.
*/
const WORKER_URL = "https://secret-golf-playlist.kambli-himanshu.workers.dev/videos";
const PAGE_SIZE = 50;
const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PL1m3Bw6VGCWR9OOpL4vE76paeqZqbmM1n";

const state = { videos: [], nextPageToken: "", loading: false };

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
  player.hidden = false;
  player.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0"
    title="${escapeHtml(card.dataset.videoTitle || "Secret Golf Tour video")}"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  thumb.hidden = true;
  if (watch) watch.hidden = true;
}
function mountCards(element, videos) {
  if (!element) return;
  element.innerHTML = videos.map(renderCard).join("");
}
function videoMatches(video, terms) {
  const title = String(video.title || "").toLowerCase();
  return terms.some(term => title.includes(term));
}
function fillCategorySections() {
  // Each section is populated from the same playlist, filtered by title keywords.
  const groups = [
    { grid: "influencers-grid", note: "influencers-note", terms: ["influencer", "viral", "creator", "grace charis", "paige spiranac", "charley hull", "female golfers", "golf star"], fallback: true, label: "Golf influencer" },
    { grid: "lpga-grid", note: "lpga-note", terms: ["lpga", "klpga", "tour", "charley hull", "nelly korda", "paige", "professional golfer", "golf swing"], fallback: true, label: "LPGA & KLPGA" },
    { grid: "swing-grid", note: "swing-note", terms: ["swing", "technique", "swing analysis", "how to", "golf tips"], fallback: false, label: "swing analysis" },
    { grid: "stories-grid", note: "stories-note", terms: ["story", "stories", "legend", "rivalry", "career", "journey", "champion"], fallback: false, label: "golf story" }
  ];
  groups.forEach(group => {
    const target = document.getElementById(group.grid);
    const note = document.getElementById(group.note);
    const matches = state.videos.filter(video => videoMatches(video, group.terms));
    // Avoid empty category panels when titles do not contain a category keyword:
    // show the first few playlist items as useful category discovery cards.
    const selected = matches.length ? matches.slice(0, 12) : (group.fallback ? state.videos.slice(0, 12) : []);
    mountCards(target, selected);
    if (note) {
      note.textContent = selected.length
        ? `${selected.length} ${group.label} video${selected.length === 1 ? "" : "s"} shown from the playlist.`
        : `No clearly matching ${group.label} titles were found in the current playlist. Try All Videos below.`;
    }
  });
}
async function loadPlaylist() {
  const status = document.getElementById("status");
  const grid = document.getElementById("video-grid");
  const moreWrap = document.getElementById("load-more-wrap");
  const help = document.getElementById("error-help");
  if (state.loading) return;
  state.loading = true;
  if (status) status.textContent = "Loading Secret Golf Tour videos…";
  try {
    const url = new URL(WORKER_URL);
    url.searchParams.set("maxResults", String(PAGE_SIZE));
    const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
    state.videos = Array.isArray(data.videos) ? data.videos : [];
    state.nextPageToken = data.nextPageToken || "";
    mountCards(grid, state.videos);
    fillCategorySections();
    if (status) status.textContent = `${state.videos.length} videos loaded from the Secret Golf Tour playlist. Choose a thumbnail to play here on the website.`;
    if (moreWrap) moreWrap.hidden = !state.nextPageToken;
    if (help) help.hidden = true;
  } catch (error) {
    console.error("Playlist load error:", error);
    if (status) status.textContent = "We couldn't load the playlist automatically right now.";
    if (help) {
      help.hidden = false;
      const p = help.querySelector("p");
      if (p) p.textContent = "Please check the Cloudflare Worker deployment and its YOUTUBE_API_KEY secret.";
    }
    ["influencers-note", "lpga-note", "swing-note", "stories-note"].forEach(id => {
      const note = document.getElementById(id);
      if (note) note.textContent = "Playlist videos could not be loaded. Please try again later.";
    });
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
  if (more) more.addEventListener("click", async () => {
    if (!state.nextPageToken || state.loading) return;
    state.loading = true;
    const status = document.getElementById("status");
    try {
      const url = new URL(WORKER_URL);
      url.searchParams.set("maxResults", String(PAGE_SIZE));
      url.searchParams.set("pageToken", state.nextPageToken);
      const response = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);
      const newVideos = Array.isArray(data.videos) ? data.videos : [];
      state.videos.push(...newVideos);
      mountCards(document.getElementById("video-grid"), state.videos);
      state.nextPageToken = data.nextPageToken || "";
      fillCategorySections();
      if (status) status.textContent = `${state.videos.length} videos loaded from the Secret Golf Tour playlist.`;
      document.getElementById("load-more-wrap").hidden = !state.nextPageToken;
    } catch (error) {
      if (status) status.textContent = "Couldn't load more videos. Please try again.";
    } finally {
      state.loading = false;
    }
  });
  loadPlaylist();
});
