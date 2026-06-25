// ============================================================
// STATE (mirrors what the server holds — refreshed via /api/state)
// ============================================================
let STUDENTS = [];
let QR_AMOUNTS = [10, 20, 30];
let DEFAULT_AMOUNT = 10;
let DATES = [];
let payments = {};
let extraItems = [];
let expenseItems = [];
let qrValue = '';

let pendingCell = null;
let pendingDelete = null;
let activeTab = 'income';

// Edit mode: unlocked only after the correct password is entered.
// The password itself is cached in sessionStorage so the device
// doesn't have to re-enter it on every tap, but the SERVER checks
// it again on every single write — the browser flag below is only
// used to decide what to show, never to allow a write by itself.
let editMode = false;

// ============================================================
// API HELPERS
// ============================================================
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
  return res.json();
}

async function apiPost(url, body = {}) {
  const password = sessionStorage.getItem('editPassword') || '';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      lockEditMode();
      alert('รหัสไม่ถูกต้อง หรือหมดอายุ กรุณากดปุ่ม "แก้ไข" แล้วใส่รหัสใหม่');
    } else {
      alert(data.error || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
    }
    throw new Error(data.error || 'request failed');
  }
  return data;
}

function applyServerState(data) {
  if (data.students) STUDENTS = data.students;
  if (data.qrAmounts) QR_AMOUNTS = data.qrAmounts;
  if (data.defaultAmount) DEFAULT_AMOUNT = data.defaultAmount;
  DATES = data.DATES || [];
  payments = data.payments || {};
  extraItems = data.extraItems || [];
  expenseItems = data.expenseItems || [];
  qrValue = data.qrValue || '';
}

async function loadInitialState() {
  try {
    const data = await apiGet('/api/state');
    applyServerState(data);
    render();
  } catch (e) {
    document.getElementById('saveIndicator').textContent = '⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
  }
}

// Lightweight background refresh so other devices' edits show up.
// Skips quietly if any modal is currently open so it never yanks
// the screen out from under someone mid-edit.
async function backgroundRefresh() {
  if (document.querySelector('.overlay.show')) return;
  try {
    const data = await apiGet('/api/state');
    applyServerState(data);
    render();
  } catch (e) { /* ignore — keep showing last known data */ }
}
setInterval(backgroundRefresh, 6000);

// ============================================================
// EDIT MODE / LOGIN
// ============================================================
function updateEditModeUI() {
  document.body.classList.toggle('edit-mode', editMode);
  const btn = document.getElementById('lockBtn');
  btn.textContent = editMode ? '🔓 ออกจากโหมดแก้ไข' : '🔒 แก้ไข';
  btn.classList.toggle('unlocked', editMode);
  document.getElementById('modeHint').textContent = editMode
    ? '✅ อยู่ในโหมดแก้ไข — กดเลือกราคา → เลือกสด/โอน → ยืนยัน  |  กดซ้ำ = ยกเลิก'
    : '🔒 อยู่ในโหมดดูอย่างเดียว — กดปุ่ม "แก้ไข" มุมขวาบนแล้วใส่รหัสเพื่อติ๊ก/เพิ่มข้อมูล';
  renderTable();
  renderExtraList();
  renderExpenseList();
}

function lockEditMode() {
  editMode = false;
  sessionStorage.removeItem('editPassword');
  updateEditModeUI();
}

function onLockBtnClick() {
  if (editMode) {
    lockEditMode();
  } else {
    openLogin();
  }
}

function openLogin() {
  document.getElementById('loginPwInput').value = '';
  document.getElementById('loginError').style.display = 'none';
  document.getElementById('loginOverlay').classList.add('show');
  setTimeout(() => document.getElementById('loginPwInput').focus(), 100);
}
function closeLogin() { document.getElementById('loginOverlay').classList.remove('show'); }

async function submitLogin() {
  const pw = document.getElementById('loginPwInput').value;
  try {
    const res = await fetch('/api/auth/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    });
    if (!res.ok) {
      document.getElementById('loginError').style.display = 'block';
      return;
    }
    sessionStorage.setItem('editPassword', pw);
    editMode = true;
    updateEditModeUI();
    closeLogin();
  } catch (e) {
    document.getElementById('loginError').style.display = 'block';
  }
}
document.getElementById('loginPwInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitLogin();
});

function requireEditOrPrompt() {
  if (editMode) return true;
  openLogin();
  return false;
}

