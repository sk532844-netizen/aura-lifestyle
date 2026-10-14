/* AURA LIFESTYLE — Phase 1: customer website (no admin panel).
   Hash router SPA. Cart + wishlist in localStorage. Orders → Firestore
   (or localStorage demo mode). All renders escape user-entered text. */
import { isConfigured, fetchProducts, fetchSettings, saveOrder, fetchOrder, fetchReviews, submitReview } from './firebase.js';

/* ---------------- state ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
let PRODUCTS = [...SEED_PRODUCTS];
let SETTINGS = { ...DEFAULT_SETTINGS };
let LANG = localStorage.getItem('aura_lang') || 'bn';
let cart = loadLS('aura_cart', []);
let wish = loadLS('aura_wish', []);
let localOrders = loadLS('aura_orders_local', []);
let seedReviews = {
  p01: [{ name: 'আব্দুল্লাহ', rating: 5, text: 'কাপড়টা খুব ভালো, ঈদের জন্য নিয়েছি।', date: '12 Oct 2026', verified: true }],
  p11: [{ name: 'ফাতিমা', rating: 5, text: 'সুগন্ধি সারাদিন থাকে। আবার নেবো।', date: '08 Oct 2026', verified: true }],
  p13: [{ name: 'রাহাত', rating: 4, text: 'আরামদায়ক, দাম অনুযায়ী ভালো।', date: '05 Oct 2026', verified: true }],
};
let flashEnd = Date.now() + (5 * 3600 + 42 * 60) * 1000; /* flash sale ends in ~5h42m */

