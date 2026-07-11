// ==========================================================
// firebase-config.js
// BotVerse - Firebase සැකසුම
// ==========================================================

const firebaseConfig = {
  apiKey: "AIzaSyA9Nq3N72FYnRjF1xyEkwegZcIbluLXaqk",
  authDomain: "botverse-3343b.firebaseapp.com",
  projectId: "botverse-3343b",
  storageBucket: "botverse-3343b.firebasestorage.app",
  messagingSenderId: "294353317707",
  appId: "1:294353317707:web:1c9a5c41c8b548a43742ce",
  measurementId: "G-FYJ8EXC5LZ"
};

// Firebase Initialize
firebase.initializeApp(firebaseConfig);

// Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ==========================================================
// Admin account email (dashboard access check සඳහා)
// ==========================================================
const ADMIN_EMAIL = "isharaktii@gmail.com";
