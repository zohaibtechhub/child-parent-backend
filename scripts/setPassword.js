/**
 * setPassword.js
 * Usage: node scripts/setPassword.js <email> <newPassword>
 *
 * Sets (or resets) a Firebase Auth user's password directly via Admin SDK.
 * Useful when password reset emails are not being received.
 */

require('dotenv').config();
const { admin, initFirebase } = require('../src/config/firebase');

const [,, email, newPassword] = process.argv;

if (!email || !newPassword) {
  console.error('Usage: node scripts/setPassword.js <email> <newPassword>');
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error('Password must be at least 6 characters.');
  process.exit(1);
}

initFirebase();

(async () => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(user.uid, { password: newPassword });
    console.log(`✅ Password updated for ${email} (uid: ${user.uid})`);
    console.log('You can now sign in with the new password on the app.');
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.error(`❌ No account found with email: ${email}`);
    } else {
      console.error('❌ Error:', err.message);
    }
    process.exit(1);
  }
})();
