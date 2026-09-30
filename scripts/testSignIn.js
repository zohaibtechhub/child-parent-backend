/**
 * testSignIn.js
 * Usage: node scripts/testSignIn.js <email> <password>
 *
 * Tests Firebase Auth sign-in directly via the REST API — completely bypasses
 * the Flutter app. If this succeeds but the app fails, the issue is in the app.
 * If this also fails, the credentials are genuinely wrong in Firebase.
 */

require('dotenv').config();

const https = require('https');

const [,, email, password] = process.argv;

if (!email || !password) {
  console.error('Usage: node scripts/testSignIn.js <email> <password>');
  process.exit(1);
}

// API key from firebase_options.dart (same project: parent-patrol-parentapp)
const API_KEY = 'AIzaSyDe7Cy0-2LPrrbam-HtbT5ioIfVrwqiKQc';

const body = JSON.stringify({ email, password, returnSecureToken: true });

const options = {
  hostname: 'identitytoolkit.googleapis.com',
  path: `/v1/accounts:signInWithPassword?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const parsed = JSON.parse(data);
    if (parsed.idToken) {
      console.log(`✅ Sign-in SUCCESS`);
      console.log(`   UID:   ${parsed.localId}`);
      console.log(`   Email: ${parsed.email}`);
    } else {
      console.log(`❌ Sign-in FAILED`);
      console.log(`   Error: ${parsed.error?.message}`);
    }
  });
});

req.on('error', err => {
  console.error('Network error:', err.message);
});

req.write(body);
req.end();
