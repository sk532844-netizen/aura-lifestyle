/* AURA LIFESTYLE — Phase 1: customer website (no admin panel).
   Hash router SPA. Cart + wishlist in localStorage. Orders → Firestore
   (or localStorage demo mode). All renders escape user-entered text. */
import { isConfigured, fetchProducts, fetchSettings, saveOrder, fetchOrder, fetchReviews, submitReview } from './firebase.js';
import * as fb from './firebase.js'; /* namespace: optional auth fns (signIn/signUp/resetPassword/fetchUserOrders) may not exist yet */

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
  /* header / footer / chrome */
  track: { bn: 'অর্ডার ট্র্যাক করুন', en: 'Track Order' },
  wishlist: { bn: 'উইশলিস্ট', en: 'Wishlist' },
  cart: { bn: 'কার্ট', en: 'Cart' },
  signin: { bn: 'সাইন ইন', en: 'Sign In' },
  searchPh: { bn: 'প্রোডাক্ট খুঁজুন...', en: 'Search products...' },
  demoNote: { bn: 'ডেমো মোড: Firebase কনফিগ করা হয়নি — অর্ডার এই ডিভাইসে সংরক্ষিত হবে। (firebase.js-এ কনফিগ যোগ করুন)', en: 'Demo mode: Firebase is not configured — orders will be saved on this device only. (add config in firebase.js)' },
  drawerMenu: { bn: 'মেনু', en: 'Menu' },
  drawerCats: { bn: 'ক্যাটাগরি', en: 'Categories' },
  drawerInfo: { bn: 'তথ্য', en: 'Information' },
  closeLbl: { bn: 'বন্ধ করুন', en: 'Close' },
  viewCartLbl: { bn: 'কার্ট দেখুন', en: 'View cart' },
  fShopH: { bn: 'শপ', en: 'Shop' },
  fInfoH: { bn: 'তথ্য', en: 'Information' },
  fTalkH: { bn: 'যোগাযোগ করুন', en: 'Talk To Us' },
  fBlurb: { bn: 'বাংলাদেশের ইসলামিক লাইফস্টাইল ফ্যাশন ব্র্যান্ড। মানসম্মত পণ্য, সেরা দামে, সারা বাংলাদেশে ডেলিভারি।', en: 'An Islamic lifestyle fashion brand of Bangladesh. Quality products at the best prices, delivered all over Bangladesh.' },
  fHours: { bn: 'হটলাইন: <b style="color:#fff">{p}</b> (সকাল ১০টা – রাত ৯টা)', en: 'Hotline: <b style="color:#fff">{p}</b> (10 AM – 9 PM)' },
  fContact: { bn: 'যোগাযোগ করুন →', en: 'Contact Us →' },
  fBottom: { bn: '© ২০২৬ AURA LIFESTYLE। সর্বস্বত্ব সংরক্ষিত।', en: '© 2026 AURA LIFESTYLE. All rights reserved.' },
  fAbout: { bn: 'আমাদের সম্পর্কে', en: 'About Us' },
  payCOD: { bn: 'ক্যাশ অন ডেলিভারি', en: 'Cash on Delivery' },
  /* 404 */
  notFoundT: { bn: 'পেজ পাওয়া যায়নি (404)', en: 'Page not found (404)' },
  notFoundP: { bn: 'আপনি যে ঠিকানায় গিয়েছিলেন সেটি খুঁজে পাওয়া যায়নি।', en: 'The page you were looking for could not be found.' },
  backHome: { bn: 'হোমে ফিরুন', en: 'Back to Home' },
  shopCta: { bn: 'শপ করুন', en: 'Shop Now' },
  /* home */
  shopNow: { bn: 'এখনই শপ করুন', en: 'Shop Now' },
  freeShipSub: { bn: '৳২০০০+ অর্ডারে সারা বাংলাদেশে ফ্রি ডেলিভারি', en: 'Free delivery all over Bangladesh on orders above ৳2000' },
  nlT: { bn: 'নতুন অফার সবার আগে পান', en: 'Get new offers first' },
  nlPh: { bn: 'আপনার ইমেইল', en: 'Your email' },
  subscribe: { bn: 'সাবস্ক্রাইব', en: 'Subscribe' },
  nlOk: { bn: 'সাবস্ক্রাইব হয়েছে — ধন্যবাদ!', en: 'Subscribed — thank you!' },
  nlBad: { bn: 'সঠিক ইমেইল দিন', en: 'Enter a valid email' },
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
  waOrder: { bn: 'WhatsApp-এ অর্ডার', en: 'Order on WhatsApp' },
  maxPrice: { bn: 'সর্বোচ্চ দাম', en: 'Max price' },
  trust1: { bn: 'অরিজিনাল পণ্য', en: 'Genuine Products' },
  trust2: { bn: 'ক্যাশ অন ডেলিভারি', en: 'Cash on Delivery' },
  trust3: { bn: 'সারা দেশে ডেলিভারি', en: 'All-Bangladesh Delivery' },
  trust4: { bn: 'নিরাপদ পেমেন্ট', en: 'Secure Payment' },
  flashPromoT: { bn: 'ফ্ল্যাশ সেল — বিশেষ ছাড়', en: 'Flash Sale — Special Discounts' },
  flashPromoS: { bn: 'সীমিত সময়ের অফারে পছন্দের পণ্য কিনুন', en: 'Grab your favorites at limited-time prices' },
  viewOffer: { bn: 'অফার দেখুন', en: 'View Offers' },
  /* shop */
  sortPop: { bn: 'সবচেয়ে জনপ্রিয়', en: 'Most popular' },
  sortLow: { bn: 'দাম: কম → বেশি', en: 'Price: low to high' },
  sortHigh: { bn: 'দাম: বেশি → কম', en: 'Price: high to low' },
  sortNew: { bn: 'নতুন আগে', en: 'Newest first' },
  priceAll: { bn: 'সব দাম', en: 'All prices' },
  priceUnder: { bn: '৳{n}-এর নিচে', en: 'Under ৳{n}' },
  shopSearchPh: { bn: 'এই পেজে খুঁজুন...', en: 'Search this page...' },
  filterCat: { bn: 'ক্যাটাগরি', en: 'Category' },
  all: { bn: 'সব', en: 'All' },
  subcat: { bn: 'সাব-ক্যাটাগরি', en: 'Sub-category' },
  searchRes: { bn: 'সার্চ: "{q}"', en: 'Search: "{q}"' },
  skuNotFound: { bn: 'Not Found — এই কোডের কোনো প্রোডাক্ট নেই', en: 'Not Found — no product matches this code' },
  skuHint: { bn: 'কোডটি ঠিক আছে কিনা দেখুন (যেমন: A100001)', en: 'Check the code is correct (e.g. A100001)' },
  emptyShop: { bn: 'কোনো প্রোডাক্ট পাওয়া যায়নি', en: 'No products found' },
  emptyShopHint: { bn: 'অন্য ক্যাটাগরি বা দাম দিয়ে চেষ্টা করুন।', en: 'Try another category or price.' },
  /* product */
  prodNotFound: { bn: 'প্রোডাক্ট পাওয়া যায়নি', en: 'Product not found' },
  backToShop: { bn: 'Shop-এ ফিরে যান', en: 'Back to shop' },
  sizeSel: { bn: 'সাইজ নির্বাচন করুন:', en: 'Select size:' },
  sizeErr: { bn: 'সাইজ নির্বাচন করুন।', en: 'Please select a size.' },
  qty: { bn: 'পরিমাণ', en: 'Quantity' },
  wished: { bn: '♥ সংরক্ষিত', en: '♥ Saved' },
  addWish: { bn: '♡ উইশলিস্ট', en: '♡ Wishlist' },
  offPct: { bn: '-{n}% ছাড়', en: '-{n}% off' },
  metaDelivery: { bn: 'ডেলিভারি: ঢাকার ভিতরে ১–২ দিন, ঢাকার বাইরে ২–৪ দিন', en: 'Delivery: 1–2 days inside Dhaka, 2–4 days outside Dhaka' },
  metaPay: { bn: 'পেমেন্ট: ক্যাশ অন ডেলিভারি, বিকাশ, নগদ', en: 'Payment: Cash on Delivery, bKash, Nagad' },
  metaReturn: { bn: 'ডেলিভারি ম্যানের সামনে প্রোডাক্ট চেক করে নিতে পারবেন', en: 'You can check the product in front of the delivery man' },
  copyLink: { bn: 'লিংক কপি করুন', en: 'Copy link' },
  waShare: { bn: 'WhatsApp-এ শেয়ার', en: 'Share on WhatsApp' },
  related: { bn: 'আপনার পছন্দ হতে পারে', en: 'You may also like' },
  addedToast: { bn: '{n} — কার্টে যোগ হয়েছে', en: '{n} added to cart' },
  linkCopied: { bn: 'লিংক কপি হয়েছে', en: 'Link copied' },
  linkCopyFail: { bn: 'লিংক কপি করা যায়নি', en: "Couldn't copy link" },
  zoomHint: { bn: 'বড় করতে ক্লিক করুন', en: 'Click to enlarge' },
  sizeLbl: { bn: 'সাইজ: ', en: 'Size: ' },
  /* cart */
  cartT: { bn: 'শপিং কার্ট', en: 'Shopping Cart' },
  cartEmpty: { bn: 'আপনার কার্ট খালি', en: 'Your cart is empty' },
  cartEmptyP: { bn: 'প্রোডাক্ট দেখে কার্টে যোগ করুন।', en: 'Browse products and add them to your cart.' },
  orderSummary: { bn: 'অর্ডার সামারি', en: 'Order Summary' },
  freeShipWon: { bn: 'ফ্রি ডেলিভারি পেয়ে গেছেন!', en: "You've unlocked FREE delivery!" },
  freeShipMore: { bn: 'আর {x} অর্ডার করলে ফ্রি ডেলিভারি পাবেন', en: 'Add {x} more for FREE delivery' },
  subtotal: { bn: 'সাবটোটাল', en: 'Subtotal' },
  delivery: { bn: 'ডেলিভারি', en: 'Delivery' },
  delAtCheckout: { bn: 'চেকআউটে হিসাব হবে', en: 'Calculated at checkout' },
  total: { bn: 'মোট', en: 'Total' },
  checkoutBtn: { bn: 'চেকআউট →', en: 'Checkout →' },
  continueShop: { bn: 'শপিং চালিয়ে যান', en: 'Continue Shopping' },
  remove: { bn: 'মুছুন', en: 'Remove' },
  /* checkout */
  coT: { bn: 'চেকআউট', en: 'Checkout' },
  billing: { bn: 'বিলিং তথ্য', en: 'Billing Information' },
  fName: { bn: 'পূর্ণ নাম *', en: 'Full name *' },
  fNamePh: { bn: 'আপনার নাম', en: 'Your name' },
  fPhone: { bn: 'মোবাইল নম্বর * (১১ ডিজিট)', en: 'Mobile number * (11 digits)' },
  fPhoneHint: { bn: 'অর্ডার কনফার্মেশনের জন্য এই নম্বরে কল করা হবে', en: 'We will call this number to confirm your order' },
  fDistrict: { bn: 'জেলা *', en: 'District *' },
  fDistrictPh: { bn: 'জেলা নির্বাচন করুন', en: 'Select district' },
  delTimeIn: { bn: 'ঢাকার ভিতরে ডেলিভারি: ১–২ দিন', en: 'Delivery inside Dhaka: 1–2 days' },
  delTimeOut: { bn: 'ঢাকার বাইরে ডেলিভারি: ২–৪ দিন', en: 'Delivery outside Dhaka: 2–4 days' },
  fAddr: { bn: 'সম্পূর্ণ ঠিকানা *', en: 'Full address *' },
  fAddrPh: { bn: 'বাড়ি/রোড/এলাকা', en: 'House/road/area' },
  fEmail: { bn: 'ইমেইল (ঐচ্ছিক)', en: 'Email (optional)' },
  fWhats: { bn: 'WhatsApp নম্বর (ঐচ্ছিক)', en: 'WhatsApp number (optional)' },
  fNote: { bn: 'অর্ডার নোট (ঐচ্ছিক)', en: 'Order note (optional)' },
  fNotePh: { bn: 'ডেলিভারি সংক্রান্ত কোনো নির্দেশনা', en: 'Any delivery instructions' },
  payMethod: { bn: 'পেমেন্ট মেথড', en: 'Payment Method' },
  payCodT: { bn: 'ক্যাশ অন ডেলিভারি', en: 'Cash on Delivery' },
  payCodD: { bn: 'পণ্য হাতে পেয়ে টাকা দিন — কোনো অগ্রিম পেমেন্ট নয়।', en: 'Pay when you receive the product — no advance payment.' },
  payBkashD: { bn: 'ম্যানুয়াল পেমেন্ট — নিচের নম্বরে সেন্ড মানি করে TrxID দিন।', en: 'Manual payment — send money to the number below and enter the TrxID.' },
  payNagadD: { bn: 'ম্যানুয়াল পেমেন্ট — নিচের নম্বরে সেন্ড মানি করে TrxID দিন।', en: 'Manual payment — send money to the number below and enter the TrxID.' },
  mBkash: { bn: 'বিকাশ', en: 'bKash' },
  mNagad: { bn: 'নগদ', en: 'Nagad' },
  payTypePersonal: { bn: 'পার্সোনাল', en: 'Personal' },
  payTypeMerchant: { bn: 'মার্চেন্ট', en: 'Merchant' },
  sizeInParen: { bn: '(সাইজ: {s})', en: '(Size: {s})' },
  imgAlt: { bn: 'ছবি {n}', en: 'Image {n}' },
  cdH: { bn: 'ঘণ্টা', en: 'hrs' },
  cdM: { bn: 'মিনিট', en: 'min' },
  cdS: { bn: 'সেকেন্ড', en: 'sec' },
  trxPh: { bn: '{m} TrxID লিখুন', en: 'Enter {m} TrxID' },
  senderNum: { bn: 'আপনার {m} নম্বর * (যে নম্বর থেকে পেমেন্ট করেছেন)', en: 'Your {m} number * (the number you paid from)' },
  coItems: { bn: 'অর্ডারের পণ্য', en: 'Order Items' },
  coNote: { bn: 'ডেলিভারি: ৩–৭ কর্মদিবস। কোনো অগ্রিম পেমেন্ট লাগে না (COD)।', en: 'Delivery: 3–7 working days. No advance payment needed (COD).' },
  confirmOrder: { bn: 'অর্ডার কনফার্ম করুন', en: 'Confirm Order' },
  termsAgree: { bn: 'আমি <a href="#terms" target="_blank">শর্তাবলী</a> ও <a href="#returns" target="_blank">রিটার্ন পলিসি</a> পড়েছি ও মেনে নিলাম *', en: 'I have read and agree to the <a href="#terms" target="_blank">Terms & Conditions</a> and <a href="#returns" target="_blank">Return Policy</a> *' },
  freeDel: { bn: 'ফ্রি ডেলিভারি', en: 'FREE delivery' },
  errName: { bn: 'নাম দিন।', en: 'Please enter your name.' },
  errPhone: { bn: 'সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)।', en: 'Enter a valid 11-digit mobile number (01XXXXXXXXX).' },
  errDistrict: { bn: 'জেলা নির্বাচন করুন।', en: 'Please select your district.' },
  errAddr: { bn: 'ঠিকানা দিন।', en: 'Please enter your address.' },
  errTrx: { bn: 'পেমেন্টের TrxID দিন।', en: 'Please enter the payment TrxID.' },
  errSender: { bn: 'যে নম্বর থেকে পেমেন্ট করেছেন সেটি দিন।', en: 'Enter the number you paid from.' },
  errSenderBad: { bn: 'সঠিক ১১ ডিজিটের পেমেন্ট নম্বর দিন।', en: 'Enter a valid 11-digit payment number.' },
  ordering: { bn: 'অর্ডার প্রসেস হচ্ছে…', en: 'Processing order…' },
  orderFail: { bn: 'অর্ডার সেভ করা যায়নি। আবার চেষ্টা করুন।', en: "Couldn't save the order. Please try again." },
  /* order success */
  osT: { bn: 'অর্ডার সফল হয়েছে!', en: 'Order placed successfully!' },
  osId: { bn: 'আপনার অর্ডার আইডি:', en: 'Your order ID:' },
  osItems: { bn: 'অর্ডারের পণ্য', en: 'Order items' },
  osDelInfo: { bn: 'ডেলিভারি তথ্য', en: 'Delivery information' },
  osPay: { bn: 'পেমেন্ট:', en: 'Payment:' },
  osPayNum: { bn: 'পেমেন্ট নম্বর:', en: 'Payment number:' },
  osTrx: { bn: 'TrxID:', en: 'TrxID:' },
  osNote: { bn: 'অর্ডার কনফার্মের জন্য আমাদের প্রতিনিধি আপনার নম্বরে কল করবে। এই অর্ডার আইডিটি সংরক্ষণ করুন।', en: 'Our representative will call your number to confirm the order. Please save this order ID.' },
  osNotFound: { bn: 'অর্ডার খুঁজে পাওয়া যায়নি', en: 'Order not found' },
  osIdLbl: { bn: 'অর্ডার আইডি:', en: 'Order ID:' },
  payBkash: { bn: 'বিকাশ', en: 'bKash' },
  payNagad: { bn: 'নগদ', en: 'Nagad' },
  /* track */
  trT: { bn: 'অর্ডার ট্র্যাক করুন', en: 'Track Your Order' },
  trDesc: { bn: 'অর্ডার আইডি (যেমন: AL-123456) ও অর্ডার করার সময় দেওয়া মোবাইল নম্বর দিন।', en: 'Enter your order ID (e.g. AL-123456) and the mobile number used for the order.' },
  trId: { bn: 'অর্ডার নম্বর *', en: 'Order number *' },
  trPhone: { bn: 'মোবাইল নম্বর *', en: 'Mobile number *' },
  trErr: { bn: 'অর্ডার আইডি ও মোবাইল নম্বর দুটোই দিন।', en: 'Enter both order ID and mobile number.' },
  trNotFound: { bn: 'অর্ডার পাওয়া যায়নি', en: 'Order not found' },
  trNotFoundP: { bn: 'অর্ডার আইডি ও মোবাইল নম্বর ঠিক আছে কিনা দেখুন।', en: 'Check that the order ID and mobile number are correct.' },
  trTotal: { bn: 'মোট:', en: 'Total:' },
  trCancelled: { bn: 'এই অর্ডারটি বাতিল করা হয়েছে।', en: 'This order has been cancelled.' },
  trReason: { bn: 'কারণ:', en: 'Reason:' },
  trDone: { bn: 'সম্পন্ন', en: 'Done' },
  trPending: { bn: 'অপেক্ষমান', en: 'Pending' },
  trCourier: { bn: 'কুরিয়ার:', en: 'Courier:' },
  trTracking: { bn: 'ট্র্যাকিং নম্বর:', en: 'Tracking number:' },
  trDispatch: { bn: 'ডিসপ্যাচ তারিখ:', en: 'Dispatch date:' },
  trCourierHint: { bn: 'কুরিয়ারের ওয়েবসাইটে এই ট্র্যাকিং নম্বর দিয়ে আরও বিস্তারিত দেখতে পারবেন।', en: 'You can track more details with this tracking number on the courier website.' },
  trItems: { bn: 'পণ্য:', en: 'Items:' },
  /* wishlist */
  wishT: { bn: 'আমার উইশলিস্ট', en: 'My Wishlist' },
  wishEmpty: { bn: 'উইশলিস্ট খালি', en: 'Wishlist is empty' },
  wishEmptyP: { bn: 'প্রোডাক্টের ♥ বাটনে চাপ দিয়ে উইশলিস্টে যোগ করুন।', en: 'Tap the ♥ button on a product to add it to your wishlist.' },
  /* reviews */
  revCount: { bn: '{n}টি রিভিউ', en: '{n} reviews' },
  revNone: { bn: 'এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি দিন!', en: 'No reviews yet. Be the first to review!' },
  revWrite: { bn: 'রিভিউ লিখুন', en: 'Write a Review' },
  revName: { bn: 'আপনার নাম *', en: 'Your name *' },
  revNamePh: { bn: 'নাম', en: 'Name' },
  revRating: { bn: 'রেটিং *', en: 'Rating *' },
  revText: { bn: 'রিভিউ * (সর্বোচ্চ ৫০০ অক্ষর)', en: 'Review * (max 500 characters)' },
  revTextPh: { bn: 'পণ্যটি কেমন লেগেছে?', en: 'How did you like the product?' },
  revSubmit: { bn: 'রিভিউ জমা দিন', en: 'Submit Review' },
  revErr1: { bn: 'নাম ও রিভিউ লিখুন।', en: 'Please enter your name and review.' },
  revErr2: { bn: 'রেটিং দিন।', en: 'Please give a rating.' },
  revErr3: { bn: 'আপনি আজ এই প্রোডাক্টে ইতিমধ্যে রিভিউ দিয়েছেন।', en: 'You have already reviewed this product today.' },
  revErr4: { bn: 'রিভিউ জমা দেওয়া যায়নি। আবার চেষ্টা করুন।', en: "Couldn't submit the review. Try again." },
  revOk: { bn: 'রিভিউ জমা হয়েছে — ধন্যবাদ!', en: 'Review submitted — thank you!' },
  verified: { bn: 'ভেরিফাইড ক্রেতা', en: 'Verified Purchase' },
  /* contact */
  ctT: { bn: 'যোগাযোগ করুন', en: 'Contact Us' },
  ctP: { bn: 'যেকোনো প্রশ্ন, অর্ডার বা অভিযোগের জন্য যোগাযোগ করুন:', en: 'For any questions, orders or complaints, reach us:' },
  ctHotline: { bn: 'হটলাইন:', en: 'Hotline:' },
  ctHours: { bn: '(সকাল ১০টা – রাত ৯টা)', en: '(10 AM – 9 PM)' },
  ctEmail: { bn: 'ইমেইল:', en: 'Email:' },
  ctAddr: { bn: 'ঠিকানা:', en: 'Address:' },
  ctWa: { bn: 'WhatsApp-এ মেসেজ করুন →', en: 'Message us on WhatsApp →' },
  ctName: { bn: 'নাম *', en: 'Name *' },
  ctPhone: { bn: 'মোবাইল *', en: 'Mobile *' },
  ctMsg: { bn: 'মেসেজ *', en: 'Message *' },
  ctSend: { bn: 'মেসেজ পাঠান', en: 'Send Message' },
  ctOk: { bn: 'মেসেজ পাঠানো হয়েছে — আমরা যোগাযোগ করবো।', en: 'Message sent — we will get back to you.' },
  /* delivery page */
  dlT: { bn: 'ডেলিভারি তথ্য', en: 'Delivery Info' },
  dlTimeH: { bn: 'ডেলিভারি সময়', en: 'Delivery time' },
  dlTimeP: { bn: 'ঢাকার ভিতরে (সিটি): ১–২ দিন। ঢাকার সাব-এরিয়া: ২–৩ দিন। ঢাকার বাইরে: ২–৪ কর্মদিবস।', en: 'Inside Dhaka (city): 1–2 days. Dhaka sub-area: 2–3 days. Outside Dhaka: 2–4 working days.' },
  dlChargeH: { bn: 'ডেলিভারি চার্জ', en: 'Delivery charge' },
  dlCity: { bn: 'ঢাকা সিটি: ৳{n}', en: 'Dhaka city: ৳{n}' },
  dlSub: { bn: 'ঢাকা সাব-এরিয়া: ৳{n}', en: 'Dhaka sub-area: ৳{n}' },
  dlOut: { bn: 'ঢাকার বাইরে: ৳{n}', en: 'Outside Dhaka: ৳{n}' },
  dlFree: { bn: '৳{n} বা তার বেশি অর্ডারে ফ্রি ডেলিভারি', en: 'FREE delivery on orders of ৳{n} or more' },
  dlCourierH: { bn: 'কুরিয়ার', en: 'Courier' },
  dlCourierP: { bn: 'আমরা Steadfast, Pathao Courier, Paperfly, Sundarban, SA Paribahan ও RedX-এর মাধ্যমে ডেলিভারি করি। অর্ডার ডিসপ্যাচ হলে ট্র্যাকিং নম্বর SMS/কলের মাধ্যমে জানিয়ে দেওয়া হয়।', en: 'We deliver via Steadfast, Pathao Courier, Paperfly, Sundarban, SA Paribahan and RedX. You will receive the tracking number by SMS/call once your order is dispatched.' },
  dlTrackH: { bn: 'অর্ডার ট্র্যাকিং', en: 'Order tracking' },
  dlTrackP: { bn: 'Track Order পেজে অর্ডার আইডি ও মোবাইল নম্বর দিয়ে যেকোনো সময় অর্ডারের অবস্থা দেখতে পারবেন।', en: 'You can check your order status anytime on the Track Order page with your order ID and mobile number.' },
  /* returns page */
  rtT: { bn: 'রিটার্ন ও রিফান্ড পলিসি', en: 'Return & Refund Policy' },
  rtCheckH: { bn: 'ডেলিভারির সময় চেক করুন', en: 'Check at delivery time' },
  rtCheckP: { bn: 'ডেলিভারি ম্যানের সামনে প্রোডাক্ট চেক করে নিতে পারবেন। পণ্যে কোনো সমস্যা থাকলে তখনই জানান।', en: 'You can check the product in front of the delivery man. Report any issue right then.' },
  rtDamageH: { bn: 'ক্ষতিগ্রস্ত / ভুল পণ্য', en: 'Damaged / wrong product' },
  rtDamageP: { bn: 'পণ্য ক্ষতিগ্রস্ত বা ভুল আসলে আনবক্সিং ভিডিওসহ ৪৮ ঘণ্টার মধ্যে যোগাযোগ করুন — সম্পূর্ণ বিনামূল্যে রিপ্লেসমেন্ট দেওয়া হবে।', en: 'If the product arrives damaged or wrong, contact us within 48 hours with an unboxing video — free replacement.' },
  rtMindH: { bn: 'মন পরিবর্তন', en: 'Change of mind' },
  rtMindP: { bn: 'মন পরিবর্তনের কারণে রিটার্ন/এক্সচেঞ্জে রিটার্ন ডেলিভারি চার্জ কাস্টমারকে বহন করতে হবে।', en: 'For change-of-mind returns/exchanges, the customer bears the return delivery charge.' },
  rtRefundH: { bn: 'রিফান্ড', en: 'Refund' },
  rtRefundP: { bn: 'রিটার্ন পণ্য আমাদের গুদামে পৌঁছানোর ৭–১৫ কর্মদিবসের মধ্যে রিফান্ড প্রক্রিয়া সম্পন্ন হবে (বিকাশ/নগদ/ব্যাংক)। COD অর্ডারে রিফান্ড বিকাশ/নগদে দেওয়া হয়।', en: 'Refunds are processed within 7–15 working days of the returned product reaching our warehouse (bKash/Nagad/bank). COD orders are refunded via bKash/Nagad.' },
  rtContactH: { bn: 'যোগাযোগ', en: 'Contact' },
  rtContactP: { bn: 'রিটার্নের জন্য হটলাইন {p}-এ কল করুন বা Contact পেজে মেসেজ দিন।', en: 'For returns, call our hotline {p} or message us on the Contact page.' },
  /* privacy */
  prT: { bn: 'প্রাইভেসি পলিসি', en: 'Privacy Policy' },
  prDate: { bn: 'কার্যকর তারিখ:', en: 'Effective date:' },
  prH1: { bn: 'আমরা কী তথ্য সংগ্রহ করি', en: 'What information we collect' },
  prP1: { bn: 'অর্ডার প্রক্রিয়ার জন্য আমরা আপনার নাম, মোবাইল নম্বর, ঠিকানা, ইমেইল (ঐচ্ছিক) ও অর্ডারের তথ্য সংগ্রহ করি।', en: 'To process orders we collect your name, mobile number, address, email (optional) and order details.' },
  prH2: { bn: 'তথ্য ব্যবহার', en: 'How we use it' },
  prP2: { bn: 'আপনার তথ্য শুধু অর্ডার ডেলিভারি, অর্ডার কনফার্মেশন ও কাস্টমার সার্ভিসের জন্য ব্যবহার করা হয়। আমরা আপনার তথ্য তৃতীয় পক্ষের কাছে বিক্রি করি না।', en: 'Your information is used only for order delivery, confirmation and customer service. We never sell your data to third parties.' },
  prH3: { bn: 'কুরিয়ার শেয়ারিং', en: 'Courier sharing' },
  prP3: { bn: 'ডেলিভারির জন্য আপনার নাম, ফোন ও ঠিকানা শুধুমাত্র কুরিয়ার পার্টনারের সাথে শেয়ার করা হয়।', en: 'For delivery, your name, phone and address are shared only with the courier partner.' },
  prH4: { bn: 'নিরাপত্তা', en: 'Security' },
  prP4: { bn: 'আপনার তথ্য নিরাপদে সংরক্ষণ করা হয়। কোনো পেমেন্ট তথ্য (বিকাশ/নগদ PIN) আমরা সংগ্রহ বা সংরক্ষণ করি না।', en: 'Your information is stored securely. We never collect or store payment credentials (bKash/Nagad PIN).' },
  prH5: { bn: 'যোগাযোগ', en: 'Contact' },
  prP5: { bn: 'তথ্য মুছতে বা জানতে চাইলে {e}-এ লিখুন।', en: 'To delete or inquire about your data, write to {e}.' },
  /* terms */
  tmT: { bn: 'শর্তাবলী', en: 'Terms & Conditions' },
  tmH1: { bn: 'সাধারণ শর্ত', en: 'General' },
  tmP1: { bn: 'AURA LIFESTYLE থেকে কেনাকাটা করলে আপনি এই শর্তাবলী মেনে নিচ্ছেন।', en: 'By shopping at AURA LIFESTYLE you agree to these terms.' },
  tmH2: { bn: 'মূল্য ও প্রাপ্যতা', en: 'Pricing & availability' },
  tmP2: { bn: 'সব মূল্য বাংলাদেশি টাকায় (৳)। স্টক শেষ হলে অর্ডার বাতিল হতে পারে — সেক্ষেত্রে সম্পূর্ণ টাকা ফেরত দেওয়া হবে।', en: 'All prices are in Bangladeshi Taka (৳). Orders may be cancelled if stock runs out — you will be fully refunded.' },
  tmH3: { bn: 'অর্ডার কনফার্মেশন', en: 'Order confirmation' },
  tmP3: { bn: 'অর্ডার দেওয়ার পর ফোনে কনফার্ম করা হয়। ভুল তথ্য দিলে অর্ডার বাতিল হতে পারে।', en: 'Orders are confirmed by phone. Wrong information may lead to cancellation.' },
  tmH4: { bn: 'ডেলিভারি', en: 'Delivery' },
  tmP4: { bn: 'ডেলিভারি সময় আনুমানিক; আবহাওয়া বা কুরিয়ারজনিত বিলম্বের জন্য আমরা দায়ী নই, তবে সর্বোচ্চ চেষ্টা করবো।', en: 'Delivery times are estimates; we are not liable for weather or courier delays, but we will do our best.' },
  tmH5: { bn: 'রিটার্ন', en: 'Returns' },
  tmP5: { bn: 'Return Policy অনুযায়ী রিটার্ন/এক্সচেঞ্জ প্রযোজ্য।', en: 'Returns/exchanges follow our Return Policy.' },
  tmH6: { bn: 'পরিবর্তন', en: 'Changes' },
  tmP6: { bn: 'এই শর্তাবলী যেকোনো সময় পরিবর্তন হতে পারে; আপডেট এই পেজে প্রকাশ করা হবে।', en: 'These terms may change at any time; updates will be published on this page.' },
  /* about */
  abT: { bn: 'AURA LIFESTYLE সম্পর্কে', en: 'About AURA LIFESTYLE' },
  abP1: { bn: 'AURA LIFESTYLE বাংলাদেশের একটি ইসলামিক লাইফস্টাইল ফ্যাশন ব্র্যান্ড। সুন্নাহ অনুসরণে পরিমার্জিত পোশাক, আতর ও লাইফস্টাইল পণ্য আমরা সেরা দামে পৌঁছে দিই।', en: 'AURA LIFESTYLE is an Islamic lifestyle fashion brand of Bangladesh. We deliver refined clothing, attar and lifestyle products inspired by the Sunnah at the best prices.' },
  abH2: { bn: 'আমাদের প্রতিশ্রুতি', en: 'Our promise' },
  abL1: { bn: 'যাচাই করা মানসম্মত পণ্য', en: 'Verified quality products' },
  abL2: { bn: 'স্বচ্ছ মূল্য — লুকানো চার্জ নেই', en: 'Transparent pricing — no hidden charges' },
  abL3: { bn: 'দ্রুত ডেলিভারি ও সহজ রিটার্ন', en: 'Fast delivery and easy returns' },
  abL4: { bn: 'বিনয়ী কাস্টমার সার্ভিস', en: 'Courteous customer service' },
  abH3: { bn: 'যোগাযোগ', en: 'Contact' },
  /* faq page */
  faqT: { bn: 'সাধারণ প্রশ্ন', en: 'Frequently Asked Questions' },
  /* signin / account */
  siLogin: { bn: 'লগইন', en: 'Login' },
  siSignup: { bn: 'সাইন আপ', en: 'Sign Up' },
  siEmail: { bn: 'ইমেইল *', en: 'Email *' },
  siPw: { bn: 'পাসওয়ার্ড * (কমপক্ষে ৮ অক্ষর)', en: 'Password * (min 8 characters)' },
  siName: { bn: 'নাম *', en: 'Name *' },
  siLoginBtn: { bn: 'লগইন করুন', en: 'Log In' },
  siSignupBtn: { bn: 'অ্যাকাউন্ট খুলুন', en: 'Create Account' },
  siForgot: { bn: 'পাসওয়ার্ড ভুলে গেছেন?', en: 'Forgot password?' },
  siForgotBtn: { bn: 'রিসেট লিংক পাঠান', en: 'Send reset link' },
  siForgotOk: { bn: 'রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।', en: 'A reset link has been sent to your email.' },
  siErrEmail: { bn: 'সঠিক ইমেইল দিন।', en: 'Enter a valid email.' },
  siErrPw: { bn: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।', en: 'Password must be at least 8 characters.' },
  siErrName: { bn: 'নাম দিন।', en: 'Please enter your name.' },
  siDemo: { bn: 'Firebase কানেক্ট হলে লগইন চালু হবে।', en: 'Login will be enabled once Firebase is connected.' },
  siWelcome: { bn: 'স্বাগতম, {n}!', en: 'Welcome, {n}!' },
  siLogout: { bn: 'লগ আউট', en: 'Log Out' },
  siMyOrders: { bn: 'আমার অর্ডার', en: 'My Orders' },
  siNoOrders: { bn: 'এখনো কোনো অর্ডার নেই।', en: 'No orders yet.' },
  siLoginFail: { bn: 'লগইন করা যায়নি। তথ্য ঠিক আছে কিনা দেখুন।', en: "Couldn't log in. Check your details." },
  siSignupFail: { bn: 'অ্যাকাউন্ট খোলা যায়নি। আবার চেষ্টা করুন।', en: "Couldn't create the account. Try again." },
  siAccount: { bn: 'আমার অ্যাকাউন্ট', en: 'My Account' },
};
const t = (k, vars) => { let s = (I18N[k] && I18N[k][LANG]) || k; if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replace('{' + kk + '}', vv); return s; };

