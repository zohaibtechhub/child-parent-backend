const { admin } = require('../config/firebase');
const { db, COLLECTIONS } = require('../config/db');

/**
 * POST /auth/register
 * Body: { email, password, displayName, role: "parent"|"child" }
 *
 * Flow:
 *  1. Create the Firebase Auth user with email + password.
 *  2. Write a matching Firestore document in the `users` collection.
 *  3. Return the uid and profile data.
 *
 * Note: The client then signs in via Firebase Auth SDK to get an ID token
 * (used on subsequent authenticated requests).
 */
const register = async (req, res) => {
  const { email, password, displayName, role } = req.body;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!email || !password || !displayName || !role) {
    return res.status(400).json({ error: 'email, password, displayName, and role are required.' });
  }
  if (!['parent', 'child'].includes(role)) {
    return res.status(400).json({ error: 'role must be "parent" or "child".' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'password must be at least 6 characters.' });
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({ email, password, displayName });

    // 2. Write Firestore profile
    const profile = {
      uid:         userRecord.uid,
      email,
      displayName,
      role,
      fcmToken:    null,   // set when the mobile app registers for push notifications
      pairedWith:  null,   // set after pairing handshake (Step 4)
      ...(role === 'parent' ? { childUids: [] } : { parentUid: null, protectionLevel: 'strict' }),
      createdAt:   new Date().toISOString(),
    };

    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set(profile);

    return res.status(201).json({
      message: 'User registered successfully.',
      uid: userRecord.uid,
      profile,
    });
  } catch (err) {
    // Firebase throws specific error codes we can surface clearly
    if (err.code === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return res.status(500).json({ error: 'Registration failed.', detail: err.message });
  }
};

/**
 * GET /auth/me
 * Header: Authorization: Bearer <id-token>
 *
 * Returns the authenticated user's Firestore profile.
 * The client obtains an ID token by signing in via the Firebase Auth SDK
 * (using email + password), then sends it here to get their full profile.
 *
 * Why GET instead of POST /login?
 * Firebase Auth handles the actual credential check client-side.
 * The backend just needs to validate the token and return the profile.
 * This avoids the backend ever handling raw passwords after registration.
 */
const me = async (req, res) => {
  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found in database.' });
    }

    return res.json({ profile: userDoc.data() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch profile.', detail: err.message });
  }
};

/**
 * PATCH /auth/fcm-token
 * Header: Authorization: Bearer <id-token>
 * Body: { fcmToken }
 *
 * Called by the mobile app on launch to keep the FCM token current.
 * The backend uses this token to send push notifications (Step 6).
 */
const updateFcmToken = async (req, res) => {
  const { fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: 'fcmToken is required.' });
  }

  try {
    await db.collection(COLLECTIONS.USERS).doc(req.user.uid).update({ fcmToken });
    return res.json({ message: 'FCM token updated.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update FCM token.', detail: err.message });
  }
};

module.exports = { register, me, updateFcmToken };
