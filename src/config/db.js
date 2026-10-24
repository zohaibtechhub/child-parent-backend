const { admin } = require('./firebase');

// Single Firestore instance reused across the entire app.
// Always import `db` from here — never call admin.firestore() directly elsewhere.
const db = admin.firestore();

// Centralize collection names so a typo in one place doesn't silently break queries.
const COLLECTIONS = {
  USERS:          'users',
  PAIRINGS:       'pairings',
  PHRASES:        'phrases',
  SAFETY_RULES:   'safetyRules',
  GLOBAL_PHRASES: 'globalPhrases',
  MESSAGES:       'messages',
  FLAGGED_LOGS:   'flaggedLogs',
  INCIDENTS:      'incidents',
};

module.exports = { db, COLLECTIONS };
 