/* ---------------- helpers ---------------- */
function loadLS(k, dflt) { try { const v = JSON.parse(localStorage.getItem(k)); return Array.isArray(v) || (v && typeof v === 'object') ? v : dflt; } catch { return dflt; } }
function saveLS(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full/blocked */ } }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function fmt(n) { return '৳' + Number(n || 0).toLocaleString('en-US'); }
function discount(p) { if (!p.oldPrice || p.oldPrice <= p.price) return 0; return Math.round((p.oldPrice - p.price) / p.oldPrice * 100); }
function mainOf(slug) { return (typeof MAIN_CATEGORIES !== 'undefined' ? MAIN_CATEGORIES : []).find((m) => m.slug === slug) || { slug, bn: slug, en: slug, img: FALLBACK_IMG, subs: [] }; }
function subOf(mainSlug, subSlug) { const m = mainOf(mainSlug); const s = m.subs.find((x) => x.slug === subSlug); return s ? { ...s, main: mainSlug } : { slug: subSlug, bn: subSlug, en: subSlug, main: mainSlug }; }
function visibleMains() { const hidden = (SETTINGS.hiddenCategories || []); return MAIN_CATEGORIES.filter((m) => !hidden.includes(m.slug)); }
function prodMainLabel(p) { const m = mainOf(p.main); const s = subOf(p.main, p.sub); return (LANG === 'bn' ? m.bn : m.en) + ' › ' + (LANG === 'bn' ? s.bn : s.en); }
function prodById(id) { return PRODUCTS.find((p) => p.id === id); }
function stars(n) { return '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n)); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
function validPhone(p) { return /^01[3-9]\d{8}$/.test(String(p || '').trim()); }

/* ---------------- i18n ---------------- */
const I18N = {
  track: { bn: 'Track Order', en: 'Track Order' },
  wishlist: { bn: 'Wishlist', en: 'Wishlist' },
  home: { bn: 'হোম', en: 'Home' },
  shop: { bn: 'সব প্রোডাক্ট', en: 'Shop All' },
  categories: { bn: 'টপ ক্যাটাগরি', en: 'Top Categories' },
  flash: { bn: 'ফ্ল্যাশ সেল', en: 'Flash Sale' },
  best: { bn: 'বেস্ট সেলার', en: 'Best Sellers' },
  newArr: { bn: 'নতুন এসেছে', en: 'New Arrivals' },
  combo: { bn: 'কম্বো অফার', en: 'Combo Offers' },
  testi: { bn: 'কাস্টমার রিভিউ', en: 'Customer Reviews' },
  addCart: { bn: 'কার্টে যোগ করুন', en: 'Add to Cart' },
  buyNow: { bn: 'এখনই কিনুন', en: 'Buy Now' },
  viewAll: { bn: 'সব দেখুন', en: 'View All' },
  inStock: { bn: 'স্টকে আছে', en: 'In Stock' },
  lowStock: { bn: 'মাত্র {n}টি বাকি', en: 'Only {n} left' },
  outStock: { bn: 'স্টক শেষ', en: 'Out of Stock' },
  freeShip: { bn: 'ফ্রি ডেলিভারি', en: 'Free Delivery' },
  signin: { bn: 'সাইন ইন', en: 'Sign In' },
  signinSoon: { bn: 'সাইন-ইন শীঘ্রই আসছে', en: 'Sign-in coming soon' },
  waOrder: { bn: 'WhatsApp-এ অর্ডার', en: 'Order on WhatsApp' },
  callOrder: { bn: 'কল করে অর্ডার', en: 'Call to Order' },
  maxPrice: { bn: 'সর্বোচ্চ দাম', en: 'Max price' },
  trust1: { bn: 'অরিজিনাল পণ্য', en: 'Genuine Products' },
  trust2: { bn: 'ক্যাশ অন ডেলিভারি', en: 'Cash on Delivery' },
  trust3: { bn: 'সারা দেশে ডেলিভারি', en: 'All-Bangladesh Delivery' },
  trust4: { bn: 'নিরাপদ পেমেন্ট', en: 'Secure Payment' },
  flashPromoT: { bn: 'ফ্ল্যাশ সেল — বিশেষ ছাড়', en: 'Flash Sale — Special Discounts' },
  flashPromoS: { bn: 'সীমিত সময়ের অফারে পছন্দের পণ্য কিনুন', en: 'Grab your favorites at limited-time prices' },
  viewOffer: { bn: 'অফার দেখুন', en: 'View Offers' },
};
const t = (k, vars) => { let s = (I18N[k] && I18N[k][LANG]) || k; if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replace('{' + kk + '}', vv); return s; };

/* ---------------- init ---------------- */
async function init() {
  if (!isConfigured()) $('#demoNote').style.display = 'block';
  try {
    const [remoteProducts, remoteSettings] = await Promise.all([fetchProducts(), fetchSettings()]);
    if (remoteProducts) PRODUCTS = remoteProducts;
    if (remoteSettings) SETTINGS = { ...DEFAULT_SETTINGS, ...remoteSettings };
  } catch { /* seed fallback */ }
  buildNav();
  updateBadges();
  window.addEventListener('hashchange', route);
  route();
  startFlashTimer();
  const si = $('#searchInput');
  si.addEventListener('input', onSearchInput);
  si.addEventListener('keydown', (e) => { if (e.key === 'Enter') { location.hash = '#shop?q=' + encodeURIComponent(si.value.trim()); $('#suggestBox').classList.remove('open'); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('.searchbox')) $('#suggestBox').classList.remove('open'); });
  $('#langBtn').addEventListener('click', () => {
    LANG = LANG === 'bn' ? 'en' : 'bn';
    localStorage.setItem('aura_lang', LANG);
    $('#langBtn').textContent = LANG === 'bn' ? 'EN' : 'বাং';
    buildNav(); route();
  });
  $('#langBtn').textContent = LANG === 'bn' ? 'EN' : 'বাং';
  $('#cartBtn').addEventListener('click', () => { location.hash = '#cart'; });
  $('#wishLink').addEventListener('click', (e) => { e.preventDefault(); location.hash = '#wishlist'; });
  $('#signinLink').addEventListener('click', (e) => { e.preventDefault(); toast(t('signinSoon')); });
  $('#cartBubble').addEventListener('click', () => { location.hash = '#cart'; });
}

function buildNav() {
  const cur = location.hash.replace('#', '');
  const homeCls = cur === '' || cur.startsWith('home') ? 'active' : '';
  const shopCls = cur.startsWith('shop') ? 'active' : '';
  const items = visibleMains().map((m) => {
    const label = LANG === 'bn' ? m.bn : m.en;
    const active = cur === 'shop?main=' + m.slug || cur.startsWith('shop?main=' + m.slug + '&') ? 'active' : '';
    const subs = m.subs.map((s) => `<a href="#shop?main=${m.slug}&sub=${s.slug}">${esc(LANG === 'bn' ? s.bn : s.en)}</a>`).join('');
    return `<div class="nav-item"><a href="#shop?main=${m.slug}" class="${active}">${esc(label)}</a><div class="mega"><div class="mega-head">${esc(label)}</div>${subs}</div></div>`;
  }).join('');
  $('#navCats').innerHTML = `<a href="#home" class="${homeCls}">${t('home')}</a><a href="#shop" class="${shopCls}">${t('shop')}</a>${items}`;
}

function updateBadges() {
  const n = cart.reduce((s, i) => s + i.qty, 0);
  $('#cartCount').textContent = n;
  $('#wishCount').textContent = wish.length;
  const b = $('#cartBubble');
  if (b) {
    $('#cbCount').textContent = n;
    $('#cbTotal').textContent = fmt(cartTotal());
    const hide = /^(cart|checkout)/.test(location.hash.replace(/^#/, ''));
    b.classList.toggle('show', n > 0 && !hide);
  }
}

/* ---------------- search ---------------- */
function onSearchInput(e) {
  const q = e.target.value.trim().toLowerCase();
  const box = $('#suggestBox');
  if (q.length < 2) { box.classList.remove('open'); return; }
  /* exact SKU match ranks first */
  const exactSku = PRODUCTS.find((p) => (p.sku || '').toLowerCase() === q);
  const hits = PRODUCTS.filter((p) => p !== exactSku && (p.nameEn + ' ' + p.nameBn + ' ' + (p.sku || '') + ' ' + prodMainLabel(p)).toLowerCase().includes(q)).slice(0, 6);
  const ordered = exactSku ? [exactSku, ...hits].slice(0, 6) : hits;
  if (!ordered.length) { box.classList.remove('open'); return; }
  box.innerHTML = ordered.map((p) => `<a href="#product/${p.id}"><img src="${esc(p.img)}" onerror="this.src='${FALLBACK_IMG}'" alt=""><span>${esc(LANG === 'bn' ? p.nameBn : p.nameEn)}${p.sku ? `<small class="s-sku">${esc(p.sku)}</small>` : ''}</span><span class="s-price">${fmt(p.price)}</span></a>`).join('');
  box.classList.add('open');
}

/* ---------------- router ---------------- */
function route() {
  const raw = location.hash.replace(/^#/, '') || 'home';
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const app = $('#app');
  window.scrollTo(0, 0);
  buildNav();
  if (path === 'home') app.innerHTML = viewHome();
  else if (path === 'shop') app.innerHTML = viewShop(params);
  else if (path.startsWith('product/')) app.innerHTML = viewProduct(path.split('/')[1]);
  else if (path === 'cart') app.innerHTML = viewCart();
  else if (path === 'checkout') app.innerHTML = viewCheckout();
  else if (path === 'track') app.innerHTML = viewTrack();
  else if (path === 'wishlist') app.innerHTML = viewWishlist();
  else if (path === 'faq') app.innerHTML = viewFaq();
  else if (path === 'contact') app.innerHTML = viewContact();
  else if (path === 'delivery') app.innerHTML = viewDelivery();
  else if (path === 'returns') app.innerHTML = viewReturns();
  else if (path === 'privacy') app.innerHTML = viewPrivacy();
  else if (path === 'terms') app.innerHTML = viewTerms();
  else if (path === 'about') app.innerHTML = viewAbout();
  else if (path.startsWith('order-success/')) app.innerHTML = viewOrderSuccess(path.split('/')[1]);
  else app.innerHTML = view404();
  bindDynamic();
  updateBadges();
}

/* re-bind events after each render */
function bindDynamic() {
  $$('[data-add]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); addToCart(b.dataset.add, 1, null); }));
  $$('[data-wish]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); toggleWish(b.dataset.wish); }));
  $$('.faq-q').forEach((q) => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      item.classList.toggle('open');
      q.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
    });
  });
}

/* ---------------- product card ---------------- */
function prodCard(p) {
  const off = discount(p);
  const name = LANG === 'bn' ? p.nameBn : p.nameEn;
  const wished = wish.includes(p.id);
  const stockCls = p.stock === 0 ? 'low' : (p.stock <= 5 ? 'low' : 'ok');
  const stockTxt = p.stock === 0 ? t('outStock') : (p.stock <= 5 ? t('lowStock', { n: p.stock }) : t('inStock'));
  return `<article class="prod-card">
    <div class="p-img"><a href="#product/${esc(p.id)}"><img src="${esc(p.img)}" alt="${esc(name)}" onerror="this.src='${FALLBACK_IMG}'" loading="lazy"></a>
    ${off > 0 ? `<span class="badge-off">-${off}%</span>` : ''}
    <button class="wish-btn ${wished ? 'on' : ''}" data-wish="${esc(p.id)}" aria-label="wishlist">${wished ? '♥' : '♡'}</button></div>
    <div class="prod-body"><a href="#product/${esc(p.id)}"><h3>${esc(name)}</h3></a>
    <div class="prod-cat">${esc(prodMainLabel(p))}</div>
    <div class="stars">${stars(4.5)}</div>
    <div class="price"><b>${fmt(p.price)}</b>${off > 0 ? `<s>${fmt(p.oldPrice)}</s>` : ''}</div>
    <div class="stock ${stockCls}">${stockTxt}</div>
    <button class="add-btn" data-add="${esc(p.id)}" ${p.stock === 0 ? 'disabled style="opacity:.5"' : ''}>${t('addCart')}</button></div>
  </article>`;
}

/* ---------------- 404 ---------------- */
function view404() {
  return `<section class="section"><div class="empty"><h3>পেজ পাওয়া যায়নি (404)</h3><p>আপনি যে ঠিকানায় গিয়েছিলেন সেটি খুঁজে পাওয়া যায়নি।</p><div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap"><a class="btn" href="#home">হোমে ফিরুন</a><a class="btn btn-outline" href="#shop">Shop করুন</a></div></div></section>`;
}

/* ---------------- HOME (compact) ---------------- */
function viewHome() {
  const flash = PRODUCTS.filter((p) => p.tag === 'flash-sale' && p.stock > 0).slice(0, 4);
  const best = PRODUCTS.filter((p) => p.tag === 'best-seller').slice(0, 4);
  const mains = visibleMains();
  return `
  <div class="hero-carousel" id="heroCarousel">
    <div class="hc-track" id="hcTrack">
      <div class="hc-slide"><img src="cover.jpg" alt="AURA LIFESTYLE"><div class="hero-cta"><a class="btn" href="#shop">${LANG === 'bn' ? 'এখনই শপ করুন' : 'Shop Now'}</a></div></div>
      <div class="hc-slide hc-promo"><div class="hc-promo-txt"><h2>${t('flashPromoT')}</h2><p>${t('flashPromoS')}</p><a class="btn" href="#shop">${t('viewOffer')}</a></div></div>
    </div>
    <button class="hc-arrow hc-prev" id="hcPrev" aria-label="previous">‹</button>
    <button class="hc-arrow hc-next" id="hcNext" aria-label="next">›</button>
    <div class="hc-dots" id="hcDots"><button class="on" data-i="0" aria-label="slide 1"></button><button data-i="1" aria-label="slide 2"></button></div>
  </div>

  <section class="section"><div class="section-head"><h2>${t('categories')}</h2><a href="#shop">${t('viewAll')} →</a></div>
  <div class="main-cat-grid">${mains.map((m) => {
    const subNames = m.subs.slice(0, 3).map((s) => LANG === 'bn' ? s.bn : s.en).join(' • ');
    return `<a class="main-cat-card" href="#shop?main=${m.slug}"><img src="${esc(m.img)}" alt="${esc(LANG === 'bn' ? m.bn : m.en)}" onerror="this.src='${FALLBACK_IMG}'" loading="lazy"><span class="mc-name">${esc(LANG === 'bn' ? m.bn : m.en)}</span><span class="mc-subs">${esc(subNames)}</span></a>`;
  }).join('')}</div></section>

  ${flash.length ? `<section class="section"><div class="flash-box"><div class="flash-head"><h2>${t('flash')}</h2><div class="countdown" id="countdown"></div></div><div class="prod-row" style="margin-top:14px">${flash.map(prodCard).join('')}</div></div></section>` : ''}

  <section class="section"><div class="section-head"><h2>${t('best')}</h2><a href="#shop">${t('viewAll')} →</a></div><div class="prod-row">${best.map(prodCard).join('')}</div></section>

  <div class="trust-row">
    <div class="trust-item"><span class="trust-ic">✓</span><span>${t('trust1')}</span></div>
    <div class="trust-item"><span class="trust-ic">✓</span><span>${t('trust2')}</span></div>
    <div class="trust-item"><span class="trust-ic">✓</span><span>${t('trust3')}</span></div>
    <div class="trust-item"><span class="trust-ic">✓</span><span>${t('trust4')}</span></div>
  </div>

  <div class="promo-strip"><div><b>${LANG === 'bn' ? 'ফ্রি ডেলিভারি' : 'Free Delivery'}</b><span>${LANG === 'bn' ? '৳২০০০+ অর্ডারে সারা বাংলাদেশে ফ্রি ডেলিভারি' : 'On orders above ৳2000, all over Bangladesh'}</span></div><a class="btn" href="#shop">${LANG === 'bn' ? 'শপ করুন' : 'Shop'}</a></div>

  <section class="section"><div class="section-head"><h2>${t('testi')}</h2></div>
  <div class="testi-grid">${SEED_TESTIMONIALS.slice(0, 3).map((x) => `<div class="testi"><div class="stars">${stars(x.rating)}</div><p>"${esc(x.text)}"</p><b>${esc(x.name)}</b><span>${esc(x.loc)}</span></div>`).join('')}</div></section>

  <section class="section"><div class="newsletter"><h2>নতুন অফার সবার আগে পান</h2>
  <form id="nlForm"><input type="email" id="nlEmail" placeholder="আপনার ইমেইল" required><button class="btn" type="submit">Subscribe</button></form></div></section>`;
}

/* ---------------- SHOP ---------------- */
function viewShop(params) {
  const main = params.get('main') || '';
  const sub = params.get('sub') || '';
  const q = (params.get('q') || '').toLowerCase();
  const sort = params.get('sort') || 'popular';
  const maxPrice = parseInt(params.get('max') || '0', 10);
  let list = PRODUCTS.filter((p) => p.stock >= 0);
  if (main) list = list.filter((p) => p.main === main);
  if (sub) list = list.filter((p) => p.sub === sub);
  if (q) {
    /* exact SKU match jumps to the front */
    const exactSku = list.find((p) => (p.sku || '').toLowerCase() === q);
    list = list.filter((p) => (p.nameEn + ' ' + p.nameBn + ' ' + (p.sku || '') + ' ' + prodMainLabel(p)).toLowerCase().includes(q));
    if (exactSku && list.includes(exactSku)) list = [exactSku, ...list.filter((p) => p !== exactSku)];
  }
  const isSkuQuery = /^[a-z]\d+$/i.test(q);
  if (maxPrice > 0) list = list.filter((p) => p.price <= maxPrice);
  if (sort === 'low') list = [...list].sort((a, b) => a.price - b.price);
  else if (sort === 'high') list = [...list].sort((a, b) => b.price - a.price);
  else if (sort === 'new') list = [...list].reverse();
  const page = Math.max(1, parseInt(params.get('page') || '1', 10));
  const PER = 12, pages = Math.max(1, Math.ceil(list.length / PER));
  const slice = list.slice((page - 1) * PER, page * PER);
  const base = `#shop?${main ? 'main=' + main + '&' : ''}${sub ? 'sub=' + sub + '&' : ''}${q ? 'q=' + encodeURIComponent(q) + '&' : ''}${maxPrice ? 'max=' + maxPrice + '&' : ''}sort=${sort}`;
  const mainLabel = main ? (LANG === 'bn' ? mainOf(main).bn : mainOf(main).en) : '';
  const subLabel = (main && sub) ? (LANG === 'bn' ? subOf(main, sub).bn : subOf(main, sub).en) : '';
  const heading = main ? (sub ? `${mainLabel} › ${subLabel}` : mainLabel) : (q ? `Search: "${esc(q)}"` : t('shop'));
  const mains = visibleMains();
  const subs = main ? mainOf(main).subs : [];
  const allPrices = PRODUCTS.map((x) => x.price);
  const pMin = Math.min(...allPrices), pMax = Math.max(...allPrices);
  const sliderVal = maxPrice > 0 ? Math.min(maxPrice, pMax) : pMax;
  return `<section class="section"><div class="crumb"><a href="#home">${t('home')}</a> › <a href="#shop">${t('shop')}</a>${main ? ` › <a href="#shop?main=${main}">${esc(mainLabel)}</a>` : ''}${sub ? ` › <span>${esc(subLabel)}</span>` : ''}</div>
  <h2 style="color:var(--navy)">${esc(heading)}</h2>
  <div class="filters" style="margin-top:14px">
    <select id="fSort"><option value="popular" ${sort === 'popular' ? 'selected' : ''}>সবচেয়ে জনপ্রিয়</option><option value="low" ${sort === 'low' ? 'selected' : ''}>দাম: কম → বেশি</option><option value="high" ${sort === 'high' ? 'selected' : ''}>দাম: বেশি → কম</option><option value="new" ${sort === 'new' ? 'selected' : ''}>নতুন আগে</option></select>
    <select id="fMax"><option value="0">সব দাম</option><option value="1000" ${maxPrice === 1000 ? 'selected' : ''}>৳১০০০-এর নিচে</option><option value="2000" ${maxPrice === 2000 ? 'selected' : ''}>৳২০০০-এর নিচে</option><option value="3000" ${maxPrice === 3000 ? 'selected' : ''}>৳৩০০০-এর নিচে</option></select>
    <div class="price-slider"><label>${t('maxPrice')}: <b id="fPriceVal">${fmt(sliderVal)}</b></label><input type="range" id="fPrice" min="${pMin}" max="${pMax}" step="50" value="${sliderVal}"></div>
    <input id="fQ" placeholder="এই পেজে খুঁজুন..." value="${esc(q)}">
  </div>
  <div class="filter-label">${LANG === 'bn' ? 'ক্যাটাগরি' : 'Category'}</div>
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px">
    <button class="chip ${!main ? 'on' : ''}" onclick="location.hash='#shop'">সব</button>
    ${mains.map((m) => `<button class="chip ${main === m.slug ? 'on' : ''}" onclick="location.hash='#shop?main=${m.slug}'">${esc(LANG === 'bn' ? m.bn : m.en)}</button>`).join('')}
  </div>
  ${main ? `<div class="filter-label">${esc(mainLabel)} — ${LANG === 'bn' ? 'সাব-ক্যাটাগরি' : 'Sub-category'}</div>
  <div class="sub-chips">
    <button class="chip sub-chip ${!sub ? 'on' : ''}" onclick="location.hash='#shop?main=${main}'">${LANG === 'bn' ? 'সব' : 'All'}</button>
    ${subs.map((s) => `<button class="chip sub-chip ${sub === s.slug ? 'on' : ''}" onclick="location.hash='#shop?main=${main}&sub=${s.slug}'">${esc(LANG === 'bn' ? s.bn : s.en)}</button>`).join('')}
  </div>` : ''}
  ${slice.length ? `<div class="prod-row">${slice.map(prodCard).join('')}</div>` : `<div class="empty"><h3>${isSkuQuery ? (LANG === 'bn' ? 'Not Found — এই কোডের কোনো প্রোডাক্ট নেই' : 'Not Found — no product matches this code') : (LANG === 'bn' ? 'কোনো প্রোডাক্ট পাওয়া যায়নি' : 'No products found')}</h3><p>${isSkuQuery ? (LANG === 'bn' ? 'কোডটি ঠিক আছে কিনা দেখুন (যেমন: A100001)' : 'Check the code is correct (e.g. A100001)') : (LANG === 'bn' ? 'অন্য ক্যাটাগরি বা দাম দিয়ে চেষ্টা করুন।' : 'Try another category or price.')}</p></div>`}
  ${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<button class="${page === i + 1 ? 'on' : ''}" onclick="location.hash='${base}&page=${i + 1}'">${i + 1}</button>`).join('')}</div>` : ''}
  </section>`;
}

/* ---------------- PRODUCT DETAIL ---------------- */
function viewProduct(id) {
  const p = prodById(id);
  if (!p) return `<div class="empty"><h3>প্রোডাক্ট পাওয়া যায়নি</h3><a class="btn" href="#shop">Shop-এ ফিরে যান</a></div>`;
  const name = LANG === 'bn' ? p.nameBn : p.nameEn;
  const desc = LANG === 'bn' ? p.descBn : p.descEn;
  const off = discount(p);
  const related = [...PRODUCTS.filter((x) => x.main === p.main && x.sub === p.sub && x.id !== p.id),
    ...PRODUCTS.filter((x) => x.main === p.main && x.sub !== p.sub && x.id !== p.id)].slice(0, 4);
  const seedRv = seedReviews[p.id] || [];
  const imgs = (Array.isArray(p.images) && p.images.length ? p.images : [p.img]).filter(Boolean);
  const waText = encodeURIComponent(`আসসালামু আলাইকুম! আমি এই প্রোডাক্টটি অর্ডার করতে চাই:\n${name} (SKU: ${p.sku || '-'}) — ${fmt(p.price)}\n${location.href}`);
  return `<section class="section"><div class="crumb"><a href="#home">${t('home')}</a> › <a href="#shop">${t('shop')}</a> › <a href="#shop?main=${p.main}">${esc(LANG === 'bn' ? mainOf(p.main).bn : mainOf(p.main).en)}</a> › <a href="#shop?main=${p.main}&sub=${p.sub}">${esc(LANG === 'bn' ? subOf(p.main, p.sub).bn : subOf(p.main, p.sub).en)}</a> › <span>${esc(name)}</span></div><div class="pd">
    <div class="pd-gallery"><img class="main" id="pdMain" src="${esc(imgs[0])}" alt="${esc(name)}" onerror="this.src='${FALLBACK_IMG}'">
    ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<button class="pd-thumb${i === 0 ? ' on' : ''}" data-src="${esc(im)}" aria-label="ছবি ${i + 1}"><img src="${esc(im)}" alt="" onerror="this.src='${FALLBACK_IMG}'" loading="lazy"></button>`).join('')}</div>` : ''}</div>
    <div>
      <span style="color:var(--muted); font-size:13px">${esc(prodMainLabel(p))}</span>
      <h1>${esc(name)}</h1>
      ${p.sku ? `<div class="sku-line">SKU: <b>${esc(p.sku)}</b></div>` : ''}
      <div class="stars">${stars(4.5)} <span style="color:var(--muted); font-size:13px">(4.5)</span></div>
      <div class="pd-price"><b>${fmt(p.price)}</b>${off > 0 ? `<s>${fmt(p.oldPrice)}</s>` : ''}${off > 0 ? ` <span style="color:var(--red); font-weight:700">-${off}% ছাড়</span>` : ''}</div>
      <p class="desc">${esc(desc)}</p>
      <div class="stock ${p.stock === 0 ? 'low' : 'ok'}">${p.stock === 0 ? t('outStock') : (p.stock <= 5 ? t('lowStock', { n: p.stock }) : t('inStock'))}</div>
      <div style="margin-top:14px"><b>সাইজ নির্বাচন করুন:</b></div>
      <div class="size-row" id="sizeRow">${p.sizes.map((s) => `<button class="size-btn" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div class="err" id="sizeErr"></div>
      <div class="qty-row"><button id="qMinus">−</button><b id="qVal">1</b><button id="qPlus">+</button><span style="color:var(--muted); font-size:13px">পরিমাণ</span></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap"><button class="btn btn-dark" id="pdAdd" ${p.stock === 0 ? 'disabled style="opacity:.5"' : ''}>${t('addCart')}</button><button class="btn" id="pdBuy" ${p.stock === 0 ? 'disabled style="opacity:.5"' : ''}>${t('buyNow')}</button><button class="btn btn-outline" id="pdWish">${wish.includes(p.id) ? '♥ Saved' : '♡ Wishlist'}</button></div>
      <div class="order-alt"><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(SETTINGS.whatsapp)}?text=${waText}">${t('waOrder')}</a><a class="btn btn-outline btn-sm" href="tel:${esc(SETTINGS.phone)}">${t('callOrder')}</a></div>
      <div class="meta-box">
        <div>ডেলিভারি: ঢাকায় ২৪–৪৮ ঘণ্টা, ঢাকার বাইরে ২–৪ দিন</div>
        <div>পেমেন্ট: ক্যাশ অন ডেলিভারি, বিকাশ, নগদ, কার্ড</div>
        <div>রিটার্ন: ৭ দিনের মধ্যে সহজ রিটার্ন / এক্সচেঞ্জ</div>
      </div>
      <div class="share-row"><button class="btn btn-outline btn-sm" id="shareCopy">লিংক কপি করুন</button><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('দেখুন: ' + name + ' — ' + fmt(p.price) + ' ' + location.href)}">WhatsApp-এ শেয়ার</a></div>
    </div>
  </div>
  <div id="reviewsSection"></div>
  ${related.length ? `<div class="section"><div class="section-head"><h2>আপনার পছন্দ হতে পারে</h2></div><div class="prod-row">${related.map(prodCard).join('')}</div></div>` : ''}
  </section>`;
}

/* ================= CART ================= */
function cartTotal() { return cart.reduce((s, i) => s + (prodById(i.id)?.price || 0) * i.qty, 0); }
function cartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function addToCart(id, qty, size) {
  const p = prodById(id);
  if (!p || p.stock === 0) return;
  const ex = cart.find((i) => i.id === id && i.size === (size || ''));
  if (ex) ex.qty = Math.min(ex.qty + qty, p.stock);
  else cart.push({ id, qty, size: size || '' });
  saveLS('aura_cart', cart);
  updateBadges();
  toast(`${LANG === 'bn' ? p.nameBn : p.nameEn} — কার্টে যোগ হয়েছে`);
}
function toggleWish(id) {
  wish = wish.includes(id) ? wish.filter((x) => x !== id) : [...wish, id];
  saveLS('aura_wish', wish);
  updateBadges();
  route();
}
function setQty(id, size, delta) {
  const it = cart.find((i) => i.id === id && i.size === size);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) cart = cart.filter((i) => i !== it);
  saveLS('aura_cart', cart);
  updateBadges(); route();
}
function removeItem(id, size) {
  cart = cart.filter((i) => !(i.id === id && i.size === size));
  saveLS('aura_cart', cart);
  updateBadges(); route();
}

function viewCart() {
  const total = cartTotal();
  const freeAbove = SETTINGS.freeAbove || 2000;
  const pct = Math.min(100, Math.round(total / freeAbove * 100));
  return `<section class="section"><h2 style="color:var(--navy)">Shopping Cart</h2>
  <div class="cart-layout" style="margin-top:16px"><div class="card">
  ${!cart.length ? `<div class="empty"><h3>আপনার কার্ট খালি</h3><p>প্রোডাক্ট দেখে কার্টে যোগ করুন।</p><a class="btn" href="#shop" style="margin-top:12px">Shop করুন</a></div>` :
    cart.map((i) => { const p = prodById(i.id); if (!p) return ''; return `<div class="cart-item"><img src="${esc(p.img)}" onerror="this.src='${FALLBACK_IMG}'" alt=""><div class="ci-info"><b>${esc(LANG === 'bn' ? p.nameBn : p.nameEn)}</b><span>${i.size ? 'সাইজ: ' + esc(i.size) + ' • ' : ''}${fmt(p.price)}</span><button class="ci-remove" onclick="removeItem('${esc(i.id)}','${esc(i.size)}')">Remove</button></div><div class="ci-qty"><button onclick="setQty('${esc(i.id)}','${esc(i.size)}',-1)">−</button><b>${i.qty}</b><button onclick="setQty('${esc(i.id)}','${esc(i.size)}',1)">+</button></div><b>${fmt(p.price * i.qty)}</b></div>`; }).join('')}
  </div><div class="card">
    <h3>Order Summary</h3>
    ${total >= freeAbove ? `<p style="color:var(--green); font-weight:700; margin:10px 0">ফ্রি ডেলিভারি পেয়ে গেছেন!</p>` : `<p style="font-size:13px; color:var(--muted); margin:10px 0">আর ${fmt(freeAbove - total)} অর্ডার করলে ফ্রি ডেলিভারি পাবেন</p><div class="ship-progress"><i style="width:${pct}%"></i></div>`}
    <div class="tot-row"><span>Subtotal</span><b>${fmt(total)}</b></div>
    <div class="tot-row"><span>Delivery</span><b>চেকআউটে হিসাব হবে</b></div>
    <div class="tot-row grand"><span>Total</span><b>${fmt(total)}</b></div>
    <a class="btn btn-block" href="#checkout" style="margin-top:12px" ${!cart.length ? 'onclick="return false" style="opacity:.5"' : ''}>Checkout →</a>
    <a class="btn btn-outline btn-block" href="#shop" style="margin-top:8px">Continue Shopping</a>
  </div></div></section>`;
}

/* ================= CHECKOUT ================= */
function deliveryFor(district) {
  if (!district) return null;
  if (district.startsWith('ঢাকা (সিটি)')) return SETTINGS.deliveryCity ?? 70;
  if (district.startsWith('ঢাকা (সাব')) return SETTINGS.deliverySub ?? 90;
  return SETTINGS.deliveryOutside ?? 110;
}

function viewCheckout() {
  if (!cart.length) return `<div class="empty"><h3>কার্ট খালি</h3><p>আগে প্রোডাক্ট কার্টে যোগ করুন।</p><a class="btn" href="#shop">Shop করুন</a></div>`;
  const sub = cartTotal();
  return `<section class="section"><h2 style="color:var(--navy)">Checkout</h2>
  <form id="coForm" class="cart-layout" style="margin-top:16px"><div>
    <div class="card"><h3>বিলিং তথ্য</h3>
      <div class="field"><label>পূর্ণ নাম *</label><input id="coName" required placeholder="আপনার নাম"></div>
      <div class="field"><label>মোবাইল নম্বর * (১১ ডিজিট)</label><input id="coPhone" required placeholder="01XXXXXXXXX" inputmode="numeric"><div class="hint">অর্ডার কনফার্মেশনের জন্য এই নম্বরে কল করা হবে</div></div>
      <div class="field"><label>জেলা *</label><select id="coDistrict" required><option value="">জেলা নির্বাচন করুন</option>${DISTRICTS.map((d) => `<option>${esc(d)}</option>`).join('')}</select></div>
      <div class="field"><label>সম্পূর্ণ ঠিকানা *</label><textarea id="coAddress" required rows="2" placeholder="বাড়ি/রোড/এলাকা"></textarea></div>
      <div class="field"><label>ইমেইল (ঐচ্ছিক)</label><input id="coEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>WhatsApp নম্বর (ঐচ্ছিক)</label><input id="coWhats" placeholder="01XXXXXXXXX"></div>
      <div class="field"><label>অর্ডার নোট (ঐচ্ছিক)</label><textarea id="coNote" rows="2" placeholder="ডেলিভারি সংক্রান্ত কোনো নির্দেশনা"></textarea></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>পেমেন্ট মেথড</h3>
      <label class="pay-opt sel"><input type="radio" name="pay" value="cod" checked class="pay-radio">
        <b>Cash on Delivery <span class="pay-bn">(ক্যাশ অন ডেলিভারি)</span></b>
        <span>পণ্য হাতে পেয়ে টাকা দিন — কোনো অগ্রিম পেমেন্ট নয়।</span>
      </label>
      <label class="pay-opt"><input type="radio" name="pay" value="bkash" class="pay-radio">
        <b>bKash <span class="pay-bn">(বিকাশ)</span></b>
        <span>ম্যানুয়াল পেমেন্ট — নিচের নম্বরে সেন্ড মানি করে TrxID দিন।</span>
        <div class="pay-num">বিকাশ (পার্সোনাল): <b>${esc(SETTINGS.bkash)}</b></div>
        <input class="trx-input" id="trxBkash" placeholder="বিকাশ TrxID লিখুন" style="display:none">
      </label>
      <label class="pay-opt"><input type="radio" name="pay" value="nagad" class="pay-radio">
        <b>Nagad <span class="pay-bn">(নগদ)</span></b>
        <span>ম্যানুয়াল পেমেন্ট — নিচের নম্বরে সেন্ড মানি করে TrxID দিন।</span>
        <div class="pay-num">নগদ (পার্সোনাল): <b>${esc(SETTINGS.nagad)}</b></div>
        <input class="trx-input" id="trxNagad" placeholder="নগদ TrxID লিখুন" style="display:none">
      </label>
      <label class="pay-opt"><input type="radio" name="pay" value="card" class="pay-radio">
        <b>Card <span class="pay-bn">(কার্ড)</span></b>
        <span>ডেলিভারির সময় কার্ডে পেমেন্ট — অর্ডার কনফার্মের পর আমাদের প্রতিনিধি যোগাযোগ করবে।</span>
      </label>
      <label class="check-row"><input type="checkbox" id="coTerms" required> <span>আমি <a href="#terms" target="_blank">Terms &amp; Conditions</a> ও <a href="#returns" target="_blank">Return Policy</a> পড়েছি ও মেনে নিলাম *</span></label>
      <div class="err" id="coErr"></div>
    </div>
  </div><div class="card">
    <h3>অর্ডারের পণ্য</h3>
    ${cart.map((i) => { const p = prodById(i.id); if (!p) return ''; return `<div class="tot-row"><span>${esc(LANG === 'bn' ? p.nameBn : p.nameEn)} × ${i.qty}</span><b>${fmt(p.price * i.qty)}</b></div>`; }).join('')}
    <div class="tot-row"><span>Subtotal</span><b>${fmt(sub)}</b></div>
    <div class="tot-row"><span>Delivery</span><b id="coDel">জেলা নির্বাচন করুন</b></div>
    <div class="tot-row grand"><span>Total</span><b id="coTotal">${fmt(sub)}</b></div>
    <p style="font-size:13px; color:var(--muted); margin-top:10px">ডেলিভারি: ৩–৭ কর্মদিবস। কোনো অগ্রিম পেমেন্ট লাগে না (COD)।</p>
    <button class="btn btn-block" type="submit" style="margin-top:12px">Confirm Order <span id="coTotalBtn">${fmt(sub)}</span></button>
  </div></form></section>`;
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = $('#coForm button[type="submit"]');
  if (!btn || btn.disabled) return; /* already submitting — block duplicates */
  const name = $('#coName').value.trim();
  const phone = $('#coPhone').value.trim();
  const district = $('#coDistrict').value;
  const address = $('#coAddress').value.trim();
  const email = $('#coEmail').value.trim();
  const whats = $('#coWhats').value.trim();
  const note = $('#coNote').value.trim();
  const pay = (document.querySelector('input[name="pay"]:checked') || {}).value || 'cod';
  const err = $('#coErr');
  if (!name) { err.textContent = 'নাম দিন।'; return; }
  if (!validPhone(phone)) { err.textContent = 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)।'; return; }
  if (!district) { err.textContent = 'জেলা নির্বাচন করুন।'; return; }
  if (!address) { err.textContent = 'ঠিকানা দিন।'; return; }
  if ((pay === 'bkash' && !$('#trxBkash').value.trim()) || (pay === 'nagad' && !$('#trxNagad').value.trim())) {
    err.textContent = 'পেমেন্টের TrxID দিন।'; return;
  }
  err.textContent = '';
  btn.disabled = true;
  const btnLabel = btn.innerHTML;
  btn.innerHTML = 'অর্ডার প্রসেস হচ্ছে…';
  try {
    const sub = cartTotal();
    const del = deliveryFor(district);
    const total = sub + del;
    const orderId = 'AL-' + Math.floor(100000 + Math.random() * 900000);
    const order = {
      orderId, name, phone, district, address, email, whats, note, pay,
      trxId: pay === 'bkash' ? $('#trxBkash').value.trim() : (pay === 'nagad' ? $('#trxNagad').value.trim() : ''),
      items: cart.map((i) => ({ id: i.id, qty: i.qty, size: i.size, price: prodById(i.id)?.price || 0, name: prodById(i.id)?.nameEn || i.id })),
      subtotal: sub, delivery: del, total, stage: 'pending', courier: '', trackingNumber: '', dispatchDate: '',
      createdAt: new Date().toISOString(),
    };
    const remoteId = await saveOrder(order);
    if (!remoteId) { localOrders.push(order); saveLS('aura_orders_local', localOrders); }
    cart = [];
    saveLS('aura_cart', cart);
    updateBadges();
    saveLS('aura_last_order', order);
    location.hash = '#order-success/' + orderId;
  } catch (ex) {
    err.textContent = 'অর্ডার সেভ করা যায়নি। আবার চেষ্টা করুন।';
    btn.disabled = false;
    btn.innerHTML = btnLabel;
  }
}

function viewOrderSuccess(orderId) {
  const o = loadLS('aura_last_order', null);
  const order = (o && o.orderId === orderId) ? o : (localOrders.find((x) => x.orderId === orderId) || null);
  if (!order) return `<section class="section"><div class="empty"><h3>অর্ডার খুঁজে পাওয়া যায়নি</h3><p>অর্ডার আইডি: <b>${esc(orderId)}</b></p><div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap"><a class="btn" href="#home">হোমে ফিরুন</a><a class="btn btn-outline" href="#shop">Shop করুন</a></div></div></section>`;
  const payLabel = { cod: 'Cash on Delivery (ক্যাশ অন ডেলিভারি)', bkash: 'bKash (বিকাশ)', nagad: 'Nagad (নগদ)', card: 'Card (কার্ড)' }[(order.pay || '').toLowerCase()] || esc(order.pay || '');
  return `<section class="section"><div class="card" style="max-width:680px; margin:0 auto">
    <h2 style="color:var(--green); text-align:center">অর্ডার সফল হয়েছে!</h2>
    <p style="text-align:center; margin:10px 0">আপনার অর্ডার আইডি: <b style="font-size:22px; color:var(--navy)">${esc(orderId)}</b></p>
    <h3 style="margin:16px 0 6px; color:var(--navy)">অর্ডারের পণ্য</h3>
    ${(order.items || []).map((i) => `<div class="tot-row"><span>${esc(i.name)} × ${i.qty}${i.size ? ' (Size: ' + esc(i.size) + ')' : ''}</span><b>${fmt(i.price * i.qty)}</b></div>`).join('')}
    <div class="tot-row"><span>Subtotal</span><b>${fmt(order.subtotal)}</b></div>
    <div class="tot-row"><span>Delivery</span><b>${fmt(order.delivery)}</b></div>
    <div class="tot-row grand"><span>Total</span><b>${fmt(order.total)}</b></div>
    <h3 style="margin:16px 0 6px; color:var(--navy)">ডেলিভারি তথ্য</h3>
    <p style="font-size:14px">${esc(order.name)} • ${esc(order.phone)}<br>${esc(order.district)}<br>${esc(order.address)}</p>
    <p style="font-size:14px; margin-top:6px">পেমেন্ট: <b>${payLabel}</b></p>
    <p style="color:var(--muted); font-size:14px; margin-top:10px">অর্ডার কনফার্মের জন্য আমাদের প্রতিনিধি আপনার নম্বরে কল করবে। এই অর্ডার আইডিটি সংরক্ষণ করুন।</p>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap"><a class="btn" href="#track">Track Order</a><a class="btn btn-outline" href="#shop">Continue Shopping</a></div>
  </div></section>`;
}

