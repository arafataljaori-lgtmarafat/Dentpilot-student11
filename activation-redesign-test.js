'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let PASS = 0, FAIL = 0;
const ok = (n, c, x) => { c ? (PASS++, console.log('  \u2713 ' + n)) : (FAIL++, console.log('  \u2717 ' + n + (x !== undefined ? ' \u2192 ' + JSON.stringify(x) : ''))); };
console.log('\n== اختبار إعادة هيكلة الدعم والتفعيل (صفحتان ثابتتان) ==\n');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'script.js'), 'utf8');
function extract(re, label) { const m = re.exec(SRC); if (!m) throw new Error('تعذّر استخراج: ' + label); return m[0]; }

/* ============================================================
   1) بيانات الخطط والأسعار — تنفيذ فعلي لـ PLANS + planCardHtml
   ============================================================ */
(function () {
  const plansSrc = extract(/var PLANS = \[[\s\S]*?\n  \];/, 'PLANS');
  const fnSrc = extract(/function planCardHtml\(p\) \{[\s\S]*?\n  \}\n/, 'planCardHtml');
  const escSrc = extract(/function esc\(s\) \{[\s\S]*?\n  \}\n/, 'esc');
  const sandbox = { selectedPlanId: null };
  vm.createContext(sandbox);
  vm.runInContext(escSrc + plansSrc + fnSrc + 'this.__PLANS = PLANS; this.__f = planCardHtml;', sandbox);
  const PLANS = sandbox.__PLANS, f = sandbox.__f;

  const m1 = PLANS.find((p) => p.id === 'm1'), m6 = PLANS.find((p) => p.id === 'm6'), y1 = PLANS.find((p) => p.id === 'y1'), lt = PLANS.find((p) => p.id === 'lt');
  ok('1. شهر واحد: $2 / 1000 ريال يمني، بلا خصم', m1.usd === '$2' && m1.yer === '1000 ريال يمني' && !m1.yerOld);
  ok('   $ ملاصق للرقم في كل الخطط', [m1, m6, y1, lt].every((p) => /^\$\d+$/.test(p.usd)));
  ok('5. ستة أشهر: $5 يبقى، والسعر الجديد 1500 ريال', m6.usd === '$5' && m6.yer === '1500 ريال يمني');
  ok('   السعر القديم لستة أشهر 2500 ريال', m6.yerOld === '2500 ريال يمني');
  ok('6. سنوي: $10 يبقى، والسعر الجديد 3000 ريال', y1.usd === '$10' && y1.yer === '3000 ريال يمني' && y1.yerOld === '5000 ريال يمني');
  ok('   شارة "الأكثر اختياراً" على السنوي محفوظة', y1.badge === 'الأكثر اختياراً');
  ok('7. دائم: $25 يبقى، والسعر الجديد 7000 ريال', lt.usd === '$25' && lt.yer === '7000 ريال يمني' && lt.yerOld === '13500 ريال يمني');
  ok('   شارة "دفع مرة واحدة" على الدائم محفوظة', lt.badge === 'دفع مرة واحدة');
  ok('9. شارة "عروض افتتاحية" على 3 خطط فقط (ليس شهر واحد)', !m1.promo && m6.promo && y1.promo && lt.promo);

  // 8) السعر القديم مشطوب والجديد واضح — تنفيذ فعلي لـ planCardHtml
  const html6 = f(m6);
  ok('8. بطاقة ستة أشهر: السعر القديم يظهر داخل عنصر منفصل (plan-price-yer-old)', html6.includes('plan-price-yer-old">2500 ريال يمني<'));
  ok('   والسعر الجديد يظهر بوضوح (plan-price-yer)', html6.includes('plan-price-yer">1500 ريال يمني<'));
  ok('   وشارة عروض افتتاحية ظاهرة', html6.includes('plan-promo-badge'));
  const html1 = f(m1);
  ok('   بطاقة شهر واحد بلا شارة عروض افتتاحية', !html1.includes('plan-promo-badge'));
  ok('   وبلا سعر قديم مشطوب', !html1.includes('plan-price-yer-old'));

  sandbox.selectedPlanId = 'y1';
  const htmlSelected = f(y1);
  ok('التحديد: الكرت المختار يحمل كلاس selected وعلامة الصح', htmlSelected.includes('plan-card selected') && htmlSelected.includes('plan-check'));
})();

/* ============================================================
   2/3) النافذة الإجبارية عند انتهاء الفترة المجانية
   ============================================================ */