// ============================================================
// SAVE INDICATOR
// ============================================================
let saveFlashTimer = null;
function flashSave() {
  const el = document.getElementById('saveIndicator');
  el.textContent = '✅ บันทึกแล้ว';
  clearTimeout(saveFlashTimer);
  saveFlashTimer = setTimeout(() => { el.textContent = '🌐 เชื่อมต่อเซิร์ฟเวอร์'; }, 1800);
}

// ============================================================
// RENDER
// ============================================================
function render() {
  renderHeader();
  renderTable();
  renderSummary();
  updateTotals();
}

function renderHeader() {
  const row = document.getElementById('theadRow');
  row.innerHTML = `
    <th>#</th>
    <th class="name-col">ชื่อ-สกุล</th>
    ${DATES.map((d, di) => `
      <th class="date-th">
        ${d}
        <button class="del-date-btn edit-only" onclick="deleteDate(${di})" title="ลบวันนี้">✕</button>
      </th>`).join('')}
    <th>รวม</th>
  `;
}

function cellInnerHTML(sid, di) {
  const p = getP(sid, di);
  const lockedClass = editMode ? '' : ' locked';
  if (p) {
    let cls = p.method === 'transfer' ? 'transfer' : (p.amount !== DEFAULT_AMOUNT ? 'custom-amt' : 'cash');
    const icon = p.method === 'transfer' ? '💸' : '✅';
    return `<div class="cell-btn ${cls}${lockedClass}" data-sid="${sid}" data-di="${di}">
      <span class="icon">${icon}</span>
      <span class="amt-lbl">฿${p.amount}</span>
    </div>`;
  }
  return `<div class="cell-btn${lockedClass}" data-sid="${sid}" data-di="${di}">
    <span class="empty">–</span>
  </div>`;
}
function cellHTML(sid, di) {
  return `<td>${cellInnerHTML(sid, di)}</td>`;
}

