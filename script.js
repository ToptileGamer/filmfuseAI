// =======================
// FilmFuseAI - script.js
// =======================

let currentStep = 1;
const totalSteps = 4;
let currentUser = null;

const TMDB_KEY = "66837c9bec5621ec5e91fdac7d4a1aac";
const TMDB_BASE = "https://api.themoviedb.org/3";

// OTT brand colours + display names
const OTT_META = {
  "Netflix":           { color: "#E50914", icon: "N" },
  "Amazon Prime Video":{ color: "#00A8E1", icon: "P" },
  "Disney Plus":       { color: "#113CCF", icon: "D+" },
  "Apple TV Plus":     { color: "#555555", icon: "" },
  "HBO Max":           { color: "#6B20FF", icon: "H" },
  "Max":               { color: "#6B20FF", icon: "M" },
  "Hulu":              { color: "#1CE783", icon: "H" },
  "Peacock":           { color: "#FFD700", icon: "P" },
  "Paramount Plus":    { color: "#0064FF", icon: "P+" },
  "Mubi":              { color: "#000000", icon: "M" },
  "Jio Cinema":        { color: "#6B1FD5", icon: "J" },
  "Zee5":              { color: "#7B2FBE", icon: "Z" },
  "SonyLIV":           { color: "#002D62", icon: "S" },
  "Hotstar":           { color: "#1F80E0", icon: "HS" },
  "Sun Nxt":           { color: "#FF6600", icon: "SN" },
  "Aha":               { color: "#FFCC00", icon: "A" },
};

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const storedTheme = localStorage.getItem("filmfuse-theme");
  if (storedTheme === "light" || storedTheme === "dark") {
    document.body.setAttribute("data-theme", storedTheme);
    updateThemeToggleIcon(storedTheme);
  }

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("filmfuse-theme", next);
    updateThemeToggleIcon(next);
  });

  setupChipSelection();
  showStep(currentStep);
  initAuth();
});

// ============================================================
// NETLIFY IDENTITY
// ============================================================
function initAuth() {
  if (typeof netlifyIdentity === "undefined") {
    console.warn("Netlify Identity not loaded.");
    return;
  }
  netlifyIdentity.on("init", (user) => { if (user) setLoggedInState(user); });
  netlifyIdentity.on("login", (user) => { setLoggedInState(user); netlifyIdentity.close(); closeAuthModal(); });
  netlifyIdentity.on("logout", () => setLoggedOutState());
  netlifyIdentity.on("error", (err) => console.warn("Identity error:", err.message));
  netlifyIdentity.init({ locale: "en" });
}

function setLoggedInState(user) {
  currentUser = user;
  const name = user.user_metadata?.full_name || user.email || "User";
  const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  document.getElementById("auth-btn-login")?.classList.add("hidden");
  document.getElementById("user-pill")?.classList.remove("hidden");
  document.getElementById("user-avatar").textContent = initials;
  const nameEl = document.getElementById("user-name") || document.getElementById("user-name-label");
  if (nameEl) nameEl.textContent = name.split(" ")[0];
  document.getElementById("wishlist-nav-link")?.classList.remove("hidden");
  document.getElementById("wishlist")?.classList.remove("hidden");
  renderWishlist();
}

function setLoggedOutState() {
  currentUser = null;
  document.getElementById("auth-btn-login")?.classList.remove("hidden");
  document.getElementById("user-pill")?.classList.add("hidden");
  document.getElementById("wishlist-nav-link")?.classList.add("hidden");
  document.getElementById("wishlist")?.classList.add("hidden");
}

function handleLogout() {
  if (typeof netlifyIdentity !== "undefined") netlifyIdentity.logout();
}

function openAuthModal() {
  if (typeof netlifyIdentity !== "undefined") { netlifyIdentity.open("login"); return; }
  document.getElementById("auth-modal")?.classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("auth-modal")?.classList.add("hidden");
}

function switchAuthTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("auth-login").classList.toggle("active", tab === "login");
  document.getElementById("auth-signup").classList.toggle("active", tab === "signup");
}

async function handleLogin() {
  if (typeof netlifyIdentity !== "undefined") netlifyIdentity.open("login");
}

async function handleSignup() {
  if (typeof netlifyIdentity !== "undefined") netlifyIdentity.open("signup");
}

function handleForgotPassword() {
  if (typeof netlifyIdentity !== "undefined") netlifyIdentity.open("recovery");
}

// ============================================================
// BOOKMARKS
// ============================================================
function getBookmarkKey() {
  return currentUser ? `filmfuse-wishlist-${currentUser.id}` : null;
}