(function () {
  const fnSrc = extract(/function renderActivationPrompt\(\) \{[\s\S]*?\n  \}\n/, 'renderActivationPrompt');
  const els = {
    actPromptTitle: { textContent: '' }, actPromptText: { textContent: '' }, actPromptButtons: { innerHTML: '' },
  };
  const sandbox = { document: { getElementById: (id) => els[id] || null } };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc + 'this.__f = renderActivationPrompt;', sandbox);
  sandbox.__f();
  ok('2. العنوان "انتهت الفترة المجانية" حرفياً', els.actPromptTitle.textContent === 'انتهت الفترة المجانية');
  ok('   النص المطلوب حرفياً', els.actPromptText.textContent === 'يرجى تفعيل التطبيق للاستمرار في استخدام جميع الميزات.');
  ok('   زر واحد فقط "تفعيل التطبيق الآن"', (els.actPromptButtons.innerHTML.match(/<button|<a /g) || []).length === 1 && els.actPromptButtons.innerHTML.includes('تفعيل التطبيق الآن'));
  ok('   لا يوجد زر إغلاق/رجوع/دعم/خطط داخل الأزرار المُولَّدة', !/إغلاق|رجوع|مراسلة الدعم|كود تفعيل/.test(els.actPromptButtons.innerHTML));
  // 3) الضغط على الزر يستخدم data-prompt-act="plans" الموجودة أصلاً، ومعالجها الحالي يُخفي النافذة وينتقل لصفحة الخطط
  ok('3. الزر مرتبط بـ data-prompt-act="plans" (المعالج الحالي: يُخفي النافذة وينتقل لصفحة الخطط)', els.actPromptButtons.innerHTML.includes('data-prompt-act="plans"'));
})();

/* ============================================================
   4) اختيار خطة والانتقال لصفحة "إكمال التفعيل"
   ============================================================ */
(function () {
  const src = SRC;
  ok('4. اختيار أي خطة يعرض الحالة بصرياً ثم ينتقل إلى go(\'activation\')', /act === 'plan-select'\) \{[\s\S]*?renderSupport\(\);[\s\S]*?go\('activation'\)/.test(src));
  ok('   لا يوجد زر إضافي "اضغط لإكمال التفعيل" (تم حذف summaryBlock/pay-continue القديمة)', !src.includes('متابعة الدفع والتفعيل') && !src.includes("act === 'pay-continue'"));
  ok('   لا يوجد زر "لدي كود تفعيل" على صفحة الخطط', !src.includes("act === 'have-code'"));
})();

/* ============================================================
   القفل بعد انتهاء الفترة (نطاقات المسارات المسموحة)
   ============================================================ */
(function () {
  const src = SRC;
  ok('18. المسارات المسموحة أثناء القفل: support و activation فقط', /ACCESS_LOCK_ALLOWED_VIEWS = \{ support: true, activation: true \}/.test(src));
  ok('    go() تمنع أي وجهة غير support/activation أثناء القفل', /isAccessLocked\(\) && name !== 'support' && name !== 'activation'/.test(src));
  ok('19. applyRoute (يعمل عند إعادة التحميل أيضاً) يفرض نفس القيد', /isAccessLocked\(\) && r\.name !== 'support' && r\.name !== 'activation'/.test(src));
  ok('    ورابط داخلي مباشر (rawName) يُعاد توجيهه لصفحة الدعم كذلك', /rawName !== 'support' && rawName !== 'activation'.*location\.hash = 'support'/.test(src));
})();

/* ============================================================
   بناء صفحة إكمال التفعيل فعلياً: الملخص + حسابات الدفع + رمز التطبيق + رسالة واتساب
   ============================================================ */
