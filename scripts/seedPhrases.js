/**
 * scripts/seedPhrases.js
 * Run: node scripts/seedPhrases.js <parentUid>
 *
 * Seeds the Firestore `phrases` collection with a curated starter list
 * of phrases commonly used by online predators, linked to a specific parent.
 *
 * Usage:
 *   node scripts/seedPhrases.js abc123parentuid
 *
 * You can find the parent UID in:
 *   - Firebase Console → Authentication → Users
 *   - Or from the /auth/register response (uid field)
 */

require('dotenv').config();
const { initFirebase } = require('../src/config/firebase');
const { db, COLLECTIONS } = require('../src/config/db');

// ── Starter phrase list ───────────────────────────────────────────────────────
// Phrases are stored lowercase. The scanning engine also normalizes input
// to lowercase before comparing, so matching is case-insensitive.
const STARTER_PHRASES = [
  // Grooming / relationship building
  'wanna meet up',
  'meet in person',
  'keep this between us',
  'our little secret',
  "don't tell your parents",
  'you can trust me',
  'i understand you better than your parents',
  'you are so mature for your age',

  // Isolation tactics
  'your parents don\'t understand you',
  'run away with me',
  'come live with me',
  'leave your family',

  // Requests for personal info
  'what is your home address',
  'where do you go to school',
  'send me your location',
  'what time do you get home',
  'are you home alone',
  'when are your parents away',

  // Requests for images / videos
  'send me a photo',
  'send me a pic',
  'send nudes',
  'show me on camera',
  'turn on your camera',
  'video call me',

  // Explicit / sexual language
  'do you have a boyfriend',
  'do you have a girlfriend',
  'have you ever kissed someone',
  'do you like older guys',
  'do you like older girls',

  // Gift / bribery tactics
  'i will buy you',
  'i will send you money',
  'i will give you a gift',

  // Platform switching (moving off monitored platforms)
  'message me on snapchat',
  'add me on instagram',
  'text me on whatsapp',
  'call me on telegram',
];

// ─────────────────────────────────────────────────────────────────────────────

async function seed(parentUid) {
  console.log(`Seeding phrases for parent UID: ${parentUid}\n`);
  initFirebase();

  // Check the parent exists
  const parentDoc = await db.collection(COLLECTIONS.USERS).doc(parentUid).get();
  if (!parentDoc.exists) {
    console.error(`❌  No user found with UID: ${parentUid}`);
    console.error('    Check Firebase Console → Authentication → Users for the correct UID.');
    process.exit(1);
  }
  if (parentDoc.data().role !== 'parent') {
    console.error(`❌  User ${parentUid} has role "${parentDoc.data().role}", not "parent".`);
    process.exit(1);
  }

  // Fetch already-existing phrases so we don't duplicate
  const existing = await db
    .collection(COLLECTIONS.PHRASES)
    .where('addedBy', '==', parentUid)
    .get();
  const existingTexts = new Set(existing.docs.map((d) => d.data().text));

  const toAdd = STARTER_PHRASES.filter((p) => !existingTexts.has(p));

  if (toAdd.length === 0) {
    console.log('All starter phrases are already in the database. Nothing to add.');
    process.exit(0);
  }

  // Write in batches of 500 (Firestore batch limit)
  const BATCH_SIZE = 500;
  let added = 0;

  for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toAdd.slice(i, i + BATCH_SIZE);

    chunk.forEach((text) => {
      const ref = db.collection(COLLECTIONS.PHRASES).doc();
      batch.set(ref, {
        text,
        addedBy:   parentUid,
        createdAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    added += chunk.length;
    console.log(`  Written ${added} / ${toAdd.length} phrases...`);
  }

  console.log(`\n✅  Seeded ${added} phrases for parent "${parentDoc.data().displayName}".`);
  console.log(`    Skipped ${existingTexts.size} already-existing phrases.`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────

const parentUid = process.argv[2];
if (!parentUid) {
  console.error('Usage: node scripts/seedPhrases.js <parentUid>');
  process.exit(1);
}

seed(parentUid).catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