function getBookmarks() {
  const key = getBookmarkKey();
  if (!key) return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function saveBookmarks(list) {
  const key = getBookmarkKey();
  if (key) localStorage.setItem(key, JSON.stringify(list));
}

function isBookmarked(title) {
  return getBookmarks().some((m) => m.title === title);
}

function toggleBookmark(movie) {
  if (!currentUser) { openAuthModal(); return; }
  const list = getBookmarks();
  const idx = list.findIndex((m) => m.title === movie.title);
  if (idx === -1) list.push(movie); else list.splice(idx, 1);
  saveBookmarks(list);
  refreshBookmarkButtons();
  renderWishlist();
}

function clearWishlist() {
  if (!currentUser) return;
  saveBookmarks([]);
  renderWishlist();
  refreshBookmarkButtons();
}

function renderWishlist() {
  const container = document.getElementById("wishlistMovies");
  if (!container) return;
  const list = getBookmarks();
  if (!list.length) {
    container.innerHTML = `<p class="placeholder">Bookmark movies from your recommendations to see them here.</p>`;
    return;
  }
  container.innerHTML = "";
  list.forEach((movie) => container.appendChild(buildMovieCard(movie, true)));
}

function refreshBookmarkButtons() {
  document.querySelectorAll(".bookmark-btn[data-title]").forEach((btn) => {
    const saved = isBookmarked(btn.dataset.title);
    btn.classList.toggle("bookmarked", saved);
    btn.title = saved ? "Remove from wishlist" : "Add to wishlist";
    btn.querySelector(".bm-icon").textContent = saved ? "★" : "☆";
  });
}

// ============================================================
// TMDB HELPERS
// ============================================================
async function tmdbSearch(title) {
  try {
    const r = await fetch(`${TMDB_BASE}/search/movie?api_key=${TMDB_KEY}&query=${encodeURIComponent(title)}&language=en-US`);
    const d = await r.json();
    return d.results?.[0] || null;
  } catch { return null; }
}

async function tmdbCredits(tmdbId) {
  try {
    const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}/credits?api_key=${TMDB_KEY}`);
    const d = await r.json();
    const director = d.crew?.find((c) => c.job === "Director")?.name || null;
    const cast = (d.cast || []).slice(0, 6).map((c) => c.name);
    return { director, cast };
  } catch { return { director: null, cast: [] }; }
}

async function tmdbProviders(tmdbId) {
  // Uses IN region first, falls back to US
  try {
    const r = await fetch(`${TMDB_BASE}/movie/${tmdbId}/watch/providers?api_key=${TMDB_KEY}`);
    const d = await r.json();
    const region = d.results?.IN || d.results?.US || null;
    if (!region) return [];

    const flat = region.flatrate || [];
    const buy  = region.buy || [];
    const rent = region.rent || [];

    // Deduplicate by provider_name, flatrate first
    const seen = new Set();
    const all = [...flat, ...rent, ...buy].filter((p) => {
      if (seen.has(p.provider_name)) return false;
      seen.add(p.provider_name);
      return true;
    });

    return all.slice(0, 6).map((p) => ({
      name: p.provider_name,
      logo: p.logo_path ? `https://image.tmdb.org/t/p/w92${p.logo_path}` : null,
    }));
  } catch { return []; }
}

