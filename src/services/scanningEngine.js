const { admin } = require('../config/firebase');
const { db, COLLECTIONS } = require('../config/db');

// ── Text normalizer ───────────────────────────────────────────────────────────

/**
 * normalize(text)
 * Prepares a string for matching by:
 *  1. Lowercasing everything.
 *  2. Replacing common leet-speak substitutions (3→e, 0→o, 1→i/l, @→a, $→s, etc.)
 *     so simple character swaps don't bypass the filter.
 *  3. Collapsing repeated characters (e.g. "meeeeet" → "meet").
 *  4. Stripping punctuation and extra whitespace.
 */
const normalize = (text) => {
  return text
    .toLowerCase()
    .replace(/3/g, 'e')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/5/g, 's')
    .replace(/4/g, 'a')
    .replace(/\+/g, 't')
    .replace(/(.)\1{2,}/g, '$1$1') // "meeeeet" → "meet", keeps double letters intact
    .replace(/[^a-z0-9\s]/g, ' ')  // strip remaining punctuation
    .replace(/\s+/g, ' ')
    .trim();
};

// ── FCM notification sender ───────────────────────────────────────────────────

/**
 * sendAlertToParent({ fcmToken, childName, matchedPhrase, messageText, matchSource, riskLevel, incidentId })
 * Sends a Firebase Cloud Messaging push notification to the parent's device.
 * Called only when a message is flagged.
 */
const sendAlertToParent = async ({ fcmToken, childName, matchedPhrase, messageText, matchSource, riskLevel, incidentId }) => {
  if (!fcmToken) {
    console.warn('[ScanEngine] Parent has no FCM token — push notification skipped.');
    return;
  }

  const sourceLabel = matchSource === 'global' ? 'System' : 'Parent';

  const notification = {
    title: `Parent Patrol ${riskLevel ?? 'medium'} alert`,
    body: `${childName} sent a flagged message: "${messageText.slice(0, 60)}${messageText.length > 60 ? '…' : ''}"`,
  };

  const message = {
    token: fcmToken,
    notification,
    data: {
      type:           'flagged_message',
      matchedPhrase,
      matchSource:    matchSource ?? 'parent',
      sourceLabel,
      childName,
      riskLevel: riskLevel ?? 'medium',
      incidentId: incidentId ?? '',
      messagePreview: messageText.slice(0, 100),
    },
    android: {
      priority: 'high',
      notification: { sound: 'default', channelId: 'parent_patrol_alerts' },
    },
    apns: {
      payload: { aps: { sound: 'default', badge: 1 } },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('[ScanEngine] FCM push sent. Message ID:', response);
  } catch (err) {
    console.error('[ScanEngine] FCM send failed:', err.message);
  }
};

// ── Core scan function ────────────────────────────────────────────────────────

/**
 * scanMessage({ text, childUid, parentUid, childName })
 *
 * Flow:
 *  1. Fetch parent safety rules, legacy phrases, and global system phrases in parallel.
 *  2. Normalize the incoming message text.
 *  3. Apply allowed phrases first, then blocked phrases, then global phrases.
 *  4a. SAFE    → return { status: 'safe' }
 *  4b. FLAGGED → write to incidents and flaggedLogs, send FCM push,
 *               return { status: 'flagged', matchedPhrase, matchSource, incidentId, logId }
 *
 * matchSource: 'parent' = matched the parent's own custom list
 *              'global' = matched the system-wide built-in list
 */
const scanMessage = async ({ text, childUid, parentUid, childName }) => {
  // 1. Fetch safety rule and phrase lists in parallel
  const [rulesSnap, parentSnap, globalSnap] = await Promise.all([
    db.collection(COLLECTIONS.SAFETY_RULES)
      .where('parentUid', '==', parentUid)
      .where('enabled', '==', true)
      .get(),
    db.collection(COLLECTIONS.PHRASES).where('addedBy', '==', parentUid).get(),
    db.collection(COLLECTIONS.GLOBAL_PHRASES).get(),
  ]);

  const safetyRules = rulesSnap.docs.map((doc) => ({
    id: doc.id,
    text: doc.data().text,
    type: doc.data().type,
    riskLevel: doc.data().riskLevel ?? 'medium',
    category: doc.data().category ?? doc.data().type,
    source: 'parent',
  }));

  const parentPhrases = parentSnap.docs.map((doc) => ({
    id: doc.id,
    text:   doc.data().text,
    type: 'blocked_phrase',
    riskLevel: 'medium',
    category: 'legacy_phrase',
    source: 'parent',
  }));

  const globalPhrases = globalSnap.docs.map((doc) => ({
    id: doc.id,
    text:   doc.data().text,
    type: 'blocked_phrase',
    riskLevel: doc.data().riskLevel ?? 'high',
    category: doc.data().category ?? 'system',
    source: 'global',
  }));

  const allowedRules = safetyRules.filter((rule) => rule.type === 'allowed_phrase');
  const blockedRules = [
    ...safetyRules.filter((rule) => rule.type === 'blocked_phrase' || rule.type === 'risk_category'),
    ...parentPhrases,
    ...globalPhrases,
  ];

  // 2. Normalize the incoming message
  const normalizedInput = normalize(text);

  const matchedAllowedRule = allowedRules.find((rule) => normalizedInput.includes(normalize(rule.text)));
  if (matchedAllowedRule) {
    return {
      status: 'safe',
      allowedByRuleId: matchedAllowedRule.id,
      allowedPhrase: matchedAllowedRule.text,
    };
  }

  const matchedRule = blockedRules.find((rule) => normalizedInput.includes(normalize(rule.text)));

  // 4a. SAFE
  if (!matchedRule) {
    return { status: 'safe' };
  }

  // 4b. FLAGGED
  console.log(`[ScanEngine] FLAGGED — source: "${matchedRule.source}" | phrase: "${matchedRule.text}" | child: ${childUid}`);

  const incidentData = {
    childUid,
    parentUid,
    childName,
    messageText:   text,
    matchedPhrase: matchedRule.text,
    matchedRuleId: matchedRule.id,
    matchSource: matchedRule.source,
    riskLevel: matchedRule.riskLevel,
    category: matchedRule.category,
    reviewStatus: 'new',
    timestamp:     new Date().toISOString(),
    notified:      false,
  };

  const incidentRef = await db.collection(COLLECTIONS.INCIDENTS).add(incidentData);
  const logRef = await db.collection(COLLECTIONS.FLAGGED_LOGS).add({
    ...incidentData,
    incidentId: incidentRef.id,
  });

  const parentDoc = await db.collection(COLLECTIONS.USERS).doc(parentUid).get();
  const fcmToken  = parentDoc.exists ? parentDoc.data().fcmToken : null;

  await sendAlertToParent({
    fcmToken,
    childName,
    matchedPhrase: matchedRule.text,
    messageText: text,
    matchSource: matchedRule.source,
    riskLevel: matchedRule.riskLevel,
    incidentId: incidentRef.id,
  });

  await Promise.all([
    incidentRef.update({ notified: true, logId: logRef.id }),
    logRef.update({ notified: true }),
  ]);

  return {
    status: 'flagged',
    matchedPhrase: matchedRule.text,
    matchedRuleId: matchedRule.id,
    matchSource: matchedRule.source,
    riskLevel: matchedRule.riskLevel,
    incidentId: incidentRef.id,
    logId: logRef.id,
  };
};

module.exports = { scanMessage, normalize };