function renderTable() {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = '';
  STUDENTS.forEach((s, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#9ca3af;font-size:11px">${idx + 1}</td>
      <td class="name-col">
        <span class="prefix">${s.prefix} </span>
        <span class="fname">${s.fname}</span>
        <span class="lname"> ${s.lname}</span>
      </td>
      ${DATES.map((_, di) => cellHTML(s.id, di)).join('')}
      <td class="total-col ${totalByStudent(s.id) === 0 ? 'zero' : ''}">${totalByStudent(s.id) > 0 ? '฿' + totalByStudent(s.id) : '-'}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Event delegation — ONE listener instead of one per cell.
let cellTouchStartY = 0;
document.getElementById('tbody').addEventListener('click', (e) => {
  const btn = e.target.closest('.cell-btn');
  if (!btn) return;
  if (!requireEditOrPrompt()) return;
  handleClick(Number(btn.dataset.sid), parseInt(btn.dataset.di, 10));
});
document.getElementById('tbody').addEventListener('touchstart', (e) => {
  const btn = e.target.closest('.cell-btn');
  if (!btn) return;
  cellTouchStartY = e.touches[0].clientY;
}, { passive: true });
document.getElementById('tbody').addEventListener('touchend', (e) => {
  const btn = e.target.closest('.cell-btn');
  if (!btn) return;
  const dy = Math.abs(e.changedTouches[0].clientY - cellTouchStartY);
  if (dy > 8) return; // user was scrolling
  if (!requireEditOrPrompt()) return;
  e.preventDefault();
  handleClick(Number(btn.dataset.sid), parseInt(btn.dataset.di, 10));
}, { passive: false });

// Fast path: patch just the one cell + its row total + header totals.
function updateAfterPayment(sid, di) {
  const btn = document.querySelector(`.cell-btn[data-sid="${sid}"][data-di="${di}"]`);
  if (btn) {
    const td = btn.closest('td');
    td.innerHTML = cellInnerHTML(sid, di);
    const tr = td.closest('tr');
    const totalTd = tr.querySelector('.total-col');
    const tot = totalByStudent(sid);
    totalTd.textContent = tot > 0 ? '฿' + tot : '-';
    totalTd.classList.toggle('zero', tot === 0);
  }
  renderSummary();
  updateTotals();
  flashSave();
}

function renderSummary() {
  const bar = document.getElementById('summaryBar');
  bar.innerHTML = DATES.map((d, di) => `
    <div class="sum-card">
      <div class="date">${d}</div>
      <div class="amt">฿${totalByDate(di)}</div>
    </div>`).join('');
}

function updateTotals() {
  const gt = grandTotal();
  const et = extraTotal();
  const exp = expenseTotal();
  document.getElementById('grandTotal').textContent = '฿' + gt;
  document.getElementById('extraTotal').textContent = '฿' + et;
  document.getElementById('expenseTotal').textContent = '฿' + exp;
  document.getElementById('allTotal').textContent = '฿' + (gt + et - exp);
}

// ============================================================
// DATA HELPERS (read-only, operate on the local mirror of state)
// ============================================================
function getP(sid, di) { return (payments[sid] || {})[di] || null; }
function totalByDate(di) { return STUDENTS.reduce((s, st) => { const p = getP(st.id, di); return s + (p ? p.amount : 0); }, 0); }
function totalByStudent(sid) { return DATES.reduce((s, _, di) => { const p = getP(sid, di); return s + (p ? p.amount : 0); }, 0); }
function grandTotal() { return STUDENTS.reduce((s, st) => s + totalByStudent(st.id), 0); }
function extraTotal() { return extraItems.reduce((s, e) => s + (e.amount || 0), 0); }
function expenseTotal() { return expenseItems.reduce((s, e) => s + (e.amount || 0), 0); }
function studentName(sid) { const s = STUDENTS.find(x => x.id === sid); return s ? s.fname : ''; }

// ============================================================
// INTERACTIONS — every one of these requires editMode === true,
// already enforced by requireEditOrPrompt() before handleClick runs.
// ============================================================
function handleClick(sid, di) {
  const p = getP(sid, di);
  if (p) {
    const s = STUDENTS.find(x => x.id === sid);
    const name = s ? (s.prefix + s.fname + ' ' + s.lname) : '';
    openConfirmDelete(sid, di, name, DATES[di], p);
    return;
  }
  openAmountPicker(sid, di);
}

function openConfirmDelete(sid, di, name, date, p) {
  pendingDelete = { sid, di };
  const icon = p.method === 'transfer' ? '💸' : '✅';
  const method = p.method === 'transfer' ? 'โอน' : 'สด';
  document.getElementById('confirmDelName').textContent = name;
  document.getElementById('confirmDelDetail').textContent = `${date} — ${icon} ฿${p.amount} (${method})`;
  document.getElementById('confirmDelOverlay').classList.add('show');
}
async function doConfirmDelete() {
  if (!pendingDelete) return;
  const { sid, di } = pendingDelete;
  document.getElementById('confirmDelOverlay').classList.remove('show');
  pendingDelete = null;
  try {
    const data = await apiPost('/api/payment/delete', { sid, di });
    payments = data.payments;
    updateAfterPayment(sid, di);
  } catch (e) { /* error already alerted */ }
}
function cancelConfirmDelete() {
  document.getElementById('confirmDelOverlay').classList.remove('show');
  pendingDelete = null;
}

function openAmountPicker(sid, di) {
  pendingCell = { sid, di, amount: DEFAULT_AMOUNT };
  const s = STUDENTS.find(x => x.id === sid);
  document.getElementById('customInfo').textContent = s.fname + ' ' + s.lname + ' — ' + DATES[di];
  document.getElementById('customAmt').value = '';
  document.querySelectorAll('.amt-pick').forEach(b => {
    b.style.background = '#f3f4f6';
    b.style.color = '#374151';
    b.style.border = '2px solid #e5e7eb';
  });
  pickAmt(DEFAULT_AMOUNT);
  document.getElementById('customOverlay').classList.add('show');
}

function pickAmt(amt) {
  pendingCell.amount = amt;
  document.getElementById('customAmt').value = '';
  document.querySelectorAll('.amt-pick').forEach(b => {
    b.style.background = '#f3f4f6';
    b.style.color = '#374151';
    b.style.border = '2px solid #e5e7eb';
  });
  const btn = document.getElementById('amtBtn' + amt);
  if (btn) {
    btn.style.background = '#2563eb';
    btn.style.color = '#fff';
    btn.style.border = '2px solid #1d4ed8';
  }
}

// CUSTOM MODAL
async function confirmCustom(method) {
  const customVal = parseFloat(document.getElementById('customAmt').value);
  if (customVal && customVal > 0) pendingCell.amount = customVal;
  const amt = pendingCell.amount || DEFAULT_AMOUNT;
  closeCustom();
  if (method === 'transfer') {
    openQR();
  } else {
    const { sid, di } = pendingCell;
    try {
      const data = await apiPost('/api/payment', { sid, di, method: 'cash', amount: amt });
      payments = data.payments;
      updateAfterPayment(sid, di);
    } catch (e) { /* error already alerted */ }
  }
}
function closeCustom() { document.getElementById('customOverlay').classList.remove('show'); }

// QR MODAL (fixed QR images for 10/20/30 ฿, served from /images/)
function openQR() {
  const s = STUDENTS.find(x => x.id === pendingCell.sid);
  const amt = pendingCell.amount;
  document.getElementById('qrInfo').textContent = s.fname + ' ' + s.lname + ' — ฿' + amt;
  const img = document.getElementById('qrImg');
  const hint = document.getElementById('qrNoneHint');
  const hasFixedQr = QR_AMOUNTS.includes(amt);
  if (hasFixedQr) {
    img.src = `/images/qr${amt}.jpg`; img.style.display = 'block'; hint.style.display = 'none';
  } else {
    img.style.display = 'none'; hint.style.display = 'block';
  }
  document.getElementById('qrOverlay').classList.add('show');
}
async function confirmQR() {
  document.getElementById('qrOverlay').classList.remove('show');
  const { sid, di, amount } = pendingCell;
  try {
    const data = await apiPost('/api/payment', { sid, di, method: 'transfer', amount });
    payments = data.payments;
    updateAfterPayment(sid, di);
  } catch (e) { /* error already alerted */ }
}
function cancelQR() { document.getElementById('qrOverlay').classList.remove('show'); }

function buildQRUrl(val) {
  if (val.startsWith('http')) return val;
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PromptPay-${encodeURIComponent(val)}`;
}

// QR SETTINGS (PromptPay number / custom QR URL for reference — display only)
function openQRSettings() {
  if (!requireEditOrPrompt()) return;
  document.getElementById('qrInput').value = qrValue;
  document.getElementById('settingsQRImg').style.display = 'none';
  document.getElementById('settingsQRNone').style.display = 'block';
  document.getElementById('qrSettingsOverlay').classList.add('show');
}
function previewQR() {
  const val = document.getElementById('qrInput').value.trim();
  if (!val) return;
  const url = buildQRUrl(val);
  const img = document.getElementById('settingsQRImg');
  img.src = url; img.style.display = 'block';
  document.getElementById('settingsQRNone').style.display = 'none';
}
async function saveQRSettings() {
  const val = document.getElementById('qrInput').value.trim();
  try {
    const data = await apiPost('/api/qr', { qrValue: val });
    qrValue = data.qrValue;
    flashSave();
    document.getElementById('qrSettingsOverlay').classList.remove('show');
  } catch (e) { /* error already alerted */ }
}
function closeQRSettings() { document.getElementById('qrSettingsOverlay').classList.remove('show'); }

// ADD DATE
function openAddDate() {
  if (!requireEditOrPrompt()) return;
  document.getElementById('newDateInput').value = '';
  document.getElementById('addDateOverlay').classList.add('show');
  setTimeout(() => document.getElementById('newDateInput').focus(), 100);
}
async function confirmAddDate() {
  const val = document.getElementById('newDateInput').value.trim();
  if (!val) return;
  try {
    const data = await apiPost('/api/dates', { date: val });
    DATES = data.DATES;
    flashSave();
    render();
    document.getElementById('addDateOverlay').classList.remove('show');
  } catch (e) { /* error already alerted */ }
}
function closeAddDate() { document.getElementById('addDateOverlay').classList.remove('show'); }
document.getElementById('newDateInput').addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddDate(); });

async function deleteDate(di) {
  if (!requireEditOrPrompt()) return;
  if (!confirm(`ลบวันที่ "${DATES[di]}" และข้อมูลการชำระทั้งหมดในวันนั้น?`)) return;
  try {
    const data = await apiPost('/api/dates/delete', { di });
    DATES = data.DATES;
    payments = data.payments;
    flashSave();
    render();
  } catch (e) { /* error already alerted */ }
}

// EXTRA INCOME / EXPENSE
function openExtra() {
  renderExtraList();
  renderExpenseList();
  updateNetDisplay();
  document.getElementById('extraLabel').value = '';
  document.getElementById('extraAmt').value = '';
  document.getElementById('expenseLabel').value = '';
  document.getElementById('expenseAmt').value = '';
  switchTab(activeTab);
  document.getElementById('extraOverlay').classList.add('show');
}
function closeExtra() { document.getElementById('extraOverlay').classList.remove('show'); }

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('panelIncome').style.display = tab === 'income' ? '' : 'none';
  document.getElementById('panelExpense').style.display = tab === 'expense' ? '' : 'none';
  document.getElementById('tabIncome').classList.toggle('active', tab === 'income');
  document.getElementById('tabExpense').classList.toggle('active', tab === 'expense');
}

async function addExtraItem() {
  if (!requireEditOrPrompt()) return;
  const label = document.getElementById('extraLabel').value.trim() || 'ไม่ระบุ';
  const amt = parseFloat(document.getElementById('extraAmt').value);
  if (!amt || amt <= 0) { document.getElementById('extraAmt').focus(); return; }
  try {
    const data = await apiPost('/api/extra', { kind: 'income', label, amount: amt });
    extraItems = data.extraItems;
    document.getElementById('extraLabel').value = '';
    document.getElementById('extraAmt').value = '';
    flashSave();
    renderExtraList(); updateTotals(); updateNetDisplay();
  } catch (e) { /* error already alerted */ }
}
async function removeExtraItem(i) {
  if (!requireEditOrPrompt()) return;
  try {
    const data = await apiPost('/api/extra/delete', { kind: 'income', index: i });
    extraItems = data.extraItems;
    flashSave();
    renderExtraList(); updateTotals(); updateNetDisplay();
  } catch (e) { /* error already alerted */ }
}
function renderExtraList() {
  const el = document.getElementById('extraList');
  if (extraItems.length === 0) {
    el.innerHTML = '<p class="extra-empty">ยังไม่มีรายการเงินเข้า</p>';
    return;
  }
  el.innerHTML = extraItems.map((e, i) => `
    <div class="extra-item">
      <span class="e-label">${e.label}</span>
      <span class="e-amt">+฿${e.amount}</span>
      ${editMode ? `<button class="e-del" onclick="removeExtraItem(${i})">✕</button>` : ''}
    </div>`).join('');
}

async function addExpenseItem() {
  if (!requireEditOrPrompt()) return;
  const label = document.getElementById('expenseLabel').value.trim() || 'ไม่ระบุ';
  const amt = parseFloat(document.getElementById('expenseAmt').value);
  if (!amt || amt <= 0) { document.getElementById('expenseAmt').focus(); return; }
  try {
    const data = await apiPost('/api/extra', { kind: 'expense', label, amount: amt });
    expenseItems = data.expenseItems;
    document.getElementById('expenseLabel').value = '';
    document.getElementById('expenseAmt').value = '';
    flashSave();
    renderExpenseList(); updateTotals(); updateNetDisplay();
  } catch (e) { /* error already alerted */ }
}
async function removeExpenseItem(i) {
  if (!requireEditOrPrompt()) return;
  try {
    const data = await apiPost('/api/extra/delete', { kind: 'expense', index: i });
    expenseItems = data.expenseItems;
    flashSave();
    renderExpenseList(); updateTotals(); updateNetDisplay();
  } catch (e) { /* error already alerted */ }
}
function renderExpenseList() {
  const el = document.getElementById('expenseList');
  if (expenseItems.length === 0) {
    el.innerHTML = '<p class="extra-empty">ยังไม่มีรายการรายจ่าย</p>';
    return;
  }
  el.innerHTML = expenseItems.map((e, i) => `
    <div class="extra-item">
      <span class="e-label">${e.label}</span>
      <span class="e-amt" style="color:#ef4444">-฿${e.amount}</span>
      ${editMode ? `<button class="e-del" onclick="removeExpenseItem(${i})">✕</button>` : ''}
    </div>`).join('');
}
function updateNetDisplay() {
  const net = grandTotal() + extraTotal() - expenseTotal();
  document.getElementById('netDisplay').textContent = '฿' + net;
  document.getElementById('netDisplay').style.color = net >= 0 ? '#2563eb' : '#ef4444';
}

// RESET
function confirmReset() {
  if (!requireEditOrPrompt()) return;
  document.getElementById('resetOverlay').classList.add('show');
}
function closeReset() { document.getElementById('resetOverlay').classList.remove('show'); }
async function doReset() {
  try {
    const data = await apiPost('/api/reset', {});
    applyServerState(data);
    flashSave();
    render();
    document.getElementById('resetOverlay').classList.remove('show');
  } catch (e) { /* error already alerted */ }
}

// Close overlay on background click
['loginOverlay', 'customOverlay', 'qrOverlay', 'qrSettingsOverlay', 'addDateOverlay', 'extraOverlay', 'resetOverlay', 'confirmDelOverlay'].forEach(id => {
  document.getElementById(id).addEventListener('click', function (e) {
    if (e.target === this) this.classList.remove('show');
  });
});

// ============================================================
// INIT
// ============================================================
(async function init() {
  // If this device unlocked edit mode earlier this session, re-check
  // the cached password against the server before trusting it again.
  const cachedPw = sessionStorage.getItem('editPassword');
  if (cachedPw) {
    try {
      const res = await fetch('/api/auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cachedPw }),
      });
      editMode = res.ok;
      if (!res.ok) sessionStorage.removeItem('editPassword');
    } catch (e) { editMode = false; }
  }
  await loadInitialState();
  updateEditModeUI();
})();
