'use strict';
const fs = require('fs');
const path = require('path');

console.log('\n== اختبار إصلاح لون اليوم النشط في شريط "أسبوعك السريري" ==\n');
let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? (PASS++, console.log('  \u2713 ' + n)) : (FAIL++, console.log('  \u2717 ' + n + (x !== undefined ? ' \u2192 ' + JSON.stringify(x) : ''))); };

const CSS_RAW = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const CSS = CSS_RAW.replace(/\/\*[\s\S]*?\*\//g, '');

// استخراج كل قواعد CSS (محدِّد + إعلانات) بترتيب ظهورها في الملف (ترتيب المصدر مهم عند تساوي التخصيص)
const rules = [];
const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
let m;
while ((m = ruleRe.exec(CSS))) {
  const selectorGroup = m[1].trim();
  const decls = m[2];
  selectorGroup.split(',').forEach((sel) => rules.push({ sel: sel.trim(), decls }));
}

// حاسبة تخصيص CSS مبسّطة (id, class/attr/pseudo-class, type) — كافية لمحدِّدات هذا الملف
function specificity(sel) {
  let ids = (sel.match(/#[\w-]+/g) || []).length;
  let classes = (sel.match(/\.[\w-]+/g) || []).length + (sel.match(/:[\w-]+(\([^)]*\))?/g) || []).length + (sel.match(/\[[^\]]+\]/g) || []).length;
  let types = (sel.replace(/#[\w-]+|\.[\w-]+|:[\w-]+(\([^)]*\))?|\[[^\]]+\]/g, '').match(/[a-zA-Z][\w-]*/g) || []).length;
  return [ids, classes, types];
}
function cmpSpec(a, b) { for (let i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] - b[i]; } return 0; }

// عنصر افتراضي: <button class="cal-day cal-day-today cal-day-active"> داخل <section id="view-dashboard">
function selectorMatches(sel) {
  // نطابق فقط المحدِّدات ذات الصلة الفعلية الموجودة في الملف لهذا العنصر (بسّطنا المطابقة لصور المحدِّدات المعروفة هنا فقط)
  const known = {
    '.cal-day': true,
    '.cal-day-name': false, // ليس هو نفسه العنصر (عنصر ابن)
    '.cal-day-num': false,
    '.cal-day-today': true,
    '.cal-day-today .cal-day-name': false,
    '.cal-day-today .cal-day-num': false,
    '.cal-day-active:not(.cal-day-today)': false, // العنصر امتلك .cal-day-today فعلاً، فيُستبعد بواسطة :not()
    '#view-dashboard .cal-day': true,
    '#view-dashboard .cal-day-active:not(.cal-day-today)': false,
    '#view-dashboard .cal-day.cal-day-today': true,
    '#view-dashboard .cal-day-today .cal-day-name': false,
    '#view-dashboard .cal-day-today .cal-day-num': false,
  };
  return known[sel] === true;
}

const matching = rules.filter((r) => selectorMatches(r.sel) && /background\s*:/.test(r.decls));
ok('عُثر على قواعد background مطابقة للعنصر (اليوم الحالي داخل لوحة الطالب)', matching.length >= 2, matching.map((r) => r.sel));

// نرتّب حسب التخصيص، وعند التساوي يفوز الأحدث في ترتيب المصدر (نفس سلوك المتصفح الحقيقي)
let winner = null;
matching.forEach((r, idx) => {
  const spec = specificity(r.sel);
  if (!winner || cmpSpec(spec, winner.spec) > 0 || (cmpSpec(spec, winner.spec) === 0 && idx > winner.idx)) {
    winner = { sel: r.sel, decls: r.decls, spec, idx };
  }
});

ok('القاعدة الفائزة فعلياً هي التدرّج الجديد ذو التخصيص الأعلى', winner && winner.sel === '#view-dashboard .cal-day.cal-day-today', winner && winner.sel);
ok('قيمة background الفائزة تستخدم --dp-elite-gradient (نفس تدرّج الـHero Card)', winner && /var\(--dp-elite-gradient\)/.test(winner.decls));
ok('القاعدة القديمة الشفافة (#F1F9FA) لم تعد هي الفائزة', !(winner && /#F1F9FA/.test(winner.decls)));

// تأكيد: التدرّج المستخدم هنا هو حرفياً نفس متغيّر خلفية الـHero Card
const heroRule = /\.hero-card\{[^}]*background:[\s\S]*?var\(--dp-elite-gradient\)/.test(CSS);
ok('نفس متغيّر خلفية الـHero Card (--dp-elite-gradient) مستخدَم في .hero-card أيضاً', heroRule);

// تأكيد: لون النص أبيض واضح لليوم الحالي فقط
ok('اسم اليوم يصبح أبيض/فاتح واضح على اليوم الحالي', /#view-dashboard \.cal-day-today \.cal-day-name\{[^}]*color:#cffafe/.test(CSS));
ok('رقم التاريخ يصبح أبيض واضح على اليوم الحالي', /#view-dashboard \.cal-day-today \.cal-day-num\{[^}]*color:#fff/.test(CSS));

// تأكيد: لا تغيير في الحجم/المحاذاة (نفس قاعدة .cal-day الأساسية للأبعاد لم تُعدَّل)
const baseRuleIntact = /\.cal-day\{ min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:clamp\(4px, 1vw, 8px\) 1px;/.test(CSS);
ok('قاعدة الحجم/المحاذاة الأساسية للكرت (.cal-day) لم تُمسّ إطلاقاً', baseRuleIntact);

// تأكيد: منطق التقويم في script.js (ترتيب الأيام، حساب اليوم الحالي) لم يُلمس
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
ok('دالة renderCalStrip (ترتيب الأيام وحساب اليوم الحالي) لم تُعدَّل', SCRIPT.includes("cal-day-today cal-day-active") && SCRIPT.includes('saturday.setDate'));

console.log('\n----------------------------------------');
console.log('النتيجة: ' + PASS + ' ناجح، ' + FAIL + ' فاشل');
console.log('----------------------------------------\n');
process.exit(FAIL ? 1 : 0);
