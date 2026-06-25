const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------
const EDIT_PASSWORD = process.env.EDIT_PASSWORD || '251029';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'state.json');
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// STUDENTS (ฝังไว้ใน server เลย ไม่ต้องมีไฟล์แยก)
// ------------------------------------------------------------
const STUDENTS = [
  { id: 1,  prefix: 'น.ส.', fname: 'สุภาวดี',     lname: 'สุขหนองบึง' },
  { id: 2,  prefix: 'นาย',  fname: 'กันตพัฒน์',   lname: 'พิเชียรโสภณ' },
  { id: 3,  prefix: 'นาย',  fname: 'ธันวา',        lname: 'จีนไทย' },
  { id: 4,  prefix: 'นาย',  fname: 'รัตนชัย',      lname: 'หมายต่อกลาง' },
  { id: 5,  prefix: 'น.ส.', fname: 'กัญญาภัค',    lname: 'สุวรรณมล' },
  { id: 6,  prefix: 'น.ส.', fname: 'พัชราภรณ์',   lname: 'ก้งเหม็ง' },
  { id: 7,  prefix: 'นาย',  fname: 'วรโชติ',       lname: 'ลาพรมมา' },
  { id: 8,  prefix: 'น.ส.', fname: 'ชลากร',        lname: 'สีสลับ' },
  { id: 9,  prefix: 'น.ส.', fname: 'กนกวรรณ',     lname: 'จำนงค์' },
  { id: 10, prefix: 'น.ส.', fname: 'กมลวรรณ',     lname: 'แสงโพธิ์แก้ว' },
  { id: 11, prefix: 'น.ส.', fname: 'ชภาพร',        lname: 'มณีวงศ์' },
  { id: 12, prefix: 'น.ส.', fname: 'ชอิสรา',       lname: 'ปายแสง' },
  { id: 13, prefix: 'น.ส.', fname: 'ณัฐกฤตา',     lname: 'เลาแก้วหนู' },
  { id: 14, prefix: 'น.ส.', fname: 'ตรีรัตน์',     lname: 'ทรงศรีสวัสดิ์' },
  { id: 15, prefix: 'น.ส.', fname: 'ปภัสสร',       lname: 'อ่อนสด' },
  { id: 16, prefix: 'น.ส.', fname: 'พิมพ์ประภา',  lname: 'ตั้งพรไพศาล' },
  { id: 17, prefix: 'น.ส.', fname: 'แพรวา',        lname: 'มงคลทิพย์' },
  { id: 18, prefix: 'น.ส.', fname: 'รัชดาพร',      lname: 'คำมั่ง' },
  { id: 19, prefix: 'น.ส.', fname: 'สุพิชชา',      lname: 'แก้วมโหสด' },
  { id: 20, prefix: 'น.ส.', fname: 'อุชุกร',        lname: 'เลื่องภิราภา' },
  { id: 21, prefix: 'นาย',  fname: 'กษิดิศ',       lname: 'ลครทิพย์' },
  { id: 22, prefix: 'นาย',  fname: 'เฉลิมเกียรติ', lname: 'ขันธรักษ์' },
  { id: 23, prefix: 'นาย',  fname: 'ชลภัทร',       lname: 'โกคกนกอำรง' },
  { id: 24, prefix: 'นาย',  fname: 'ณัฐนันท์',     lname: 'เมืองสุวรรณ' },
  { id: 25, prefix: 'นาย',  fname: 'ตุลา',          lname: 'นาครักสุทธิ์' },
  { id: 26, prefix: 'นาย',  fname: 'ทนงชัย',       lname: 'สมุทรเขตร์' },
  { id: 27, prefix: 'นาย',  fname: 'ธนพล',         lname: 'คุปตะธรรม' },
  { id: 28, prefix: 'นาย',  fname: 'ธนาวุฒิ',      lname: 'มะลิริมย์' },
  { id: 29, prefix: 'นาย',  fname: 'ปริเยศ',        lname: 'พุทธงชัย' },
  { id: 30, prefix: 'นาย',  fname: 'พัชรพล',       lname: 'เพิ่งพู' },
  { id: 31, prefix: 'นาย',  fname: 'ภานุพงศ์',     lname: 'จำปาเรือง' },
  { id: 32, prefix: 'นาย',  fname: 'วันพรรธน์',    lname: 'จันทร์เต็มดวง' },
  { id: 33, prefix: 'นาย',  fname: 'วิรุห',         lname: 'ชูก้าน' },
  { id: 34, prefix: 'นาย',  fname: 'สุทธิชัย',     lname: 'สุริยะโรภาส' },
  { id: 35, prefix: 'นาย',  fname: 'องอาจ',        lname: 'เก้าสกุล' },
  { id: 36, prefix: 'นาย',  fname: 'อนุวัฒน์',     lname: 'คำยศ' },
];

const QR_AMOUNTS = [10, 20, 30];
const DEFAULT_AMOUNT = 10;
const DEFAULT_DATES = ['21/5', '28/5', '4/6', '11/6', '18/6', '25/6'];

// ------------------------------------------------------------
// PERSISTENCE
// ------------------------------------------------------------
function defaultState() {
  return { DATES: [...DEFAULT_DATES], payments: {}, extraItems: [], expenseItems: [], qrValue: '' };
}
function loadState() {
  try { return { ...defaultState(), ...JSON.parse(fs.readFileSync(DATA_PATH, 'utf8')) }; }
  catch (e) { return defaultState(); }
}
function saveState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(state, null, 2));
}
let state = loadState();
if (!fs.existsSync(DATA_PATH)) saveState();

function requirePassword(req, res) {
  if ((req.body && req.body.password) !== EDIT_PASSWORD) {
    res.status(401).json({ error: 'รหัสไม่ถูกต้อง' });
    return false;
  }
  return true;
}
function publicState() {
  return { students: STUDENTS, qrAmounts: QR_AMOUNTS, defaultAmount: DEFAULT_AMOUNT,
    DATES: state.DATES, payments: state.payments, extraItems: state.extraItems,
    expenseItems: state.expenseItems, qrValue: state.qrValue };
}

