// =======================
// FilmFuseAI - script.js
// =======================

// Multi-step state
let currentStep = 1;
const totalSteps = 4;

// Auth state
let currentUser = null;

// ============================================================
// INIT
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme
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

  // Chips
  setupChipSelection();

  // Step 1
  showStep(currentStep);

  // Netlify Identity
  initAuth();
});

// ============================================================
// NETLIFY IDENTITY AUTH
// ============================================================
function initAuth() {
  if (typeof netlifyIdentity === "undefined") {
    console.warn("Netlify Identity not loaded. Auth disabled.");
    return;
  }

  netlifyIdentity.on("init", (user) => {
    if (user) setLoggedInState(user);
  });

  netlifyIdentity.on("login", (user) => {
    setLoggedInState(user);
    netlifyIdentity.close();
    closeAuthModal();
  });

  netlifyIdentity.on("logout", () => {
    setLoggedOutState();
  });

  netlifyIdentity.on("error", (err) => {
    // Log only — don't touch DOM here; Netlify Identity renders its own error UI
    console.warn("Netlify Identity error:", err.message);
  });

  netlifyIdentity.init({ locale: "en" });
}

function setLoggedInState(user) {
  currentUser = user;
  const name = user.user_metadata?.full_name || user.email || "User";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  document.getElementById("auth-btn-login")?.classList.add("hidden");
  const pill = document.getElementById("user-pill");
  pill?.classList.remove("hidden");
  document.getElementById("user-avatar").textContent = initials;
  const nameEl = document.getElementById("user-name") || document.getElementById("user-name-label");
  if (nameEl) nameEl.textContent = name.split(" ")[0];

  // Show wishlist nav link
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
  if (typeof netlifyIdentity !== "undefined") {
    netlifyIdentity.logout();
  }
}

// ============================================================
// AUTH MODAL (wraps Netlify Identity widget)
// ============================================================
function openAuthModal() {
  // If Netlify Identity is available, delegate to it directly
  if (typeof netlifyIdentity !== "undefined") {
    netlifyIdentity.open("login");
    return;
  }
  // Fallback: show custom modal
  document.getElementById("auth-modal")?.classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("auth-modal")?.classList.add("hidden");
  clearAuthMessages();
}

