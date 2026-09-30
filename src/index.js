require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./config/firebase');

// Initialize Firebase Admin before anything else
initFirebase();

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/health',   require('./routes/health'));
app.use('/auth',     require('./routes/auth'));
app.use('/pair',     require('./routes/pair'));
app.use('/children', require('./routes/children'));
app.use('/phrases',  require('./routes/phrases'));
app.use('/safety-rules', require('./routes/safetyRules'));
app.use('/messages', require('./routes/messages'));
app.use('/incidents', require('./routes/incidents'));

// Catch-all for undefined routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start (local only — Vercel uses the exported app) ────────────────────────
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Parent Patrol backend running on port ${PORT}`);
  });
}

module.exports = app;