/* ================= TRACK ORDER ================= */
function viewTrack() {
  return `<section class="section"><div class="card" style="max-width:640px; margin:0 auto">
    <h2 style="color:var(--navy)">Track Your Order</h2>
    <p style="color:var(--muted); font-size:14px; margin:8px 0">অর্ডার আইডি (যেমন: AL-123456) ও অর্ডার করার সময় দেওয়া মোবাইল নম্বর দিন।</p>
    <div class="field"><label>Order Number *</label><input id="trId" placeholder="AL-123456"></div>
    <div class="field"><label>Phone Number *</label><input id="trPhone" placeholder="01XXXXXXXXX"></div>
    <div class="err" id="trErr"></div>
    <button class="btn btn-block" id="trBtn">Track Order</button>
    <div id="trResult"></div>
  </div></section>`;
}

function stageLabel(key) {
  const s = STAGES.find((x) => x.key === key) || { bn: key, en: key };
  return LANG === 'bn' ? s.bn : s.en;
}

function renderTrackResult(o) {
  const el = $('#trResult');
  if (!o) { el.innerHTML = `<div class="empty"><h3>অর্ডার পাওয়া যায়নি</h3><p>অর্ডার আইডি ও মোবাইল নম্বর ঠিক আছে কিনা দেখুন।</p></div>`; return; }
  const stage = o.stage || 'pending';
  const idx = STAGES.findIndex((s) => s.key === stage);
  const visible = STAGES.filter((s) => s.key !== 'cancelled');
  const cancelled = stage === 'cancelled';
  el.innerHTML = `<div style="margin-top:18px">
    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px"><b>Order: ${esc(o.orderId)}</b><span class="status-pill ${cancelled ? 'cancelled' : (stage === 'delivered' ? 'delivered' : '')}">${stageLabel(stage)}</span></div>
    <p style="font-size:14px; color:var(--muted); margin-top:6px">মোট: ${fmt(o.total)} • পেমেন্ট: ${esc((o.pay || '').toUpperCase())} • ${esc(o.district || '')}</p>
    ${cancelled ? `<p style="color:var(--red); font-weight:700; margin-top:10px">এই অর্ডারটি বাতিল করা হয়েছে।${o.cancelReason ? ' কারণ: ' + esc(o.cancelReason) : ''}</p>` :
    `<div class="timeline">${visible.map((s) => { const si = STAGES.findIndex((x) => x.key === s.key); const cls = si < idx ? 'done' : (si === idx ? 'current' : ''); return `<div class="tl-step ${cls}"><b>${stageLabel(s.key)}</b><span>${si <= idx ? 'সম্পন্ন' : 'অপেক্ষমান'}</span></div>`; }).join('')}</div>`}
    ${o.courier ? `<div class="courier-box"><b>কুরিয়ার: ${esc(o.courier)}</b><br>Tracking Number: <b>${esc(o.trackingNumber || '-')}</b>${o.dispatchDate ? `<br>Dispatch Date: ${esc(o.dispatchDate)}` : ''}<br><span style="font-size:13px">কুরিয়ারের ওয়েবসাইটে এই ট্র্যাকিং নম্বর দিয়ে আরও বিস্তারিত দেখতে পারবেন।</span></div>` : ''}
    <div style="margin-top:10px"><b>Items:</b>${(o.items || []).map((i) => `<div class="tot-row"><span>${esc(i.name)} × ${i.qty}${i.size ? ' (Size: ' + esc(i.size) + ')' : ''}</span><b>${fmt(i.price * i.qty)}</b></div>`).join('')}</div>
  </div>`;
}

