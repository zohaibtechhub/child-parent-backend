const { db, COLLECTIONS } = require('../config/db');
const { scanMessage }     = require('../services/scanningEngine');

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /messages/send
 * Role: child only
 * Body: { text }
 *
 * Full flow:
 *  1. Validate input and confirm the child is paired with a parent.
 *  2. Pass the message through the scanning engine.
 *  3a. SAFE    → store in Firestore, return the message to the child.
 *  3b. FLAGGED → store as blocked, do NOT return the message text,
 *               return { blocked: true } so the child app can show a notice.
 *
 * The scanning engine (Step 6) handles:
 *  - Writing to flaggedLogs
 *  - Sending the FCM push notification to the parent
 */
const send = async (req, res) => {
  const childUid  = req.user.uid;
  const childName = req.userProfile.displayName;
  const { text }  = req.body;

  // ── Validation ─────────────────────────────────────────────────────────────
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required and must be a string.' });
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }
  if (trimmedText.length > 2000) {
    return res.status(400).json({ error: 'Message exceeds 2000 character limit.' });
  }

  // ── Pairing check ──────────────────────────────────────────────────────────
  const parentUid = req.userProfile.parentUid ?? req.userProfile.pairedWith;
  if (!parentUid) {
    return res.status(403).json({
      error: 'No paired parent found. Complete pairing before sending messages.',
    });
  }

  try {
    // ── Scan the message ──────────────────────────────────────────────────────
    const scanResult = await scanMessage({
      text: trimmedText,
      childUid,
      parentUid,
      childName,
    });

    // ── Build and store the message document ──────────────────────────────────
    const messageData = {
      senderId:    childUid,
      recipientId: parentUid,
      text:        scanResult.status === 'safe' ? trimmedText : '[blocked]',
      originalText: trimmedText,   // always stored server-side for audit purposes
      status:      scanResult.status,  // 'safe' | 'flagged'
      timestamp:   new Date().toISOString(),
      ...(scanResult.matchedPhrase && { matchedPhrase: scanResult.matchedPhrase }),
      ...(scanResult.matchedRuleId && { matchedRuleId: scanResult.matchedRuleId }),
      ...(scanResult.matchSource  && { matchSource:   scanResult.matchSource }),
      ...(scanResult.riskLevel    && { riskLevel:     scanResult.riskLevel }),
      ...(scanResult.logId        && { logId:          scanResult.logId }),
      ...(scanResult.incidentId   && { incidentId:     scanResult.incidentId }),
    };

    const msgRef = await db.collection(COLLECTIONS.MESSAGES).add(messageData);

    // ── Return appropriate response to child ──────────────────────────────────
    if (scanResult.status === 'flagged') {
      return res.status(200).json({
        blocked: true,
        message: 'Your message was blocked because it contained inappropriate content.',
      });
    }

    return res.status(201).json({
      blocked: false,
      message: {
        id:          msgRef.id,
        text:        trimmedText,
        senderId:    childUid,
        recipientId: parentUid,
        status:      'safe',
        timestamp:   messageData.timestamp,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to send message.', detail: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /messages
 * Role: child or parent (any authenticated paired user)
 *
 * Returns the message history between the caller and their paired partner.
 * - Children see only 'safe' messages (blocked ones are hidden from their view).
 * - Parents see all messages including blocked ones (for review purposes).
 *
 * Query params:
 *   limit  (optional) — max messages to return, default 50, max 200
 */
const history = async (req, res) => {
  const uid     = req.user.uid;
  const profile = req.userProfile;
  const role    = profile.role;
  const partner = profile.role === 'child'
    ? profile.parentUid ?? profile.pairedWith
    : req.query.childUid ?? profile.pairedWith;

  if (!partner) {
    return res.status(403).json({
      error: 'No paired partner found.',
    });
  }

  const limit = Math.min(parseInt(req.query.limit) || 50, 200);

  try {
    // Fetch messages where the caller is either sender or recipient.
    // Firestore doesn't support OR queries across different fields natively,
    // so we run two queries and merge + sort in memory.
    const [asSender, asRecipient] = await Promise.all([
      db.collection(COLLECTIONS.MESSAGES)
        .where('senderId',    '==', uid)
        .where('recipientId', '==', partner)
        .orderBy('timestamp', 'asc')
        .limit(limit)
        .get(),
      db.collection(COLLECTIONS.MESSAGES)
        .where('senderId',    '==', partner)
        .where('recipientId', '==', uid)
        .orderBy('timestamp', 'asc')
        .limit(limit)
        .get(),
    ]);

    let messages = [
      ...asSender.docs.map((d)    => ({ id: d.id, ...d.data() })),
      ...asRecipient.docs.map((d) => ({ id: d.id, ...d.data() })),
    ];

    // Sort merged results chronologically
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    messages = messages.slice(-limit); // keep only the last `limit` entries

    // Children only see safe messages — blocked ones show a placeholder
    if (role === 'child') {
      messages = messages.map((msg) => {
        if (msg.status === 'flagged') {
          return {
            id:          msg.id,
            senderId:    msg.senderId,
            recipientId: msg.recipientId,
            text:        '[Message not delivered]',
            status:      'flagged',
            timestamp:   msg.timestamp,
          };
        }
        return msg;
      });
    }

    return res.json({ count: messages.length, messages });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch messages.', detail: err.message });
  }
};

module.exports = { send, history };