// ------------------------------------------------------------
// API ROUTES
// ------------------------------------------------------------
app.get('/api/state', (req, res) => res.json(publicState()));

app.post('/api/auth/check', (req, res) => {
  if (!requirePassword(req, res)) return;
  res.json({ ok: true });
});

app.post('/api/payment', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { sid, di, method, amount } = req.body;
  if (sid == null || di == null || !method || !amount) return res.status(400).json({ error: 'ข้อมูลไม่ครบ' });
  if (!state.payments[sid]) state.payments[sid] = {};
  state.payments[sid][di] = { method, amount };
  saveState(); res.json(publicState());
});

app.post('/api/payment/delete', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { sid, di } = req.body;
  if (state.payments[sid]) delete state.payments[sid][di];
  saveState(); res.json(publicState());
});

app.post('/api/dates', (req, res) => {
  if (!requirePassword(req, res)) return;
  const date = (req.body.date || '').trim();
  if (!date) return res.status(400).json({ error: 'กรุณาระบุวันที่' });
  if (state.DATES.includes(date)) return res.status(400).json({ error: 'วันที่นี้มีอยู่แล้ว' });
  state.DATES.push(date); saveState(); res.json(publicState());
});

app.post('/api/dates/delete', (req, res) => {
  if (!requirePassword(req, res)) return;
  const di = req.body.di;
  if (di == null || di < 0 || di >= state.DATES.length) return res.status(400).json({ error: 'ไม่พบวันที่นี้' });
  state.DATES.splice(di, 1);
  Object.keys(state.payments).forEach(sid => {
    const row = state.payments[sid], newRow = {};
    Object.entries(row).forEach(([k, v]) => {
      const idx = parseInt(k, 10);
      if (idx < di) newRow[idx] = v;
      else if (idx > di) newRow[idx - 1] = v;
    });
    state.payments[sid] = newRow;
  });
  saveState(); res.json(publicState());
});

app.post('/api/extra', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { kind, label, amount } = req.body;
  const amt = parseFloat(amount);
  if (!['income', 'expense'].includes(kind) || !amt || amt <= 0) return res.status(400).json({ error: 'ข้อมูลไม่ถูกต้อง' });
  const item = { label: (label || 'ไม่ระบุ').trim() || 'ไม่ระบุ', amount: amt };
  if (kind === 'income') state.extraItems.push(item); else state.expenseItems.push(item);
  saveState(); res.json(publicState());
});

app.post('/api/extra/delete', (req, res) => {
  if (!requirePassword(req, res)) return;
  const { kind, index } = req.body;
  const list = kind === 'income' ? state.extraItems : state.expenseItems;
  if (!list || index < 0 || index >= list.length) return res.status(400).json({ error: 'ไม่พบรายการนี้' });
  list.splice(index, 1); saveState(); res.json(publicState());
});

app.post('/api/qr', (req, res) => {
  if (!requirePassword(req, res)) return;
  state.qrValue = (req.body.qrValue || '').trim();
  saveState(); res.json(publicState());
});

app.post('/api/reset', (req, res) => {
  if (!requirePassword(req, res)) return;
  state = defaultState(); saveState(); res.json(publicState());
});

