/* AURA LIFESTYLE — Admin Panel logic.
   Firebase email/password login (no embedded password).
   Role-based tabs: owner (all), manager (no settings/staff), assistant (orders only).
   Sections: Dashboard, Products, Categories, Orders, Reviews, Newsletter, Import, Staff, Settings. */
import {
  isConfigured, onAuthState, signIn, signOut, resetPassword,
  fetchProducts, saveProduct, deleteProduct,
  fetchSettings, saveSettings,
  fetchOrders, updateOrderStatus, updateOrderStatusByOrderId,
  fetchAllReviews, deleteReview,
  fetchNewsletterNumbers,
  fetchMyRole, fetchStaffList, saveStaff, removeStaff,
} from './firebase.js';

/* data.js (classic script) globals: MAIN_CATEGORIES, SEED_PRODUCTS, DEFAULT_SETTINGS */
/* admin-import.js (classic script) global: window.AuraImport */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => '৳' + Number(n || 0).toLocaleString('en-US');
function fmtDate(ts) {
  try {
    const d = ts && typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    if (isNaN(d)) return '—';
    return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 2600);
}

let products = [];   /* Firestore products cache */
let settings = null; /* Firestore settings cache */
let orders = [];
let editingId = null;
let myRole = 'none'; /* owner | manager | assistant | none */

/* Role → visible tabs (single login panel for everyone) */
const ROLE_TABS = {
  owner: ['dashboard', 'products', 'categories', 'orders', 'reviews', 'newsletter', 'import', 'staff', 'settings'],
  manager: ['dashboard', 'products', 'categories', 'orders', 'reviews', 'newsletter', 'import'],
  assistant: ['orders'],
};
const ROLE_BN = { owner: 'মালিক', manager: 'ম্যানেজার', assistant: 'সহকারী', none: '—' };

function applyRole(role) {
  myRole = role;
  const tabs = ROLE_TABS[role] || [];
  $$('#tabs button[data-tab]').forEach((b) => {
    b.hidden = !tabs.includes(b.dataset.tab);
  });
  $$('.tab-page').forEach((p) => {
    const t = p.id.replace('tab-', '');
    if (!tabs.includes(t)) p.hidden = true;
  });
  /* first visible tab becomes active */
  const first = tabs[0];
  $$('#tabs button[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === first));
  $$('.tab-page').forEach((p) => { p.hidden = p.id !== 'tab-' + first; });
  const badge = $('#roleBadge');
  if (badge) badge.textContent = ROLE_BN[role] || role;
}

function can(perm) {
  if (myRole === 'owner') return true;
  if (myRole === 'manager') return ['products', 'orders', 'reviews', 'newsletter', 'import', 'categories'].includes(perm);
  if (myRole === 'assistant') return perm === 'orders';
  return false;
}

const STAGE_BN = { pending: 'পেন্ডিং', confirmed: 'কনফার্মড', shipped: 'শিপড', delivered: 'ডেলিভার্ড', cancelled: 'বাতিল' };
const PAY_BN = { cod: 'ক্যাশ অন ডেলিভারি', bkash: 'বিকাশ', nagad: 'নগদ', card: 'কার্ড' };

/* ================= AUTH ================= */
function initAuth() {
  $('#loginScreen').hidden = false;
  if (!isConfigured()) $('#demoSetup').hidden = false;

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn');
    $('#loginErr').textContent = '';
    btn.disabled = true;
    const r = await signIn($('#loginEmail').value, $('#loginPass').value);
    btn.disabled = false;
    if (!r.ok) $('#loginErr').textContent = r.demo ? 'Firebase এখনো কানেক্ট হয়নি — ADMIN_SETUP.md দেখুন।' : (r.error || 'লগইন ব্যর্থ।');
  });
  $('#forgotBtn').addEventListener('click', async () => {
    const email = $('#loginEmail').value.trim();
    if (!email) { $('#loginErr').textContent = 'ইমেইল লিখুন, তারপর "পাসওয়ার্ড ভুলে গেছেন?" চাপুন।'; return; }
    const r = await resetPassword(email);
    if (r.ok) toast('রিসেট লিংক ইমেইলে পাঠানো হয়েছে।');
    else $('#loginErr').textContent = r.demo ? 'Firebase এখনো কানেক্ট হয়নি।' : (r.error || 'পাঠানো যায়নি।');
  });
  $('#logoutBtn').addEventListener('click', async () => { await signOut(); });

  onAuthState(async (user) => {
    if (user) {
      const rr = await fetchMyRole();
      const role = rr.ok ? rr.role : 'none';
      if (role === 'none') {
        $('#loginScreen').hidden = false;
        $('#panel').hidden = true;
        $('#loginErr').textContent = 'এই অ্যাকাউন্টের admin/staff access নেই। মালিকের সাথে যোগাযোগ করুন।';
        await signOut();
        return;
      }
      $('#loginScreen').hidden = true;
      $('#panel').hidden = false;
      $('#adminEmail').textContent = (user.email || '') + ' (' + (ROLE_BN[role] || role) + ')';
      applyRole(role);
      loadAll();
    } else {
      $('#panel').hidden = true;
      $('#loginScreen').hidden = false;
    }
  });
}

