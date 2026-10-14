/* AURA LIFESTYLE — Firebase / Firestore layer.
   Pattern follows MassBook (~/workspace/mess-hisab/src/lib/firebase.js):
   lazy init, friendly "not configured" state, never crashes the site.

   ── SETUP ──────────────────────────────────────────────────────
   1. Firebase Console (console.firebase.google.com) → create project
   2. Build → Firestore Database → Create database (production mode)
   3. Project settings → "Your apps" → Web app → copy config
   4. Paste the values into FIREBASE_CONFIG below.
   5. Firestore rules (for this shop — public product reads, order writes):
        rules_version = '2';
        service cloud.firestore {
          match /databases/{db}/documents {
            match /aura_products/{id}   { allow read: if true; }
            match /aura_settings/{id}   { allow read: if true; }
            match /aura_reviews/{id}    { allow read: if true; allow create: if true; }
            match /aura_orders/{id}     { allow read: if true; allow create: if true; }
          }
        }
      (Admin writes are added in Phase 2 with proper rules.)
   Until config is filled in, the site runs fully on seed data + localStorage
   (orders are stored locally and shown with a "demo mode" note).
*/
const FIREBASE_CONFIG = {
  apiKey: 'PASTE_YOUR_API_KEY_HERE',
  authDomain: 'PASTE_YOUR_AUTH_DOMAIN_HERE',
  projectId: 'PASTE_YOUR_PROJECT_ID_HERE',
  storageBucket: 'PASTE_YOUR_STORAGE_BUCKET_HERE',
  messagingSenderId: 'PASTE_YOUR_SENDER_ID_HERE',
  appId: 'PASTE_YOUR_APP_ID_HERE',
};

const PLACEHOLDER = 'PASTE_YOUR_';

let _db = null, _fns = null, _initTried = false;

export function isConfigured() {
  return Object.values(FIREBASE_CONFIG).every(
    (v) => typeof v === 'string' && v.length > 0 && !v.startsWith(PLACEHOLDER),
  );
}

/* Lazy-load Firebase SDK from CDN; returns null if config missing/offline. */
async function init() {
  if (_initTried) return _db ? _fns : null;
  _initTried = true;
  if (!isConfigured()) return null;
  try {
    const appMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const app = appMod.initializeApp(FIREBASE_CONFIG);
    _db = fsMod.getFirestore(app);
    _fns = fsMod;
    return _fns;
  } catch (e) {
    console.warn('[AURA] Firebase init failed, using local mode:', e);
    return null;
  }
}

/* ---- Products ---- */
export async function fetchProducts() {
  try {
    const f = await init();
    if (!f) return null;
    const snap = await f.getDocs(f.collection(_db, 'aura_products'));
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list.length ? list : null;
  } catch (e) { console.warn('[AURA] fetchProducts fallback:', e); return null; }
}

/* ---- Settings ---- */
export async function fetchSettings() {
  try {
    const f = await init();
    if (!f) return null;
    const snap = await f.getDoc(f.doc(_db, 'aura_settings', 'main'));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.warn('[AURA] fetchSettings fallback:', e); return null; }
}

/* ---- Orders ---- */
export async function saveOrder(order) {
  const f = await init();
  if (!f) return null; /* local mode: caller stores in localStorage */
  try {
    const ref = await f.addDoc(f.collection(_db, 'aura_orders'), {
      ...order, createdAt: f.serverTimestamp(),
    });
    return ref.id;
  } catch (e) { console.warn('[AURA] saveOrder failed:', e); return null; }
}

export async function fetchOrder(orderId, phone) {
  try {
    const f = await init();
    if (!f) return null;
    const q = f.query(
      f.collection(_db, 'aura_orders'),
      f.where('orderId', '==', orderId),
      f.where('phone', '==', phone),
    );
    const snap = await f.getDocs(q);
    let found = null;
    snap.forEach((d) => { found = { id: d.id, ...d.data() }; });
    return found;
  } catch (e) { console.warn('[AURA] fetchOrder failed:', e); return null; }
}

/* ---- Reviews ---- */
export async function fetchReviews(productId) {
  try {
    const f = await init();
    if (!f) return [];
    const q = f.query(
      f.collection(_db, 'aura_reviews'),
      f.where('productId', '==', productId),
      f.where('status', '==', 'approved'),
    );
    const snap = await f.getDocs(q);
    const list = [];
    snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
    return list;
  } catch (e) { console.warn('[AURA] fetchReviews failed:', e); return []; }
}

export async function submitReview(review) {
  const f = await init();
  if (!f) return false;
  try {
    await f.addDoc(f.collection(_db, 'aura_reviews'), {
      ...review, status: 'pending', createdAt: f.serverTimestamp(),
    });
    return true;
  } catch (e) { console.warn('[AURA] submitReview failed:', e); return false; }
}
