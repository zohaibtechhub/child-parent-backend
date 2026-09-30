/**
 * scripts/testConnection.js
 * Run: node scripts/testConnection.js
 *
 * Verifies:
 *  1. Firebase Admin SDK initializes correctly.
 *  2. Firestore is reachable.
 *  3. A test document can be written and then deleted (write + read + delete).
 */

require('dotenv').config();

// Firebase MUST be initialized before db.js is imported,
// because db.js calls admin.firestore() at module load time.
const { initFirebase } = require('../src/config/firebase');
initFirebase();

const { db, COLLECTIONS } = require('../src/config/db');

async function run() {
  console.log('Firebase Admin SDK initialized.\n');

  // ── Write test doc ─────────────────────────────────────────────────────────
  console.log('Writing test document to Firestore...');
  const testRef = db.collection('_connectionTest').doc('ping');
  await testRef.set({ timestamp: new Date().toISOString(), ok: true });
  console.log('  Write successful.\n');

  // ── Read it back ───────────────────────────────────────────────────────────
  console.log('Reading test document back...');
  const snap = await testRef.get();
  console.log('  Read successful. Data:', snap.data(), '\n');

  // ── Clean up ───────────────────────────────────────────────────────────────
  console.log('Deleting test document...');
  await testRef.delete();
  console.log('  Delete successful.\n');

  // ── Verify collections are accessible ─────────────────────────────────────
  console.log('Checking collection names are defined:');
  Object.entries(COLLECTIONS).forEach(([key, val]) =>
    console.log(`  ${key.padEnd(14)} → "${val}"`)
  );

  console.log('\n✅  All checks passed — Firestore connection is healthy.');
  process.exit(0);
}

run().catch((err) => {
  console.error('\n❌  Connection test failed:', err.message);
  console.error(
    '\nCommon causes:\n' +
    '  • .env file missing or wrong credentials\n' +
    '  • Firestore not enabled in Firebase Console\n' +
    '  • FIREBASE_PRIVATE_KEY has extra/missing quotes'
  );
  process.exit(1);
});
