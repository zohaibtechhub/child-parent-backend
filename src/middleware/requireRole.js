const { db, COLLECTIONS } = require('../config/db');

/**
 * requireRole(role)
 * Factory middleware — restricts a route to users with a specific role.
 * Must be used AFTER verifyToken (relies on req.user.uid being set).
 *
 * Usage:
 *   router.post('/pair/generate', verifyToken, requireRole('parent'), handler)
 *   router.post('/pair/join',     verifyToken, requireRole('child'),  handler)
 */
const requireRole = (...roles) => async (req, res, next) => {
  const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;

  try {
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({ error: 'User profile not found.' });
    }

    if (!allowedRoles.includes(userDoc.data().role)) {
      return res.status(403).json({
        error: `Access denied. This endpoint requires role: "${allowedRoles.join(' or ')}".`,
      });
    }

    // Attach full profile to req so downstream handlers don't need to re-fetch.
    req.userProfile = userDoc.data();
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Role check failed.', detail: err.message });
  }
};

module.exports = requireRole;
