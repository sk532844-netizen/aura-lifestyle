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
  coupons: 'coupons',
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
  manager: ['dashboard', 'products', 'categories', 'orders', 'reviews', 'combos', 'newsletter', 'import'],
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

/* অর্ডার প্লেস হলে স্টক কমানো — size-wise, transaction-এ (race-safe)।
   Combo line-item skip (size তথ্য নেই); stock field না থাকলে skip। */
export async function decrementStock(items) {
  const f = await fb();
  if (!f) return false;
  try {
    await f.fFns.runTransaction(f.db, async (tx) => {
      for (const it of items || []) {
        if (!it || it.combo || it.comboId) continue;
        const ref = f.fFns.doc(f.db, C.products, it.id);
        const snap = await tx.get(ref);
        if (!snap.exists()) continue;
        const p = snap.data();
        const q = Math.max(1, Number(it.qty) || 1);
        if (it.size && p.sizeStock && typeof p.sizeStock === 'object' && p.sizeStock[it.size] !== undefined) {
          const cur = Number(p.sizeStock[it.size]) || 0;
          tx.update(ref, { [`sizeStock.${it.size}`]: Math.max(0, cur - q) });
        } else if (p.stock !== undefined && p.stock !== null) {
          const cur = Number(p.stock) || 0;
          tx.update(ref, { stock: Math.max(0, cur - q) });
        }
      }
    });
    return true;
  } catch (e) { console.warn('[AURA] decrementStock failed:', e); return false; }
}

/* Live stock — products collection-এ change হলে callback(arr)।
   Returns: unsubscribe function (Promise)। */
export async function subscribeProducts(cb) {
  const f = await fb();
  if (!f) return () => {};
  try {
    return f.fFns.onSnapshot(f.fFns.collection(f.db, C.products), (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      try { cb(arr); } catch (e) { console.warn('[AURA] subscribeProducts cb failed:', e); }
    });
  } catch (e) { console.warn('[AURA] subscribeProducts failed:', e); return () => {}; }
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

/* Customer: নিজের অর্ডারে cancel request (pending/confirmed stage-এ)।
   Rules: owner নিজের order update করতে পারে। Stock restore হয় না এখানে —
   সেটা staff confirm করলে confirmOrderCancel-এ হবে। */
export async function requestOrderCancel(docId) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.updateDoc(f.fFns.doc(f.db, C.orders, docId), {
      cancelRequested: true, cancelRequestedAt: f.fFns.serverTimestamp(),
      updatedAt: f.fFns.serverTimestamp(),
    });
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* Staff: cancel confirm + stock auto-restore (transaction, idempotent)।
   Combo line-item skip (stock কমেনি); stockRestored flag → double-restore রোধ।
   Mirror (orderStatus) আপডেটও এখানেই হয়। */
export async function confirmOrderCancel(docId) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const orderRef = f.fFns.doc(f.db, C.orders, docId);
    const result = await f.fFns.runTransaction(f.db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) return { ok: false, error: 'not-found' };
      const o = snap.data();
      if ((o.stage || 'pending') === 'cancelled') return { ok: true, already: true, orderId: o.orderId };
      let restored = false;
      if (!o.stockRestored) {
        for (const it of o.items || []) {
          if (!it || it.combo || it.comboId) continue;
          const ref = f.fFns.doc(f.db, C.products, it.id);
          const psnap = await tx.get(ref);
          if (!psnap.exists()) continue;
          const p = psnap.data();
          const q = Math.max(1, Number(it.qty) || 1);
          if (it.size && p.sizeStock && typeof p.sizeStock === 'object' && p.sizeStock[it.size] !== undefined) {
            const cur = Number(p.sizeStock[it.size]) || 0;
            tx.update(ref, { [`sizeStock.${it.size}`]: cur + q });
          } else if (p.stock !== undefined && p.stock !== null) {
            const cur = Number(p.stock) || 0;
            tx.update(ref, { stock: cur + q });
          }
        }
        restored = true;
      }
      tx.update(orderRef, {
        stage: 'cancelled', stockRestored: true,
        cancelRequested: false, updatedAt: f.fFns.serverTimestamp(),
      });
      return { ok: true, restored, orderId: o.orderId };
    });
    if (result.ok && result.orderId) {
      try { await updateOrderStatusByOrderId(result.orderId, 'cancelled'); } catch (e) { console.warn('[AURA] cancel mirror failed:', e); }
    }
    return result;
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