// ============================================================
// MOVIE CARD BUILDER
// ============================================================
function buildMovieCard(movie, inWishlist = false) {
  const card = document.createElement("div");
  card.className = "movie-card";

  const poster = movie.poster
    ? `<img src="${movie.poster}" alt="${movie.title} poster" loading="lazy" />`
    : `<div class="movie-poster-placeholder">🎬</div>`;

  const saved = isBookmarked(movie.title);

  card.innerHTML = `
    <div class="movie-poster">${poster}</div>
    <div class="movie-content">
      <div class="movie-title-row">
        <div class="movie-title movie-click-trigger" style="cursor:pointer;">${movie.title} <span class="movie-year">(${movie.year})</span></div>
        ${currentUser
          ? `<button class="bookmark-btn ${saved ? "bookmarked" : ""}" data-title="${movie.title}" title="${saved ? "Remove from wishlist" : "Add to wishlist"}">
               <span class="bm-icon">${saved ? "★" : "☆"}</span>
             </button>`
          : `<button class="bookmark-btn bookmark-btn-hint" title="Sign in to bookmark" onclick="openAuthModal()">
               <span class="bm-icon">☆</span>
             </button>`
        }
      </div>
      <div class="movie-meta">⭐ ${movie.rating || "N/A"} / 10 &nbsp;·&nbsp; <span class="expand-hint">Click for cast &amp; streaming ↓</span></div>
      <div class="movie-desc">${movie.short_reason}</div>

      <!-- EXPANDABLE DRAWER -->
      <div class="movie-drawer" style="display:none;">
        <div class="drawer-loading">
          <span class="drawer-spinner"></span> Loading details…
        </div>
        <div class="drawer-body" style="display:none;">
          <div class="drawer-director"></div>
          <div class="drawer-cast-wrap">
            <div class="drawer-label">Cast</div>
            <div class="drawer-cast"></div>
          </div>
          <div class="drawer-ott-wrap">
            <div class="drawer-label">Where to watch</div>
            <div class="drawer-ott"></div>
          </div>
        </div>
        <div class="drawer-error" style="display:none;"></div>
      </div>
    </div>
  `;

  // Bookmark wiring
  const bmBtn = card.querySelector(".bookmark-btn[data-title]");
  if (bmBtn) {
    bmBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleBookmark(movie);
      if (inWishlist) {
        card.remove();
        if (!getBookmarks().length) {
          document.getElementById("wishlistMovies").innerHTML =
            `<p class="placeholder">Bookmark movies from your recommendations to see them here.</p>`;
        }
      }
    });
  }

  // Click-to-expand wiring
  const trigger = card.querySelector(".movie-click-trigger");
  const drawer  = card.querySelector(".movie-drawer");
  let loaded = false;

  trigger.addEventListener("click", async () => {
    const open = drawer.style.display !== "none" && drawer.style.display !== "";
    if (open) {
      drawer.style.display = "none";
      card.classList.remove("card-expanded");
      return;
    }

    drawer.style.display = "block";
    card.classList.add("card-expanded");

    if (loaded) return; // already fetched

    const loadingEl = drawer.querySelector(".drawer-loading");
    const bodyEl    = drawer.querySelector(".drawer-body");
    const errorEl   = drawer.querySelector(".drawer-error");

    try {
      // 1. search TMDB for the movie ID
      const tmdbMovie = await tmdbSearch(movie.title);
      if (!tmdbMovie) throw new Error("Movie not found on TMDB");

      const tmdbId = tmdbMovie.id;

      // 2. fetch credits + providers in parallel
      const [credits, providers] = await Promise.all([
        tmdbCredits(tmdbId),
        tmdbProviders(tmdbId),
      ]);

      // -- Director
      const directorEl = drawer.querySelector(".drawer-director");
      if (credits.director) {
        directorEl.innerHTML = `<span class="drawer-label">Director</span> <span class="drawer-value">${credits.director}</span>`;
      }

      // -- Cast
      const castEl = drawer.querySelector(".drawer-cast");
      if (credits.cast.length) {
        castEl.innerHTML = credits.cast
          .map((name) => `<span class="cast-pill">${name}</span>`)
          .join("");
      } else {
        castEl.innerHTML = `<span class="drawer-muted">Not available</span>`;
      }

      // -- OTT providers
      const ottEl = drawer.querySelector(".drawer-ott");
      if (providers.length) {
        ottEl.innerHTML = providers.map((p) => {
          const meta = Object.entries(OTT_META).find(([k]) =>
            p.name.toLowerCase().includes(k.toLowerCase())
          );
          const bg   = meta?.[1]?.color || "#334155";
          const icon = meta?.[1]?.icon  || p.name[0];

          // Build a search URL as direct deep-link isn't public
          const searchUrl = `https://www.google.com/search?q=watch+${encodeURIComponent(movie.title)}+on+${encodeURIComponent(p.name)}`;

          return `
            <a class="ott-badge" href="${searchUrl}" target="_blank" rel="noopener" title="${p.name}"
               style="--ott-color:${bg};">
              ${p.logo
                ? `<img src="${p.logo}" alt="${p.name}" class="ott-logo" />`
                : `<span class="ott-icon">${icon}</span>`
              }
              <span class="ott-name">${p.name}</span>
            </a>`;
        }).join("");
      } else {
        ottEl.innerHTML = `<span class="drawer-muted">Not available for streaming in your region</span>`;
      }

      loadingEl.style.display = "none";
      bodyEl.style.display    = "block";
      loaded = true;

    } catch (err) {
      loadingEl.style.display = "none";
      errorEl.textContent     = "Couldn't load details. Try again later.";
      errorEl.style.display   = "block";
    }
  });

  return card;
}

// ============================================================
// THEME
// ============================================================
function updateThemeToggleIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

// ============================================================
// CHIPS
// ============================================================
function setupChipSelection() {
  document.querySelectorAll(".options").forEach((container) => {
    const single = container.classList.contains("single-select");
    container.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (single) {
          container.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
          chip.classList.add("selected");
        } else {
          chip.classList.toggle("selected");
        }
      });
    });
  });
}