async function doTrack() {
  const id = $('#trId').value.trim();
  const phone = $('#trPhone').value.trim();
  if (!id || !phone) { $('#trErr').textContent = 'অর্ডার আইডি ও মোবাইল নম্বর দুটোই দিন।'; return; }
  $('#trErr').textContent = '';
  let o = await fetchOrder(id, phone);
  if (!o) o = localOrders.find((x) => x.orderId === id && x.phone === phone) || null;
  renderTrackResult(o);
}

/* ================= WISHLIST ================= */
function viewWishlist() {
  const list = PRODUCTS.filter((p) => wish.includes(p.id));
  return `<section class="section"><h2 style="color:var(--navy)">My Wishlist</h2>
  ${list.length ? `<div class="prod-row" style="margin-top:16px">${list.map(prodCard).join('')}</div>` : `<div class="empty"><h3>Wishlist খালি</h3><p>প্রোডাক্টের ♥ বাটনে চাপ দিয়ে wishlist-এ যোগ করুন।</p><a class="btn" href="#shop">Shop করুন</a></div>`}</section>`;
}

/* ================= REVIEWS ================= */
async function loadReviews(productId) {
  const box = $('#reviewsSection');
  if (!box) return;
  const remote = await fetchReviews(productId);
  const all = [...(seedReviews[productId] || []), ...remote.map((r) => ({ name: r.name, rating: r.rating, text: r.text, date: r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '', verified: !!r.verified }))];
  const avg = all.length ? (all.reduce((s, r) => s + r.rating, 0) / all.length) : 0;
  const counts = [5, 4, 3, 2, 1].map((n) => all.filter((r) => r.rating === n).length);
  box.innerHTML = `<div class="review-box"><h3>Customer Reviews</h3>
    ${all.length ? `<p><b>${avg.toFixed(1)} / 5</b> <span class="stars">${stars(avg)}</span> • ${all.length}টি রিভিউ</p>
    <div class="rating-break">${counts.map((c, i) => `<div class="rb"><span>${5 - i}★</span><div class="bar"><i style="width:${all.length ? Math.round(c / all.length * 100) : 0}%"></i></div><span>${c}</span></div>`).join('')}</div>
    ${all.map((r) => `<div class="review"><div class="stars">${stars(r.rating)}</div><b>${esc(r.name)}</b>${r.verified ? '<span class="verified">Verified Purchase</span>' : ''}<span class="rv-meta"> • ${esc(r.date)}</span><p>${esc(r.text)}</p></div>`).join('')}` : `<p style="color:var(--muted)">এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি দিন!</p>`}
    <h4 style="margin-top:16px">Write a Review</h4>
    <div class="field"><label>আপনার নাম *</label><input id="rvName" placeholder="নাম"></div>
    <div class="field"><label>রেটিং *</label><div class="star-input" id="rvStars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}">★</button>`).join('')}</div></div>
    <div class="field"><label>রিভিউ * (সর্বোচ্চ ৫০০ অক্ষর)</label><textarea id="rvText" rows="3" maxlength="500" placeholder="পণ্যটি কেমন লেগেছে?"></textarea></div>
    <div class="err" id="rvErr"></div>
    <button class="btn" id="rvSubmit">Submit Review</button>
    <p style="font-size:12px; color:var(--muted); margin-top:8px">রিভিউটি অ্যাডমিন অনুমোদনের পর প্রকাশিত হবে।</p></div>`;
  let chosen = 0;
  $$('#rvStars button').forEach((b) => b.addEventListener('click', () => {
    chosen = parseInt(b.dataset.star, 10);
    $$('#rvStars button').forEach((x) => x.classList.toggle('on', parseInt(x.dataset.star, 10) <= chosen));
  }));
  $('#rvSubmit').addEventListener('click', async () => {
    const name = $('#rvName').value.trim();
    const text = $('#rvText').value.trim();
    if (!name || !text) { $('#rvErr').textContent = 'নাম ও রিভিউ লিখুন।'; return; }
    if (!chosen) { $('#rvErr').textContent = 'রেটিং দিন।'; return; }
    const key = `aura_reviewed_${productId}_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) { $('#rvErr').textContent = 'আপনি আজ এই প্রোডাক্টে ইতিমধ্যে রিভিউ দিয়েছেন।'; return; }
    const ok = await submitReview({ productId, name, rating: chosen, text, verified: false });
    if (ok) { localStorage.setItem(key, '1'); toast('রিভিউ জমা হয়েছে — অনুমোদনের পর প্রকাশিত হবে।'); loadReviews(productId); }
    else { $('#rvErr').textContent = 'রিভিউ জমা দেওয়া যায়নি। আবার চেষ্টা করুন।'; }
  });
}

