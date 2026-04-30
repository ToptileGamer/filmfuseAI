import {
  signup,
  login,
  logout,
  auth,
  saveWatchlist,
  getWatchlist
} from "./firebase.js";

const TMDB_API_KEY = "66837c9bec5621ec5e91fdac7d4a1aac";

// AUTH
window.handleSignup = async () => {
  await signup(email.value, password.value);
  alert("Signup successful");
};

window.handleLogin = async () => {
  await login(email.value, password.value);
  alert("Logged in");
};

window.handleLogout = async () => {
  await logout();
  alert("Logged out");
};

// TMDB
async function getMovieDetails(title) {
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
  );
  const data = await res.json();
  return data.results?.[0];
}

// GENERATE
window.generateMovies = async () => {
  const movieList = document.getElementById("movieList");
  movieList.innerHTML = "Loading...";

  const res = await fetch("/.netlify/functions/recommend", {
    method: "POST"
  });

  const data = await res.json();
  const movies = data.movies;

  movieList.innerHTML = "";

  for (const m of movies) {
    const d = await getMovieDetails(m.title);

    const poster = d?.poster_path
      ? `https://image.tmdb.org/t/p/w500${d.poster_path}`
      : "";

    const rating = d?.vote_average || "N/A";

    movieList.innerHTML += `
      <div class="movie-card">
        <img src="${poster}">
        <div>
          <h3>${m.title} (${m.year})</h3>
          <p>⭐ ${rating}</p>
          <p>${m.short_reason}</p>
        </div>
      </div>
    `;
  }

  // SAVE
  if (auth.currentUser) {
    await saveWatchlist(auth.currentUser.uid, movies);
  }
};

// LOAD SAVED
window.loadSaved = async () => {
  if (!auth.currentUser) return alert("Login first");

  const lists = await getWatchlist(auth.currentUser.uid);

  const movieList = document.getElementById("movieList");
  movieList.innerHTML = "<h2>Saved</h2>";

  lists.forEach(list => {
    list.movies.forEach(m => {
      movieList.innerHTML += `<p>${m.title}</p>`;
    });
  });
};