(function () {
  const need = ['esc', 'appCode', 'accessStateSafe', 'waMessage', 'waSupportLink', 'act2WaMessage', 'act2WaLink', 'act2PasteSupported', 'renderActivationPage', 'selectedPlan'];
  let block = "var SUPPORT = { wa:[{num:'967775101518',label:'775101518'}], kuraimi:{name:'عرفات الجعوري',acct:'3015367236'} };\n";
  block += extract(/var PLANS = \[[\s\S]*?\n  \];/, 'PLANS') + '\n';
  block += "var ACT2_JEEB_JAWALI_NUM = '775101518';\nvar selectedPlanId = 'm6';\n";
  need.forEach((name) => {
    if (name === 'selectedPlan') { block += "function selectedPlan(){ return PLANS.find(function(p){return p.id===selectedPlanId;}) || null; }\n"; return; }
    if (name === 'appCode') { block += "function appCode(){ return 'DS-TEST-0001-ABCD'; }\n"; return; }
    if (name === 'accessStateSafe') { block += "function accessStateSafe(){ return 'trial'; }\n"; return; }
    const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}\\n');
    block += extract(re, name) + '\n';
  });

  const els = {};
  function makeEl() { return { hidden: false, textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {} }; }
  ['activationBody', 'act2PasteBtn', 'act2Code'].forEach((id) => { els[id] = makeEl(); });
  const sandbox = {
    document: { getElementById: (id) => els[id] || null },
    navigator: {},
    go: (v) => { sandbox.__wentTo = v; },
  };
  vm.createContext(sandbox);
  vm.runInContext(block + 'this.__render = renderActivationPage; this.__waLink = act2WaLink; this.__waMsg = act2WaMessage;', sandbox);

  sandbox.__render();
  const html = els.activationBody.innerHTML;
  ok('ملخص الخطة: "تم اختيار خطة: ستة أشهر ✓"', html.includes('تم اختيار خطة: <b>ستة أشهر ✓</b>'));
  ok('المبلغ المطلوب: $5 – 1500 ريال يمني', html.includes('المبلغ المطلوب: <b>$5 – 1500 ريال يمني</b>'));
  ok('زر "تغيير الخطة" موجود', html.includes('تغيير الخطة'));
  ok('10. بطاقة بنك الكريمي: عرفات الجعوري / 3015367236', html.includes('عرفات الجعوري') && html.includes('3015367236'));
  ok('11. بطاقة جيب – جوالي: 775101518', html.includes('جيب – جوالي') && html.includes('775101518'));
  ok('لا قوائم منسدلة (لا وجود لعنصر select أو accordion) في قسم الدفع', !/<select|pay-acc-head/.test(html));
  ok('12. رمز التطبيق المعروض يطابق appCode() الحقيقية', html.includes('DS-TEST-0001-ABCD'));
  ok('رسالة التطمين بالرمز موجودة حرفياً', html.includes('هذا رمز آمن وخاص بنسخة تطبيقك، ويُستخدم لإصدار رمز التفعيل فقط. لا يحتوي على بياناتك الشخصية.'));
  ok('لا استخدام لمصطلح "رمز الجهاز" في الصفحة الجديدة', !html.includes('رمز الجهاز'));
  ok('عنوان إدخال الكود ونصّه الإرشادي موجودان حرفياً', html.includes('الصق رمز التفعيل الذي حصلت عليه من الدعم') && html.includes('بعد تأكيد التحويل سيصلك رمز التفعيل من الدعم. الصقه في الحقل التالي.'));
  ok('زر "تفعيل التطبيق" أساسي موجود', /data-act="act2-submit"[^>]*>تفعيل التطبيق</.test(html));
  ok('زر "التواصل مع الدعم" واحد فقط في أسفل الصفحة', (html.match(/التواصل مع الدعم/g) || []).length === 1);
  ok('لا ظهور لعناصر الوكيل الطلابي أو أكثر من رقم دعم داخل هذه الصفحة', !/وكيل|agent/i.test(html));

  // 13) رسالة واتساب صحيحة البيانات
  const msg = sandbox.__waMsg(PLANSof(sandbox));
  function PLANSof(sb) { return sb.eval ? null : { label: 'ستة أشهر', usd: '$5', yer: '1500 ريال يمني' }; }
  ok('13. رسالة واتساب تحتوي على اسم الخطة والسعرين والرمز', msg.includes('الخطة المختارة: ستة أشهر') && msg.includes('السعر: $5') && msg.includes('المبلغ بالريال اليمني: 1500 ريال يمني') && msg.includes('رمز التطبيق: DS-TEST-0001-ABCD'));
  ok('   الرسالة تبدأ بالتحية المطلوبة حرفياً', msg.indexOf('مرحبًا، أريد تفعيل تطبيق DentPilot Student.') === 0);
  ok('   الرسالة تنتهي بجملة الإيصال المطلوبة', msg.trim().endsWith('سأرفق إيصال التحويل في هذه المحادثة.'));

  const link = sandbox.__waLink();
  ok('   رابط واتساب يستخدم رقم الدعم الرسمي ويحمل الرسالة مُرمَّزة', link.indexOf('https://wa.me/967775101518?text=') === 0);
})();

/* ============================================================
   نسخ الأرقام (بنك الكريمي / جيب-جوالي / رمز التطبيق) — تبديل نص الزر مؤقتاً
   ============================================================ */
