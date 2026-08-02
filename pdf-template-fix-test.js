'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? (PASS++, console.log('  \u2713 ' + n)) : (FAIL++, console.log('  \u2717 ' + n + (x !== undefined ? ' \u2192 ' + JSON.stringify(x) : ''))); };

console.log('\n== اختبار إصلاح خلفية قالب PDF (background-image -> <img> حقيقي) ==\n');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'case-sheet-print.html'), 'utf8');
const scriptMatch = /<script>([\s\S]*)<\/script>/.exec(SRC);
ok('استخراج كتلة السكربت من case-sheet-print.html', !!scriptMatch);
const JS = scriptMatch[1];

ok('لا وجود لأي background-image:url على .ge-print-page في الملف الفعلي', !/ge-print-page[^;]*background-image/.test(JS));
ok('لا وجود لـ background-image:url(genius-endo إطلاقاً في الملف', !JS.includes("background-image:url(genius-endo"));
ok('.ge-print-bg (عنصر <img> الحقيقي) معرَّف في الأنماط المُحقَنة', JS.includes('.ge-print-bg{'));
ok('print-color-adjust:exact مضاف للتأكيد على طباعة الألوان', JS.includes('print-color-adjust:exact'));
ok('geWaitImagesThenPrint (انتظار تحميل الصور فعلياً قبل الطباعة) موجودة', JS.includes('function geWaitImagesThenPrint'));

/* ---------------- تنفيذ فعلي: بناء الصفحتين والتحقق من وجود <img> حقيقي بدل CSS background ---------------- */
(function () {
  const document_ = {
    _head: { children: [] },
    head: null,
    createElement: (tag) => ({ tag, textContent: '', appendChild() {} }),
    getElementById: (id) => (id === 'sheet' ? sheetEl : null),
    querySelectorAll: (sel) => (sel === '.ge-print-bg' ? sheetEl._imgs : []),
  };
  document_.head = { appendChild: (el) => document_._head.children.push(el) };
  let sheetEl = { innerHTML: '', _imgs: [] };
  Object.defineProperty(sheetEl, 'innerHTML', {
    get() { return this._html || ''; },
    set(v) {
      this._html = v;
      // استخراج بدائي لعناصر <img class="ge-print-bg" src="..."> من النص الناتج فعلياً
      const imgs = [];
      const re = /<img class="ge-print-bg" src="([^"]+)"/g; let m;
      while ((m = re.exec(v))) imgs.push({ src: m[1], complete: true, addEventListener() {} });
      this._imgs = imgs;
    },
  });

  const sandbox = { document: document_, esc: (s) => String(s || '') };
  vm.createContext(sandbox);

  // استخراج الدوال الفعلية المطلوبة فقط (geFieldMark, geInjectStyleOnce, renderGeOverlayCasesheet, renderGeniusEndodontic)
  const need = ['geFieldMark', 'geInjectStyleOnce', 'renderGeOverlayCasesheet', 'renderGeniusEndodontic'];
  let extracted = 'var _geStyleInjected = false;\n';
  need.forEach((name) => {
    const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}\\n');
    const m = re.exec(JS);
    if (!m) throw new Error('تعذّر استخراج ' + name);
    extracted += m[0] + '\n';
  });
  extracted += 'var GE_FIELDS = [{k:"patientName",t:"text",p:1,x:10,y:10,w:20,h:3},{k:"tooth1",t:"check",p:2,x:5,y:5,w:5,h:5}];\n';
  extracted += 'this.__renderEndo = renderGeniusEndodontic;\n';
  vm.runInContext(extracted, sandbox);

  const imgs = sandbox.__renderEndo({ data: { patientName: 'Test Patient', tooth1: true } });

  ok('renderGeniusEndodontic ترجع عناصر <img> حقيقية (وليس عدداً صفرياً)', Array.isArray(imgs) && imgs.length === 2, imgs);
  ok('الصورة الأولى تشير إلى genius-endo-p1.jpg', imgs[0] && imgs[0].src === 'genius-endo-p1.jpg');
  ok('الصورة الثانية تشير إلى genius-endo-p2.jpg', imgs[1] && imgs[1].src === 'genius-endo-p2.jpg');
  ok('محتوى الصفحة الناتج يحوي وسم <img> فعلياً لا CSS background', sheetEl._html.includes('<img class="ge-print-bg"') && !sheetEl._html.includes('background-image'));
  ok('بيانات الطالب (النص) ظهرت في الصفحة الصحيحة فوق القالب', sheetEl._html.includes('Test Patient'));
})();

console.log('\n----------------------------------------');
console.log('النتيجة: ' + PASS + ' ناجح، ' + FAIL + ' فاشل');
console.log('----------------------------------------\n');
process.exit(FAIL ? 1 : 0);