// ============================================================
// WIZARD
// ============================================================
function showStep(step) {
  currentStep = step;
  document.querySelectorAll(".form-step").forEach((el) => {
    el.classList.toggle("active", Number(el.dataset.step) === step);
  });
  document.querySelectorAll("[data-step-dot]").forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.stepDot) === step);
  });
  const stepNumEl = document.getElementById("step-number");
  if (stepNumEl) stepNumEl.textContent = String(step);
  const activeStep = document.querySelector(`.form-step[data-step="${step}"]`);
  if (activeStep) {
    activeStep.querySelectorAll(".field").forEach((field, idx) => {
      field.classList.remove("visible");
      setTimeout(() => field.classList.add("visible"), idx * 180);
    });
  }
  document.getElementById("form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function nextStep() { if (currentStep < totalSteps) showStep(currentStep + 1); }
function prevStep() { if (currentStep > 1) showStep(currentStep - 1); }

// ============================================================
// SCROLL
// ============================================================
function scrollToForm() {
  document.getElementById("form-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function scrollToResults() {
  document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
// SKELETON
// ============================================================
function createSkeletonHTML(count) {
  let html = "";
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton-poster"></div>
        <div class="skeleton-lines">
          <div class="skeleton-line" style="width:70%;"></div>
          <div class="skeleton-line" style="width:45%;"></div>
          <div class="skeleton-line" style="width:90%;"></div>
          <div class="skeleton-line" style="width:80%;"></div>
        </div>
      </div>`;
  }
  return html;
}

// ============================================================
// GENERATE
// ============================================================
async function generateMovies() {
  const getSelectedList = (id) => {
    const container = document.getElementById(id);
    if (!container) return [];
    return Array.from(container.querySelectorAll(".chip.selected")).map((c) =>
      c.textContent.trim().toLowerCase()
    );
  };

  const languages = getSelectedList("langs");
  const genres    = getSelectedList("genres");
  const moodList  = getSelectedList("mood");
  const ageList   = getSelectedList("age");

  const payload = {
    languages, genres,
    mood: moodList[0] || null,
    age: ageList[0] || null,
  };

  const summary = document.getElementById("query-summary");
  if (summary) {
    summary.innerHTML = `
      <span class="query-pill">Lang: ${languages.length ? languages.join(", ") : "any"}</span>
      <span class="query-pill">Genres: ${genres.length ? genres.join(", ") : "any"}</span>
      <span class="query-pill">Mood: ${payload.mood || "any"}</span>
      <span class="query-pill">Age: ${payload.age || "any"}</span>`;
  }

  const movieList = document.getElementById("movieList");
  if (!movieList) return;

  movieList.innerHTML = createSkeletonHTML(5);
  scrollToResults();

  try {
    const isNetlifyEnv = location.hostname.endsWith("netlify.app") || location.port === "8888";
    const endpoint = isNetlifyEnv
      ? "/.netlify/functions/recommend"
      : "https://filmfuseai.netlify.app/.netlify/functions/recommend";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Backend error (${res.status})`);
    }

    const data   = await res.json();
    const movies = data.movies || [];

    if (!movies.length) {
      movieList.innerHTML = `<p class="placeholder">No movies returned. Try tweaking your preferences.</p>`;
      return;
    }

    movieList.innerHTML = "";

    for (const movie of movies) {
      // Fetch poster + rating from TMDB
      const details = await tmdbSearch(movie.title);
      movie.poster = details?.poster_path
        ? `https://image.tmdb.org/t/p/w342${details.poster_path}`
        : "";
      movie.rating = details?.vote_average
        ? details.vote_average.toFixed(1)
        : "N/A";
      movie.tmdbId = details?.id || null;

      movieList.appendChild(buildMovieCard(movie, false));
    }
  } catch (err) {
    console.error("generateMovies error:", err);
    movieList.innerHTML = `<p class="placeholder" style="color:#ef4444;">Error: ${err.message || "AI failed."}</p>`;
  }
}

// ============================================================
// GLOBALS
// ============================================================
window.scrollToForm       = scrollToForm;
window.scrollToResults    = scrollToResults;
window.nextStep           = nextStep;
window.prevStep           = prevStep;
window.generateMovies     = generateMovies;
window.openAuthModal      = openAuthModal;
window.closeAuthModal     = closeAuthModal;
window.switchAuthTab      = switchAuthTab;
window.handleLogin        = handleLogin;
window.handleSignup       = handleSignup;
window.handleForgotPassword = handleForgotPassword;
window.handleLogout       = handleLogout;
window.clearWishlist      = clearWishlist;