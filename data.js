/* AURA LIFESTYLE — seed data (used when Firestore is empty / not configured) */
const U = (id) => `https://images.unsplash.com/${id}?q=80&w=800&auto=format&fit=crop`;

const CATEGORIES = [
  { slug: 'panjabi', bn: 'পাঞ্জাবি', en: 'Panjabi', img: U('photo-1603252109303-2751441dd157') },
  { slug: 'shirt', bn: 'শার্ট', en: 'Shirt', img: U('photo-1596755094514-f87e34085b2c') },
  { slug: 'tshirt', bn: 'টি-শার্ট', en: 'T-Shirt', img: U('photo-1521572163474-6864f9cf17ab') },
  { slug: 'polo', bn: 'পোলো শার্ট', en: 'Polo Shirt', img: U('photo-1586790170083-2f9ceadc732d') },
  { slug: 'pant', bn: 'প্যান্ট', en: 'Pant & Trouser', img: U('photo-1542272604-787c3835535d') },
  { slug: 'attar', bn: 'আতর', en: 'Attar', img: U('photo-1541643600914-78b084683601') },
  { slug: 'sneakers', bn: 'স্নিকার্স', en: 'Sneakers', img: U('photo-1549298916-b41d501d3772') },
  { slug: 'winter', bn: 'শীতের পোশাক', en: 'Winter', img: U('photo-1551028719-00167b16eac5') },
  { slug: 'kids', bn: 'কিডস', en: 'Kids', img: U('photo-1471286174890-9c112ffca5b4') },
];

