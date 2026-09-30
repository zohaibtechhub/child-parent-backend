/**
 * scripts/seedGlobalPhrases.js
 * Run: node scripts/seedGlobalPhrases.js
 *
 * Seeds the `globalPhrases` Firestore collection with the system-wide
 * flagged phrase database. These phrases are checked on EVERY message
 * from EVERY child, regardless of what the parent has configured.
 *
 * Categories:
 *   - grooming     : predator tactics, isolation, trust-building
 *   - explicit     : sexual language and requests
 *   - drugs        : substance references and slang
 *
 * Safe to re-run — existing phrases are skipped (no duplicates created).
 *
 * Usage:
 *   node scripts/seedGlobalPhrases.js
 *   node scripts/seedGlobalPhrases.js --dry-run    (preview without writing)
 *   node scripts/seedGlobalPhrases.js --clear       (delete all then re-seed)
 */

require('dotenv').config();
const { initFirebase } = require('../src/config/firebase');

// initFirebase() MUST be called before db.js is imported —
// db.js calls admin.firestore() at module load time.
initFirebase();

const { db, COLLECTIONS } = require('../src/config/db');

// ── Global phrase database ────────────────────────────────────────────────────

const GLOBAL_PHRASES = [

  // ── GROOMING & PREDATOR TACTICS ────────────────────────────────────────────
  // Trust-building / relationship grooming
  { text: 'our little secret',                category: 'grooming' },
  { text: 'keep this between us',             category: 'grooming' },
  { text: 'dont tell your parents',           category: 'grooming' },
  { text: 'dont tell anyone',                 category: 'grooming' },
  { text: 'you can trust me',                 category: 'grooming' },
  { text: 'i wont tell anyone',               category: 'grooming' },
  { text: 'you are so mature for your age',   category: 'grooming' },
  { text: 'mature for your age',              category: 'grooming' },
  { text: 'i understand you',                 category: 'grooming' },
  { text: 'i understand you better',          category: 'grooming' },
  { text: 'your parents dont understand',     category: 'grooming' },
  { text: 'nobody understands you like i do', category: 'grooming' },
  { text: 'i am not like other adults',       category: 'grooming' },
  { text: 'you are special to me',            category: 'grooming' },
  { text: 'you are different from other kids',category: 'grooming' },
  { text: 'i have never felt this way',       category: 'grooming' },
  { text: 'i love you more than anything',    category: 'grooming' },
  { text: 'we have a special connection',     category: 'grooming' },
  { text: 'do you have a boyfriend',          category: 'grooming' },
  { text: 'do you have a girlfriend',         category: 'grooming' },
  { text: 'have you ever kissed someone',     category: 'grooming' },
  { text: 'have you ever been kissed',        category: 'grooming' },
  { text: 'have you ever had sex',            category: 'grooming' },
  { text: 'are you still a virgin',           category: 'grooming' },
  { text: 'do you like older guys',           category: 'grooming' },
  { text: 'do you like older girls',          category: 'grooming' },
  { text: 'do you like older men',            category: 'grooming' },
  { text: 'do you like older women',          category: 'grooming' },
  { text: 'age is just a number',             category: 'grooming' },

  // Isolation / extraction
  { text: 'run away with me',                 category: 'grooming' },
  { text: 'come live with me',                category: 'grooming' },
  { text: 'leave your family',                category: 'grooming' },
  { text: 'your parents are controlling',     category: 'grooming' },
  { text: 'your parents are abusive',         category: 'grooming' },
  { text: 'you should leave home',            category: 'grooming' },
  { text: 'i will take care of you',          category: 'grooming' },
  { text: 'i can take care of you',           category: 'grooming' },
  { text: 'you can stay with me',             category: 'grooming' },
  { text: 'come stay with me',                category: 'grooming' },

  // Physical meeting / location
  { text: 'meet in person',                   category: 'grooming' },
  { text: 'meet up',                          category: 'grooming' },
  { text: 'wanna meet',                       category: 'grooming' },
  { text: 'lets meet',                        category: 'grooming' },
  { text: 'come meet me',                     category: 'grooming' },
  { text: 'where do you live',                category: 'grooming' },
  { text: 'what is your address',             category: 'grooming' },
  { text: 'what is your home address',        category: 'grooming' },
  { text: 'where do you go to school',        category: 'grooming' },
  { text: 'send me your location',            category: 'grooming' },
  { text: 'share your location',              category: 'grooming' },
  { text: 'what time do you get home',        category: 'grooming' },
  { text: 'are you home alone',               category: 'grooming' },
  { text: 'when are your parents away',       category: 'grooming' },
  { text: 'when are your parents out',        category: 'grooming' },
  { text: 'when will you be alone',           category: 'grooming' },
  { text: 'come alone',                       category: 'grooming' },
  { text: 'dont bring anyone',                category: 'grooming' },
  { text: 'come by yourself',                 category: 'grooming' },
  { text: 'sneak out',                        category: 'grooming' },
  { text: 'can you sneak out',                category: 'grooming' },

  // Gift / bribery
  { text: 'i will buy you',                   category: 'grooming' },
  { text: 'i will send you money',            category: 'grooming' },
  { text: 'i will give you money',            category: 'grooming' },
  { text: 'i will give you a gift',           category: 'grooming' },
  { text: 'i will buy you anything',          category: 'grooming' },
  { text: 'i will pay you',                   category: 'grooming' },
  { text: 'i will reward you',                category: 'grooming' },

  // Platform switching (moving child to unmonitored platforms)
  { text: 'message me on snapchat',           category: 'grooming' },
  { text: 'add me on snapchat',               category: 'grooming' },
  { text: 'add me on instagram',              category: 'grooming' },
  { text: 'text me on whatsapp',              category: 'grooming' },
  { text: 'call me on telegram',              category: 'grooming' },
  { text: 'message me on telegram',           category: 'grooming' },
  { text: 'use discord instead',              category: 'grooming' },
  { text: 'add me on discord',                category: 'grooming' },
  { text: 'lets use another app',             category: 'grooming' },
  { text: 'switch to another app',            category: 'grooming' },
  { text: 'your parents cant see',            category: 'grooming' },
  { text: 'they cant track us',               category: 'grooming' },
  { text: 'delete this conversation',         category: 'grooming' },
  { text: 'delete these messages',            category: 'grooming' },

  // ── EXPLICIT SEXUAL LANGUAGE ───────────────────────────────────────────────
  // Image / video requests
  { text: 'send nudes',                       category: 'explicit' },
  { text: 'send nude',                        category: 'explicit' },
  { text: 'send me a pic',                    category: 'explicit' },
  { text: 'send me a photo',                  category: 'explicit' },
  { text: 'send me photos',                   category: 'explicit' },
  { text: 'send me pictures',                 category: 'explicit' },
  { text: 'send me a picture',                category: 'explicit' },
  { text: 'show me your body',                category: 'explicit' },
  { text: 'show me on camera',                category: 'explicit' },
  { text: 'turn on your camera',              category: 'explicit' },
  { text: 'video call me',                    category: 'explicit' },
  { text: 'facetime me',                      category: 'explicit' },
  { text: 'go on camera',                     category: 'explicit' },
  { text: 'get on camera',                    category: 'explicit' },
  { text: 'send me a selfie',                 category: 'explicit' },

  // Sexual acts / requests
  { text: 'want to have sex',                 category: 'explicit' },
  { text: 'lets have sex',                    category: 'explicit' },
  { text: 'do you want to have sex',          category: 'explicit' },
  { text: 'have sex with me',                 category: 'explicit' },
  { text: 'hook up with me',                  category: 'explicit' },
  { text: 'wanna hook up',                    category: 'explicit' },
  { text: 'sleep with me',                    category: 'explicit' },
  { text: 'sleep with you',                   category: 'explicit' },
  { text: 'touch yourself',                   category: 'explicit' },
  { text: 'touched yourself',                 category: 'explicit' },
  { text: 'masturbate',                       category: 'explicit' },
  { text: 'make out with me',                 category: 'explicit' },
  { text: 'lets make out',                    category: 'explicit' },
  { text: 'do you want to kiss',              category: 'explicit' },
  { text: 'i want to kiss you',               category: 'explicit' },
  { text: 'i want to touch you',              category: 'explicit' },
  { text: 'let me touch you',                 category: 'explicit' },
  { text: 'i will touch you',                 category: 'explicit' },
  { text: 'oral sex',                         category: 'explicit' },
  { text: 'blow job',                         category: 'explicit' },
  { text: 'blowjob',                          category: 'explicit' },
  { text: 'hand job',                         category: 'explicit' },
  { text: 'handjob',                          category: 'explicit' },

  // Explicit words (kept to highest-severity terms to minimise false positives)
  { text: 'penis',                            category: 'explicit' },
  { text: 'vagina',                           category: 'explicit' },
  { text: 'pussy',                            category: 'explicit' },
  { text: 'cock',                             category: 'explicit' },
  { text: 'dick pic',                         category: 'explicit' },
  { text: 'naked',                            category: 'explicit' },
  { text: 'nude pic',                         category: 'explicit' },
  { text: 'nudes',                            category: 'explicit' },
  { text: 'sexting',                          category: 'explicit' },
  { text: 'sext me',                          category: 'explicit' },
  { text: 'lets sext',                        category: 'explicit' },
  { text: 'porn',                             category: 'explicit' },
  { text: 'pornhub',                          category: 'explicit' },
  { text: 'onlyfans',                         category: 'explicit' },
  { text: 'nude video',                       category: 'explicit' },
  { text: 'cunt',                             category: 'explicit' },
  { text: 'clitoris',                         category: 'explicit' },
  { text: 'testicles',                        category: 'explicit' },
  { text: 'genitals',                         category: 'explicit' },
  { text: 'genitalia',                        category: 'explicit' },
  { text: 'chilf',                            category: 'explicit' },

  // ── DRUGS & SUBSTANCE REFERENCES ──────────────────────────────────────────
  // Offering / selling
  { text: 'wanna buy',                        category: 'drugs' },
  { text: 'want to buy',                      category: 'drugs' },
  { text: 'wanna score',                      category: 'drugs' },
  { text: 'i can get you',                    category: 'drugs' },
  { text: 'i can hook you up',                category: 'drugs' },
  { text: 'selling pills',                    category: 'drugs' },
  { text: 'i have pills',                     category: 'drugs' },
  { text: 'try this pill',                    category: 'drugs' },
  { text: 'take this pill',                   category: 'drugs' },
  { text: 'take these pills',                 category: 'drugs' },
  { text: 'take this drug',                   category: 'drugs' },

  // Getting high
  { text: 'get high',                         category: 'drugs' },
  { text: 'lets get high',                    category: 'drugs' },
  { text: 'wanna get high',                   category: 'drugs' },
  { text: 'want to get high',                 category: 'drugs' },
  { text: 'smoke weed',                       category: 'drugs' },
  { text: 'smoke with me',                    category: 'drugs' },
  { text: 'got any weed',                     category: 'drugs' },
  { text: 'got weed',                         category: 'drugs' },
  { text: 'have any weed',                    category: 'drugs' },
  { text: 'do you smoke',                     category: 'drugs' },
  { text: 'want to smoke',                    category: 'drugs' },
  { text: 'wanna smoke',                      category: 'drugs' },
  { text: 'blunt',                            category: 'drugs' },
  { text: 'joint',                            category: 'drugs' },

  // Drug names / slang
  { text: 'cocaine',                          category: 'drugs' },
  { text: 'got coke',                         category: 'drugs' },
  { text: 'want some coke',                   category: 'drugs' },
  { text: 'heroin',                           category: 'drugs' },
  { text: 'methamphetamine',                  category: 'drugs' },
  { text: 'got meth',                         category: 'drugs' },
  { text: 'crystal meth',                     category: 'drugs' },
  { text: 'ecstasy',                          category: 'drugs' },
  { text: 'mdma',                             category: 'drugs' },
  { text: 'got molly',                        category: 'drugs' },
  { text: 'got mdma',                         category: 'drugs' },
  { text: 'take molly',                       category: 'drugs' },
  { text: 'ketamine',                         category: 'drugs' },
  { text: 'xanax',                            category: 'drugs' },
  { text: 'oxy',                              category: 'drugs' },
  { text: 'oxycodone',                        category: 'drugs' },
  { text: 'fentanyl',                         category: 'drugs' },
  { text: 'mushrooms',                        category: 'drugs' },
  { text: 'magic mushrooms',                  category: 'drugs' },
  { text: 'shrooms',                          category: 'drugs' },
  { text: 'lsd',                              category: 'drugs' },
  { text: 'acid trip',                        category: 'drugs' },
  { text: 'pcp',                              category: 'drugs' },
  { text: 'crack cocaine',                    category: 'drugs' },
  { text: 'lean',                             category: 'drugs' },
  { text: 'purple drank',                     category: 'drugs' },
  { text: 'whippets',                         category: 'drugs' },
  { text: 'nitrous oxide',                    category: 'drugs' },
  { text: 'vape',                             category: 'drugs' },
  { text: 'vaping',                           category: 'drugs' },

  // Date-rape / incapacitating drugs
  { text: 'roofie',                           category: 'drugs' },
  { text: 'roofy',                            category: 'drugs' },
  { text: 'ghb',                              category: 'drugs' },
  { text: 'speedball',                        category: 'drugs' },
  { text: 'dime bag',                         category: 'drugs' },
  { text: 'nickel bag',                       category: 'drugs' },
  { text: 'poppers',                          category: 'drugs' },

];

