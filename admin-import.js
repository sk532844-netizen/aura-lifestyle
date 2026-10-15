/* AURA LIFESTYLE — Bulk Import engine (classic script, no dependencies except XLSX global for .xlsx)
   Exposes: window.AuraImport = { parseCSV, parseXLSXFile, normalizeRows, validateRows, buildProduct, runImport, downloadTemplate, HEADERS } */

(function () {
  'use strict';

  /* Canonical headers + accepted aliases (lowercased) */
  var FIELD_ALIASES = {
    nameBn: ['namebn', 'name_bn', 'বাংলা নাম', 'bangla name'],
    nameEn: ['nameen', 'name_en', 'english নাম', 'english name', 'name', 'product name'],
    sku: ['sku', 'কোড', 'product code'],
    price: ['price', 'দাম', 'মূল্য', 'sale price', 'saleprice'],
    oldPrice: ['oldprice', 'old_price', 'আগের দাম', 'regular price', 'regularprice', 'mrp'],
    main: ['main', 'মেইন ক্যাটাগরি', 'category', 'main category'],
    sub: ['sub', 'সাব-ক্যাটাগরি', 'subcategory', 'sub category'],
    stock: ['stock', 'স্টক', 'qty', 'quantity'],
    descBn: ['descbn', 'desc_bn', 'বাংলা বিবরণ', 'bangla description'],
    descEn: ['descen', 'desc_en', 'english বিবরণ', 'english description', 'description'],
    img: ['img', 'image', 'ছবি', 'imageurl', 'image_url', 'photo'],
    images: ['images', 'extra images', 'অতিরিক্ত ছবি'],
    sizes: ['sizes', 'size', 'সাইজ'],
    tag: ['tag', 'ট্যাগ'],
    visible: ['visible', 'দেখাবে', 'active'],
  };
  var HEADERS = Object.keys(FIELD_ALIASES);
  var ALIAS_TO_FIELD = {};
  HEADERS.forEach(function (f) {
    ALIAS_TO_FIELD[f] = f;
    FIELD_ALIASES[f].forEach(function (a) { ALIAS_TO_FIELD[a] = f; });
  });

  var VALID_TAGS = ['', 'flash-sale', 'best-seller', 'new', 'featured'];

  /* ---------- robust CSV parser (quotes, commas, newlines) ---------- */
  function parseCSV(text) {
    var rows = [], row = [], field = '', inQ = false, i = 0;
    text = String(text).replace(/^\uFEFF/, '');
    while (i < text.length) {
      var c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      if (c === '"') { inQ = true; i++; continue; }
      if (c === ',') { row.push(field); field = ''; i++; continue; }
      if (c === '\r' || c === '\n') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = []; i++; continue;
      }
      field += c; i++;
    }
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  function rowsToObjects(matrix) {
    if (!matrix.length) return [];
    var headers = matrix[0].map(function (h) { return String(h).trim().toLowerCase(); });
    return matrix.slice(1).map(function (r) {
      var o = {};
      headers.forEach(function (h, idx) {
        var f = ALIAS_TO_FIELD[h];
        if (f && !(f in o)) o[f] = (r[idx] !== undefined ? String(r[idx]).trim() : '');
      });
      return o;
    }).filter(function (o) { return Object.keys(o).length > 0; });
  }

  /* ---------- .xlsx via SheetJS ---------- */
  function parseXLSXFile(file) {
    return new Promise(function (resolve, reject) {
      if (typeof XLSX === 'undefined') {
        reject(new Error('Excel লাইব্রেরি লোড হয়নি — ইন্টারনেট চেক করে আবার চেষ্টা করুন।'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var wb = XLSX.read(reader.result, { type: 'array' });
          var ws = wb.Sheets[wb.SheetNames[0]];
          var json = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
          var objs = json.map(function (r) {
            var o = {};
            Object.keys(r).forEach(function (k) {
              var f = ALIAS_TO_FIELD[String(k).trim().toLowerCase()];
              if (f && !(f in o)) o[f] = String(r[k]).trim();
            });
            return o;
          }).filter(function (o) { return Object.keys(o).length > 0; });
          resolve(objs);
        } catch (e) { reject(e); }
      };
      reader.onerror = function () { reject(new Error('ফাইল পড়া যায়নি।')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseCSVFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try { resolve(rowsToObjects(parseCSV(reader.result))); }
        catch (e) { reject(e); }
      };
      reader.onerror = function () { reject(new Error('ফাইল পড়া যায়নি।')); };
      reader.readAsText(file, 'utf-8');
    });
  }

  /* ---------- validation ---------- */
  function isURL(s) { return /^(https?:\/\/)[^\s]+$/i.test(s || ''); }

  /* ctx: { skuToId: Map(lowerSku -> id), validMains: {main: [subs]}, nextSkuNum: int } */
  function validateRows(rows, ctx) {
    var seenSku = {};
    return rows.map(function (r, idx) {
      var errors = [], warnings = [];
      var rowNum = idx + 2; /* header = row 1 */
      var nameBn = (r.nameBn || '').trim(), nameEn = (r.nameEn || '').trim();
      if (!nameBn) errors.push('বাংলা নাম নেই');
      if (!nameEn) errors.push('English নাম নেই');

      var price = Number(String(r.price).replace(/[৳,\s]/g, ''));
      if (r.price === '' || isNaN(price) || price < 0) errors.push('সঠিক দাম দিন');

      var oldPrice = 0;
      if (r.oldPrice !== '' && r.oldPrice !== undefined) {
        oldPrice = Number(String(r.oldPrice).replace(/[৳,\s]/g, ''));
        if (isNaN(oldPrice) || oldPrice < 0) errors.push('আগের দাম সঠিক নয়');
        else if (oldPrice <= price) { warnings.push('আগের দাম দামের চেয়ে বেশি নয় — ছাড় বাদ'); oldPrice = 0; }
      }

      var stock = 0;
      if (r.stock !== '' && r.stock !== undefined) {
        stock = Number(String(r.stock).replace(/,/g, ''));
        if (!Number.isInteger(stock) || stock < 0) errors.push('স্টক পূর্ণসংখ্যা (≥0) হতে হবে');
      }

      var main = (r.main || '').trim().toLowerCase(), sub = (r.sub || '').trim().toLowerCase();
      if (!main || !ctx.validMains[main]) errors.push('মেইন ক্যাটাগরি সঠিক নয়: ' + (r.main || '—'));
      else if (!sub || ctx.validMains[main].indexOf(sub) < 0) errors.push('সাব-ক্যাটাগরি সঠিক নয়: ' + (r.sub || '—'));

      var imgs = [];
      [r.img, r.images].forEach(function (cell) {
        String(cell || '').split('|').forEach(function (u) {
          u = u.trim();
          if (u) imgs.push(u);
        });
      });
      imgs = imgs.filter(function (u, i) { return imgs.indexOf(u) === i; });
      if (!imgs.length) errors.push('কমপক্ষে ১টি ছবির URL দিন');
      else imgs.forEach(function (u) { if (!isURL(u)) errors.push('ছবির URL সঠিক নয়: ' + u.slice(0, 40)); });

      var sizes = String(r.sizes || '').split(/[|,]/).map(function (s) { return s.trim(); }).filter(Boolean);

      var tag = (r.tag || '').trim();
      if (tag && VALID_TAGS.indexOf(tag) < 0) { warnings.push('ট্যাগ অচেনা — বাদ দেওয়া হলো'); tag = ''; }

      var visible = true;
      var v = String(r.visible || '').trim().toLowerCase();
      if (['false', '0', 'no', 'না', 'off'].indexOf(v) >= 0) visible = false;

      var sku = (r.sku || '').trim().toUpperCase();
      var status = 'new', dupId = null;
      if (sku) {
        if (!/^A\d+$/i.test(sku)) errors.push('SKU ফরম্যাট A + সংখ্যা হতে হবে (যেমন A100056)');
        else if (seenSku[sku]) errors.push('ফাইলের ভেতরেই ডুপ্লিকেট SKU: ' + sku);
        else if (ctx.skuToId.has(sku.toLowerCase())) { status = 'duplicate'; dupId = ctx.skuToId.get(sku.toLowerCase()); }
        seenSku[sku] = true;
      }

      if (errors.length) status = 'invalid';

      return {
        rowNum: rowNum, raw: r, status: status, dupId: dupId,
        errors: errors, warnings: warnings,
        data: {
          sku: sku, nameBn: nameBn, nameEn: nameEn, main: main, sub: sub,
          price: isNaN(price) ? 0 : price, oldPrice: oldPrice, stock: stock,
          descBn: (r.descBn || '').trim(), descEn: (r.descEn || '').trim(),
          images: imgs, sizes: sizes, tag: tag, visible: visible,
        },
      };
    });
  }

  /* Build final Firestore product doc. idNumRef/skuNumRef: {n} counters (mutated) */
  function buildProduct(v, idNumRef, skuNumRef) {
    var sku = v.data.sku || ('A' + (skuNumRef.n++));
    var id = v.dupId || ('p' + (idNumRef.n++));
    return {
      id: id, sku: sku,
      nameBn: v.data.nameBn, nameEn: v.data.nameEn,
      main: v.data.main, sub: v.data.sub,
      price: v.data.price, oldPrice: v.data.oldPrice,
      img: v.data.images[0], images: v.data.images,
      descBn: v.data.descBn, descEn: v.data.descEn,
      sizes: v.data.sizes, stock: v.data.stock,
      tag: v.data.tag, visible: v.data.visible,
    };
  }

  /* items: validated rows; opts: {updateDuplicates: bool, saveFn, idStart, skuStart, onProgress} */
  async function runImport(items, opts) {
    var stats = { added: 0, updated: 0, skipped: 0, failed: 0, failures: [] };
    var idRef = { n: opts.idStart }, skuRef = { n: opts.skuStart };
    var total = items.length;
    for (var i = 0; i < items.length; i++) {
      var v = items[i];
      if (opts.onProgress) opts.onProgress(i + 1, total);
      if (v.status === 'invalid') { stats.skipped++; continue; }
      if (v.status === 'duplicate' && !opts.updateDuplicates) { stats.skipped++; continue; }
      try {
        var p = buildProduct(v, idRef, skuRef);
        var r = await opts.saveFn(p);
        if (r && r.ok) {
          if (v.status === 'duplicate') stats.updated++;
          else stats.added++;
        } else {
          stats.failed++;
          stats.failures.push({ rowNum: v.rowNum, error: (r && (r.error || 'Firebase কানেক্ট হয়নি')) || 'ব্যর্থ' });
        }
      } catch (e) {
        stats.failed++;
        stats.failures.push({ rowNum: v.rowNum, error: String((e && e.message) || e) });
      }
    }
    return stats;
  }

  function downloadTemplate() {
    var head = HEADERS.join(',');
    var ex1 = ['প্রিমিয়াম কটন পাঞ্জাবি', 'Premium Cotton Panjabi', '', 1890, 2690, 'men', 'panjabi', 24,
      '১০০% সুতি আরামদায়ক পাঞ্জাবি।', 'Comfortable 100% cotton panjabi.',
      'https://example.com/panjabi1.jpg', '', 'M|L|XL|XXL', 'best-seller', 'true'].join(',');
    var ex2 = ['জামদানি শাড়ি', 'Jamdani Saree', 'A100900', 3490, '', 'women', 'saree', 10,
      'ঐতিহ্যবাহী হাতে বোনা জামদানি।', 'Traditional hand-woven Jamdani.',
      'https://example.com/saree1.jpg', '', 'Free Size', 'featured', 'true'].join(',');
    var csv = '﻿' + head + '\n' + ex1 + '\n' + ex2 + '\n';
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aura-bulk-import-template.csv';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  window.AuraImport = {
    HEADERS: HEADERS,
    parseCSV: parseCSV,
    parseCSVFile: parseCSVFile,
    parseXLSXFile: parseXLSXFile,
    validateRows: validateRows,
    buildProduct: buildProduct,
    runImport: runImport,
    downloadTemplate: downloadTemplate,
  };
})();
