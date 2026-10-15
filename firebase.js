/* AURA LIFESTYLE — Firebase / Firestore layer (real implementation).
   Auth (email/password) + Firestore, lazy-loaded from CDN.
   Demo fallback: যতক্ষণ FIREBASE_CONFIG-এ আসল মান বসানো না হয়,
   সাইট seed data + localStorage-এ চলে (কিছুই ভাঙে না)।

   ── SETUP (বিস্তারিত: ADMIN_SETUP.md) ──────────────────────────
   1. console.firebase.google.com → নতুন project (Spark/free)
   2. Authentication → Email/Password চালু → admin user বানান → UID কপি
   3. Firestore Database → asia-south1 রিজিয়নে তৈরি
   4. নিচে FIREBASE_CONFIG-এ ৬টা মান paste করুন
   5. firestore.rules-এ ADMIN_UIDS-এ UID বসিয়ে rules deploy করুন
   6. admin.html খুলে admin email/password দিয়ে লগইন করুন

   Collections: products, settings, orders, newsletterNumbers, reviews, users
*/

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDo4hHOQ4ias2uYgZdXdhBsQRzwpsb-6SU',
  authDomain: 'gen-lang-client-0710305331.firebaseapp.com',
  projectId: 'gen-lang-client-0710305331',
  storageBucket: 'gen-lang-client-0710305331.firebasestorage.app',
  messagingSenderId: '173208116710',
  appId: '1:173208116710:web:5fbd5c31b7be0e4f058a27',
};

const PLACEHOLDER = 'PASTE_YOUR_';
const SDK = 'https://www.gstatic.com/firebasejs/10.12.5';

const C = {
  products: 'products',
  settings: 'settings',
  orders: 'orders',
  orderStatus: 'orderStatus',
  newsletter: 'newsletterNumbers',
  reviews: 'reviews',
  users: 'users',
  staff: 'staff',
};

/* Owner UID — firestore.rules-এর ownerUid()-এর সাথে মিলিয়ে রাখুন */
export const OWNER_UID = 'SNSSuBuLbgRSQy4moDwz6rWnYmv1';

/* ---------- size-wise stock ---------- */
/* sizeStock: { M: 5, L: 0 } — না থাকলে legacy `stock` fallback (সব সাইজে সমান) */
export function sizeQty(p, size) {
  if (!p) return 0;
  const ss = p.sizeStock;
  if (ss && typeof ss === 'object' && size != null && ss[size] !== undefined) return Number(ss[size]) || 0;
  if (p.stock !== undefined && p.stock !== null) return Number(p.stock) || 0;
  return Infinity; /* stock info নেই — ব্লক করবো না */
}
export function totalStock(p) {
  if (!p) return 0;
  if (p.sizeStock && typeof p.sizeStock === 'object' && Object.keys(p.sizeStock).length)
    return Object.values(p.sizeStock).reduce((s, q) => s + (Number(q) || 0), 0);
  return Number(p.stock) || 0;
}
export function isOutOfStock(p) {
  if (!p || p.visible === false) return false;
  const sizes = p.sizes || [];
  if (!sizes.length) return totalStock(p) <= 0;
  return sizes.every((s) => sizeQty(p, s) <= 0);
}

/* ---------- role → tab presets (staff doc-এ tabs না থাকলে fallback) ---------- */
export const ROLE_TABS_PRESET = {
  manager: ['dashboard', 'products', 'categories', 'orders', 'reviews', 'newsletter', 'import'],
  assistant: ['orders'],
};
export function tabsForRole(role) { return [...(ROLE_TABS_PRESET[role] || [])]; }
export function orderFullForRole(role) { return role === 'manager'; }

let _fb = null;      /* { app, auth, db, aFns, fFns } */
let _fbPromise = null; /* init চলাকালীন concurrent call-রা একই promise await করে (race fix) */
let _initTried = false;

export function isConfigured() {
  return Object.values(FIREBASE_CONFIG).every(
    (v) => typeof v === 'string' && v.length > 0 && !v.startsWith(PLACEHOLDER),
  );
}

