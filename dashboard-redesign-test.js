'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? (PASS++, console.log('  \u2713 ' + n)) : (FAIL++, console.log('  \u2717 ' + n + (x !== undefined ? ' \u2192 ' + JSON.stringify(x) : ''))); };

console.log('\n== اختبار منطق الفترة التجريبية داخل الـHero وبطاقة الإرشاد (script.js الفعلي) ==\n');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');

/* ---------------- 1) اختبار الجمع العربي الصحيح لعدد الساعات (استخراج فعلي، لا نسخ يدوي) ---------------- */
(function () {
  const m = /function _arHoursRemaining\(h\) \{[\s\S]*?\n  \}/.exec(SRC);
  if (!m) { ok('استخراج _arHoursRemaining من الملف الفعلي', false); return; }
  const sandbox = { T: (s) => s };
  vm.createContext(sandbox);
  vm.runInContext('function ' + m[0].slice('function '.length) + '\nthis.__f = _arHoursRemaining;', sandbox);
  const f = sandbox.__f;
  ok('استخراج _arHoursRemaining من الملف الفعلي', typeof f === 'function');
  ok('h=1 -> صيغة المفرد', f(1) === 'ساعة واحدة متبقية', f(1));
  ok('h=2 -> صيغة المثنى', f(2) === 'ساعتان متبقيتان', f(2));
  ok('h=3 -> جمع (3 ساعات متبقية)', f(3) === '3 ساعات متبقية', f(3));
  ok('h=10 -> جمع (10 ساعات متبقية)', f(10) === '10 ساعات متبقية', f(10));
  ok('h=18 -> صيغة 11+ (18 ساعة متبقية) — طابق مثال المواصفة', f(18) === '18 ساعة متبقية', f(18));
  ok('h=24 -> صيغة 11+ (24 ساعة متبقية) — طابق مثال المواصفة', f(24) === '24 ساعة متبقية', f(24));
})();

/* ---------------- 2) منطق إظهار/إخفاء مربع الفترة التجريبية (updateTrialBanner) ---------------- */
(function () {
  const m = /function updateTrialBanner\(\) \{[\s\S]*?\n  \}\n/.exec(SRC);
  ok('استخراج updateTrialBanner من الملف الفعلي', !!m);
  if (!m) return;
  function makeEls() { return { heroTrialBox: { hidden: true }, heroTrialText: { textContent: '' } }; }

  function run(state, hours) {
    const calls = { enforceAccessLock: 0, openActivation: 0, bodyClassRemoved: 0 };
    const sandbox = {
      window: { DPLicense: { getAccessState: () => state, trialRemainingHours: () => hours } },
      els: makeEls(),
      T: (s) => s,
      document: { body: { classList: { remove: (c) => { if (c === 'dp-access-locked') calls.bodyClassRemoved++; } } } },
      enforceAccessLock: () => { calls.enforceAccessLock++; },
      openActivation: () => { calls.openActivation++; },
      _arHoursRemaining: (h) => h + ' ساعة متبقية',
      _wasInTrial: false,
    };
    vm.createContext(sandbox);
    vm.runInContext('var _wasInTrial = false;\n' + m[0] + '\nthis.__run = updateTrialBanner; this.__sb = { get wasInTrial(){ return _wasInTrial; } };', sandbox);
    sandbox.__run();
    return { els: sandbox.els, calls };
  }

  let r = run('trial', 5);
  ok('trial: المربع يظهر (hidden=false)', r.els.heroTrialBox.hidden === false);
  ok('trial: النص يعكس الساعات المتبقية', r.els.heroTrialText.textContent.indexOf('5') !== -1, r.els.heroTrialText.textContent);

  r = run('activated', 0);
  ok('activated: المربع مخفي', r.els.heroTrialBox.hidden === true);
  ok('activated: لا استدعاء لـ openActivation', r.calls.openActivation === 0);

  r = run('expired', 0);
  ok('expired: المربع مخفي أيضاً (ليس "مفعّل"، بل قفل)', r.els.heroTrialBox.hidden === true);
  ok('expired: enforceAccessLock استُدعيت', r.calls.enforceAccessLock === 1);
})();

/* ---------------- 3) منطق إظهار/إخفاء بطاقة الإرشاد (updateOnboardCard) — بيانات حقيقية فقط ---------------- */
(function () {
  const m = /function updateOnboardCard\(\) \{[\s\S]*?\n  \}\n/.exec(SRC);
  ok('استخراج updateOnboardCard من الملف الفعلي', !!m);
  if (!m) return;

  function run(dismissed, casesLen, accessState) {
    const store = {};
    if (dismissed) store['dentpilot_student_onboard_dismissed_v1'] = '1';
    const sandbox = {
      els: { onboardCard: { hidden: true } },
      cases: new Array(casesLen),
      accessStateSafe: () => accessState,
      localStorage: { getItem: (k) => (k in store ? store[k] : null) },
    };
    vm.createContext(sandbox);
    vm.runInContext('var ONBOARD_DISMISS_KEY = \'dentpilot_student_onboard_dismissed_v1\';\n' + m[0] + '\nthis.__run = updateOnboardCard;', sandbox);
    sandbox.__run();
    return sandbox.els.onboardCard.hidden;
  }

  ok('مستخدم جديد تماماً (0 حالات، غير مفعّل، لم يُغلَق): تظهر', run(false, 0, 'trial') === false);
  ok('مستخدم بدأ الاستخدام الفعلي (حالة واحدة+): تختفي رغم عدم التفعيل', run(false, 1, 'trial') === true);
  ok('مستخدم مفعَّل (حتى لو 0 حالات): تختفي', run(false, 0, 'activated') === true);
  ok('أغلقها المستخدم يدوياً: تبقى مختفية حتى لو 0 حالات وغير مفعّل', run(true, 0, 'trial') === true);
  ok('مستخدم قديم (حالات كثيرة): لا تظهر أبداً', run(false, 42, 'expired') === true);
})();

console.log('\n----------------------------------------');
console.log('النتيجة: ' + PASS + ' ناجح، ' + FAIL + ' فاشل');
console.log('----------------------------------------\n');
process.exit(FAIL ? 1 : 0);
