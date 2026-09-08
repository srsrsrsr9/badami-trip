// ── Fill this in with YOUR OWN Firebase project's values ──────────────────
// Get these from: Firebase Console → Project settings → General → "Your apps"
// → Web app → SDK setup and configuration → Config
//
// These values are NOT secret — Firebase is designed so this config can be
// public. Real security comes from the Firestore rules you set in the
// Firebase console (see README.md), not from hiding this file.

window.firebaseConfig = {
  apiKey: "AIzaSyANiZVPClJrPHO7S3wJJcGmG6s5ge-M8lk",
  authDomain: "badami-trip-71287.firebaseapp.com",
  projectId: "badami-trip-71287",
  storageBucket: "badami-trip-71287.firebasestorage.app",
  messagingSenderId: "564874707136",
  appId: "1:564874707136:web:66e3c6dd2e84ef1d58ad25"
};

// Only these two Google accounts will be allowed to sign in and see the trip.
// This is also enforced server-side by the Firestore rules in README.md —
// this list just gives a friendlier message if someone else signs in.
window.ALLOWED_EMAILS = [
  "vedantam.srinivas@gmail.com",
  "sravanthi883@gmail.com",
];

firebase.initializeApp(window.firebaseConfig);
