// ------------------------------
// STEP WIZARD LOGIC
// ------------------------------
let currentStep = 1;
const totalSteps = 4;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();

  const storedTheme = localStorage.getItem("filmfuse-theme");
  if (storedTheme) {
    document.body.setAttribute("data-theme", storedTheme);
    updateThemeToggleIcon(storedTheme);
  }

  document.getElementById("theme-toggle").addEventListener("click", () => {
    const now = document.body.getAttribute("data-theme");
    const next = now === "dark" ? "light" : "dark";
    document.body.setAttribute("data-theme", next);
    localStorage.setItem("filmfuse-theme", next);
    updateThemeToggleIcon(next);
  });

  setupChipSelection();
  showStep(currentStep);
});

// ------------------------------
// THEME BUTTON
// ------------------------------
function updateThemeToggleIcon(theme) {
  const btn = document.getElementById("theme-toggle");
  btn.textContent = theme === "dark" ? "🌙" : "☀️";
}

// ------------------------------
// CHIP SELECT UI LOGIC
// ------------------------------
function setupChipSelection() {
  document.querySelectorAll(".options").forEach((container) => {
    const single = container.classList.contains("single-select");

    container.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        if (single) {
          container
            .querySelectorAll(".chip")
            .forEach((c) => c.classList.remove("selected"));
          chip.classList.add("selected");
        } else {
          chip.classList.toggle("selected");
        }
      });
    });
  });
}

// ------------------------------
// STEP UI
// ------------------------------
function showStep(step) {
  currentStep = step;

  document.querySelectorAll(".form-step").forEach((st) => {
    st.classList.remove("active");
  });

  const current = document.querySelector(`.form-step[data-step="${step}"]`);
  current.classList.add("active");

  document.querySelectorAll("[data-step-dot]").forEach((dot) => {
    dot.classList.toggle(
      "active",
      Number(dot.getAttribute("data-step-dot")) === step
    );
  });

  document.getElementById("step-number").textContent = step;

  const fields = current.querySelectorAll(".field");
  fields.forEach((field, i) => {
    field.classList.remove("visible");
    setTimeout(() => field.classList.add("visible"), i * 180);
  });

  document.getElementById("form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

function nextStep() {
  if (currentStep < totalSteps) showStep(currentStep + 1);
}
function prevStep() {
  if (currentStep > 1) showStep(currentStep - 1);
}

window.nextStep = nextStep;
window.prevStep = prevStep;

// ------------------------------
// SEND REQUEST TO RENDER BACKEND
// ------------------------------
async function generateMovies() {
  const getSelected = (id) =>
    [...document.querySelectorAll(`#${id} .chip.selected`)].map((c) =>
      c.textContent.trim()
    );

  const payload = {
    languages: getSelected("langs"),
    genres: getSelected("genres"),
    mood: getSelected("mood")[0] || null,
    age: getSelected("age")[0] || null,
  };

  const movieList = document.getElementById("movieList");
  movieList.innerHTML = createSkeletonHTML(3);

  // 🔥 Your Render backend URL
  const API_URL = "https://filmfuseai.onrender.com/api/recommend";

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.movies) {
      movieList.innerHTML = `<p class="placeholder">No movies returned.</p>`;
      return;
    }

    movieList.innerHTML = "";
    data.movies.forEach((m) => {
      const card = document.createElement("div");
      card.classList.add("movie-card");

      card.innerHTML = `
        <div class="movie-content">
          <div class="movie-title">${m.title} <span style="color:#9ca3af;">(${m.year || ""})</span></div>
          <div class="movie-meta">${m.language?.toUpperCase() || ""} · Rated ${
        m.age_rating
      } · ${m.genres.join(", ")}</div>
          <div class="movie-desc">${m.short_reason}</div>
        </div>
      `;

      movieList.appendChild(card);
    });

    document
      .getElementById("results")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    movieList.innerHTML = `<p class="placeholder" style="color:red">Backend offline or error.</p>`;
  }
}

window.generateMovies = generateMovies;

// ------------------------------
// SKELETON UI
// ------------------------------
function createSkeletonHTML(n) {
  let html = "";
  for (let i = 0; i < n; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton-lines">
          <div class="skeleton-line" style="width:70%;"></div>
          <div class="skeleton-line" style="width:50%;"></div>
          <div class="skeleton-line" style="width:90%;"></div>
        </div>
      </div>
    `;
  }
  return html;
}