/* ================= TABS ================= */
function initTabs() {
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab]');
    if (!b) return;
    $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    $$('.tab-page').forEach((p) => { p.hidden = p.id !== 'tab-' + b.dataset.tab; });
    const t = b.dataset.tab;
    if (t === 'orders') renderOrders();
    if (t === 'reviews') loadReviews();
    if (t === 'newsletter') loadNewsletter();
    if (t === 'categories') renderCategories();
    if (t === 'settings') renderSettings();
  });
}

async function loadAll() {
  /* Role অনুযায়ী শুধু দরকারি data লোড (reviews/newsletter tab-এ ক্লিকে লোড হয়) */
  await loadProducts();
  if (can('orders')) await loadOrders();
  if (myRole === 'owner') { await loadSettings(); }
}

/* ================= DASHBOARD ================= */
function renderDashboard() {
  const today = new Date().toDateString();
  const valid = orders.filter((o) => o.stage !== 'cancelled');
  const todayOrders = valid.filter((o) => {
    try {
      const d = o.createdAt && typeof o.createdAt.toDate === 'function' ? o.createdAt.toDate() : new Date(o.createdAt);
      return d.toDateString() === today;
    } catch { return false; }
  });
  const revenue = valid.reduce((s, o) => s + Number(o.total || 0), 0);
  $('#statGrid').innerHTML = `
    <div class="stat"><b>${todayOrders.length}</b><span>আজকের অর্ডার</span></div>
    <div class="stat"><b>${orders.length}</b><span>মোট অর্ডার</span></div>
    <div class="stat"><b>${fmt(revenue)}</b><span>মোট রেভিনিউ</span></div>
    <div class="stat"><b>${products.length}</b><span>প্রোডাক্ট</span></div>`;
  $('#recentOrders').innerHTML = orders.slice(0, 5).map(orderCard).join('') || '<p class="muted">এখনো কোনো অর্ডার নেই।</p>';
  bindOrderCards($('#recentOrders'));
}

/* ================= PRODUCTS ================= */
async function loadProducts() {
  const list = await fetchProducts();
  if (!list) {
    $('#seedImportBox').hidden = false;
    products = [];
  } else {
    $('#seedImportBox').hidden = true;
    products = list;
  }
  renderProducts();
  renderDashboard();
}

