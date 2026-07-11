// ==========================================================
// firebase-config.js
// BotVerse - Firebase සැකසුම
// ==========================================================
// Firebase Console -> Project Settings -> Your apps -> SDK config
// වලින් ගන්න value ටික මෙතන දාන්න
// ==========================================================

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Admin dashboard access check සඳහා
const ADMIN_EMAIL = "isharaktii@gmail.com";
