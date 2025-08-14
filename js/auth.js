// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
  authDomain: "goods-16d80.firebaseapp.com",
  projectId: "goods-16d80",
  storageBucket: "goods-16d80.firebasestorage.app",
  messagingSenderId: "751074879040",
  appId: "1:751074879040:web:0080a2badd43fa79fa21a5",
  measurementId: "G-SHDRHGQW81"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };


