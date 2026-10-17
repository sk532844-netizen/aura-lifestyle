/* AURA LIFESTYLE — Admin Panel logic.
   Firebase email/password login (no embedded password).
   Role-based tabs: owner (all), manager (no settings/staff), assistant (orders only).
   Sections: Dashboard, Products, Categories, Orders, Reviews, Newsletter, Import, Staff, Settings. */
import {
  isConfigured, onAuthState, signIn, signOut, resetPassword,
  fetchProducts, saveProduct, deleteProduct,
  fetchSettings, saveSettings,
  fetchOrders, updateOrderStatus, updateOrderStatusByOrderId, setOrderPaid, setOrderPaidByOrderId,
  requestOrderCancel, confirmOrderCancel,
  fetchAllReviews, deleteReview, submitReview, fetchHomepageReviews,
  fetchAllCombos, saveCombo, deleteCombo,
  fetchNewsletterNumbers,
  fetchMyRole, fetchStaffList, saveStaff, removeStaff,
  createStaffAccount, uploadProductImage, deleteProductImage,
  sizeQty, totalStock, tabsForRole, orderFullForRole, OWNER_UID,
} from './firebase.js?v=20261016e';

/* data.js (classic script) globals: MAIN_CATEGORIES, SEED_PRODUCTS, DEFAULT_SETTINGS */
/* admin-import.js (classic script) global: window.AuraImport */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* tags: নতুন `tags` array, পুরনো `tag` string fallback */
function pTags(p) { if (p && Array.isArray(p.tags) && p.tags.length) return p.tags; return p && p.tag ? [p.tag] : []; }
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

/* Tabs from staff doc (owner = all). Suspended → none. */
const ALL_TABS = ['dashboard', 'products', 'categories', 'orders', 'reviews', 'newsletter', 'import', 'staff', 'settings'];
const ROLE_BN = { owner: 'মালিক', manager: 'ম্যানেজার', assistant: 'সহকারী', custom: 'কাস্টম', none: '—' };
let myTabs = [];

function applyRole(role, tabs) {
  myRole = role;
  myTabs = role === 'owner' ? [...ALL_TABS] : (Array.isArray(tabs) ? tabs : []);
  $$('#tabs button[data-tab]').forEach((b) => {
    b.hidden = !myTabs.includes(b.dataset.tab);
  });
  $$('.tab-page').forEach((p) => {
    const t = p.id.replace('tab-', '');
    if (!myTabs.includes(t)) p.hidden = true;
  });
  /* first visible tab becomes active */
  const first = myTabs[0];
  $$('#tabs button[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === first));
  $$('.tab-page').forEach((p) => { p.hidden = p.id !== 'tab-' + first; });
  const badge = $('#roleBadge');
  if (badge) badge.textContent = ROLE_BN[role] || role;
}

function can(perm) {
  if (myRole === 'owner') return true;
  return myTabs.includes(perm);
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
        $('#loginErr').textContent = rr.suspended
          ? 'এই অ্যাকাউন্টটি suspend করা হয়েছে। মালিকের সাথে যোগাযোগ করুন।'
          : 'এই অ্যাকাউন্টের admin/staff access নেই। মালিকের সাথে যোগাযোগ করুন।';
        await signOut();
        return;
      }
      $('#loginScreen').hidden = true;
      $('#panel').hidden = false;
      $('#adminEmail').textContent = (user.email || '') + ' (' + (ROLE_BN[role] || role) + ')';
      applyRole(role, rr.tabs);
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
    if (t === 'combos') loadCombos();
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
    const sizes = p.sizes || [];
    const hasSizeStock = !!(p.sizeStock && typeof p.sizeStock === 'object' && Object.keys(p.sizeStock).length);
    const stockTxt = sizes.length
      ? (hasSizeStock ? sizes.map((s) => `${esc(s)}:${sizeQty(p, s)}`).join(' · ') : `মোট ${totalStock(p)}`)
      : String(totalStock(p));
    return `<tr>
      <td><img class="thumb" src="${esc(img)}" alt="" onerror="this.style.visibility='hidden'"></td>
      <td><b>${esc(p.nameBn || p.nameEn)}</b><br><small class="muted">${esc(p.sku || '')} · ${esc(p.id)}</small></td>
      <td>${fmt(p.price)}${p.oldPrice > p.price ? `<br><small class="muted"><s>${fmt(p.oldPrice)}</s></small>` : ''}</td>
      <td><small>${stockTxt}</small></td>
      <td><button class="pill ${vis ? 'ok' : 'no'} vis-toggle" data-vis="${esc(p.id)}" title="চালু/বন্ধ করুন">${vis ? 'চালু' : 'বন্ধ'}</button></td>
      <td><div style="display:flex; gap:4px">
        <button class="pill ${pTags(p).includes('flash-sale') ? 'ok' : ''}" data-tag="flash-sale:${esc(p.id)}" title="Flash Sale-তে রাখুন/সরান">⚡</button>
        <button class="pill ${pTags(p).includes('best-seller') ? 'ok' : ''}" data-tag="best-seller:${esc(p.id)}" title="Best Sellers-এ রাখুন/সরান">★</button>
        <button class="pill ${pTags(p).includes('new') ? 'ok' : ''}" data-tag="new:${esc(p.id)}" title="New Arrivals-এ রাখুন/সরান">🆕</button>
      </div></td>
      <td><div class="row-actions">
        <button class="btn btn-outline btn-sm" data-edit="${esc(p.id)}">এডিট</button>
        <button class="btn btn-outline btn-sm" data-del="${esc(p.id)}">ডিলিট</button>
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center; color:var(--muted)">কোনো প্রোডাক্ট নেই।</td></tr>';
  $$('#prodTable [data-edit]').forEach((b) => b.addEventListener('click', () => openProdForm(b.dataset.edit)));
  $$('#prodTable [data-del]').forEach((b) => b.addEventListener('click', () => delProduct(b.dataset.del)));
  $$('#prodTable [data-vis]').forEach((b) => b.addEventListener('click', () => toggleVisible(b.dataset.vis)));
  $$('#prodTable [data-tag]').forEach((b) => b.addEventListener('click', () => toggleTag(b.dataset.tag)));
}

async function toggleTag(spec) {
  const [tag, id] = spec.split(':');
  const p = products.find((x) => x.id === id);
  if (!p) return;
  let tags = pTags(p);
  const has = tags.includes(tag);
  tags = has ? tags.filter((x) => x !== tag) : [...tags, tag];
  const r = await saveProduct({ ...p, tags, tag: tags[0] || '' });
  if (r.ok) { p.tags = tags; p.tag = tags[0] || ''; renderProducts(); toast(has ? 'ট্যাগ সরানো হয়েছে।' : 'ট্যাগ যোগ হয়েছে।'); }
  else toast('ব্যর্থ: ' + (r.error || ''));
}

async function toggleVisible(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  const nv = !(p.visible !== false);
  const r = await saveProduct({ ...p, visible: nv });
  if (r.ok) { p.visible = nv; renderProducts(); toast(nv ? 'চালু হয়েছে।' : 'বন্ধ হয়েছে।'); }
  else toast('ব্যর্থ: ' + (r.error || ''));
}

async function delProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!confirm(`"${p ? (p.nameBn || p.nameEn) : id}" ডিলিট করবেন?`)) return;
  /* Storage-এর ছবিগুলোও মুছে জায়গা ফাঁকা করি (best-effort) */
  const imgs = p ? ((p.images || []).concat(p.img ? [p.img] : [])) : [];
  const r = await deleteProduct(id);
  if (r.ok) {
    toast('ডিলিট হয়েছে।');
    imgs.forEach((u) => deleteProductImage(u));
    await loadProducts();
  } else toast('ডিলিট ব্যর্থ: ' + (r.error || ''));
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
  $('#pfPct').value = p ? pctOf(p.price || 0, p.oldPrice || 0) : '';
  $$('#pfTags input').forEach((cb) => { cb.checked = p ? pTags(p).includes(cb.value) : false; });
  renderSizeRows(p);
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

/* ---------- size-wise stock editor ---------- */
function renderSizeRows(p) {
  const box = $('#sizeRows');
  box.innerHTML = '';
  const sizes = p && p.sizes && p.sizes.length ? p.sizes : (p ? [] : ['M', 'L', 'XL', 'XXL']);
  const hasSizeStock = !!(p && p.sizeStock && typeof p.sizeStock === 'object' && Object.keys(p.sizeStock).length);
  sizes.forEach((s) => addSizeRow(s, hasSizeStock && p.sizeStock[s] !== undefined ? p.sizeStock[s] : ''));
  /* পুরনো প্রোডাক্টে (sizeStock নেই) — admin-কে প্রতি সাইজে ভাগ করে দিতে হবে */
  let hint = $('#sizeLegacyHint');
  if (!hasSizeStock && p && sizes.length) {
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'sizeLegacyHint';
      hint.className = 'muted small';
      hint.style.cssText = 'margin-top:6px;color:#b45309';
      box.after(hint);
    }
    hint.textContent = `⚠️ পুরনো প্রোডাক্ট — আগে মোট স্টক ছিল ${totalStock(p)} পিস। প্রতি সাইজে কত পিস আছে লিখুন।`;
  } else if (hint) hint.remove();
  /* সাইজ না থাকলে সাধারণ স্টক */
  $('#pfStockGen').value = p ? (sizes.length ? '' : (p.stock ?? '')) : '';
  syncTotalStock();
}
/* % ছাড় ⇄ দাম: একদিকে বসালে অন্যদিকে auto-হিসাব */
function bindPctCalc(priceSel, oldSel, pctSel) {
  const priceEl = $(priceSel), oldEl = $(oldSel), pctEl = $(pctSel);
  if (!priceEl || !oldEl || !pctEl) return;
  const fromPct = () => {
    const old = Number(oldEl.value) || 0, pct = Number(pctEl.value) || 0;
    if (old > 0 && pct > 0 && pct < 100) priceEl.value = Math.round(old * (1 - pct / 100));
  };
  const fromPrice = () => {
    const old = Number(oldEl.value) || 0, pr = Number(priceEl.value) || 0;
    pctEl.value = (old > pr && pr >= 0) ? Math.round((old - pr) / old * 100) : '';
  };
  oldEl.addEventListener('input', fromPct);
  pctEl.addEventListener('input', fromPct);
  priceEl.addEventListener('input', fromPrice);
}
function pctOf(price, oldPrice) {
  return (oldPrice > price && price >= 0) ? Math.round((oldPrice - price) / oldPrice * 100) : '';
}
function addSizeRow(size, qty) {  const div = document.createElement('div');
  div.className = 'size-row-edit';
  div.innerHTML = `<input class="sz-name" placeholder="সাইজ (M)" value="${esc(size || '')}">
    <input class="sz-qty" type="number" min="0" placeholder="পিস" value="${qty === '' ? '' : (Number(qty) || 0)}">
    <button type="button" class="btn btn-outline btn-sm">✕</button>`;
  div.querySelector('.sz-qty').addEventListener('input', syncTotalStock);
  div.querySelector('button').addEventListener('click', () => { div.remove(); syncTotalStock(); });
  $('#sizeRows').appendChild(div);
}
function collectSizes() {
  const sizes = [], sizeStock = {};
  $$('#sizeRows .size-row-edit').forEach((r) => {
    const name = r.querySelector('.sz-name').value.trim();
    if (!name) return;
    const q = Number(r.querySelector('.sz-qty').value);
    sizes.push(name);
    sizeStock[name] = q >= 0 ? q : 0;
  });
  return { sizes, sizeStock };
}
function syncTotalStock() {
  const { sizeStock } = collectSizes();
  const total = Object.values(sizeStock).reduce((s, q) => s + q, 0);
  const el = $('#pfStock');
  if (el) el.value = total;
  const hint = $('#stockTotalHint');
  if (hint) hint.textContent = 'মোট: ' + total + ' পিস';
}

/* ---------- gallery upload: compress → Storage → URL row ---------- */
function compressImage(file, maxDim = 1200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxDim || h > maxDim) {
        const r = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * r); h = Math.round(h * r);
      }
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('compress-failed')), 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load-failed')); };
    img.src = url;
  });
}

async function handleImgFiles(e) {
  const files = [...(e.target.files || [])];
  e.target.value = '';
  if (!files.length) return;
  const apiKey = settings && settings.imgbbKey ? settings.imgbbKey : '';
  if (!apiKey) { toast('আগে Settings → ImgBB API Key দিন।'); return; }
  const prev = $('#imgUploadPrev');
  const pid = editingId || 'new_' + Date.now();
  for (const file of files) {
    if (!file.type.startsWith('image/')) { toast('ছবি ফাইল দিন।'); continue; }
    const chip = document.createElement('div');
    chip.className = 'up-chip';
    chip.textContent = '⏳ ' + file.name.slice(0, 18);
    prev.appendChild(chip);
    try {
      const blob = await compressImage(file);
      const up = await uploadProductImage(new File([blob], 'img.jpg', { type: 'image/jpeg' }), pid, apiKey);
      if (up.ok) {
        chip.remove();
        addImgRow(up.url);
        toast('ছবি আপলোড হয়েছে।');
      } else {
        chip.textContent = '❌ ' + (up.error || 'ব্যর্থ');
        setTimeout(() => chip.remove(), 4000);
      }
    } catch {
      chip.textContent = '❌ ব্যর্থ';
      setTimeout(() => chip.remove(), 4000);
    }
  }
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
  const err = $('#prodErr');
  if (!nameBn || !nameEn) { err.textContent = 'বাংলা ও English নাম দিন।'; return; }
  if (!(price >= 0)) { err.textContent = 'সঠিক দাম দিন।'; return; }
  const main = $('#pfMain').value, sub = $('#pfSub').value;
  if (!main || !sub) { err.textContent = 'ক্যাটাগরি নির্বাচন করুন।'; return; }
  const images = $$('#imgRows input').map((i) => i.value.trim()).filter(Boolean);
  if (!images.length) { err.textContent = 'কমপক্ষে ১টি ছবি দিন (গ্যালারি বা URL)।'; return; }
  const oldPrice = Number($('#pfOldPrice').value) || 0;
  const { sizes, sizeStock } = collectSizes();
  let stock;
  if (sizes.length) {
    stock = Object.values(sizeStock).reduce((s, q) => s + q, 0);
  } else {
    /* সাইজ নেই — সাধারণ স্টক */
    stock = Number($('#pfStockGen').value);
    if (!(stock >= 0)) { err.textContent = 'সঠিক স্টক দিন।'; return; }
  }
  const formTags = $$('#pfTags input:checked').map((cb) => cb.value);
  const p = {
    id: editingId || nextId(),
    sku: $('#pfSku').value.trim(),
    nameBn, nameEn, main, sub,
    price, oldPrice: oldPrice > price ? oldPrice : 0,
    img: images[0], images,
    descBn: $('#pfDescBn').value.trim(), descEn: $('#pfDescEn').value.trim(),
    sizes, sizeStock,
    stock, tags: formTags, tag: formTags[0] || '',
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
  $('#addSizeRow').addEventListener('click', () => addSizeRow('', ''));
  /* % ছাড় ⇄ দাম auto-হিসাব (দুটো দিকেই sync; programmatic set 'input' ফায়ার করে না) */
  bindPctCalc('#pfPrice', '#pfOldPrice', '#pfPct');
  bindPctCalc('#cbPrice', '#cbOldPrice', '#cbPct');
  $('#imgFile').addEventListener('change', handleImgFiles);
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
  const catImgs = (settings && settings.catImgs) || {};
  $('#catList').innerHTML = (typeof MAIN_CATEGORIES !== 'undefined' ? MAIN_CATEGORIES : []).map((m) => {
    const on = !hidden.includes(m.slug);
    const img = catImgs[m.slug] || m.img || '';
    return `<div class="cat-row">
      <img src="${esc(img)}" style="width:56px; height:40px; object-fit:cover; border-radius:6px" onerror="this.style.visibility='hidden'">
      <div style="flex:1"><b>${esc(m.bn)}</b><small>${m.subs.length}টি সাব-ক্যাটাগরি</small></div>
      <button type="button" class="btn btn-outline btn-sm" data-catimg="${m.slug}">ছবি বদলান</button>
      <label class="switch"><input type="checkbox" data-cat="${m.slug}" ${on ? 'checked' : ''}><span class="slider"></span></label></div>`;
  }).join('');
  $$('#catList [data-catimg]').forEach((b) => b.onclick = () => {
    $('#catImgFile').dataset.slug = b.dataset.catimg;
    $('#catImgFile').click();
  });
}
let catImgUploading = false;
async function bindCatImgUpload() {
  $('#catImgFile').onchange = async (e) => {
    const f = e.target.files[0];
    const slug = e.target.dataset.slug;
    e.target.value = '';
    if (!f || !slug || catImgUploading) return;
    const key = (settings && settings.imgbbKey) || '';
    if (!key) { toast('আগে Settings থেকে ImgBB API Key সেভ করুন।'); return; }
    catImgUploading = true;
    toast('আপলোড হচ্ছে...');
    try {
      const url = await uploadBannerImage(f, key);
      if (url) {
        settings = { ...settings, catImgs: { ...((settings && settings.catImgs) || {}), [slug]: url } };
        renderCategories();
        toast('ছবি বদলেছে — নিচের "সেভ করুন" চাপুন।');
      } else toast('আপলোড ব্যর্থ।');
    } catch { toast('আপলোড ব্যর্থ।'); }
    catImgUploading = false;
  };
}
async function saveCategories() {
  const hidden = $$('#catList input[data-cat]').filter((i) => !i.checked).map((i) => i.dataset.cat);
  const r = await saveSettings({ ...(settings || {}), hiddenCategories: hidden, catImgs: (settings && settings.catImgs) || {} });
  if (r.ok) { settings = { ...(settings || {}), hiddenCategories: hidden, catImgs: (settings && settings.catImgs) || {} }; toast('সেভ হয়েছে।'); }
  else toast('সেভ ব্যর্থ: ' + (r.error || ''));
}

/* ================= ORDERS ================= */
function orderCard(o) {
  const items = (o.items || []).map((i) => `${esc(i.name || i.id)} × ${i.qty}${i.size ? ' (' + esc(i.size) + ')' : ''} — ${fmt(i.price * i.qty)}`).join('<br>');
  const pay = PAY_BN[(o.pay || '').toLowerCase()] || esc(o.pay || '');
  return `<div class="order-card compact" data-oid="${esc(o.id)}">
    <div class="order-head compact-head">
      <button class="expand-btn" data-expand="${esc(o.id)}" aria-label="বিস্তারিত">▸</button>
      <b>${esc(o.orderId || o.id)}</b>
      ${o.cancelRequested ? '<span class="cancel-req-badge">🚫 ক্যান্সেল রিকোয়েস্ট</span>' : ''}
      <span class="oc-cust">${esc(o.name || '')}</span>
      <span class="oc-total">${fmt(o.total)}</span>
      <select class="status-select st-${esc(o.stage || 'pending')}" data-stage="${esc(o.id)}">
        ${Object.entries(STAGE_BN).map(([k, v]) => `<option value="${k}" ${o.stage === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
    </div>
    <div class="order-details" hidden>
      <div class="order-meta">
        <span>📞 ${esc(o.phone || '')}</span>
        <span>${esc(o.district || '')} — ${esc(o.address || '')}</span>
        <span>পেমেন্ট: ${pay}${o.trxId ? ' · TrxID: <b>' + esc(o.trxId) + '</b>' : ''}${o.senderNumber ? ' · নম্বর: <b>' + esc(o.senderNumber) + '</b>' : ''}</span>
        <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-weight:600"><input type="checkbox" data-paid="${esc(o.id)}" data-orderid="${esc(o.orderId || '')}" ${o.paid ? 'checked' : ''} style="width:18px; height:18px; accent-color:#16a34a"> পেমেন্ট ভেরিফাইড</label>
        <span>${fmtDate(o.createdAt)}</span>
      </div>
      <div class="order-items">${items}</div>
      <div class="order-foot"><span class="muted">ডেলিভারি ${fmt(o.delivery)}</span></div>
    </div>
  </div>`;
}
function bindOrderCards(root) {
  /* expand/collapse */
  root.querySelectorAll('[data-expand]').forEach((b) => b.addEventListener('click', () => {
    const card = b.closest('.order-card');
    const det = card.querySelector('.order-details');
    const open = det.hidden;
    det.hidden = !open;
    b.textContent = open ? '▾' : '▸';
    b.setAttribute('aria-expanded', open ? 'true' : 'false');
  }));
  $$('[data-stage]', root).forEach((sel) => sel.addEventListener('change', async () => {
    const newStage = sel.value;
    const docId = sel.dataset.stage;
    /* বাতিল → stock auto-restore সহ cancel flow */
    if (newStage === 'cancelled') {
      if (!confirm('এই অর্ডার বাতিল করবেন? স্টক auto-ফেরত আসবে।')) { sel.value = (orders.find((x) => x.id === docId) || {}).stage || 'pending'; return; }
      sel.disabled = true;
      const r = await confirmOrderCancel(docId);
      sel.disabled = false;
      if (r.ok) {
        const o = orders.find((x) => x.id === docId);
        if (o) { o.stage = 'cancelled'; o.cancelRequested = false; }
        sel.className = 'status-select st-cancelled';
        toast(r.already ? 'অর্ডার আগেই বাতিল ছিল।' : 'অর্ডার বাতিল হয়েছে, স্টক ফেরত এসেছে।');
        renderOrders(); renderDashboard();
      } else { toast('বাতিল ব্যর্থ: ' + (r.error || '')); sel.value = (orders.find((x) => x.id === docId) || {}).stage || 'pending'; }
      return;
    }
    const r = await updateOrderStatus(docId, newStage);
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
  $$('[data-paid]', root).forEach((cb) => cb.addEventListener('change', async () => {
    const r = await setOrderPaid(cb.dataset.paid, cb.checked);
    if (r.ok) {
      const o = orders.find((x) => x.id === cb.dataset.paid);
      if (o) {
        o.paid = cb.checked;
        /* public mirror আপডেট — tracking-এ payment status দেখাবে */
        if (o.orderId || cb.dataset.orderid) setOrderPaidByOrderId(o.orderId || cb.dataset.orderid, cb.checked);
      }
      toast(cb.checked ? 'পেমেন্ট ভেরিফাইড ✓' : 'পেমেন্ট পেন্ডিং করা হয়েছে।');
    } else { cb.checked = !cb.checked; toast('আপডেট ব্যর্থ: ' + (r.error || '')); }
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
      <div class="order-head"><b>${esc(v.homepage ? '🏠 ' : '')}${esc(p ? (p.nameBn || p.nameEn) : (v.name || 'জেনারেল'))}</b>
        <button class="btn btn-outline btn-sm" data-rdel="${esc(v.id)}">ডিলিট</button></div>
      <div class="order-meta"><span>${'★'.repeat(Math.round(v.rating || 5))} · <b>${esc(v.name || '')}</b>${v.loc ? ' · ' + esc(v.loc) : ''} · ${fmtDate(v.createdAt)}</span></div>
      <p>${esc(v.text || '')}</p>
    </div>`;
  }).join('') || '<p class="muted">কোনো রিভিউ নেই।</p>';
  $$('#reviewList [data-rdel]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('রিভিউটি ডিলিট করবেন?')) return;
    const d = await deleteReview(b.dataset.rdel);
    if (d.ok) { toast('ডিলিট হয়েছে।'); loadReviews(); } else toast('ব্যর্থ।');
  }));
  $('#rvAdd').onclick = async () => {
    const name = $('#rvName').value.trim(), text = $('#rvText').value.trim();
    const loc = $('#rvLoc').value.trim(), rating = +$('#rvRating').value || 5;
    const homepage = $('#rvHome').checked;
    if (!name || !text) { toast('নাম ও রিভিউ লিখুন।'); return; }
    const ok = await submitReview({ name, text, loc, rating, homepage, verified: true });
    if (ok) { toast('রিভিউ যোগ হয়েছে।'); $('#rvName').value = ''; $('#rvText').value = ''; $('#rvLoc').value = ''; loadReviews(); }
    else toast('ব্যর্থ।');
  };
}

/* ================= COMBOS ================= */
let combos = [], editingComboId = null, comboImgUrl = '', comboItems = {};
function comboProdRow(p) {
  const sel = comboItems[p.id];
  return `<div class="cb-row" style="display:flex; gap:8px; align-items:center; padding:6px 4px; border-bottom:1px solid #f1f5f9">
    <input type="checkbox" data-cbp="${esc(p.id)}" ${sel ? 'checked' : ''} style="width:18px; height:18px">
    <span style="flex:1; font-size:13px">${esc(p.nameBn || p.nameEn)} <small class="muted">${fmt(p.price)}</small></span>
    <input type="number" data-cbq="${esc(p.id)}" value="${sel ? sel.qty : 1}" min="1" max="99" style="width:56px; padding:4px; border:1px solid var(--line); border-radius:6px" ${sel ? '' : 'disabled'}>
  </div>`;
}
function renderComboProdList() {
  const q = ($('#cbProdSearch').value || '').trim().toLowerCase();
  const list = products.filter((p) => !q || ((p.nameBn || '') + ' ' + (p.nameEn || '') + ' ' + (p.sku || '')).toLowerCase().includes(q));
  $('#cbProdList').innerHTML = list.slice(0, 60).map(comboProdRow).join('') || '<p class="muted">কোনো প্রোডাক্ট নেই।</p>';
  $$('#cbProdList [data-cbp]').forEach((cb) => cb.onchange = () => {
    const id = cb.dataset.cbp;
    if (cb.checked) comboItems[id] = { id, qty: 1 };
    else delete comboItems[id];
    renderComboProdList();
  });
  $$('#cbProdList [data-cbq]').forEach((inp) => inp.onchange = () => {
    const id = inp.dataset.cbq;
    if (comboItems[id]) comboItems[id].qty = Math.max(1, +inp.value || 1);
  });
}
function resetComboForm() {
  editingComboId = null; comboImgUrl = ''; comboItems = {};
  $('#comboFormTitle').textContent = 'নতুন কম্বো অফার';
  $('#cbNameBn').value = ''; $('#cbNameEn').value = ''; $('#cbPrice').value = ''; $('#cbOldPrice').value = ''; $('#cbPct').value = '';
  $('#cbVisible').checked = true; $('#cbFreeDel').checked = false; $('#cbImgPrev').style.display = 'none';
  $('#cbCancel').hidden = true;
  renderComboProdList();
}
async function loadCombos() {
  const r = await fetchAllCombos();
  combos = r.ok ? r.combos : [];
  $('#comboList').innerHTML = combos.map((c) => {
    const names = (c.items || []).map((i) => { const p = products.find((x) => x.id === i.id); return (p ? (p.nameBn || p.nameEn) : i.id) + (i.qty > 1 ? ' ×' + i.qty : ''); }).join(', ');
    return `<div class="order-card"><div class="order-head">
      <img src="${esc(c.img || '')}" style="width:52px; height:36px; object-fit:cover; border-radius:6px" onerror="this.style.visibility='hidden'">
      <b style="flex:1">${esc(c.nameBn || c.nameEn)}</b>${c.freeDel ? '<span title="ডেলিভারি ফ্রি">🚚</span>' : ''}<span>${fmt(c.price)}</span>
      <button class="pill ${c.visible !== false ? 'ok' : 'no'}" data-cbvis="${esc(c.id)}">${c.visible !== false ? 'চালু' : 'বন্ধ'}</button>
      <button class="btn btn-outline btn-sm" data-cbedit="${esc(c.id)}">এডিট</button>
      <button class="btn btn-outline btn-sm" data-cbdel="${esc(c.id)}">ডিলিট</button></div>
      <div class="order-meta"><small>${esc(names)}</small></div></div>`;
  }).join('') || '<p class="muted">কোনো কম্বো নেই।</p>';
  $$('#comboList [data-cbdel]').forEach((b) => b.onclick = async () => {
    if (!confirm('কম্বোটি ডিলিট করবেন?')) return;
    const d = await deleteCombo(b.dataset.cbdel);
    if (d.ok) { toast('ডিলিট হয়েছে।'); loadCombos(); } else toast('ব্যর্থ।');
  });
  $$('#comboList [data-cbvis]').forEach((b) => b.onclick = async () => {
    const c = combos.find((x) => x.id === b.dataset.cbvis);
    if (!c) return;
    const r = await saveCombo({ ...c, visible: !(c.visible !== false) });
    if (r.ok) { loadCombos(); } else toast('ব্যর্থ।');
  });
  $$('#comboList [data-cbedit]').forEach((b) => b.onclick = () => {
    const c = combos.find((x) => x.id === b.dataset.cbedit);
    if (!c) return;
    editingComboId = c.id; comboImgUrl = c.img || '';
    comboItems = {};
    (c.items || []).forEach((i) => { comboItems[i.id] = { id: i.id, qty: i.qty || 1 }; });
    $('#comboFormTitle').textContent = 'কম্বো এডিট করুন';
    $('#cbNameBn').value = c.nameBn || ''; $('#cbNameEn').value = c.nameEn || '';
    $('#cbPrice').value = c.price || ''; $('#cbOldPrice').value = c.oldPrice || '';
    $('#cbPct').value = pctOf(c.price || 0, c.oldPrice || 0);
    $('#cbVisible').checked = c.visible !== false; $('#cbFreeDel').checked = !!c.freeDel;
    if (comboImgUrl) { $('#cbImgPrev').src = comboImgUrl; $('#cbImgPrev').style.display = ''; }
    $('#cbCancel').hidden = false;
    renderComboProdList();
    window.scrollTo(0, 0);
  });
}
function initCombos() {
  $('#cbProdSearch').addEventListener('input', renderComboProdList);
  $('#cbCancel').onclick = resetComboForm;
  $('#cbImgBtn').onclick = () => $('#cbImgFile').click();
  $('#cbImgFile').onchange = async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const key = (settings && settings.imgbbKey) || '';
    if (!key) { toast('আগে Settings থেকে ImgBB API Key সেভ করুন।'); return; }
    toast('আপলোড হচ্ছে...');
    try {
      const url = await uploadBannerImage(f, key);
      if (url) { comboImgUrl = url; $('#cbImgPrev').src = url; $('#cbImgPrev').style.display = ''; toast('আপলোড হয়েছে।'); }
      else toast('আপলোড ব্যর্থ।');
    } catch { toast('আপলোড ব্যর্থ।'); }
  };
  $('#cbSave').onclick = async () => {
    const nameBn = $('#cbNameBn').value.trim(), nameEn = $('#cbNameEn').value.trim();
    const price = +$('#cbPrice').value || 0;
    const items = Object.values(comboItems);
    if (!nameBn || !nameEn) { toast('নাম দিন।'); return; }
    if (!price) { toast('কম্বো দাম দিন।'); return; }
    if (!items.length) { toast('অন্তত ১টি প্রোডাক্ট বাছুন।'); return; }
    const data = {
      nameBn, nameEn, price, oldPrice: +$('#cbOldPrice').value || 0,
      img: comboImgUrl, items, visible: $('#cbVisible').checked, freeDel: $('#cbFreeDel').checked,
    };
    if (editingComboId) data.id = editingComboId;
    const r = await saveCombo(data);
    if (r.ok) { toast('সেভ হয়েছে।'); resetComboForm(); loadCombos(); }
    else toast('ব্যর্থ: ' + (r.error || ''));
  };
  resetComboForm();
}

/* ================= NEWSLETTER ================= */
async function loadNewsletter() {
  const r = await fetchNewsletterNumbers();
  if (!r.ok) { $('#nlList').innerHTML = '<p class="muted">লোড ব্যর্থ।</p>'; return; }
  $('#nlCount').textContent = r.numbers.length;
  $('#nlList').innerHTML = r.numbers.map((n, i) =>
    `<div class="nl-row"><input type="checkbox" data-nl="${i}" style="width:18px; height:18px; accent-color:#c9a227"><b>${esc(n.number)}</b><small>${fmtDate(n.createdAt)}</small><button class="btn btn-outline btn-sm" data-nlcopy="${i}">কপি</button></div>`,
  ).join('') || '<p class="muted">এখনো কেউ সাবস্ক্রাইব করেনি।</p>';
  const copyTxt = async (txt) => {
    try { await navigator.clipboard.writeText(txt); toast('কপি হয়েছে।'); }
    catch { toast('কপি করা যায়নি।'); }
  };
  $('#nlCopy').onclick = () => copyTxt(r.numbers.map((n) => n.number).join('\n'));
  $('#nlCopySel').onclick = () => {
    const sel = [...document.querySelectorAll('#nlList [data-nl]:checked')].map((c) => r.numbers[+c.dataset.nl].number);
    if (!sel.length) { toast('কিছু সিলেক্ট করুন।'); return; }
    copyTxt(sel.join('\n'));
  };
  $$('#nlList [data-nlcopy]').forEach((b) => b.onclick = () => copyTxt(r.numbers[+b.dataset.nlcopy].number));
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
  v('#sfMessenger', settings.messenger);
  const pb = settings.promoBar || {};
  v('#sfPromoText', pb.text); $('#sfPromoOn').checked = !!pb.on;
  v('#sfEmail', settings.email); v('#sfAddress', settings.address);
  const soc = settings.social || {};
  v('#sfFb', soc.facebook); v('#sfIg', soc.instagram); v('#sfYt', soc.youtube);
  v('#sfImgbb', settings.imgbbKey);
  renderBanners();
}

/* ---------- hero banner manager ---------- */
function renderBanners() {
  const list = (settings && settings.heroBanners) || [];
  $('#bannerList').innerHTML = list.map((b, i) => `
    <div class="banner-row" style="display:flex; gap:10px; align-items:center; border:1px solid var(--line); border-radius:10px; padding:8px">
      <img src="${esc(b.img)}" style="width:90px; height:52px; object-fit:cover; border-radius:6px" onerror="this.style.visibility='hidden'">
      <div style="flex:1; display:flex; flex-direction:column; gap:6px">
        <input data-bi="${i}" data-bf="title" placeholder="টাইটেল (ঐচ্ছিক)" value="${esc(b.title || '')}" style="padding:6px 8px; border:1px solid var(--line); border-radius:6px">
        <input data-bi="${i}" data-bf="link" placeholder="লিংক (যেমন #shop)" value="${esc(b.link || '#shop')}" style="padding:6px 8px; border:1px solid var(--line); border-radius:6px">
      </div>
      <div style="display:flex; flex-direction:column; gap:4px">
        <button type="button" class="btn btn-outline btn-sm" data-bup="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" class="btn btn-outline btn-sm" data-bdn="${i}" ${i === list.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="btn btn-outline btn-sm" data-bdel="${i}">✕</button>
      </div>
    </div>`).join('') || '<p class="muted">কোনো ব্যানার নেই — ডিফল্ট ব্যানার দেখাবে।</p>';
  $$('#bannerList [data-bup]').forEach((b) => b.onclick = () => moveBanner(+b.dataset.bup, -1));
  $$('#bannerList [data-bdn]').forEach((b) => b.onclick = () => moveBanner(+b.dataset.bdn, 1));
  $$('#bannerList [data-bdel]').forEach((b) => b.onclick = () => {
    const l = [...(settings.heroBanners || [])]; l.splice(+b.dataset.bdel, 1);
    settings = { ...settings, heroBanners: l }; renderBanners();
  });
  $$('#bannerList [data-bi]').forEach((inp) => inp.onchange = () => {
    const l = [...(settings.heroBanners || [])];
    l[+inp.dataset.bi] = { ...l[+inp.dataset.bi], [inp.dataset.bf]: inp.value.trim() };
    settings = { ...settings, heroBanners: l };
  });
}
function moveBanner(i, d) {
  const l = [...(settings.heroBanners || [])];
  const j = i + d;
  if (j < 0 || j >= l.length) return;
  [l[i], l[j]] = [l[j], l[i]];
  settings = { ...settings, heroBanners: l }; renderBanners();
}
function bindBannerAdd() {
  $('#bannerAdd').onclick = () => $('#bannerFile').click();
  $('#bannerFile').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const key = (settings && settings.imgbbKey) || '';
    if (!key) { toast('আগে ImgBB API Key সেভ করুন।'); e.target.value = ''; return; }
    toast('আপলোড হচ্ছে...');
    try {
      const url = await uploadBannerImage(f, key);
      if (url) {
        settings = { ...settings, heroBanners: [...(settings.heroBanners || []), { img: url, title: '', link: '#shop' }] };
        renderBanners(); toast('ব্যানার যোগ হয়েছে — সেভ করুন।');
      } else toast('আপলোড ব্যর্থ।');
    } catch { toast('আপলোড ব্যর্থ।'); }
    e.target.value = '';
  };
}
async function uploadBannerImage(file, key) {
  /* client-side compress */
  const bmp = await createImageBitmap(file);
  const maxW = 1200;
  const sc = Math.min(1, maxW / bmp.width);
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  const blob = await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.82));
  const fd = new FormData();
  fd.append('key', key);
  fd.append('image', blob, 'banner.jpg');
  const r = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: fd });
  const d = await r.json();
  return d && d.success && d.data ? d.data.url : null;
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
    messenger: $('#sfMessenger').value.trim(),
    promoBar: { text: $('#sfPromoText').value.trim(), on: $('#sfPromoOn').checked },
    email: $('#sfEmail').value.trim(), address: $('#sfAddress').value.trim(),
    social: {
      facebook: $('#sfFb').value.trim(), instagram: $('#sfIg').value.trim(),
      youtube: $('#sfYt').value.trim(),
    },
    imgbbKey: $('#sfImgbb').value.trim(),
    heroBanners: (settings && settings.heroBanners) || [],
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
const STAFF_ROLE_BN = { manager: 'ম্যানেজার', assistant: 'সহকারী', custom: 'কাস্টম' };
let editingStaffUid = null;

function staffFormTabs() {
  return $$('#stTabsBox [data-ptab]:checked').map((c) => c.dataset.ptab);
}
function setStaffFormTabs(tabs) {
  $$('#stTabsBox [data-ptab]').forEach((c) => { c.checked = tabs.includes(c.dataset.ptab); });
}
function applyRolePreset() {
  const role = $('#stRole').value;
  if (role === 'custom') return;
  setStaffFormTabs(tabsForRole(role));
  $('#stOrderFull').checked = orderFullForRole(role);
}

async function loadStaff() {
  const tb = $('#stTable tbody');
  tb.innerHTML = '<tr><td colspan="4" class="muted">লোড হচ্ছে…</td></tr>';
  const r = await fetchStaffList();
  if (!r.ok) { tb.innerHTML = '<tr><td colspan="4" class="err">লোড ব্যর্থ।</td></tr>'; return; }
  if (!r.staff.length) { tb.innerHTML = '<tr><td colspan="4" class="muted">কোনো স্টাফ নেই।</td></tr>'; return; }
  tb.innerHTML = r.staff.map((s) => {
    const susp = s.suspended === true;
    const tabs = Array.isArray(s.tabs) ? s.tabs : tabsForRole(s.role);
    return `<tr class="${susp ? 'suspended-row' : ''}">
    <td>${esc(s.email || '—')}<br><small class="muted">${esc(tabs.join(', ') || '—')}</small></td>
    <td>${esc(STAFF_ROLE_BN[s.role] || s.role || '—')}</td>
    <td>${susp ? '<span class="pill no">সাসপেন্ড</span>' : '<span class="pill ok">সক্রিয়</span>'}</td>
    <td><div class="row-actions">
      <button class="btn btn-outline btn-sm" data-editstaff="${esc(s.uid)}">এডিট</button>
      <button class="btn btn-outline btn-sm" data-suspstaff="${esc(s.uid)}">${susp ? 'চালু' : 'সাসপেন্ড'}</button>
      <button class="btn btn-outline btn-sm" data-delstaff="${esc(s.uid)}">মুছুন</button>
    </div></td>
  </tr>`;
  }).join('');
  tb.querySelectorAll('[data-delstaff]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('এই স্টাফের access বাতিল করবেন? (Auth অ্যাকাউন্ট থেকে যাবে)')) return;
    const dr = await removeStaff(b.dataset.delstaff);
    if (dr.ok) { toast('মুছে ফেলা হয়েছে।'); loadStaff(); }
    else toast('ব্যর্থ: ' + (dr.error || ''));
  }));
  tb.querySelectorAll('[data-suspstaff]').forEach((b) => b.addEventListener('click', async () => {
    const s = (await fetchStaffList()).staff.find((x) => x.uid === b.dataset.suspstaff);
    const ns = !(s && s.suspended === true);
    if (!confirm(ns ? 'এই স্টাফকে suspend করবেন? লগইন বন্ধ হয়ে যাবে।' : 'Suspend তুলে আবার চালু করবেন?')) return;
    const r2 = await saveStaff(b.dataset.suspstaff, { suspended: ns });
    if (r2.ok) { toast(ns ? 'Suspend হয়েছে।' : 'আবার চালু হয়েছে।'); loadStaff(); }
    else toast('ব্যর্থ: ' + (r2.error || ''));
  }));
  tb.querySelectorAll('[data-editstaff]').forEach((b) => b.addEventListener('click', async () => {
    const s = (await fetchStaffList()).staff.find((x) => x.uid === b.dataset.editstaff);
    if (!s) return;
    editingStaffUid = s.uid;
    $('#stEmail').value = s.email || '';
    $('#stEmail').disabled = true;
    $('#stPass').value = '';
    $('#stPass').placeholder = '(বদলাতে চাইলে নতুন পাসওয়ার্ড)';
    const tabs = Array.isArray(s.tabs) ? s.tabs : tabsForRole(s.role);
    setStaffFormTabs(tabs);
    $('#stRole').value = ['manager', 'assistant'].includes(s.role) ? s.role : 'custom';
    $('#stOrderFull').checked = s.orderFull !== undefined ? !!s.orderFull : orderFullForRole(s.role);
    $('#stAdd').textContent = 'আপডেট করুন';
    $('#stCancelEdit').hidden = false;
    $('#stAdd').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
}

function resetStaffForm() {
  editingStaffUid = null;
  $('#stEmail').value = ''; $('#stEmail').disabled = false;
  $('#stPass').value = ''; $('#stPass').placeholder = 'কমপক্ষে ৬ অক্ষর';
  $('#stRole').value = 'manager';
  applyRolePreset();
  $('#stAdd').textContent = 'স্টাফ অ্যাকাউন্ট বানান';
  $('#stCancelEdit').hidden = true;
  $('#stErr').textContent = '';
}

function initStaff() {
  $('#stRole').addEventListener('change', applyRolePreset);
  $$('#stTabsBox [data-ptab]').forEach((c) => c.addEventListener('change', () => {
    /* হাতে বদলালে custom */
    $('#stRole').value = 'custom';
  }));
  $('#stCancelEdit').addEventListener('click', resetStaffForm);
  applyRolePreset();
  $('#stAdd').addEventListener('click', async () => {
    const err = $('#stErr');
    const email = $('#stEmail').value.trim().toLowerCase();
    const pass = $('#stPass').value;
    const role = $('#stRole').value;
    const tabs = staffFormTabs();
    const orderFull = $('#stOrderFull').checked;
    err.textContent = '';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = 'সঠিক ইমেইল দিন।'; return; }
    if (!tabs.length) { err.textContent = 'কমপক্ষে ১টি অনুমতি টিক দিন।'; return; }
    $('#stAdd').disabled = true;
    try {
      if (editingStaffUid) {
        /* update permissions (password change not supported here) */
        const r = await saveStaff(editingStaffUid, { role, tabs, orderFull });
        if (!r.ok) throw new Error(r.error || 'ব্যর্থ');
        toast('আপডেট হয়েছে।');
        resetStaffForm(); loadStaff();
      } else {
        if (!pass || pass.length < 6) { err.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'; return; }
        /* 1. Firebase Auth account (secondary app — current session নিরাপদ) */
        const cr = await createStaffAccount(email, pass);
        if (!cr.ok) throw new Error(cr.error || (cr.demo ? 'Firebase কানেক্ট হয়নি।' : 'অ্যাকাউন্ট বানানো যায়নি।'));
        /* 2. staff doc with tabs */
        const r = await saveStaff(cr.uid, { email, role, tabs, orderFull, suspended: false });
        if (!r.ok) throw new Error(r.error || 'Staff ডকুমেন্ট সেভ হয়নি।');
        toast('স্টাফ অ্যাকাউন্ট তৈরি।');
        resetStaffForm(); loadStaff();
      }
    } catch (e) {
      err.textContent = 'ব্যর্থ: ' + (e.message || e);
    } finally {
      $('#stAdd').disabled = false;
    }
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
  if (!confirm(`${impValidated.filter((v) => v.status === 'new' || (upd && v.status === 'duplicate')).length}টি প্রোডাক্ট ইমপোর্ট করবেন?`)) return;
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
  bindCatImgUpload();
  initCombos();
  $('#orderSearch').addEventListener('input', renderOrders);
  $('#orderFilter').addEventListener('change', renderOrders);
  $('#settingsSave').addEventListener('click', saveSettingsForm);
  bindBannerAdd();
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