/* ---------------- init ---------------- */
async function init() {
  applyStaticI18n();
  if (!isConfigured()) { $('#demoNote').textContent = t('demoNote'); $('#demoNote').style.display = 'block'; }
  try {
    const [remoteProducts, remoteSettings] = await Promise.all([fetchProducts(), fetchSettings()]);
    if (remoteProducts) PRODUCTS = remoteProducts;
    if (remoteSettings) { SETTINGS = { ...DEFAULT_SETTINGS, ...remoteSettings }; applyStaticI18n(); }
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
    applyStaticI18n();
    if (!isConfigured()) { const dn = $('#demoNote'); if (dn && dn.style.display !== 'none') dn.textContent = t('demoNote'); }
    buildNav(); route();
  });
  $('#cartBtn').addEventListener('click', () => { location.hash = '#cart'; });
  $('#wishLink').addEventListener('click', (e) => { e.preventDefault(); location.hash = '#wishlist'; });
  $('#cartBubble').addEventListener('click', () => { location.hash = '#cart'; });
  /* lightbox + drawer (global, bound once) */
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeLightbox(); closeDrawer(); } });
  const lb = $('#lightbox');
  if (lb) { $('#lbClose').addEventListener('click', closeLightbox); lb.addEventListener('click', (e) => { if (e.target === lb) closeLightbox(); }); }
  const mb = $('#menuBtn');
  if (mb) mb.addEventListener('click', openDrawer);
  const dc = $('#drawerClose');
  if (dc) dc.addEventListener('click', closeDrawer);
  const db = $('#drawerBackdrop');
  if (db) db.addEventListener('click', closeDrawer);
  const dn = $('#drawerNav');
  if (dn) dn.addEventListener('click', (e) => { if (e.target.closest('a')) closeDrawer(); });
  const dl = $('#drawerLang');
  if (dl) dl.addEventListener('click', () => $('#langBtn').click());
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
  const exactSku = PRODUCTS.find((p) => p.visible !== false && (p.sku || '').toLowerCase() === q);
  const hits = PRODUCTS.filter((p) => p.visible !== false && p !== exactSku && (p.nameEn + ' ' + p.nameBn + ' ' + (p.sku || '') + ' ' + prodMainLabel(p)).toLowerCase().includes(q)).slice(0, 6);
  const ordered = exactSku ? [exactSku, ...hits].slice(0, 6) : hits;
  if (!ordered.length) { box.classList.remove('open'); return; }
  box.innerHTML = ordered.map((p) => `<a href="#product/${p.id}"><img src="${esc(p.img)}" onerror="this.src='${FALLBACK_IMG}'" alt=""><span>${esc(LANG === 'bn' ? p.nameBn : p.nameEn)}${p.sku ? `<small class="s-sku">${esc(p.sku)}</small>` : ''}</span><span class="s-price">${fmt(p.price)}</span></a>`).join('');
  box.classList.add('open');
}