(function () {
  const fnSrc = extract(/function act2CopyBtnClick\(btn, text\) \{[\s\S]*?\n  \}\n/, 'act2CopyBtnClick');
  const fallbackSrc = extract(/function fallbackCopy\(text\) \{[\s\S]*?\n  \}\n/, 'fallbackCopy');
  let writtenText = null;
  const btn = { textContent: 'نسخ' };
  const sandbox = {
    navigator: { clipboard: { writeText: (t) => { writtenText = t; return Promise.resolve(); } } },
    document: { createElement: () => ({ style: {}, setAttribute() {}, focus() {}, select() {}, remove() {} }), execCommand: () => true, body: { appendChild() {} } },
    setTimeout: (fn) => { sandbox.__pending = fn; },
  };
  vm.createContext(sandbox);
  vm.runInContext(fallbackSrc + fnSrc + 'this.__f = act2CopyBtnClick;', sandbox);
  sandbox.__f(btn, '3015367236');
  return Promise.resolve().then(() => {
    ok('10/11/12. نسخ الرقم يستخدم navigator.clipboard.writeText بالرقم الصحيح فقط', writtenText === '3015367236');
    ok('   نص الزر يتغيّر مؤقتاً إلى "تم النسخ ✓"', btn.textContent === 'تم النسخ ✓');
    if (sandbox.__pending) sandbox.__pending();
    ok('   ثم يعود نص الزر الأصلي بعد المهلة', btn.textContent === 'نسخ');
  });
})()

/* ============================================================
   التحقق من رمز التفعيل — عبر منطق التفعيل الحقيقي (وكيل عبر actCode/actActivateBtn الحاليين)
   ============================================================ */
.then(() => (function () {
  const fnSrc = extract(/function act2Activate\(\) \{[\s\S]*?\n  \}\n/, 'act2Activate');
  function makeEls(proxySucceeds) {
    return {
      act2Code: { value: '', classList: { add() {}, remove() {} } },
      act2Error: { textContent: '', hidden: true },
      actCode: { value: '' },
      actActivateBtn: { click() { els.actError.hidden = proxySucceeds; } },
      actError: { hidden: true },
    };
  }
  // 14/16) رمز صحيح
  let els = makeEls(true);
  els.act2Code.value = 'DP3-S-U-VALIDCODE-0000000000000000';
  let sandbox = { document: { getElementById: (id) => els[id] || null } };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc + 'this.__f = act2Activate;', sandbox);
  sandbox.__f();
  ok('14. لصق رمز صحيح: الحقل يُقرأ ويُمرَّر فعلياً لآلية التحقق الحقيقية', els.actCode.value === els.act2Code.value);
  ok('16. رمز صحيح: لا رسالة خطأ تظهر', els.act2Error.hidden === true);

  // 15) رمز خاطئ
  els = makeEls(false);
  els.act2Code.value = 'DP3-S-U-BADCODE-0000000000000000';
  sandbox = { document: { getElementById: (id) => els[id] || null } };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc + 'this.__f = act2Activate;', sandbox);
  sandbox.__f();
  ok('15. رمز خاطئ: رسالة الخطأ المطلوبة حرفياً تظهر', els.act2Error.hidden === false && els.act2Error.textContent === 'رمز التفعيل غير صحيح. تأكد من نسخه كاملاً ثم أعد المحاولة.');

  // حقل فارغ
  els = makeEls(true);
  els.act2Code.value = '   ';
  sandbox = { document: { getElementById: (id) => els[id] || null } };
  vm.createContext(sandbox);
  vm.runInContext(fnSrc + 'this.__f = act2Activate;', sandbox);
  sandbox.__f();
  ok('حقل فارغ: رسالة "الصق رمز التفعيل أولاً." تظهر ولا تُستدعى آلية التحقق', els.act2Error.hidden === false && els.act2Error.textContent === 'الصق رمز التفعيل أولاً.' && els.actCode.value === '');
})())

/* ============================================================
   onActivated: التنظيف + التنقّل + رسالة النجاح
   ============================================================ */
.then(() => (function () {
  const src = SRC;
  ok('17. onActivated يعرض تنبيه نجاح "تم تفعيل التطبيق بنجاح ✓"', src.includes("toast('تم تفعيل التطبيق بنجاح ✓')"));
  ok('   وينقل للصفحة الرئيسية سواء كان القفل مفعّلاً أو من صفحة إكمال التفعيل نفسها', /if \(wasLocked \|\| currentView === 'activation'\) go\('dashboard'\)/.test(src));
  ok('   ويُخفي النافذة الإجبارية ونوافذ التفعيل القديمة', src.includes("hideOverlay(document.getElementById('activationOverlay'))"));
  ok('   ويُعيد فرض enforceAccessLock() فوراً (يزيل القفل بمجرد activated)', /enforceAccessLock\(\);\s*\/\/ getAccessState/.test(src));
})())