// ─────────────────────────────────────────────────────────────────────────────

const isDryRun = process.argv.includes('--dry-run');
const isClear  = process.argv.includes('--clear');

async function clearExisting() {
  console.log('Clearing existing globalPhrases collection...');
  const snap = await db.collection(COLLECTIONS.GLOBAL_PHRASES).get();
  if (snap.empty) {
    console.log('  Collection is already empty.\n');
    return;
  }

  const BATCH_SIZE = 500;
  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH_SIZE).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  console.log(`  Deleted ${snap.docs.length} existing phrases.\n`);
}

async function seed() {
  console.log('═══════════════════════════════════════════');
  console.log(' Parent Patrol — Global Phrase Seeder');
  console.log('═══════════════════════════════════════════\n');

  if (isDryRun) {
    console.log('DRY RUN — no writes will be made.\n');
    const counts = {};
    GLOBAL_PHRASES.forEach(({ category }) => {
      counts[category] = (counts[category] || 0) + 1;
    });
    console.log(`Total phrases: ${GLOBAL_PHRASES.length}`);
    Object.entries(counts).forEach(([cat, count]) =>
      console.log(`  ${cat.padEnd(12)} ${count} phrases`)
    );
    return;
  }

  if (isClear) await clearExisting();

  // Fetch existing texts to avoid duplicates
  const existingSnap = await db.collection(COLLECTIONS.GLOBAL_PHRASES).get();
  const existingTexts = new Set(existingSnap.docs.map((d) => d.data().text));

  const toAdd = GLOBAL_PHRASES.filter(({ text }) => !existingTexts.has(text));

  if (toAdd.length === 0) {
    console.log('All phrases are already in globalPhrases. Nothing to add.');
    process.exit(0);
  }

  const BATCH_SIZE = 500;
  let added = 0;

  for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = toAdd.slice(i, i + BATCH_SIZE);

    chunk.forEach(({ text, category }) => {
      const ref = db.collection(COLLECTIONS.GLOBAL_PHRASES).doc();
      batch.set(ref, {
        text,
        category,
        createdAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    added += chunk.length;
    console.log(`  Written ${added} / ${toAdd.length} phrases...`);
  }

  // Summary by category
  const counts = {};
  toAdd.forEach(({ category }) => {
    counts[category] = (counts[category] || 0) + 1;
  });

  console.log(`\n✅  Seeded ${added} global phrases.`);
  console.log(`    Skipped ${existingTexts.size} already-existing phrases.\n`);
  console.log('  By category:');
  Object.entries(counts).forEach(([cat, count]) =>
    console.log(`    ${cat.padEnd(12)} ${count} phrases`)
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
