const { admin } = require('../config/firebase');

/**
 * verifyToken
 * Extracts the Firebase ID token from the Authorization header,
 * verifies it with Firebase Admin, and attaches the decoded user
 * to req.user for use in downstream route handlers.
 *
 * Usage: router.post('/protected', verifyToken, handler)
 *
 * The client must send:
 *   Authorization: Bearer <firebase-id-token>
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // { uid, email, role (custom claim if set), ... }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.', detail: err.message });
  }
};

module.exports = verifyToken;