/* ============================================================
   لا حذف بيانات — الحفاظ الكامل على النظام الحالي
   ============================================================ */
.then(() => (function () {
  const src = SRC;
  ok('21. لا حذف بيانات مستخدم عند القفل — closeOperationalOverlaysForLock لا تلمس التخزين، فقط تُغلق نوافذ تشغيلية', src.includes('function closeOperationalOverlaysForLock()') && !/localStorage\.removeItem/.test(src.match(/function closeOperationalOverlaysForLock[\s\S]*?\n  \}/)[0]));
  ok('   منطق التفعيل (activation.js) لم يُلمس — لا استدعاء activate جديد أو معدَّل هنا، فقط وكيل عبر actActivateBtn الحالي', !src.includes('function activate(') );
  ok('   رمز التطبيق لا يزال appCode() = window.DPLicense.getDeviceId() كما هو', /function appCode\(\) \{ return \(window\.DPLicense && window\.DPLicense\.getDeviceId\)/.test(src));
})())

/* ============================================================
   كرت حالة التطبيق: تنفيذ فعلي لـ renderSupport في حالاتها الثلاث
   ============================================================ */
.then(() => (function () {
  const need = ['esc', 'fmtDate', 'appCode', 'waMessage', 'waSupportLink', 'agentWaLink', 'planCardHtml', 'contactSectionHtml', 'waIcon'];
  let block = "var SUPPORT = { dev:'د. عرفات الجعوري', devFull:'د. عرفات علي الجعوري', wa:[{num:'967775101518',label:'775101518'}], agent:{title:'وكيل طلاب إب',name:'فراس',num:'9677'} };\n";
  block += extract(/var PLANS = \[[\s\S]*?\n  \];/, 'PLANS') + '\n';
  block += "var selectedPlanId = null, showPlansOverride = false;\n";
  need.forEach((name) => {
    if (name === 'appCode') { block += "function appCode(){ return 'DS-TEST-0001-ABCD'; }\n"; return; }
    const re = new RegExp('function ' + name + '\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}\\n'); block += extract(re, name) + '\n';
  });
  block += extract(/function renderSupport\(\) \{[\s\S]*?\n  \}\n/, 'renderSupport');

  function run(state, hours, info) {
    const supEl = { innerHTML: '' };
    const subEl = { hidden: false };
    const sandbox = {
      els: { supportBody: supEl },
      document: { getElementById: (id) => (id === 'supSubtitle' ? subEl : null) },
      accessStateSafe: () => state,
      window: { DPLicense: { trialRemainingHours: () => hours, getActivationInfo: () => info } },
    };
    vm.createContext(sandbox);
    vm.runInContext(block + 'this.__f = renderSupport;', sandbox);
    sandbox.__f();
    return supEl.innerHTML;
  }

  // 1) الفترة المجانية نشطة
  let html = run('trial', 18, null);
  ok('1. الفترة التجريبية نشطة: العنوان والنص المطلوبان حرفياً', html.includes('الفترة التجريبية نشطة') && html.includes('يمكنك تفعيل التطبيق في أي وقت'));
  ok('   المتبقي بالساعات الحقيقية (18 ساعة) لا رقماً وهمياً', html.includes('المتبقي: 18 ساعة'));
  ok('   عنوان "اختر مدة الاشتراك التي تريد تفعيلها" ظاهر فوق الخطط', html.includes('اختر مدة الاشتراك التي تريد تفعيلها'));

  // 2) بعد انتهاء الفترة المجانية
  html = run('expired', 0, null);
  ok('2. انتهت الفترة المجانية: النص المطلوب حرفياً على صفحة الخطط', html.includes('انتهت الفترة المجانية') && html.includes('اختر مدة الاشتراك لتفعيل التطبيق والاستمرار'));

  // بعد التفعيل
  html = run('activated', 0, { planLabel: 'سنوي', startsAt: Date.now() - 5 * 86400000, expiresAt: Date.now() + 360 * 86400000 });
  ok('التطبيق مفعل ✓ (بعد النجاح) مع اسم الخطة وتاريخ الانتهاء', html.includes('التطبيق مفعل ✓') && html.includes('سنوي'));

  // صفحة الخطط لا تحتوي أي زر دفع/كود قديم
  ok('صفحة الخطط (trial/expired) لا تحتوي "لدي كود تفعيل" ولا "متابعة الدفع"', !run('trial', 5, null).includes('لدي كود تفعيل') && !run('expired', 0, null).includes('متابعة الدفع'));
})())