/* ================= INFO PAGES ================= */
function viewFaq() {
  return `<section class="section"><div class="info-page"><h1>সাধারণ প্রশ্ন (FAQ)</h1>${SEED_FAQS.map((f) => `<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false">${esc(f.q)} <span>+</span></button><div class="faq-a">${esc(f.a)}</div></div>`).join('')}</div></section>`;
}
function viewContact() {
  return `<section class="section"><div class="info-page"><h1>Contact Us</h1>
  <p>যেকোনো প্রশ্ন, অর্ডার বা অভিযোগের জন্য যোগাযোগ করুন:</p>
  <p><b>হটলাইন:</b> ${esc(SETTINGS.phone)} (সকাল ১০টা – রাত ৯টা)</p>
  <p><b>ইমেইল:</b> ${esc(SETTINGS.email)}</p>
  <p><b>ঠিকানা:</b> ${esc(SETTINGS.address)}</p>
  <p><b>WhatsApp:</b> <a href="https://wa.me/${esc(SETTINGS.whatsapp)}" target="_blank" rel="noopener" style="color:var(--green); font-weight:700">WhatsApp-এ মেসেজ করুন →</a></p>
  <form id="contactForm" style="margin-top:18px"><div class="field"><label>নাম *</label><input required></div><div class="field"><label>মোবাইল *</label><input required placeholder="01XXXXXXXXX"></div><div class="field"><label>মেসেজ *</label><textarea required rows="4"></textarea></div><button class="btn" type="submit">Send Message</button></form>
  </div></section>`;
}
function viewDelivery() {
  return `<section class="section"><div class="info-page"><h1>Delivery Info</h1>
  <h2>ডেলিভারি সময়</h2><p>ঢাকার ভিতরে (সিটি): ২৪–৪৮ ঘণ্টা। ঢাকার সাব-এরিয়া: ২–৩ দিন। ঢাকার বাইরে: ২–৪ কর্মদিবস।</p>
  <h2>ডেলিভারি চার্জ</h2><ul><li>ঢাকা সিটি: ${fmt(SETTINGS.deliveryCity)} টাকা</li><li>ঢাকা সাব-এরিয়া: ${fmt(SETTINGS.deliverySub)} টাকা</li><li>ঢাকার বাইরে: ${fmt(SETTINGS.deliveryOutside)} টাকা</li><li>${fmt(SETTINGS.freeAbove)} টাকা বা তার বেশি অর্ডারে ফ্রি ডেলিভারি</li></ul>
  <h2>কুরিয়ার</h2><p>আমরা Steadfast, Pathao Courier, Paperfly, Sundarban, SA Paribahan ও RedX-এর মাধ্যমে ডেলিভারি করি। অর্ডার ডিসপ্যাচ হলে ট্র্যাকিং নম্বর SMS/কলের মাধ্যমে জানিয়ে দেওয়া হয়।</p>
  <h2>অর্ডার ট্র্যাকিং</h2><p>Track Order পেজে অর্ডার আইডি ও মোবাইল নম্বর দিয়ে যেকোনো সময় অর্ডারের অবস্থা দেখতে পারবেন।</p></div></section>`;
}
function viewReturns() {
  return `<section class="section"><div class="info-page"><h1>Return &amp; Refund Policy</h1>
  <h2>৭ দিনের রিটার্ন / এক্সচেঞ্জ</h2><p>পণ্য হাতে পাওয়ার ৭ দিনের মধ্যে অব্যবহৃত অবস্থায় (ট্যাগসহ) রিটার্ন বা এক্সচেঞ্জ করা যাবে।</p>
  <h2>ক্ষতিগ্রস্ত / ভুল পণ্য</h2><p>পণ্য ক্ষতিগ্রস্ত বা ভুল আসলে আনবক্সিং ভিডিওসহ ৪৮ ঘণ্টার মধ্যে যোগাযোগ করুন — সম্পূর্ণ বিনামূল্যে রিপ্লেসমেন্ট দেওয়া হবে।</p>
  <h2>মন পরিবর্তন</h2><p>মন পরিবর্তনের কারণে রিটার্ন/এক্সচেঞ্জে রিটার্ন ডেলিভারি চার্জ কাস্টমারকে বহন করতে হবে।</p>
  <h2>রিফান্ড</h2><p>রিটার্ন পণ্য আমাদের গুদামে পৌঁছানোর ৭–১৫ কর্মদিবসের মধ্যে রিফান্ড প্রক্রিয়া সম্পন্ন হবে (বিকাশ/নগদ/ব্যাংক)। COD অর্ডারে রিফান্ড বিকাশ/নগদে দেওয়া হয়।</p>
  <h2>যোগাযোগ</h2><p>রিটার্নের জন্য হটলাইন ${esc(SETTINGS.phone)}-এ কল করুন বা Contact পেজে মেসেজ দিন।</p></div></section>`;
}
function viewPrivacy() {
  return `<section class="section"><div class="info-page"><h1>Privacy Policy</h1>
  <p><b>কার্যকর তারিখ:</b> ১৪ অক্টোবর ২০২৬</p>
  <h2>আমরা কী তথ্য সংগ্রহ করি</h2><p>অর্ডার প্রক্রিয়ার জন্য আমরা আপনার নাম, মোবাইল নম্বর, ঠিকানা, ইমেইল (ঐচ্ছিক) ও অর্ডারের তথ্য সংগ্রহ করি।</p>
  <h2>তথ্য ব্যবহার</h2><p>আপনার তথ্য শুধু অর্ডার ডেলিভারি, অর্ডার কনফার্মেশন ও কাস্টমার সার্ভিসের জন্য ব্যবহার করা হয়। আমরা আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না।</p>
  <h2>কুরিয়ার শেয়ারিং</h2><p>ডেলিভারির জন্য আপনার নাম, ফোন ও ঠিকানা শুধুমাত্র কুরিয়ার পার্টনারের সাথে শেয়ার করা হয়।</p>
  <h2>নিরাপত্তা</h2><p>আপনার তথ্য নিরাপদে সংরক্ষণ করা হয়। কোনো পেমেন্ট তথ্য (কার্ড নম্বর, PIN) আমরা সংগ্রহ বা সংরক্ষণ করি না।</p>
  <h2>যোগাযোগ</h2><p>তথ্য মুছতে বা জানতে চাইলে ${esc(SETTINGS.email)}-এ লিখুন।</p></div></section>`;
}
function viewTerms() {
  return `<section class="section"><div class="info-page"><h1>Terms &amp; Conditions</h1>
  <h2>সাধারণ শর্ত</h2><p>AURA LIFESTYLE থেকে কেনাকাটা করলে আপনি এই শর্তাবলী মেনে নিচ্ছেন।</p>
  <h2>মূল্য ও প্রাপ্যতা</h2><p>সব মূল্য বাংলাদেশি টাকায় (৳)। স্টক শেষ হলে অর্ডার বাতিল হতে পারে — সেক্ষেত্রে সম্পূর্ণ টাকা ফেরত দেওয়া হবে।</p>
  <h2>অর্ডার কনফার্মেশন</h2><p>অর্ডার দেওয়ার পর ফোনে কনফার্ম করা হয়। ভুল তথ্য দিলে অর্ডার বাতিল হতে পারে।</p>
  <h2>ডেলিভারি</h2><p>ডেলিভারি সময় আনুমানিক; আবহাওয়া বা কুরিয়ারজনিত বিলম্বের জন্য আমরা দায়ী নই, তবে সর্বোচ্চ চেষ্টা করবো।</p>
  <h2>রিটার্ন</h2><p>Return Policy অনুযায়ী রিটার্ন/এক্সচেঞ্জ প্রযোজ্য।</p>
  <h2>পরিবর্তন</h2><p>এই শর্তাবলী যেকোনো সময় পরিবর্তন হতে পারে; আপডেট এই পেজে প্রকাশ করা হবে।</p></div></section>`;
}
function viewAbout() {
  return `<section class="section"><div class="info-page"><h1>About AURA LIFESTYLE</h1>
  <p>AURA LIFESTYLE বাংলাদেশের একটি ইসলামিক লাইফস্টাইল ফ্যাশন ব্র্যান্ড। সুন্নাহ অনুসরণে পরিমার্জিত পোশাক, আতর ও লাইফস্টাইল পণ্য আমরা সেরা দামে পৌঁছে দিই।</p>
  <h2>আমাদের প্রতিশ্রুতি</h2><ul><li>যাচাই করা মানসম্মত পণ্য</li><li>স্বচ্ছ মূল্য — লুকানো চার্জ নেই</li><li>দ্রুত ডেলিভারি ও সহজ রিটার্ন</li><li>বিনয়ী কাস্টমার সার্ভিস</li></ul>
  <h2>যোগাযোগ</h2><p>${esc(SETTINGS.address)} • ${esc(SETTINGS.phone)} • ${esc(SETTINGS.email)}</p></div></section>`;
}

