/* AURA LIFESTYLE — seed data (used when Firestore is empty / not configured)
   Hierarchical categories: 13 MAIN categories, each with SUB categories.
   Every product has: main (main-category slug) + sub (sub-category slug). */
const U = (id) => `https://images.unsplash.com/${id}?q=80&w=800&auto=format&fit=crop`;

const MAIN_CATEGORIES = [
  { slug: 'men', bn: 'মেনস', en: "Men's", img: U('photo-1603252109303-2751441dd157'), subs: [
    { slug: 'panjabi', bn: 'পাঞ্জাবি', en: 'Panjabi' },
    { slug: 'shirt', bn: 'শার্ট', en: 'Shirt' },
    { slug: 'tshirt', bn: 'টি-শার্ট', en: 'T-Shirt' },
    { slug: 'polo', bn: 'পোলো শার্ট', en: 'Polo Shirt' },
    { slug: 'pant', bn: 'প্যান্ট ও ট্রাউজার', en: 'Pant & Trouser' },
    { slug: 'sneakers', bn: 'স্নিকার্স', en: 'Sneakers' },
    { slug: 'winter', bn: 'শীতের পোশাক', en: 'Winter Wear' },
  ] },
  { slug: 'women', bn: 'ওমেনস', en: "Women's", img: U('photo-1610030469983-98e550d6193c'), subs: [
    { slug: 'saree', bn: 'শাড়ি', en: 'Saree' },
    { slug: 'kurti', bn: 'কুর্তি', en: 'Kurti' },
    { slug: 'threepiece', bn: 'থ্রি-পিস', en: 'Three-Piece' },
    { slug: 'hijab', bn: 'হিজাব', en: 'Hijab' },
    { slug: 'womens-shoes', bn: 'ওমেনস জুতা', en: "Women's Shoes" },
  ] },
  { slug: 'kids', bn: 'কিডস', en: 'Kids', img: U('photo-1471286174890-9c112ffca5b4'), subs: [
    { slug: 'kids-panjabi', bn: 'কিডস পাঞ্জাবি', en: 'Kids Panjabi' },
    { slug: 'kids-tshirt', bn: 'কিডস টি-শার্ট', en: 'Kids T-Shirt' },
    { slug: 'kids-dress', bn: 'কিডস ড্রেস', en: 'Kids Dress' },
    { slug: 'kids-shoes', bn: 'কিডস জুতা', en: 'Kids Shoes' },
  ] },
  { slug: 'home', bn: 'হোম টেক্সটাইল', en: 'Home Textiles', img: U('photo-1522771739844-6a9f6d5f14af'), subs: [
    { slug: 'bedsheet', bn: 'বেডশিট', en: 'Bedsheet' },
    { slug: 'curtain', bn: 'পর্দা', en: 'Curtain' },
    { slug: 'cushion', bn: 'কুশন', en: 'Cushion' },
    { slug: 'towel', bn: 'তোয়ালে', en: 'Towel' },
  ] },
  { slug: 'cosmetics', bn: 'কসমেটিকস', en: 'Cosmetics', img: U('photo-1596462502278-27bfdc403348'), subs: [
    { slug: 'skincare', bn: 'স্কিনকেয়ার', en: 'Skincare' },
    { slug: 'makeup', bn: 'মেকআপ', en: 'Makeup' },
    { slug: 'perfume', bn: 'পারফিউম', en: 'Perfume' },
    { slug: 'attar', bn: 'আতর', en: 'Attar' },
  ] },
  { slug: 'electronics', bn: 'ইলেকট্রনিক্স', en: 'Electronics & Gadgets', img: U('photo-1505740420928-5e560c06d30e'), subs: [
    { slug: 'earbuds', bn: 'ইয়ারবাডস', en: 'Earbuds' },
    { slug: 'smartwatch', bn: 'স্মার্ট ওয়াচ', en: 'Smart Watch' },
    { slug: 'powerbank', bn: 'পাওয়ার ব্যাংক', en: 'Power Bank' },
    { slug: 'charger', bn: 'চার্জার ও কেবল', en: 'Charger & Cable' },
  ] },
  { slug: 'islamic', bn: 'ইসলামিক', en: 'Islamic', img: U('photo-1519817650390-64a93db51149'), subs: [
    { slug: 'thobe', bn: 'থোব', en: 'Thobe' },
    { slug: 'tupi', bn: 'টুপি', en: 'Tupi' },
    { slug: 'tasbih', bn: 'তাসবিহ', en: 'Tasbih' },
    { slug: 'jaynamaz', bn: 'জায়নামাজ', en: 'Jaynamaz' },
  ] },
  { slug: 'accessories', bn: 'অ্যাক্সেসরিজ', en: 'Accessories', img: U('photo-1523275335684-37898b6baf30'), subs: [
    { slug: 'watch', bn: 'ঘড়ি', en: 'Watch' },
    { slug: 'wallet', bn: 'ওয়ালেট', en: 'Wallet' },
    { slug: 'belt', bn: 'বেল্ট', en: 'Belt' },
    { slug: 'sunglasses', bn: 'সানগ্লাস', en: 'Sunglasses' },
    { slug: 'bag', bn: 'ব্যাগ', en: 'Bag' },
  ] },
  { slug: 'food', bn: 'ফুড', en: 'Food', img: U('photo-1587049352846-4a222e784d38'), subs: [
    { slug: 'honey', bn: 'মধু', en: 'Honey' },
    { slug: 'dates', bn: 'খেজুর', en: 'Dates' },
    { slug: 'dryfruits', bn: 'ড্রাই ফ্রুটস', en: 'Dry Fruits' },
  ] },
  { slug: 'footwear', bn: 'ফুটওয়্যার', en: 'Footwear', img: U('photo-1543163521-1bf539c55dd2'), subs: [
    { slug: 'sandal', bn: 'স্যান্ডেল', en: 'Sandal' },
    { slug: 'loafer', bn: 'লোফার', en: 'Loafer' },
    { slug: 'panjabi-shoe', bn: 'পাঞ্জাবি জুতা', en: 'Panjabi Shoe' },
  ] },
  { slug: 'gifts', bn: 'গিফট আইটেম', en: 'Gift Items', img: U('photo-1549465220-1a8b9238cd48'), subs: [
    { slug: 'giftbox', bn: 'গিফট বক্স', en: 'Gift Box' },
    { slug: 'comboset', bn: 'কম্বো সেট', en: 'Combo Set' },
  ] },
  { slug: 'sports', bn: 'স্পোর্টস', en: 'Sports', img: U('photo-1571019613454-1cb2f99b2d8b'), subs: [
    { slug: 'gymwear', bn: 'জিম ওয়্যার', en: 'Gym Wear' },
    { slug: 'sportsshoes', bn: 'স্পোর্টস জুতা', en: 'Sports Shoes' },
  ] },
  { slug: 'baby', bn: 'বেবি', en: 'Baby', img: U('photo-1522771930-78848d9293e8'), subs: [
    { slug: 'babydress', bn: 'বেবি ড্রেস', en: 'Baby Dress' },
    { slug: 'babycare', bn: 'বেবি কেয়ার', en: 'Baby Care' },
  ] },
];