// ------------------------------------------------------------
// SERVE HTML (ทุกอย่างรวมในไฟล์เดียว ไม่ต้องมีโฟลเดอร์ public)
// ------------------------------------------------------------
const HTML = `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>เช็คการจ่ายเงินห้อง ม.6/3</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;background:#eef2f7;min-height:100vh;padding-bottom:60px}
.header{background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;padding:16px 16px 14px;position:sticky;top:0;z-index:100;box-shadow:0 2px 12px #0004}
.header-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.header h1{font-size:17px;font-weight:700}
.header p{font-size:12px;opacity:.8;margin-top:2px}
.lock-btn{background:#ffffff22;border:1.5px solid #ffffff55;color:#fff;border-radius:8px;padding:7px 12px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap;flex:0 0 auto}
.lock-btn.unlocked{background:#22c55e;border-color:#22c55e}
.summary-bar{display:flex;gap:8px;margin-top:10px;overflow-x:auto;padding-bottom:2px}
.sum-card{background:#ffffff22;border-radius:8px;padding:5px 10px;text-align:center;flex:0 0 auto;min-width:60px}
.sum-card .date{font-size:10px;opacity:.75;white-space:nowrap}
.sum-card .amt{font-size:14px;font-weight:700}
.total-row{margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.total-badge{background:#ffffff22;border-radius:8px;padding:6px 14px;font-size:13px}
.total-badge b{font-size:15px}
.extra-badge{background:#fbbf2440;border-radius:8px;padding:6px 14px;font-size:12px;cursor:pointer;white-space:nowrap}
.extra-badge b{font-size:14px;color:#fbbf24}
.toolbar{display:flex;gap:8px;padding:10px 8px 0;flex-wrap:wrap;align-items:center}
.tool-btn{padding:7px 14px;border-radius:8px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;gap:5px;transition:.15s}
.tool-btn:active{opacity:.75}
.btn-add-date{background:#22c55e;color:#fff}
.btn-qr-settings{background:#3b82f6;color:#fff}
.btn-reset{background:#fee2e2;color:#dc2626}
.save-indicator{font-size:11px;color:#64748b;margin-left:auto}
.table-wrap{overflow-x:auto;margin:10px 8px 0;border-radius:12px;box-shadow:0 1px 6px #0001;background:#fff}
table{border-collapse:separate;border-spacing:0;width:100%;min-width:400px}
thead tr{background:#1e3a8a;color:#fff}
th{padding:9px 5px;font-size:11px;font-weight:600;text-align:center;white-space:nowrap}
th.name-col{text-align:left;padding-left:10px}
th.date-th{position:relative;min-width:52px}
.del-date-btn{position:absolute;top:2px;right:2px;background:#ffffff30;border:none;color:#fff;border-radius:4px;font-size:9px;cursor:pointer;padding:1px 4px;line-height:1.4}
.del-date-btn:hover{background:#ef4444}
td{padding:4px 3px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:12px}
td.name-col{text-align:left;padding-left:8px;line-height:1.4}
.prefix{font-size:10px;color:#9ca3af}
.fname{font-size:13px;font-weight:500;color:#111}
.lname{font-size:11px;color:#374151}
tr:nth-child(even){background:#f8fafc}
th:first-child,td:first-child{position:sticky;left:0;z-index:5;width:26px;box-sizing:border-box}
th.name-col,td.name-col{position:sticky;left:26px;z-index:5;box-shadow:3px 0 4px -2px #0001}
th:first-child,th.name-col{background:#1e3a8a}
td:first-child,td.name-col{background:#fff}
tr:nth-child(even) td:first-child,tr:nth-child(even) td.name-col{background:#f8fafc}
.cell-btn{width:36px;height:36px;border-radius:8px;border:1.5px solid #e5e7eb;background:#f9fafb;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;transition:all .1s;margin:0 auto;user-select:none;-webkit-user-select:none;position:relative;touch-action:pan-y}
.cell-btn.locked{cursor:not-allowed;opacity:.85}
.cell-btn.cash{background:#dcfce7;border-color:#22c55e}
.cell-btn.transfer{background:#dbeafe;border-color:#3b82f6}
.cell-btn.custom-amt{background:#fef9c3;border-color:#eab308}
.cell-btn .icon{font-size:12px;line-height:1}
.cell-btn .amt-lbl{font-size:8px;font-weight:700}
.cell-btn.cash .amt-lbl{color:#15803d}
.cell-btn.transfer .amt-lbl{color:#1d4ed8}
.cell-btn.custom-amt .amt-lbl{color:#92400e}
.cell-btn .empty{font-size:14px;color:#d1d5db}
.total-col{font-weight:700;font-size:13px;color:#2563eb}
.total-col.zero{color:#9ca3af;font-weight:400}
.hint{text-align:center;margin-top:10px;font-size:11px;color:#9ca3af;padding:0 8px}
.edit-only{display:none}
body.edit-mode .edit-only{display:flex}
body.edit-mode .extra-input-row.edit-only{display:grid}
body.edit-mode p.sub.edit-only{display:block}
body.edit-mode button.edit-only{display:inline-flex}
.overlay{display:none;position:fixed;inset:0;background:#0006;z-index:200;align-items:center;justify-content:center;backdrop-filter:blur(2px)}
.overlay.show{display:flex}
.modal{background:#fff;border-radius:18px;padding:24px 20px 18px;width:320px;text-align:center;box-shadow:0 8px 40px #0003;animation:pop .18s ease;max-height:90vh;overflow-y:auto}
@keyframes pop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
.modal h2{font-size:16px;font-weight:700;margin-bottom:4px}
.modal p.sub{font-size:13px;color:#6b7280;margin-bottom:14px}
.modal input[type=number],.modal input[type=text],.modal input[type=password]{width:100%;padding:10px 12px;font-size:18px;font-weight:700;border:2px solid #3b82f6;border-radius:10px;text-align:center;outline:none;font-family:inherit;margin-bottom:14px}
.btn{width:100%;padding:11px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:8px;font-family:inherit;transition:opacity .15s}
.btn:active{opacity:.8}
.btn-green{background:#22c55e;color:#fff}
.btn-blue{background:#3b82f6;color:#fff}
.btn-gray{background:#f3f4f6;color:#374151}
.btn-red{background:#fee2e2;color:#dc2626}
.qr-preview-box{background:#f0f9ff;border-radius:12px;padding:12px;margin-bottom:14px;text-align:center}
.qr-preview-box img{width:180px;height:180px;display:block;border-radius:8px;margin:0 auto}
.qr-none-hint{font-size:12px;color:#94a3b8;padding:16px 0}
.qr-settings-section{text-align:left;margin-bottom:14px}
.qr-settings-section label{font-size:12px;color:#374151;font-weight:600;display:block;margin-bottom:4px}
.qr-settings-section input{width:100%;padding:9px 12px;font-size:14px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:inherit;outline:none;margin-bottom:10px}
.qr-settings-section input:focus{border-color:#3b82f6}
.qr-hint-box{background:#f0f9ff;border-radius:10px;padding:12px;margin-bottom:14px;text-align:left}
.qr-hint-box p{font-size:12px;color:#1d4ed8;line-height:1.7;margin-bottom:4px}
.qr-hint-box code{background:#dbeafe;padding:2px 6px;border-radius:4px;font-size:11px}
.method-row{display:flex;gap:8px;margin-bottom:8px}
.method-row .btn{margin-bottom:0;flex:1}
.expense-item,.extra-item{display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9;gap:8px}
.expense-item .e-label,.extra-item .e-label{flex:1;font-size:13px;color:#374151}
.expense-item .e-amt{font-size:13px;font-weight:700;color:#ef4444;white-space:nowrap}
.extra-item .e-amt{font-size:13px;font-weight:700;color:#22c55e;white-space:nowrap}
.expense-item .e-del,.extra-item .e-del{border:none;background:none;color:#f87171;font-size:16px;cursor:pointer;padding:0 4px}
.tab-row{display:flex;gap:0;margin-bottom:12px;border-radius:8px;overflow:hidden;border:1.5px solid #e5e7eb}
.tab-btn{flex:1;padding:8px;font-size:13px;font-weight:600;border:none;cursor:pointer;font-family:inherit;background:#f3f4f6;color:#6b7280;transition:.15s}
.tab-btn.active{background:#fff;color:#111}
.net-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0 4px;border-top:1px solid #f1f5f9;font-size:13px;font-weight:700}
.extra-list{text-align:left;max-height:220px;overflow-y:auto;margin-bottom:10px}
.extra-empty{text-align:center;font-size:12px;color:#9ca3af;padding:16px 0}
.extra-input-row{display:none;grid-template-columns:1fr 100px;gap:8px;margin-bottom:10px}
.extra-input-row input{padding:9px 10px;font-size:13px;border:1.5px solid #e5e7eb;border-radius:8px;font-family:inherit;outline:none}
.extra-input-row input:focus{border-color:#22c55e}
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div>
      <h1>💰 เช็คการจ่ายเงินห้อง</h1>
      <p>ม.6/3 ภาคเรียนที่ 1 ปีการศึกษา 2569</p>
    </div>
    <button class="lock-btn" id="lockBtn" onclick="onLockBtnClick()">🔒 แก้ไข</button>
  </div>
  <div class="summary-bar" id="summaryBar"></div>
  <div class="total-row">
    <div class="total-badge">รวมจากนักเรียน: <b id="grandTotal">฿0</b></div>
    <div class="extra-badge" onclick="openExtra()" title="คลิกเพื่อดู/จัดการเงินอื่นๆ">➕ เงินอื่นๆ: <b id="extraTotal">฿0</b></div>
    <div class="extra-badge" onclick="openExtra()" style="background:#ef444440"><b style="color:#f87171">💸 รายจ่าย: <span id="expenseTotal">฿0</span></b></div>
    <div class="total-badge" style="background:#fbbf2430">ยอดรวมทั้งหมด: <b id="allTotal" style="color:#fbbf24">฿0</b></div>
  </div>
</div>

<div class="toolbar">
  <button class="tool-btn btn-add-date edit-only" onclick="openAddDate()">➕ เพิ่มวันที่</button>
  <button class="tool-btn btn-qr-settings edit-only" onclick="openQRSettings()">📱 ตั้งค่า QR</button>
  <button class="tool-btn btn-reset edit-only" onclick="confirmReset()">🗑 ล้างข้อมูล</button>
  <span class="save-indicator" id="saveIndicator">🌐 เชื่อมต่อเซิร์ฟเวอร์</span>
</div>

<div class="table-wrap">
  <table id="mainTable">
    <thead><tr id="theadRow"><th>#</th><th class="name-col">ชื่อ-สกุล</th><th>รวม</th></tr></thead>
    <tbody id="tbody"></tbody>
  </table>
</div>
<p class="hint" id="modeHint">🔒 อยู่ในโหมดดูอย่างเดียว — กดปุ่ม "แก้ไข" มุมขวาบนแล้วใส่รหัสเพื่อติ๊ก/เพิ่มข้อมูล</p>

<!-- Modal: ใส่รหัส -->
<div class="overlay" id="loginOverlay">
  <div class="modal">
    <h2>🔑 ใส่รหัสแก้ไข</h2>
    <p class="sub">ต้องใส่รหัสก่อนจึงจะติ๊ก/เพิ่ม/ลบข้อมูลได้</p>
    <input type="password" id="loginPwInput" placeholder="รหัสผ่าน" inputmode="numeric">
    <p class="sub" id="loginError" style="color:#dc2626;display:none">รหัสไม่ถูกต้อง</p>
    <button class="btn btn-blue" onclick="submitLogin()">เข้าสู่โหมดแก้ไข</button>
    <button class="btn btn-gray" onclick="closeLogin()">ยกเลิก</button>
  </div>
</div>

<!-- Modal: เลือกราคา -->
<div class="overlay" id="customOverlay">
  <div class="modal">
    <h2>💰 เลือกยอดชำระ</h2>
    <p class="sub" id="customInfo"></p>
    <div style="display:flex;gap:8px;margin-bottom:14px;justify-content:center">
      <button class="btn btn-gray amt-pick" onclick="pickAmt(10)" id="amtBtn10" style="flex:1;font-size:18px;font-weight:700">10฿</button>
      <button class="btn btn-gray amt-pick" onclick="pickAmt(20)" id="amtBtn20" style="flex:1;font-size:18px;font-weight:700">20฿</button>
      <button class="btn btn-gray amt-pick" onclick="pickAmt(30)" id="amtBtn30" style="flex:1;font-size:18px;font-weight:700">30฿</button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:12px;color:#6b7280;white-space:nowrap">จำนวนอื่น:</span>
      <input type="number" id="customAmt" min="1" placeholder="ระบุ" style="flex:1;padding:8px;font-size:16px;font-weight:700;border:2px solid #e5e7eb;border-radius:8px;text-align:center;font-family:inherit;outline:none">
    </div>
    <div class="method-row">
      <button class="btn btn-green" onclick="confirmCustom('cash')">💵 สด</button>
      <button class="btn btn-blue" onclick="confirmCustom('transfer')">📱 โอน</button>
    </div>
    <button class="btn btn-gray" onclick="closeCustom()">ยกเลิก</button>
  </div>
</div>

<!-- Modal: QR Code -->
<div class="overlay" id="qrOverlay">
  <div class="modal">
    <h2>สแกน QR โอนเงิน</h2>
    <p class="sub" id="qrInfo"></p>
    <div class="qr-preview-box">
      <img id="qrImg" src="" alt="QR Code" style="display:none">
      <p class="qr-none-hint" id="qrNoneHint">ไม่พบ QR สำหรับจำนวนนี้</p>
    </div>
    <p style="font-size:12px;color:#6b7280;margin-bottom:14px">รอให้โอนเงินเสร็จแล้วกดตกลง</p>
    <button class="btn btn-blue" onclick="confirmQR()">✅ ตกลง (โอนแล้ว)</button>
    <button class="btn btn-gray" onclick="cancelQR()">❌ ยกเลิก</button>
  </div>
</div>

<!-- Modal: ตั้งค่า QR -->
<div class="overlay" id="qrSettingsOverlay">
  <div class="modal">
    <h2>📱 ตั้งค่า QR Code</h2>
    <div class="qr-hint-box">
      <p><b>วิธีที่ 1 – PromptPay</b>: ใส่เบอร์โทร เช่น <code>0812345678</code></p>
      <p style="margin-top:6px"><b>วิธีที่ 2 – URL รูป QR ของตัวเอง</b><br>เช่น <code>https://i.imgur.com/xxxxx.png</code></p>
    </div>
    <div class="qr-settings-section">
      <label>เบอร์ PromptPay หรือ URL รูป QR</label>
      <input type="text" id="qrInput" placeholder="เช่น 0812345678">
    </div>
    <div class="qr-preview-box">
      <img id="settingsQRImg" src="" alt="" style="display:none;margin:0 auto">
      <p class="qr-none-hint" id="settingsQRNone">ตัวอย่าง QR จะแสดงที่นี่</p>
    </div>
    <button class="btn btn-blue" onclick="previewQR()">👁 ดูตัวอย่าง</button>
    <button class="btn btn-green" onclick="saveQRSettings()">💾 บันทึก</button>
    <button class="btn btn-gray" onclick="closeQRSettings()">ยกเลิก</button>
  </div>
</div>

<!-- Modal: เพิ่มวันที่ -->
<div class="overlay" id="addDateOverlay">
  <div class="modal">
    <h2>➕ เพิ่มวันที่</h2>
    <p class="sub">ใส่วันที่ที่ต้องการเพิ่ม เช่น 2/7</p>
    <input type="text" id="newDateInput" placeholder="เช่น 2/7" maxlength="10">
    <button class="btn btn-green" onclick="confirmAddDate()">เพิ่มวันที่</button>
    <button class="btn btn-gray" onclick="closeAddDate()">ยกเลิก</button>
  </div>
</div>

<!-- Modal: เงินเข้า/ออก -->
<div class="overlay" id="extraOverlay">
  <div class="modal">
    <h2>💰 เงินเข้า / เงินออก</h2>
    <div class="tab-row">
      <button class="tab-btn active" id="tabIncome" onclick="switchTab('income')">➕ เงินเข้า</button>
      <button class="tab-btn" id="tabExpense" onclick="switchTab('expense')">💸 เงินออก</button>
    </div>
    <div id="panelIncome">
      <p class="sub edit-only" style="margin-bottom:10px">รายรับอื่นๆ นอกจากนักเรียน</p>
      <div class="extra-input-row edit-only">
        <input type="text" id="extraLabel" placeholder="รายละเอียด">
        <input type="number" id="extraAmt" placeholder="฿" min="1">
      </div>
      <button class="btn btn-green edit-only" onclick="addExtraItem()" style="margin-bottom:12px">เพิ่มรายการ</button>
      <div class="extra-list" id="extraList"></div>
    </div>
    <div id="panelExpense" style="display:none">
      <p class="sub edit-only" style="margin-bottom:10px">รายจ่ายที่ต้องการหักออก</p>
      <div class="extra-input-row edit-only">
        <input type="text" id="expenseLabel" placeholder="รายละเอียด">
        <input type="number" id="expenseAmt" placeholder="฿" min="1">
      </div>
      <button class="btn btn-red edit-only" onclick="addExpenseItem()" style="margin-bottom:12px">เพิ่มรายจ่าย</button>
      <div class="extra-list" id="expenseList"></div>
    </div>
    <div class="net-row">
      <span>คงเหลือสุทธิ:</span>
      <span id="netDisplay" style="color:#2563eb">฿0</span>
    </div>
    <button class="btn btn-gray" onclick="closeExtra()" style="margin-top:8px">ปิด</button>
  </div>
</div>

<!-- Modal: ยืนยันลบ -->
<div class="overlay" id="confirmDelOverlay">
  <div class="modal">
    <h2>🗑 ลบการชำระ?</h2>
    <p class="sub" id="confirmDelName" style="font-weight:700;color:#111;font-size:15px"></p>
    <p class="sub" id="confirmDelDetail" style="margin-bottom:16px"></p>
    <button class="btn btn-red" onclick="doConfirmDelete()">ยืนยัน ลบออก</button>
    <button class="btn btn-gray" onclick="cancelConfirmDelete()">ยกเลิก</button>
  </div>
</div>

<!-- Modal: ล้างข้อมูล -->
<div class="overlay" id="resetOverlay">
  <div class="modal">
    <h2>⚠️ ล้างข้อมูลทั้งหมด?</h2>
    <p class="sub">การกระทำนี้ไม่สามารถยกเลิกได้</p>
    <button class="btn btn-red" onclick="doReset()">ล้างข้อมูลทั้งหมด</button>
    <button class="btn btn-gray" onclick="closeReset()">ยกเลิก</button>
  </div>
</div>

<script>
// ============================================================
// STATE
// ============================================================
let STUDENTS=[],QR_AMOUNTS=[10,20,30],DEFAULT_AMOUNT=10,DATES=[],payments={},extraItems=[],expenseItems=[],qrValue='';
let pendingCell=null,pendingDelete=null,activeTab='income',editMode=false;

// ============================================================
// API
// ============================================================
async function apiGet(url){const r=await fetch(url);if(!r.ok)throw new Error('โหลดข้อมูลไม่สำเร็จ');return r.json();}
async function apiPost(url,body={}){
  const pw=sessionStorage.getItem('editPassword')||'';
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,password:pw})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){if(r.status===401){lockEditMode();alert('รหัสไม่ถูกต้อง กรุณาใส่รหัสใหม่');}else alert(d.error||'เกิดข้อผิดพลาด');throw new Error(d.error||'failed');}
  return d;
}
function applyState(d){
  if(d.students)STUDENTS=d.students;if(d.qrAmounts)QR_AMOUNTS=d.qrAmounts;if(d.defaultAmount)DEFAULT_AMOUNT=d.defaultAmount;
  DATES=d.DATES||[];payments=d.payments||{};extraItems=d.extraItems||[];expenseItems=d.expenseItems||[];qrValue=d.qrValue||'';
}
async function loadInitialState(){try{applyState(await apiGet('/api/state'));render();}catch(e){document.getElementById('saveIndicator').textContent='⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';}}
async function backgroundRefresh(){if(document.querySelector('.overlay.show'))return;try{applyState(await apiGet('/api/state'));render();}catch(e){}}
setInterval(backgroundRefresh,6000);

// ============================================================
// EDIT MODE
// ============================================================
function updateEditModeUI(){
  document.body.classList.toggle('edit-mode',editMode);
  const btn=document.getElementById('lockBtn');
  btn.textContent=editMode?'🔓 ออกจากโหมดแก้ไข':'🔒 แก้ไข';
  btn.classList.toggle('unlocked',editMode);
  document.getElementById('modeHint').textContent=editMode
    ?'✅ อยู่ในโหมดแก้ไข — กดเลือกราคา → เลือกสด/โอน → ยืนยัน  |  กดซ้ำ = ยกเลิก'
    :'🔒 อยู่ในโหมดดูอย่างเดียว — กดปุ่ม "แก้ไข" มุมขวาบนแล้วใส่รหัสเพื่อติ๊ก/เพิ่มข้อมูล';
  renderTable();renderExtraList();renderExpenseList();
}
function lockEditMode(){editMode=false;sessionStorage.removeItem('editPassword');updateEditModeUI();}
function onLockBtnClick(){editMode?lockEditMode():openLogin();}
function openLogin(){document.getElementById('loginPwInput').value='';document.getElementById('loginError').style.display='none';document.getElementById('loginOverlay').classList.add('show');setTimeout(()=>document.getElementById('loginPwInput').focus(),100);}
function closeLogin(){document.getElementById('loginOverlay').classList.remove('show');}
async function submitLogin(){
  const pw=document.getElementById('loginPwInput').value;
  try{const r=await fetch('/api/auth/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});
    if(!r.ok){document.getElementById('loginError').style.display='block';return;}
    sessionStorage.setItem('editPassword',pw);editMode=true;updateEditModeUI();closeLogin();
  }catch(e){document.getElementById('loginError').style.display='block';}
}
document.getElementById('loginPwInput').addEventListener('keydown',e=>{if(e.key==='Enter')submitLogin();});
function requireEditOrPrompt(){if(editMode)return true;openLogin();return false;}

// SAVE INDICATOR
let saveFlashTimer=null;
function flashSave(){const el=document.getElementById('saveIndicator');el.textContent='✅ บันทึกแล้ว';clearTimeout(saveFlashTimer);saveFlashTimer=setTimeout(()=>{el.textContent='🌐 เชื่อมต่อเซิร์ฟเวอร์';},1800);}

// ============================================================
// RENDER
// ============================================================
function render(){renderHeader();renderTable();renderSummary();updateTotals();}
function renderHeader(){
  document.getElementById('theadRow').innerHTML=
    '<th>#</th><th class="name-col">ชื่อ-สกุล</th>'+
    DATES.map((d,di)=>'<th class="date-th">'+d+'<button class="del-date-btn edit-only" onclick="deleteDate('+di+')" title="ลบวันนี้">✕</button></th>').join('')+
    '<th>รวม</th>';
}
function cellInnerHTML(sid,di){
  const p=getP(sid,di),lk=editMode?'':' locked';
  if(p){let cls=p.method==='transfer'?'transfer':(p.amount!==DEFAULT_AMOUNT?'custom-amt':'cash');const ic=p.method==='transfer'?'💸':'✅';
    return '<div class="cell-btn '+cls+lk+'" data-sid="'+sid+'" data-di="'+di+'"><span class="icon">'+ic+'</span><span class="amt-lbl">฿'+p.amount+'</span></div>';}
  return '<div class="cell-btn'+lk+'" data-sid="'+sid+'" data-di="'+di+'"><span class="empty">–</span></div>';
}
function renderTable(){
  const tbody=document.getElementById('tbody');tbody.innerHTML='';
  STUDENTS.forEach((s,idx)=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td style="color:#9ca3af;font-size:11px">'+(idx+1)+'</td>'+
      '<td class="name-col"><span class="prefix">'+s.prefix+' </span><span class="fname">'+s.fname+'</span><span class="lname"> '+s.lname+'</span></td>'+
      DATES.map((_,di)=>'<td>'+cellInnerHTML(s.id,di)+'</td>').join('')+
      '<td class="total-col '+(totalByStudent(s.id)===0?'zero':'')+'">'+( totalByStudent(s.id)>0?'฿'+totalByStudent(s.id):'-')+'</td>';
    tbody.appendChild(tr);
  });
}
let cellTouchStartY=0;
document.getElementById('tbody').addEventListener('click',e=>{const btn=e.target.closest('.cell-btn');if(!btn)return;if(!requireEditOrPrompt())return;handleClick(Number(btn.dataset.sid),parseInt(btn.dataset.di,10));});
document.getElementById('tbody').addEventListener('touchstart',e=>{const btn=e.target.closest('.cell-btn');if(!btn)return;cellTouchStartY=e.touches[0].clientY;},{passive:true});
document.getElementById('tbody').addEventListener('touchend',e=>{const btn=e.target.closest('.cell-btn');if(!btn)return;if(Math.abs(e.changedTouches[0].clientY-cellTouchStartY)>8)return;if(!requireEditOrPrompt())return;e.preventDefault();handleClick(Number(btn.dataset.sid),parseInt(btn.dataset.di,10));},{passive:false});
function updateAfterPayment(sid,di){
  const btn=document.querySelector('.cell-btn[data-sid="'+sid+'"][data-di="'+di+'"]');
  if(btn){const td=btn.closest('td');td.innerHTML=cellInnerHTML(sid,di);const tr=td.closest('tr');const tot=totalByStudent(sid);const ttd=tr.querySelector('.total-col');ttd.textContent=tot>0?'฿'+tot:'-';ttd.classList.toggle('zero',tot===0);}
  renderSummary();updateTotals();flashSave();
}
function renderSummary(){document.getElementById('summaryBar').innerHTML=DATES.map((d,di)=>'<div class="sum-card"><div class="date">'+d+'</div><div class="amt">฿'+totalByDate(di)+'</div></div>').join('');}
function updateTotals(){const gt=grandTotal(),et=extraTotal(),exp=expenseTotal();document.getElementById('grandTotal').textContent='฿'+gt;document.getElementById('extraTotal').textContent='฿'+et;document.getElementById('expenseTotal').textContent='฿'+exp;document.getElementById('allTotal').textContent='฿'+(gt+et-exp);}

// DATA HELPERS
function getP(sid,di){return(payments[sid]||{})[di]||null;}
function totalByDate(di){return STUDENTS.reduce((s,st)=>{const p=getP(st.id,di);return s+(p?p.amount:0);},0);}
function totalByStudent(sid){return DATES.reduce((s,_,di)=>{const p=getP(sid,di);return s+(p?p.amount:0);},0);}
function grandTotal(){return STUDENTS.reduce((s,st)=>s+totalByStudent(st.id),0);}
function extraTotal(){return extraItems.reduce((s,e)=>s+(e.amount||0),0);}
function expenseTotal(){return expenseItems.reduce((s,e)=>s+(e.amount||0),0);}

// ============================================================
// INTERACTIONS
// ============================================================
function handleClick(sid,di){const p=getP(sid,di);if(p){const s=STUDENTS.find(x=>x.id===sid);openConfirmDelete(sid,di,s?s.prefix+s.fname+' '+s.lname:'',DATES[di],p);return;}openAmountPicker(sid,di);}

function openConfirmDelete(sid,di,name,date,p){pendingDelete={sid,di};const ic=p.method==='transfer'?'💸':'✅';const mt=p.method==='transfer'?'โอน':'สด';document.getElementById('confirmDelName').textContent=name;document.getElementById('confirmDelDetail').textContent=date+' — '+ic+' ฿'+p.amount+' ('+mt+')';document.getElementById('confirmDelOverlay').classList.add('show');}
async function doConfirmDelete(){if(!pendingDelete)return;const{sid,di}=pendingDelete;document.getElementById('confirmDelOverlay').classList.remove('show');pendingDelete=null;try{const d=await apiPost('/api/payment/delete',{sid,di});payments=d.payments;updateAfterPayment(sid,di);}catch(e){}}
function cancelConfirmDelete(){document.getElementById('confirmDelOverlay').classList.remove('show');pendingDelete=null;}

function openAmountPicker(sid,di){pendingCell={sid,di,amount:DEFAULT_AMOUNT};const s=STUDENTS.find(x=>x.id===sid);document.getElementById('customInfo').textContent=s.fname+' '+s.lname+' — '+DATES[di];document.getElementById('customAmt').value='';pickAmt(DEFAULT_AMOUNT);document.getElementById('customOverlay').classList.add('show');}
function pickAmt(amt){pendingCell.amount=amt;document.getElementById('customAmt').value='';document.querySelectorAll('.amt-pick').forEach(b=>{b.style.background='#f3f4f6';b.style.color='#374151';b.style.border='2px solid #e5e7eb';});const btn=document.getElementById('amtBtn'+amt);if(btn){btn.style.background='#2563eb';btn.style.color='#fff';btn.style.border='2px solid #1d4ed8';}}
async function confirmCustom(method){const cv=parseFloat(document.getElementById('customAmt').value);if(cv&&cv>0)pendingCell.amount=cv;const amt=pendingCell.amount||DEFAULT_AMOUNT;closeCustom();if(method==='transfer'){openQR();}else{const{sid,di}=pendingCell;try{const d=await apiPost('/api/payment',{sid,di,method:'cash',amount:amt});payments=d.payments;updateAfterPayment(sid,di);}catch(e){}}}
function closeCustom(){document.getElementById('customOverlay').classList.remove('show');}

function openQR(){const s=STUDENTS.find(x=>x.id===pendingCell.sid);const amt=pendingCell.amount;document.getElementById('qrInfo').textContent=s.fname+' '+s.lname+' — ฿'+amt;const img=document.getElementById('qrImg');const hint=document.getElementById('qrNoneHint');if(qrValue){const url=qrValue.startsWith('http')?qrValue:'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PromptPay-'+encodeURIComponent(qrValue);img.src=url;img.style.display='block';hint.style.display='none';}else{img.style.display='none';hint.style.display='block';}document.getElementById('qrOverlay').classList.add('show');}
async function confirmQR(){document.getElementById('qrOverlay').classList.remove('show');const{sid,di,amount}=pendingCell;try{const d=await apiPost('/api/payment',{sid,di,method:'transfer',amount});payments=d.payments;updateAfterPayment(sid,di);}catch(e){}}
function cancelQR(){document.getElementById('qrOverlay').classList.remove('show');}

function openQRSettings(){if(!requireEditOrPrompt())return;document.getElementById('qrInput').value=qrValue;document.getElementById('settingsQRImg').style.display='none';document.getElementById('settingsQRNone').style.display='block';document.getElementById('qrSettingsOverlay').classList.add('show');}
function previewQR(){const v=document.getElementById('qrInput').value.trim();if(!v)return;const url=v.startsWith('http')?v:'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PromptPay-'+encodeURIComponent(v);const img=document.getElementById('settingsQRImg');img.src=url;img.style.display='block';document.getElementById('settingsQRNone').style.display='none';}
async function saveQRSettings(){const v=document.getElementById('qrInput').value.trim();try{const d=await apiPost('/api/qr',{qrValue:v});qrValue=d.qrValue;flashSave();document.getElementById('qrSettingsOverlay').classList.remove('show');}catch(e){}}
function closeQRSettings(){document.getElementById('qrSettingsOverlay').classList.remove('show');}

function openAddDate(){if(!requireEditOrPrompt())return;document.getElementById('newDateInput').value='';document.getElementById('addDateOverlay').classList.add('show');setTimeout(()=>document.getElementById('newDateInput').focus(),100);}
async function confirmAddDate(){const v=document.getElementById('newDateInput').value.trim();if(!v)return;try{const d=await apiPost('/api/dates',{date:v});DATES=d.DATES;flashSave();render();document.getElementById('addDateOverlay').classList.remove('show');}catch(e){}}
function closeAddDate(){document.getElementById('addDateOverlay').classList.remove('show');}
document.getElementById('newDateInput').addEventListener('keydown',e=>{if(e.key==='Enter')confirmAddDate();});
async function deleteDate(di){if(!requireEditOrPrompt())return;if(!confirm('ลบวันที่ "'+DATES[di]+'" และข้อมูลการชำระทั้งหมดในวันนั้น?'))return;try{const d=await apiPost('/api/dates/delete',{di});DATES=d.DATES;payments=d.payments;flashSave();render();}catch(e){}}

function openExtra(){renderExtraList();renderExpenseList();updateNetDisplay();document.getElementById('extraLabel').value='';document.getElementById('extraAmt').value='';document.getElementById('expenseLabel').value='';document.getElementById('expenseAmt').value='';switchTab(activeTab);document.getElementById('extraOverlay').classList.add('show');}
function closeExtra(){document.getElementById('extraOverlay').classList.remove('show');}
function switchTab(tab){activeTab=tab;document.getElementById('panelIncome').style.display=tab==='income'?'':'none';document.getElementById('panelExpense').style.display=tab==='expense'?'':'none';document.getElementById('tabIncome').classList.toggle('active',tab==='income');document.getElementById('tabExpense').classList.toggle('active',tab==='expense');}
async function addExtraItem(){if(!requireEditOrPrompt())return;const label=document.getElementById('extraLabel').value.trim()||'ไม่ระบุ';const amt=parseFloat(document.getElementById('extraAmt').value);if(!amt||amt<=0){document.getElementById('extraAmt').focus();return;}try{const d=await apiPost('/api/extra',{kind:'income',label,amount:amt});extraItems=d.extraItems;document.getElementById('extraLabel').value='';document.getElementById('extraAmt').value='';flashSave();renderExtraList();updateTotals();updateNetDisplay();}catch(e){}}
async function removeExtraItem(i){if(!requireEditOrPrompt())return;try{const d=await apiPost('/api/extra/delete',{kind:'income',index:i});extraItems=d.extraItems;flashSave();renderExtraList();updateTotals();updateNetDisplay();}catch(e){}}
function renderExtraList(){const el=document.getElementById('extraList');if(!extraItems.length){el.innerHTML='<p class="extra-empty">ยังไม่มีรายการเงินเข้า</p>';return;}el.innerHTML=extraItems.map((e,i)=>'<div class="extra-item"><span class="e-label">'+e.label+'</span><span class="e-amt">+฿'+e.amount+'</span>'+(editMode?'<button class="e-del" onclick="removeExtraItem('+i+')">✕</button>':'')+' </div>').join('');}
async function addExpenseItem(){if(!requireEditOrPrompt())return;const label=document.getElementById('expenseLabel').value.trim()||'ไม่ระบุ';const amt=parseFloat(document.getElementById('expenseAmt').value);if(!amt||amt<=0){document.getElementById('expenseAmt').focus();return;}try{const d=await apiPost('/api/extra',{kind:'expense',label,amount:amt});expenseItems=d.expenseItems;document.getElementById('expenseLabel').value='';document.getElementById('expenseAmt').value='';flashSave();renderExpenseList();updateTotals();updateNetDisplay();}catch(e){}}
async function removeExpenseItem(i){if(!requireEditOrPrompt())return;try{const d=await apiPost('/api/extra/delete',{kind:'expense',index:i});expenseItems=d.expenseItems;flashSave();renderExpenseList();updateTotals();updateNetDisplay();}catch(e){}}
function renderExpenseList(){const el=document.getElementById('expenseList');if(!expenseItems.length){el.innerHTML='<p class="extra-empty">ยังไม่มีรายการรายจ่าย</p>';return;}el.innerHTML=expenseItems.map((e,i)=>'<div class="extra-item"><span class="e-label">'+e.label+'</span><span class="e-amt" style="color:#ef4444">-฿'+e.amount+'</span>'+(editMode?'<button class="e-del" onclick="removeExpenseItem('+i+')">✕</button>':'')+' </div>').join('');}
function updateNetDisplay(){const net=grandTotal()+extraTotal()-expenseTotal();document.getElementById('netDisplay').textContent='฿'+net;document.getElementById('netDisplay').style.color=net>=0?'#2563eb':'#ef4444';}

function confirmReset(){if(!requireEditOrPrompt())return;document.getElementById('resetOverlay').classList.add('show');}
function closeReset(){document.getElementById('resetOverlay').classList.remove('show');}
async function doReset(){try{applyState(await apiPost('/api/reset',{}));flashSave();render();document.getElementById('resetOverlay').classList.remove('show');}catch(e){}}

['loginOverlay','customOverlay','qrOverlay','qrSettingsOverlay','addDateOverlay','extraOverlay','resetOverlay','confirmDelOverlay'].forEach(id=>{
  document.getElementById(id).addEventListener('click',function(e){if(e.target===this)this.classList.remove('show');});
});

(async function init(){
  const pw=sessionStorage.getItem('editPassword');
  if(pw){try{const r=await fetch('/api/auth/check',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pw})});editMode=r.ok;if(!r.ok)sessionStorage.removeItem('editPassword');}catch(e){editMode=false;}}
  await loadInitialState();updateEditModeUI();
})();
</script>
</body>
</html>`;

app.get('/', (req, res) => res.send(HTML));

app.listen(PORT, () => {
  console.log(`Payment tracker running on port ${PORT}`);
  console.log(`Data: ${DATA_PATH}`);
});