/* ---------------- router ---------------- */
let _lastPath = null;
function route() {
  const raw = location.hash.replace(/^#/, '') || 'home';
  const [path, qs] = raw.split('?');
  const params = new URLSearchParams(qs || '');
  const app = $('#app');
  const pathChanged = path !== _lastPath;
  _lastPath = path;
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
  else if (path === 'signin') app.innerHTML = viewSignin();
  else app.innerHTML = view404();
  bindDynamic();
  updateBadges();
  closeDrawer();
  if (pathChanged) window.scrollTo(0, 0);
  else if (path === 'shop') { const g = $('#shopGrid'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
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
  return `<section class="section"><div class="empty"><h3>${t('notFoundT')}</h3><p>${t('notFoundP')}</p><div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap"><a class="btn" href="#home">${t('backHome')}</a><a class="btn btn-outline" href="#shop">${t('shopCta')}</a></div></div></section>`;
}

/* ---------------- HOME (compact) ---------------- */
function viewHome() {
  const flash = PRODUCTS.filter((p) => p.tag === 'flash-sale' && p.stock > 0 && p.visible !== false).slice(0, 4);
  const best = PRODUCTS.filter((p) => p.tag === 'best-seller' && p.visible !== false).slice(0, 4);
  const mains = visibleMains();
  return `
  <div class="hero-carousel" id="heroCarousel">
    <div class="hc-track" id="hcTrack">
      <div class="hc-slide"><img src="cover.jpg" alt="AURA LIFESTYLE"><div class="hero-cta"><a class="btn" href="#shop">${t('shopNow')}</a></div></div>
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

  <div class="promo-strip"><div><b>${t('freeShip')}</b><span>${t('freeShipSub')}</span></div><a class="btn" href="#shop">${t('shopCta')}</a></div>

  <section class="section"><div class="section-head"><h2>${t('testi')}</h2></div>
  <div class="testi-grid">${SEED_TESTIMONIALS.slice(0, 3).map((x) => `<div class="testi"><div class="stars">${stars(x.rating)}</div><p>"${esc(x.text)}"</p><b>${esc(x.name)}</b><span>${esc(x.loc)}</span></div>`).join('')}</div></section>

  <section class="section"><div class="newsletter"><h2>${t('nlT')}</h2>
  <form id="nlForm"><input type="email" id="nlEmail" placeholder="${t('nlPh')}" required><button class="btn" type="submit">${t('subscribe')}</button></form></div></section>`;
}

/* ---------------- SHOP ---------------- */
function viewShop(params) {
  const main = params.get('main') || '';
  const sub = params.get('sub') || '';
  const q = (params.get('q') || '').toLowerCase();
  const sort = params.get('sort') || 'popular';
  const maxPrice = parseInt(params.get('max') || '0', 10);
  let list = PRODUCTS.filter((p) => p.stock >= 0 && p.visible !== false);
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
  const heading = main ? (sub ? `${mainLabel} › ${subLabel}` : mainLabel) : (q ? t('searchRes', { q }) : t('shop'));
  const mains = visibleMains();
  const subs = main ? mainOf(main).subs : [];
  const allPrices = PRODUCTS.filter((x) => x.visible !== false).map((x) => x.price);
  const pMin = Math.min(...allPrices), pMax = Math.max(...allPrices);
  const sliderVal = maxPrice > 0 ? Math.min(maxPrice, pMax) : pMax;
  return `<section class="section"><div class="crumb"><a href="#home">${t('home')}</a> › <a href="#shop">${t('shop')}</a>${main ? ` › <a href="#shop?main=${main}">${esc(mainLabel)}</a>` : ''}${sub ? ` › <span>${esc(subLabel)}</span>` : ''}</div>
  <h2 style="color:var(--navy)">${esc(heading)}</h2>
  <div class="filters" style="margin-top:14px">
    <select id="fSort"><option value="popular" ${sort === 'popular' ? 'selected' : ''}>${t('sortPop')}</option><option value="low" ${sort === 'low' ? 'selected' : ''}>${t('sortLow')}</option><option value="high" ${sort === 'high' ? 'selected' : ''}>${t('sortHigh')}</option><option value="new" ${sort === 'new' ? 'selected' : ''}>${t('sortNew')}</option></select>
    <select id="fMax"><option value="0">${t('priceAll')}</option><option value="1000" ${maxPrice === 1000 ? 'selected' : ''}>${t('priceUnder', { n: 1000 })}</option><option value="2000" ${maxPrice === 2000 ? 'selected' : ''}>${t('priceUnder', { n: 2000 })}</option><option value="3000" ${maxPrice === 3000 ? 'selected' : ''}>${t('priceUnder', { n: 3000 })}</option></select>
    <div class="price-slider"><label>${t('maxPrice')}: <b id="fPriceVal">${fmt(sliderVal)}</b></label><input type="range" id="fPrice" min="${pMin}" max="${pMax}" step="50" value="${sliderVal}"></div>
    <input id="fQ" placeholder="${t('shopSearchPh')}" value="${esc(q)}">
  </div>
  <div class="filter-label">${t('filterCat')}</div>
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px">
    <button class="chip ${!main ? 'on' : ''}" onclick="location.hash='#shop'">${t('all')}</button>
    ${mains.map((m) => `<button class="chip ${main === m.slug ? 'on' : ''}" onclick="location.hash='#shop?main=${m.slug}'">${esc(LANG === 'bn' ? m.bn : m.en)}</button>`).join('')}
  </div>
  ${main ? `<div class="filter-label">${esc(mainLabel)} — ${t('subcat')}</div>
  <div class="sub-chips">
    <button class="chip sub-chip ${!sub ? 'on' : ''}" onclick="location.hash='#shop?main=${main}'">${t('all')}</button>
    ${subs.map((s) => `<button class="chip sub-chip ${sub === s.slug ? 'on' : ''}" onclick="location.hash='#shop?main=${main}&sub=${s.slug}'">${esc(LANG === 'bn' ? s.bn : s.en)}</button>`).join('')}
  </div>` : ''}
  ${slice.length ? `<div class="prod-row" id="shopGrid">${slice.map(prodCard).join('')}</div>` : `<div class="empty"><h3>${isSkuQuery ? t('skuNotFound') : t('emptyShop')}</h3><p>${isSkuQuery ? t('skuHint') : t('emptyShopHint')}</p></div>`}
  ${pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => `<button class="${page === i + 1 ? 'on' : ''}" onclick="location.hash='${base}&page=${i + 1}'">${i + 1}</button>`).join('')}</div>` : ''}
  </section>`;
}

/* ---------------- PRODUCT DETAIL ---------------- */
function viewProduct(id) {
  const p = prodById(id);
  if (!p) return `<div class="empty"><h3>${t('prodNotFound')}</h3><a class="btn" href="#shop">${t('backToShop')}</a></div>`;
  const name = LANG === 'bn' ? p.nameBn : p.nameEn;
  const desc = LANG === 'bn' ? p.descBn : p.descEn;
  const off = discount(p);
  const related = [...PRODUCTS.filter((x) => x.visible !== false && x.main === p.main && x.sub === p.sub && x.id !== p.id),
    ...PRODUCTS.filter((x) => x.visible !== false && x.main === p.main && x.sub !== p.sub && x.id !== p.id)].slice(0, 4);
  const seedRv = seedReviews[p.id] || [];
  const imgs = (Array.isArray(p.images) && p.images.length ? p.images : [p.img]).filter(Boolean);
  const waText = encodeURIComponent(`আসসালামু আলাইকুম! আমি এই প্রোডাক্টটি অর্ডার করতে চাই:\n${name} (SKU: ${p.sku || '-'}) — ${fmt(p.price)}\n${location.href}`);
  return `<section class="section"><div class="crumb"><a href="#home">${t('home')}</a> › <a href="#shop">${t('shop')}</a> › <a href="#shop?main=${p.main}">${esc(LANG === 'bn' ? mainOf(p.main).bn : mainOf(p.main).en)}</a> › <a href="#shop?main=${p.main}&sub=${p.sub}">${esc(LANG === 'bn' ? subOf(p.main, p.sub).bn : subOf(p.main, p.sub).en)}</a> › <span>${esc(name)}</span></div><div class="pd">
    <div class="pd-gallery"><img class="main" id="pdMain" src="${esc(imgs[0])}" alt="${esc(name)}" onerror="this.src='${FALLBACK_IMG}'">
    ${imgs.length > 1 ? `<div class="pd-thumbs">${imgs.map((im, i) => `<button class="pd-thumb${i === 0 ? ' on' : ''}" data-src="${esc(im)}" aria-label="${t('imgAlt', { n: i + 1 })}"><img src="${esc(im)}" alt="" onerror="this.src='${FALLBACK_IMG}'" loading="lazy"></button>`).join('')}</div>` : ''}</div>
    <div>
      <span style="color:var(--muted); font-size:13px">${esc(prodMainLabel(p))}</span>
      <h1>${esc(name)}</h1>
      ${p.sku ? `<div class="sku-line">SKU: <b>${esc(p.sku)}</b></div>` : ''}
      <div class="stars">${stars(4.5)} <span style="color:var(--muted); font-size:13px">(4.5)</span></div>
      <div class="pd-price"><b>${fmt(p.price)}</b>${off > 0 ? `<s>${fmt(p.oldPrice)}</s>` : ''}${off > 0 ? ` <span style="color:var(--red); font-weight:700">${t('offPct', { n: off })}</span>` : ''}</div>
      <p class="desc">${esc(desc)}</p>
      <div class="stock ${p.stock === 0 ? 'low' : 'ok'}">${p.stock === 0 ? t('outStock') : (p.stock <= 5 ? t('lowStock', { n: p.stock }) : t('inStock'))}</div>
      <div style="margin-top:14px"><b>${t('sizeSel')}</b></div>
      <div class="size-row" id="sizeRow">${p.sizes.map((s) => `<button class="size-btn" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <div class="err" id="sizeErr"></div>
      <div class="qty-row"><button id="qMinus">−</button><b id="qVal">1</b><button id="qPlus">+</button><span style="color:var(--muted); font-size:13px">${t('qty')}</span></div>
      <div style="display:flex; gap:10px; flex-wrap:wrap"><button class="btn btn-dark" id="pdAdd" ${p.stock === 0 ? 'disabled style="opacity:.5"' : ''}>${t('addCart')}</button><button class="btn" id="pdBuy" ${p.stock === 0 ? 'disabled style="opacity:.5"' : ''}>${t('buyNow')}</button><button class="btn btn-outline" id="pdWish">${wish.includes(p.id) ? t('wished') : t('addWish')}</button></div>
      <div class="order-alt"><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/${esc(SETTINGS.whatsapp)}?text=${waText}">${t('waOrder')}</a></div>
      <div class="meta-box">
        <div>${t('metaDelivery')}</div>
        <div>${t('metaPay')}</div>
        <div>${t('metaReturn')}</div>
      </div>
      <div class="share-row"><button class="btn btn-outline btn-sm" id="shareCopy">${t('copyLink')}</button><a class="btn btn-outline btn-sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('দেখুন: ' + name + ' — ' + fmt(p.price) + ' ' + location.href)}">${t('waShare')}</a></div>
    </div>
  </div>
  <div id="reviewsSection"></div>
  ${related.length ? `<div class="section"><div class="section-head"><h2>${t('related')}</h2></div><div class="prod-row">${related.map(prodCard).join('')}</div></div>` : ''}
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
  toast(t('addedToast', { n: LANG === 'bn' ? p.nameBn : p.nameEn }));
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
  return `<section class="section"><h2 style="color:var(--navy)">${t('cartT')}</h2>
  <div class="cart-layout" style="margin-top:16px"><div class="card">
  ${!cart.length ? `<div class="empty"><h3>${t('cartEmpty')}</h3><p>${t('cartEmptyP')}</p><a class="btn" href="#shop" style="margin-top:12px">${t('shopCta')}</a></div>` :
    cart.map((i) => { const p = prodById(i.id); if (!p) return ''; return `<div class="cart-item"><img src="${esc(p.img)}" onerror="this.src='${FALLBACK_IMG}'" alt=""><div class="ci-info"><b>${esc(LANG === 'bn' ? p.nameBn : p.nameEn)}</b><span>${i.size ? t('sizeLbl') + esc(i.size) + ' • ' : ''}${fmt(p.price)}</span><button class="ci-remove" onclick="removeItem('${esc(i.id)}','${esc(i.size)}')">${t('remove')}</button></div><div class="ci-qty"><button onclick="setQty('${esc(i.id)}','${esc(i.size)}',-1)">−</button><b>${i.qty}</b><button onclick="setQty('${esc(i.id)}','${esc(i.size)}',1)">+</button></div><b>${fmt(p.price * i.qty)}</b></div>`; }).join('')}
  </div><div class="card">
    <h3>${t('orderSummary')}</h3>
    ${total >= freeAbove ? `<p style="color:var(--green); font-weight:700; margin:10px 0">${t('freeShipWon')}</p>` : `<p style="font-size:13px; color:var(--muted); margin:10px 0">${t('freeShipMore', { x: fmt(freeAbove - total) })}</p><div class="ship-progress"><i style="width:${pct}%"></i></div>`}
    <div class="tot-row"><span>${t('subtotal')}</span><b>${fmt(total)}</b></div>
    <div class="tot-row"><span>${t('delivery')}</span><b>${t('delAtCheckout')}</b></div>
    <div class="tot-row grand"><span>${t('total')}</span><b>${fmt(total)}</b></div>
    <a class="btn btn-block" href="#checkout" style="margin-top:12px" ${!cart.length ? 'onclick="return false" style="opacity:.5"' : ''}>${t('checkoutBtn')}</a>
    <a class="btn btn-outline btn-block" href="#shop" style="margin-top:8px">${t('continueShop')}</a>
  </div></div></section>`;
}

/* ================= CHECKOUT ================= */
function deliveryFor(district) {
  if (!district) return null;
  if (district.startsWith('ঢাকা (সিটি)')) return SETTINGS.deliveryCity ?? 70;
  if (district.startsWith('ঢাকা (সাব')) return SETTINGS.deliverySub ?? 90;
  return SETTINGS.deliveryOutside ?? 110;
}
/* free-delivery offer: subtotal >= freeAbove -> delivery ৳0 */
function deliveryCharge(district, subtotal) {
  const freeAbove = SETTINGS.freeAbove || 2000;
  if (subtotal >= freeAbove) return 0;
  return deliveryFor(district);
}
/* dynamic bKash/Nagad account-type label from settings (default: personal) */
function payNumLabel(brand, type) {
  const tp = type === 'merchant' ? t('payTypeMerchant') : t('payTypePersonal');
  return `${brand} (${tp}):`;
}

function viewCheckout() {
  if (!cart.length) return `<div class="empty"><h3>${t('cartEmpty')}</h3><p>${t('cartEmptyP')}</p><a class="btn" href="#shop" style="margin-top:12px">${t('shopCta')}</a></div>`;
  const sub = cartTotal();
  const mBk = LANG === 'bn' ? 'বিকাশ' : 'bKash';
  const mNg = LANG === 'bn' ? 'নগদ' : 'Nagad';
  return `<section class="section"><h2 style="color:var(--navy)">${t('coT')}</h2>
  <form id="coForm" class="cart-layout" style="margin-top:16px"><div>
    <div class="card"><h3>${t('billing')}</h3>
      <div class="field"><label>${t('fName')}</label><input id="coName" required placeholder="${t('fNamePh')}"></div>
      <div class="field"><label>${t('fPhone')}</label><input id="coPhone" required placeholder="01XXXXXXXXX" inputmode="numeric"><div class="hint">${t('fPhoneHint')}</div></div>
      <div class="field"><label>${t('fDistrict')}</label><select id="coDistrict" required><option value="">${t('fDistrictPh')}</option>${DISTRICTS.map((d) => `<option>${esc(d)}</option>`).join('')}</select><div class="hint" id="coDelTime"></div></div>
      <div class="field"><label>${t('fAddr')}</label><textarea id="coAddress" required rows="2" placeholder="${t('fAddrPh')}"></textarea></div>
      <div class="field"><label>${t('fEmail')}</label><input id="coEmail" type="email" placeholder="you@example.com"></div>
      <div class="field"><label>${t('fWhats')}</label><input id="coWhats" placeholder="01XXXXXXXXX"></div>
      <div class="field"><label>${t('fNote')}</label><textarea id="coNote" rows="2" placeholder="${t('fNotePh')}"></textarea></div>
    </div>
    <div class="card" style="margin-top:16px"><h3>${t('payMethod')}</h3>
      <label class="pay-opt sel"><input type="radio" name="pay" value="cod" checked class="pay-radio">
        <b>${t('payCodT')}</b>
        <span>${t('payCodD')}</span>
      </label>
      <label class="pay-opt"><input type="radio" name="pay" value="bkash" class="pay-radio">
        <b>bKash</b>
        <span>${t('payBkashD')}</span>
        <div class="pay-num">${payNumLabel(t('mBkash'), SETTINGS.bkashLabel)} <b>${esc(SETTINGS.bkash)}</b></div>
        <input class="trx-input" id="trxBkash" placeholder="${t('trxPh', { m: mBk })}" style="display:none">
        <input class="trx-input" id="senderBkash" placeholder="${t('senderNum', { m: mBk })}" inputmode="numeric" style="display:none">
      </label>
      <label class="pay-opt"><input type="radio" name="pay" value="nagad" class="pay-radio">
        <b>Nagad</b>
        <span>${t('payNagadD')}</span>
        <div class="pay-num">${payNumLabel(t('mNagad'), SETTINGS.nagadLabel)} <b>${esc(SETTINGS.nagad)}</b></div>
        <input class="trx-input" id="trxNagad" placeholder="${t('trxPh', { m: mNg })}" style="display:none">
        <input class="trx-input" id="senderNagad" placeholder="${t('senderNum', { m: mNg })}" inputmode="numeric" style="display:none">
      </label>
      <label class="check-row"><input type="checkbox" id="coTerms" required> <span>${t('termsAgree')}</span></label>
      <div class="err" id="coErr"></div>
    </div>
  </div><div class="card">
    <h3>${t('coItems')}</h3>
    ${cart.map((i) => { const p = prodById(i.id); if (!p) return ''; return `<div class="tot-row"><span>${esc(LANG === 'bn' ? p.nameBn : p.nameEn)} × ${i.qty}</span><b>${fmt(p.price * i.qty)}</b></div>`; }).join('')}
    <div class="tot-row"><span>${t('subtotal')}</span><b>${fmt(sub)}</b></div>
    <div class="tot-row"><span>${t('delivery')}</span><b id="coDel">${t('fDistrictPh')}</b></div>
    <div class="tot-row grand"><span>${t('total')}</span><b id="coTotal">${fmt(sub)}</b></div>
    <p style="font-size:13px; color:var(--muted); margin-top:10px">${t('coNote')}</p>
    <button class="btn btn-block" type="submit" style="margin-top:12px">${t('confirmOrder')} <span id="coTotalBtn">${fmt(sub)}</span></button>
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
  if (!name) { err.textContent = t('errName'); return; }
  if (!validPhone(phone)) { err.textContent = t('errPhone'); return; }
  if (!district) { err.textContent = t('errDistrict'); return; }
  if (!address) { err.textContent = t('errAddr'); return; }
  let trxId = '', senderNumber = '';
  if (pay === 'bkash' || pay === 'nagad') {
    trxId = $(pay === 'bkash' ? '#trxBkash' : '#trxNagad').value.trim();
    senderNumber = $(pay === 'bkash' ? '#senderBkash' : '#senderNagad').value.trim();
    if (!trxId) { err.textContent = t('errTrx'); return; }
    if (!senderNumber) { err.textContent = t('errSender'); return; }
    if (!validPhone(senderNumber)) { err.textContent = t('errSenderBad'); return; }
  }
  err.textContent = '';
  btn.disabled = true;
  const btnLabel = btn.innerHTML;
  btn.innerHTML = t('ordering');
  try {
    const sub = cartTotal();
    const del = deliveryCharge(district, sub);
    const total = sub + del;
    const orderId = 'AL-' + Math.floor(100000 + Math.random() * 900000);
    const order = {
      orderId, name, phone, district, address, email, whats, note, pay,
      trxId, senderNumber,
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
    err.textContent = t('orderFail');
    btn.disabled = false;
    btn.innerHTML = btnLabel;
  }
}

function viewOrderSuccess(orderId) {
  const o = loadLS('aura_last_order', null);
  const order = (o && o.orderId === orderId) ? o : (localOrders.find((x) => x.orderId === orderId) || null);
  if (!order) return `<section class="section"><div class="empty"><h3>${t('osNotFound')}</h3><p>${t('osIdLbl')} <b>${esc(orderId)}</b></p><div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap"><a class="btn" href="#home">${t('backHome')}</a><a class="btn btn-outline" href="#shop">${t('shopCta')}</a></div></div></section>`;
  const payLabel = { cod: t('payCOD'), bkash: t('payBkash'), nagad: t('payNagad') }[(order.pay || '').toLowerCase()] || esc(order.pay || '');
  return `<section class="section"><div class="card" style="max-width:680px; margin:0 auto">
    <h2 style="color:var(--green); text-align:center">${t('osT')}</h2>
    <p style="text-align:center; margin:10px 0">${t('osId')} <b style="font-size:22px; color:var(--navy)">${esc(orderId)}</b></p>
    <h3 style="margin:16px 0 6px; color:var(--navy)">${t('osItems')}</h3>
    ${(order.items || []).map((i) => `<div class="tot-row"><span>${esc(i.name)} × ${i.qty}${i.size ? ' ' + t('sizeInParen', { s: i.size }) : ''}</span><b>${fmt(i.price * i.qty)}</b></div>`).join('')}
    <div class="tot-row"><span>${t('subtotal')}</span><b>${fmt(order.subtotal)}</b></div>
    <div class="tot-row"><span>${t('delivery')}</span><b>${order.delivery === 0 ? t('freeDel') : fmt(order.delivery)}</b></div>
    <div class="tot-row grand"><span>${t('total')}</span><b>${fmt(order.total)}</b></div>
    <h3 style="margin:16px 0 6px; color:var(--navy)">${t('osDelInfo')}</h3>
    <p style="font-size:14px">${esc(order.name)} • ${esc(order.phone)}<br>${esc(order.district)}<br>${esc(order.address)}</p>
    <p style="font-size:14px; margin-top:6px">${t('osPay')} <b>${payLabel}</b></p>
    ${order.trxId ? `<p style="font-size:14px">${t('osTrx')} <b>${esc(order.trxId)}</b></p>` : ''}
    ${order.senderNumber ? `<p style="font-size:14px">${t('osPayNum')} <b>${esc(order.senderNumber)}</b></p>` : ''}
    <p style="color:var(--muted); font-size:14px; margin-top:10px">${t('osNote')}</p>
    <div style="display:flex; gap:10px; justify-content:center; margin-top:16px; flex-wrap:wrap"><a class="btn" href="#track">${t('track')}</a><a class="btn btn-outline" href="#shop">${t('continueShop')}</a></div>
  </div></section>`;
}

/* ================= TRACK ORDER ================= */
function viewTrack() {
  return `<section class="section"><div class="card" style="max-width:640px; margin:0 auto">
    <h2 style="color:var(--navy)">${t('trT')}</h2>
    <p style="color:var(--muted); font-size:14px; margin:8px 0">${t('trDesc')}</p>
    <div class="field"><label>${t('trId')}</label><input id="trId" placeholder="AL-123456"></div>
    <div class="field"><label>${t('trPhone')}</label><input id="trPhone" placeholder="01XXXXXXXXX"></div>
    <div class="err" id="trErr"></div>
    <button class="btn btn-block" id="trBtn">${t('track')}</button>
    <div id="trResult"></div>
  </div></section>`;
}

function stageLabel(key) {
  const s = STAGES.find((x) => x.key === key) || { bn: key, en: key };
  return LANG === 'bn' ? s.bn : s.en;
}

function renderTrackResult(o) {
  const el = $('#trResult');
  if (!o) { el.innerHTML = `<div class="empty"><h3>${t('trNotFound')}</h3><p>${t('trNotFoundP')}</p></div>`; return; }
  const stage = o.stage || 'pending';
  const idx = STAGES.findIndex((s) => s.key === stage);
  const visible = STAGES.filter((s) => s.key !== 'cancelled');
  const cancelled = stage === 'cancelled';
  el.innerHTML = `<div style="margin-top:18px">
    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px"><b>${t('osIdLbl')} ${esc(o.orderId)}</b><span class="status-pill ${cancelled ? 'cancelled' : (stage === 'delivered' ? 'delivered' : '')}">${stageLabel(stage)}</span></div>
    <p style="font-size:14px; color:var(--muted); margin-top:6px">${t('trTotal')} ${fmt(o.total)} • ${t('osPay')} ${esc((o.pay || '').toUpperCase())} • ${esc(o.district || '')}</p>
    ${cancelled ? `<p style="color:var(--red); font-weight:700; margin-top:10px">${t('trCancelled')}${o.cancelReason ? ' ' + t('trReason') + ' ' + esc(o.cancelReason) : ''}</p>` :
    `<div class="timeline">${visible.map((s) => { const si = STAGES.findIndex((x) => x.key === s.key); const cls = si < idx ? 'done' : (si === idx ? 'current' : ''); return `<div class="tl-step ${cls}"><b>${stageLabel(s.key)}</b><span>${si <= idx ? t('trDone') : t('trPending')}</span></div>`; }).join('')}</div>`}
    ${o.courier ? `<div class="courier-box"><b>${t('trCourier')} ${esc(o.courier)}</b><br>${t('trTracking')} <b>${esc(o.trackingNumber || '-')}</b>${o.dispatchDate ? `<br>${t('trDispatch')} ${esc(o.dispatchDate)}` : ''}<br><span style="font-size:13px">${t('trCourierHint')}</span></div>` : ''}
    <div style="margin-top:10px"><b>${t('trItems')}</b>${(o.items || []).map((i) => `<div class="tot-row"><span>${esc(i.name)} × ${i.qty}${i.size ? ' ' + t('sizeInParen', { s: i.size }) : ''}</span><b>${fmt(i.price * i.qty)}</b></div>`).join('')}</div>
  </div>`;
}

async function doTrack() {
  const id = $('#trId').value.trim();
  const phone = $('#trPhone').value.trim();
  if (!id || !phone) { $('#trErr').textContent = t('trErr'); return; }
  $('#trErr').textContent = '';
  let o = await fetchOrder(id, phone);
  if (!o) o = localOrders.find((x) => x.orderId === id && x.phone === phone) || null;
  /* Firebase connected + guest: public status mirror (শুধু status, customer data ছাড়া) */
  if (!o && typeof fb.fetchOrderStatus === 'function') {
    try {
      const s = await fb.fetchOrderStatus(id);
      if (s && s.orderId) { renderTrackStatusOnly(s); return; }
    } catch { /* fall through to not-found */ }
  }
  renderTrackResult(o);
}

/* শুধু status দেখায় — mirror-এ items/total থাকে না */
function renderTrackStatusOnly(s) {
  const el = $('#trResult');
  const stage = s.status || 'pending';
  const idx = STAGES.findIndex((x) => x.key === stage);
  const visible = STAGES.filter((x) => x.key !== 'cancelled');
  const cancelled = stage === 'cancelled';
  el.innerHTML = `<div style="margin-top:18px">
    <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px"><b>${t('osIdLbl')} ${esc(s.orderId)}</b><span class="status-pill ${cancelled ? 'cancelled' : (stage === 'delivered' ? 'delivered' : '')}">${stageLabel(stage)}</span></div>
    ${cancelled ? '' : `<div class="timeline">${visible.map((x) => { const si = STAGES.findIndex((y) => y.key === x.key); const cls = si < idx ? 'done' : (si === idx ? 'current' : ''); return `<div class="tl-step ${cls}"><b>${stageLabel(x.key)}</b><span>${si <= idx ? t('trDone') : t('trPending')}</span></div>`; }).join('')}</div>`}
  </div>`;
}

/* ================= WISHLIST ================= */
function viewWishlist() {
  const list = PRODUCTS.filter((p) => wish.includes(p.id));
  return `<section class="section"><h2 style="color:var(--navy)">${t('wishT')}</h2>
  ${list.length ? `<div class="prod-row" style="margin-top:16px">${list.map(prodCard).join('')}</div>` : `<div class="empty"><h3>${t('wishEmpty')}</h3><p>${t('wishEmptyP')}</p><a class="btn" href="#shop">${t('shopCta')}</a></div>`}</section>`;
}

/* ================= REVIEWS ================= */
async function loadReviews(productId) {
  const box = $('#reviewsSection');
  if (!box) return;
  const remote = await fetchReviews(productId);
  const all = [...(seedReviews[productId] || []), ...remote.map((r) => ({ name: r.name, rating: r.rating, text: r.text, date: r.createdAt ? new Date(r.createdAt.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '', verified: !!r.verified }))];
  const avg = all.length ? (all.reduce((s, r) => s + r.rating, 0) / all.length) : 0;
  const counts = [5, 4, 3, 2, 1].map((n) => all.filter((r) => r.rating === n).length);
  box.innerHTML = `<div class="review-box"><h3>${t('testi')}</h3>
    ${all.length ? `<p><b>${avg.toFixed(1)} / 5</b> <span class="stars">${stars(avg)}</span> • ${t('revCount', { n: all.length })}</p>
    <div class="rating-break">${counts.map((c, i) => `<div class="rb"><span>${5 - i}★</span><div class="bar"><i style="width:${all.length ? Math.round(c / all.length * 100) : 0}%"></i></div><span>${c}</span></div>`).join('')}</div>
    ${all.map((r) => `<div class="review"><div class="stars">${stars(r.rating)}</div><b>${esc(r.name)}</b>${r.verified ? '<span class="verified">' + t('verified') + '</span>' : ''}<span class="rv-meta"> • ${esc(r.date)}</span><p>${esc(r.text)}</p></div>`).join('')}` : `<p style="color:var(--muted)">${t('revNone')}</p>`}
    <h4 style="margin-top:16px">${t('revWrite')}</h4>
    <div class="field"><label>${t('revName')}</label><input id="rvName" placeholder="${t('revNamePh')}"></div>
    <div class="field"><label>${t('revRating')}</label><div class="star-input" id="rvStars">${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}">★</button>`).join('')}</div></div>
    <div class="field"><label>${t('revText')}</label><textarea id="rvText" rows="3" maxlength="500" placeholder="${t('revTextPh')}"></textarea></div>
    <div class="err" id="rvErr"></div>
    <button class="btn" id="rvSubmit">${t('revSubmit')}</button>
</div>`;
  let chosen = 0;
  $$('#rvStars button').forEach((b) => b.addEventListener('click', () => {
    chosen = parseInt(b.dataset.star, 10);
    $$('#rvStars button').forEach((x) => x.classList.toggle('on', parseInt(x.dataset.star, 10) <= chosen));
  }));
  $('#rvSubmit').addEventListener('click', async () => {
    const name = $('#rvName').value.trim();
    const text = $('#rvText').value.trim();
    if (!name || !text) { $('#rvErr').textContent = t('revErr1'); return; }
    if (!chosen) { $('#rvErr').textContent = t('revErr2'); return; }
    const key = `aura_reviewed_${productId}_${new Date().toISOString().slice(0, 10)}`;
    if (localStorage.getItem(key)) { $('#rvErr').textContent = t('revErr3'); return; }
    const ok = await submitReview({ productId, name, rating: chosen, text, verified: false });
    if (ok) { localStorage.setItem(key, '1'); toast(t('revOk')); loadReviews(productId); }
    else { $('#rvErr').textContent = t('revErr4'); }
  });
}

/* ================= INFO PAGES ================= */
function viewFaq() {
  return `<section class="section"><div class="info-page"><h1>${t('faqT')}</h1>${SEED_FAQS.map((f) => `<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false">${esc(f.q)} <span>+</span></button><div class="faq-a">${esc(f.a)}</div></div>`).join('')}</div></section>`;
}
function viewContact() {
  return `<section class="section"><div class="info-page"><h1>${t('ctT')}</h1>
  <p>${t('ctP')}</p>
  <p><b>${t('ctHotline')}</b> ${esc(SETTINGS.phone)} ${t('ctHours')}</p>
  <p><b>${t('ctEmail')}</b> ${esc(SETTINGS.email)}</p>
  <p><b>${t('ctAddr')}</b> ${esc(SETTINGS.address)}</p>
  <p><b>WhatsApp:</b> <a href="https://wa.me/${esc(SETTINGS.whatsapp)}" target="_blank" rel="noopener" style="color:var(--green); font-weight:700">${t('ctWa')}</a></p>
  <form id="contactForm" style="margin-top:18px"><div class="field"><label>${t('ctName')}</label><input required></div><div class="field"><label>${t('ctPhone')}</label><input required placeholder="01XXXXXXXXX"></div><div class="field"><label>${t('ctMsg')}</label><textarea required rows="4"></textarea></div><button class="btn" type="submit">${t('ctSend')}</button></form>
  </div></section>`;
}
function viewDelivery() {
  return `<section class="section"><div class="info-page"><h1>${t('dlT')}</h1>
  <h2>${t('dlTimeH')}</h2><p>${t('dlTimeP')}</p>
  <h2>${t('dlChargeH')}</h2><ul><li>${t('dlCity', { n: SETTINGS.deliveryCity })}</li><li>${t('dlSub', { n: SETTINGS.deliverySub })}</li><li>${t('dlOut', { n: SETTINGS.deliveryOutside })}</li><li>${t('dlFree', { n: SETTINGS.freeAbove })}</li></ul>
  <h2>${t('dlCourierH')}</h2><p>${t('dlCourierP')}</p>
  <h2>${t('dlTrackH')}</h2><p>${t('dlTrackP')}</p></div></section>`;
}
function viewReturns() {
  return `<section class="section"><div class="info-page"><h1>${t('rtT')}</h1>
  <h2>${t('rtCheckH')}</h2><p>${t('rtCheckP')}</p>
  <h2>${t('rtDamageH')}</h2><p>${t('rtDamageP')}</p>
  <h2>${t('rtMindH')}</h2><p>${t('rtMindP')}</p>
  <h2>${t('rtRefundH')}</h2><p>${t('rtRefundP')}</p>
  <h2>${t('rtContactH')}</h2><p>${t('rtContactP', { p: esc(SETTINGS.phone) })}</p></div></section>`;
}
function viewPrivacy() {
  return `<section class="section"><div class="info-page"><h1>${t('prT')}</h1>
  <p><b>${t('prDate')}</b> ${LANG === 'bn' ? '১৪ অক্টোবর ২০২৬' : '14 October 2026'}</p>
  <h2>${t('prH1')}</h2><p>${t('prP1')}</p>
  <h2>${t('prH2')}</h2><p>${t('prP2')}</p>
  <h2>${t('prH3')}</h2><p>${t('prP3')}</p>
  <h2>${t('prH4')}</h2><p>${t('prP4')}</p>
  <h2>${t('prH5')}</h2><p>${t('prP5', { e: esc(SETTINGS.email) })}</p></div></section>`;
}
function viewTerms() {
  return `<section class="section"><div class="info-page"><h1>${t('tmT')}</h1>
  <h2>${t('tmH1')}</h2><p>${t('tmP1')}</p>
  <h2>${t('tmH2')}</h2><p>${t('tmP2')}</p>
  <h2>${t('tmH3')}</h2><p>${t('tmP3')}</p>
  <h2>${t('tmH4')}</h2><p>${t('tmP4')}</p>
  <h2>${t('tmH5')}</h2><p>${t('tmP5')}</p>
  <h2>${t('tmH6')}</h2><p>${t('tmP6')}</p></div></section>`;
}
function viewAbout() {
  return `<section class="section"><div class="info-page"><h1>${t('abT')}</h1>
  <p>${t('abP1')}</p>
  <h2>${t('abH2')}</h2><ul><li>${t('abL1')}</li><li>${t('abL2')}</li><li>${t('abL3')}</li><li>${t('abL4')}</li></ul>
  <h2>${t('abH3')}</h2><p>${esc(SETTINGS.address)} • ${esc(SETTINGS.phone)} • ${esc(SETTINGS.email)}</p></div></section>`;
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
    el.innerHTML = `<div class="cd"><b>${h}</b><span>${t('cdH')}</span></div><div class="cd"><b>${m}</b><span>${t('cdM')}</span></div><div class="cd"><b>${s}</b><span>${t('cdS')}</span></div>`;
  }, 1000);
}

/* ================= per-page bindings ================= */
const _origBind = bindDynamic;
bindDynamic = function () {
  _origBind();
  /* newsletter */
  const nl = $('#nlForm');
  if (nl) nl.addEventListener('submit', (e) => { e.preventDefault(); const em = $('#nlEmail').value.trim(); if (!/^\S+@\S+\.\S+$/.test(em)) { toast(t('nlBad')); return; } toast(t('nlOk')); nl.reset(); });
  /* contact form */
  const cf = $('#contactForm');
  if (cf) cf.addEventListener('submit', (e) => { e.preventDefault(); toast(t('ctOk')); cf.reset(); });
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
    const pdMain = $('#pdMain');
    if (pdMain) { pdMain.style.cursor = 'zoom-in'; pdMain.title = t('zoomHint'); pdMain.addEventListener('click', () => openLightbox(pdMain.src)); }
    $$('.pd-thumb').forEach((th) => th.addEventListener('click', () => {
      const main = $('#pdMain');
      if (main) main.src = th.dataset.src;
      $$('.pd-thumb').forEach((x) => x.classList.toggle('on', x === th));
    }));
    $('#qMinus').addEventListener('click', () => { qty = Math.max(1, qty - 1); $('#qVal').textContent = qty; });
    $('#qPlus').addEventListener('click', () => { qty = Math.min(99, qty + 1); $('#qVal').textContent = qty; });
    $('#pdAdd').addEventListener('click', () => { if (!selSize && prodById(pid)?.sizes?.length) { $('#sizeErr').textContent = t('sizeErr'); return; } addToCart(pid, qty, selSize); });
    $('#pdBuy').addEventListener('click', () => { if (!selSize && prodById(pid)?.sizes?.length) { $('#sizeErr').textContent = t('sizeErr'); return; } addToCart(pid, qty, selSize); location.hash = '#checkout'; });
    $('#pdWish').addEventListener('click', () => toggleWish(pid));
    $('#shareCopy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); toast(t('linkCopied')); } catch { toast(t('linkCopyFail')); } });
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
        o.querySelectorAll('.trx-input').forEach((ti) => { ti.style.display = checked ? 'block' : 'none'; });
      });
    }));
    $('#coDistrict').addEventListener('change', () => {
      const dv = $('#coDistrict').value;
      const sub = cartTotal();
      const dt = $('#coDelTime');
      if (dt) dt.textContent = !dv ? '' : (dv.startsWith('ঢাকা (সিটি)') ? t('delTimeIn') : t('delTimeOut'));
      const d = deliveryCharge(dv, sub);
      if (d === null) { $('#coDel').textContent = t('fDistrictPh'); $('#coTotal').textContent = fmt(sub); $('#coTotalBtn').textContent = fmt(sub); }
      else if (d === 0) { $('#coDel').innerHTML = `<span style="color:var(--green);font-weight:700">${t('freeDel')}</span>`; $('#coTotal').textContent = fmt(sub); $('#coTotalBtn').textContent = fmt(sub); }
      else { $('#coDel').textContent = fmt(d); $('#coTotal').textContent = fmt(sub + d); $('#coTotalBtn').textContent = fmt(sub + d); }
    });
  }
  /* track */
  const tr = $('#trBtn');
  if (tr) tr.addEventListener('click', doTrack);
  /* signin */
  const tabL = $('#tabLogin'), tabS = $('#tabSignup');
  if (tabL && tabS) {
    const showTab = (login) => {
      tabL.classList.toggle('on', login); tabS.classList.toggle('on', !login);
      $('#siLoginBox').style.display = login ? 'block' : 'none';
      $('#siSignupBox').style.display = login ? 'none' : 'block';
    };
    tabL.addEventListener('click', () => showTab(true));
    tabS.addEventListener('click', () => showTab(false));
  }
  const liBtn = $('#siLoginBtn');
  if (liBtn) liBtn.addEventListener('click', () => {
    const em = $('#siEmail').value.trim(), pw = $('#siPw').value;
    if (!/^\S+@\S+\.\S+$/.test(em)) { $('#siErr').textContent = t('siErrEmail'); return; }
    if (pw.length < 8) { $('#siErr').textContent = t('siErrPw'); return; }
    $('#siErr').textContent = '';
    doLogin(em, pw);
  });
  const suBtn = $('#siSignupBtn');
  if (suBtn) suBtn.addEventListener('click', () => {
    const nm = $('#siName').value.trim(), em = $('#suEmail').value.trim(), pw = $('#suPw').value;
    if (!nm) { $('#suErr').textContent = t('siErrName'); return; }
    if (!/^\S+@\S+\.\S+$/.test(em)) { $('#suErr').textContent = t('siErrEmail'); return; }
    if (pw.length < 8) { $('#suErr').textContent = t('siErrPw'); return; }
    $('#suErr').textContent = '';
    doSignup(nm, em, pw);
  });
  const fgLink = $('#siForgotLink');
  if (fgLink) fgLink.addEventListener('click', (e) => { e.preventDefault(); const b = $('#siForgotBox'); if (b) b.style.display = b.style.display === 'none' ? 'block' : 'none'; });
  const fgBtn = $('#siForgotBtn');
  if (fgBtn) fgBtn.addEventListener('click', async () => {
    const em = $('#siForgotEmail').value.trim();
    if (!/^\S+@\S+\.\S+$/.test(em)) { $('#siErr').textContent = t('siErrEmail'); return; }
    $('#siErr').textContent = '';
    if (!isConfigured() || typeof fb.resetPassword !== 'function') { toast(t('siDemo')); return; }
    try { await fb.resetPassword(em); toast(t('siForgotOk')); }
    catch { $('#siErr').textContent = t('siLoginFail'); }
  });
  const outBtn = $('#siLogout');
  if (outBtn) outBtn.addEventListener('click', () => { try { localStorage.removeItem('aura_user'); } catch {} route(); });
  if ($('#accOrders')) loadAccountOrders();
};

/* ================= lightbox ================= */
function openLightbox(src) {
  const lb = $('#lightbox');
  if (!lb || !src) return;
  $('#lbImg').src = src;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  const lb = $('#lightbox');
  if (!lb || !lb.classList.contains('open')) return;
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ================= hamburger drawer ================= */
function openDrawer() {
  const d = $('#drawer');
  if (!d) return;
  buildDrawer();
  d.classList.add('open');
  $('#drawerBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  const d = $('#drawer');
  if (!d || !d.classList.contains('open')) return;
  d.classList.remove('open');
  $('#drawerBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}
function buildDrawer() {
  const nav = $('#drawerNav');
  if (!nav) return;
  const cats = visibleMains().map((m) => `<a href="#shop?main=${m.slug}">${esc(LANG === 'bn' ? m.bn : m.en)}</a>`).join('');
  nav.innerHTML = `<a href="#track">${t('track')}</a><a href="#signin">${t('signin')}</a><a href="#wishlist">${t('wishlist')}</a><a href="#shop">${t('shop')}</a>`
    + `<div class="drawer-h">${t('drawerCats')}</div>${cats}`
    + `<div class="drawer-h">${t('drawerInfo')}</div>`
    + `<a href="#about">${t('fAbout')}</a><a href="#contact">${t('ctT')}</a><a href="#faq">${t('faqT')}</a><a href="#delivery">${t('dlT')}</a><a href="#returns">${t('rtT')}</a><a href="#terms">${t('tmT')}</a>`;
}

/* ================= static chrome i18n (header/footer/drawer) ================= */
function applyStaticI18n() {
  document.documentElement.lang = LANG;
  const si = $('#searchInput');
  if (si) si.placeholder = t('searchPh');
  const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
  set('trackLink', t('track'));
  set('signinLink', t('signin'));
  set('wishLbl', t('wishlist'));
  set('cartLbl', t('cart'));
  set('drawerTitle', t('drawerMenu'));
  set('fBlurb', t('fBlurb'));
  set('fShopH', t('fShopH'));
  set('fInfoH', t('fInfoH'));
  set('fTalkH', t('fTalkH'));
  set('fBottom', t('fBottom'));
  const lb = $('#langBtn');
  if (lb) { lb.textContent = LANG === 'bn' ? 'EN' : 'বাং'; lb.title = LANG === 'bn' ? 'Switch to English' : 'বাংলায় দেখুন'; }
  const dl = $('#drawerLang');
  if (dl) dl.textContent = LANG === 'bn' ? 'EN' : 'বাং';
  const mb = $('#menuBtn');
  if (mb) mb.setAttribute('aria-label', t('drawerMenu'));
  const cb = $('#cartBubble');
  if (cb) cb.setAttribute('aria-label', t('viewCartLbl'));
  const lbc = $('#lbClose');
  if (lbc) lbc.setAttribute('aria-label', t('closeLbl'));
  const dc2 = $('#drawerClose');
  if (dc2) dc2.setAttribute('aria-label', t('closeLbl'));
  const dr = $('#drawer');
  if (dr) dr.setAttribute('aria-label', t('drawerMenu'));
  const fh = $('#fHotline');
  if (fh) fh.innerHTML = t('fHours', { p: esc(SETTINGS.phone) });
  set('fEmail', SETTINGS.email);
  set('fAddr', SETTINGS.address);
  set('fContactLink', t('fContact'));
  const sl = $('#fShopLinks');
  if (sl) sl.innerHTML = `<a href="#shop">${t('shop')}</a>` + visibleMains().map((m) => `<a href="#shop?main=${m.slug}">${esc(LANG === 'bn' ? m.bn : m.en)}</a>`).join('');
  const il = $('#fInfoLinks');
  if (il) il.innerHTML = `<a href="#about">${t('fAbout')}</a><a href="#track">${t('track')}</a><a href="#delivery">${t('dlT')}</a><a href="#returns">${t('rtT')}</a><a href="#privacy">${t('prT')}</a><a href="#terms">${t('tmT')}</a>`;
  const pb = $('#payBadges');
  if (pb) pb.innerHTML = `<span>${t('payCOD')}</span><span>bKash</span><span>Nagad</span>`;
  buildDrawer();
}

/* ================= sign in / account ================= */
function viewSignin() {
  const u = loadLS('aura_user', null);
  if (u) return viewAccount(u);
  return `<section class="section"><div class="card" style="max-width:480px; margin:0 auto">
    <h2 style="color:var(--navy); text-align:center">${t('signin')}</h2>
    <div class="si-tabs"><button class="chip on" id="tabLogin" type="button">${t('siLogin')}</button><button class="chip" id="tabSignup" type="button">${t('siSignup')}</button></div>
    <div id="siLoginBox">
      <div class="field"><label>${t('siEmail')}</label><input id="siEmail" type="email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>${t('siPw')}</label><input id="siPw" type="password" placeholder="••••••••" autocomplete="current-password"></div>
      <div class="err" id="siErr"></div>
      <button class="btn btn-block" id="siLoginBtn" type="button">${t('siLoginBtn')}</button>
      <p style="text-align:center; margin-top:12px"><a href="#" id="siForgotLink" style="color:var(--gold); font-weight:700">${t('siForgot')}</a></p>
      <div id="siForgotBox" style="display:none; margin-top:10px">
        <div class="field"><label>${t('siEmail')}</label><input id="siForgotEmail" type="email" placeholder="you@example.com"></div>
        <button class="btn btn-outline btn-block" id="siForgotBtn" type="button">${t('siForgotBtn')}</button>
      </div>
    </div>
    <div id="siSignupBox" style="display:none">
      <div class="field"><label>${t('siName')}</label><input id="siName" placeholder="${t('siName')}" autocomplete="name"></div>
      <div class="field"><label>${t('siEmail')}</label><input id="suEmail" type="email" placeholder="you@example.com" autocomplete="email"></div>
      <div class="field"><label>${t('siPw')}</label><input id="suPw" type="password" placeholder="••••••••" autocomplete="new-password"></div>
      <div class="err" id="suErr"></div>
      <button class="btn btn-block" id="siSignupBtn" type="button">${t('siSignupBtn')}</button>
    </div>
  </div></section>`;
}
function viewAccount(u) {
  return `<section class="section"><div class="card" style="max-width:640px; margin:0 auto">
    <h2 style="color:var(--navy)">${t('siAccount')}</h2>
    <p style="margin:8px 0">${t('siWelcome', { n: esc(u.name || u.email) })}</p>
    <p style="font-size:14px; color:var(--muted)">${esc(u.email || '')}</p>
    <div style="margin:12px 0"><button class="btn btn-outline btn-sm" id="siLogout" type="button">${t('siLogout')}</button></div>
    <h3 style="color:var(--navy); margin:16px 0 6px">${t('siMyOrders')}</h3>
    <div id="accOrders"><p style="color:var(--muted)">…</p></div>
  </div></section>`;
}
function saveSessionUser(user) {
  const u = { name: user.displayName || user.name || '', email: user.email || '', uid: user.uid || '' };
  if (!u.name && u.email) u.name = u.email.split('@')[0];
  saveLS('aura_user', u);
  return u;
}
async function doLogin(email, pw) {
  if (!isConfigured() || typeof fb.signIn !== 'function') { toast(t('siDemo')); return; }
  try {
    const r = await fb.signIn(email, pw);
    const user = (r && r.user) || r;
    if (user && (user.email || user.uid)) {
      const u = saveSessionUser(user);
      toast(t('siWelcome', { n: u.name || u.email }));
      route();
    } else { $('#siErr').textContent = t('siLoginFail'); }
  } catch { const e = $('#siErr'); if (e) e.textContent = t('siLoginFail'); }
}
async function doSignup(name, email, pw) {
  if (!isConfigured() || typeof fb.signUp !== 'function') { toast(t('siDemo')); return; }
  try {
    const r = await fb.signUp(name, email, pw);
    const user = (r && r.user) || r;
    if (user && (user.email || user.uid)) {
      const u = saveSessionUser({ ...user, name: user.displayName || user.name || name, email: user.email || email });
      toast(t('siWelcome', { n: u.name || u.email }));
      route();
    } else { $('#suErr').textContent = t('siSignupFail'); }
  } catch { const e = $('#suErr'); if (e) e.textContent = t('siSignupFail'); }
}
async function loadAccountOrders() {
  const box = $('#accOrders');
  if (!box) return;
  const u = loadLS('aura_user', null);
  let orders = [];
  if (u && isConfigured() && typeof fb.fetchUserOrders === 'function') {
    try { orders = (await fb.fetchUserOrders(u.uid || u.email)) || []; } catch { orders = []; }
  } else {
    orders = [...localOrders].reverse();
  }
  if (!orders.length) { box.innerHTML = `<p style="color:var(--muted)">${t('siNoOrders')}</p>`; return; }
  box.innerHTML = orders.map((o) => {
    const dt = (o.createdAt || '').slice(0, 10);
    return `<div class="acc-row"><div><b>${esc(o.orderId || '')}</b><div style="font-size:13px; color:var(--muted)">${esc(dt)} • ${esc(stageLabel(o.stage || 'pending'))}</div></div><b>${fmt(o.total || 0)}</b></div>`;
  }).join('');
}

/* expose inline handlers */
window.setQty = setQty;
window.removeItem = removeItem;

init();
