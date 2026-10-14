# AURA LIFESTYLE — Phase 1 (Customer Website)

Bangladeshi Islamic lifestyle fashion store, Believers-style. Static site (HTML/CSS/JS) — works on GitHub Pages with no build step.

## Files
| File | Purpose |
|---|---|
| `index.html` | Page shell: header, nav, footer, search |
| `style.css` | Clean white + gold/navy theme, responsive |
| `data.js` | Seed products (18), categories, FAQs, settings, order stages |
| `firebase.js` | Firebase init + Firestore helpers (products/orders/reviews/settings) |
| `app.js` | All customer logic: router, shop, cart, checkout, track order, reviews |

## Phase 1 features
- Homepage: hero slider, categories, Flash Sale (countdown, no 0% badges), Best Sellers, Combo, New Arrivals, testimonials, newsletter, FAQ
- Shop: category filter, search, sort (price/new/popular), price filter, result count, pagination
- Product detail: size selector with validation, quantity, stock indicator, delivery/return info, share (copy link + WhatsApp), related products, reviews (average + breakdown + write-a-review)
- Wishlist (localStorage), Cart (dedicated page, persists across reload, promo note, free-shipping progress above ৳2000)
- Checkout (guest, no login): name, 11-digit phone validation, district dropdown — delivery charge shown ONLY after district selected (Dhaka city ৳70 / sub-area ৳90 / outside ৳110), address, email/WhatsApp optional, order notes, payment (COD, bKash manual+TrxID, Nagad manual+TrxID, Card), terms checkbox
- Orders saved to Firestore (`aura_orders`); in demo mode (no Firebase config) saved to localStorage
- Track Order: order ID + phone → visual stage timeline (Pending → Confirmed → Packed → Handed to Courier → In Transit → Out for Delivery → Delivered / Cancelled), courier name + tracking number shown when set
- Info pages with real content: FAQ, Contact, Delivery Info, Return Policy, Privacy Policy, Terms, About
- Bangla/English toggle for key labels. No emojis in UI.

## Firebase setup (for real orders)
1. Firebase Console → create project → Firestore Database → Create database.
2. Project settings → Web app → copy config into `FIREBASE_CONFIG` in `firebase.js`.
3. Firestore rules (starter, Phase 1):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /aura_products/{id} { allow read: if true; }
    match /aura_settings/{id} { allow read: if true; }
    match /aura_reviews/{id}  { allow read: if true; allow create: if true; }
    match /aura_orders/{id}   { allow read: if true; allow create: if true; }
  }
}
```
4. Until configured, the site shows a demo-mode banner and runs on seed data.

## Deploy (GitHub Pages)
Push this folder to a repo → Settings → Pages → deploy from main branch. No build step.

## Phase 2 (later, NOT built yet)
Admin Panel (password gate), product/order management, section visibility toggles, courier assignment, analytics (visitors/abandoned carts/cancelled orders), review moderation.

## Known limitations (Phase 1)
- No admin panel — products/orders managed via Firestore console until Phase 2.
- Reviews submitted by customers save as `pending` and do not display until Phase 2 moderation approves them (seed reviews display immediately).
- Newsletter/contact forms show confirmation only (no email sending).
- Admin password, courier assignment, analytics, abandoned-cart tracking arrive in Phase 2.
