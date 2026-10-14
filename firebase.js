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
  apiKey: 'PASTE_YOUR_API_KEY_HERE',
  authDomain: 'PASTE_YOUR_PROJECT_ID_HERE.firebaseapp.com',
  projectId: 'PASTE_YOUR_PROJECT_ID_HERE',
  storageBucket: 'PASTE_YOUR_PROJECT_ID_HERE.appspot.com',
  messagingSenderId: 'PASTE_YOUR_SENDER_ID_HERE',
  appId: 'PASTE_YOUR_APP_ID_HERE',
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
};

let _fb = null;      /* { app, auth, db, aFns, fFns } */
let _initTried = false;

export function isConfigured() {
  return Object.values(FIREBASE_CONFIG).every(
    (v) => typeof v === 'string' && v.length > 0 && !v.startsWith(PLACEHOLDER),
  );
}

/* Lazy-load Firebase SDK; null = demo mode (config missing/offline). */
async function fb() {
  if (_fb) return _fb;
  if (_initTried) return null;
  _initTried = true;
  if (!isConfigured()) return null;
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
    };
    return _fb;
  } catch (e) {
    console.warn('[AURA] Firebase init failed, using local mode:', e);
    return null;
  }
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

export async function signUp(email, password) {
  const f = await fb();
  if (!f) return { ok: false, demo: true };
  try {
    const cred = await f.aFns.createUserWithEmailAndPassword(f.auth, email.trim(), password);
    /* customer profile doc (for order history) */
    try {
      await f.fFns.setDoc(f.fFns.doc(f.db, C.users, cred.user.uid), {
        email: email.trim().toLowerCase(), createdAt: f.fFns.serverTimestamp(),
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

/* Admin: সব রিভিউ (spam ডিলিটের জন্য) */
export async function fetchAllReviews() {
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