/* ================= flash timer + hero slider ================= */
function startFlashTimer() {
  setInterval(() => {
    const el = $('#countdown');
    if (!el) return;
    let left = Math.max(0, flashEnd - Date.now());
    const h = String(Math.floor(left / 3600000)).padStart(2, '0');
    const m = String(Math.floor(left % 3600000 / 60000)).padStart(2, '0');
    const s = String(Math.floor(left % 60000 / 1000)).padStart(2, '0');
    el.innerHTML = `<div class="cd"><b>${h}</b><span>ঘণ্টা</span></div><div class="cd"><b>${m}</b><span>মিনিট</span></div><div class="cd"><b>${s}</b><span>সেকেন্ড</span></div>`;
  }, 1000);
}

/* ================= per-page bindings ================= */
const _origBind = bindDynamic;
bindDynamic = function () {
  _origBind();
  /* newsletter */
  const nl = $('#nlForm');
  if (nl) nl.addEventListener('submit', (e) => { e.preventDefault(); const em = $('#nlEmail').value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { toast('সঠিক ইমেইল দিন'); return; } toast('সাবস্ক্রাইব হয়েছে — ধন্যবাদ!'); nl.reset(); });
  /* contact form */
  const cf = $('#contactForm');
  if (cf) cf.addEventListener('submit', (e) => { e.preventDefault(); toast('মেসেজ পাঠানো হয়েছে — আমরা যোগাযোগ করবো।'); cf.reset(); });
  /* hero carousel */
  const hc = $('#heroCarousel');
  if (hc) {
    const track = $('#hcTrack');
    const dots = $$('#hcDots button');
    let cur = 0, timer = null;
    const go = (i) => {
      cur = (i + 2) % 2;
      track.style.transform = `translateX(-${cur * 100}%)`;
      dots.forEach((d, di) => d.classList.toggle('on', di === cur));
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const start = () => { stop(); timer = setInterval(() => { if (!document.contains(hc)) { stop(); return; } go(cur + 1); }, 5000); };
    $('#hcPrev').addEventListener('click', () => { go(cur - 1); start(); });
    $('#hcNext').addEventListener('click', () => { go(cur + 1); start(); });
    dots.forEach((d) => d.addEventListener('click', () => { go(parseInt(d.dataset.i, 10)); start(); }));
    start();
  }
  /* shop filters */
  const fSort = $('#fSort');
  if (fSort) fSort.addEventListener('change', () => { const u = new URLSearchParams(location.hash.split('?')[1] || ''); u.set('sort', fSort.value); u.delete('page'); location.hash = '#shop?' + u.toString(); });
  const fMax = $('#fMax');
  if (fMax) fMax.addEventListener('change', () => { const u = new URLSearchParams(location.hash.split('?')[1] || ''); if (fMax.value === '0') u.delete('max'); else u.set('max', fMax.value); u.delete('page'); location.hash = '#shop?' + u.toString(); });
  const fPrice = $('#fPrice');
  if (fPrice) {
    const pMaxV = parseInt(fPrice.max, 10);
    fPrice.addEventListener('input', () => { const v = $('#fPriceVal'); if (v) v.textContent = fmt(parseInt(fPrice.value, 10)); });
    fPrice.addEventListener('change', () => {
      const u = new URLSearchParams(location.hash.split('?')[1] || '');
      const v = parseInt(fPrice.value, 10);
      if (v >= pMaxV) u.delete('max'); else u.set('max', String(v));
      u.delete('page'); location.hash = '#shop?' + u.toString();
    });
  }
  const fQ = $('#fQ');
  if (fQ) fQ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const u = new URLSearchParams(location.hash.split('?')[1] || ''); const v = fQ.value.trim(); if (v) u.set('q', v); else u.delete('q'); u.delete('page'); location.hash = '#shop?' + u.toString(); } });
  /* product detail */
  const pd = $('#sizeRow');
  if (pd) {
    let selSize = null, qty = 1;
    const pid = location.hash.split('/')[1];
    $$('#sizeRow .size-btn').forEach((b) => b.addEventListener('click', () => { selSize = b.dataset.size; $$('#sizeRow .size-btn').forEach((x) => x.classList.toggle('on', x === b)); $('#sizeErr').textContent = ''; }));
    $$('.pd-thumb').forEach((th) => th.addEventListener('click', () => {
      const main = $('#pdMain');
      if (main) main.src = th.dataset.src;
      $$('.pd-thumb').forEach((x) => x.classList.toggle('on', x === th));
    }));
    $('#qMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); $('#qVal').textContent = qty; });
    $('#qPlus').addEventListener('click', () => { qty = Math.min(99, qty + 1); $('#qVal').textContent = qty; });
    $('#pdAdd').addEventListener('click', () => { if (!selSize && prodById(pid)?.sizes?.length) { $('#sizeErr').textContent = 'সাইজ নির্বাচন করুন।'; return; } addToCart(pid, qty, selSize); });
    $('#pdBuy').addEventListener('click', () => { if (!selSize && prodById(pid)?.sizes?.length) { $('#sizeErr').textContent = 'সাইজ নির্বাচন করুন।'; return; } addToCart(pid, qty, selSize); location.hash = '#checkout'; });
    $('#pdWish').addEventListener('click', () => toggleWish(pid));
    $('#shareCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); toast('লিংক কপি হয়েছে'); } catch { toast('লিংক কপি করা যায়নি'); } });
    loadReviews(pid);
  }
  /* checkout */
  const co = $('#coForm');
  if (co) {
    co.addEventListener('submit', placeOrder);
    $$('input[name="pay"]').forEach((r) => r.addEventListener('change', () => {
      $$('.pay-opt').forEach((o) => {
        const checked = o.querySelector('input').checked;
        o.classList.toggle('sel', checked);
        const trx = o.querySelector('.trx-input');
        if (trx) trx.style.display = checked ? 'block' : 'none';
      });
    }));
    $('#coDistrict').addEventListener('change', () => {
      const d = deliveryFor($('#coDistrict').value);
      const sub = cartTotal();
      if (d === null) { $('#coDel').textContent = 'জেলা নির্বাচন করুন'; $('#coTotal').textContent = fmt(sub); $('#coTotalBtn').textContent = fmt(sub); }
      else { $('#coDel').textContent = fmt(d); $('#coTotal').textContent = fmt(sub + d); $('#coTotalBtn').textContent = fmt(sub + d); }
    });
  }
  /* track */
  const tr = $('#trBtn');
  if (tr) tr.addEventListener('click', doTrack);
};

/* expose inline handlers */
window.setQty = setQty;
window.removeItem = removeItem;

init();