/* ---------- customer profile: নিজের cart + order history (users/{uid}) ----------
   Rules: users/{uid} নিজেরটা নিজে read/write করতে পারে — নতুন collection লাগে না। */
export async function getMyProfile(uid) {
  const f = await fb();
  if (!f || !uid) return null;
  try {
    const snap = await f.fFns.getDoc(f.fFns.doc(f.db, C.users, uid));
    return snap.exists() ? snap.data() : {};
  } catch (e) { console.warn('[AURA] getMyProfile failed:', e); return null; }
}
/* অ্যাকাউন্টের কার্ট সার্ভারে সেভ (login/logout/device বদলে ফিরে পেতে) */
export async function saveMyCart(uid, cart) {
  const f = await fb();
  if (!f || !uid) return { ok: false };
  try {
    await f.fFns.setDoc(f.fFns.doc(f.db, C.users, uid),
      { cart: Array.isArray(cart) ? cart : [], cartUpdatedAt: f.fFns.serverTimestamp() },
      { merge: true });
    return { ok: true };
  } catch (e) { console.warn('[AURA] saveMyCart failed:', e); return { ok: false }; }
}
/* অর্ডার প্লেস হলে নিজের orderIds-এ doc-id যোগ (My Orders list-এর জন্য) */
export async function appendMyOrder(uid, orderDocId) {
  const f = await fb();
  if (!f || !uid || !orderDocId) return { ok: false };
  try {
    await f.fFns.setDoc(f.fFns.doc(f.db, C.users, uid),
      { orderIds: f.fFns.arrayUnion(String(orderDocId)), updatedAt: f.fFns.serverTimestamp() },
      { merge: true });
    return { ok: true };
  } catch (e) { console.warn('[AURA] appendMyOrder failed:', e); return { ok: false }; }
}
/* নিজের অর্ডার: users/{uid}.orderIds → orders/{docId} get (list-rule ছাড়াই, তাই customer-ও দেখতে পারে) */
export async function fetchMyOrders(uid) {
  const f = await fb();
  if (!f || !uid) return [];
  try {
    const prof = await getMyProfile(uid);
    const ids = (prof && Array.isArray(prof.orderIds) ? prof.orderIds : []).slice(-50);
    if (!ids.length) return [];
    const snaps = await Promise.all(
      ids.map((id) => f.fFns.getDoc(f.fFns.doc(f.db, C.orders, String(id))).catch(() => null)));
    const list = [];
    snaps.forEach((s) => { if (s && s.exists()) list.push({ id: s.id, ...s.data() }); });
    list.sort((a, b) => String(b.createdAt || '') < String(a.createdAt || '') ? -1 : 1);
    return list;
  } catch (e) { console.warn('[AURA] fetchMyOrders failed:', e); return []; }
}

/* ================= COUPONS ================= */

const normCode = (c) => String(c || '').toUpperCase().trim();
/* coupon validity check — reasons: bad/inactive/notstarted/expired/limit/used/min */
export function couponCheck(cp, sub, uid) {
  if (!cp) return 'bad';
  if (cp.active === false) return 'inactive';
  const today = new Date().toISOString().slice(0, 10);
  if (cp.startsAt && today < cp.startsAt) return 'notstarted';
  if (cp.endsAt && today > cp.endsAt) return 'expired';
  if ((cp.maxUses || 0) > 0 && (cp.usedCount || 0) >= cp.maxUses) return 'limit';
  if (uid && Array.isArray(cp.usedBy) && cp.usedBy.includes(uid)) return 'used';
  if ((cp.minOrder || 0) > 0 && sub < cp.minOrder) return 'min';
  return 'ok';
}

