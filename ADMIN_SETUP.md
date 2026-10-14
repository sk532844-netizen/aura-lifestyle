# AURA LIFESTYLE — Firebase সেটআপ (সকালের কাজ)

অ্যাডমিন প্যানেল + আসল অর্ডার চালাতে এই ৭টা ধাপ করুন। সময় লাগবে ~১৫ মিনিট। সব ফ্রি (Spark plan)।

## ধাপ ১ — Firebase প্রজেক্ট বানান
1. [console.firebase.google.com](https://console.firebase.google.com) খুলুন, Google দিয়ে লগইন করুন
2. **Add project** → নাম দিন `aura-lifestyle` → Continue
3. Google Analytics চাইলে চালু রাখুন (ঐচ্ছিক) → **Create project**

## ধাপ ২ — Email/Password লগইন চালু + admin user বানান
1. বাম মেনু → **Build → Authentication** → **Get started**
2. **Sign-in method** ট্যাব → **Email/Password** → Enable → Save
3. **Users** ট্যাব → **Add user** → আপনার ইমেইল + শক্ত পাসওয়ার্ড দিন → Add user
4. ওই user-এর লাইনে মাউস রাখুন → **UID কপি করুন** (পরে লাগবে)

## ধাপ ৩ — Firestore Database তৈরি
1. বাম মেনু → **Build → Firestore Database** → **Create database**
2. **Start in production mode** → Next
3. Location: **asia-south1 (Mumbai)** → Enable
4. **Rules** ট্যাবে যান (ধাপ ৬-এ লাগবে)

## ধাপ ৪ — Web app config কপি
1. প্রজেক্টের **Project Overview** → **</>** (Web) আইকন → নাম `aura-web` → Register
2. `firebaseConfig` অংশের ৬টা মান কপি করুন (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId)

## ধাপ ৫ — config + UID ফাইলে বসান
1. `firebase.js` খুলুন → `FIREBASE_CONFIG`-এর ৬টা `PASTE_YOUR_...` জায়গায় ধাপ ৪-এর মান বসান
2. `firestore.rules` খুলুন → `'PASTE_ADMIN_UID_HERE'`-এর জায়গায় ধাপ ২-এর UID বসান

## ধাপ ৬ — Rules deploy করুন
কম্পিউটারে একবার (Node.js থাকতে হবে):
```bash
npm install -g firebase-tools
firebase login
cd ~/workspace/aura-lifestyle
firebase init firestore   # প্রজেক্ট select করুন, বিদ্যমান firestore.rules ব্যবহার করুন
firebase deploy --only firestore:rules
```

## ধাপ ৭ — লগইন করুন
1. `admin.html` ফাইলটা deploy-এর পর সাইটে যাবে (যেমন `https://sk532844-netizen.github.io/aura-lifestyle/admin.html`)
2. ধাপ ২-এর ইমেইল + পাসওয়ার্ড দিয়ে লগইন করুন

## প্রথম লগইনের পর
- **Products** ট্যাবে **"৫৫টি প্রোডাক্ট আপলোড করুন"** চাপুন (seed প্রোডাক্ট Firestore-এ যাবে — নইলে সাইটে প্রোডাক্ট দেখাবে না)
- **Settings** ট্যাবে **"ডিফল্ট সেটিংস সেভ করুন"** চাপুন, তারপর আসল বিকাশ/নগদ নম্বর বসান
- পাসওয়ার্ড ভুলে গেলে লগইন পেজের **"পাসওয়ার্ড ভুলে গেছেন?"** চাপুন — রিসেট লিংক ইমেইলে যাবে (ফ্রি)

> নোট: এই প্যানেলে কোথাও পাসওয়ার্ড লেখা নেই — লগইন Firebase Authentication দিয়ে হয়, তাই নিরাপদ।
