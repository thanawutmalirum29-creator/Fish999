// ============================================================
// payment-tracker-server
// Express backend for the ม.6/3 payment tracker.
//
// - Anyone can VIEW the table (GET /api/state) without a password.
// - Any change (tick a payment, add a date, add/remove income or
//   expense, change QR settings, reset everything) requires the
//   edit password and is validated HERE on the server — never
//   trust the browser alone for this kind of check.
// ============================================================

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------
// Change the password by setting an EDIT_PASSWORD environment
// variable in Railway → Variables. If not set, this default is used.
const EDIT_PASSWORD = process.env.EDIT_PASSWORD || '251029';

// Where the live data is stored. Point DATA_DIR at a Railway
// Volume mount (e.g. /data) so payment records survive redeploys.
// Without a volume, Railway's filesystem resets on every deploy —
// fine for trying things out, NOT fine for real money tracking.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'state.json');

const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// STATIC CLASS DATA (rarely changes — kept in code, not the DB)
// ------------------------------------------------------------
const STUDENTS = require('./students.json');
const QR_AMOUNTS = [10, 20, 30];
const DEFAULT_AMOUNT = 10;
const DEFAULT_DATES = ["21/5", "28/5", "4/6", "11/6", "18/6", "25/6"];

// ------------------------------------------------------------
// PERSISTENCE
// ------------------------------------------------------------
function defaultState() {
  return {
    DATES: [...DEFAULT_DATES],
    payments: {},      // payments[sid][di] = {method, amount}
    extraItems: [],     // [{label, amount}]
    expenseItems: [],   // [{label, amount}]
    qrValue: '',
  };
}

function loadState() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(raw);
    return { ...defaultState(), ...data };
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
}

let state = loadState();
if (!fs.existsSync(DATA_PATH)) {
  saveState();
}

// ------------------------------------------------------------
// AUTH HELPER — every mutating route calls this first.
// ------------------------------------------------------------
function requirePassword(req, res) {
  const pw = req.body && req.body.password;
  if (pw !== EDIT_PASSWORD) {
    res.status(401).json({ error: 'รหัสไม่ถูกต้อง' });
    return false;
  }
  return true;
}

function publicState() {
  return {
    students: STUDENTS,
    qrAmounts: QR_AMOUNTS,
    defaultAmount: DEFAULT_AMOUNT,
    DATES: state.DATES,
    payments: state.payments,
    extraItems: state.extraItems,
    expenseItems: state.expenseItems,
    qrValue: state.qrValue,
  };
}

// ------------------------------------------------------------
// ROUTES
// ------------------------------------------------------------

// Anyone can read the current state — no password needed to view.
app.get('/api/state', (req, res) => {
  res.json(publicState());
});

// Check a password without making any change (used by the
// "แก้ไข" button to unlock edit mode in the browser).
app.post('/api/auth/check', (req, res) => {
  if (!requirePassword(req, res)) return;
  res.json({ ok: true });
});

// Set or update a single payment cell.
app.post('/api/payment', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { sid, di, method, amount } = req.body;
  if (sid == null || di == null || !method || !amount) {
    return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  }
  if (!state.payments[sid]) state.payments[sid] = {};
  state.payments[sid][di] = { method, amount };
  saveState();
  res.json(publicState());
});

// Remove a single payment cell (un-tick).
app.post('/api/payment/delete', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { sid, di } = req.body;
  if (state.payments[sid]) delete state.payments[sid][di];
  saveState();
  res.json(publicState());
});

// Add a new date column.
app.post('/api/dates', (req, res) => {
  if (!requirePassword(req, res)) return;
  const date = (req.body.date || '').trim();
  if (!date) return res.status(400).json({ error: 'กรุณาระบุวันที่' });
  if (state.DATES.includes(date)) {
    return res.status(400).json({ error: 'วันที่นี้มีอยู่แล้ว' });
  }
  state.DATES.push(date);
  saveState();
  res.json(publicState());
});

// Delete a date column (and shift every payment after it, same as before).
app.post('/api/dates/delete', (req, res) => {
  if (!requirePassword(req, res)) return;
  const di = req.body.di;
  if (di == null || di < 0 || di >= state.DATES.length) {
    return res.status(400).json({ error: 'ไม่พบวันที่นี้' });
  }
  state.DATES.splice(di, 1);
  Object.keys(state.payments).forEach(sid => {
    const row = state.payments[sid];
    const newRow = {};
    Object.entries(row).forEach(([k, v]) => {
      const idx = parseInt(k, 10);
      if (idx < di) newRow[idx] = v;
      else if (idx > di) newRow[idx - 1] = v;
    });
    state.payments[sid] = newRow;
  });
  saveState();
  res.json(publicState());
});

// Add an income or expense line item.
app.post('/api/extra', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { kind, label, amount } = req.body;
  const amt = parseFloat(amount);
  if (!['income', 'expense'].includes(kind) || !amt || amt <= 0) {
    return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
  }
  const item = { label: (label || 'ไม่ระบุ').trim() || 'ไม่ระบุ', amount: amt };
  if (kind === 'income') state.extraItems.push(item);
  else state.expenseItems.push(item);
  saveState();
  res.json(publicState());
});

// Remove an income or expense line item by index.
app.post('/api/extra/delete', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { kind, index } = req.body;
  const list = kind === 'income' ? state.extraItems : state.expenseItems;
  if (!list || index < 0 || index >= list.length) {
    return res.status(400).json({ error: 'ไม่พบรายการนี้' });
  }
  list.splice(index, 1);
  saveState();
  res.json(publicState());
});

// Save QR / PromptPay settings.
app.post('/api/qr', (req, res) => {
  if (!requirePassword(req, res)) return;
  state.qrValue = (req.body.qrValue || '').trim();
  saveState();
  res.json(publicState());
});

// Wipe everything back to defaults.
app.post('/api/reset', (req, res) => {
  if (!requirePassword(req, res)) return;
  state = defaultState();
  saveState();
  res.json(publicState());
});

// Static frontend (must come after API routes).
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Payment tracker server running on port ${PORT}`);
  console.log(`Data file: ${DATA_PATH}`);
});