const SEED_PRODUCTS = [
  { id: 'p01', nameBn: 'প্রিমিয়াম কটন পাঞ্জাবি', nameEn: 'Premium Cotton Panjabi', cat: 'panjabi', price: 1890, oldPrice: 2690, img: U('photo-1603252109303-2751441dd157'), descBn: '১০০% সুতি কাপড়ের আরামদায়ক পাঞ্জাবি। ঈদ ও অনুষ্ঠানের জন্য উপযুক্ত।', descEn: 'Comfortable 100% cotton panjabi, perfect for Eid and occasions.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 24, tag: 'best-seller' },
  { id: 'p02', nameBn: 'লাক্সারি সিল্ক পাঞ্জাবি', nameEn: 'Luxury Silk Panjabi', cat: 'panjabi', price: 2690, oldPrice: 3490, img: U('photo-1610652492500-ded49ceeb378'), descBn: 'সিল্ক ফেব্রিকের প্রিমিয়াম পাঞ্জাবি, হাতে করা বোতাম ডিটেইল।', descEn: 'Premium silk-fabric panjabi with hand-finished button detail.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 12, tag: 'featured' },
  { id: 'p03', nameBn: 'ক্লাসিক ফরমাল শার্ট', nameEn: 'Classic Formal Shirt', cat: 'shirt', price: 1450, oldPrice: 1950, img: U('photo-1596755094514-f87e34085b2c'), descBn: 'অফিস ও ফরমাল অনুষ্ঠানের জন্য ক্লাসিক ফিট শার্ট।', descEn: 'Classic-fit shirt for office and formal occasions.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 30, tag: 'best-seller' },
  { id: 'p04', nameBn: 'ক্যাজুয়াল চেক শার্ট', nameEn: 'Casual Check Shirt', cat: 'shirt', price: 1250, oldPrice: 1650, img: U('photo-1598033129183-c4f50c736f10'), descBn: 'নরম কাপড়ের ক্যাজুয়াল চেক শার্ট, প্রতিদিনের জন্য।', descEn: 'Soft-fabric casual check shirt for everyday wear.', sizes: ['M', 'L', 'XL'], stock: 18, tag: 'new' },
  { id: 'p05', nameBn: 'সলিড কটন টি-শার্ট', nameEn: 'Solid Cotton T-Shirt', cat: 'tshirt', price: 550, oldPrice: 750, img: U('photo-1521572163474-6864f9cf17ab'), descBn: '১০০% কটন, হালকা ও আরামদায়ক সলিড টি-শার্ট।', descEn: '100% cotton lightweight solid t-shirt.', sizes: ['S', 'M', 'L', 'XL'], stock: 60, tag: 'flash-sale' },
  { id: 'p06', nameBn: 'গ্রাফিক প্রিন্ট টি-শার্ট', nameEn: 'Graphic Print T-Shirt', cat: 'tshirt', price: 650, oldPrice: 890, img: U('photo-1576566588028-4147f3842f27'), descBn: 'ট্রেন্ডি গ্রাফিক প্রিন্ট সহ ক্যাজুয়াল টি-শার্ট।', descEn: 'Trendy graphic-print casual t-shirt.', sizes: ['S', 'M', 'L', 'XL'], stock: 45, tag: 'new' },
  { id: 'p07', nameBn: 'ক্লাসিক পোলো শার্ট', nameEn: 'Classic Polo Shirt', cat: 'polo', price: 950, oldPrice: 1250, img: U('photo-1586790170083-2f9ceadc732d'), descBn: 'পিকে কটন ফেব্রিকের ক্লাসিক পোলো শার্ট।', descEn: 'Classic pique-cotton polo shirt.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 28, tag: 'best-seller' },
  { id: 'p08', nameBn: 'স্ট্রাইপ পোলো শার্ট', nameEn: 'Striped Polo Shirt', cat: 'polo', price: 1050, oldPrice: 1350, img: U('photo-1617137968427-85924c800a22'), descBn: 'স্টাইলিশ স্ট্রাইপ ডিজাইনের পোলো শার্ট।', descEn: 'Stylish striped polo shirt.', sizes: ['M', 'L', 'XL'], stock: 20, tag: 'featured' },
  { id: 'p09', nameBn: 'স্লিম ফিট ডেনিম প্যান্ট', nameEn: 'Slim Fit Denim Pant', cat: 'pant', price: 1550, oldPrice: 2100, img: U('photo-1542272604-787c3835535d'), descBn: 'স্ট্রেচ ডেনিমের স্লিম ফিট প্যান্ট, সারাদিন আরাম।', descEn: 'Stretch-denim slim-fit pant, comfortable all day.', sizes: ['30', '32', '34', '36'], stock: 25, tag: 'best-seller' },
  { id: 'p10', nameBn: 'ফরমাল ট্রাউজার', nameEn: 'Formal Trouser', cat: 'pant', price: 1350, oldPrice: 1750, img: U('photo-1541099649105-f69ad21f3246'), descBn: 'অফিসের জন্য পারফেক্ট ফরমাল ট্রাউজার।', descEn: 'Perfect formal trouser for office wear.', sizes: ['30', '32', '34', '36', '38'], stock: 22, tag: '' },
  { id: 'p11', nameBn: 'রয়্যাল উদ আতর (১২মি.লি.)', nameEn: 'Royal Oud Attar (12ml)', cat: 'attar', price: 850, oldPrice: 1150, img: U('photo-1541643600914-78b084683601'), descBn: 'দীর্ঘস্থায়ী সুগন্ধির প্রিমিয়াম উদ আতর।', descEn: 'Premium long-lasting oud attar fragrance.', sizes: ['12ml'], stock: 40, tag: 'best-seller' },
  { id: 'p12', nameBn: 'মিস্ক আম্বার আতর', nameEn: 'Musk Amber Attar', cat: 'attar', price: 650, oldPrice: 850, img: U('photo-1594035910387-fea47794261f'), descBn: 'মিষ্টি ও নরম সুগন্ধির মিস্ক আম্বার আতর।', descEn: 'Sweet and soft musk amber attar.', sizes: ['6ml', '12ml'], stock: 35, tag: 'flash-sale' },
  { id: 'p13', nameBn: 'রানিং স্নিকার্স', nameEn: 'Running Sneakers', cat: 'sneakers', price: 2450, oldPrice: 3250, img: U('photo-1549298916-b41d501d3772'), descBn: 'হালকা ও আরামদায়ক রানিং স্নিকার্স, দৈনিক ব্যবহারের জন্য।', descEn: 'Lightweight comfortable running sneakers for daily use.', sizes: ['40', '41', '42', '43', '44'], stock: 15, tag: 'featured' },
  { id: 'p14', nameBn: 'ক্যাজুয়াল হোয়াইট স্নিকার্স', nameEn: 'Casual White Sneakers', cat: 'sneakers', price: 1950, oldPrice: 2600, img: U('photo-1542291026-7eec264c27ff'), descBn: 'সব পোশাকের সাথে মানানসই ক্লাসিক হোয়াইট স্নিকার্স।', descEn: 'Classic white sneakers that match everything.', sizes: ['40', '41', '42', '43'], stock: 18, tag: 'new' },
  { id: 'p15', nameBn: 'লেদার জ্যাকেট', nameEn: 'Leather Jacket', cat: 'winter', price: 3950, oldPrice: 5200, img: U('photo-1551028719-00167b16eac5'), descBn: 'আসল লেদারের প্রিমিয়াম জ্যাকেট, শীতের জন্য সেরা।', descEn: 'Premium genuine leather jacket, best for winter.', sizes: ['M', 'L', 'XL'], stock: 8, tag: 'flash-sale' },
  { id: 'p16', nameBn: 'উইন্টার হুডি', nameEn: 'Winter Hoodie', cat: 'winter', price: 1450, oldPrice: 1950, img: U('photo-1556821840-3a63f95609a7'), descBn: 'উষ্ণ ও আরামদায়ক ফ্লিস লাইনিং হুডি।', descEn: 'Warm fleece-lined comfortable hoodie.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 26, tag: '' },
  { id: 'p17', nameBn: 'কিডস কটন পাঞ্জাবি', nameEn: 'Kids Cotton Panjabi', cat: 'kids', price: 950, oldPrice: 1250, img: U('photo-1519238263530-99bdd11df2ea'), descBn: 'বাচ্চাদের জন্য নরম কটন পাঞ্জাবি, ঈদের জন্য পারফেক্ট।', descEn: 'Soft cotton panjabi for kids, perfect for Eid.', sizes: ['2Y', '4Y', '6Y', '8Y'], stock: 20, tag: 'new' },
  { id: 'p18', nameBn: 'কিডস গ্রাফিক টি-শার্ট', nameEn: 'Kids Graphic T-Shirt', cat: 'kids', price: 450, oldPrice: 600, img: U('photo-1471286174890-9c112ffca5b4'), descBn: 'মজার গ্রাফিক প্রিন্ট সহ বাচ্চাদের টি-শার্ট।', descEn: 'Fun graphic-print t-shirt for kids.', sizes: ['2Y', '4Y', '6Y', '8Y'], stock: 33, tag: 'flash-sale' },
];

const SEED_TESTIMONIALS = [
  { name: 'সাদিয়া ইসলাম', loc: 'ধানমন্ডি, ঢাকা', rating: 5, text: 'পাঞ্জাবির কাপড় খুব ভালো, ছবির মতোই পেয়েছি। ডেলিভারিও দ্রুত হয়েছে।' },
  { name: 'তানভীর হাসান', loc: 'চট্টগ্রাম', rating: 5, text: 'স্নিকার্সের কোয়ালিটি দামের তুলনায় দুর্দান্ত। ক্যাশ অন ডেলিভারি সুবিধা ভালো লেগেছে।' },
  { name: 'নুসরাত জাহান', loc: 'সিলেট', rating: 4, text: 'আতরটা দারুণ। প্যাকেজিং খুব সুন্দর ছিল। আবার অর্ডার করবো।' },
  { name: 'রাকিব আহমেদ', loc: 'রাজশাহী', rating: 5, text: 'অর্ডারের পর ফোনে কনফার্ম করেছে, ট্র্যাকিংও ঠিকঠাক কাজ করেছে।' },
];

const SEED_FAQS = [
  { q: 'কিভাবে অর্ডার করবো?', a: 'পণ্য পছন্দ করে কার্টে যোগ করুন, এরপর চেকআউট পেজে নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে অর্ডার কনফার্ম করুন।' },
  { q: 'ডেলিভারিতে কত সময় লাগে?', a: 'ঢাকার ভিতরে ২৪–৪৮ ঘণ্টা এবং ঢাকার বাইরে ২–৪ কর্মদিবস সময় লাগে।' },
  { q: 'কোন কোন পেমেন্ট মেথড আছে?', a: 'ক্যাশ অন ডেলিভারি, বিকাশ, নগদ এবং কার্ড দিয়ে পেমেন্ট করা যায়।' },
  { q: 'পণ্য রিটার্ন করা যাবে?', a: 'পণ্য হাতে পাওয়ার ৭ দিনের মধ্যে অব্যবহৃত অবস্থায় রিটার্ন বা এক্সচেঞ্জ করা যাবে।' },
  { q: 'অর্ডার ট্র্যাক করবো কিভাবে?', a: 'Track Order পেজে অর্ডার আইডি ও মোবাইল নম্বর দিলে অর্ডারের বর্তমান অবস্থা দেখতে পাবেন।' },
  { q: 'ক্যাশ অন ডেলিভারি আছে কি?', a: 'হ্যাঁ, সারা বাংলাদেশে ক্যাশ অন ডেলিভারি সুবিধা রয়েছে।' },
];

const DISTRICTS = ['ঢাকা (সিটি)', 'ঢাকা (সাব-এরিয়া)', 'চট্টগ্রাম', 'খুলনা', 'রাজশাহী', 'সিলেট', 'বরিশাল', 'রংপুর', 'ময়মনসিংহ', 'কুমিল্লা', 'গাজীপুর', 'নারায়ণগঞ্জ', 'বগুড়া'];

const COURIERS = ['Steadfast', 'Pathao Courier', 'Paperfly', 'Sundarban', 'SA Paribahan', 'RedX', 'Manual/Other'];

/* Order stages — used by the customer Track Order timeline */
const STAGES = [
  { key: 'pending', bn: 'অপেক্ষমান', en: 'Pending' },
  { key: 'confirmed', bn: 'কনফার্ম', en: 'Confirmed' },
  { key: 'packed', bn: 'প্যাক করা', en: 'Packed' },
  { key: 'shipped', bn: 'কুরিয়ারে দেওয়া', en: 'Handed to Courier' },
  { key: 'in-transit', bn: 'ট্রানজিটে', en: 'In Transit' },
  { key: 'out-for-delivery', bn: 'ডেলিভারির পথে', en: 'Out for Delivery' },
  { key: 'delivered', bn: 'ডেলিভারি সম্পন্ন', en: 'Delivered' },
  { key: 'cancelled', bn: 'বাতিল', en: 'Cancelled' },
];

const DEFAULT_SETTINGS = {
  shopName: 'AURA LIFESTYLE',
  phone: '09638090000',
  whatsapp: '8809638090000',
  email: 'care@auralifestyle.com.bd',
  address: 'Shop-3/1, Eastern Plaza, Hatirpool, Dhaka 1205',
  deliveryCity: 70, deliverySub: 90, deliveryOutside: 110, freeAbove: 2000,
  bkash: '01710000000', nagad: '01710000000',
  sections: { hero: true, flashSale: true, combo: true, testimonials: true, bestSellers: true, newArrivals: true },
  hiddenCategories: [], /* category slugs hidden from storefront */
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop';
