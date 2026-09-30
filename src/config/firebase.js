const admin = require('firebase-admin');

// Firebase is initialized once and reused across the app.
// Credentials are read from environment variables (never hardcoded).
const initFirebase = () => {
  if (admin.apps.length > 0) return; // already initialized

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env stores \n as literal string — replace back to real newlines
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
};

module.exports = { admin, initFirebase };
