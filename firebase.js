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

const firebaseConfig = {
  apiKey: "AIzaSyAAOa7HoUIq_XtYoZG_s4gUs1E6k1g3M_w",
  authDomain: "https://filmfuseai-e3452.firebaseapp.com/",
  projectId: "https://filmfuseai-e3452-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const signup = (email, pass) =>
  createUserWithEmailAndPassword(auth, email, pass);

export const login = (email, pass) =>
  signInWithEmailAndPassword(auth, email, pass);

export const logout = () => signOut(auth);

export async function saveWatchlist(uid, movies) {
  await addDoc(collection(db, "watchlists"), {
    uid,
    movies,
    createdAt: new Date()
  });
}

export async function getWatchlist(uid) {
  const snap = await getDocs(collection(db, "watchlists"));
  return snap.docs
    .map(d => d.data())
    .filter(x => x.uid === uid);
}