function switchAuthTab(tab) {
  document.getElementById("tab-login").classList.toggle("active", tab === "login");
  document.getElementById("tab-signup").classList.toggle("active", tab === "signup");
  document.getElementById("auth-login").classList.toggle("active", tab === "login");
  document.getElementById("auth-signup").classList.toggle("active", tab === "signup");
  clearAuthMessages();
}

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function showAuthMessage(msg) {
  const el = document.getElementById("auth-message");
  if (!el) return;
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearAuthMessages() {
  document.getElementById("auth-error")?.classList.add("hidden");
  document.getElementById("auth-message")?.classList.add("hidden");
}

// Netlify Identity handles actual login/signup; these fallbacks used
// only when Netlify Identity widget isn't available (local testing)
async function handleLogin() {
  if (typeof netlifyIdentity !== "undefined") {
    netlifyIdentity.open("login");
    return;
  }
  showAuthError("Auth service unavailable. Please deploy to Netlify.");
}

async function handleSignup() {
  if (typeof netlifyIdentity !== "undefined") {
    netlifyIdentity.open("signup");
    return;
  }
  showAuthError("Auth service unavailable. Please deploy to Netlify.");
}

function handleForgotPassword() {
  if (typeof netlifyIdentity !== "undefined") {
    netlifyIdentity.open("recovery");
  }
}

// ============================================================
// BOOKMARKS / WISHLIST
// ============================================================
function getBookmarkKey() {
  if (!currentUser) return null;
  return `filmfuse-wishlist-${currentUser.id}`;
}

function getBookmarks() {
  const key = getBookmarkKey();
  if (!key) return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function saveBookmarks(list) {
  const key = getBookmarkKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(list));
}

function isBookmarked(title) {
  return getBookmarks().some((m) => m.title === title);
}

function toggleBookmark(movie) {
  if (!currentUser) {
    openAuthModal();
    return;
  }
  const list = getBookmarks();
  const idx = list.findIndex((m) => m.title === movie.title);
  if (idx === -1) {
    list.push(movie);
  } else {
    list.splice(idx, 1);
  }
  saveBookmarks(list);

  // Re-sync bookmark buttons in results
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
  list.forEach((movie) => {
    const card = buildMovieCard(movie, true);
    container.appendChild(card);
  });
}

function refreshBookmarkButtons() {
  document.querySelectorAll(".bookmark-btn").forEach((btn) => {
    const title = btn.dataset.title;
    const saved = isBookmarked(title);
    btn.classList.toggle("bookmarked", saved);
    btn.title = saved ? "Remove from wishlist" : "Add to wishlist";
    btn.querySelector(".bm-icon").textContent = saved ? "★" : "☆";
  });
}

// ============================================================
// MOVIE CARD BUILDER (shared for results + wishlist)
// ============================================================
function buildMovieCard(movie, inWishlist = false) {
  const card = document.createElement("div");
  card.className = "movie-card";

  const poster = movie.poster
    ? `<img src="${movie.poster}" alt="${movie.title} poster" />`
    : `<div class="movie-poster-placeholder">🎬</div>`;

  const saved = isBookmarked(movie.title);
  const bmClass = saved ? "bookmark-btn bookmarked" : "bookmark-btn";
  const bmIcon = saved ? "★" : "☆";
  const bmTitle = saved ? "Remove from wishlist" : "Add to wishlist";

  card.innerHTML = `
    <div class="movie-poster">${poster}</div>
    <div class="movie-content">
      <div class="movie-title-row">
        <div class="movie-title">${movie.title} (${movie.year})</div>
        ${
          currentUser
            ? `<button class="${bmClass}" data-title="${movie.title}" title="${bmTitle}">
                <span class="bm-icon">${bmIcon}</span>
               </button>`
            : `<button class="bookmark-btn bookmark-btn-hint" title="Sign in to bookmark" onclick="openAuthModal()">
                <span class="bm-icon">☆</span>
               </button>`
        }
      </div>
      <div class="movie-meta">⭐ ${movie.rating || "N/A"} / 10</div>
      <div class="movie-desc">${movie.short_reason}</div>
    </div>
  `;

  // Wire up bookmark button
  const bmBtn = card.querySelector(".bookmark-btn:not(.bookmark-btn-hint)");
  if (bmBtn) {
    bmBtn.addEventListener("click", () => {
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

  return card;
}

// ============================================================
// TMDB
// ============================================================
const TMDB_API_KEY = "66837c9bec5621ec5e91fdac7d4a1aac";

async function getMovieDetails(title) {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
    );
    const data = await res.json();
    return data.results?.[0];
  } catch {
    return null;
  }
}

// ============================================================
// THEME
// ============================================================
function updateThemeToggleIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

// ============================================================
// CHIP SELECTION
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
// MULTI-STEP WIZARD
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

function nextStep() {
  if (currentStep < totalSteps) showStep(currentStep + 1);
}

function prevStep() {
  if (currentStep > 1) showStep(currentStep - 1);
}

// ============================================================
// SCROLL HELPERS
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
// GENERATE MOVIES
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
  const genres = getSelectedList("genres");
  const moodList = getSelectedList("mood");
  const ageList = getSelectedList("age");

  const payload = {
    languages,
    genres,
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
    const isNetlifyEnv =
      location.hostname.endsWith("netlify.app") || location.port === "8888";
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

    const data = await res.json();
    const movies = data.movies || [];

    if (!movies.length) {
      movieList.innerHTML = `<p class="placeholder">No movies returned. Try tweaking your preferences and generate again.</p>`;
      return;
    }

    movieList.innerHTML = "";

    for (const movie of movies) {
      const details = await getMovieDetails(movie.title);

      // Attach TMDB data to the movie object so we can save it properly
      movie.poster = details?.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : "";
      movie.rating = details?.vote_average
        ? details.vote_average.toFixed(1)
        : "N/A";

      const card = buildMovieCard(movie, false);
      movieList.appendChild(card);
    }
  } catch (err) {
    console.error("Error in generateMovies:", err);
    movieList.innerHTML = `<p class="placeholder" style="color:#ef4444;">Error: ${
      err.message || "AI failed to generate recommendations."
    }</p>`;
  }
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.scrollToForm = scrollToForm;
window.scrollToResults = scrollToResults;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.generateMovies = generateMovies;
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.handleForgotPassword = handleForgotPassword;
window.handleLogout = handleLogout;
window.clearWishlist = clearWishlist;