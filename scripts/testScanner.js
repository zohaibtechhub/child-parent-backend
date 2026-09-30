/**
 * scripts/testScanner.js
 * Run: node scripts/testScanner.js <parentUid> <childUid>
 *
 * Runs a series of safe and flagged messages through the scanning engine
 * and prints a results table. Does NOT require the server to be running.
 *
 * Prerequisites:
 *  - .env is populated with Firebase credentials
 *  - Parent account exists and has at least some phrases (run seedPhrases.js first)
 *  - Parent and child accounts exist in Firestore
 *
 * Usage:
 *   node scripts/testScanner.js <parentUid> <childUid>
 */

require('dotenv').config();
const { initFirebase } = require('../src/config/firebase');
const { scanMessage, normalize } = require('../src/services/scanningEngine');

// ── Test cases ────────────────────────────────────────────────────────────────

const TEST_CASES = [
  // [description, messageText, expectedStatus]
  ['Normal greeting',           'Hey, how are you?',                          'safe'],
  ['Homework chat',             'Did you finish the math homework?',           'safe'],
  ['Gaming talk',               'I beat level 10 last night, it was so hard!', 'safe'],

  // Direct phrase hits (from seed list)
  ['Direct: meet in person',    'We should meet in person tomorrow',           'flagged'],
  ['Direct: our little secret', 'This is our little secret ok?',              'flagged'],
  ['Direct: send me a pic',     'Can you send me a pic please',               'flagged'],
  ['Direct: are you home alone','Hey, are you home alone right now?',         'flagged'],

  // Leet-speak evasion attempts
  ['Leet: s3nd nud3s',          's3nd nud3s',                                 'flagged'],
  ['Leet: m33t in p3rs0n',      'we should m33t in p3rs0n',                  'flagged'],

  // Case variation
  ['Case: SEND ME A PHOTO',     'SEND ME A PHOTO right now',                  'flagged'],
  ['Case: Our Little Secret',   'Remember, Our Little Secret between us',     'flagged'],

  // Embedded in sentence
  ['Embedded phrase',           'nobody has to know this is our little secret', 'flagged'],
];

// ── Normalizer unit tests (no Firestore needed) ───────────────────────────────

const NORMALIZER_TESTS = [
  ['s3nd nud3s',       'send nudes'],
  ['M33T IN P3RS0N',   'meet in person'],
  ['WANNA MEET UP!!!', 'wanna meet up'],
  ['h3y @r3 you @l0n3','hey are you aione'],  // @→a, 3→e, 0→o
];

function runNormalizerTests() {
  console.log('── Normalizer Unit Tests (no Firestore) ─────────────────────────────\n');
  let passed = 0;
  for (const [input, expected] of NORMALIZER_TESTS) {
    const result = normalize(input);
    const ok = result === expected;
    if (ok) passed++;
    console.log(`  ${ok ? '✅' : '❌'}  "${input}" → "${result}"${!ok ? ` (expected "${expected}")` : ''}`);
  }
  console.log(`\n  ${passed}/${NORMALIZER_TESTS.length} normalizer tests passed.\n`);
}

// ── Full scan tests (requires Firestore) ─────────────────────────────────────

async function runScanTests(parentUid, childUid) {
  console.log('── Full Scan Tests (live Firestore) ─────────────────────────────────\n');
  console.log(`  Parent UID : ${parentUid}`);
  console.log(`  Child  UID : ${childUid}\n`);

  let passed = 0;
  let failed = 0;

  for (const [description, text, expectedStatus] of TEST_CASES) {
    try {
      const result = await scanMessage({
        text,
        childUid,
        parentUid,
        childName: 'Test Child',
      });

      const ok = result.status === expectedStatus;
      if (ok) passed++; else failed++;

      const icon   = ok ? '✅' : '❌';
      const detail = result.status === 'flagged'
        ? ` (matched: "${result.matchedPhrase}")`
        : '';

      console.log(`  ${icon}  [${expectedStatus.toUpperCase().padEnd(7)}] ${description}${detail}`);
      if (!ok) {
        console.log(`         └─ Got "${result.status}", expected "${expectedStatus}"`);
      }
    } catch (err) {
      failed++;
      console.log(`  💥  [ERROR  ] ${description} — ${err.message}`);
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed out of ${TEST_CASES.length} tests.`);

  if (failed === 0) {
    console.log('\n✅  All scan tests passed — scanning engine is working correctly.');
  } else {
    console.log('\n⚠️   Some tests failed. Check your phrase list (run seedPhrases.js if needed).');
  }
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const parentUid = process.argv[2];
  const childUid  = process.argv[3];

  if (!parentUid || !childUid) {
    console.error('Usage: node scripts/testScanner.js <parentUid> <childUid>');
    process.exit(1);
  }

  // Normalizer tests run without Firebase
  runNormalizerTests();

  // Scan tests need Firebase
  console.log('Initializing Firebase...');
  initFirebase();
  console.log('Firebase initialized.\n');

  await runScanTests(parentUid, childUid);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌  Test runner failed:', err.message);
  process.exit(1);
});