/* Lazy-load Firebase SDK; null = demo mode (config missing/offline). */
async function fb() {
  if (_fb) return _fb;
  if (_fbPromise) return _fbPromise;
  if (_initTried) return null;
  _initTried = true;
  if (!isConfigured()) return null;
  _fbPromise = (async () => {
    try {
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-auth.js`),
        import(`${SDK}/firebase-firestore.js`),
      ]);
      const app = appMod.initializeApp(FIREBASE_CONFIG);
      _fb = {
        app,
        auth: authMod.getAuth(app),
        db: fsMod.getFirestore(app),
        aFns: authMod,
        fFns: fsMod,
        appMod,
      };
      return _fb;
    } catch (e) {
      console.warn('[AURA] Firebase init failed, using local mode:', e);
      return null;
    }
  })();
  return _fbPromise;
}

function friendlyAuthError(e) {
  const code = (e && e.code) || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found')
    return 'ইমেইল বা পাসওয়ার্ড ভুল।';
  if (code === 'auth/email-already-in-use') return 'এই ইমেইল দিয়ে অ্যাকাউন্ট আছে — লগইন করুন।';
  if (code === 'auth/weak-password') return 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
  if (code === 'auth/invalid-email') return 'সঠিক ইমেইল ঠিকানা দিন।';
  if (code === 'auth/too-many-requests') return 'অনেকবার চেষ্টা হয়েছে — কিছুক্ষণ পর আবার চেষ্টা করুন।';
  if (code === 'auth/network-request-failed') return 'ইন্টারনেট সংযোগ চেক করুন।';
  return 'লগইনে সমস্যা হয়েছে। আবার চেষ্টা করুন।';
}

/* ================= AUTH ================= */

export async function signUp(email, password, name) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const cred = await f.aFns.createUserWithEmailAndPassword(f.auth, email.trim(), password);
    /* display name */
    if (name && f.aFns.updateProfile) {
      try { await f.aFns.updateProfile(cred.user, { displayName: name.trim() }); } catch { /* best-effort */ }
    }
    /* customer profile doc (for order history) */
    try {
      await f.fFns.setDoc(f.fFns.doc(f.db, C.users, cred.user.uid), {
        name: (name || '').trim(), email: email.trim().toLowerCase(), createdAt: f.fFns.serverTimestamp(),
      });
    } catch { /* profile write is best-effort */ }
    return { ok: true, user: cred.user };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export async function signIn(email, password) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const cred = await f.aFns.signInWithEmailAndPassword(f.auth, email.trim(), password);
    return { ok: true, user: cred.user };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

export async function signOut() {
  const f = await fb();
  if (!f) return;
  try { await f.aFns.signOut(f.auth); } catch (e) { console.warn('[AURA] signOut:', e); }
}

export async function resetPassword(email) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.aFns.sendPasswordResetEmail(f.auth, email.trim());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  }
}

/* cb(user|null) — ডেমো মোডে সঙ্গে সঙ্গে cb(null) */
export function onAuthState(cb) {
  fb().then((f) => {
    if (f) f.aFns.onAuthStateChanged(f.auth, cb);
    else cb(null);
  });
  return () => {};
}

export function currentUser() {
  return _fb && _fb.auth ? _fb.auth.currentUser : null;
}

/* ================= PRODUCTS ================= */

/* null = ডেমো মোড (storefront তখন seed data ব্যবহার করে) */
export async function fetchProducts() {
  try {
    const f = await fb();
    if (!f) return null;
    const snap = await f.fFns.getDocs(f.fFns.collection(f.db, C.products));
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list.length ? list : null;
  } catch (e) { console.warn('[AURA] fetchProducts fallback:', e); return null; }
}

export async function saveProduct(p) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.setDoc(
      f.fFns.doc(f.db, C.products, p.id),
      { ...p, updatedAt: f.fFns.serverTimestamp() },
      { merge: true },
    );
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function deleteProduct(id) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.deleteDoc(f.fFns.doc(f.db, C.products, id));
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* ================= SETTINGS ================= */

export async function fetchSettings() {
  try {
    const f = await fb();
    if (!f) return null;
    const snap = await f.fFns.getDoc(f.fFns.doc(f.db, C.settings, 'main'));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.warn('[AURA] fetchSettings fallback:', e); return null; }
}

export async function saveSettings(s) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.setDoc(
      f.fFns.doc(f.db, C.settings, 'main'),
      { ...s, updatedAt: f.fFns.serverTimestamp() },
      { merge: true },
    );
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* ================= ORDERS ================= */

/* Contract (storefront নির্ভর করে): সফল হলে Firestore doc id, ডেমো/ব্যর্থতায় null */
export async function saveOrder(order) {
  const f = await fb();
  if (!f) return null;
  try {
    const ref = await f.fFns.addDoc(f.fFns.collection(f.db, C.orders), {
      ...order, createdAt: f.fFns.serverTimestamp(),
    });
    /* Public status mirror — guest tracking (orderId দিয়ে) এর জন্য।
       Customer data নেই, শুধু orderId + status + updatedAt। */
    try {
      if (order && order.orderId) {
        await f.fFns.setDoc(f.fFns.doc(f.db, C.orderStatus, String(order.orderId)), {
          orderId: String(order.orderId),
          status: order.stage || 'pending',
          updatedAt: f.fFns.serverTimestamp(),
        });
      }
    } catch (e) { console.warn('[AURA] orderStatus mirror failed:', e); }
    return ref.id;
  } catch (e) { console.warn('[AURA] saveOrder failed:', e); return null; }
}

/* Guest tracking: public mirror থেকে শুধু status (customer data ছাড়া) */
export async function fetchOrderStatus(orderId) {
  try {
    const f = await fb();
    if (!f) return null;
    const snap = await f.fFns.getDoc(f.fFns.doc(f.db, C.orderStatus, String(orderId)));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) { console.warn('[AURA] fetchOrderStatus failed:', e); return null; }
}

/* NOTE: Security Rules-এ orders পড়তে পারে শুধু admin বা অর্ডারের মালিক।
   Guest track (orderId+phone) Firestore-এ permission পাবে না — তখন null
   ফেরে, storefront ডেমো/localStorage fallback ব্যবহার করে। */
export async function fetchOrder(orderId, phone) {
  try {
    const f = await fb();
    if (!f) return null;
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.orders),
      f.fFns.where('orderId', '==', orderId),
      f.fFns.where('phone', '==', phone),
    );
    const snap = await f.fFns.getDocs(q);
    let found = null;
    snap.forEach((d) => { found = { id: d.id, ...d.data() }; });
    return found;
  } catch (e) { console.warn('[AURA] fetchOrder failed:', e); return null; }
}

/* Admin: সব অর্ডার, নতুন আগে */
export async function fetchOrders() {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.orders),
      f.fFns.orderBy('createdAt', 'desc'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return { ok: true, orders: list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function updateOrderStatus(docId, stage) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.updateDoc(f.fFns.doc(f.db, C.orders, docId), {
      stage, updatedAt: f.fFns.serverTimestamp(),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* Admin: payment verified toggle */
export async function setOrderPaid(docId, paid) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.updateDoc(f.fFns.doc(f.db, C.orders, docId), {
      paid: !!paid, updatedAt: f.fFns.serverTimestamp(),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* Admin: paid toggle-এর সাথে public mirror-ও আপডেট */
export async function setOrderPaidByOrderId(orderId, paid) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.setDoc(f.fFns.doc(f.db, C.orderStatus, String(orderId)), {
      orderId: String(orderId), paid: !!paid,
      updatedAt: f.fFns.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* Admin: status বদলের সাথে public mirror-ও আপডেট (orderId জানা থাকলে) */
export async function updateOrderStatusByOrderId(orderId, stage) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.setDoc(f.fFns.doc(f.db, C.orderStatus, String(orderId)), {
      orderId: String(orderId), status: stage,
      updatedAt: f.fFns.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* লগইন করা কাস্টমারের নিজের অর্ডার (composite index এড়াতে client-side sort) */
export async function fetchUserOrders(uid) {
  const f = await fb();
  if (!f) return [];
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.orders),
      f.fFns.where('uid', '==', uid),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    list.sort((a, b) => String(b.createdAt || '') < String(a.createdAt || '') ? -1 : 1);
    return list;
  } catch (e) { console.warn('[AURA] fetchUserOrders failed:', e); return []; }
}

/* ================= NEWSLETTER (WhatsApp numbers) ================= */

export async function saveNewsletterNumber(number) {
  const f = await fb();
  if (!f) return false;
  try {
    await f.fFns.addDoc(f.fFns.collection(f.db, C.newsletter), {
      number: String(number).trim(), createdAt: f.fFns.serverTimestamp(),
    });
    return true;
  } catch (e) { console.warn('[AURA] saveNewsletterNumber failed:', e); return false; }
}

export async function fetchNewsletterNumbers() {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.newsletter),
      f.fFns.orderBy('createdAt', 'desc'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return { ok: true, numbers: list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* ================= REVIEWS ================= */

export async function fetchReviews(productId) {
  try {
    const f = await fb();
    if (!f) return [];
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.reviews),
      f.fFns.where('productId', '==', productId),
      f.fFns.where('status', '==', 'approved'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) { console.warn('[AURA] fetchReviews failed:', e); return []; }
}

/* সরাসরি প্রকাশ (storefront-এ "অ্যাডমিন অনুমোদন" নোটিশ নেই) */
export async function submitReview(review) {
  const f = await fb();
  if (!f) return false;
  try {
    await f.fFns.addDoc(f.fFns.collection(f.db, C.reviews), {
      ...review, status: 'approved', createdAt: f.fFns.serverTimestamp(),
    });
    return true;
  } catch (e) { console.warn('[AURA] submitReview failed:', e); return false; }
}

/* Admin: সব রিভিউ (spam ডিলিটের জন্য) */export async function fetchAllReviews() {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.reviews),
      f.fFns.orderBy('createdAt', 'desc'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return { ok: true, reviews: list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function deleteReview(id) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.deleteDoc(f.fFns.doc(f.db, C.reviews, id));
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* Homepage "Customer Reviews" — admin থেকে homepage-ফ্ল্যাগ দেওয়া রিভিউ */
export async function fetchHomepageReviews() {
  const f = await fb();
  if (!f) return [];
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, C.reviews),
      f.fFns.where('homepage', '==', true),
      f.fFns.orderBy('createdAt', 'desc'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) { console.warn('[AURA] fetchHomepageReviews failed:', e); return []; }
}

/* ================= STAFF ROLES ================= */
/* Role: 'owner' | 'manager' | 'assistant' | 'none' */

export async function fetchMyRole() {
  const f = await fb();
  if (!f) return { ok: false, demo: true, role: 'none', tabs: [], suspended: false };
  const user = f.auth.currentUser;
  if (!user) return { ok: true, role: 'none', tabs: [], suspended: false };
  if (user.uid === OWNER_UID) return { ok: true, role: 'owner', tabs: ['*'], suspended: false };
  try {
    const snap = await f.fFns.getDoc(f.fFns.doc(f.db, C.staff, user.uid));
    if (!snap.exists()) return { ok: true, role: 'none', tabs: [], suspended: false };
    const d = snap.data();
    if (d.suspended === true) return { ok: true, role: 'none', tabs: [], suspended: true };
    const role = d.role || 'none';
    const tabs = Array.isArray(d.tabs) ? d.tabs : tabsForRole(role);
    const orderFull = d.orderFull !== undefined ? !!d.orderFull : orderFullForRole(role);
    return { ok: true, role: ['manager', 'assistant'].includes(role) ? role : 'none', tabs, orderFull, suspended: false };
  } catch (e) {
    return { ok: false, role: 'none', tabs: [], suspended: false, error: String((e && e.message) || e) };
  }
}

/* Owner প্যানেল থেকে সরাসরি staff auth account বানানো (secondary app — main session বদলায় না) */
export async function createStaffAccount(email, password) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  let app2 = null;
  try {
    app2 = f.appMod.initializeApp(
      { apiKey: FIREBASE_CONFIG.apiKey, authDomain: FIREBASE_CONFIG.authDomain, projectId: FIREBASE_CONFIG.projectId },
      'staff-creator-' + Date.now(),
    );
    const auth2 = f.aFns.getAuth(app2);
    const cred = await f.aFns.createUserWithEmailAndPassword(auth2, email.trim(), password);
    const uid = cred.user.uid;
    await f.aFns.signOut(auth2);
    return { ok: true, uid };
  } catch (e) {
    return { ok: false, error: friendlyAuthError(e) };
  } finally {
    if (app2) { try { await f.appMod.deleteApp(app2); } catch { /* ignore */ } }
  }
}

/* ================= IMGBB (free image upload — no billing needed) ================= */

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/* file → ImgBB → public URL. apiKey: Settings → ImgBB API Key (imgbb.com, free) */
export async function uploadProductImage(file, productId, apiKey) {
  if (!apiKey) return { ok: false, error: 'ImgBB API Key নেই — Admin → Settings → ImgBB API Key দিন (imgbb.com থেকে ফ্রি)।' };
  try {
    const b64 = await blobToBase64(file);
    const form = new FormData();
    form.append('key', apiKey);
    form.append('image', String(b64).split(',')[1]);
    form.append('name', 'aura-' + Date.now());
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
    const j = await res.json();
    if (j && j.success && j.data && j.data.url) return { ok: true, url: j.data.url };
    return { ok: false, error: (j && j.error && j.error.message) || 'আপলোড ব্যর্থ হয়েছে।' };
  } catch (e) {
    return { ok: false, error: 'আপলোড ব্যর্থ — ইন্টারনেট চেক করুন।' };
  }
}

/* ImgBB-তে ডিলিট tracking জটিল — ছবি ওদের সার্ভারেই থাকে (ফ্রি লিমিটে সমস্যা নেই) */
export async function deleteProductImage(urlOrPath) {
  return { ok: true, skipped: true };
}

export async function fetchStaffList() {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const snap = await f.fFns.getDocs(f.fFns.collection(f.db, C.staff));
    const list = [];
    snap.forEach((d) => list.push({ uid: d.id, ...d.data() }));
    return { ok: true, staff: list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function saveStaff(uid, data) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.setDoc(
      f.fFns.doc(f.db, C.staff, uid),
      { ...data, updatedAt: f.fFns.serverTimestamp() },
      { merge: true },
    );
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function removeStaff(uid) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.deleteDoc(f.fFns.doc(f.db, C.staff, uid));
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
