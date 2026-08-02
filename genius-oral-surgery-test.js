'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? (PASS++, console.log('  \u2713 ' + n)) : (FAIL++, console.log('  \u2717 ' + n + (x !== undefined ? ' \u2192 ' + JSON.stringify(x) : ''))); };

console.log('\n== اختبار كاسشيت Genius — Oral & Maxillofacial Surgery ==\n');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

/* ---------------- 1) الحفظ/الاستعادة عبر الدوال الحقيقية (collectCasesheetForm/fillCasesheetForm) ----------------
   نبني عناصر DOM وهمية دقيقة (type/dataset/value/checked) تطابق فعلياً ما تُنتجه geFieldHTML لكل حقل من GOS_FIELDS
   الحقيقية (لا حقول مُختلَقة)، ونمرّرها عبر querySelectorAll الحقيقي المُستدعى من داخل الدالتين الفعليتين. */
(function () {
  const gofM = /var GOS_FIELDS = \[[\s\S]*?\n  \];/.exec(SRC);
  const collectM = /function collectCasesheetForm\(\) \{[\s\S]*?\n  \}\n/.exec(SRC);
  const fillM = /function fillCasesheetForm\(data\) \{[\s\S]*?\n  \}\n/.exec(SRC);
  ok('استخراج GOS_FIELDS/collectCasesheetForm/fillCasesheetForm من الملف الفعلي', !!gofM && !!collectM && !!fillM);

  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(gofM[0] + '\nthis.__fields = GOS_FIELDS;', sandbox);
  const fields = sandbox.__fields;
  ok('94 حقلاً فعلياً في GOS_FIELDS (65 نص + 29 اختيار)', fields.length === 94 && fields.filter((f) => f.t === 'text').length === 65 && fields.filter((f) => f.t === 'check').length === 29);

  // عناصر DOM وهمية تطابق فعلياً ما تنتجه geFieldHTML: <input type="text"|"checkbox" data-field="k">
  function makeElements() {
    return fields.map((f) => ({ type: f.t === 'check' ? 'checkbox' : 'text', dataset: { field: f.k }, value: '', checked: false }));
  }
  function byKey(els, key) { return els.find((e) => e.dataset.field === key); }

  const sandbox2 = { document: { querySelectorAll: (sel) => sel === '#csFormBody [data-field]' ? sandbox2.__els : [] } };
  vm.createContext(sandbox2);
  vm.runInContext(collectM[0] + fillM[0] + 'this.__collect = collectCasesheetForm; this.__fill = fillCasesheetForm;', sandbox2);

  let els = makeElements();
  sandbox2.__els = els;
  byKey(els, 'patientName').value = 'Sara Ahmed';
  byKey(els, 'painCheck').checked = true;
  byKey(els, 'mhDiabetes').checked = true;
  byKey(els, 'diagnosis').value = 'Dry socket';
  byKey(els, 'markTotal').value = '8';

  const collected = sandbox2.__collect();
  ok('collectCasesheetForm يلتقط القيم النصية الحقيقية', collected.patientName === 'Sara Ahmed', collected.patientName);
  ok('collectCasesheetForm يلتقط الاختيارات (checkbox) الحقيقية', collected.painCheck === true && collected.mhDiabetes === true);
  ok('باقي مربعات الاختيار غير المحدَّدة تُحفظ false', collected.swellingCheck === false);
  ok('حقول الجدول الكبير والتقييم تُحفظ بشكل صحيح', collected.diagnosis === 'Dry socket' && collected.markTotal === '8');

  // إعادة بناء عناصر جديدة فارغة (محاكاة إغلاق وإعادة فتح الكاسشيت) ثم استعادة نفس البيانات المحفوظة فيها
  els = makeElements();
  sandbox2.__els = els;
  sandbox2.__fill(collected);
  const restoredName = byKey(els, 'patientName').value;
  const restoredPain = byKey(els, 'painCheck').checked;
  const restoredDiag = byKey(els, 'diagnosis').value;
  ok('الاستعادة بعد إعادة الفتح: النص يعود صحيحاً', restoredName === 'Sara Ahmed', restoredName);
  ok('الاستعادة: مربعات الاختيار تعود محدَّدة بشكل صحيح', restoredPain === true);
  ok('الاستعادة: حقل التشخيص يعود صحيحاً', restoredDiag === 'Dry socket', restoredDiag);
})();

/* ---------------- 2) التسجيل والنطاق الجامعي (CS_TEMPLATES + universities) ---------------- */
(function () {
  const m = /var CS_TEMPLATES = \{[\s\S]*?\n  \};/.exec(SRC);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(
    "var CS_ICON_SURGERY='s', CS_ICON_OPERATIVE='o', CS_ICON_ENDO='e';\n" + m[0] + "\nthis.__t = CS_TEMPLATES;",
    sandbox
  );
  const T = sandbox.__t;
  ok("'genius-oral-surgery' مسجَّل في CS_TEMPLATES", !!T['genius-oral-surgery']);
  ok("النطاق الجامعي: جينيس فقط", JSON.stringify(T['genius-oral-surgery'].universities) === JSON.stringify(['genius']));
  ok("اسم البطاقة يطابق المطلوب حرفياً", T['genius-oral-surgery'].name === 'Oral & Maxillofacial Surgery Case Sheet', T['genius-oral-surgery'].name);

  function visibleFor(uni) {
    return Object.keys(T).filter((k) => T[k].universities.indexOf(uni) >= 0);
  }
  ok('جينيس يرى الكاسشيتين معاً (Endodontic + Oral Surgery)', JSON.stringify(visibleFor('genius').sort()) === JSON.stringify(['genius-endodontic', 'genius-oral-surgery'].sort()));
  ok('الجزيرة لا ترى Oral Surgery الخاص بجينيس', visibleFor('jazeera').indexOf('genius-oral-surgery') === -1);
  ok('إب لا ترى Oral Surgery الخاص بجينيس', visibleFor('ib').indexOf('genius-oral-surgery') === -1);
  ok('الجزيرة/إب يريان قالبيهما الأصليين فقط دون تغيير', JSON.stringify(visibleFor('jazeera').sort()) === JSON.stringify(['jazeera-oral-surgery', 'operative-dentistry'].sort()));
  ok('جامعة بلا كاسشيتات (ذمار) لا ترى أي قالب', visibleFor('dhamar').length === 0);
})();

console.log('\n----------------------------------------');
console.log('النتيجة: ' + PASS + ' ناجح، ' + FAIL + ' فاشل');
console.log('----------------------------------------\n');
process.exit(FAIL ? 1 : 0);