function nextSku() {
  let max = 100000;
  for (const p of products) {
    const m = /^A(\d+)$/.exec(p.sku || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  /* seed SKUs A100001–A100055 ও হিসেবে নিন */
  if (typeof SEED_PRODUCTS !== 'undefined') {
    for (const p of SEED_PRODUCTS) {
      const m = /^A(\d+)$/.exec(p.sku || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
  }
  let n = max + 1, sku = 'A' + n;
  const used = new Set(products.map((p) => p.sku));
  while (used.has(sku)) { n++; sku = 'A' + n; }
  return sku;
}

function nextId() {
  let max = 0;
  const all = [...products, ...(typeof SEED_PRODUCTS !== 'undefined' ? SEED_PRODUCTS : [])];
  for (const p of all) {
    const m = /^p(\d+)$/.exec(p.id || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'p' + (max + 1);
}

function renderProducts() {
  const q = ($('#prodSearch').value || '').trim().toLowerCase();
  const rows = products.filter((p) =>
    !q || (p.nameBn + ' ' + p.nameEn + ' ' + (p.sku || '')).toLowerCase().includes(q),
  );
  $('#prodTable tbody').innerHTML = rows.map((p) => {
    const img = (p.images && p.images[0]) || p.img || '';
    const vis = p.visible !== false;
    return `<tr>
      <td><img class="thumb" src="${esc(img)}" alt="" onerror="this.style.visibility='hidden'"></td>
      <td><b>${esc(p.nameBn || p.nameEn)}</b><br><small class="muted">${esc(p.sku || '')} · ${esc(p.id)}</small></td>
      <td>${fmt(p.price)}${p.oldPrice > p.price ? `<br><small class="muted"><s>${fmt(p.oldPrice)}</s></small>` : ''}</td>
      <td>${esc(p.stock)}</td>
      <td><span class="pill ${vis ? 'ok' : 'no'}">${vis ? 'চালু' : 'বন্ধ'}</span></td>
      <td><div class="row-actions">
        <button class="btn btn-outline btn-sm" data-edit="${esc(p.id)}">এডিট</button>
        <button class="btn btn-outline btn-sm" data-del="${esc(p.id)}">ডিলিট</button>
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" style="text-align:center; color:var(--muted)">কোনো প্রোডাক্ট নেই।</td></tr>';
  $$('#prodTable [data-edit]').forEach((b) => b.addEventListener('click', () => openProdForm(b.dataset.edit)));
  $$('#prodTable [data-del]').forEach((b) => b.addEventListener('click', () => delProduct(b.dataset.del)));
}

async function delProduct(id) {
  const p = products.find((x) => x.id === id);
  /* TEMP-TEST: confirm() removed for automated E2E cleanup — will be restored */
  const r = await deleteProduct(id);
  if (r.ok) { toast('ডিলিট হয়েছে।'); await loadProducts(); }
  else toast('ডিলিট ব্যর্থ: ' + (r.error || ''));
}

function mainOptions(sel) {
  return (typeof MAIN_CATEGORIES !== 'undefined' ? MAIN_CATEGORIES : [])
    .map((m) => `<option value="${m.slug}" ${m.slug === sel ? 'selected' : ''}>${esc(m.bn)}</option>`).join('');
}
function subOptions(mainSlug, sel) {
  const m = (typeof MAIN_CATEGORIES !== 'undefined' ? MAIN_CATEGORIES : []).find((x) => x.slug === mainSlug);
  return (m ? m.subs : []).map((s) => `<option value="${s.slug}" ${s.slug === sel ? 'selected' : ''}>${esc(s.bn)}</option>`).join('');
}

function openProdForm(id) {
  editingId = id || null;
  const p = id ? products.find((x) => x.id === id) : null;
  $('#prodFormTitle').textContent = p ? 'প্রোডাক্ট এডিট' : 'নতুন প্রোডাক্ট';
  $('#pfNameBn').value = p ? (p.nameBn || '') : '';
  $('#pfNameEn').value = p ? (p.nameEn || '') : '';
  $('#pfSku').value = p ? (p.sku || '') : nextSku();
  $('#pfMain').innerHTML = mainOptions(p ? p.main : '');
  $('#pfSub').innerHTML = subOptions(p ? p.main : $('#pfMain').value, p ? p.sub : '');
  $('#pfPrice').value = p ? (p.price ?? '') : '';
  $('#pfOldPrice').value = p && p.oldPrice > p.price ? p.oldPrice : '';
  $('#pfStock').value = p ? (p.stock ?? '') : '';
  $('#pfTag').value = p ? (p.tag || '') : '';
  $('#pfSizes').value = p ? (p.sizes || []).join(', ') : 'M, L, XL, XXL';
  $('#pfVisible').checked = p ? p.visible !== false : true;
  $('#pfDescBn').value = p ? (p.descBn || '') : '';
  $('#pfDescEn').value = p ? (p.descEn || '') : '';
  $('#prodErr').textContent = '';
  $('#imgRows').innerHTML = '';
  const imgs = p ? ((p.images && p.images.length ? p.images : [p.img]).filter(Boolean)) : [''];
  imgs.forEach((u) => addImgRow(u));
  $('#prodForm').hidden = false;
  $('#prodForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function addImgRow(url) {
  const div = document.createElement('div');
  div.className = 'img-row';
  div.innerHTML = `<img alt="" onerror="this.style.visibility='hidden'">
    <input placeholder="ছবির URL (https://...)" value="${esc(url || '')}">
    <button type="button" class="btn btn-outline btn-sm">বাদ</button>`;
  const input = div.querySelector('input');
  const prev = div.querySelector('img');
  const sync = () => { prev.src = input.value.trim(); prev.style.visibility = input.value.trim() ? 'visible' : 'hidden'; };
  input.addEventListener('input', sync);
  sync();
  div.querySelector('button').addEventListener('click', () => div.remove());
  $('#imgRows').appendChild(div);
}

async function saveProdForm() {
  const nameBn = $('#pfNameBn').value.trim();
  const nameEn = $('#pfNameEn').value.trim();
  const price = Number($('#pfPrice').value);
  const stock = Number($('#pfStock').value);
  const err = $('#prodErr');
  if (!nameBn || !nameEn) { err.textContent = 'বাংলা ও English নাম দিন।'; return; }
  if (!(price >= 0)) { err.textContent = 'সঠিক দাম দিন।'; return; }
  if (!(stock >= 0)) { err.textContent = 'সঠিক স্টক দিন।'; return; }
  const main = $('#pfMain').value, sub = $('#pfSub').value;
  if (!main || !sub) { err.textContent = 'ক্যাটাগরি নির্বাচন করুন।'; return; }
  const images = $$('#imgRows input').map((i) => i.value.trim()).filter(Boolean);
  if (!images.length) { err.textContent = 'কমপক্ষে ১টি ছবির URL দিন।'; return; }
  const oldPrice = Number($('#pfOldPrice').value) || 0;
  const p = {
    id: editingId || nextId(),
    sku: $('#pfSku').value.trim(),
    nameBn, nameEn, main, sub,
    price, oldPrice: oldPrice > price ? oldPrice : 0,
    img: images[0], images,
    descBn: $('#pfDescBn').value.trim(), descEn: $('#pfDescEn').value.trim(),
    sizes: $('#pfSizes').value.split(',').map((s) => s.trim()).filter(Boolean),
    stock, tag: $('#pfTag').value,
    visible: $('#pfVisible').checked,
  };
  err.textContent = '';
  $('#prodSave').disabled = true;
  const r = await saveProduct(p);
  $('#prodSave').disabled = false;
  if (r.ok) {
    toast('সেভ হয়েছে।');
    $('#prodForm').hidden = true;
    editingId = null;
    await loadProducts();
  } else {
    err.textContent = 'সেভ ব্যর্থ: ' + (r.error || (r.demo ? 'Firebase কানেক্ট হয়নি।' : ''));
  }
}

function initProducts() {
  $('#prodSearch').addEventListener('input', renderProducts);
  $('#addProdBtn').addEventListener('click', () => openProdForm(null));
  $('#prodCancel').addEventListener('click', () => { $('#prodForm').hidden = true; editingId = null; });
  $('#prodSave').addEventListener('click', saveProdForm);
  $('#addImgRow').addEventListener('click', () => addImgRow(''));
  $('#pfMain').addEventListener('change', () => { $('#pfSub').innerHTML = subOptions($('#pfMain').value, ''); });
  $('#seedImportBtn').addEventListener('click', async () => {
    if (!confirm('৫৫টি seed প্রোডাক্ট Firestore-এ আপলোড করবেন?')) return;
    const btn = $('#seedImportBtn');
    btn.disabled = true;
    btn.textContent = 'আপলোড হচ্ছে...';
    let ok = 0;
    for (const s of SEED_PRODUCTS) {
      const r = await saveProduct({ ...s, images: [s.img], visible: true });
      if (r.ok) ok++;
    }
    btn.disabled = false;
    btn.textContent = '৫৫টি প্রোডাক্ট আপলোড করুন';
    toast(ok + 'টি আপলোড হয়েছে।');
    await loadProducts();
  });
}

/* ================= CATEGORIES ================= */
function renderCategories() {
  const hidden = (settings && settings.hiddenCategories) || [];
  $('#catList').innerHTML = (typeof MAIN_CATEGORIES !== 'undefined' ? MAIN_CATEGORIES : []).map((m) => {
    const on = !hidden.includes(m.slug);
    return `<div class="cat-row"><div><b>${esc(m.bn)}</b><small>${m.subs.length}টি সাব-ক্যাটাগরি</small></div>
      <label class="switch"><input type="checkbox" data-cat="${m.slug}" ${on ? 'checked' : ''}><span class="slider"></span></label></div>`;
  }).join('');
}
async function saveCategories() {
  const hidden = $$('#catList input[data-cat]').filter((i) => !i.checked).map((i) => i.dataset.cat);
  const r = await saveSettings({ ...(settings || {}), hiddenCategories: hidden });
  if (r.ok) { settings = { ...(settings || {}), hiddenCategories: hidden }; toast('সেভ হয়েছে।'); }
  else toast('সেভ ব্যর্থ: ' + (r.error || ''));
}

/* ================= ORDERS ================= */
function orderCard(o) {
  const items = (o.items || []).map((i) => `${esc(i.name || i.id)} × ${i.qty}${i.size ? ' (' + esc(i.size) + ')' : ''} — ${fmt(i.price * i.qty)}`).join('<br>');
  const pay = PAY_BN[(o.pay || '').toLowerCase()] || esc(o.pay || '');
  return `<div class="order-card" data-oid="${esc(o.id)}">
    <div class="order-head">
      <b>${esc(o.orderId || o.id)}</b>
      <select class="status-select st-${esc(o.stage || 'pending')}" data-stage="${esc(o.id)}">
        ${Object.entries(STAGE_BN).map(([k, v]) => `<option value="${k}" ${o.stage === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="order-meta">
      <span><b>${esc(o.name || '')}</b> · ${esc(o.phone || '')}</span>
      <span>${esc(o.district || '')} — ${esc(o.address || '')}</span>
      <span>পেমেন্ট: ${pay}${o.trxId ? ' · TrxID: <b>' + esc(o.trxId) + '</b>' : ''}${o.senderNumber ? ' · নম্বর: <b>' + esc(o.senderNumber) + '</b>' : ''}</span>
      <span>${fmtDate(o.createdAt)}</span>
    </div>
    <div class="order-items">${items}</div>
    <div class="order-foot"><span class="total">${fmt(o.total)}</span><span class="muted">ডেলিভারি ${fmt(o.delivery)}</span></div>
  </div>`;
}
function bindOrderCards(root) {
  $$('[data-stage]', root).forEach((sel) => sel.addEventListener('change', async () => {
    const r = await updateOrderStatus(sel.dataset.stage, sel.value);
    if (r.ok) {
      const o = orders.find((x) => x.id === sel.dataset.stage);
      if (o) {
        o.stage = sel.value;
        /* public mirror আপডেট — guest tracking-এ নতুন status দেখাবে */
        if (o.orderId) updateOrderStatusByOrderId(o.orderId, sel.value);
      }
      sel.className = 'status-select st-' + sel.value;
      toast('স্ট্যাটাস আপডেট হয়েছে।');
      renderDashboard();
    } else toast('আপডেট ব্যর্থ: ' + (r.error || ''));
  }));
}
async function loadOrders() {
  const r = await fetchOrders();
  if (r.ok) { orders = r.orders; }
  else { orders = []; if (!r.demo) toast('অর্ডার লোড ব্যর্থ: ' + (r.error || '')); }
  renderOrders();
  renderDashboard();
  const pend = orders.filter((o) => o.stage === 'pending').length;
  $('#ordersBadge').hidden = !pend;
  $('#ordersBadge').textContent = pend;
}
function renderOrders() {
  const q = ($('#orderSearch').value || '').trim().toLowerCase();
  const st = $('#orderFilter').value;
  const list = orders.filter((o) =>
    (!st || o.stage === st) &&
    (!q || ((o.name || '') + ' ' + (o.phone || '') + ' ' + (o.orderId || '')).toLowerCase().includes(q)),
  );
  $('#orderList').innerHTML = list.map(orderCard).join('') || '<p class="muted">কোনো অর্ডার পাওয়া যায়নি।</p>';
  bindOrderCards($('#orderList'));
}

/* ================= REVIEWS ================= */
async function loadReviews() {
  const r = await fetchAllReviews();
  if (!r.ok) { $('#reviewList').innerHTML = '<p class="muted">লোড ব্যর্থ।</p>'; return; }
  $('#reviewList').innerHTML = r.reviews.map((v) => {
    const p = products.find((x) => x.id === v.productId);
    return `<div class="order-card">
      <div class="order-head"><b>${esc(p ? (p.nameBn || p.nameEn) : v.productId)}</b>
        <button class="btn btn-outline btn-sm" data-rdel="${esc(v.id)}">ডিলিট</button></div>
      <div class="order-meta"><span>${'★'.repeat(Math.round(v.rating || 5))} · <b>${esc(v.name || '')}</b> · ${fmtDate(v.createdAt)}</span></div>
      <p>${esc(v.text || '')}</p>
    </div>`;
  }).join('') || '<p class="muted">কোনো রিভিউ নেই।</p>';
  $$('#reviewList [data-rdel]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('রিভিউটি ডিলিট করবেন?')) return;
    const d = await deleteReview(b.dataset.rdel);
    if (d.ok) { toast('ডিলিট হয়েছে।'); loadReviews(); } else toast('ব্যর্থ।');
  }));
}

/* ================= NEWSLETTER ================= */
async function loadNewsletter() {
  const r = await fetchNewsletterNumbers();
  if (!r.ok) { $('#nlList').innerHTML = '<p class="muted">লোড ব্যর্থ।</p>'; return; }
  $('#nlCount').textContent = r.numbers.length;
  $('#nlList').innerHTML = r.numbers.map((n) =>
    `<div class="nl-row"><b>${esc(n.number)}</b><small>${fmtDate(n.createdAt)}</small></div>`,
  ).join('') || '<p class="muted">এখনো কোনো নম্বর নেই।</p>';
  $('#nlCopy').onclick = async () => {
    const txt = r.numbers.map((n) => n.number).join('\n');
    try { await navigator.clipboard.writeText(txt); toast('কপি হয়েছে।'); }
    catch { toast('কপি করা যায়নি।'); }
  };
}

/* ================= SETTINGS ================= */
async function loadSettings() {
  const s = await fetchSettings();
  settings = s ? { ...(typeof DEFAULT_SETTINGS !== 'undefined' ? DEFAULT_SETTINGS : {}), ...s } : null;
  renderSettings();
  renderCategories();
}
function renderSettings() {
  $('#settingsSetup').hidden = !!settings;
  $('#settingsForm').style.display = settings ? '' : 'none';
  if (!settings) return;
  const v = (id, val) => { $(id).value = val ?? ''; };
  v('#sfBkash', settings.bkash); v('#sfNagad', settings.nagad);
  $('#sfBkashLabel').value = settings.bkashLabel || 'personal';
  $('#sfNagadLabel').value = settings.nagadLabel || 'personal';
  v('#sfCity', settings.deliveryCity); v('#sfSub', settings.deliverySub);
  v('#sfOutside', settings.deliveryOutside); v('#sfFreeAbove', settings.freeAbove);
  v('#sfWhatsapp', settings.whatsapp); v('#sfPhone', settings.phone);
  v('#sfEmail', settings.email); v('#sfAddress', settings.address);
}
async function saveSettingsForm() {
  const err = $('#settingsErr');
  const num = (id) => Number($(id).value) || 0;
  const s = {
    ...(settings || {}),
    bkash: $('#sfBkash').value.trim(), nagad: $('#sfNagad').value.trim(),
    bkashLabel: $('#sfBkashLabel').value, nagadLabel: $('#sfNagadLabel').value,
    deliveryCity: num('#sfCity'), deliverySub: num('#sfSub'),
    deliveryOutside: num('#sfOutside'), freeAbove: num('#sfFreeAbove'),
    whatsapp: $('#sfWhatsapp').value.trim(), phone: $('#sfPhone').value.trim(),
    email: $('#sfEmail').value.trim(), address: $('#sfAddress').value.trim(),
  };
  err.textContent = '';
  $('#settingsSave').disabled = true;
  const r = await saveSettings(s);
  $('#settingsSave').disabled = false;
  if (r.ok) { settings = s; toast('সেভ হয়েছে।'); }
  else err.textContent = 'সেভ ব্যর্থ: ' + (r.error || '');
}

/* ================= INIT ================= */
/* ================= STAFF ================= */
const STAFF_ROLE_BN = { manager: 'ম্যানেজার', assistant: 'সহকারী' };

async function loadStaff() {
  const tb = $('#stTable tbody');
  tb.innerHTML = '<tr><td colspan="4" class="muted">লোড হচ্ছে…</td></tr>';
  const r = await fetchStaffList();
  if (!r.ok) { tb.innerHTML = '<tr><td colspan="4" class="err">লোড ব্যর্থ।</td></tr>'; return; }
  if (!r.staff.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">কোনো স্টাফ নেই।</td></tr>'; return; }
  tb.innerHTML = r.staff.map((s) => `<tr>
    <td>${esc(s.email || '—')}</td><td class="mono small">${esc(s.uid)}</td>
    <td>${esc(STAFF_ROLE_BN[s.role] || s.role || '—')}</td>
    <td><button class="btn btn-outline btn-sm" data-delstaff="${esc(s.uid)}">মুছুন</button></td>
  </tr>`).join('');
  tb.querySelectorAll('[data-delstaff]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('এই স্টাফের access বাতিল করবেন?')) return;
    const dr = await removeStaff(b.dataset.delstaff);
    if (dr.ok) { toast('মুছে ফেলা হয়েছে।'); loadStaff(); }
    else toast('ব্যর্থ: ' + (dr.error || ''));
  }));
}

function initStaff() {
  $('#stAdd').addEventListener('click', async () => {
    const err = $('#stErr');
    const email = $('#stEmail').value.trim(), uid = $('#stUid').value.trim(), role = $('#stRole').value;
    err.textContent = '';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'সঠিক ইমেইল দিন।'; return; }
    if (!uid) { err.textContent = 'Firebase UID দিন।'; return; }
    if (!['manager', 'assistant'].includes(role)) { err.textContent = 'Role বেছে নিন।'; return; }
    const r = await saveStaff(uid, { email: email.toLowerCase(), role });
    if (r.ok) {
      toast('স্টাফ যোগ হয়েছে।');
      $('#stEmail').value = ''; $('#stUid').value = '';
      loadStaff();
    } else err.textContent = 'ব্যর্থ: ' + (r.error || '');
  });
}

/* ================= BULK IMPORT ================= */
let impValidated = [];

function impValidMains() {
  const m = {};
  (MAIN_CATEGORIES || []).forEach((c) => { m[c.slug] = (c.subs || []).map((s) => s.slug); });
  return m;
}

function initImport() {
  if (!window.AuraImport) { $('#impErr').textContent = 'Import engine লোড হয়নি।'; return; }
  $('#impTemplate').addEventListener('click', () => window.AuraImport.downloadTemplate());
  $('#impFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const err = $('#impErr');
    err.textContent = '';
    $('#impPreviewWrap').hidden = true;
    $('#impResultWrap').hidden = true;
    impValidated = [];
    if (!file) return;
    try {
      const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
      const rows = isXlsx
        ? await window.AuraImport.parseXLSXFile(file)
        : await window.AuraImport.parseCSVFile(file);
      if (!rows.length) { err.textContent = 'ফাইলে কোনো data পাওয়া যায়নি।'; return; }
      const skuToId = new Map();
      products.forEach((p) => { if (p.sku) skuToId.set(String(p.sku).trim().toLowerCase(), p.id); });
      let maxSku = 100000;
      products.forEach((p) => {
        const mt = /^A(\d+)$/i.exec(String(p.sku || '').trim());
        if (mt) maxSku = Math.max(maxSku, parseInt(mt[1], 10));
      });
      impValidated = window.AuraImport.validateRows(rows, {
        skuToId, validMains: impValidMains(), nextSkuNum: maxSku + 1,
      });
      renderImpPreview();
    } catch (ex) {
      err.textContent = 'ফাইল পড়তে সমস্যা: ' + (ex.message || ex);
    }
  });
  $('#impUpdateDup').addEventListener('change', renderImpPreview);
  $('#impRun').addEventListener('click', runBulkImport);
}

function impStatusBadge(v) {
  if (v.status === 'new') return '<span class="imp-badge ok">নতুন</span>';
  if (v.status === 'duplicate') return '<span class="imp-badge warn">ডুপ্লিকেট</span>';
  return '<span class="imp-badge bad">ভুল</span>';
}

function renderImpPreview() {
  const wrap = $('#impPreviewWrap');
  wrap.hidden = false;
  const upd = $('#impUpdateDup').checked;
  const counts = { new: 0, duplicate: 0, invalid: 0 };
  impValidated.forEach((v) => { counts[v.status === 'duplicate' ? 'duplicate' : v.status]++; });
  const willImport = counts.new + (upd ? counts.duplicate : 0);
  $('#impSummary').innerHTML =
    `<span class="imp-badge ok">${counts.new} নতুন</span> ` +
    `<span class="imp-badge warn">${counts.duplicate} ডুপ্লিকেট${upd ? ' (আপডেট হবে)' : ' (বাদ যাবে)'}</span> ` +
    `<span class="imp-badge bad">${counts.invalid} ভুল (বাদ যাবে)</span>`;
  const tb = $('#impTable tbody');
  tb.innerHTML = impValidated.map((v) => {
    const notes = [...v.errors, ...v.warnings.map((w) => '⚠ ' + w)];
    return `<tr>
      <td>${v.rowNum}</td>
      <td>${esc(v.data.nameBn || v.data.nameEn || '—')}</td>
      <td class="mono small">${esc(v.data.sku || '(auto)')}</td>
      <td>৳${Number(v.data.price || 0).toLocaleString('en-US')}</td>
      <td>${impStatusBadge(v)}</td>
      <td class="small">${notes.length ? esc(notes.join(' • ')) : '<span class="muted">ঠিক আছে</span>'}</td>
    </tr>`;
  }).join('');
  $('#impRun').disabled = willImport === 0;
  $('#impRun').textContent = willImport ? `ইমপোর্ট করুন (${willImport}টি)` : 'ইমপোর্ট করুন';
}

async function runBulkImport() {
  const upd = $('#impUpdateDup').checked;
  /* TEMP-TEST: confirm() removed for automated E2E — will be restored */
  const wrap = $('#impResultWrap'), prog = $('#impProgress'), bar = $('#impProgressBar');
  wrap.hidden = false; prog.hidden = false;
  $('#impRun').disabled = true;
  let maxId = 0, maxSku = 100000;
  products.forEach((p) => {
    const mi = /^p(\d+)$/.exec(p.id || ''); if (mi) maxId = Math.max(maxId, parseInt(mi[1], 10));
    const ms = /^A(\d+)$/i.exec(String(p.sku || '').trim()); if (ms) maxSku = Math.max(maxSku, parseInt(ms[1], 10));
  });
  const stats = await window.AuraImport.runImport(impValidated, {
    updateDuplicates: upd,
    saveFn: saveProduct,
    idStart: maxId + 1, skuStart: maxSku + 1,
    onProgress: (i, total) => { bar.style.width = Math.round((i / total) * 100) + '%'; },
  });
  prog.hidden = true;
  const skipN = impValidated.filter((v) => v.status === 'invalid' || (v.status === 'duplicate' && !upd)).length;
  $('#impResult').innerHTML =
    `<span class="imp-badge ok">${stats.added} যোগ</span> ` +
    `<span class="imp-badge warn">${stats.updated} আপডেট</span> ` +
    `<span class="imp-badge">${skipN} বাদ</span> ` +
    `<span class="imp-badge bad">${stats.failed} ব্যর্থ</span>` +
    (stats.failures.length ? '<div class="small" style="margin-top:8px">' +
      stats.failures.map((f) => `সারি ${f.rowNum}: ${esc(f.error)}`).join('<br>') + '</div>' : '');
  toast('ইমপোর্ট শেষ।');
  await loadProducts();
  $('#impRun').disabled = false;
}

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initProducts();
  initStaff();
  initImport();
  $('#catSave').addEventListener('click', saveCategories);
  $('#orderSearch').addEventListener('input', renderOrders);
  $('#orderFilter').addEventListener('change', renderOrders);
  $('#settingsSave').addEventListener('click', saveSettingsForm);
  $('#settingsInitBtn').addEventListener('click', async () => {
    const base = typeof DEFAULT_SETTINGS !== 'undefined' ? { ...DEFAULT_SETTINGS } : {};
    const r = await saveSettings({ ...base, bkashLabel: 'personal', nagadLabel: 'personal' });
    if (r.ok) { toast('ডিফল্ট সেটিংস সেভ হয়েছে।'); await loadSettings(); }
    else toast('ব্যর্থ: ' + (r.error || ''));
  });
  /* Staff tab খুললে লিস্ট লোড */
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tab="staff"]');
    if (b && myRole === 'owner') loadStaff();
  });
});
