/*
  SECRET GOLF TOUR — AUTOMATIC YOUTUBE PLAYLIST GALLERY
  Videos play directly inside the website when a visitor clicks Play.
  Keep the YouTube API key in Cloudflare as a secret, never in this file.
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

function playVideoInCard(card) {
  if (!card) return;
  const videoId = String(card.dataset.videoId || "").trim();
  const playerWrap = card.querySelector(".inline-player");
  if (!videoId || !playerWrap) return;

  // Replace this card's thumbnail with an embedded YouTube player.
  playerWrap.innerHTML = `
    <iframe
      src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0"
      title="${escapeHtml(card.dataset.videoTitle || "Secret Golf Tour video")}"
      loading="lazy"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen>
    </iframe>
  `;
  playerWrap.hidden = false;

  const thumbnailLink = card.querySelector(".video-thumb");
  if (thumbnailLink) thumbnailLink.hidden = true;

  const playButton = card.querySelector(".watch-button");
  if (playButton) {
    playButton.textContent = "Playing on this page";
    playButton.disabled = true;
    playButton.classList.add("is-playing");
  }
}

function renderVideos(videos) {
  const html = videos.map((video) => {
    const videoId = String(video.videoId || "").trim();
    if (!videoId) return "";

    const titleRaw = video.title || "Secret Golf Tour video";
    const title = escapeHtml(titleRaw);
    const thumbnail = escapeHtml(getThumbnail(video));
    const published = formatDate(video.publishedAt);

    return `
      <article class="video-card"
               data-video-id="${escapeHtml(videoId)}"
               data-video-title="${title}">
        <div class="inline-player" hidden></div>
        <button class="video-thumb play-inline-button" type="button"
                aria-label="Play ${title} on this website">
          <img src="${thumbnail}" alt="${title}" loading="lazy"
               onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg';">
          <span class="play-badge">▶ PLAY VIDEO</span>
        </button>
        <div class="video-info">
          <h3>${title}</h3>
          ${published ? `<p class="video-date">${escapeHtml(published)}</p>` : ""}
          <button class="watch-button play-inline-button" type="button">Play on this website ▶</button>
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

  // Event delegation supports cards loaded now and by the Load More button.
  if (grid) {
    grid.addEventListener("click", (event) => {
      const button = event.target.closest(".play-inline-button");
      if (!button) return;
      playVideoInCard(button.closest(".video-card"));
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
