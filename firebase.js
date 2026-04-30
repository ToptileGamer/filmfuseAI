import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 YOUR CONFIG HERE
const firebaseConfig = {
  apiKey: "AIzaSyAAOa7HoUIq_XtYoZG_s4gUs1E6k1g3M_w",
  authDomain: "https://filmfuseai-e3452.firebaseapp.com/",
  projectId: "https://console.firebase.google.com/u/0/project/filmfuseai-e3452/database/filmfuseai-e3452-default-rtdb/data/",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// SIGNUP
export async function signup(email, password) {
  return await createUserWithEmailAndPassword(auth, email, password);
}

// LOGIN
export async function login(email, password) {
  return await signInWithEmailAndPassword(auth, email, password);
}

// LOGOUT
export function logout() {
  return signOut(auth);
}

// SAVE WATCHLIST
export async function saveWatchlist(userId, movies) {
  await addDoc(collection(db, "watchlists"), {
    userId,
    movies,
    createdAt: new Date()
  });
}

// GET WATCHLIST
export async function getWatchlist(userId) {
  const snapshot = await getDocs(collection(db, "watchlists"));
  return snapshot.docs
    .map(doc => doc.data())
    .filter(item => item.userId === userId);
}