/* Checkout: code দিয়ে coupon পড়া (public get — code জানা থাকতে হবে) */
export async function getCoupon(code) {
  const f = await fb();
  if (!f) return null;
  try {
    const snap = await f.fFns.getDoc(f.fFns.doc(f.db, C.coupons, normCode(code)));
    return snap.exists() ? { code: snap.id, ...snap.data() } : null;
  } catch (e) { console.warn('[AURA] getCoupon failed:', e); return null; }
}

/* Checkout: coupon claim — transaction-এ re-validate + usedCount+1 (race-safe) */
export async function claimCoupon(code, uid, sub) {
  const f = await fb();
  if (!f) return { ok: false, reason: 'bad' };
  const ref = f.fFns.doc(f.db, C.coupons, normCode(code));
  try {
    return await f.fFns.runTransaction(f.db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return { ok: false, reason: 'bad' };
      const cp = { code: snap.id, ...snap.data() };
      const st = couponCheck(cp, sub, uid);
      if (st !== 'ok') return { ok: false, reason: st, coupon: cp };
      const upd = { usedCount: (cp.usedCount || 0) + 1, updatedAt: f.fFns.serverTimestamp() };
      if (uid) upd.usedBy = f.fFns.arrayUnion(uid);
      tx.update(ref, upd);
      return { ok: true, coupon: cp };
    });
  } catch (e) { console.warn('[AURA] claimCoupon failed:', e); return { ok: false, reason: 'bad' }; }
}

/* Admin: সব কুপন */
export async function fetchCoupons() {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const q = f.fFns.query(f.fFns.collection(f.db, C.coupons));
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ code: d.id, ...d.data() }));
    list.sort((a, b) => String(a.code).localeCompare(String(b.code)));
    return { ok: true, coupons: list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

/* Admin: কুপন save (doc ID = code) */
export async function saveCoupon(data) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const code = normCode(data.code);
    if (!code) return { ok: false, error: 'code' };
    const { code: _c, ...rest } = data;
    await f.fFns.setDoc(f.fFns.doc(f.db, C.coupons, code), {
      ...rest, code, updatedAt: f.fFns.serverTimestamp(),
    }, { merge: true });
    return { ok: true, code };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function deleteCoupon(code) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.deleteDoc(f.fFns.doc(f.db, C.coupons, normCode(code)));
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
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

/* ================= COMBOS ================= */
const COMBOS = 'combos';

export async function fetchCombos() {
  const f = await fb();
  if (!f) return [];
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, COMBOS),
      f.fFns.where('visible', '==', true),
      f.fFns.orderBy('createdAt', 'desc'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) { console.warn('[AURA] fetchCombos failed:', e); return []; }
}

export async function fetchAllCombos() {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const q = f.fFns.query(
      f.fFns.collection(f.db, COMBOS),
      f.fFns.orderBy('createdAt', 'desc'),
    );
    const snap = await f.fFns.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return { ok: true, combos: list };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function saveCombo(combo) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const data = { ...combo, updatedAt: f.fFns.serverTimestamp() };
    if (combo.id) {
      await f.fFns.updateDoc(f.fFns.doc(f.db, COMBOS, combo.id), data);
      return { ok: true, id: combo.id };
    }
    data.createdAt = f.fFns.serverTimestamp();
    const ref = await f.fFns.addDoc(f.fFns.collection(f.db, COMBOS), data);
    return { ok: true, id: ref.id };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

export async function deleteCombo(id) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    await f.fFns.deleteDoc(f.fFns.doc(f.db, COMBOS, id));
    return { ok: true };
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
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