/* Back-compat: flat list of all sub-categories (slug → labels + parent main) */
const CATEGORIES = MAIN_CATEGORIES.flatMap((m) => m.subs.map((s) => ({ slug: s.slug, bn: s.bn, en: s.en, main: m.slug, img: m.img })));

function mainOf(slug) { return MAIN_CATEGORIES.find((m) => m.slug === slug) || { slug, bn: slug, en: slug, img: FALLBACK_IMG, subs: [] }; }
function subOf(mainSlug, subSlug) {
  const m = mainOf(mainSlug);
  const s = m.subs.find((x) => x.slug === subSlug);
  return s ? { ...s, main: mainSlug } : { slug: subSlug, bn: subSlug, en: subSlug, main: mainSlug };
}

const SEED_PRODUCTS = [
  /* ---- Men's (migrated) ---- */
  { id: 'p01', sku: 'A100001', nameBn: 'প্রিমিয়াম কটন পাঞ্জাবি', nameEn: 'Premium Cotton Panjabi', main: 'men', sub: 'panjabi', price: 1890, oldPrice: 2690, img: U('photo-1603252109303-2751441dd157'), descBn: '১০০% সুতি কাপড়ের আরামদায়ক পাঞ্জাবি। ঈদ ও অনুষ্ঠানের জন্য উপযুক্ত।', descEn: 'Comfortable 100% cotton panjabi, perfect for Eid and occasions.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 24, tag: 'best-seller' },
  { id: 'p02', sku: 'A100002', nameBn: 'লাক্সারি সিল্ক পাঞ্জাবি', nameEn: 'Luxury Silk Panjabi', main: 'men', sub: 'panjabi', price: 2690, oldPrice: 3490, img: U('photo-1610652492500-ded49ceeb378'), descBn: 'সিল্ক ফেব্রিকের প্রিমিয়াম পাঞ্জাবি, হাতে করা বোতাম ডিটেইল।', descEn: 'Premium silk-fabric panjabi with hand-finished button detail.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 12, tag: 'featured' },
  { id: 'p03', sku: 'A100003', nameBn: 'ক্লাসিক ফরমাল শার্ট', nameEn: 'Classic Formal Shirt', main: 'men', sub: 'shirt', price: 1450, oldPrice: 1950, img: U('photo-1596755094514-f87e34085b2c'), descBn: 'অফিস ও ফরমাল অনুষ্ঠানের জন্য ক্লাসিক ফিট শার্ট।', descEn: 'Classic-fit shirt for office and formal occasions.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 30, tag: 'best-seller' },
  { id: 'p04', sku: 'A100004', nameBn: 'ক্যাজুয়াল চেক শার্ট', nameEn: 'Casual Check Shirt', main: 'men', sub: 'shirt', price: 1250, oldPrice: 1650, img: U('photo-1598033129183-c4f50c736f10'), descBn: 'নরম কাপড়ের ক্যাজুয়াল চেক শার্ট, প্রতিদিনের জন্য।', descEn: 'Soft-fabric casual check shirt for everyday wear.', sizes: ['M', 'L', 'XL'], stock: 18, tag: 'new' },
  { id: 'p05', sku: 'A100005', nameBn: 'সলিড কটন টি-শার্ট', nameEn: 'Solid Cotton T-Shirt', main: 'men', sub: 'tshirt', price: 550, oldPrice: 750, img: U('photo-1521572163474-6864f9cf17ab'), descBn: '১০০% কটন, হালকা ও আরামদায়ক সলিড টি-শার্ট।', descEn: '100% cotton lightweight solid t-shirt.', sizes: ['S', 'M', 'L', 'XL'], stock: 60, tag: 'flash-sale' },
  { id: 'p06', sku: 'A100006', nameBn: 'গ্রাফিক প্রিন্ট টি-শার্ট', nameEn: 'Graphic Print T-Shirt', main: 'men', sub: 'tshirt', price: 650, oldPrice: 890, img: U('photo-1576566588028-4147f3842f27'), descBn: 'ট্রেন্ডি গ্রাফিক প্রিন্ট সহ ক্যাজুয়াল টি-শার্ট।', descEn: 'Trendy graphic-print casual t-shirt.', sizes: ['S', 'M', 'L', 'XL'], stock: 45, tag: 'new' },
  { id: 'p07', sku: 'A100007', nameBn: 'ক্লাসিক পোলো শার্ট', nameEn: 'Classic Polo Shirt', main: 'men', sub: 'polo', price: 950, oldPrice: 1250, img: U('photo-1586790170083-2f9ceadc732d'), descBn: 'পিকে কটন ফেব্রিকের ক্লাসিক পোলো শার্ট।', descEn: 'Classic pique-cotton polo shirt.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 28, tag: 'best-seller' },
  { id: 'p08', sku: 'A100008', nameBn: 'স্ট্রাইপ পোলো শার্ট', nameEn: 'Striped Polo Shirt', main: 'men', sub: 'polo', price: 1050, oldPrice: 1350, img: U('photo-1617137968427-85924c800a22'), descBn: 'স্টাইলিশ স্ট্রাইপ ডিজাইনের পোলো শার্ট।', descEn: 'Stylish striped polo shirt.', sizes: ['M', 'L', 'XL'], stock: 20, tag: 'featured' },
  { id: 'p09', sku: 'A100009', nameBn: 'স্লিম ফিট ডেনিম প্যান্ট', nameEn: 'Slim Fit Denim Pant', main: 'men', sub: 'pant', price: 1550, oldPrice: 2100, img: U('photo-1542272604-787c3835535d'), descBn: 'স্ট্রেচ ডেনিমের স্লিম ফিট প্যান্ট, সারাদিন আরাম।', descEn: 'Stretch-denim slim-fit pant, comfortable all day.', sizes: ['30', '32', '34', '36'], stock: 25, tag: 'best-seller' },
  { id: 'p10', sku: 'A100010', nameBn: 'ফরমাল ট্রাউজার', nameEn: 'Formal Trouser', main: 'men', sub: 'pant', price: 1350, oldPrice: 1750, img: U('photo-1541099649105-f69ad21f3246'), descBn: 'অফিসের জন্য পারফেক্ট ফরমাল ট্রাউজার।', descEn: 'Perfect formal trouser for office wear.', sizes: ['30', '32', '34', '36', '38'], stock: 22, tag: '' },
  { id: 'p13', sku: 'A100013', nameBn: 'রানিং স্নিকার্স', nameEn: 'Running Sneakers', main: 'men', sub: 'sneakers', price: 2450, oldPrice: 3250, img: U('photo-1549298916-b41d501d3772'), descBn: 'হালকা ও আরামদায়ক রানিং স্নিকার্স, দৈনিক ব্যবহারের জন্য।', descEn: 'Lightweight comfortable running sneakers for daily use.', sizes: ['40', '41', '42', '43', '44'], stock: 15, tag: 'featured' },
  { id: 'p14', sku: 'A100014', nameBn: 'ক্যাজুয়াল হোয়াইট স্নিকার্স', nameEn: 'Casual White Sneakers', main: 'men', sub: 'sneakers', price: 1950, oldPrice: 2600, img: U('photo-1542291026-7eec264c27ff'), descBn: 'সব পোশাকের সাথে মানানসই ক্লাসিক হোয়াইট স্নিকার্স।', descEn: 'Classic white sneakers that match everything.', sizes: ['40', '41', '42', '43'], stock: 18, tag: 'new' },
  { id: 'p15', sku: 'A100015', nameBn: 'লেদার জ্যাকেট', nameEn: 'Leather Jacket', main: 'men', sub: 'winter', price: 3950, oldPrice: 5200, img: U('photo-1551028719-00167b16eac5'), descBn: 'আসল লেদারের প্রিমিয়াম জ্যাকেট, শীতের জন্য সেরা।', descEn: 'Premium genuine leather jacket, best for winter.', sizes: ['M', 'L', 'XL'], stock: 8, tag: 'flash-sale' },
  { id: 'p16', sku: 'A100016', nameBn: 'উইন্টার হুডি', nameEn: 'Winter Hoodie', main: 'men', sub: 'winter', price: 1450, oldPrice: 1950, img: U('photo-1556821840-3a63f95609a7'), descBn: 'উষ্ণ ও আরামদায়ক ফ্লিস লাইনিং হুডি।', descEn: 'Warm fleece-lined comfortable hoodie.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 26, tag: '' },
  /* ---- Kids (migrated) ---- */
  { id: 'p17', sku: 'A100017', nameBn: 'কিডস কটন পাঞ্জাবি', nameEn: 'Kids Cotton Panjabi', main: 'kids', sub: 'kids-panjabi', price: 950, oldPrice: 1250, img: U('photo-1519238263530-99bdd11df2ea'), descBn: 'বাচ্চাদের জন্য নরম কটন পাঞ্জাবি, ঈদের জন্য পারফেক্ট।', descEn: 'Soft cotton panjabi for kids, perfect for Eid.', sizes: ['2Y', '4Y', '6Y', '8Y'], stock: 20, tag: 'new' },
  { id: 'p18', sku: 'A100018', nameBn: 'কিডস গ্রাফিক টি-শার্ট', nameEn: 'Kids Graphic T-Shirt', main: 'kids', sub: 'kids-tshirt', price: 450, oldPrice: 600, img: U('photo-1471286174890-9c112ffca5b4'), descBn: 'মজার গ্রাফিক প্রিন্ট সহ বাচ্চাদের টি-শার্ট।', descEn: 'Fun graphic-print t-shirt for kids.', sizes: ['2Y', '4Y', '6Y', '8Y'], stock: 33, tag: 'flash-sale' },
  /* ---- Cosmetics (migrated: attar) ---- */
  { id: 'p11', sku: 'A100011', nameBn: 'রয়্যাল উদ আতর (১২মি.লি.)', nameEn: 'Royal Oud Attar (12ml)', main: 'cosmetics', sub: 'attar', price: 850, oldPrice: 1150, img: U('photo-1541643600914-78b084683601'), descBn: 'দীর্ঘস্থায়ী সুগন্ধির প্রিমিয়াম উদ আতর।', descEn: 'Premium long-lasting oud attar fragrance.', sizes: ['12ml'], stock: 40, tag: 'best-seller' },
  { id: 'p12', sku: 'A100012', nameBn: 'মিস্ক আম্বার আতর', nameEn: 'Musk Amber Attar', main: 'cosmetics', sub: 'attar', price: 650, oldPrice: 850, img: U('photo-1594035910387-fea47794261f'), descBn: 'মিষ্টি ও নরম সুগন্ধির মিস্ক আম্বার আতর।', descEn: 'Sweet and soft musk amber attar.', sizes: ['6ml', '12ml'], stock: 35, tag: 'flash-sale' },
  /* ---- NEW: Women's ---- */
  { id: 'p19', sku: 'A100019', nameBn: 'জামদানি শাড়ি', nameEn: 'Jamdani Saree', main: 'women', sub: 'saree', price: 3490, oldPrice: 4500, img: U('photo-1610030469983-98e550d6193c'), descBn: 'ঐতিহ্যবাহী হাতে বোনা জামদানি শাড়ি, উৎসবের জন্য সেরা।', descEn: 'Traditional hand-woven Jamdani saree, best for festivals.', sizes: ['Free Size'], stock: 10, tag: 'featured' },
  { id: 'p20', sku: 'A100020', nameBn: 'কটন কুর্তি', nameEn: 'Cotton Kurti', main: 'women', sub: 'kurti', price: 1250, oldPrice: 1650, img: U('photo-1594633312681-425c7b97ccd1'), descBn: 'নরম কটন কুর্তি, প্রতিদিনের জন্য আরামদায়ক।', descEn: 'Soft cotton kurti, comfortable for everyday wear.', sizes: ['S', 'M', 'L', 'XL'], stock: 28, tag: 'best-seller' },
  { id: 'p21', sku: 'A100021', nameBn: 'প্রিমিয়াম থ্রি-পিস', nameEn: 'Premium Three-Piece', main: 'women', sub: 'threepiece', price: 2190, oldPrice: 2890, img: U('photo-1515886657613-9f3515b0c78f'), descBn: 'কামিজ, সালোয়ার ও ওড়নার সম্পূর্ণ সেট, সুন্দর প্রিন্ট।', descEn: 'Complete kameez, salwar and dupatta set with beautiful print.', sizes: ['S', 'M', 'L', 'XL'], stock: 16, tag: 'new' },
  { id: 'p22', sku: 'A100022', nameBn: 'প্রিমিয়াম হিজাব', nameEn: 'Premium Hijab', main: 'women', sub: 'hijab', price: 550, oldPrice: 750, img: U('photo-1693985007521-e08e64770947'), descBn: 'নরম জর্জেট ফেব্রিকের হিজাব, সারাদিন আরামদায়ক।', descEn: 'Soft georgette hijab, comfortable all day.', sizes: ['Free Size'], stock: 50, tag: '' },
  { id: 'p23', sku: 'A100023', nameBn: 'ওমেনস ব্লক হিল', nameEn: "Women's Block Heel", main: 'women', sub: 'womens-shoes', price: 1650, oldPrice: 2200, img: U('photo-1543163521-1bf539c55dd2'), descBn: 'স্টাইলিশ ও আরামদায়ক ব্লক হিল, অনুষ্ঠানের জন্য।', descEn: 'Stylish comfortable block heel, perfect for occasions.', sizes: ['36', '37', '38', '39', '40'], stock: 14, tag: 'new' },
  /* ---- NEW: Home Textiles ---- */
  { id: 'p24', sku: 'A100024', nameBn: 'প্রিমিয়াম কটন বেডশিট', nameEn: 'Premium Cotton Bedsheet', main: 'home', sub: 'bedsheet', price: 1450, oldPrice: 1950, img: U('photo-1522771739844-6a9f6d5f14af'), descBn: 'নরম কটন বেডশিট, ২টি পিলো কভার সহ।', descEn: 'Soft cotton bedsheet with 2 pillow covers.', sizes: ['King'], stock: 20, tag: 'best-seller' },
  { id: 'p25', sku: 'A100025', nameBn: 'ব্ল্যাকআউট পর্দা (জোড়া)', nameEn: 'Blackout Curtain (Pair)', main: 'home', sub: 'curtain', price: 1850, oldPrice: 2400, img: U('photo-1513694203232-719a280e022f'), descBn: 'আলো আটকানো ব্ল্যাকআউট পর্দা, ঘর ঠান্ডা রাখে।', descEn: 'Light-blocking blackout curtain pair, keeps the room cool.', sizes: ['7ft'], stock: 12, tag: '' },
  /* ---- NEW: Islamic ---- */
  { id: 'p26', sku: 'A100026', nameBn: 'সাদা প্রিমিয়াম থোব', nameEn: 'White Premium Thobe', main: 'islamic', sub: 'thobe', price: 2250, oldPrice: 2950, img: U('photo-1610652492500-ded49ceeb378'), descBn: 'সাদা প্রিমিয়াম থোব, নামাজ ও অনুষ্ঠানের জন্য।', descEn: 'White premium thobe for prayer and occasions.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 18, tag: 'featured' },
  { id: 'p27', sku: 'A100027', nameBn: 'নামাজের টুপি (প্যাক অফ ২)', nameEn: 'Prayer Cap Tupi (Pack of 2)', main: 'islamic', sub: 'tupi', price: 350, oldPrice: 500, img: U('photo-1521369909029-2afed882baee'), descBn: 'আরামদায়ক কটন নামাজের টুপি, ২টির প্যাক।', descEn: 'Comfortable cotton prayer cap, pack of 2.', sizes: ['Free Size'], stock: 60, tag: '' },
  { id: 'p28', sku: 'A100028', nameBn: 'কাঠের তাসবিহ', nameEn: 'Wooden Tasbih', main: 'islamic', sub: 'tasbih', price: 450, oldPrice: 600, img: U('photo-1564769625905-50e93615e769'), descBn: 'হাতে তৈরি কাঠের তাসবিহ, ১০০ দানা।', descEn: 'Handcrafted wooden tasbih, 100 beads.', sizes: ['100 Beads'], stock: 30, tag: '' },
  /* ---- NEW: Accessories ---- */
  { id: 'p29', sku: 'A100029', nameBn: 'ক্লাসিক অ্যানালগ ঘড়ি', nameEn: 'Classic Analog Watch', main: 'accessories', sub: 'watch', price: 2850, oldPrice: 3800, img: U('photo-1523275335684-37898b6baf30'), descBn: 'স্টাইলিশ অ্যানালগ ঘড়ি, লেদার স্ট্র্যাপ সহ।', descEn: 'Stylish analog watch with leather strap.', sizes: ['Free Size'], stock: 15, tag: 'best-seller' },
  { id: 'p30', sku: 'A100030', nameBn: 'লেদার ওয়ালেট', nameEn: 'Leather Wallet', main: 'accessories', sub: 'wallet', price: 950, oldPrice: 1300, img: U('photo-1627123424574-724758594e93'), descBn: 'আসল লেদারের স্লিম ওয়ালেট, একাধিক কার্ড স্লট সহ।', descEn: 'Genuine leather slim wallet with multiple card slots.', sizes: ['Free Size'], stock: 40, tag: '' },
  /* ---- NEW: Food ---- */
  { id: 'p31', sku: 'A100031', nameBn: 'খাঁটি সরিষার ফুলের মধু (৫০০গ্রাম)', nameEn: 'Pure Mustard Flower Honey (500g)', main: 'food', sub: 'honey', price: 550, oldPrice: 700, img: U('photo-1587049352846-4a222e784d38'), descBn: '১০০% খাঁটি সরিষার ফুলের মধু, কোনো ভেজাল নেই।', descEn: '100% pure mustard flower honey, no adulteration.', sizes: ['500g'], stock: 45, tag: 'best-seller' },
  { id: 'p32', sku: 'A100032', nameBn: 'আজওয়া খেজুর (১ কেজি)', nameEn: 'Ajwa Dates (1kg)', main: 'food', sub: 'dates', price: 1450, oldPrice: 1850, img: U('photo-1596591606975-97ee5cef3a1e'), descBn: 'মদিনার আসল আজওয়া খেজুর, পুষ্টিকর ও সুস্বাদু।', descEn: 'Authentic Ajwa dates from Madinah, nutritious and delicious.', sizes: ['1kg'], stock: 25, tag: 'featured' },
  /* ---- NEW: Footwear ---- */
  { id: 'p33', sku: 'A100033', nameBn: 'কমফোর্ট লেদার স্যান্ডেল', nameEn: 'Comfort Leather Sandal', main: 'footwear', sub: 'sandal', price: 1250, oldPrice: 1650, img: U('photo-1603487742131-4160ec999306'), descBn: 'আরামদায়ক লেদার স্যান্ডেল, সারাদিন পরার জন্য।', descEn: 'Comfortable leather sandal for all-day wear.', sizes: ['40', '41', '42', '43', '44'], stock: 22, tag: '' },
  /* ---- NEW: Gifts ---- */
  { id: 'p34', sku: 'A100034', nameBn: 'প্রিমিয়াম গিফট বক্স', nameEn: 'Premium Gift Box', main: 'gifts', sub: 'giftbox', price: 1990, oldPrice: 2600, img: U('photo-1549465220-1a8b9238cd48'), descBn: 'আতর + টুপি + তাসবিহ সহ সাজানো গিফট বক্স।', descEn: 'Curated gift box with attar, tupi and tasbih.', sizes: ['Free Size'], stock: 12, tag: 'featured' },
  /* ---- NEW: Sports ---- */
  { id: 'p35', sku: 'A100035', nameBn: 'জিম ট্রেনিং টি-শার্ট', nameEn: 'Gym Training T-Shirt', main: 'sports', sub: 'gymwear', price: 750, oldPrice: 990, img: U('photo-1571019613454-1cb2f99b2d8b'), descBn: 'ঘাম শোষণকারী ড্রাই-ফিট জিম টি-শার্ট।', descEn: 'Sweat-absorbing dry-fit gym t-shirt.', sizes: ['M', 'L', 'XL', 'XXL'], stock: 35, tag: 'new' },
  { id: 'p36', sku: 'A100036', nameBn: 'স্পোর্টস রানিং শু', nameEn: 'Sports Running Shoe', main: 'sports', sub: 'sportsshoes', price: 2650, oldPrice: 3400, img: U('photo-1460353581641-37baddab0fa2'), descBn: 'হালকা ও গ্রিপযুক্ত স্পোর্টস রানিং শু।', descEn: 'Lightweight sports running shoe with strong grip.', sizes: ['40', '41', '42', '43', '44'], stock: 16, tag: 'best-seller' },
  /* ---- NEW: Baby ---- */
  { id: 'p37', sku: 'A100037', nameBn: 'বেবি কটন ড্রেস সেট', nameEn: 'Baby Cotton Dress Set', main: 'baby', sub: 'babydress', price: 850, oldPrice: 1100, img: U('photo-1522771930-78848d9293e8'), descBn: 'নরম কটন বেবি ড্রেস সেট, শিশুর ত্বকের জন্য নিরাপদ।', descEn: 'Soft cotton baby dress set, safe for baby skin.', sizes: ['0-6M', '6-12M', '1-2Y'], stock: 24, tag: 'new' },
  /* ---- NEW: Electronics ---- */
  { id: 'p38', sku: 'A100038', nameBn: 'ওয়্যারলেস ইয়ারবাডস', nameEn: 'Wireless Earbuds', main: 'electronics', sub: 'earbuds', price: 1450, oldPrice: 1950, img: U('photo-1590658268037-6bf12165a8df'), descBn: 'ব্লুটুথ ৫.৩, ২৪ ঘণ্টা ব্যাটারি ব্যাকআপ সহ ইয়ারবাডস।', descEn: 'Bluetooth 5.3 earbuds with 24-hour battery backup.', sizes: ['Free Size'], stock: 30, tag: 'flash-sale' },
  { id: 'p39', sku: 'A100039', nameBn: 'স্মার্ট ওয়াচ', nameEn: 'Smart Watch', main: 'electronics', sub: 'smartwatch', price: 2250, oldPrice: 2990, img: U('photo-1579586337278-3befd40fd17a'), descBn: 'হার্ট রেট, স্টেপ ও স্লিপ ট্র্যাকিং সহ স্মার্ট ওয়াচ।', descEn: 'Smart watch with heart rate, step and sleep tracking.', sizes: ['Free Size'], stock: 20, tag: 'featured' },
  /* ---- NEW: Cosmetics (skincare/makeup) ---- */
  { id: 'p40', sku: 'A100040', nameBn: 'ভিটামিন সি ফেস সিরাম', nameEn: 'Vitamin C Face Serum', main: 'cosmetics', sub: 'skincare', price: 1150, oldPrice: 1500, img: U('photo-1620916566398-39f1143ab7be'), descBn: 'ত্বক উজ্জ্বল করা ভিটামিন সি সিরাম, ৩০মি.লি.।', descEn: 'Skin-brightening vitamin C serum, 30ml.', sizes: ['30ml'], stock: 26, tag: 'best-seller' },
  { id: 'p41', sku: 'A100041', nameBn: 'ম্যাট লিপস্টিক সেট (৩টি)', nameEn: 'Matte Lipstick Set (3pcs)', main: 'cosmetics', sub: 'makeup', price: 950, oldPrice: 1250, img: U('photo-1596462502278-27bfdc403348'), descBn: 'দীর্ঘস্থায়ী ম্যাট লিপস্টিক, ৩টি জনপ্রিয় শেড।', descEn: 'Long-lasting matte lipsticks, 3 popular shades.', sizes: ['3pcs'], stock: 32, tag: 'new' },
  /* ---- NEW: Kids (more subs) ---- */
  { id: 'p42', sku: 'A100042', nameBn: 'কিডস ফ্রক', nameEn: 'Kids Frock', main: 'kids', sub: 'kids-dress', price: 750, oldPrice: 990, img: U('photo-1519238263530-99bdd11df2ea'), descBn: 'রঙিন ফুলেল প্রিন্টের কিডস ফ্রক।', descEn: 'Colorful floral-print kids frock.', sizes: ['2Y', '4Y', '6Y', '8Y'], stock: 18, tag: '' },
  { id: 'p43', sku: 'A100043', nameBn: 'কিডস স্নিকার্স', nameEn: 'Kids Sneakers', main: 'kids', sub: 'kids-shoes', price: 1150, oldPrice: 1500, img: U('photo-1549298916-b41d501d3772'), descBn: 'আরামদায়ক কিডস স্নিকার্স, লাইট সহ।', descEn: 'Comfortable kids sneakers with lights.', sizes: ['28', '30', '32', '34'], stock: 15, tag: 'new' },
  /* ---- NEW: Home (more) ---- */
  { id: 'p44', sku: 'A100044', nameBn: 'সুতি কুশন কভার (জোড়া)', nameEn: 'Cotton Cushion Cover (Pair)', main: 'home', sub: 'cushion', price: 550, oldPrice: 750, img: U('photo-1493663284031-b7e3aefcae8e'), descBn: 'নরম সুতি কুশন কভার, ২টির সেট।', descEn: 'Soft cotton cushion covers, set of 2.', sizes: ['16x16'], stock: 35, tag: '' },
  /* ---- NEW: Footwear (more) ---- */
  { id: 'p45', sku: 'A100045', nameBn: 'ক্লাসিক লোফার', nameEn: 'Classic Loafer', main: 'footwear', sub: 'loafer', price: 1850, oldPrice: 2400, img: U('photo-1560343090-f0409e92791a'), descBn: 'প্রিমিয়াম লেদার লোফার, ফরমাল ও ক্যাজুয়াল দুটোতেই মানায়।', descEn: 'Premium leather loafer, suits formal and casual.', sizes: ['40', '41', '42', '43', '44'], stock: 14, tag: 'featured' },
  /* ---- NEW: Food (more) ---- */
  { id: 'p46', sku: 'A100046', nameBn: 'মিক্সড ড্রাই ফ্রুটস (৫০০গ্রাম)', nameEn: 'Mixed Dry Fruits (500g)', main: 'food', sub: 'dryfruits', price: 850, oldPrice: 1100, img: U('photo-1508061253366-f7da158b6d46'), descBn: 'কাজু, কিশমিশ, আখরোট ও বাদামের মিক্সড প্যাক।', descEn: 'Mixed pack of cashews, raisins, walnuts and almonds.', sizes: ['500g'], stock: 28, tag: '' },
  /* ---- NEW: Electronics (more) ---- */
  { id: 'p47', sku: 'A100047', nameBn: 'ফাস্ট চার্জিং কেবল (Type-C)', nameEn: 'Fast Charging Cable (Type-C)', main: 'electronics', sub: 'charger', price: 350, oldPrice: 500, img: U('photo-1583864697784-a0efc8379f70'), descBn: 'দ্রুত চার্জিং + ডেটা ট্রান্সফার, ১ মিটার Type-C কেবল।', descEn: 'Fast charging + data transfer, 1m Type-C cable.', sizes: ['1m'], stock: 80, tag: '' },
  /* ---- NEW: Islamic (more) ---- */
  { id: 'p48', sku: 'A100048', nameBn: 'প্রিমিয়াম জায়নামাজ', nameEn: 'Premium Jaynamaz', main: 'islamic', sub: 'jaynamaz', price: 750, oldPrice: 990, img: U('photo-1519791883288-dc8bd696e667'), descBn: 'নরম ভেলভেট জায়নামাজ, আরামদায়ক ও টেকসই।', descEn: 'Soft velvet prayer mat, comfortable and durable.', sizes: ['Standard'], stock: 25, tag: '' },
  /* ---- NEW: Accessories (more) ---- */
  { id: 'p49', sku: 'A100049', nameBn: 'লেদার বেল্ট', nameEn: 'Leather Belt', main: 'accessories', sub: 'belt', price: 650, oldPrice: 850, img: U('photo-1627123424574-724758594e93'), descBn: 'আসল লেদারের ক্লাসিক বেল্ট, অ্যাডজাস্টেবল।', descEn: 'Genuine leather classic belt, adjustable.', sizes: ['Free Size'], stock: 30, tag: '' },
  { id: 'p50', sku: 'A100050', nameBn: 'UV সানগ্লাস', nameEn: 'UV Sunglasses', main: 'accessories', sub: 'sunglasses', price: 850, oldPrice: 1150, img: U('photo-1572635196237-14b3f281503f'), descBn: 'UV400 প্রোটেকশন সহ স্টাইলিশ সানগ্লাস।', descEn: 'Stylish sunglasses with UV400 protection.', sizes: ['Free Size'], stock: 22, tag: 'new' },
  { id: 'p51', sku: 'A100051', nameBn: 'ক্যানভাস ব্যাকপ্যাক', nameEn: 'Canvas Backpack', main: 'accessories', sub: 'bag', price: 1450, oldPrice: 1900, img: U('photo-1553062407-98eeb64c6a62'), descBn: 'ল্যাপটপ কম্পার্টমেন্ট সহ মজবুত ক্যানভাস ব্যাকপ্যাক।', descEn: 'Sturdy canvas backpack with laptop compartment.', sizes: ['Free Size'], stock: 16, tag: '' },
  /* ---- NEW: Gifts (more) ---- */
  { id: 'p52', sku: 'A100052', nameBn: 'আতর + টুপি কম্বো সেট', nameEn: 'Attar + Tupi Combo Set', main: 'gifts', sub: 'comboset', price: 1290, oldPrice: 1700, img: U('photo-1513201099705-a9746e1e201f'), descBn: '২টি আতর + ১টি টুপির গিফট কম্বো সেট।', descEn: 'Gift combo set of 2 attars + 1 tupi.', sizes: ['Set'], stock: 20, tag: 'flash-sale' },
  /* ---- NEW: Baby (more) ---- */
  { id: 'p53', sku: 'A100053', nameBn: 'বেবি কেয়ার সেট', nameEn: 'Baby Care Set', main: 'baby', sub: 'babycare', price: 950, oldPrice: 1250, img: U('photo-1519689680058-324335c77eba'), descBn: 'বেবি লোশন, শ্যাম্পু ও ওয়েল সহ কেয়ার সেট।', descEn: 'Baby care set with lotion, shampoo and oil.', sizes: ['Set'], stock: 18, tag: '' },
  /* ---- NEW: Home (more) ---- */
  { id: 'p54', sku: 'A100054', nameBn: 'সুতি বাথ টাওয়েল', nameEn: 'Cotton Bath Towel', main: 'home', sub: 'towel', price: 450, oldPrice: 600, img: U('photo-1620626011761-996317b8d101'), descBn: 'নরম শোষক সুতি বাথ টাওয়েল।', descEn: 'Soft absorbent cotton bath towel.', sizes: ['Standard'], stock: 40, tag: '' },
  /* ---- NEW: Electronics (power bank) ---- */
  { id: 'p55', sku: 'A100055', nameBn: '২০০০০mAh পাওয়ার ব্যাংক', nameEn: '20000mAh Power Bank', main: 'electronics', sub: 'powerbank', price: 1850, oldPrice: 2400, img: U('photo-1609091839311-d5365f9ff1c5'), descBn: 'দ্রুত চার্জিং সহ ২০০০০mAh পাওয়ার ব্যাংক।', descEn: '20000mAh power bank with fast charging.', sizes: ['20000mAh'], stock: 24, tag: 'best-seller' },
];

const SEED_TESTIMONIALS = [
  { name: 'সাদিয়া ইসলাম', loc: 'ধানমন্ডি, ঢাকা', rating: 5, text: 'পাঞ্জাবির কাপড় খুব ভালো, ছবির মতোই পেয়েছি। ডেলিভারিও দ্রুত হয়েছে।' },
  { name: 'তানভীর হাসান', loc: 'চট্টগ্রাম', rating: 5, text: 'স্নিকার্সের কোয়ালিটি দামের তুলনায় দুর্দান্ত। ক্যাশ অন ডেলিভারি সুবিধা ভালো লেগেছে।' },
  { name: 'নুসরাত জাহান', loc: 'সিলেট', rating: 4, text: 'আতরটা দারুণ। প্যাকেজিং খুব সুন্দর ছিল। আবার অর্ডার করবো।' },
  { name: 'রাকিব আহমেদ', loc: 'রাজশাহী', rating: 5, text: 'অর্ডারের পর ফোনে কনফার্ম করেছে, ট্র্যাকিংও ঠিকঠাক কাজ করেছে।' },
];

const SEED_FAQS = [
  { q: 'কিভাবে অর্ডার করবো?', a: 'পণ্য পছন্দ করে কার্টে যোগ করুন, এরপর চেকআউট পেজে নাম, মোবাইল নম্বর ও ঠিকানা দিয়ে অর্ডার কনফার্ম করুন।' },
  { q: 'ডেলিভারিতে কত সময় লাগে?', a: 'ঢাকার ভিতরে ১–২ দিন এবং ঢাকার বাইরে ২–৪ কর্মদিবস সময় লাগে।' },
  { q: 'কোন কোন পেমেন্ট মেথড আছে?', a: 'ক্যাশ অন ডেলিভারি, বিকাশ ও নগদ দিয়ে পেমেন্ট করা যায়।' },
  { q: 'পণ্য রিটার্ন করা যাবে?', a: 'ডেলিভারি ম্যানের সামনে প্রোডাক্ট চেক করে নিতে পারবেন।' },
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
  hiddenCategories: [], /* main-category slugs hidden from storefront */
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=800&auto=format&fit=crop';