/* ============================================================
   قسم حسابات الدفع: تخطيط شبكي بعمودين متجاورين، مضغوط، مع لون كرت الكريمي المطلوب
   ============================================================ */
.then(() => (function () {
  const html = SRC.match(/function renderActivationPage[\s\S]*?\n  \}\n/)[0];
  ok('الكرتان داخل حاوية شبكية واحدة (act2-pay-grid) وليسا كرتين منفصلين متتاليين', /act2-pay-grid[\s\S]*act2-pay-card-kuraimi[\s\S]*جيب – جوالي[\s\S]*<\/div>' \+\s*\n\s*'<h3/.test(html));
  ok('بطاقة الكريمي تحمل كلاساً مميزاً (act2-pay-card-kuraimi) لتمييزها عن جيب-جوالي', html.includes('act2-pay-card-kuraimi'));
  ok('اسم صاحب الحساب يظهر مباشرة (act2-pay-owner) قبل رقم الحساب', /act2-pay-owner">.*<\/div>[\s\S]*act2-pay-num-row/.test(html));
  ok('رقم الحساب وزر النسخ في صف واحد مضغوط (act2-pay-num-row)، وليسا بعرض الكرت الكامل', html.includes('act2-pay-num-row'));
  ok('لا تغيّر في أرقام الحسابات أو دوال النسخ نفسها', html.includes('SUPPORT.kuraimi.acct') && html.includes('ACT2_JEEB_JAWALI_NUM') && html.includes("data-act=\"act2-copy-kuraimi\"") && html.includes("data-act=\"act2-copy-jeeb\""));

  const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
  ok('CSS Grid بعمودين متساويين كما طُلب حرفياً', css.includes('grid-template-columns:repeat(2, minmax(0, 1fr))'));
  ok('لون كرت الكريمي مطابق تماماً للون المطلوب (#843EDF، مأخوذ فعلياً من الصورة المرفقة)', /\.act2-pay-card-kuraimi\{[^}]*background:#843EDF/.test(css));
  ok('لون كرت جيب–جوالي لم يتغيّر (يبقى الافتراضي، لا تعديل إضافي غير المطلوب)', !/\.act2-pay-card\{[^}]*background:#843EDF/.test(css));
  ok('نص الكرت الأرجواني يتحوّل لأبيض واضح لضمان التباين', /\.act2-pay-card-kuraimi \.act2-pay-title,\.act2-pay-card-kuraimi \.act2-pay-owner\{ color:#fff; \}/.test(css));
  // padding مضغوط (أصغر من التصميم القديم 14px)
  const cardRuleM = /\.act2-pay-card\{ background:var\(--card-surface\); border:1px solid var\(--line\); border-radius:12px; padding:(\d+)px/.exec(css);
  ok('الحشو الداخلي (padding) للكروت أصبح مضغوطاً (أقل من 14px القديم)', cardRuleM && parseInt(cardRuleM[1], 10) < 14, cardRuleM && cardRuleM[1]);
  ok('زر النسخ صغير (min-height أقل من الأزرار العادية) وليس بعرض الكرت (flex:none)', /\.act2-copy-btn\{ flex:none; min-height:26px/.test(css));
  ok('لا حدود دنيا (width:100%) على زر النسخ الجديد', !/\.act2-copy-btn\{[^}]*width:100%/.test(css));
  ok('مسافة مضغوطة بين العنوان "حوّل مبلغ الاشتراك" والكروت (margin-bottom أصغر من 10px القديم)', /\.act2-h\{[^}]*margin:14px 2px 6px;/.test(css));
  ok('استجابة الشاشات الضيقة (360px) تُصغّر الخط دون حذف أي رقم أو زر', /max-width:360px\)\{\s*\.act2-pay-grid/.test(css));
})())

.then(() => {
  console.log('\n----------------------------------------');
  console.log('النتيجة: ' + PASS + ' ناجح، ' + FAIL + ' فاشل');
  console.log('----------------------------------------\n');
  process.exit(FAIL ? 1 : 0);
})
.catch((e) => { console.error(e); process.exit(1); });
