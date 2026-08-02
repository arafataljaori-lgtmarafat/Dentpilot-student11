/* ============================================================
   DentPilot Student — دينت بايلوت للطلاب
   متابِع الحالات السريرية لطلاب كلية الأسنان
   التخزين محلي بمفاتيح مستقلة عن نسخة Pro.
   ============================================================ */
(function () {
  'use strict';

  var CASES_KEY = 'dentpilot_student_cases_v1';
  var SETTINGS_KEY = 'dentpilot_student_settings_v1';
  var REQS_KEY = 'dentpilot_student_requirements_v1';
  var ATT_KEY = 'dentpilot_student_attachments_v1';
  var ADMIN_KEY = 'dentpilot_student_admin_config_v1';
  var CUSTOM_REQS_KEY = 'dentpilot_student_custom_reqs_v1';   // مواد/متطلبات إضافية يضيفها الطالب بنفسه (منفصلة عن قائمة إضافة الحالة)
  var CASESHEETS_KEY = 'dentpilot_student_casesheets_v1';     // كاسشيتات التسليم (نموذج مستقل تماماً عن نظام الحالات)
  var APP_VERSION = '1.16.1';

  // كل مادة: value = القيمة المخزّنة (ثابتة)، label = النص المعروض، desc = وصف صغير اختياري
  var DEPT_DEFS = [
    { value: 'Operative', label: 'Operative', desc: 'حشوات وترميمات' },
    { value: 'Endo', label: 'Endo', desc: 'علاج عصب' },
    { value: 'تنظيف', label: 'تنظيف' },
    { value: 'تقويم', label: 'تقويم' },
    { value: 'جراحة', label: 'جراحة' },
    { value: 'مراجعة', label: 'مراجعة' },
    { value: 'أخرى', label: 'أخرى' }
  ];
  var DEPTS = DEPT_DEFS.map(function (d) { return d.value; });
  // ترحيل الأسماء القديمة إلى القيم الجديدة دون فقدان أي حالة
  var DEPT_MIGRATE = { 'حشوات': 'Operative', 'عصب': 'Endo' };
  function deptLabel(v) { for (var i = 0; i < DEPT_DEFS.length; i++) { if (DEPT_DEFS[i].value === v) { return (appLang === 'en' && DEPT_LABELS_EN[DEPT_DEFS[i].label]) ? DEPT_LABELS_EN[DEPT_DEFS[i].label] : DEPT_DEFS[i].label; } } return v; }
  var MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WEEKDAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']; // getDay(): 0..6
  var WEEKDAYS_EN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var WEEKDAYS_SHORT = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت'];
  var WEEKDAYS_SHORT_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  var STATUSES = ['قيد الانتظار', 'قيد العمل', 'مكتملة', 'تحتاج مراجعة', 'ملغاة'];
  var VIEWS = ['dashboard', 'all', 'appointments', 'patients', 'patient', 'reqs', 'completed', 'bysubject', 'subject', 'backup', 'settings', 'support', 'file', 'universities', 'uniEmpty', 'casesheets', 'csform', 'account'];

  /* ============================================================
     لغة الواجهة (عربي افتراضي / إنجليزي اختياري) — عرض فقط، لا تمسّ البيانات إطلاقاً
     المبدأ: T('نص عربي ثابت') تُعيد المكافئ الإنجليزي عند تفعيل appLang='en'، وإلا تُعيد
     النص العربي كما هو حرفياً. لا يُستخدم T() أبداً حول بيانات كتبها الطالب (اسم/هاتف/ملاحظات).
     ============================================================ */
  var LANG_KEY = 'dentpilot_student_lang_v1';
  var appLang = 'ar';
  try { appLang = (localStorage.getItem(LANG_KEY) === 'en') ? 'en' : 'ar'; } catch (e) {}
  var DEPT_LABELS_EN = { 'تنظيف': 'Cleaning', 'تقويم': 'Orthodontics', 'جراحة': 'Surgery', 'مراجعة': 'Follow-up', 'أخرى': 'Other' };
  var I18N_EN = {
    "أدخل بياناتك لتخصيص التطبيق — يمكنك تعديلها لاحقاً في أي وقت من الإعدادات.": "Enter your details to personalize the app — you can edit them anytime later from Settings.",
    "اختر التخصص السريري": "Select Clinical Specialty",
    "القائمة": "Menu",
    "الموعد": "Appointment",
    "بيانات المريض": "Patient Data",
    "تخصصات أخرى": "Other specialties",
    "تركيبات ثابتة ومتحركة": "Fixed & removable prosthodontics",
    "تقويم أسنان": "Orthodontics",
    "حشوات تحفظية": "Restorative fillings",
    "حفظ الجلسة": "Save Session",
    "حفظ ومتابعة": "Save & Continue",
    "طب أسنان أطفال": "Pediatric dentistry",
    "علاج دواعم ولثة": "Periodontal treatment",
    "علاج عصب وجذور": "Root canal treatment",
    "قلع وجراحة": "Extraction & surgery",
    "لاحقاً": "Later",
    "+ إضافة حالة": "+ Add Case",
    "+ إضافة مادة": "+ Add Subject",
    "آخر موعد": "Last appointment",
    "أخرى": "Other",
    "أدخل العدد المطلوب لكل قسم، ويُحسب المكتمل تلقائياً من الحالات ذات الحالة «مكتملة».": "Enter the required count for each subject; completed count is calculated automatically from cases marked \"Completed\".",
    "أسبوعك السريري": "Your Clinical Week",
    "أنت على أحدث إصدار": "You're on the latest version",
    "أية ملاحظات أخرى...": "Any other notes...",
    "إجمالي": "Total",
    "إرجاع": "Restore",
    "إرجاع إلى الحالات الحالية": "Restore to current cases",
    "إرجاع الحالة": "Restore Case",
    "إضافة جلسة": "Add Session",
    "إضافة حالة": "Add Case",
    "إضافة حالة جديدة": "Add New Case",
    "إضافة كاسشيت": "Add Casesheet",
    "إضافة مرفق": "Add Attachment",
    "إغلاق": "Close",
    "إلغاء": "Cancel",
    "إلى الحالات الحالية؟": "to current cases?",
    "إنهاء": "Complete",
    "إنهاء الحالة": "Complete Case",
    "اتصال": "Call",
    "احفظ نسخة من حالاتك وإعداداتك ومتطلباتك ومرفقاتك في ملف، أو استعدها لاحقاً. تبقى البيانات محلية على جهازك، ومنفصلة تماماً عن أي نسخة أخرى.": "Save a copy of your cases, settings, requirements, and attachments to a file, or restore them later. Data stays local on your device, separate from any other copy.",
    "اختر التخصص": "Choose specialty",
    "اختر مادة لعرض حالاتها فقط.": "Choose a subject to view only its cases.",
    "اسم التخصص (مخصّص)": "Specialty name (custom)",
    "اسم الطالب": "Student Name",
    "اسم القناة (مخصّص)": "Canal name (custom)",
    "اسم الكلية": "College Name",
    "اسم المادة أو المتطلب (مثال: أطفال)": "Subject or requirement name (e.g. Pediatric)",
    "اسم المريض": "Patient Name",
    "اضغط «إضافة حالة» لتسجيل أول حالة.": "Tap \"Add Case\" to log your first case.",
    "اضغط على ⋮ أعلى المتصفح ثم اختر «إضافة إلى الشاشة الرئيسية»": "Tap ⋮ at the top of the browser, then choose \"Add to Home Screen\"",
    "اكتب اسم القناة": "Type canal name",
    "اكتب اسمك": "Type your name",
    "اكتب ملاحظات عامة عن الحالة…": "Write general notes about the case…",
    "الأكثر عملاً": "Most worked on",
    "الإجراء المنجَز": "Procedure Done",
    "الإصدار الحالي:": "Current version:",
    "الإعدادات": "Settings",
    "الاسم": "Name",
    "التاريخ": "Date",
    "التحديث غير متاح في هذا السياق.": "Update check is not available in this context.",
    "التحقق من التحديثات": "Check for Updates",
    "التطبيق مثبت على الشاشة الرئيسية": "App is installed on the Home Screen",
    "الجدول والمواعيد": "Schedule & Appointments",
    "الجلسات": "Sessions",
    "الحالات": "Cases",
    "الحالات حسب المادة": "Cases by Subject",
    "الحالات ذات الحالة «مكتملة» تُؤرشَف هنا ولا تظهر في القوائم الحالية. بياناتها محفوظة كاملة، وتظل محسوبة ضمن متطلبات الكلية.": "Cases marked \"Completed\" are archived here and don’t appear in current lists. Their data stays fully saved and still counts toward college requirements.",
    "الحالة": "Status",
    "الحالة:": "Status:",
    "الحساب": "Account",
    "الرئيسية": "Home",
    "السن المعالَج": "Tooth Treated",
    "الفترة التجريبية المجانية — متبقٍ من التجربة:": "Free trial period — time remaining:",
    "القادم": "Next",
    "لا توجد حالات ضمن هذا المرشّح.": "No cases in this filter.",
    "جرّب مرشّحاً آخر.": "Try a different filter.",
    "تثبيت التطبيق": "Install App",
    "لا توجد مواعيد للغد": "No appointments tomorrow",
    "لا داعي للقلق — لا مواعيد مجدولة للغد بعد.": "No worries — no appointments scheduled for tomorrow yet.",
    "موعد متابعة الحالة السريرية": "Clinical case follow-up appointment",
    "موعد الحالة السريرية": "Clinical case appointment",
    "القسم": "Department",
    "الدعم والتفعيل": "Support & Activation",
    "الكاسشيتات": "Casesheets",
    "الكلية": "College",
    "اللغة": "Language",
    "المادة / القسم": "Subject / Department",
    "المتبقي": "Remaining",
    "المجتمعات": "Community",
    "المرفقات": "Attachments",
    "المستوى الدراسي": "Academic Level",
    "المكتمل": "Completed",
    "المكتملة": "Completed",
    "المواعيد": "Appointments",
    "الموعد القادم": "Next appointment",
    "النسخة الاحتياطية": "Backup",
    "الهاتف": "Phone",
    "الوقت": "Time",
    "الوقت غير محدد": "Time not set",
    "اليوم": "Day",
    "اليوم المخصّص": "Assigned Day",
    "اليوم والغد": "Today & Tomorrow",
    "انتهت الفترة التجريبية": "Trial period has ended",
    "بحث بالاسم أو الهاتف أو القسم أو نوع الحالة…": "Search by name, phone, department, or case type…",
    "بحث بالاسم أو رقم الهاتف…": "Search by name or phone number…",
    "بدون يوم محدد": "No day set",
    "بيانات الحالة": "Case Data",
    "تأكيد": "Confirm",
    "تاريخ الموعد": "Appointment Date",
    "تثبيت التطبيق على الشاشة الرئيسية": "Install App on Home Screen",
    "تعديل": "Edit",
    "تعديل الجلسة": "Edit Session",
    "تعديل الحالة": "Edit Case",
    "تعديل بيانات الطالب": "Edit Student Info",
    "تعذر تجهيز ملف الطباعة. حاول مرة أخرى.": "Could not prepare the print file. Try again.",
    "تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.": "Could not open this attachment. Try adding it again.",
    "تعذّر الاستيراد — تأكد أنه ملف DentPilot Student صحيح": "Import failed — make sure it’s a valid DentPilot Student file",
    "تعذّر التحقق (لا يوجد اتصال؟).": "Could not check (no connection?).",
    "تعيين حالة": "Set case",
    "تم إرجاع الحالة إلى الحالات الحالية": "Case restored to current cases",
    "تم إضافة المرفقات": "Attachments added",
    "تم إنهاء الحالة": "Case completed",
    "تم استيراد النسخة الاحتياطية": "Backup imported",
    "تم تحديث الجلسة": "Session updated",
    "تم تحديث الحالة": "Case updated",
    "تم تصدير النسخة الاحتياطية": "Backup exported",
    "تم حذف الجلسة": "Session deleted",
    "تم حذف الحالة": "Case deleted",
    "تم حذف المرفق": "Attachment deleted",
    "تم حفظ الملاحظات": "Notes saved",
    "تم حفظ بيانات الطالب": "Student info saved",
    "تمت إضافة": "Added",
    "تمت إضافة الجلسة": "Session added",
    "تمت إضافة الحالة": "Case added",
    "تمت إضافة المرفق": "Attachment added",
    "جارٍ التحقق…": "Checking…",
    "جرّب بحثاً آخر.": "Try a different search.",
    "جلسة": "Session",
    "جميع الحالات": "All Cases",
    "جميع المرضى": "All Patients",
    "حالات": "cases",
    "حالات اليوم / الغد": "Today's / Tomorrow's Cases",
    "حالة الإنجاز": "Completion Status",
    "حالة الجلسة": "Session Status",
    "حذف": "Delete",
    "حذف الجلسة": "Delete Session",
    "حذف الحالة": "Delete Case",
    "حذف القناة": "Delete Canal",
    "حذف المادة": "Delete Subject",
    "حذف المرفق": "Delete Attachment",
    "حفظ": "Save",
    "حفظ الملاحظات": "Save Notes",
    "دينت بايلوت للطلاب": "DentPilot Student",
    "رجوع": "Back",
    "رقم الجلسة": "Session Number",
    "رقم السن": "Tooth Number",
    "رقم الملف": "File No.",
    "رقم الهاتف": "Phone Number",
    "رمز التطبيق الخاص بهذا الهاتف:": "This device’s app code:",
    "ساعة": "hours",
    "ساعة.": "hours.",
    "سجّل الحالة والموعد والمتابعة": "Log the case, appointment, and follow-up",
    "سيُطبَّق عند إعادة فتح التطبيق.": "It will apply next time you open the app.",
    "صورة": "Image",
    "طالب طب الأسنان": "Dental Student",
    "طباعة": "Print",
    "عرض الحالات": "View Cases",
    "عرض الحالة": "View Case",
    "عرض الكل": "View All",
    "عرض الملفات": "View Files",
    "عرض حالة": "View case",
    "عرض ملفات": "View files of",
    "عند تعيين حالة كـ «مكتملة» ستظهر هنا.": "When a case is marked \"Completed\" it will appear here.",
    "غداً": "tomorrow",
    "فتح القائمة": "Open Menu",
    "فتح حالة": "Open case",
    "فتح صفحة الدعم والتفعيل": "Open Support & Activation Page",
    "فترة تجريبية — المتبقي:": "Trial period — remaining:",
    "قريب": "Soon",
    "قريبة": "upcoming",
    "قناة": "Canal",
    "كمكتملة؟ يمكنك إرجاعها لاحقاً من قسم الحالات المكتملة.": "as completed? You can restore it later from the Completed Cases section.",
    "لا توجد جلسات بعد.": "No sessions yet.",
    "لا توجد حالات بعد.": "No cases yet.",
    "لا توجد حالات في هذه المادة.": "No cases in this subject.",
    "لا توجد حالات مكتملة بعد.": "No completed cases yet.",
    "لا توجد قنوات بعد. اضغط «+ إضافة قناة».": "No canals yet. Tap \"+ Add Canal\".",
    "لا توجد متطلبات ناقصة حالياً": "No missing requirements right now",
    "لا توجد مرفقات. أضف صوراً/أشعة/مستندات للحالة.": "No attachments. Add photos/X-rays/documents for the case.",
    "لا توجد مواعيد اليوم": "No appointments today",
    "لا توجد نتائج.": "No results.",
    "لا يوجد مرضى بعد.": "No patients yet.",
    "لا يوجد موعد محدد": "No appointment set",
    "ما تم في الجلسة": "What was done in the session",
    "متابعتك السريرية والأكاديمية": "Your clinical & academic tracker",
    "متابِع الحالات السريرية": "Clinical Case Tracker",
    "متبقٍ": "remaining",
    "متطلبات الكلية": "College Requirements",
    "مثال: 36": "e.g. 36",
    "مثال: السنة الخامسة": "e.g. 5th Year",
    "مثال: كلية طب وجراحة الفم والأسنان": "e.g. Faculty of Dentistry",
    "مجدولة": "Scheduled",
    "مدى الحياة": "Lifetime",
    "مرحباً بك في DentPilot": "Welcome to DentPilot",
    "مرفق": "Attachment",
    "مستند": "Document",
    "معاينة المرفق": "Attachment Preview",
    "مفعل": "Activated",
    "مكتملة": "Completed",
    "ملاحظات الجلسة": "Session Notes",
    "ملاحظات الحالة": "Case Notes",
    "ملاحظات عامة": "General Notes",
    "ملغاة": "Cancelled",
    "ملف": "File",
    "من المتطلبات؟": "from requirements?",
    "منجزة": "Done",
    "مواعيد الغد": "Tomorrow's Appointments",
    "مواعيد اليوم": "Today's Appointments",
    "مواعيد اليوم والغد": "Today's & Tomorrow's Appointments",
    "نسبة الإنجاز الإجمالية": "Overall completion rate",
    "نص عربي ثابت": "Fixed Arabic text",
    "نظرة سريعة": "Quick Overview",
    "نوع الحالة": "Case Type",
    "هذا المرفق قديم ولا يحتوي على بيانات كافية للفتح.": "This attachment is old and doesn’t have enough data to open.",
    "هذه المادة موجودة بالفعل": "This subject already exists",
    "هل تريد حذف مادة": "Delete subject",
    "هل تريد حذف هذا المرفق؟": "Delete this attachment?",
    "هل تريد حذف هذه الجلسة؟": "Delete this session?",
    "هل تريد حذف هذه الحالة؟": "Delete this case?",
    "واتساب": "WhatsApp",
    "وقت الموعد": "Appointment Time",
    "يتوفّر تحديث": "Update available",
    "يتوفّر تحديث جديد.": "A new update is available.",
    "يمكنك إضافة حالة جديدة بموعد اليوم.": "You can add a new case with today's appointment.",
    "يمكنك تثبيت التطبيق على شاشتك الرئيسية لفتحه بسرعة كتطبيق مستقل.": "You can install the app on your home screen to open it quickly as a standalone app.",
    "ينتهي في": "expires on",
    "⚙️ الإعدادات": "⚙️ Settings",
    "⚙️ التفضيلات": "⚙️ Preferences",
    "✅ الحالات المكتملة": "✅ Completed Cases",
    "✏️ تعديل بيانات الطالب": "✏️ Edit Student Info",
    "⬆ استعادة نسخة احتياطية": "⬆ Restore Backup",
    "⬇ تصدير نسخة احتياطية": "⬇ Export Backup",
    "👤 بيانات الطالب": "👤 Student Info",
    "💾 نسخة احتياطية": "💾 Backup",
    "📅 مواعيد اليوم والغد": "📅 Today's & Tomorrow's Appointments",
    "📋 متطلبات الكلية": "📋 College Requirements",
    "📚 الحالات حسب المادة": "📚 Cases by Subject",
    "📲 تثبيت التطبيق": "📲 Install App",
    "🔄 التحديثات": "🔄 Updates",
    "🛟 الدعم": "🛟 Support"
  };   // مفردات الواجهة الثابتة (المفتاح: النص العربي الأصلي كما يظهر في الكود)
  function T(s) { if (appLang !== 'en' || !s) return s; return Object.prototype.hasOwnProperty.call(I18N_EN, s) ? I18N_EN[s] : s; }
  function applyLanguageBase() {
    var isEn = appLang === 'en';
    document.documentElement.setAttribute('dir', isEn ? 'ltr' : 'rtl');
    document.documentElement.setAttribute('lang', isEn ? 'en' : 'ar');
    document.body.classList.toggle('dp-lang-en', isEn);
    document.title = isEn ? 'DentPilot Student' : 'دينت بايلوت للطلاب — DentPilot Student';
    translateStaticDom();
  }
  function translateStaticDom() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = T(el.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', T(el.getAttribute('data-i18n-ph'))); });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', T(el.getAttribute('data-i18n-aria'))); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.setAttribute('title', T(el.getAttribute('data-i18n-title'))); });
  }
  function setAppLang(lang) {
    appLang = (lang === 'en') ? 'en' : 'ar';
    try { localStorage.setItem(LANG_KEY, appLang); } catch (e) {}
    applyLanguageBase();
    if (typeof updateCounts === 'function') updateCounts();
    if (typeof renderActiveView === 'function') renderActiveView();
    if (typeof updateTrialBanner === 'function') updateTrialBanner();
    ensureLangBox();
  }
  function langBoxHtml() {
    return '<div class="lang-box" id="dpLangBox">' +
      '<div class="lang-box-title">' + T('اللغة') + '</div>' +
      '<div class="lang-box-options">' +
        '<button type="button" class="lang-opt' + (appLang === 'ar' ? ' lang-opt-active' : '') + '" data-lang="ar">العربية</button>' +
        '<button type="button" class="lang-opt' + (appLang === 'en' ? ' lang-opt-active' : '') + '" data-lang="en">English</button>' +
      '</div>' +
    '</div>';
  }
  function ensureLangBox() {
    var root = document.getElementById('view-account');
    if (!root) return;
    var existing = root.querySelector('#dpLangBox');
    var wrap = document.createElement('div');
    wrap.innerHTML = langBoxHtml();
    var fresh = wrap.firstChild;
    if (existing) existing.replaceWith(fresh); else root.insertBefore(fresh, root.firstChild);
    fresh.querySelectorAll('[data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () { setAppLang(btn.getAttribute('data-lang')); });
    });
  }
  (function watchAccountView() {
    var root = document.getElementById('view-account');
    if (!root || typeof MutationObserver === 'undefined') return;
    new MutationObserver(function () { if (!root.querySelector('#dpLangBox')) ensureLangBox(); }).observe(root, { childList: true });
  })();

  var $ = function (id) { return document.getElementById(id); };
  var els = {};
  ['backBtn','menuBtn','installBanner','dcAll','dcReqsRing','dcReqsVal','allSearch','allList','allEmpty',
   'reqsList','reqAddBtn','reqAddForm','reqNewName','completedList','completedEmpty','bySubjectList','bySubjectEmpty','subjectTitle','subjectList','subjectEmpty','exportBtn','importBtn','importFile','setNameDisplay','setLevelDisplay','setCollegeDisplay','editStudentBtn','scheduleEditor','saveSettingsBtn','clinicalInsights','setDeviceId',
   'studentSetupOverlay','studentSetupTitle','studentSetupForm','studentSetupSkip','setupName','setupLevel','setupCollege',
   'heroGreet','heroName','heroMeta','heroBadgeTotal','heroBadgeDone','calStrip','calNote','dcTodayTomorrow','todayList','todayEmpty',
   'drawerOverlay','sideDrawer','drawerCloseBtn','drawerName','drawerLevel','drawerAvatar',
   'attViewOverlay','attViewImg','attViewTitle','attViewClose','attViewCloseBtn','attViewTab',
   'caseOverlay','caseForm','caseTitle','caseClose','caseCancel','caseId','cName','cPhone','cDept','cDeptBtn','cToothWrap','cType','cTooth','cDay','cDate','cWeekday','cTime','cStatus','cNotes',
   'deptOverlay','deptClose',
   'cDeptOtherWrap','cDeptOther',
   'opDetails','opClass','opMaterial','opSurface','opAnesthesia',
   'endoDetails','endoVisit','endoDiagnosis','endoPeriapical','endoAnesthesia','endoCanalsList',
   'orthoDetails','orthoVisit','orthoAppliance','orthoDevice',
   'cleaningDetails','cleanProc','cleanGingival','cleanBpe',
   'surgDetails','surgProc','surgAnesthesia','surgPostOp',
   'pedoDetails','pedoTreat','pedoBehavior','pedoAge',
   'prosthoDetails','prosthoType','prosthoVisit','prosthoMaterial','prosthoShade',
   'sessionOverlay','sessionForm','sessionTitle','sessionClose','sessionCancel','sCaseId','sId','sNum','sDate','sTime','sProc','sNext','sNotes','sStatus',
   'confirmOverlay','confirmTitle','confirmText','confirmOk','confirmCancel','toast','splash','fileBody',
   'trialBanner','trialText','accessStatus','supportBody',
   'updateOverlay','updateNowBtn','updateLaterBtn','appVersion','checkUpdateBtn','updateStatus',
   'setInstallBtn','setInstallStatus',
   'csTemplates','csTitle','csFormBody','dashBottomBar',
   'uniList','uniEmptyTitle','uniEmptyBody',
   'allTitle','allFilterBar',
   'apptToggle','apptList','apptEmpty',
   'patientsTitle','patientsSearch','patientsList','patientsEmpty',
   'patientTitle','patientSub','patientCasesList'
  ].forEach(function (k) { els[k] = $(k); });

  var cases = [], settings = { studentName: '', level: '', college: '', schedule: {} }, requirements = {}, attachments = {}, customReqs = [], casesheets = [];
  var currentCsId = null, currentCsPhotos = {}, currentCsTemplate = 'jazeera-oral-surgery';   // حالة نموذج الكاسشيت المفتوح حالياً (غير محفوظة بعد إن كانت جديدة)
  var adminConfig = {};
  var currentView = 'dashboard', currentParam = '', fileOrigin = 'all', pendingConfirm = null, deferredPrompt = null, toastTimer = null;

  /* ---------- storage ---------- */
  function jget(k, d) { try { var r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } }
  function loadAll() {
    cases = jget(CASES_KEY, []); if (!Array.isArray(cases)) cases = [];
    settings = Object.assign({ studentName: '', level: '', college: '', schedule: {} }, jget(SETTINGS_KEY, {}));
    if (!settings.schedule) settings.schedule = {};
    requirements = jget(REQS_KEY, {}) || {};
    attachments = jget(ATT_KEY, {}) || {};
    customReqs = jget(CUSTOM_REQS_KEY, []); if (!Array.isArray(customReqs)) customReqs = [];
    casesheets = jget(CASESHEETS_KEY, []); if (!Array.isArray(casesheets)) casesheets = [];
    loadAdminConfig();
    normalizeCases();
  }
  function normalizeCases() {
    var changed = false, changedIds = [];
    cases.forEach(function (c) {
      if (!Array.isArray(c.sessions)) c.sessions = [];
      if (typeof c.apptDate !== 'string') c.apptDate = '';   // ترحيل: حقل تاريخ الموعد الجديد
      if (typeof c.day !== 'string') c.day = c.day || '';
      // ترحيل أسماء المواد القديمة إلى القيم الجديدة (دون فقدان أي حالة أو أي بيانات أخرى)
      if (c.department && DEPT_MIGRATE[c.department]) { c.department = DEPT_MIGRATE[c.department]; changed = true; if (c.id) changedIds.push(c.id); }
      // ترحيل: تعيين تاريخ الأرشفة للحالات المكتملة القديمة دون حذف أو تغيير أي بيانات أخرى
      if (c.status === 'مكتملة' && !c.completedAt) c.completedAt = c.createdAt || '';
    });
    if (changed) {
      try { saveCases(); } catch (e) {}   // ثبّت ترحيل أسماء المواد في التخزين مرة واحدة
      if (window.DPSync) changedIds.forEach(function (id) { window.DPSync.markCaseDirty(id); });
    }
  }
  function saveCases() { try { localStorage.setItem(CASES_KEY, JSON.stringify(cases)); } catch (e) { alert('تعذّر الحفظ — قد تكون المساحة ممتلئة.'); } }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }
  function saveReqs() { try { localStorage.setItem(REQS_KEY, JSON.stringify(requirements)); } catch (e) {} }
  function saveCustomReqs() { try { localStorage.setItem(CUSTOM_REQS_KEY, JSON.stringify(customReqs)); } catch (e) {} }
  function saveCasesheets() { try { localStorage.setItem(CASESHEETS_KEY, JSON.stringify(casesheets)); } catch (e) { alert('تعذّر الحفظ — قد تكون المساحة ممتلئة.'); } }
  function saveAtt() { localStorage.setItem(ATT_KEY, JSON.stringify(attachments)); }

  /* ---------- helpers ---------- */
  function uid() { return 'c_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function sid(p) { return p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function toNum(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function v(k) { return (els[k] && els[k].value) ? els[k].value.trim() : ''; }
  function phoneDigits(p) { return String(p || '').replace(/\D/g, ''); }
  function initial(n) { n = (n || '').trim(); return n ? n[0] : 'ح'; }
  function fmtDate(s) { if (!s) return '—'; var d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  function fmtDT(s) { if (!s) return '—'; var d = new Date(s); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-EG', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); }
  function parseDateLocal(s) { if (!s) return null; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s)); var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(s); return isNaN(d.getTime()) ? null : d; }
  function weekday(s) { var d = parseDateLocal(s); return d ? (appLang === 'en' ? WEEKDAYS_EN : WEEKDAYS_AR)[d.getDay()] : ''; }
  function longDateAr(s) { var d = parseDateLocal(s); if (!d) return ''; return appLang === 'en' ? (MONTHS_EN[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear()) : (d.getDate() + ' ' + MONTHS_AR[d.getMonth()] + ' ' + d.getFullYear()); }
  // اليوم الفعّال للتجميع: من تاريخ الموعد إن وُجد، وإلا من اليوم المخصّص يدوياً
  function effWeekday(c) { return c.apptDate ? weekday(c.apptDate) : (c.day || ''); }
  // مفتاح فرز زمني حقيقي (التاريخ + الوقت)
  function apptDT(c) { return c.apptDate ? (c.apptDate + 'T' + (c.apptTime || '00:00')) : ''; }
  function caseSort(a, b) {
    var ad = a.status === 'مكتملة' ? 1 : 0, bd = b.status === 'مكتملة' ? 1 : 0;
    if (ad !== bd) return ad - bd;                          // المكتملة أسفل
    var at = apptDT(a), bt = apptDT(b);
    if (at && bt) return at < bt ? -1 : (at > bt ? 1 : 0);  // بالتاريخ والوقت الفعليين
    if (at && !bt) return -1; if (!at && bt) return 1;
    var au = a.apptTime || '', bu = b.apptTime || '';       // بلا تاريخ: بالوقت فقط
    if (au && bu) return au < bu ? -1 : 1;
    if (au && !bu) return -1; if (!au && bu) return 1;
    return 0;
  }
  function timeLabel(t) { if (!t) return ''; var p = String(t).split(':'); var h = +p[0], m = p[1] || '00'; var isEn = appLang === 'en'; var ap = h < 12 ? (isEn ? 'AM' : 'صباحاً') : (isEn ? 'PM' : 'مساءً'); var h12 = h % 12; if (h12 === 0) h12 = 12; return h12 + ':' + m + ' ' + ap; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function statusMeta(s) {
    return { 'قيد الانتظار': { cls: 'st-wait' }, 'قيد العمل': { cls: 'st-work' }, 'مكتملة': { cls: 'st-done' }, 'تحتاج مراجعة': { cls: 'st-review' }, 'ملغاة': { cls: 'st-cancel' } }[s] || { cls: 'st-wait' };
  }
  var STATUS_LABELS_EN = { 'قيد الانتظار': 'Pending', 'قيد العمل': 'In Progress', 'مكتملة': 'Completed', 'تحتاج مراجعة': 'Needs Review', 'ملغاة': 'Cancelled' };
  function statusLabel(s) { if (!s) return s; return (appLang === 'en' && STATUS_LABELS_EN[s]) ? STATUS_LABELS_EN[s] : s; }
  var SESS_STATUS_LABELS_EN = { 'منجزة': 'Done', 'مجدولة': 'Scheduled', 'ملغاة': 'Cancelled' };
  function sessStatusLabel(s) { if (!s) return s; return (appLang === 'en' && SESS_STATUS_LABELS_EN[s]) ? SESS_STATUS_LABELS_EN[s] : s; }
  function sessStMeta(s) { return { 'منجزة': 'st-done', 'مجدولة': 'st-work', 'ملغاة': 'st-cancel' }[s] || 'st-work'; }
  function fillSelect(sel, arr, extra) {
    sel.innerHTML = (extra ? '<option value="">' + extra + '</option>' : '') + arr.map(function (o) {
      var val = (o && typeof o === 'object') ? o.value : o;
      var lab = (o && typeof o === 'object') ? o.label : o;
      return '<option value="' + esc(val) + '">' + esc(lab) + '</option>';
    }).join('');
  }
  function toast(m, ms) { els.toast.textContent = m; els.toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function () { els.toast.hidden = true; }, ms || 2500); }

  /* ---------- completed archive helpers ---------- */
  function isCompleted(c) { return !!c && c.status === 'مكتملة'; }
  function activeCases() { return cases.filter(function (c) { return !isCompleted(c); }); }
  function completedCases() { return cases.filter(isCompleted); }

  /* ---------- attachment helpers ---------- */
  function attTypeLabel(a) {
    var t = String((a && a.type) || '').toLowerCase();
    var nm = String((a && a.name) || '');
    if (t.indexOf('image/') === 0) return T('صورة');
    if (t.indexOf('pdf') >= 0 || /\.pdf$/i.test(nm)) return 'PDF';
    if (t.indexOf('word') >= 0 || /\.docx?$/i.test(nm)) return T('مستند');
    var ext = nm.indexOf('.') >= 0 ? nm.split('.').pop() : '';
    return (ext && ext.length <= 5) ? ext.toUpperCase() : T('ملف');
  }
  function fmtSize(n) { n = +n; if (!n || isNaN(n)) return ''; var isEn = appLang === 'en'; if (n < 1024) return n + (isEn ? ' B' : ' ب'); if (n < 1048576) return Math.round(n / 1024) + (isEn ? ' KB' : ' ك.ب'); return (n / 1048576).toFixed(1) + (isEn ? ' MB' : ' م.ب'); }
  // تحويل data URL إلى Blob لفتحه بأمان عبر رابط Blob (بدل فتح data: التي تحجبها المتصفحات)
  function dataURLtoBlob(dataUrl) {
    var parts = String(dataUrl).split(',');
    var meta = parts[0] || '';
    var isB64 = /;base64/i.test(meta);
    var mime = (meta.match(/data:([^;]+)/) || [])[1] || 'application/octet-stream';
    var raw = parts.slice(1).join(',');
    var bin = isB64 ? atob(raw) : decodeURIComponent(raw);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ---------- links ---------- */
  function callLink(phone, cls, label) { var p = (phone || '').trim(); return p ? '<a class="card-btn call ' + cls + '" href="tel:' + encodeURIComponent(p) + '">📞' + label + '</a>' : '<span class="card-btn call disabled ' + cls + '">📞' + label + '</span>'; }
  function waLink(phone, cls, label) { var d = phoneDigits(phone); return d ? '<a class="card-btn wa ' + cls + '" href="https://wa.me/' + d + '" target="_blank" rel="noopener">💬' + label + '</a>' : '<span class="card-btn wa disabled ' + cls + '">💬' + label + '</span>'; }

  /* ---------- counts ---------- */
  function isoDate(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function renderStudentDisplay() {
    if (els.setNameDisplay) els.setNameDisplay.textContent = settings.studentName || '—';
    if (els.setLevelDisplay) els.setLevelDisplay.textContent = settings.level || '—';
    if (els.setCollegeDisplay) els.setCollegeDisplay.textContent = settings.college || '—';
  }
  /* ---------- Side Drawer (الصفحة الرئيسية) ---------- */
  function renderDrawerStudent() {
    var name = settings.studentName || T('طالب طب الأسنان');
    if (els.drawerName) els.drawerName.textContent = name;
    if (els.drawerLevel) els.drawerLevel.textContent = settings.level || settings.college || 'DentPilot Student';
    if (els.drawerAvatar) els.drawerAvatar.textContent = (name.trim().charAt(0) || '؟');
  }
  function markDrawerActive() {
    if (!els.sideDrawer) return;
    els.sideDrawer.querySelectorAll('.drawer-item').forEach(function (b) {
      b.classList.toggle('drawer-item-active', b.dataset.go === currentView);
    });
  }
  /* الشريط السفلي الثابت: ظاهر فقط في الصفحات الأساسية الأربع. كل تبويب له وجهة حقيقية مستقلة الآن. */
  var BOTTOMBAR_VIEWS = { dashboard: 'dashboard', all: 'all', appointments: 'appointments', account: 'account' };
  function markBottomNavActive() {
    if (!els.dashBottomBar) return;
    var show = Object.prototype.hasOwnProperty.call(BOTTOMBAR_VIEWS, currentView);
    els.dashBottomBar.hidden = !show;
    if (!show) return;
    var items = els.dashBottomBar.querySelectorAll('.dbb-item');
    items.forEach(function (b) { b.classList.toggle('dbb-active', b.dataset.go === currentView); });
  }
  function openDrawer() {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    if (!els.drawerOverlay) return;
    renderDrawerStudent(); markDrawerActive();
    showOverlay(els.drawerOverlay);
    els.drawerOverlay.classList.add('drawer-open');
    if (els.drawerCloseBtn) setTimeout(function () { els.drawerCloseBtn.focus(); }, 60);
  }
  function closeDrawer() {
    if (!els.drawerOverlay) return;
    els.drawerOverlay.classList.remove('drawer-open');
    setTimeout(function () { hideOverlay(els.drawerOverlay); }, 220);   // انتظار انتهاء الانتقال
  }
  function isDrawerOpen() { return els.drawerOverlay && !els.drawerOverlay.hidden; }
  function renderCalStrip() {
    if (!els.calStrip) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var todayIso = isoDate(today);
    // بداية الأسبوع = السبت (الأسبوع العربي)، وتُعرض الأيام السبعة كاملة بلا تمرير أفقي
    var saturday = new Date(today);
    saturday.setDate(saturday.getDate() - ((today.getDay() + 1) % 7));
    var html = '';
    for (var i = 0; i <= 6; i++) {
      var d = new Date(saturday); d.setDate(d.getDate() + i);
      var iso = isoDate(d), isToday = (iso === todayIso);
      html += '<button type="button" class="cal-day' + (isToday ? ' cal-day-today cal-day-active' : '') + '" data-date="' + iso + '" data-today="' + (isToday ? '1' : '0') + '">' +
        '<span class="cal-day-name">' + (appLang === 'en' ? WEEKDAYS_SHORT_EN[d.getDay()] : WEEKDAYS_AR[d.getDay()]) + '</span>' +
        '<span class="cal-day-num">' + d.getDate() + '</span></button>';
    }
    els.calStrip.innerHTML = html;
    updateCalNote(todayIso, true);
  }
  function updateCalNote(iso, isToday) {
    if (!els.calNote) return;
    var n = cases.filter(function (c) { return c.apptDate === iso; }).length;
    if (appLang === 'en') {
      var when = isToday ? 'today' : 'on this day';
      els.calNote.textContent = n > 0 ? ('You have ' + n + ' ' + (n === 1 ? 'case' : 'cases') + ' ' + when) : ('No cases ' + when);
      return;
    }
    var suffix = isToday ? 'اليوم' : 'في هذا اليوم';
    els.calNote.textContent = n > 0 ? ('لديك ' + n + ' ' + (n === 1 ? 'حالة' : 'حالات') + ' ' + suffix) : ('لا توجد حالات ' + suffix);
  }
  function todayTomorrowIso() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return { todayIso: isoDate(today), tomorrowIso: isoDate(tomorrow) };
  }
  // حالة تحتاج متابعة: مُشتقّة فقط من حالة موجودة فعلاً («تحتاج مراجعة») أو من موعد فائت لحالة لم تُنجز/تُلغَ — لا تُخترع بيانات جديدة
  function needsFollowup(c) {
    if (c.status === 'تحتاج مراجعة') return true;
    var todayIso = todayTomorrowIso().todayIso;
    return !!(c.apptDate && c.apptDate < todayIso && c.status !== 'مكتملة' && c.status !== 'ملغاة');
  }
  function apptsForDay(dayIso) {
    return cases.filter(function (c) { return c.apptDate === dayIso; }).slice().sort(function (a, b) {
      var at = a.apptTime || '', bt = b.apptTime || '';
      if (!at && !bt) return 0; if (!at) return 1; if (!bt) return -1;
      return at < bt ? -1 : (at > bt ? 1 : 0);
    });
  }
  function todayTomorrowCases() {
    var r = todayTomorrowIso();
    return cases.filter(function (c) { return c.apptDate === r.todayIso || c.apptDate === r.tomorrowIso; })
      .sort(function (a, b) { return (a.apptDate + (a.apptTime || '')) < (b.apptDate + (b.apptTime || '')) ? -1 : 1; });
  }
  function renderTodayTomorrowSection() {
    if (!els.todayList) return;
    var r = todayTomorrowIso();
    var list = todayTomorrowCases();
    if (list.length === 0) { els.todayList.innerHTML = ''; if (els.todayEmpty) els.todayEmpty.hidden = false; return; }
    if (els.todayEmpty) els.todayEmpty.hidden = true;
    els.todayList.innerHTML = list.map(function (c) {
      var isToday = c.apptDate === r.todayIso;
      var tag = isToday ? T('قريب') : T('غداً');
      var deptText = c.department ? deptLabel(c.department) : '';
      var typeText = [deptText, c.caseType].filter(Boolean).join(' · ');
      var desc = c.notes ? c.notes : T(isToday ? 'موعد متابعة الحالة السريرية' : 'موعد الحالة السريرية');
      var timeText = c.apptTime || '—';
      return '<button type="button" class="dp-pfile today-card" data-act="open" data-id="' + c.id + '">' +
        '<span class="today-time">' + esc(timeText) + '</span>' +
        '<span class="today-info">' +
          '<span class="today-type">' + esc(typeText || '—') + '</span>' +
          '<span class="today-desc">' + esc(desc) + '</span>' +
        '</span>' +
        '<span class="today-tag">' + tag + '</span>' +
      '</button>';
    }).join('');
  }
  function updateCounts() {
    renderCalStrip();
    var totalCount = cases.length, doneCount = completedCases().length;
    if (els.heroName) els.heroName.textContent = settings.studentName || T('طالب طب الأسنان');
    if (els.heroMeta) {
      var metaParts = [settings.level, settings.college].filter(Boolean);
      els.heroMeta.textContent = metaParts.length ? metaParts.join(' · ') : 'DentPilot Student';
    }
    if (els.heroBadgeTotal) els.heroBadgeTotal.textContent = totalCount + ' ' + T('حالات');
    if (els.heroBadgeDone) els.heroBadgeDone.textContent = doneCount + ' ' + T('مكتملة');
    els.dcAll.textContent = buildPatients().length;   // جميع المرضى: عدد المرضى الفريدين فعلاً (وليس عدد الحالات)
    if (els.dcTodayTomorrow) els.dcTodayTomorrow.textContent = todayTomorrowCases().length;
    if (els.dcReqsRing) {
      // حلقة كرت "المكتملة": نسبة الحالات المكتملة من إجمالي الحالات (بلا تكرار مع أي قسم آخر)
      var pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;
      els.dcReqsRing.style.setProperty('--pct', pct);
      if (els.dcReqsVal) els.dcReqsVal.textContent = pct + '%';
    }
    renderTodayTomorrowSection();
  }

  /* ---------- compact row ---------- */
  function caseRow(c, index, opts) {
    opts = opts || {};
    var st = statusMeta(c.status);
    var deptText = c.department ? deptLabel(c.department) : '';
    var procText = c.caseType || '';
    var deptProc = [deptText, procText].filter(Boolean).join(' · ');
    var apptText = c.apptDate ? (longDateAr(c.apptDate) + (c.apptTime ? ' — ' + timeLabel(c.apptTime) : '')) : T('لا يوجد موعد محدد');
    var restoreBtn = opts.showRestore ? '<button type="button" class="btn-restore" data-act="restore" data-id="' + c.id + '" title="' + T('إرجاع إلى الحالات الحالية') + '">↩︎ ' + T('إرجاع') + '</button>' : '';
    var completeBtn = (c.status !== 'مكتملة') ? '<button type="button" class="row-complete-btn" data-act="complete" data-id="' + c.id + '" title="' + T('إنهاء الحالة') + '">✅ ' + T('إنهاء') + '</button>' : '';
    return '<div class="dp-pfile row ' + (c.status === 'مكتملة' ? 'is-done' : '') + '" data-act="open" data-id="' + c.id + '" role="button" tabindex="0" aria-label="' + T('عرض حالة') + ' ' + esc(c.name) + '">' +
      '<span class="row-no">' + pad(index) + '</span>' +
      '<div class="row-main">' +
        '<span class="row-name">' + esc(c.name) + '</span>' +
        (deptProc ? '<span class="row-dept">' + esc(deptProc) + '</span>' : '') +
        '<span class="row-status ' + st.cls + '">' + (c.status === 'مكتملة' ? '✅ ' : '') + esc(statusLabel(c.status) || '—') + '</span>' +
        '<span class="row-appt">' + esc(apptText) + '</span>' +
      '</div>' +
      restoreBtn + completeBtn +
      '<span class="row-open-btn">' + T('عرض الحالة') + ' ›</span>' +
    '</div>';
  }

  /* ---------- All patients ---------- */
  var ALL_FILTERS = [
    { key: 'all', label: 'الكل' },
    { key: 'active', label: 'قيد العمل' },
    { key: 'completed', label: 'مكتملة' },
    { key: 'today', label: 'اليوم' },
    { key: 'tomorrow', label: 'غداً' },
    { key: 'followup', label: 'تحتاج متابعة' }
  ];
  function applyAllFilter(list, key) {
    var r = todayTomorrowIso();
    if (key === 'active') return list.filter(function (c) { return c.status !== 'مكتملة'; });
    if (key === 'completed') return list.filter(function (c) { return c.status === 'مكتملة'; });
    if (key === 'today') return list.filter(function (c) { return c.apptDate === r.todayIso; });
    if (key === 'tomorrow') return list.filter(function (c) { return c.apptDate === r.tomorrowIso; });
    if (key === 'followup') return list.filter(needsFollowup);
    return list;
  }
  function renderAll() {
    var filter = ALL_FILTERS.some(function (f) { return f.key === currentParam; }) ? currentParam : 'all';
    var q = els.allSearch.value.trim().toLowerCase();
    var base = cases;   // إجمالي الحالات: تطابق رقم الإحصائية العلوية (تشمل المكتملة وغير المكتملة)

    if (els.allTitle) els.allTitle.textContent = T('الحالات') + ' (' + base.length + ')';
    if (els.allFilterBar) {
      var FILTER_LABELS_EN = { all: 'All', active: 'In Progress', completed: 'Completed', today: 'Today', tomorrow: 'Tomorrow', followup: 'Needs Follow-up' };
      els.allFilterBar.innerHTML = ALL_FILTERS.map(function (f) {
        var lbl = (appLang === 'en' && FILTER_LABELS_EN[f.key]) ? FILTER_LABELS_EN[f.key] : f.label;
        return '<button type="button" class="filter-chip' + (f.key === filter ? ' active' : '') + '" data-act="all-filter" data-filter="' + f.key + '">' + lbl + '</button>';
      }).join('');
    }

    var byFilter = applyAllFilter(base, filter);
    var list = q ? byFilter.filter(function (c) {
      return (c.name || '').toLowerCase().indexOf(q) >= 0 || (c.phone || '').toLowerCase().indexOf(q) >= 0 ||
             (c.department || '').toLowerCase().indexOf(q) >= 0 || (c.caseType || '').toLowerCase().indexOf(q) >= 0;
    }) : byFilter;

    if (base.length === 0) { els.allList.innerHTML = ''; els.allEmpty.hidden = false; els.allEmpty.querySelector('p').textContent = T('لا توجد حالات بعد.'); els.allEmpty.querySelector('span').textContent = T('اضغط «إضافة حالة» لتسجيل أول حالة.'); return; }
    if (list.length === 0) {
      els.allList.innerHTML = ''; els.allEmpty.hidden = false;
      els.allEmpty.querySelector('p').textContent = T(q ? 'لا توجد نتائج.' : 'لا توجد حالات ضمن هذا المرشّح.');
      els.allEmpty.querySelector('span').textContent = T(q ? 'جرّب بحثاً آخر.' : 'جرّب مرشّحاً آخر.');
      return;
    }
    els.allEmpty.hidden = true;
    els.allList.innerHTML = list.slice().sort(caseSort).map(function (c, i) { return caseRow(c, i + 1); }).join('');
  }

  /* ---------- مواعيد اليوم والغد (صفحة مستقلة) ---------- */
  function apptCardHtml(c) {
    var st = statusMeta(c.status);
    var deptText = c.department ? deptLabel(c.department) : '';
    var procText = c.caseType || '';
    var subText = [deptText, procText].filter(Boolean).join(' · ');
    var timeText = c.apptTime ? timeLabel(c.apptTime) : T('الوقت غير محدد');
    return '<div class="dp-pfile appt-card' + (!c.apptTime ? ' appt-card-notime' : '') + '" data-act="open" data-id="' + c.id + '" role="button" tabindex="0" aria-label="' + T('فتح حالة') + ' ' + esc(c.name) + '">' +
      '<span class="appt-time">' + esc(timeText) + '</span>' +
      '<span class="appt-main">' +
        '<span class="appt-name">' + esc(c.name) + '</span>' +
        '<span class="appt-sub">' + esc(subText || '—') + '</span>' +
      '</span>' +
      '<span class="appt-status ' + st.cls + '">' + (c.status === 'مكتملة' ? '✅ ' : '') + esc(statusLabel(c.status) || '—') + '</span>' +
      '<span class="appt-chevron">›</span>' +
    '</div>';
  }
  function renderAppointments() {
    if (!els.apptList) return;
    var day = (currentParam === 'tomorrow') ? 'tomorrow' : 'today';
    var r = todayTomorrowIso();
    var todayList = apptsForDay(r.todayIso), tomorrowList = apptsForDay(r.tomorrowIso);
    var list = day === 'today' ? todayList : tomorrowList;

    if (els.apptToggle) {
      els.apptToggle.innerHTML =
        '<button type="button" class="acc-tab' + (day === 'today' ? ' is-active' : '') + '" data-act="appt-day" data-day="today">' + T('مواعيد اليوم') + ' <span class="appt-toggle-count">' + todayList.length + '</span></button>' +
        '<button type="button" class="acc-tab' + (day === 'tomorrow' ? ' is-active' : '') + '" data-act="appt-day" data-day="tomorrow">' + T('مواعيد الغد') + ' <span class="appt-toggle-count">' + tomorrowList.length + '</span></button>';
    }

    if (list.length === 0) {
      els.apptList.innerHTML = '';
      if (els.apptEmpty) {
        els.apptEmpty.hidden = false;
        els.apptEmpty.querySelector('p').textContent = T(day === 'today' ? 'لا توجد مواعيد اليوم' : 'لا توجد مواعيد للغد');
        els.apptEmpty.querySelector('span').textContent = T(day === 'today' ? 'يمكنك إضافة حالة جديدة بموعد اليوم.' : 'لا داعي للقلق — لا مواعيد مجدولة للغد بعد.');
      }
      return;
    }
    if (els.apptEmpty) els.apptEmpty.hidden = true;
    els.apptList.innerHTML = list.map(apptCardHtml).join('');
  }

  /* ---------- دليل جميع المرضى (على مستوى العرض فقط — لا يعدّل بيانات الحالات) ---------- */
  function normalizePhone(p) { return String(p || '').replace(/[^\d+]/g, ''); }
  function normalizeNameKey(n) { return String(n || '').trim().toLowerCase().replace(/\s+/g, ' '); }
  function patientKey(c) { var ph = normalizePhone(c.phone); return ph ? ('p:' + ph) : ('n:' + normalizeNameKey(c.name)); }
  function buildPatients() {
    var map = {}, order = [];
    cases.forEach(function (c) {
      var k = patientKey(c);
      if (!map[k]) { map[k] = { key: k, name: c.name || '—', phone: c.phone || '', cases: [] }; order.push(k); }
      map[k].cases.push(c);
      if (!map[k].phone && c.phone) map[k].phone = c.phone;
    });
    return order.map(function (k) { return map[k]; });
  }
  function patientNextOrLast(p) {
    var todayIso = todayTomorrowIso().todayIso;
    var withDates = p.cases.filter(function (c) { return c.apptDate; });
    var upcoming = withDates.filter(function (c) { return c.apptDate >= todayIso; }).sort(function (a, b) { return apptDT(a) < apptDT(b) ? -1 : 1; });
    if (upcoming.length) return { label: T('الموعد القادم'), c: upcoming[0] };
    var past = withDates.slice().sort(function (a, b) { return apptDT(a) > apptDT(b) ? -1 : 1; });
    if (past.length) return { label: T('آخر موعد'), c: past[0] };
    return null;
  }
  function patientCardHtml(p, n) {
    var activeN = p.cases.filter(function (c) { return c.status !== 'مكتملة'; }).length;
    var doneN = p.cases.filter(function (c) { return c.status === 'مكتملة'; }).length;
    var nxt = patientNextOrLast(p);
    var apptText = nxt ? (nxt.label + ': ' + longDateAr(nxt.c.apptDate) + (nxt.c.apptTime ? ' — ' + timeLabel(nxt.c.apptTime) : '')) : T('لا يوجد موعد محدد');
    var isEn = appLang === 'en';
    var metaParts = [p.cases.length + (isEn ? (' ' + (p.cases.length === 1 ? 'case' : 'cases')) : (p.cases.length === 1 ? ' حالة' : ' حالات'))];
    if (activeN) metaParts.push(activeN + (isEn ? ' active' : ' نشطة'));
    if (doneN) metaParts.push(doneN + (isEn ? ' completed' : ' مكتملة'));
    return '<div class="dp-pfile patient-card" data-act="patient-open" data-key="' + esc(p.key) + '" role="button" tabindex="0" aria-label="' + T('عرض ملفات') + ' ' + esc(p.name) + '">' +
      '<span class="patient-avatar patient-num">' + pad(n) + '</span>' +
      '<span class="patient-main">' +
        '<span class="patient-name">' + esc(p.name) + '</span>' +
        '<span class="patient-fileno">' + T('رقم الملف') + ': ' + n + '</span>' +
        (p.phone ? '<span class="patient-phone" dir="ltr">' + esc(p.phone) + '</span>' : '') +
        '<span class="patient-meta">' + esc(metaParts.join(' · ')) + '</span>' +
      '</span>' +
      '<span class="patient-side">' +
        '<span class="patient-next-panel">' + esc(apptText) + '</span>' +
        '<span class="patient-chevron">' + T('عرض الملفات') + ' ›</span>' +
      '</span>' +
    '</div>';
  }
  function renderPatients() {
    if (!els.patientsList) return;
    var list = buildPatients();
    var q = els.patientsSearch ? els.patientsSearch.value.trim().toLowerCase() : '';
    var indexed = list.map(function (p, i) { return { p: p, n: i + 1 }; });   // ترقيم ثابت حسب ترتيب القائمة الكاملة، لا يتغير عند الفلترة بالبحث
    var filtered = q ? indexed.filter(function (x) { return (x.p.name || '').toLowerCase().indexOf(q) >= 0 || (x.p.phone || '').toLowerCase().indexOf(q) >= 0; }) : indexed;
    if (els.patientsTitle) els.patientsTitle.textContent = '👥 ' + T('جميع المرضى') + ' (' + list.length + ')';
    if (list.length === 0) {
      els.patientsList.innerHTML = ''; if (els.patientsEmpty) { els.patientsEmpty.hidden = false; els.patientsEmpty.querySelector('p').textContent = T('لا يوجد مرضى بعد.'); els.patientsEmpty.querySelector('span').textContent = T('اضغط «إضافة حالة» لتسجيل أول حالة.'); }
      return;
    }
    if (filtered.length === 0) {
      els.patientsList.innerHTML = ''; if (els.patientsEmpty) { els.patientsEmpty.hidden = false; els.patientsEmpty.querySelector('p').textContent = T('لا توجد نتائج.'); els.patientsEmpty.querySelector('span').textContent = T('جرّب بحثاً آخر.'); }
      return;
    }
    if (els.patientsEmpty) els.patientsEmpty.hidden = true;
    els.patientsList.innerHTML = filtered.map(function (x) { return patientCardHtml(x.p, x.n); }).join('');
  }
  function renderPatientSummary(key) {
    if (!els.patientCasesList) return;
    var p = buildPatients().find(function (x) { return x.key === key; });
    if (!p) { go('patients'); return; }
    if (els.patientTitle) els.patientTitle.textContent = p.name;
    var isEn = appLang === 'en';
    if (els.patientSub) els.patientSub.textContent = [p.phone, p.cases.length + (isEn ? (' ' + (p.cases.length === 1 ? 'case' : 'cases')) : (p.cases.length === 1 ? ' حالة' : ' حالات'))].filter(Boolean).join(' · ');
    var sorted = p.cases.slice().sort(caseSort);
    els.patientCasesList.innerHTML = sorted.map(function (c, i) { return caseRow(c, i + 1); }).join('');
  }

  /* ---------- Days ---------- */
  /* ---------- Requirements ---------- */
  function allReqNames() { return DEPTS.concat(customReqs); }
  function renderReqs() {
    els.reqsList.innerHTML = allReqNames().map(function (d) {
      var isCustom = customReqs.indexOf(d) >= 0;
      var req = toNum(requirements[d]);
      var done = cases.filter(function (c) { return c.department === d && c.status === 'مكتملة'; }).length;
      var remaining = Math.max(0, req - done);
      var pct = req > 0 ? Math.min(100, Math.round(done / req * 100)) : (done > 0 ? 100 : 0);
      var full = req > 0 && done >= req;
      var deptDef = null; for (var di = 0; di < DEPT_DEFS.length; di++) { if (DEPT_DEFS[di].value === d) { deptDef = DEPT_DEFS[di]; break; } }
      var nameHtml = esc(deptDef ? deptDef.label : d) + (full ? ' ✅' : '') + (deptDef && deptDef.desc ? ' <span class="req-desc">' + esc(deptDef.desc) + '</span>' : '');
      return '<div class="req">' +
        '<div class="req-top"><span class="req-name">' + nameHtml + '</span>' +
          (isCustom ? '<button type="button" class="req-del" data-act="req-del-custom" data-name="' + esc(d) + '" title="' + T('حذف المادة') + '" aria-label="' + T('حذف المادة') + '">✕</button>' : '') +
          '<input class="req-input" type="number" min="0" inputmode="numeric" data-dept="' + esc(d) + '" value="' + (req || 0) + '" /></div>' +
        '<div class="req-bar"><div class="req-fill ' + (full ? 'full' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="req-meta"><span class="req-done">' + T('المكتمل') + ': <b>' + done + ' / ' + (req || 0) + '</b></span><span>' + T('المتبقي') + ': <b>' + remaining + '</b></span></div>' +
      '</div>';
    }).join('');
  }
  function toggleReqAddForm(show) {
    if (!els.reqAddForm) return;
    var willShow = (show === undefined) ? !!els.reqAddForm.hidden : !!show;
    els.reqAddForm.hidden = !willShow;
    if (willShow && els.reqNewName) { els.reqNewName.value = ''; setTimeout(function () { els.reqNewName.focus(); }, 30); }
  }
  function addCustomReq(name) {
    var n = String(name || '').trim();
    if (!n) return false;
    var exists = allReqNames().some(function (d) { return d.toLowerCase() === n.toLowerCase(); });
    if (exists) { toast(T('هذه المادة موجودة بالفعل')); return false; }
    customReqs.push(n); saveCustomReqs(); if (window.DPSync) window.DPSync.markRequirementsDirty(); renderReqs(); toast(T('تمت إضافة') + ' «' + n + '»');
    return true;
  }
  function deleteCustomReq(name) {
    customReqs = customReqs.filter(function (d) { return d !== name; });
    delete requirements[name];
    saveCustomReqs(); saveReqs(); if (window.DPSync) window.DPSync.markRequirementsDirty(); renderReqs();
  }

  /* ============================================================
     طبقة الجامعات — شاشة اختيار الجامعة قبل الدخول إلى الكاسشيتات.
     مستوى تنقّل فقط: لا تُغيّر أي شيء داخل نظام الكاسشيتات نفسه (القالب/الحفظ/الطباعة).
     الجامعات المتاحة (available:true) تُعاد توجيهها إلى نفس شاشة 'casesheets' الحالية
     حرفياً — نفس النموذج ونفس المنطق، بلا أي نسخ أو تكرار للكود.
     ============================================================ */
  var UNIVERSITIES = [
    { key: 'dhamar',  name: 'جامعة ذمار',    available: false },
    { key: 'genius',  name: 'جامعة جينيس',   available: true },
    { key: 'saeeda',  name: 'جامعة السعيدة', available: false },
    { key: 'sanaa',   name: 'جامعة صنعاء',   available: false },
    { key: 'jazeera', name: 'جامعة الجزيرة', available: true },
    { key: 'ib',      name: 'جامعة إب',      available: true }
  ];
  var UNI_CARD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2 8l10 5 10-5-10-5z"></path><path d="M6 10.5V16c0 1.1 2.7 3 6 3s6-1.9 6-3v-5.5"></path><path d="M22 8v6"></path></svg>';
  function uniByKey(key) { return UNIVERSITIES.filter(function (u) { return u.key === key; })[0] || null; }
  function renderUniversities() {
    if (!els.uniList) return;
    els.uniList.innerHTML = UNIVERSITIES.map(function (u) {
      return '<button type="button" class="dash-card uni-card' + (u.available ? '' : ' uni-card-soon') + '" data-act="uni-open" data-uni="' + u.key + '">' +
        '<span class="dash-emoji icon-svg">' + UNI_CARD_ICON + '</span>' +
        '<span class="dash-text"><span class="dash-title">' + esc(u.name) + '</span>' +
        '<span class="dash-sub">' + (u.available ? 'كاسشيتات متاحة' : 'قريباً') + '</span></span>' +
      '</button>';
    }).join('');
  }
  // آخر جامعة دخل المستخدم عبرها إلى صفحة الكاسشيتات — تُستخدم لتصفية القوالب المعروضة (كل جامعة ترى كاسشيتاتها فقط)
  var currentCsUni = 'jazeera';
  function openUniversity(key) {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    var u = uniByKey(key); if (!u) return;
    if (u.available) go('casesheets', key); else go('uniEmpty', key);
  }
  function renderUniEmpty(key) {
    var u = uniByKey(key);
    if (els.uniEmptyTitle) els.uniEmptyTitle.textContent = '📄 ' + (u ? u.name : '');
    if (els.uniEmptyBody) els.uniEmptyBody.innerHTML =
      '<p>سيتم إضافة كاسشيتات هذه الجامعة قريبًا</p>';
  }

  /* ============================================================
     الكاسشيتات (نظام مستقل تماماً عن نظام الحالات — لا يُغيّر أي منطق فيه)
     ============================================================ */
  var CS_ICON_SURGERY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M14 3v4h4"></path><path d="M9 12h6M9 16h6"></path></svg>';
  var CS_ICON_OPERATIVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2c-1.9 0-3.1 1.15-4.6 1.15C5.9 4.35 4.3 5.6 4.3 8c0 2.45.95 4.4 1.55 6.4.5 1.75 1 4.4 2.35 4.4.95 0 1.05-2.35 1.5-3.7.3-.95.7-1.85 1.6-1.85s1.3.9 1.6 1.85c.45 1.35.55 3.7 1.5 3.7 1.35 0 1.85-2.65 2.35-4.4.6-2 1.55-3.95 1.55-6.4 0-2.4-1.6-3.65-3.1-3.65-1.2 0-2.4 1.15-4.6 1.15z"></path></svg>';
  var CS_ICON_ENDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c-4 0-7 2-7 5.5C5 12 7 15 8 19c.4 1.6 1 3 2 3s1.2-2 1.3-3.4c.1-1.3.3-2.6 1-2.6"></path><path d="M12 3c4 0 7 2 7 5.5 0 3.5-2 6.5-3 10.5-.4 1.6-1 3-2 3"></path><circle cx="12" cy="9" r="1.6"></circle></svg>';
  var CS_TEMPLATES = {
    'jazeera-oral-surgery': { name: 'Oral Surgery', sub: 'كاسشيت جراحة الفم — جاهز للتعبئة والطباعة', icon: CS_ICON_SURGERY, universities: ['jazeera', 'ib'] },
    'operative-dentistry': { name: 'Operative Dentistry', sub: 'كاسشيت الترميمية — جاهز للتعبئة والطباعة', icon: CS_ICON_OPERATIVE, universities: ['jazeera', 'ib'] },
    'genius-endodontic': { name: 'Endodontic Case Sheet', sub: 'النموذج الرسمي لجامعة جينيس — صفحتان تفاعليتان', icon: CS_ICON_ENDO, mode: 'overlay', universities: ['genius'] }
  };
  var CS_PHOTO_SLOTS = [
    { key: 'pre1', label: 'Preoperative Image 1' },
    { key: 'pre2', label: 'Preoperative Image 2' },
    { key: 'during', label: 'During operative Image' },
    { key: 'xray', label: 'X-ray Image' }
  ];
  // كاسشيت Operative Dentistry: نفس التسمية حرفياً كما في المرجع، بما فيها تكرار "Pre operative Image" مرتين — دون أي تعديل.
  var CS_PHOTO_SLOTS_OPERATIVE = [
    { key: 'preOp1', label: 'Pre operative Image' },
    { key: 'duringOp', label: 'During operative Image' },
    { key: 'preOp2', label: 'Pre operative Image' },
    { key: 'xray', label: 'X-ray Image' }
  ];
  function csPhotoSlotsFor(tplKey) {
    if (tplKey === 'operative-dentistry') return CS_PHOTO_SLOTS_OPERATIVE;
    if (tplKey === 'jazeera-oral-surgery') return CS_PHOTO_SLOTS;
    return []; // القوالب التي لا تحتوي قسم صور (مثل genius-endodontic) — بلا صور بدل توريث صور Oral Surgery خطأً
  }

  /* ============================================================
     كاسشيت Genius — Endodontic case sheet (عارض overlay فوق صورتَي الصفحتين الأصليتين)
     كل عنصر في GE_FIELDS: k=مفتاح الحقل، t=النوع (text/radio/check)، p=رقم الصفحة (1/2)،
     x/y/w/h = الموضع والحجم كنسبة % من أبعاد صفحة A4 الأصلية (595.25×842pt) — نفس الإحداثيات
     المستخرجة من ملف PDF المرجعي، تُستخدم هنا وفي case-sheet-print.html لضمان تطابق تام.
     ============================================================ */
  var GE_FIELDS = [
  {k:'patientName',t:'text',p:1,x:19.908,y:16.568,w:27.232,h:1.96},
  {k:'date',t:'text',p:1,x:59.656,y:16.568,w:33.7,h:1.96},
  {k:'education',t:'text',p:1,x:19.908,y:18.527,w:27.232,h:1.96},
  {k:'sex',t:'text',p:1,x:59.656,y:18.527,w:33.7,h:1.96},
  {k:'address',t:'text',p:1,x:19.908,y:20.487,w:27.232,h:2.019},
  {k:'occupation',t:'text',p:1,x:59.656,y:20.487,w:33.7,h:2.019},
  {k:'age',t:'text',p:1,x:19.908,y:22.506,w:27.232,h:1.698},
  {k:'phoneNu',t:'text',p:1,x:59.656,y:22.506,w:33.7,h:1.698},
  {k:'caseNo',t:'text',p:1,x:67.703,y:13.052,w:10.029,h:1.425},
  {k:'chiefComplaint',t:'text',p:1,x:20.546,y:23.99,w:73.112,h:1.9},
  {k:'pastDentalHistory',t:'text',p:1,x:29.668,y:26.936,w:64.662,h:2.708},
  {k:'mhAnemia',t:'cell',p:1,x:7.19,y:32.28,w:21.302,h:1.425},
  {k:'mhBleeding',t:'cell',p:1,x:28.492,y:32.28,w:21.42,h:1.425},
  {k:'mhKidney',t:'cell',p:1,x:49.912,y:32.28,w:21.47,h:1.425},
  {k:'mhRheumatic',t:'cell',p:1,x:71.382,y:32.28,w:21.47,h:1.425},
  {k:'mhArtificialOrgan',t:'cell',p:1,x:7.19,y:33.705,w:21.302,h:1.425},
  {k:'mhDiabetes',t:'cell',p:1,x:28.492,y:33.705,w:21.42,h:1.425},
  {k:'mhLiver',t:'cell',p:1,x:49.912,y:33.705,w:21.47,h:1.425},
  {k:'mhStroke',t:'cell',p:1,x:71.382,y:33.705,w:21.47,h:1.425},
  {k:'mhAsthma',t:'cell',p:1,x:7.19,y:35.131,w:21.302,h:1.437},
  {k:'mhFainting',t:'cell',p:1,x:28.492,y:35.131,w:21.42,h:1.437},
  {k:'mhRespiratory',t:'cell',p:1,x:49.912,y:35.131,w:21.47,h:1.437},
  {k:'mhDrugIntake',t:'cell',p:1,x:71.382,y:35.131,w:21.47,h:1.437},
  {k:'mhBloodDisease',t:'cell',p:1,x:7.19,y:36.568,w:21.302,h:1.425},
  {k:'mhHeartDisease',t:'cell',p:1,x:28.492,y:36.568,w:21.42,h:1.425},
  {k:'mhAllergy',t:'cell',p:1,x:49.912,y:36.568,w:21.47,h:1.425},
  {k:'mhOther',t:'cell',p:1,x:71.382,y:36.568,w:21.47,h:1.425},
  {k:'mhCancer',t:'cell',p:1,x:7.19,y:37.993,w:21.302,h:1.425},
  {k:'mhHepatitis',t:'cell',p:1,x:28.492,y:37.993,w:21.42,h:1.425},
  {k:'mhPregnancy',t:'cell',p:1,x:49.912,y:37.993,w:21.47,h:1.425},
  {k:'mhEpilepsy',t:'cell',p:1,x:7.19,y:39.418,w:21.302,h:1.425},
  {k:'mhHypertension',t:'cell',p:1,x:28.492,y:39.418,w:21.42,h:1.425},
  {k:'mhGIT',t:'cell',p:1,x:49.912,y:39.418,w:21.47,h:1.425},
  {k:'mhOtherDetail',t:'text',p:1,x:80.118,y:36.223,w:11.726,h:3.195},
  {k:'painIntensity_none',t:'radio',p:1,x:22.142,y:43.147,w:2.755,h:1.948,g:'painIntensity',v:'none'},
  {k:'painIntensity_mild',t:'radio',p:1,x:34.876,y:43.147,w:2.755,h:1.948,g:'painIntensity',v:'mild'},
  {k:'painIntensity_moderate',t:'radio',p:1,x:48.349,y:43.147,w:2.755,h:1.948,g:'painIntensity',v:'moderate'},
  {k:'painIntensity_sever',t:'radio',p:1,x:61.705,y:43.147,w:2.755,h:1.948,g:'painIntensity',v:'sever'},
  {k:'painCharacter_dull',t:'radio',p:1,x:22.142,y:45.618,w:2.755,h:1.948,g:'painCharacter',v:'dull'},
  {k:'painCharacter_sharp',t:'radio',p:1,x:34.876,y:45.618,w:2.755,h:1.948,g:'painCharacter',v:'sharp'},
  {k:'painCharacter_throbbing',t:'radio',p:1,x:48.215,y:45.618,w:2.755,h:1.948,g:'painCharacter',v:'throbbing'},
  {k:'painCharacter_constant',t:'radio',p:1,x:61.823,y:45.618,w:2.755,h:1.948,g:'painCharacter',v:'constant'},
  {k:'painOnset_stimulated',t:'radio',p:1,x:22.142,y:47.969,w:2.755,h:1.948,g:'painOnset',v:'stimulated'},
  {k:'painOnset_intermittent',t:'radio',p:1,x:34.876,y:47.969,w:2.755,h:1.948,g:'painOnset',v:'intermittent'},
  {k:'painOnset_spontaneous',t:'radio',p:1,x:48.215,y:47.969,w:2.755,h:1.948,g:'painOnset',v:'spontaneous'},
  {k:'painLocation_localized',t:'radio',p:1,x:22.142,y:50.273,w:2.755,h:1.948,g:'painLocation',v:'localized'},
  {k:'painLocation_diffuse',t:'radio',p:1,x:34.876,y:50.273,w:2.755,h:1.948,g:'painLocation',v:'diffuse'},
  {k:'painLocation_referred',t:'radio',p:1,x:48.215,y:50.273,w:2.755,h:1.948,g:'painLocation',v:'referred'},
  {k:'painLocation_radiating',t:'radio',p:1,x:60.815,y:50.273,w:2.755,h:1.948,g:'painLocation',v:'radiating'},
  {k:'painLocationRadiatingDetail',t:'text',p:1,x:73.566,y:50.356,w:6.72,h:1.354},
  {k:'painDuration_second',t:'radio',p:1,x:22.142,y:52.696,w:2.755,h:1.948,g:'painDuration',v:'second'},
  {k:'painDuration_minute',t:'radio',p:1,x:34.876,y:52.696,w:2.755,h:1.948,g:'painDuration',v:'minute'},
  {k:'painDuration_hour',t:'radio',p:1,x:48.215,y:52.696,w:2.755,h:1.948,g:'painDuration',v:'hour'},
  {k:'painDuration_constant',t:'radio',p:1,x:60.815,y:52.696,w:2.755,h:1.948,g:'painDuration',v:'constant'},
  {k:'initCold',t:'check',p:1,x:22.142,y:54.964,w:2.755,h:1.948},
  {k:'initHeat',t:'check',p:1,x:34.876,y:54.964,w:2.755,h:1.948},
  {k:'initSweat',t:'check',p:1,x:48.215,y:54.964,w:2.755,h:1.948},
  {k:'initMastication',t:'check',p:1,x:60.815,y:54.964,w:2.755,h:1.948},
  {k:'initPalpation',t:'check',p:1,x:22.142,y:57.162,w:2.755,h:1.948},
  {k:'initAwakeNight',t:'check',p:1,x:34.876,y:57.162,w:2.755,h:1.948},
  {k:'painRelieved_cold',t:'radio',p:1,x:22.142,y:59.477,w:2.755,h:1.948,g:'painRelieved',v:'cold'},
  {k:'painRelieved_heat',t:'radio',p:1,x:34.876,y:59.477,w:2.755,h:1.948,g:'painRelieved',v:'heat'},
  {k:'painRelieved_analgesics',t:'radio',p:1,x:47.829,y:59.477,w:2.755,h:1.948,g:'painRelieved',v:'analgesics'},
  {k:'facialSwelling_yes',t:'radio',p:1,x:27.686,y:67.233,w:2.755,h:1.948,g:'facialSwelling',v:'yes'},
  {k:'facialSwelling_no',t:'radio',p:1,x:36.254,y:67.233,w:2.755,h:1.948,g:'facialSwelling',v:'no'},
  {k:'facialSwellingType_fluctuant',t:'radio',p:1,x:56.279,y:67.233,w:2.755,h:1.948,g:'facialSwellingType',v:'fluctuant'},
  {k:'facialSwellingType_semihard',t:'radio',p:1,x:69.651,y:67.233,w:2.755,h:1.948,g:'facialSwellingType',v:'semihard'},
  {k:'facialSwellingType_hard',t:'radio',p:1,x:84.889,y:67.233,w:2.755,h:1.948,g:'facialSwellingType',v:'hard'},
  {k:'lymphNode_yes',t:'radio',p:1,x:27.686,y:69.81,w:2.755,h:1.948,g:'lymphNode',v:'yes'},
  {k:'lymphNode_no',t:'radio',p:1,x:36.254,y:69.81,w:2.755,h:1.948,g:'lymphNode',v:'no'},
  {k:'sinusOpening_yes',t:'radio',p:1,x:65.233,y:69.81,w:2.755,h:1.948,g:'sinusOpening',v:'yes'},
  {k:'sinusOpening_no',t:'radio',p:1,x:76.438,y:69.81,w:2.755,h:1.948,g:'sinusOpening',v:'no'},
  {k:'swelling_yes',t:'radio',p:1,x:23.688,y:75.249,w:2.755,h:1.948,g:'swelling',v:'yes'},
  {k:'swelling_no',t:'radio',p:1,x:36.674,y:75.249,w:2.755,h:1.948,g:'swelling',v:'no'},
  {k:'swellingLocation',t:'text',p:1,x:62.243,y:75.273,w:18.48,h:1.33},
  {k:'sinusTract_yes',t:'radio',p:1,x:23.688,y:77.518,w:2.755,h:1.948,g:'sinusTract',v:'yes'},
  {k:'sinusTract_no',t:'radio',p:1,x:36.674,y:77.518,w:2.755,h:1.948,g:'sinusTract',v:'no'},
  {k:'sinusTractLocation',t:'text',p:1,x:62.293,y:77.708,w:18.933,h:1.33},
  {k:'discoloration_gray',t:'radio',p:1,x:18.984,y:82.506,w:2.755,h:1.948,g:'discoloration',v:'gray'},
  {k:'discoloration_yellow',t:'radio',p:1,x:29.702,y:82.506,w:2.755,h:1.948,g:'discoloration',v:'yellow'},
  {k:'discoloration_pink',t:'radio',p:1,x:41.042,y:82.506,w:2.755,h:1.948,g:'discoloration',v:'pink'},
  {k:'crownStatus_restorable',t:'radio',p:1,x:68.139,y:82.506,w:2.755,h:1.948,g:'crownStatus',v:'restorable'},
  {k:'crownStatus_norestorable',t:'radio',p:1,x:81.982,y:82.506,w:2.755,h:1.948,g:'crownStatus',v:'norestorable'},
  {k:'restoration_minimum',t:'radio',p:1,x:18.984,y:85.071,w:2.755,h:1.948,g:'restoration',v:'minimum'},
  {k:'restoration_large',t:'radio',p:1,x:33.23,y:85.071,w:2.755,h:1.948,g:'restoration',v:'large'},
  {k:'investigation',t:'text',p:2,x:18.362,y:16.627,w:71.432,h:1.663},
  {k:'dtToothNumber',t:'text',p:2,x:5.712,y:25.629,w:16.43,h:2.708},
  {k:'dtPocketDepth',t:'text',p:2,x:22.226,y:25.629,w:8.148,h:2.708},
  {k:'dtMobilityGrade',t:'text',p:2,x:30.458,y:25.629,w:8.786,h:2.708},
  {k:'dtCold',t:'text',p:2,x:39.328,y:25.629,w:8.232,h:2.708},
  {k:'dtHot',t:'text',p:2,x:47.644,y:25.629,w:10.5,h:2.708},
  {k:'dtPercussion',t:'text',p:2,x:58.228,y:25.629,w:11.81,h:2.708},
  {k:'dtPalpation',t:'text',p:2,x:70.122,y:25.629,w:11.81,h:2.708},
  {k:'dtCavityTest',t:'text',p:2,x:82.016,y:25.629,w:12.314,h:2.708},
  {k:'radiographicFinding',t:'text',p:2,x:25.082,y:28.029,w:68.055,h:1.663},
  {k:'pulpal_normal',t:'radio',p:2,x:16.262,y:33.705,w:2.755,h:1.948,g:'pulpal',v:'normal'},
  {k:'pulpal_reversible',t:'radio',p:2,x:31.634,y:33.705,w:2.755,h:1.948,g:'pulpal',v:'reversible'},
  {k:'pulpal_irreversible',t:'radio',p:2,x:49.693,y:33.705,w:2.755,h:1.948,g:'pulpal',v:'irreversible'},
  {k:'pulpal_necrosis',t:'radio',p:2,x:69.937,y:33.705,w:2.755,h:1.948,g:'pulpal',v:'necrosis'},
  {k:'pulpal_previousrct',t:'radio',p:2,x:81.109,y:33.705,w:2.755,h:1.948,g:'pulpal',v:'previousrct'},
  {k:'periapical_normal',t:'radio',p:2,x:18.614,y:36.295,w:2.755,h:1.948,g:'periapical',v:'normal'},
  {k:'periapical_symptomatic',t:'radio',p:2,x:35.548,y:36.295,w:2.755,h:1.948,g:'periapical',v:'symptomatic'},
  {k:'periapical_asymptomatic',t:'radio',p:2,x:56.296,y:36.295,w:2.755,h:1.948,g:'periapical',v:'asymptomatic'},
  {k:'periapical_acute',t:'radio',p:2,x:77.984,y:36.295,w:2.755,h:1.948,g:'periapical',v:'acute'},
  {k:'periapical2_chronic',t:'radio',p:2,x:14.532,y:38.872,w:2.755,h:1.948,g:'periapical2',v:'chronic'},
  {k:'periapical2_periodontitis1',t:'radio',p:2,x:33.986,y:38.872,w:2.755,h:1.948,g:'periapical2',v:'periodontitis1'},
  {k:'periapical2_periodontitis2',t:'radio',p:2,x:56.38,y:38.872,w:2.755,h:1.948,g:'periapical2',v:'periodontitis2'},
  {k:'periapical2_abscess1',t:'radio',p:2,x:72.625,y:38.872,w:2.755,h:1.948,g:'periapical2',v:'abscess1'},
  {k:'periapical2_abscess2',t:'radio',p:2,x:84.704,y:38.872,w:2.755,h:1.948,g:'periapical2',v:'abscess2'},
  {k:'treatmentPlan',t:'text',p:2,x:19.958,y:40.974,w:71.835,h:1.663},
  {k:'stepPreopDate',t:'text',p:2,x:44.452,y:48.587,w:11.642,h:2.078},
  {k:'stepPreopSig',t:'text',p:2,x:56.178,y:48.587,w:33.28,h:2.078},
  {k:'stepCariesRemovalDate',t:'text',p:2,x:44.452,y:50.665,w:11.642,h:2.078},
  {k:'stepCariesRemovalSig',t:'text',p:2,x:56.178,y:50.665,w:33.28,h:2.078},
  {k:'stepAccessOpeningDate',t:'text',p:2,x:44.452,y:52.743,w:11.642,h:2.078},
  {k:'stepAccessOpeningSig',t:'text',p:2,x:56.178,y:52.743,w:33.28,h:2.078},
  {k:'stepToothIsolationDate',t:'text',p:2,x:44.452,y:54.822,w:11.642,h:2.078},
  {k:'stepToothIsolationSig',t:'text',p:2,x:56.178,y:54.822,w:33.28,h:2.078},
  {k:'stepLocatingCanalDate',t:'text',p:2,x:44.452,y:56.9,w:11.642,h:2.078},
  {k:'stepLocatingCanalSig',t:'text',p:2,x:56.178,y:56.9,w:33.28,h:2.078},
  {k:'stepWorkingLengthDate',t:'text',p:2,x:44.452,y:58.979,w:11.642,h:2.078},
  {k:'stepWorkingLengthSig',t:'text',p:2,x:56.178,y:58.979,w:33.28,h:2.078},
  {k:'stepMasterConeDate',t:'text',p:2,x:44.452,y:61.057,w:11.642,h:2.078},
  {k:'stepMasterConeSig',t:'text',p:2,x:56.178,y:61.057,w:33.28,h:2.078},
  {k:'stepSealerMixDate',t:'text',p:2,x:44.452,y:63.135,w:11.642,h:2.078},
  {k:'stepSealerMixSig',t:'text',p:2,x:56.178,y:63.135,w:33.28,h:2.078},
  {k:'stepSpreaderDate',t:'text',p:2,x:44.452,y:65.214,w:11.642,h:2.09},
  {k:'stepSpreaderSig',t:'text',p:2,x:56.178,y:65.214,w:33.28,h:2.09},
  {k:'stepObturationDate',t:'text',p:2,x:44.452,y:67.304,w:11.642,h:2.078},
  {k:'stepObturationSig',t:'text',p:2,x:56.178,y:67.304,w:33.28,h:2.078},
  {k:'stepPostObturationDate',t:'text',p:2,x:44.452,y:69.382,w:11.642,h:2.078},
  {k:'stepPostObturationSig',t:'text',p:2,x:56.178,y:69.382,w:33.28,h:2.078},
  {k:'stepCoronalRestDate',t:'text',p:2,x:44.452,y:71.461,w:11.642,h:2.078},
  {k:'stepCoronalRestSig',t:'text',p:2,x:56.178,y:71.461,w:33.28,h:2.078},
  {k:'stepTotalDate',t:'text',p:2,x:44.452,y:73.539,w:11.642,h:2.078},
  {k:'stepTotalSig',t:'text',p:2,x:56.178,y:73.539,w:33.28,h:2.078},
  {k:'canal1Est',t:'text',p:2,x:23.486,y:78.527,w:22.78,h:1.722},
  {k:'canal1Corrected',t:'text',p:2,x:46.35,y:78.527,w:22.764,h:1.722},
  {k:'canal1MasterFile',t:'text',p:2,x:69.198,y:78.527,w:23.788,h:1.722},
  {k:'canal2Est',t:'text',p:2,x:23.486,y:80.249,w:22.78,h:1.758},
  {k:'canal2Corrected',t:'text',p:2,x:46.35,y:80.249,w:22.764,h:1.758},
  {k:'canal2MasterFile',t:'text',p:2,x:69.198,y:80.249,w:23.788,h:1.758},
  {k:'canal3Est',t:'text',p:2,x:23.486,y:82.007,w:22.78,h:1.722},
  {k:'canal3Corrected',t:'text',p:2,x:46.35,y:82.007,w:22.764,h:1.722},
  {k:'canal3MasterFile',t:'text',p:2,x:69.198,y:82.007,w:23.788,h:1.722},
  {k:'canal4Est',t:'text',p:2,x:23.486,y:83.729,w:22.78,h:1.746},
  {k:'canal4Corrected',t:'text',p:2,x:46.35,y:83.729,w:22.764,h:1.746},
  {k:'canal4MasterFile',t:'text',p:2,x:69.198,y:83.729,w:23.788,h:1.746},
  {k:'startingDate',t:'text',p:2,x:31.919,y:86.105,w:15.792,h:1.781},
  {k:'drName',t:'text',p:2,x:10.08,y:88.955,w:37.631,h:1.663},
  {k:'studentName',t:'text',p:2,x:63.268,y:86.342,w:28.559,h:1.663},
  {k:'group',t:'text',p:2,x:56.682,y:89.311,w:15.54,h:1.663},
  {k:'level',t:'text',p:2,x:63.604,y:91.093,w:28.123,h:1.781},
  {k:'tooth1',t:'check',p:2,x:6.048,y:7.435,w:5.493,h:4.757},
  {k:'tooth2',t:'check',p:2,x:11.541,y:7.435,w:5.493,h:4.757},
  {k:'tooth3',t:'check',p:2,x:17.035,y:7.435,w:5.493,h:4.757},
  {k:'tooth4',t:'check',p:2,x:22.528,y:7.435,w:5.493,h:4.757},
  {k:'tooth5',t:'check',p:2,x:28.022,y:7.435,w:5.493,h:4.757},
  {k:'tooth6',t:'check',p:2,x:33.515,y:7.435,w:5.493,h:4.757},
  {k:'tooth7',t:'check',p:2,x:39.009,y:7.435,w:5.493,h:4.757},
  {k:'tooth8',t:'check',p:2,x:44.502,y:7.435,w:5.493,h:4.757},
  {k:'tooth9',t:'check',p:2,x:49.996,y:7.435,w:5.493,h:4.757},
  {k:'tooth10',t:'check',p:2,x:55.489,y:7.435,w:5.493,h:4.757},
  {k:'tooth11',t:'check',p:2,x:60.983,y:7.435,w:5.493,h:4.757},
  {k:'tooth12',t:'check',p:2,x:66.476,y:7.435,w:5.493,h:4.757},
  {k:'tooth13',t:'check',p:2,x:71.97,y:7.435,w:5.493,h:4.757},
  {k:'tooth14',t:'check',p:2,x:77.463,y:7.435,w:5.493,h:4.757},
  {k:'tooth15',t:'check',p:2,x:82.957,y:7.435,w:5.493,h:4.757},
  {k:'tooth16',t:'check',p:2,x:88.45,y:7.435,w:5.493,h:4.757},
  {k:'tooth17',t:'check',p:2,x:6.048,y:12.191,w:5.493,h:4.757},
  {k:'tooth18',t:'check',p:2,x:11.541,y:12.191,w:5.493,h:4.757},
  {k:'tooth19',t:'check',p:2,x:17.035,y:12.191,w:5.493,h:4.757},
  {k:'tooth20',t:'check',p:2,x:22.528,y:12.191,w:5.493,h:4.757},
  {k:'tooth21',t:'check',p:2,x:28.022,y:12.191,w:5.493,h:4.757},
  {k:'tooth22',t:'check',p:2,x:33.515,y:12.191,w:5.493,h:4.757},
  {k:'tooth23',t:'check',p:2,x:39.009,y:12.191,w:5.493,h:4.757},
  {k:'tooth24',t:'check',p:2,x:44.502,y:12.191,w:5.493,h:4.757},
  {k:'tooth25',t:'check',p:2,x:49.996,y:12.191,w:5.493,h:4.757},
  {k:'tooth26',t:'check',p:2,x:55.489,y:12.191,w:5.493,h:4.757},
  {k:'tooth27',t:'check',p:2,x:60.983,y:12.191,w:5.493,h:4.757},
  {k:'tooth28',t:'check',p:2,x:66.476,y:12.191,w:5.493,h:4.757},
  {k:'tooth29',t:'check',p:2,x:71.97,y:12.191,w:5.493,h:4.757},
  {k:'tooth30',t:'check',p:2,x:77.463,y:12.191,w:5.493,h:4.757},
  {k:'tooth31',t:'check',p:2,x:82.957,y:12.191,w:5.493,h:4.757},
  {k:'tooth32',t:'check',p:2,x:88.45,y:12.191,w:5.493,h:4.757}
  ];


  function csField(label, inputHtml) { return '<div class="field"><label>' + esc(label) + '</label>' + inputHtml + '</div>'; }
  function csSelect(fieldKey, options, placeholder) {
    return '<select data-field="' + fieldKey + '"><option value="">' + esc(placeholder || '—') + '</option>' +
      options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  var CS_YESNO = [['yes', 'Yes'], ['no', 'No']];
  function csCheck(fieldKey, label) { return '<label class="cs-check"><input type="checkbox" data-field="' + fieldKey + '" /> ' + esc(label) + '</label>'; }
  function csSection(title, bodyHtml) { return '<div class="cs-block"><h3 class="cs-sec-title">' + esc(title) + '</h3>' + bodyHtml + '</div>'; }
  // خيار مفرد (Radio) لحقول يُختار فيها قيمة واحدة فقط — نفس مظهر csCheck تماماً (شكل موحّد)، بأزرار radio بدل checkbox.
  function csRadioGroup(fieldKey, options) {
    return '<div class="cs-check-row">' + options.map(function (o, i) {
      var id = 'rb_' + fieldKey + '_' + i;
      return '<label class="cs-check" for="' + esc(id) + '"><input type="radio" id="' + esc(id) + '" name="' + esc(fieldKey) + '" data-field="' + esc(fieldKey) + '" value="' + esc(o[0]) + '" /> ' + esc(o[1]) + '</label>';
    }).join('') + '</div>';
  }
  // شبكة إضافة/معاينة الصور — معمَّمة على أي مصفوفة CS_PHOTO_SLOTS(_*) تُمرَّر لها، لإعادة استخدامها لأي قالب كاسشيت جديد.
  function csPhotoGridHTML(slots) {
    return '<div class="cs-photo-grid">' + slots.map(function (s) {
      return '<div class="cs-photo-slot" data-slot-box="' + s.key + '">' +
        '<div class="cs-photo-thumb" id="csThumb_' + s.key + '"></div>' +
        '<div class="cs-photo-label">' + esc(s.label) + '</div>' +
        '<div class="cs-photo-actions">' +
          '<button type="button" class="card-btn" data-act="cs-photo-add" data-slot="' + s.key + '">📷 إضافة</button>' +
          '<button type="button" class="card-btn del" data-act="cs-photo-del" data-slot="' + s.key + '">✕ إزالة</button>' +
        '</div>' +
        '<input type="file" accept="image/*" id="csPhotoInput_' + s.key + '" data-slot-input="' + s.key + '" hidden />' +
      '</div>';
    }).join('') + '</div>';
  }
  // جدول التقييم الخاص بكاسشيت Operative Dentistry — بطاقات متجاوبة (لا جدول HTML) لتبقى مريحة على شاشة الهاتف.
  var CS_EVAL_ROWS = [
    ['diagPrep', 'Diagnosis & Preparation'],
    ['restQuality', 'Restoration Quality'],
    ['infectionControl', 'Infection Control'],
    ['occlusionFinishing', 'Occlusion & Finishing'],
    ['attitude', 'Attitude & Communication'],
    ['total', 'Total']
  ];
  function csEvalTableHTML() {
    return '<div class="cs-eval-wrap">' +
      '<div class="cs-eval-row cs-eval-head"><span class="cs-eval-crit">criteria</span><span class="cs-eval-cell">Mark /</span><span class="cs-eval-cell">Mark</span></div>' +
      CS_EVAL_ROWS.map(function (r) {
        return '<div class="cs-eval-row"><span class="cs-eval-crit">' + esc(r[1]) + '</span>' +
          '<input type="text" inputmode="decimal" class="cs-eval-input" data-field="eval_' + r[0] + '_of" placeholder="/" />' +
          '<input type="text" inputmode="decimal" class="cs-eval-input" data-field="eval_' + r[0] + '_mark" placeholder="—" />' +
        '</div>';
      }).join('') +
    '</div>';
  }

  function buildCasesheetFormHTML() {
    return (
      csSection('بيانات عامة (General)',
        csField('Student Name', '<input type="text" data-field="studentName" />') +
        csField('Level', csSelect('level', [['4th', '4th Year'], ['5th', '5th Year']], '—')) +
        csField('Clinic Date', '<input type="date" data-field="clinicDate" />') +
        csField('Supervisor of starting', '<input type="text" data-field="supervisorStart" />')
      ) +
      csSection('بيانات المريض (Patient Data)',
        csField('Patient Name', '<input type="text" data-field="patientName" />') +
        '<div class="grid-2">' + csField('Gender', csSelect('gender', [['M', 'Male'], ['F', 'Female']], '—')) + csField('Age', '<input type="number" min="0" data-field="age" />') + '</div>' +
        csField('Occupation', '<input type="text" data-field="occupation" />') +
        csField('Address', '<input type="text" data-field="address" />') +
        '<div class="grid-2">' + csField('Marital status', '<input type="text" data-field="maritalStatus" />') + csField('Phone No', '<input type="tel" data-field="phone" />') + '</div>' +
        csField('Chief Complaint', '<textarea data-field="chiefComplaint" rows="2"></textarea>')
      ) +
      csSection('Medical History',
        '<div class="cs-check-row">' + csCheck('healthy', 'Healthy') + '</div>' +
        csField('Chronic diseases', '<input type="text" data-field="chronic" />') +
        csField('Current medications', '<input type="text" data-field="meds" />') +
        '<div class="grid-2">' + csField('Allergies', csSelect('allergies', CS_YESNO, '—')) + csField('If yes, details', '<input type="text" data-field="allergiesDetail" />') + '</div>'
      ) +
      csSection('Dental History',
        csField('Last dental visit', '<input type="text" data-field="lastVisit" />') +
        '<div class="grid-2">' + csField('Past extractions or oral surgeries', csSelect('pastExtractions', CS_YESNO, '—')) + csField('Complications in previous treatments', csSelect('complications', CS_YESNO, '—')) + '</div>' +
        csField('Oral hygiene habits', csSelect('hygiene', [['good', 'Good'], ['fair', 'Fair'], ['poor', 'Poor']], '—'))
      ) +
      csSection('Extraoral Examination',
        '<div class="grid-2">' + csField('Swelling', csSelect('swelling', CS_YESNO, '—')) + csField('Facial symmetry', csSelect('symmetry', [['normal', 'Normal'], ['asym', 'Asymmetrical']], '—')) + '</div>' +
        '<div class="grid-2">' + csField('Lymph nodes', csSelect('lymph', [['normal', 'Normal'], ['enlarged', 'Enlarged']], '—')) + csField('TMJ', csSelect('tmj', [['normal', 'Normal'], ['clicking', 'Clicking'], ['tender', 'Tenderness']], '—')) + '</div>'
      ) +
      csSection('Intraoral Examination',
        '<div class="grid-2">' + csField('Mucosa', csSelect('mucosa', [['normal', 'Normal'], ['lesions', 'Lesions']], '—')) + csField('Tooth involved', '<input type="text" data-field="toothInvolved" />') + '</div>' +
        '<div class="grid-2">' + csField('Tender on percussion', csSelect('percussion', CS_YESNO, '—')) + csField('Mobility', csSelect('mobility', CS_YESNO, '—')) + '</div>' +
        '<div class="grid-2">' + csField('Sinus tract or pus discharge', csSelect('sinus', CS_YESNO, '—')) + csField('Trismus', csSelect('trismus', CS_YESNO, '—')) + '</div>' +
        csField('Other findings', '<input type="text" data-field="otherFindings" />')
      ) +
      csSection('Radiographic Findings',
        '<div class="cs-check-row">' + csCheck('rxPeriapical', 'Periapical') + csCheck('rxOpg', 'OPG') + csCheck('rxCbct', 'CBCT') + '</div>' +
        csField('Findings', '<textarea data-field="rxFindings" rows="2"></textarea>')
      ) +
      csSection('Final Diagnosis', csField('', '<textarea data-field="diagnosis" rows="2"></textarea>')) +
      csSection('Planned Procedure',
        '<div class="cs-check-row">' + csCheck('procSimpleExt', 'Simple extraction') + csCheck('procSurgicalExt', 'Surgical extraction') + csCheck('procIncision', 'Incision & drainage') +
          csCheck('procCyst', 'Cyst enucleation') + csCheck('procBiopsy', 'Biopsy') + csCheck('procSoftTissue', 'Soft tissue surgery') + '</div>' +
        '<div class="grid-2">' + csField('Tooth/Area', '<input type="text" data-field="procTooth" />') + csField('Type of anesthesia', '<input type="text" data-field="anesthesia" />') + '</div>'
      ) +
      csSection('Post-operative instructions',
        '<div class="cs-check-row">' + csCheck('poPain', 'Pain control (analgesics)') + csCheck('poBleeding', 'Bleeding control (gauze bite)') + csCheck('poCold', 'Cold compress (first 24 hrs)') +
          csCheck('poHygiene', 'Oral hygiene (gentle brushing, no rinsing 24 hrs)') + csCheck('poDiet', 'Soft diet') + csCheck('poSmoking', 'Avoid smoking and spitting') + '</div>' +
        csField('Follow-up after (days)', '<input type="number" min="0" data-field="followupDays" />') +
        csField('Additional notes', '<textarea data-field="postOpNotes" rows="2"></textarea>')
      ) +
      csSection('Supervisor Notes', csField('', '<textarea data-field="supervisorNotes" rows="2"></textarea>')) +
      csSection('Photographs',
        '<div class="cs-photo-grid">' + CS_PHOTO_SLOTS.map(function (s) {
          return '<div class="cs-photo-slot" data-slot-box="' + s.key + '">' +
            '<div class="cs-photo-thumb" id="csThumb_' + s.key + '"></div>' +
            '<div class="cs-photo-label">' + esc(s.label) + '</div>' +
            '<div class="cs-photo-actions">' +
              '<button type="button" class="card-btn" data-act="cs-photo-add" data-slot="' + s.key + '">📷 إضافة</button>' +
              '<button type="button" class="card-btn del" data-act="cs-photo-del" data-slot="' + s.key + '">✕ إزالة</button>' +
            '</div>' +
            '<input type="file" accept="image/*" id="csPhotoInput_' + s.key + '" data-slot-input="' + s.key + '" hidden />' +
          '</div>';
        }).join('') + '</div>'
      )
    );
  }

  // كاسشيت Operative Dentistry — نفس ترتيب وحقول الملف المرجعي حرفياً بدءاً من Student Name وحتى Photographs.
  function buildOperativeFormHTML() {
    return (
      csSection('بيانات عامة (General)',
        csField('Student Name', '<input type="text" data-field="studentName" />') +
        csField('Level', csRadioGroup('level', [['4th', '4th Year'], ['5th', '5th Year']])) +
        csField('Clinic Date', '<input type="date" data-field="clinicDate" />') +
        csField('Supervisor of starting', '<input type="text" data-field="supervisorStart" />')
      ) +
      csSection('بيانات المريض (Patient Data)',
        csField('Patient Name', '<input type="text" data-field="patientName" />') +
        '<div class="grid-2">' + csField('Gender', csRadioGroup('gender', [['M', 'Male'], ['F', 'Female']])) + csField('Age', '<input type="number" min="0" data-field="age" />') + '</div>' +
        csField('Occupation', '<input type="text" data-field="occupation" />') +
        csField('Address', '<input type="text" data-field="address" />') +
        '<div class="grid-2">' + csField('Marital status', '<input type="text" data-field="maritalStatus" />') + csField('Phone No', '<input type="tel" data-field="phone" />') + '</div>' +
        csField('Chief Complaint', '<textarea data-field="chiefComplaint" rows="2"></textarea>')
      ) +
      csSection('Medical History',
        '<div class="cs-check-row">' + csCheck('healthy', 'Healthy') + '</div>' +
        csField('Chronic diseases', '<input type="text" data-field="chronic" />') +
        csField('Current medications', '<input type="text" data-field="meds" />') +
        csField('Allergies', csRadioGroup('allergies', CS_YESNO)) +
        csField('If yes, details', '<input type="text" data-field="allergiesDetail" />')
      ) +
      csSection('Dental History',
        csField('Previous restorations', csRadioGroup('prevRestorations', CS_YESNO)) +
        csField('History of sensitivity/pain', csRadioGroup('sensitivityHistory', CS_YESNO)) +
        csField('Oral hygiene', csRadioGroup('hygiene', [['good', 'Good'], ['fair', 'Fair'], ['poor', 'Poor']]))
      ) +
      csSection('Clinical Examination',
        csField('Tooth involved', '<input type="text" data-field="toothInvolved" />') +
        csField('Caries type', csRadioGroup('cariesType', [['I', 'Class I'], ['II', 'Class II'], ['III', 'Class III'], ['IV', 'Class IV'], ['V', 'Class V'], ['VI', 'Class VI']])) +
        csField('Caries depth', csRadioGroup('cariesDepth', [['enamel', 'Enamel'], ['dentin', 'Dentin'], ['pulpal', 'Pulpal']])) +
        csField('Cavity walls condition', csRadioGroup('cavityWalls', [['sound', 'Sound'], ['weak', 'Weak']])) +
        csField('Presence of old restoration', csRadioGroup('oldRestoration', CS_YESNO)) +
        csField('Fracture or marginal defects', csRadioGroup('fractureDefects', CS_YESNO)) +
        csField('Pain on percussion', csRadioGroup('painPercussion', CS_YESNO)) +
        csField('Pulp vitality', csRadioGroup('pulpVitality', [['normal', 'Normal'], ['reversible', 'Reversible pulpitis'], ['irreversible', 'Irreversible'], ['necrotic', 'Necrotic']]))
      ) +
      csSection('Radiographic Findings',
        '<div class="cs-check-row">' + csCheck('rxPeriapical', 'Periapical') + csCheck('rxBitewing', 'Bitewing') + '</div>' +
        csField('Findings', '<input type="text" data-field="rxFindings" />')
      ) +
      csSection('Final Diagnosis', csField('', '<textarea data-field="diagnosis" rows="2"></textarea>')) +
      csSection('Planned Procedure',
        '<div class="cs-check-row">' + csCheck('procComposite', 'Composite restoration') + csCheck('procGic', 'GIC filling') + csCheck('procAmalgam', 'Amalgam restoration') + '</div>' +
        '<div class="cs-check-row">' + csCheck('procLinerBase', 'Liner / Base applied') + csCheck('procTemporary', 'Temporary filling') + csCheck('procReferral', 'Referral to endo / perio') + '</div>'
      ) +
      csSection('Final Restoration Details',
        csField('Tooth #', '<input type="text" data-field="frTooth" />') +
        csField('Material used', csRadioGroup('frMaterial', [['composite', 'Composite'], ['gic', 'GIC'], ['amalgam', 'Amalgam']])) +
        csField('Isolation method', csRadioGroup('frIsolation', [['cotton', 'Cotton rolls'], ['rubberdam', 'Rubber dam']])) +
        csField('Cavity liner/base', csRadioGroup('frLinerBase', CS_YESNO)) +
        csField('Matrix band used', csRadioGroup('frMatrixBand', CS_YESNO)) +
        csField('Occlusion checked', csRadioGroup('frOcclusion', CS_YESNO)) +
        csField('Polishing done', csRadioGroup('frPolishing', CS_YESNO))
      ) +
      csSection('Supervisor Notes', csField('', '<textarea data-field="supervisorNotes" rows="2"></textarea>')) +
      csSection('جدول التقييم (Evaluation)',
        csEvalTableHTML() +
        '<div class="grid-2" style="margin-top:14px">' +
          csField('Supervisor\u2019s Name', '<input type="text" data-field="evalSupervisorName" />') +
          csField('Supervisor\u2019s Signature', '<input type="text" data-field="evalSupervisorSignature" />') +
        '</div>'
      ) +
      csSection('Photographs', csPhotoGridHTML(CS_PHOTO_SLOTS_OPERATIVE))
    );
  }

  /* ============================================================
     كاسشيت Genius — Endodontic case sheet: عارض overlay
     صورتا الصفحتين الأصليتين هما القالب البصري الثابت (لا يُعاد تصميمه)،
     وفوقهما حقول إدخال/دوائر اختيار حقيقية (input) بمواضع دقيقة % مأخوذة من GE_FIELDS،
     لذا يعمل معها نظام الحفظ/الاسترجاع العام (collectCasesheetForm/fillCasesheetForm) دون أي كود إضافي.
     ============================================================ */
  function geFieldHTML(f) {
    var style = 'left:' + f.x + '%;top:' + f.y + '%;width:' + f.w + '%;height:' + f.h + '%;';
    if (f.t === 'text') {
      return '<input type="text" class="ge-field text" data-field="' + f.k + '" autocomplete="off" autocapitalize="off" spellcheck="false" style="' + style + '" />';
    }
    var extraCls = (f.t === 'cell') ? ' cell' : (f.k.indexOf('tooth') === 0 ? ' tooth' : '');
    if (f.t === 'radio') {
      return '<input type="radio" class="ge-field tap' + extraCls + '" name="' + f.g + '" data-field="' + f.g + '" value="' + esc(f.v) + '" style="' + style + '" />';
    }
    return '<input type="checkbox" class="ge-field tap' + extraCls + '" data-field="' + f.k + '" style="' + style + '" />';
  }
  function buildGeniusEndodonticFormHTML() {
    var p1 = GE_FIELDS.filter(function (f) { return f.p === 1; }).map(geFieldHTML).join('');
    var p2 = GE_FIELDS.filter(function (f) { return f.p === 2; }).map(geFieldHTML).join('');
    return (
      '<div class="ge-toolbar">' +
        '<button type="button" class="card-btn" data-act="ge-prev">‹ السابقة</button>' +
        '<span class="ge-pageind" id="gePageInd">صفحة 1 / 2</span>' +
        '<button type="button" class="card-btn" data-act="ge-next">التالية ›</button>' +
        '<button type="button" class="card-btn" data-act="ge-zoomreset">↺ إعادة الضبط</button>' +
      '</div>' +
      '<div class="ge-wrap" id="geWrap">' +
        '<div class="ge-stage" id="geStage">' +
          '<div class="ge-page" id="gePage1" data-page="1" style="background-image:url(genius-endo-p1.jpg)">' + p1 + '</div>' +
          '<div class="ge-page" id="gePage2" data-page="2" hidden style="background-image:url(genius-endo-p2.jpg)">' + p2 + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="ge-hint">اضغط داخل أي خانة للكتابة، أو على الدائرة/المربع للتحديد — استخدم إصبعين للتكبير والتحريك.</p>'
    );
  }
  var geZoom = { scale: 1, tx: 0, ty: 0, page: 1 };
  function geApplyTransform() {
    var stage = document.getElementById('geStage');
    if (stage) stage.style.transform = 'translate(' + geZoom.tx + 'px,' + geZoom.ty + 'px) scale(' + geZoom.scale + ')';
  }
  function geResetZoom() { geZoom.scale = 1; geZoom.tx = 0; geZoom.ty = 0; geApplyTransform(); }
  function geShowPage(n) {
    geZoom.page = n;
    var p1 = document.getElementById('gePage1'), p2 = document.getElementById('gePage2');
    if (p1) p1.hidden = (n !== 1);
    if (p2) p2.hidden = (n !== 2);
    var ind = document.getElementById('gePageInd'); if (ind) ind.textContent = 'صفحة ' + n + ' / 2';
    geResetZoom();
  }
  function geNextPage() { if (geZoom.page < 2) geShowPage(geZoom.page + 1); }
  function gePrevPage() { if (geZoom.page > 1) geShowPage(geZoom.page - 1); }
  function initGeGestures() {
    var wrap = document.getElementById('geWrap');
    if (!wrap) return;
    var pts = {}, startDist = 0, startScale = 1, panLast = null;
    function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    wrap.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.ge-field')) return; // اترك حقول الكتابة/الاختيار تعمل بسلوكها الطبيعي دون التقاط المؤشر
      try { wrap.setPointerCapture(e.pointerId); } catch (err) {}
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 2) { startDist = dist(pts[ids[0]], pts[ids[1]]); startScale = geZoom.scale; }
      else if (ids.length === 1) { panLast = { x: e.clientX, y: e.clientY }; }
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var d = dist(pts[ids[0]], pts[ids[1]]);
        if (startDist > 0) { geZoom.scale = Math.min(4, Math.max(1, startScale * (d / startDist))); geApplyTransform(); }
      } else if (ids.length === 1 && panLast && geZoom.scale > 1.02) {
        var dx = e.clientX - panLast.x, dy = e.clientY - panLast.y;
        geZoom.tx += dx; geZoom.ty += dy; panLast = { x: e.clientX, y: e.clientY };
        geApplyTransform();
      }
    });
    function endPt(e) { delete pts[e.pointerId]; var ids = Object.keys(pts); if (ids.length < 2) startDist = 0; if (ids.length === 0) panLast = null; }
    wrap.addEventListener('pointerup', endPt);
    wrap.addEventListener('pointercancel', endPt);
    wrap.addEventListener('pointerleave', endPt);
    // عجلة الفأرة (سطح المكتب فقط) لتسهيل الاختبار خارج الجوال
    wrap.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      geZoom.scale = Math.min(4, Math.max(1, geZoom.scale - e.deltaY * 0.0015));
      geApplyTransform();
    }, { passive: false });
  }

  function collectCasesheetForm() {
    var data = {};
    document.querySelectorAll('#csFormBody [data-field]').forEach(function (el) {
      var k = el.dataset.field;
      if (el.type === 'checkbox') data[k] = el.checked;
      else if (el.type === 'radio') { if (el.checked) data[k] = el.value; else if (!(k in data)) data[k] = ''; }
      else data[k] = el.value;
    });
    return data;
  }
  function fillCasesheetForm(data) {
    data = data || {};
    document.querySelectorAll('#csFormBody [data-field]').forEach(function (el) {
      var k = el.dataset.field, v = data[k];
      if (el.type === 'checkbox') el.checked = !!v;
      else if (el.type === 'radio') el.checked = (v !== undefined && v !== null && String(v) === el.value);
      else el.value = (v === undefined || v === null) ? '' : v;
    });
  }
  function refreshCasesheetPhotos() {
    csPhotoSlotsFor(currentCsTemplate).forEach(function (s) {
      var box = document.getElementById('csThumb_' + s.key); if (!box) return;
      var p = currentCsPhotos[s.key];
      box.innerHTML = p ? '<img src="' + p.dataUrl + '" alt="" />' : '<span class="cs-photo-empty">لا توجد صورة</span>';
    });
  }
  function triggerCasesheetPhoto(slot) { var inp = document.getElementById('csPhotoInput_' + slot); if (inp) inp.click(); }
  function handleCasesheetPhotoChange(slot, file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      currentCsPhotos[slot] = { name: file.name, type: file.type, dataUrl: reader.result };
      refreshCasesheetPhotos();
    };
    reader.readAsDataURL(file);
  }
  function removeCasesheetPhoto(slot) { delete currentCsPhotos[slot]; refreshCasesheetPhotos(); }

  function renderCasesheets() {
    var uniKey = currentCsUni || 'jazeera';
    var visibleKeys = Object.keys(CS_TEMPLATES).filter(function (k) { return CS_TEMPLATES[k].universities.indexOf(uniKey) >= 0; });
    var tplCards = visibleKeys.map(function (key) {
      var tpl = CS_TEMPLATES[key];
      return '<button type="button" class="dash-card accent' + (key === 'operative-dentistry' ? '2' : '') + '" data-act="cs-new" data-template="' + key + '" style="width:100%">' +
        '<span class="dash-emoji icon-svg">' + tpl.icon + '</span><span class="dash-title">' + esc(tpl.name) + '</span><span class="dash-sub">' + esc(tpl.sub) + '</span></button>';
    }).join('<div style="height:10px"></div>');
    var saved = casesheets.filter(function (s) { return visibleKeys.indexOf(s.template) >= 0; })
      .sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    var savedHtml = saved.length
      ? '<h3 class="sub-h" style="margin-top:18px">📁 الكاسشيتات المحفوظة</h3><div class="rows">' + saved.map(csRow).join('') + '</div>'
      : '';
    if (els.csTemplates) els.csTemplates.innerHTML = tplCards + savedHtml;
  }
  function csRow(sheet) {
    var d = sheet.data || {};
    return '<div class="dp-pfile row">' +
      '<span class="row-no">📄</span>' +
      '<div class="row-main">' +
        '<div class="row-name">' + esc(d.patientName || 'بدون اسم مريض') + '</div>' +
        '<div class="row-line">' + esc(d.studentName || '—') + ' — ' + esc(CS_TEMPLATES[sheet.template] ? CS_TEMPLATES[sheet.template].name : sheet.template) + '</div>' +
        '<div class="row-appt">' + esc(fmtDate(sheet.updatedAt || sheet.createdAt)) + '</div>' +
      '</div>' +
      '<button type="button" class="req-del" data-act="cs-del" data-id="' + sheet.id + '" title="حذف الكاسشيت">✕</button>' +
      '<button type="button" class="row-open" data-act="cs-open" data-id="' + sheet.id + '" title="فتح الكاسشيت">📂</button>' +
    '</div>';
  }
  // param id: معرّف كاسشيت محفوظ لفتحه للتعديل. عند إنشاء كاسشيت جديد id=null ويُستخدم template لتحديد القالب.
  function openCasesheetForm(id, template) {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    var hashParam = id ? id : ('new:' + (template || 'jazeera-oral-surgery'));
    location.hash = 'csform/' + hashParam; applyRoute();
  }
  function renderCasesheetForm(param) {
    var isNew = !param || param === 'new' || param.indexOf('new:') === 0;
    var newTemplate = isNew ? (param && param.indexOf('new:') === 0 ? param.slice(4) : 'jazeera-oral-surgery') : null;
    var sheet = !isNew ? casesheets.find(function (x) { return x.id === param; }) : null;
    var tplKey = sheet ? sheet.template : newTemplate;
    if (!CS_TEMPLATES[tplKey]) tplKey = 'jazeera-oral-surgery';
    currentCsId = sheet ? sheet.id : null;
    currentCsTemplate = tplKey;
    currentCsPhotos = sheet && sheet.photos ? Object.assign({}, sheet.photos) : {};
    if (els.csTitle) els.csTitle.textContent = sheet ? 'تعديل الكاسشيت' : 'كاسشيت جديد — ' + (CS_TEMPLATES[tplKey].name);
    if (els.csFormBody) {
      els.csFormBody.innerHTML =
        (tplKey === 'genius-endodontic') ? buildGeniusEndodonticFormHTML() :
        (tplKey === 'operative-dentistry') ? buildOperativeFormHTML() : buildCasesheetFormHTML();
      fillCasesheetForm(sheet ? sheet.data : {});
      refreshCasesheetPhotos();
      // مستمعات ملفات الصور (خاصة بهذا الرسم فقط، لا تتراكم لأن innerHTML يُستبدل بالكامل في كل مرة)
      csPhotoSlotsFor(tplKey).forEach(function (s) {
        var inp = document.getElementById('csPhotoInput_' + s.key);
        if (inp) inp.addEventListener('change', function (e) { handleCasesheetPhotoChange(s.key, e.target.files && e.target.files[0]); e.target.value = ''; });
      });
      if (tplKey === 'genius-endodontic') { geShowPage(1); initGeGestures(); }
    }
  }
  function saveCasesheetFromForm() {
    var data = collectCasesheetForm();
    var nameEl = document.querySelector('#csFormBody [data-field="patientName"]');
    if (!data.patientName || !data.patientName.trim()) {
      if (nameEl) { nameEl.classList.add('invalid'); nameEl.focus(); }
      toast('يرجى إدخال اسم المريض على الأقل قبل الحفظ'); return;
    }
    if (nameEl) nameEl.classList.remove('invalid');
    if (currentCsId) {
      var i = casesheets.findIndex(function (x) { return x.id === currentCsId; });
      if (i >= 0) casesheets[i] = Object.assign({}, casesheets[i], { data: data, photos: currentCsPhotos, updatedAt: new Date().toISOString() });
    } else {
      var sheet = { id: uid(), template: currentCsTemplate, data: data, photos: currentCsPhotos, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      casesheets.unshift(sheet); currentCsId = sheet.id;
    }
    saveCasesheets(); toast('تم حفظ الكاسشيت');
  }
  function deleteCasesheet(id) {
    confirmAsk({ title: 'حذف الكاسشيت', text: 'هل تريد حذف هذا الكاسشيت؟', okLabel: 'حذف', onOk: function () {
      casesheets = casesheets.filter(function (x) { return x.id !== id; }); saveCasesheets();
      if (currentView === 'csform' && currentCsId === id) go('casesheets'); else renderCasesheets();
      toast('تم حذف الكاسشيت');
    } });
  }

  /* ---------- طباعة/معاينة الكاسشيت عبر صفحة القالب المستقلة case-sheet-print.html ----------
     لا نطبع DOM التطبيق إطلاقاً ولا نعتمد على @media print فوق واجهة التطبيق:
     نُسلّم بيانات الكاسشيت عبر مفتاح مؤقت ثم نفتح صفحة القالب الورقي المستقلة تماماً،
     والطباعة تتم من داخل تلك الصفحة نفسها (التي لا تحتوي أي عنصر من واجهة التطبيق). */
  var CS_PRINT_HANDOFF_KEY = 'dentpilot_student_cs_print_v1';
  function openCasesheetPrintPage(autoprint) {
    try {
      localStorage.setItem(CS_PRINT_HANDOFF_KEY, JSON.stringify({ template: currentCsTemplate, data: collectCasesheetForm(), photos: currentCsPhotos }));
    } catch (e) { toast('تعذر تجهيز بيانات الطباعة — قد تكون الصور كبيرة جداً'); return; }
    var w = null;
    try { w = window.open('case-sheet-print.html' + (autoprint ? '?print=1' : ''), '_blank'); } catch (e) {}
    if (!w) toast('يرجى السماح بفتح النوافذ لعرض قالب الطباعة');
  }
  function previewCasesheetLive() { openCasesheetPrintPage(false); }
  function printCasesheetLive() { openCasesheetPrintPage(true); }

  /* ---------- Completed archive ---------- */
  function renderCompleted() {
    var list = completedCases().slice().sort(function (a, b) {
      var at = a.completedAt || a.createdAt || '', bt = b.completedAt || b.createdAt || '';
      return at < bt ? 1 : (at > bt ? -1 : 0); // الأحدث أولاً
    });
    if (list.length === 0) { els.completedList.innerHTML = ''; els.completedEmpty.hidden = false; return; }
    els.completedEmpty.hidden = true;
    els.completedList.innerHTML = list.map(function (c, i) { return caseRow(c, i + 1, { showRestore: true }); }).join('');
  }
  function completeCase(id) {
    var c = cases.find(function (x) { return x.id === id; }); if (!c) return;
    confirmAsk({ title: T('إنهاء الحالة'), text: T('تعيين حالة') + ' «' + esc(c.name) + '» ' + T('كمكتملة؟ يمكنك إرجاعها لاحقاً من قسم الحالات المكتملة.'), okLabel: T('إنهاء الحالة'), danger: false,
      onOk: function () {
        c.status = 'مكتملة'; if (!c.completedAt) c.completedAt = new Date().toISOString();
        saveCases(); if (window.DPSync) window.DPSync.markCaseDirty(id); refresh(); toast(T('تم إنهاء الحالة'));
      } });
  }
  function restoreCase(id) {
    var c = cases.find(function (x) { return x.id === id; }); if (!c) return;
    confirmAsk({ title: T('إرجاع الحالة'), text: T('إرجاع الحالة') + ' «' + esc(c.name) + '» ' + T('إلى الحالات الحالية؟'), okLabel: T('إرجاع'), danger: false,
      onOk: function () {
        c.status = 'قيد العمل';           // إرجاعها لحالة نشطة/قيد العمل
        if ('completedAt' in c) delete c.completedAt;
        saveCases(); if (window.DPSync) window.DPSync.markCaseDirty(id); refresh(); toast(T('تم إرجاع الحالة إلى الحالات الحالية'));
      } });
  }

  function saveNotes(id) {
    var c = cases.find(function (x) { return x.id === id; }); if (!c) return;
    var ta = $('caseNotes'); if (!ta) return;
    c.notes = ta.value; saveCases(); if (window.DPSync) window.DPSync.markCaseDirty(id); toast(T('تم حفظ الملاحظات'));
  }

  /* ---------- Attachments helper (per-case) ---------- */
  function attListFor(caseId) { return attachments[caseId] || []; }

  /* ---------- Cases by subject/material ---------- */
  var NO_SUBJECT = 'بدون مادة محددة';
  var NO_SUBJECT_EN = 'No subject specified';
  function noSubjectLabel() { return appLang === 'en' ? NO_SUBJECT_EN : NO_SUBJECT; }
  function subjectGroups() {
    var groups = {}, order = [];
    cases.forEach(function (c) {   // تشمل الحالات المكتملة أيضاً (لا يُستبعدن من ترتيب المادة)
      var k = (c.department && String(c.department).trim()) ? String(c.department).trim() : NO_SUBJECT;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(c);
    });
    order.sort(function (a, b) {
      if (a === NO_SUBJECT) return 1; if (b === NO_SUBJECT) return -1;
      var ia = DEPTS.indexOf(a), ib = DEPTS.indexOf(b);
      ia = ia < 0 ? 999 : ia; ib = ib < 0 ? 999 : ib;
      return ia - ib || (a < b ? -1 : (a > b ? 1 : 0));
    });
    return { groups: groups, order: order };
  }
  function renderBySubject() {
    if (cases.length === 0) { els.bySubjectList.innerHTML = ''; els.bySubjectEmpty.hidden = false; return; }
    els.bySubjectEmpty.hidden = true;
    var g = subjectGroups();
    var isEn = appLang === 'en';
    els.bySubjectList.innerHTML = g.order.map(function (k) {
      var label = (k === NO_SUBJECT) ? noSubjectLabel() : deptLabel(k);
      var n = g.groups[k].length;
      return '<button type="button" class="subj-strip" data-act="subject-open" data-key="' + encodeURIComponent(k) + '">' +
        '<span class="subj-strip-bar"></span>' +
        '<span class="subj-strip-main"><span class="subj-strip-name">' + esc(label) + '</span><span class="subj-strip-count">' + n + (isEn ? (' ' + (n === 1 ? 'case' : 'cases')) : ' حالة') + '</span></span>' +
        '<span class="subj-strip-btn">' + T('عرض الحالات') + ' ›</span>' +
      '</button>';
    }).join('');
  }
  function openSubject(keyEncoded) { location.hash = 'subject/' + keyEncoded; applyRoute(); }
  function renderSubjectCases(key) {
    var label = (key === NO_SUBJECT) ? noSubjectLabel() : deptLabel(key);
    if (els.subjectTitle) els.subjectTitle.textContent = '📋 ' + T('حالات') + ' ' + label;
    var list = cases.filter(function (c) {
      var k = (c.department && String(c.department).trim()) ? String(c.department).trim() : NO_SUBJECT;
      return k === key;
    }).sort(caseSort);
    if (list.length === 0) { els.subjectList.innerHTML = ''; els.subjectEmpty.hidden = false; return; }
    els.subjectEmpty.hidden = true;
    els.subjectList.innerHTML = list.map(function (c, i) { return caseRow(c, i + 1); }).join('');
  }
  function attCard(a, c, showCase) {
    var isImg = (a.type || '').indexOf('image/') === 0;
    var thumb = (isImg && a.dataUrl)
      ? '<button type="button" class="att-thumb clickable" data-act="att-open" data-id="' + c.id + '" data-att="' + a.id + '"><img src="' + a.dataUrl + '" alt="' + esc(a.name) + '" loading="lazy"/></button>'
      : '<button type="button" class="att-thumb file clickable" data-act="att-open" data-id="' + c.id + '" data-att="' + a.id + '"><span>📄</span></button>';
    var when = a.addedAt || a.createdAt || '';
    var meta = [attTypeLabel(a), fmtSize(a.size), when ? fmtDate(when) : ''].filter(Boolean).join(' • ');
    return '<div class="att-card">' + thumb +
      '<div class="att-name" title="' + esc(a.name) + '">' + esc(a.name) + '</div>' +
      '<div class="att-meta">' + esc(meta) + '</div>' +
      (showCase ? '<div class="att-case">' + esc(c.name) + '</div>' : '') +
      '<div class="att-actions">' +
        '<button type="button" class="att-open-btn" data-act="att-open" data-id="' + c.id + '" data-att="' + a.id + '">📂 فتح المرفق</button>' +
        '<button type="button" class="att-del-btn" data-act="att-del" data-id="' + c.id + '" data-att="' + a.id + '" title="حذف المرفق">🗑️</button>' +
      '</div>' +
    '</div>';
  }

  /* ---------- الدعم والتفعيل ---------- */
  /* مصدر مركزي واحد لكل بيانات الدعم والتفعيل (أرقام/نصوص/أسعار/الوكيل) لتسهيل ربطها لاحقاً
     بلوحة تحكم إدارية. ملاحظة: هذا تنظيم للبيانات فقط ولا يغيّر أي وظيفة أو منطق تفعيل حالي. */
  var SUPPORT = {
    dev: 'د. عرفات الجعوري',
    devFull: 'د. عرفات علي الجعوري',
    price: '3000 ريال',
    wa: [{ num: '967775101518', label: '775101518' }, { num: '967779449744', label: '779449744' }],
    kuraimi: { name: 'عرفات الجعوري', acct: '3015367236' },
    jeeb: { name: 'عرفات الجعوري', pay: '25910' },
    agent: { title: 'وكيل طلاب محافظة إب', subtitle: 'خاص بطلاب محافظة إب', name: 'فراس المجمر', num: '967771697735', label: '771697735' }
  };
  function defaultAdminPin() { return String((17 * 70) + 44); }
  function defaultAdminConfig() {
    return {
      pin: defaultAdminPin(),
      dev: SUPPORT.dev,
      price: SUPPORT.price,
      wa1: SUPPORT.wa[0].num,
      wa1Label: SUPPORT.wa[0].label,
      wa2: SUPPORT.wa[1].num,
      wa2Label: SUPPORT.wa[1].label,
      kuraimiName: SUPPORT.kuraimi.name,
      kuraimiAcct: SUPPORT.kuraimi.acct,
      jeebName: SUPPORT.jeeb.name,
      jeebPay: SUPPORT.jeeb.pay,
      customerNote: 'التطبيق لا يحتاج اشتراكاً شهرياً. بعد التفعيل يمكنك استخدامه على هذا الهاتف بشكل دائم.'
    };
  }
  function normalizeAdminConfig(raw) {
    var d = defaultAdminConfig(), c = Object.assign({}, d, raw || {});
    Object.keys(d).forEach(function (k) { if (c[k] == null || c[k] === '') c[k] = d[k]; });
    if (!raw || !Object.prototype.hasOwnProperty.call(raw, 'price') || c.price === '4000 ريال') c.price = '3000 ريال';
    return c;
  }
  function applyAdminConfig() {
    adminConfig = normalizeAdminConfig(adminConfig);
    SUPPORT.dev = adminConfig.dev;
    SUPPORT.price = adminConfig.price;
    SUPPORT.wa = [
      { num: phoneDigits(adminConfig.wa1), label: adminConfig.wa1Label || adminConfig.wa1 },
      { num: phoneDigits(adminConfig.wa2), label: adminConfig.wa2Label || adminConfig.wa2 }
    ].filter(function (w) { return w.num; });
    if (!SUPPORT.wa.length) SUPPORT.wa = [{ num: '967775101518', label: '775101518' }, { num: '967779449744', label: '779449744' }];
    SUPPORT.kuraimi = { name: adminConfig.kuraimiName, acct: adminConfig.kuraimiAcct };
    SUPPORT.jeeb = { name: adminConfig.jeebName, pay: adminConfig.jeebPay };
    applyAdminConfigToStaticLinks();
  }
  function loadAdminConfig() {
    adminConfig = normalizeAdminConfig(jget(ADMIN_KEY, {}));
    applyAdminConfig();
  }
  function saveAdminConfig() {
    try { localStorage.setItem(ADMIN_KEY, JSON.stringify(adminConfig)); } catch (e) {}
    applyAdminConfig();
  }
  function applyAdminConfigToStaticLinks() {
    // أزرار الدعم الرسمية فقط — نستثني أزرار الوكيل الطلابي (تحتفظ برقمها الخاص ولا يُعاد كتابته)
    var links = Array.prototype.slice.call(document.querySelectorAll('a.wa-btn:not(.act-agent-wa):not(.agent-wa)'));
    if (!SUPPORT.wa.length) return;
    links.forEach(function (a, i) {
      if (!/wa\.me\//.test(a.href || '')) return;
      var w = SUPPORT.wa[i % SUPPORT.wa.length];
      a.href = 'https://wa.me/' + w.num;
      a.textContent = 'واتساب ' + (w.label || w.num);
    });
  }
  function accessStateSafe() { return (window.DPLicense && window.DPLicense.getAccessState) ? window.DPLicense.getAccessState() : 'trial'; }
  function appCode() { return (window.DPLicense && window.DPLicense.getDeviceId) ? window.DPLicense.getDeviceId() : '—'; }

  /* الخطط — أسعار وعملات ثابتة كما طُلب حرفياً، لا تُنفَّذ زمنياً داخل الكود بعد (انظر التقرير) */
  var PLANS = [
    { id: 'm1', label: 'شهر واحد', usd: '2$', yer: '1000 ريال يمني' },
    { id: 'm6', label: 'ستة أشهر', usd: '5$', yer: '2500 ريال يمني' },
    { id: 'y1', label: 'سنوي', usd: '10$', yer: '5000 ريال يمني', badge: 'الأكثر اختياراً' },
    { id: 'lt', label: 'دائم', usd: '25$', yer: '13500 ريال يمني', badge: 'دفع مرة واحدة' }
  ];
  var selectedPlanId = null;
  var showPlansOverride = false;   // "تجديد الخطة": يعيد استخدام نفس تدفّق اختيار الخطة والدفع حتى أثناء التفعيل الحالي
  function selectedPlan() { return PLANS.find(function (p) { return p.id === selectedPlanId; }) || null; }

  function waMessage() {
    var st = accessStateSafe();
    var stAr = st === 'activated' ? 'مفعل' : (st === 'expired' ? 'انتهت الفترة التجريبية' : 'فترة تجريبية');
    return 'السلام عليكم\nأريد تفعيل DentPilot Student\n\nرمز التطبيق الخاص بهذا الهاتف: ' + appCode() + '\nحالة التفعيل: ' + stAr + '\nطريقة الدفع:\nرقم العملية:';
  }
  function waSupportLink(num) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(waMessage()); }
  function planWaMessage(plan) {
    return 'DentPilot Student\nالخطة: ' + plan.label + '\nالسعر: ' + plan.usd + ' — ' + plan.yer + '\nرمز الجهاز: ' + appCode() + '\n\nرجاء إرسال صورة الإيصال أو رقم العملية.';
  }
  function planWaLink(plan) { var num = (SUPPORT.wa[0] || {}).num; return num ? ('https://wa.me/' + num + '?text=' + encodeURIComponent(planWaMessage(plan))) : '#'; }
  function agentWaLink() { return 'https://wa.me/' + SUPPORT.agent.num; }

  function fallbackCopy(text) {
    try { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
  }
  function copyNumber(text) {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast('تم نسخ الرقم بنجاح'); }, function () { toast(fallbackCopy(text) ? 'تم نسخ الرقم بنجاح' : 'انسخ الرقم يدوياً'); });
        return;
      }
    } catch (e) {}
    toast(fallbackCopy(text) ? 'تم نسخ الرقم بنجاح' : 'انسخ الرقم يدوياً');
  }

  /* ---------- نافذة التنبيه (اختيارية أثناء التجربة / إلزامية بعد انتهائها) ---------- */
  var actCodeFromForced = false;
  function renderActivationPrompt() {
    var titleEl = document.getElementById('actPromptTitle'), textEl = document.getElementById('actPromptText'), btnsEl = document.getElementById('actPromptButtons');
    if (!titleEl || !btnsEl) return;
    var expired = accessStateSafe() === 'expired';
    titleEl.textContent = expired ? 'انتهت الفترة التجريبية' : 'فعّل DentPilot الآن';
    textEl.textContent = expired ? 'اختر خطة للتفعيل للاستمرار في استخدام DentPilot Student.' : 'اختر الخطة المناسبة واستمر دون انقطاع.';
    var num = (SUPPORT.wa[0] || {}).num;
    btnsEl.innerHTML = expired
      ? ('<button type="button" class="btn btn-primary" data-prompt-act="plans" style="width:100%">اختيار الخطة</button>' +
         '<button type="button" class="btn btn-ghost" data-prompt-act="code" style="width:100%">لدي كود تفعيل</button>' +
         (num ? '<a class="btn btn-ghost" href="' + waSupportLink(num) + '" target="_blank" rel="noopener" style="width:100%">مراسلة الدعم</a>' : ''))
      : ('<button type="button" class="btn btn-primary" data-prompt-act="plans" style="width:100%">عرض خطط التفعيل</button>' +
         '<button type="button" class="btn btn-ghost" data-prompt-act="code" style="width:100%">لدي كود تفعيل</button>' +
         '<button type="button" class="btn btn-ghost" data-prompt-act="dismiss" style="width:100%">متابعة الفترة التجريبية</button>');
  }
  function openActivation() {
    var ov = document.getElementById('activationOverlay'); if (!ov) return;
    renderActivationPrompt();
    showOverlay(ov);
  }

  /* ---------- نافذة إدخال كود التفعيل (خطوتان) ---------- */
  function openActCode(step, fromForced) {
    var ov = document.getElementById('actCodeOverlay'); if (!ov) return;
    actCodeFromForced = !!fromForced;
    var actOv = document.getElementById('activationOverlay');
    if (actOv) hideOverlay(actOv);
    setActCodeStep(step || 'code');
    showOverlay(ov);
  }
  function setActCodeStep(step) {
    var isHelp = step === 'help';
    document.getElementById('actCodeStepTitle').textContent = isHelp ? 'الحصول على كود التفعيل' : 'أدخل كود التفعيل';
    document.getElementById('actStepCode').hidden = isHelp;
    document.getElementById('actStepHelp').hidden = !isHelp;
    if (isHelp) {
      var waBtn = document.getElementById('actHelpWaBtn');
      if (waBtn && SUPPORT.wa[0]) waBtn.href = waSupportLink(SUPPORT.wa[0].num);
    } else {
      try { var inp = document.getElementById('actCode'); if (inp) inp.focus(); } catch (e) {}
    }
  }
  function closeActCode() {
    hideOverlay(document.getElementById('actCodeOverlay'));
    if (actCodeFromForced && accessStateSafe() === 'expired') openActivation();   // التفعيل إلزامي: أعد إظهار النافذة الإلزامية إن لم يكتمل التفعيل
    actCodeFromForced = false;
  }

  /* ---------- نافذة إتمام الدفع ---------- */
  function payMethods() {
    return [
      { key: 'kuraimi', title: '🏦 بنك الكريمي', name: SUPPORT.kuraimi.name, num: SUPPORT.kuraimi.acct, numLabel: 'رقم الحساب', note: '' },
      { key: 'jeeb', title: '👛 محفظة جيب', name: SUPPORT.jeeb.name, num: SUPPORT.jeeb.pay, numLabel: 'رقم الدفع', note: 'هذا رقم الدفع البديل لمحفظة جيب' }
    ];
  }
  function openPayment() {
    var plan = selectedPlan(); if (!plan) return;
    var body = document.getElementById('payBody'); if (!body) return;
    body.innerHTML =
      '<div class="plan-summary-row"><span>الخطة</span><b>' + esc(plan.label) + '</b></div>' +
      '<div class="plan-summary-row"><span>السعر</span><b>' + esc(plan.usd) + ' — ' + esc(plan.yer) + '</b></div>' +
      '<div class="pay-accordion">' + payMethods().map(function (m, i) {
        return '<div class="pay-acc-item">' +
          '<button type="button" class="pay-acc-head" data-acc-toggle="' + m.key + '">' + esc(m.title) + '<span class="pay-acc-caret">⌄</span></button>' +
          '<div class="pay-acc-body" id="payAcc-' + m.key + '"' + (i === 0 ? '' : ' hidden') + '>' +
            '<div class="pay-kv"><span>صاحب الحساب</span><b>' + esc(m.name) + '</b></div>' +
            '<div class="pay-kv"><span>' + esc(m.numLabel) + '</span><b class="mono">' + esc(m.num) + '</b></div>' +
            (m.note ? '<div class="pay-note">' + esc(m.note) + '</div>' : '') +
            '<button type="button" class="btn btn-ghost copy-btn" data-pay-act="copy" data-copy="' + esc(m.num) + '">نسخ الرقم</button>' +
          '</div></div>';
      }).join('') + '</div>' +
      '<ol class="sup-steps"><li>قم بالتحويل.</li><li>احتفظ بالإيصال أو رقم العملية.</li><li>اضغط مراسلة الدعم.</li></ol>' +
      '<a class="btn btn-primary" style="width:100%" target="_blank" rel="noopener" href="' + planWaLink(plan) + '">مراسلة الدعم لإتمام التفعيل</a>';
    showOverlay(document.getElementById('paymentOverlay'));
  }

  /* ---------- صفحة الدعم والتفعيل ---------- */
  function planCardHtml(p) {
    return '<button type="button" class="plan-card' + (p.id === selectedPlanId ? ' selected' : '') + '" data-act="plan-select" data-plan="' + p.id + '">' +
      (p.badge ? '<span class="plan-badge">' + esc(p.badge) + '</span>' : '') +
      '<span class="plan-name">' + esc(p.label) + '</span>' +
      '<span class="plan-price">' + esc(p.usd) + '</span>' +
      '<span class="plan-price-yer">' + esc(p.yer) + '</span>' +
      '</button>';
  }
  function waIcon() {
    return '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.48 1.34 5L2 22l5.2-1.36a9.94 9.94 0 0 0 4.84 1.23h.01c5.5 0 9.96-4.46 9.96-9.96S17.54 2 12.04 2Zm0 18.2h-.01a8.27 8.27 0 0 1-4.2-1.15l-.3-.18-3.09.81.82-3-.2-.31a8.26 8.26 0 0 1-1.27-4.4c0-4.56 3.71-8.27 8.27-8.27 2.21 0 4.28.86 5.85 2.42a8.2 8.2 0 0 1 2.42 5.85c0 4.56-3.72 8.23-8.29 8.23Zm4.53-6.19c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.24-.64.8-.78.97-.14.16-.29.18-.53.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.24-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.24-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42-.14-.01-.31-.01-.47-.01-.17 0-.44.06-.67.31-.23.24-.87.85-.87 2.08 0 1.23.9 2.41 1.02 2.58.12.16 1.76 2.7 4.27 3.78.6.26 1.06.41 1.43.53.6.19 1.14.16 1.57.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z"/></svg>';
  }
  /* كرت المطور والدعم الرسمي + كرت الوكيل الطلابي — قسم تواصل ثابت، يظهر قبل التفعيل وبعده بنفس الشكل */
  function contactSectionHtml() {
    var waNum1 = (SUPPORT.wa[0] || {}).num, waNum2 = (SUPPORT.wa[1] || {}).num;
    var devCard =
      '<div class="sup-card dev-official-card">' +
        '<span class="dev-badge">الدعم الرسمي</span>' +
        '<div class="dev-official-name">' + esc(SUPPORT.dev) + '</div>' +
        '<div class="dev-official-fullname">' + esc(SUPPORT.devFull) + '</div>' +
        '<p class="dev-official-desc">مطور DentPilot Student والمشرف على الدعم والتفعيل.</p>' +
        '<div class="dev-official-actions">' +
          (waNum1 ? '<a class="btn btn-primary dev-wa-btn" href="' + waSupportLink(waNum1) + '" target="_blank" rel="noopener">' + waIcon() + '<span>مراسلة الدعم والتفعيل</span></a>' : '') +
          (waNum2 ? '<a class="btn btn-ghost dev-wa-btn" href="' + waSupportLink(waNum2) + '" target="_blank" rel="noopener">' + waIcon() + '<span>مراسلة الدعم الفني</span></a>' : '') +
        '</div>' +
      '</div>';
    var province = String(SUPPORT.agent.title || '').replace('وكيل طلاب ', '');
    var agentCard =
      '<div class="sup-card agent-official-card">' +
        '<div class="sup-h">الوكيل الطلابي</div>' +
        '<div class="agent-official-name">' + esc(SUPPORT.agent.name) + '</div>' +
        (province ? '<div class="agent-official-province">' + esc(province) + '</div>' : '') +
        '<p class="agent-official-desc">يساعد طلاب المحافظة في التواصل مع الدعم والحصول على كود التفعيل.</p>' +
        '<button type="button" class="btn btn-ghost agent-wa-btn" data-act="contact-agent">' + waIcon() + '<span>مراسلة الوكيل عبر واتساب</span></button>' +
      '</div>';
    return devCard + agentCard;
  }

  function renderSupport() {
    if (!els.supportBody) return;
    var st = accessStateSafe(), sub = document.getElementById('supSubtitle');

    if (st === 'activated' && !showPlansOverride) {
      if (sub) sub.hidden = true;
      var info = (window.DPLicense && window.DPLicense.getActivationInfo) ? window.DPLicense.getActivationInfo() : null;
      var planBlock;
      if (info && info.expiresAt) {
        var remainMs = info.expiresAt - Date.now(), remainDays = Math.max(0, Math.ceil(remainMs / 86400000));
        planBlock = '<div class="plan-summary-row"><span>الخطة</span><b>' + esc(info.planLabel || '') + '</b></div>' +
          (info.startsAt ? '<div class="plan-summary-row"><span>تاريخ التفعيل</span><b>' + esc(fmtDate(new Date(info.startsAt).toISOString().slice(0, 10))) + '</b></div>' : '') +
          '<div class="plan-summary-row"><span>تاريخ الانتهاء</span><b>' + esc(fmtDate(new Date(info.expiresAt).toISOString().slice(0, 10))) + '</b></div>' +
          '<div class="plan-summary-row"><span>الأيام المتبقية</span><b>' + remainDays + ' يوم</b></div>' +
          '<button type="button" class="btn btn-ghost" data-act="renew-plan" style="width:100%;margin-top:10px">تجديد الخطة</button>';
      } else {
        planBlock = '<div class="plan-summary-row"><span>نوع التفعيل</span><b>تفعيل دائم</b></div>';
      }
      els.supportBody.innerHTML =
        '<div class="sup-activated"><div class="sup-ok">✅ التطبيق مفعل بنجاح</div><p>يمكنك الآن استخدام جميع مزايا التطبيق.</p>' + planBlock + '</div>' +
        contactSectionHtml() +
        '<div class="sup-card sup-fine-card"><p>عند تغيير الهاتف أو مواجهة مشكلة في التفعيل يمكنك التواصل مع الدعم.</p></div>';
      return;
    }

    if (sub) sub.hidden = true;
    var statusBlock;
    if (showPlansOverride) {
      statusBlock = '<div class="sup-card sup-status-card"><div class="sup-h">تجديد الخطة</div><p>اختر خطة جديدة لمتابعة التفعيل.</p></div>' +
        '<button type="button" class="btn btn-ghost sup-code-btn" data-act="cancel-renew" style="width:100%">إلغاء والعودة</button>';
    } else if (st === 'expired') {
      statusBlock = '<div class="sup-card sup-status-card warn"><div class="sup-h">انتهت الفترة التجريبية</div><p>اختر إحدى الخطط للاستمرار.</p></div>';
    } else {
      if (sub) sub.hidden = false;
      var h = (window.DPLicense && window.DPLicense.trialRemainingHours) ? window.DPLicense.trialRemainingHours() : 0;
      statusBlock = '<div class="sup-card sup-status-card"><div class="sup-h">الفترة التجريبية نشطة</div>' +
        (h ? '<div class="sup-remain">المتبقي: ' + h + ' ساعة</div>' : '') + '<p>يمكنك التفعيل في أي وقت.</p></div>';
    }

    var plan = selectedPlan();
    var summaryBlock = plan ? (
      '<div class="plan-summary">' +
        '<div class="plan-summary-row"><span>الخطة</span><b>' + esc(plan.label) + '</b></div>' +
        '<div class="plan-summary-row"><span>السعر</span><b>' + esc(plan.usd) + ' — ' + esc(plan.yer) + '</b></div>' +
        '<button type="button" class="btn btn-primary" data-act="pay-continue" style="width:100%">متابعة الدفع والتفعيل</button>' +
      '</div>'
    ) : '';

    els.supportBody.innerHTML =
      statusBlock +
      '<div class="plan-grid">' + PLANS.map(planCardHtml).join('') + '</div>' +
      summaryBlock +
      '<button type="button" class="btn btn-ghost sup-code-btn" data-act="have-code" style="width:100%">لدي كود تفعيل</button>' +
      contactSectionHtml();
  }

  /* ---------- Settings ---------- */
  function openStudentSetup() {
    els.setupName.value = settings.studentName || '';
    els.setupLevel.value = settings.level || '';
    els.setupCollege.value = settings.college || '';
    els.setupName.classList.remove('invalid');
    els.studentSetupTitle.textContent = settings.studentName ? T('تعديل بيانات الطالب') : (T('مرحباً بك في DentPilot') + ' 👋');
    showOverlay(els.studentSetupOverlay);
    setTimeout(function () { els.setupName.focus(); }, 50);
  }
  function closeStudentSetup() { hideOverlay(els.studentSetupOverlay); }
  function handleStudentSetupSubmit(e) {
    e.preventDefault();
    var name = els.setupName.value.trim();
    if (!name) { els.setupName.classList.add('invalid'); els.setupName.focus(); return; }
    els.setupName.classList.remove('invalid');
    settings.studentName = name;
    settings.level = els.setupLevel.value.trim();
    settings.college = els.setupCollege.value.trim();
    saveSettings();
    if (window.DPSync) window.DPSync.markSettingsDirty();
    closeStudentSetup();
    renderStudentDisplay();
    updateCounts();
    toast(T('تم حفظ بيانات الطالب'));
  }
  function maybeShowStudentSetup() {
    if (settings.studentName) return;                                              // بيانات محفوظة أصلاً — لا تظهر تلقائياً
    var actOv = document.getElementById('activationOverlay');
    if (actOv && !actOv.hidden) return;                                            // لا نتزاحم مع نافذة التفعيل
    if (currentView === 'account') { setTimeout(maybeShowStudentSetup, 900); return; }  // ولا نتزاحم مع صفحة الحساب
    openStudentSetup();
  }
  /* ---------- لوحة "نظرة سريعة" (Clinical Insights) ----------
     بديل قسم "ترتيب الأيام" المحذوف. كل رقم هنا مُشتقّ من بيانات موجودة فعلاً
     (cases/requirements) بنفس الدوال المستخدمة أصلاً في اللوحة الرئيسية وصفحة المتطلبات —
     عرض فقط، بلا أي مصدر بيانات جديد وبلا أي تعديل على منطق الحفظ. */
  function renderClinicalInsights() {
    if (!els.clinicalInsights) return;
    var totalCount = cases.length, doneCount = completedCases().length;
    var pct = totalCount > 0 ? Math.round(doneCount / totalCount * 100) : 0;

    var g = subjectGroups(), topKey = '', topN = 0;
    g.order.forEach(function (k) { if (g.groups[k].length > topN) { topN = g.groups[k].length; topKey = k; } });
    var topLabel = topKey ? (topKey === NO_SUBJECT ? topKey : deptLabel(topKey)) : '—';

    var alerts = allReqNames().map(function (d) {
      var req = toNum(requirements[d]);
      if (req <= 0) return null;
      var done = cases.filter(function (c) { return c.department === d && c.status === 'مكتملة'; }).length;
      var remaining = Math.max(0, req - done);
      if (remaining <= 0) return null;
      var deptDef = null; for (var i = 0; i < DEPT_DEFS.length; i++) { if (DEPT_DEFS[i].value === d) { deptDef = DEPT_DEFS[i]; break; } }
      return { label: deptDef ? deptDef.label : d, remaining: remaining };
    }).filter(Boolean);

    var alertsHtml = alerts.length
      ? alerts.map(function (a) { return '<div class="insight-alert-row"><span>' + esc(a.label) + '</span><b>' + a.remaining + ' ' + T('متبقٍ') + '</b></div>'; }).join('')
      : '<div class="insight-alert-row insight-alert-empty"><span>' + T('لا توجد متطلبات ناقصة حالياً') + ' 🎉</span></div>';

    els.clinicalInsights.innerHTML =
      '<div class="insights-head"><span class="insights-ico">📊</span><h3>' + T('نظرة سريعة') + '</h3></div>' +
      '<div class="insights-grid">' +
        '<div class="insight-stat"><span class="insight-stat-val">' + pct + '%</span><span class="insight-stat-label">' + T('نسبة الإنجاز الإجمالية') + '</span></div>' +
        '<div class="insight-stat"><span class="insight-stat-val insight-stat-text">' + esc(topLabel) + '</span><span class="insight-stat-label">' + T('الأكثر عملاً') + (topN ? ' (' + topN + ')' : '') + '</span></div>' +
      '</div>' +
      '<div class="insight-alerts">' + alertsHtml + '</div>';
  }
  function renderSettings() {
    renderStudentDisplay();
    if (els.scheduleEditor) {   // القسم القديم قد يكون محذوفاً من الواجهة؛ لا يزال هذا آمناً إن أُعيد لاحقاً
      els.scheduleEditor.innerHTML = DAYS.map(function (day) {
        var cur = settings.schedule[day] || '';
        return '<div class="sched-row"><span class="sched-day">' + esc(day) + '</span>' +
          '<select data-day="' + esc(day) + '"><option value="">—</option>' +
          DEPTS.map(function (d) { return '<option value="' + esc(d) + '"' + (d === cur ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
          '</select></div>';
      }).join('');
    }
    renderClinicalInsights();
    els.setDeviceId.textContent = (window.DPLicense && window.DPLicense.getDeviceId) ? window.DPLicense.getDeviceId() : '—';
    if (els.appVersion) els.appVersion.textContent = APP_VERSION;
    updateSettingsInstallUI();
    if (els.accessStatus && window.DPLicense) {
      var stt = window.DPLicense.getAccessState();
      var info = window.DPLicense.getActivationInfo ? window.DPLicense.getActivationInfo() : null;
      if (stt === 'activated' && info) {
        els.accessStatus.textContent = T('مفعل') + ' — ' + (info.planLabel || T('مدى الحياة')) + (info.expiresAt ? (' — ' + T('ينتهي في') + ' ' + fmtDate(new Date(info.expiresAt).toISOString().slice(0, 10))) : '');
      } else {
        els.accessStatus.textContent = stt === 'activated' ? T('مفعل')
          : stt === 'trial' ? (T('فترة تجريبية — المتبقي:') + ' ' + window.DPLicense.trialRemainingHours() + ' ' + T('ساعة'))
          : T('انتهت الفترة التجريبية');
      }
    }
  }

  /* ---------- Case file ---------- */
  function renderFile(id) {
    var c = cases.find(function (x) { return x.id === id; });
    if (!c) { go(fileOrigin || 'all'); return; }
    var st = statusMeta(c.status);
    var info = function (l, v) { var empty = (v === '—'); return '<div class="info-card' + (empty ? ' is-empty' : '') + '"><span class="info-label">' + l + '</span><span class="info-value">' + v + '</span></div>'; };
    els.fileBody.innerHTML =
      '<div class="file-hero"><span class="file-avatar">' + esc(initial(c.name)) + '</span>' +
        '<div class="file-hero-main"><h2>' + esc(c.name) + '</h2><div class="file-hero-sub">' + (esc(c.department ? deptLabel(c.department) : '') || '—') + (c.caseType ? ' • ' + esc(c.caseType) : '') + '</div></div>' +
        '<span class="file-status ' + st.cls + '">' + esc(statusLabel(c.status) || '—') + '</span></div>' +
      '<div class="file-actions">' +
        callLink(c.phone, '', ' ' + T('اتصال')) + waLink(c.phone, '', ' ' + T('واتساب')) +
        (c.status !== 'مكتملة' ? '<button type="button" class="card-btn complete" data-act="complete" data-id="' + c.id + '">✅ ' + T('إنهاء الحالة') + '</button>' : '') +
        '<button type="button" class="card-btn primary-action" data-act="edit" data-id="' + c.id + '">✏️ ' + T('تعديل') + '</button>' +
        '<button type="button" class="card-btn" data-act="print" data-id="' + c.id + '">🖨 ' + T('طباعة') + '</button>' +
        '<button type="button" class="card-btn del minor" data-act="del" data-id="' + c.id + '">🗑️ ' + T('حذف') + '</button>' +
      '</div>' +
      '<div class="file-block"><div class="fs-head"><span class="fs-ico">🧾</span><h3>' + T('بيانات الحالة') + '</h3></div>' +
        '<div class="info-grid">' +
          info(T('الاسم'), esc(c.name)) + info(T('الهاتف'), esc(c.phone) || '—') +
          info(T('القسم'), c.department ? esc(deptLabel(c.department)) : '—') + info(T('نوع الحالة'), esc(c.caseType) || '—') +
          info(T('السن المعالَج'), esc(c.tooth) || '—') + info(T('اليوم المخصّص'), c.day ? esc(c.day) : T('بدون يوم محدد')) +
          info(T('تاريخ الموعد'), c.apptDate ? esc(longDateAr(c.apptDate)) : '—') +
          info(T('اليوم'), effWeekday(c) ? esc(effWeekday(c)) : '—') +
          info(T('وقت الموعد'), c.apptTime ? esc(timeLabel(c.apptTime)) : '—') +
          info(T('حالة الإنجاز'), '<span class="row-status ' + st.cls + '">' + esc(statusLabel(c.status) || '—') + '</span>') +
        '</div></div>' +
      sessionsSection(c) + notesSection(c) + attachSection(c);
  }

  function sessionsSection(c) {
    var list = (c.sessions || []).slice().sort(function (a, b) { return (toNum(a.number) - toNum(b.number)); });
    var body = list.length ? list.map(function (s) {
      return '<div class="sess-card ' + (s.status === 'منجزة' ? 'done' : '') + '">' +
        '<div class="sess-head"><span class="sess-no">' + T('جلسة') + ' ' + (esc(s.number) || '—') + '</span>' +
          '<span class="sess-when">' + esc(fmtDate(s.date)) + (s.date ? ' • ' + esc(weekday(s.date)) : '') + (s.time ? ' • ' + esc(s.time) : '') + '</span>' +
          '<span class="sess-st ' + sessStMeta(s.status) + '">' + esc(sessStatusLabel(s.status) || '') + '</span>' +
          '<span><button type="button" class="mini-btn" data-act="sess-edit" data-id="' + c.id + '" data-sid="' + s.id + '">✏️</button>' +
          '<button type="button" class="mini-btn del" data-act="sess-del" data-id="' + c.id + '" data-sid="' + s.id + '">🗑️</button></span></div>' +
        (s.proc ? '<div class="sess-body">🦷 ' + esc(s.proc) + '</div>' : '') +
        (s.notes ? '<div class="sess-note">📝 ' + esc(s.notes) + '</div>' : '') +
        (s.next ? '<div class="sess-next">🗓️ ' + T('القادم') + ': ' + esc(fmtDT(s.next)) + ' • ' + esc(weekday(s.next)) + '</div>' : '') +
      '</div>';
    }).join('') : '<div class="sub-empty">' + T('لا توجد جلسات بعد.') + '</div>';
    return '<div class="file-block"><div class="fs-head"><span class="fs-ico">🦷</span><h3>' + T('الجلسات') + '</h3>' +
      '<button type="button" class="card-btn" data-act="sess-add" data-id="' + c.id + '">➕ ' + T('إضافة جلسة') + '</button></div>' +
      '<div>' + body + '</div></div>';
  }

  function notesSection(c) {
    return '<div class="file-block"><div class="fs-head"><span class="fs-ico">📝</span><h3>' + T('ملاحظات الحالة') + '</h3></div>' +
      '<textarea id="caseNotes" class="notes-area" placeholder="' + T('اكتب ملاحظات عامة عن الحالة…') + '">' + esc(c.notes || '') + '</textarea>' +
      '<div class="form-actions" style="margin-top:10px"><button type="button" id="saveNotesBtn" class="btn btn-primary" data-act="save-notes" data-id="' + c.id + '">' + T('حفظ الملاحظات') + '</button></div></div>';
  }

  function attachSection(c) {
    var list = attListFor(c.id);
    var body = list.length ? '<div class="att-grid">' + list.map(function (a) { return attCard(a, c, false); }).join('') + '</div>' : '<div class="sub-empty">' + T('لا توجد مرفقات. أضف صوراً/أشعة/مستندات للحالة.') + '</div>';
    return '<div class="file-block"><div class="fs-head"><span class="fs-ico">📎</span><h3>' + T('المرفقات') + '</h3>' +
      '<button type="button" class="card-btn" data-act="att-add" data-id="' + c.id + '">➕ ' + T('إضافة مرفق') + '</button></div>' + body +
      '<input type="file" id="attInput" accept="image/*,.pdf,.doc,.docx" multiple hidden /></div>';
  }

  /* ---------- حاجز الوصول المركزي (Access Lock) ----------
     مصدر الحالة الوحيد هو window.DPLicense.getAccessState() من activation.js.
     كل نقطة تنقّل أو حفظ في هذا الملف تستدعي isAccessLocked()/enforceAccessLock() من هنا فقط،
     لتفادي تكرار منطق التحقق بصورة متعارضة في أكثر من مكان. */
  var ACCESS_LOCK_ALLOWED_VIEWS = { support: true };
  function isAccessLocked() { return accessStateSafe() === 'expired'; }
  function closeOperationalOverlaysForLock() {
    // يغلق النوافذ التشغيلية المفتوحة فقط. لا يغلق أبداً: activationOverlay / actCodeOverlay / paymentOverlay
    hideOverlay(els.caseOverlay); closeDeptSheet();
    hideOverlay(els.sessionOverlay);
    if (els.confirmOverlay && !els.confirmOverlay.hidden) { pendingConfirm = null; hideOverlay(els.confirmOverlay); }
    if (els.attViewOverlay && !els.attViewOverlay.hidden) closeImagePreview();
    hideOverlay(els.studentSetupOverlay);
    if (isDrawerOpen()) closeDrawer();
  }
  function enforceAccessLock() {
    var locked = isAccessLocked();
    document.body.classList.toggle('dp-access-locked', locked);
    if (!locked) return false;
    closeOperationalOverlaysForLock();
    var rawName = location.hash.replace(/^#/, '').split('/')[0];
    if (!ACCESS_LOCK_ALLOWED_VIEWS[rawName] && rawName !== 'support') {
      location.hash = 'support';   // hashchange سيستدعي applyRoute() الذي يفرض هذا الحاجز مجدداً بأمان، دون حلقة
    }
    return true;
  }

  /* ---------- Router ---------- */
  function parseHash() { var raw = location.hash.replace(/^#/, ''); var p = raw.split('/'); return { name: VIEWS.indexOf(p[0]) >= 0 ? p[0] : 'dashboard', param: decodeURIComponent(p[1] || '') }; }
  function go(name, param) {
    if (isAccessLocked() && name !== 'support') { enforceAccessLock(); return; }
    if (name === 'add') { openCase(null); return; }
    location.hash = param ? (name + '/' + encodeURIComponent(param)) : name; applyRoute();
  }
  function openFile(id) {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    fileOrigin = (currentView === 'subject') ? ('subject/' + encodeURIComponent(currentParam))
      : (currentView === 'bysubject') ? 'bysubject'
      : (currentView === 'completed') ? 'completed'
      : (currentView === 'all') ? (currentParam ? ('all/' + currentParam) : 'all')
      : (currentView === 'appointments') ? (currentParam ? ('appointments/' + currentParam) : 'appointments')
      : (currentView === 'patient') ? ('patient/' + encodeURIComponent(currentParam))
      : fileOrigin;
    location.hash = 'file/' + id; applyRoute();
  }
  function goBack() {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    if (currentView === 'file') { var o = fileOrigin || 'all'; location.hash = o; applyRoute(); }
    else if (currentView === 'csform') go('casesheets');
    else if (currentView === 'casesheets') go('universities');
    else if (currentView === 'uniEmpty') go('universities');
    else if (currentView === 'subject') go('bysubject');
    else if (currentView === 'patient') go('patients');
    else go('dashboard');
  }
  function applyRoute() {
    var r = parseHash();
    if (isAccessLocked() && r.name !== 'support') {
      var rawName = location.hash.replace(/^#/, '').split('/')[0];
      if (rawName !== 'support') { location.hash = 'support'; return; }   // hashchange سيعيد استدعاء applyRoute بـ #support
      r.name = 'support'; r.param = '';
    }
    currentView = r.name; currentParam = r.param;
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.dataset.view !== r.name; });
    document.body.classList.toggle('dp-dashboard-bg', r.name === 'dashboard');
    els.backBtn.hidden = (r.name === 'dashboard') || isAccessLocked();
    if (els.menuBtn) els.menuBtn.hidden = (r.name !== 'dashboard') || isAccessLocked();
    renderActiveView();
    markBottomNavActive();
    enforceAccessLock();   // يعيد فرض حالة القفل (body class + إغلاق النوافذ التشغيلية) بعد استقرار المسار
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  }
  function renderActiveView() {
    updateCounts();
    if (currentView === 'dashboard') { /* static */ }
    else if (currentView === 'all') renderAll();
    else if (currentView === 'appointments') renderAppointments();
    else if (currentView === 'patients') renderPatients();
    else if (currentView === 'patient') renderPatientSummary(currentParam);
    else if (currentView === 'reqs') renderReqs();
    else if (currentView === 'completed') renderCompleted();
    else if (currentView === 'bysubject') renderBySubject();
    else if (currentView === 'subject') renderSubjectCases(currentParam);
    else if (currentView === 'settings') renderSettings();
    else if (currentView === 'support') renderSupport();
    else if (currentView === 'file') renderFile(currentParam);
    else if (currentView === 'universities') renderUniversities();
    else if (currentView === 'uniEmpty') renderUniEmpty(currentParam);
    else if (currentView === 'casesheets') { if (currentParam && uniByKey(currentParam)) currentCsUni = currentParam; renderCasesheets(); }
    else if (currentView === 'csform') renderCasesheetForm(currentParam);
  }
  function refresh() { renderActiveView(); }

  /* ---------- Case modal ---------- */
  var ENDO_VISITS = ['', 'Single visit', 'First visit', 'Second visit', 'Third visit', 'Final visit', 'Recall'];
  var CANAL_NAMES = ['Single', 'MB', 'DB', 'ML', 'DL', 'Palatal', 'Distal', 'Mesial', 'Buccal', 'Lingual', 'Other'];
  var currentEndoCanals = [];   // حالة القنوات أثناء فتح النموذج

  function canalNameOptions(sel) {
    return CANAL_NAMES.map(function (n) { return '<option value="' + esc(n) + '"' + (n === sel ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
  }
  function renderEndoCanals() {
    if (!els.endoCanalsList) return;
    if (!currentEndoCanals.length) { els.endoCanalsList.innerHTML = '<p class="req-desc" style="margin:0 0 8px">' + T('لا توجد قنوات بعد. اضغط «+ إضافة قناة».') + '</p>'; return; }
    els.endoCanalsList.innerHTML = currentEndoCanals.map(function (cn, i) {
      // اسم القناة: إن لم يكن ضمن القائمة القياسية فهو قيمة مخصّصة (Other)
      var isKnown = CANAL_NAMES.indexOf(cn.name) >= 0 && cn.name !== 'Other';
      var selVal = isKnown ? cn.name : (cn.name ? 'Other' : '');
      var otherVal = isKnown ? '' : (cn.name || '');
      var showOther = selVal === 'Other';
      return '<div class="canal-card" data-canal="' + i + '">' +
        '<div class="canal-head"><span class="canal-idx">' + T('قناة') + ' ' + (i + 1) + '</span>' +
          '<button type="button" class="canal-del" data-act="endo-canal-del" data-idx="' + i + '" title="' + T('حذف القناة') + '" aria-label="' + T('حذف القناة') + '">✕</button></div>' +
        '<div class="canal-grid">' +
          '<div class="field full"><label>Canal name</label><select data-canal-field="name" data-idx="' + i + '"><option value="">—</option>' + canalNameOptions(selVal) + '</select></div>' +
          '<div class="field full canal-other" data-idx="' + i + '"' + (showOther ? '' : ' hidden') + '><label>' + T('اسم القناة (مخصّص)') + '</label><input type="text" data-canal-field="nameOther" data-idx="' + i + '" value="' + esc(otherVal) + '" placeholder="' + T('اكتب اسم القناة') + '" /></div>' +
          '<div class="field"><label>WL</label><input type="text" data-canal-field="wl" data-idx="' + i + '" value="' + esc(cn.wl || '') + '" placeholder="mm" /></div>' +
          '<div class="field"><label>Stop</label><input type="text" data-canal-field="stop" data-idx="' + i + '" value="' + esc(cn.stop || '') + '" /></div>' +
          '<div class="field"><label>Initial File</label><input type="text" data-canal-field="initial" data-idx="' + i + '" value="' + esc(cn.initial || '') + '" /></div>' +
          '<div class="field"><label>Master File</label><input type="text" data-canal-field="master" data-idx="' + i + '" value="' + esc(cn.master || '') + '" /></div>' +
        '</div></div>';
    }).join('');
  }
  // يجمع القيم الحالية من حقول القنوات إلى المصفوفة (يُستدعى قبل إعادة الرسم/الحفظ)
  function syncEndoCanalsFromDOM() {
    if (!els.endoCanalsList) return;
    els.endoCanalsList.querySelectorAll('[data-canal-field]').forEach(function (el) {
      var idx = parseInt(el.dataset.idx, 10); if (isNaN(idx) || !currentEndoCanals[idx]) return;
      var f = el.dataset.canalField;
      if (f === 'name') { if (el.value !== 'Other') currentEndoCanals[idx].name = el.value; else if (CANAL_NAMES.indexOf(currentEndoCanals[idx].name) >= 0) currentEndoCanals[idx].name = 'Other'; }
      else if (f === 'nameOther') { currentEndoCanals[idx]._other = el.value; }
      else currentEndoCanals[idx][f] = el.value;
    });
    // دمج قيمة Other النصية في الاسم النهائي
    currentEndoCanals.forEach(function (cn) {
      if (cn.name === 'Other' || (cn._other && CANAL_NAMES.indexOf(cn.name) < 0)) {
        if (cn._other && cn._other.trim()) cn.name = cn._other.trim();
      }
      delete cn._other;
    });
  }
  function addEndoCanal() { syncEndoCanalsFromDOM(); currentEndoCanals.push({ name: '', wl: '', stop: '', initial: '', master: '' }); renderEndoCanals(); }
  function delEndoCanal(idx) { syncEndoCanalsFromDOM(); currentEndoCanals.splice(idx, 1); renderEndoCanals(); }

  function openDeptSheet() { if (els.deptOverlay) showOverlay(els.deptOverlay); }
  function closeDeptSheet() { if (els.deptOverlay) els.deptOverlay.hidden = true; }
  
  function onDeptChange() {
    var d = els.cDept.value;
    // تحديث نص الزر باسم عربي مقروء
    var DEPT_LABELS = { 'Operative': '🦷 Operative', 'Endo': '🌀 Endo', 'Orthodontics': '🪥 Orthodontics',
      'Cleaning': '🧼 Cleaning', 'Surgery': '✂️ Surgery', 'Pediatric': '🧸 Pediatric',
      'Prosthodontics': '👑 Prosthodontics', 'أخرى': T('أخرى') + '...' };
    if (els.cDeptBtn) els.cDeptBtn.textContent = (d && DEPT_LABELS[d]) ? DEPT_LABELS[d] : (d || T('اختر التخصص'));

    if (els.opDetails)      els.opDetails.hidden      = (d !== 'Operative');
    if (els.endoDetails)    els.endoDetails.hidden    = (d !== 'Endo');
    if (els.orthoDetails)   els.orthoDetails.hidden   = (d !== 'Orthodontics');
    if (els.cleaningDetails) els.cleaningDetails.hidden = (d !== 'Cleaning');
    if (els.surgDetails)    els.surgDetails.hidden    = (d !== 'Surgery');
    if (els.pedoDetails)    els.pedoDetails.hidden    = (d !== 'Pediatric');
    if (els.prosthoDetails) els.prosthoDetails.hidden = (d !== 'Prosthodontics');

    if (els.cDeptOtherWrap) els.cDeptOtherWrap.hidden = (d !== 'أخرى');

    // إظهار حقل السن للأقسام التي تحتاجه
    var noTooth = ['Orthodontics', 'Cleaning', 'أخرى', '', 'Prosthodontics'].indexOf(d) >= 0;
    if (els.cToothWrap) els.cToothWrap.hidden = noTooth;
  }

  function openCase(id) {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    els.caseForm.reset(); els.cName.classList.remove('invalid');
    fillSelect(els.cStatus, STATUSES.map(function (s) { return { value: s, label: statusLabel(s) }; })); fillSelect(els.cDay, DAYS, T('بدون يوم محدد'));
    fillSelect(els.endoVisit, ENDO_VISITS);
    currentEndoCanals = [];
    if (els.cDeptOther) els.cDeptOther.value = '';
    
    // تفريغ كل الحقول الديناميكية
    ['opClass','opMaterial','opSurface','opAnesthesia',
     'endoDiagnosis','endoPeriapical','endoAnesthesia',
     'orthoVisit','orthoAppliance','orthoDevice',
     'cleanProc','cleanGingival','cleanBpe',
     'surgProc','surgAnesthesia','surgPostOp',
     'pedoTreat','pedoBehavior','pedoAge',
     'prosthoType','prosthoVisit','prosthoMaterial','prosthoShade',
     'cDeptOther'
    ].forEach(function(k) { if (els[k]) els[k].value = ''; });

    if (id) {
      var c = cases.find(function (x) { return x.id === id; });
      if (c) {
        els.caseTitle.textContent = T('تعديل الحالة'); els.caseId.value = c.id;
        els.cName.value = c.name || ''; els.cPhone.value = c.phone || '';
        
        // المادة
        if (c.department && ['Operative','Endo','Orthodontics','Cleaning','Surgery','Pediatric','Prosthodontics'].indexOf(c.department) < 0) { 
          els.cDept.value = 'أخرى'; if (els.cDeptOther) els.cDeptOther.value = c.department; 
        } else { els.cDept.value = c.department || ''; }
        
        els.cType.value = c.caseType || ''; els.cTooth.value = c.tooth || ''; els.cDay.value = c.day || '';
        els.cDate.value = c.apptDate || ''; els.cTime.value = c.apptTime || ''; els.cStatus.value = c.status || STATUSES[0]; els.cNotes.value = c.notes || '';
        
        // تعبئة كل الأقسام
        if (c.operative && typeof c.operative === 'object') {
          if (els.opClass)      els.opClass.value      = c.operative.class      || '';
          if (els.opMaterial)   els.opMaterial.value   = c.operative.material   || '';
          if (els.opSurface)    els.opSurface.value    = c.operative.surface    || '';
          if (els.opAnesthesia) els.opAnesthesia.value = c.operative.anesthesia || '';
        }
        if (c.endo && typeof c.endo === 'object') {
          if (els.endoDiagnosis)  els.endoDiagnosis.value  = c.endo.diagnosis  || '';
          if (els.endoVisit)      els.endoVisit.value      = c.endo.visit      || '';
          if (els.endoPeriapical) els.endoPeriapical.value = c.endo.periapical || '';
          if (els.endoAnesthesia) els.endoAnesthesia.value = c.endo.anesthesia || '';
          currentEndoCanals = Array.isArray(c.endo.canals) ? c.endo.canals.map(function (x) { return { name: x.name || '', wl: x.wl || '', stop: x.stop || '', initial: x.initial || '', master: x.master || '' }; }) : [];
        }
        if (c.ortho && typeof c.ortho === 'object') {
          if (els.orthoVisit)     els.orthoVisit.value     = c.ortho.visit     || '';
          if (els.orthoAppliance) els.orthoAppliance.value = c.ortho.appliance || '';
          if (els.orthoDevice)    els.orthoDevice.value    = c.ortho.device    || '';
        }
        if (c.cleaning && typeof c.cleaning === 'object') {
          if (els.cleanProc)     els.cleanProc.value     = c.cleaning.proc     || '';
          if (els.cleanGingival) els.cleanGingival.value = c.cleaning.gingival || '';
          if (els.cleanBpe)      els.cleanBpe.value      = c.cleaning.bpe      || '';
        }
        if (c.surgery && typeof c.surgery === 'object') {
          if (els.surgProc)      els.surgProc.value      = c.surgery.proc      || '';
          if (els.surgAnesthesia) els.surgAnesthesia.value = c.surgery.anesthesia || '';
          if (els.surgPostOp)    els.surgPostOp.value    = c.surgery.postOp    || '';
        }
        if (c.pedo && typeof c.pedo === 'object') {
          if (els.pedoTreat)    els.pedoTreat.value    = c.pedo.treat    || '';
          if (els.pedoBehavior) els.pedoBehavior.value = c.pedo.behavior || '';
          if (els.pedoAge)      els.pedoAge.value      = c.pedo.age      || '';
        }
        if (c.prostho && typeof c.prostho === 'object') {
          if (els.prosthoType)     els.prosthoType.value     = c.prostho.type     || '';
          if (els.prosthoVisit)    els.prosthoVisit.value    = c.prostho.visit    || '';
          if (els.prosthoMaterial) els.prosthoMaterial.value = c.prostho.material || '';
          if (els.prosthoShade)    els.prosthoShade.value    = c.prostho.shade    || '';
        }
      }
    } else { 
      els.caseTitle.textContent = T('إضافة حالة'); els.caseId.value = ''; els.cStatus.value = 'قيد الانتظار'; 
      els.cDept.value = '';
    }
    renderEndoCanals();
    onDeptChange();
    updateCaseWeekday();
    showOverlay(els.caseOverlay); setTimeout(function () { els.cName.focus(); }, 50);
  }
  function updateCaseWeekday() { if (els.cWeekday) els.cWeekday.value = els.cDate.value ? weekday(els.cDate.value) : ''; }
  function closeCase() { els.caseOverlay.hidden = true; closeDeptSheet(); }
  function handleCaseSubmit(e) {
    e.preventDefault();
    if (isAccessLocked()) { enforceAccessLock(); return; }
    var name = els.cName.value.trim();
    if (!name) { els.cName.classList.add('invalid'); els.cName.focus(); return; }
    
    var dept = els.cDept.value;
    if (dept === 'أخرى' && els.cDeptOther && els.cDeptOther.value.trim()) dept = els.cDeptOther.value.trim();
    
    var data = { name: name, phone: els.cPhone.value.trim(), department: dept, caseType: els.cType.value.trim(),
      tooth: els.cTooth.value.trim(), day: els.cDay.value, apptDate: els.cDate.value, apptTime: els.cTime.value, status: els.cStatus.value, notes: els.cNotes.value.trim() };
      
    // تجميع بيانات كل قسم
    var opData = null, endoData = null, orthoData = null, cleaningData = null, surgData = null, pedoData = null, prosthoData = null;
    var dv = els.cDept.value;
    if (dv === 'Operative')     opData       = { class: v('opClass'), material: v('opMaterial'), surface: v('opSurface'), anesthesia: v('opAnesthesia') };
    if (dv === 'Endo') {
      syncEndoCanalsFromDOM();
      endoData = { diagnosis: v('endoDiagnosis'), periapical: v('endoPeriapical'), anesthesia: v('endoAnesthesia'), visit: els.endoVisit ? els.endoVisit.value : '', canals: currentEndoCanals.map(function (x) { return { name: x.name || '', wl: x.wl || '', stop: x.stop || '', initial: x.initial || '', master: x.master || '' }; }) };
    }
    if (dv === 'Orthodontics')  orthoData    = { visit: v('orthoVisit'), appliance: v('orthoAppliance'), device: v('orthoDevice') };
    if (dv === 'Cleaning')      cleaningData = { proc: v('cleanProc'), gingival: v('cleanGingival'), bpe: v('cleanBpe') };
    if (dv === 'Surgery')       surgData     = { proc: v('surgProc'), anesthesia: v('surgAnesthesia'), postOp: v('surgPostOp') };
    if (dv === 'Pediatric')     pedoData     = { treat: v('pedoTreat'), behavior: v('pedoBehavior'), age: v('pedoAge') };
    if (dv === 'Prosthodontics') prosthoData = { type: v('prosthoType'), visit: v('prosthoVisit'), material: v('prosthoMaterial'), shade: v('prosthoShade') };

    var id = els.caseId.value;
    if (id) {
      var i = cases.findIndex(function (x) { return x.id === id; });
      if (i >= 0) {
        var merged = Object.assign({}, cases[i], data);
        if (opData)       merged.operative = opData;
        if (endoData)     merged.endo      = endoData;
        if (orthoData)    merged.ortho     = orthoData;
        if (cleaningData) merged.cleaning  = cleaningData;
        if (surgData)     merged.surgery   = surgData;
        if (pedoData)     merged.pedo      = pedoData;
        if (prosthoData)  merged.prostho   = prosthoData;
        
        if (merged.status === 'مكتملة') { if (!merged.completedAt) merged.completedAt = new Date().toISOString(); }
        else if ('completedAt' in merged) delete merged.completedAt;
        cases[i] = merged;
      }
    } else {
      data.id = uid(); data.sessions = []; data.createdAt = new Date().toISOString();
      if (opData)       data.operative = opData;
      if (endoData)     data.endo      = endoData;
      if (orthoData)    data.ortho     = orthoData;
      if (cleaningData) data.cleaning  = cleaningData;
      if (surgData)     data.surgery   = surgData;
      if (pedoData)     data.pedo      = pedoData;
      if (prosthoData)  data.prostho   = prosthoData;
      if (data.status === 'مكتملة') data.completedAt = data.createdAt;
      cases.unshift(data);
    }
    saveCases(); if (window.DPSync) window.DPSync.markCaseDirty(id || data.id); refresh(); closeCase(); toast(id ? T('تم تحديث الحالة') : T('تمت إضافة الحالة'));
  }

  /* ---------- Session modal ---------- */
  function openSession(caseId, sId) {
    if (isAccessLocked()) { enforceAccessLock(); return; }
    var c = cases.find(function (x) { return x.id === caseId; }); if (!c) return;
    els.sessionForm.reset(); els.sCaseId.value = caseId; els.sId.value = sId || '';
    if (sId) {
      var s = (c.sessions || []).find(function (x) { return x.id === sId; });
      if (s) { els.sessionTitle.textContent = T('تعديل الجلسة'); els.sNum.value = s.number || ''; els.sDate.value = s.date || ''; els.sTime.value = s.time || ''; els.sProc.value = s.proc || ''; els.sNotes.value = s.notes || ''; els.sNext.value = s.next || ''; els.sStatus.value = s.status || 'مجدولة'; }
    } else { els.sessionTitle.textContent = T('إضافة جلسة'); els.sNum.value = String((c.sessions || []).length + 1); els.sDate.value = new Date().toISOString().slice(0, 10); els.sStatus.value = 'مجدولة'; }
    showOverlay(els.sessionOverlay); setTimeout(function () { els.sDate.focus(); }, 50);
  }
  function closeSession() { els.sessionOverlay.hidden = true; }
  function handleSessionSubmit(e) {
    e.preventDefault();
    if (isAccessLocked()) { enforceAccessLock(); return; }
    var c = cases.find(function (x) { return x.id === els.sCaseId.value; }); if (!c) { closeSession(); return; }
    if (!Array.isArray(c.sessions)) c.sessions = [];
    var data = { number: els.sNum.value.trim(), date: els.sDate.value || '', time: els.sTime.value || '', proc: els.sProc.value.trim(), notes: els.sNotes.value.trim(), next: els.sNext.value || '', status: els.sStatus.value };
    var sId = els.sId.value;
    if (sId) { var i = c.sessions.findIndex(function (s) { return s.id === sId; }); if (i >= 0) c.sessions[i] = Object.assign({}, c.sessions[i], data); }
    else { data.id = sid('s'); c.sessions.push(data); }
    saveCases(); if (window.DPSync) window.DPSync.markCaseDirty(c.id); renderActiveView(); closeSession(); toast(sId ? T('تم تحديث الجلسة') : T('تمت إضافة الجلسة'));
  }
  function deleteSession(caseId, sId) {
    var c = cases.find(function (x) { return x.id === caseId; }); if (!c) return;
    confirmAsk({ title: T('حذف الجلسة'), text: T('هل تريد حذف هذه الجلسة؟'), okLabel: T('حذف'), onOk: function () { c.sessions = (c.sessions || []).filter(function (s) { return s.id !== sId; }); saveCases(); if (window.DPSync) window.DPSync.markCaseDirty(caseId); renderActiveView(); toast(T('تم حذف الجلسة')); } });
  }

  /* ---------- Delete case ---------- */
  function deleteCase(id) {
    confirmAsk({ title: T('حذف الحالة'), text: T('هل تريد حذف هذه الحالة؟'), okLabel: T('حذف'),
      onOk: function () { cases = cases.filter(function (x) { return x.id !== id; }); if (attachments[id]) { delete attachments[id]; try { saveAtt(); } catch (e) {} } saveCases(); if (window.DPSync) window.DPSync.markCaseDeleted(id); if (currentView === 'file') go('all'); else refresh(); toast(T('تم حذف الحالة')); } });
  }

  /* ---------- Attachments add/del ---------- */
  function triggerAttach(id) { var inp = $('attInput'); if (inp) { inp.dataset.id = id; inp.click(); } }
  function readDataURL(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(f); }); }
  function downscale(dataUrl, max, q) {
    return new Promise(function (res) {
      var img = new Image();
      img.onload = function () { var w = img.width, h = img.height; if (w > max || h > max) { var sc = Math.min(max / w, max / h); w = Math.round(w * sc); h = Math.round(h * sc); } try { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, 0, 0, w, h); res(cv.toDataURL('image/jpeg', q)); } catch (e) { res(dataUrl); } };
      img.onerror = function () { res(dataUrl); }; img.src = dataUrl;
    });
  }
  function addAttachments(id, files) {
    if (!files || !files.length) return;
    if (!attachments[id]) attachments[id] = [];
    var chain = Promise.resolve(), added = 0;
    Array.prototype.slice.call(files).forEach(function (file) {
      chain = chain.then(function () {
        return readDataURL(file).then(function (du) {
          var type = file.type || '';
          var next = type.indexOf('image/') === 0 ? downscale(du, 1400, 0.7) : Promise.resolve(du);
          return next.then(function (fin) { var iso = new Date().toISOString(); attachments[id].push({ id: sid('a'), name: file.name || T('مرفق'), type: type.indexOf('image/') === 0 ? 'image/jpeg' : type, size: file.size || 0, dataUrl: fin, addedAt: iso, createdAt: iso }); added++; });
        });
      });
    });
    chain.then(function () {
      try { saveAtt(); } catch (err) { attachments[id] = attachments[id].slice(0, attachments[id].length - added); try { saveAtt(); } catch (e) {} toast('المساحة المحلية ممتلئة — تعذّر حفظ المرفق.'); renderActiveView(); return; }
      renderActiveView(); toast(added > 1 ? T('تم إضافة المرفقات') : T('تمت إضافة المرفق'));
    });
  }
  function deleteAttachment(id, attId) {
    confirmAsk({ title: T('حذف المرفق'), text: T('هل تريد حذف هذا المرفق؟'), okLabel: T('حذف'), onOk: function () { attachments[id] = (attachments[id] || []).filter(function (a) { return a.id !== attId; }); try { saveAtt(); } catch (e) {} renderActiveView(); toast(T('تم حذف المرفق')); } });
  }

  /* ---------- Open attachment (Blob-based, reliable across browsers) ---------- */
  function findAtt(caseId, attId) { var l = attachments[caseId] || []; for (var i = 0; i < l.length; i++) if (l[i].id === attId) return l[i]; return null; }
  var attViewUrl = null;
  function openImagePreview(url, name) {
    if (!els.attViewOverlay) { try { window.open(url, '_blank'); } catch (e) {} return; }
    if (attViewUrl) { try { URL.revokeObjectURL(attViewUrl); } catch (e) {} }
    attViewUrl = url;
    els.attViewImg.src = url;
    els.attViewTitle.textContent = name || T('معاينة المرفق');
    showOverlay(els.attViewOverlay);
  }
  function closeImagePreview() {
    if (els.attViewOverlay) els.attViewOverlay.hidden = true;
    if (els.attViewImg) els.attViewImg.removeAttribute('src');
    if (attViewUrl) { try { URL.revokeObjectURL(attViewUrl); } catch (e) {} attViewUrl = null; }
  }
  function openAttachment(caseId, attId) {
    var a = findAtt(caseId, attId);
    if (!a) { toast(T('تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.')); return; }
    if (!a.dataUrl) { toast(T('هذا المرفق قديم ولا يحتوي على بيانات كافية للفتح.')); return; }
    var blob, url;
    try { blob = dataURLtoBlob(a.dataUrl); url = URL.createObjectURL(blob); }
    catch (e) { toast(T('تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.')); return; }
    var type = String(a.type || blob.type || '').toLowerCase();
    if (type.indexOf('image/') === 0) { openImagePreview(url, a.name); return; }   // معاينة الصور داخل نافذة
    // PDF وباقي الملفات: الفتح عبر رابط Blob داخل نفس نقرة المستخدم (أكثر موثوقية على الجوال من window.open)
    var opened = false;
    try {
      var link = document.createElement('a');
      link.href = url; link.target = '_blank'; link.rel = 'noopener';
      if (type.indexOf('pdf') < 0) link.download = a.name || 'attachment'; // الملفات غير القابلة للعرض تُنزَّل، وPDF يُفتح في تبويب
      document.body.appendChild(link); link.click(); link.remove(); opened = true;
    } catch (e) {}
    if (!opened) { try { if (window.open(url, '_blank')) opened = true; } catch (e2) {} }
    if (!opened) toast(T('تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.'));
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
  }

  /* ---------- Print ---------- */
  function buildPrintDoc(c) {
    var sessions = (c.sessions || []).slice().sort(function (a, b) { return toNum(a.number) - toNum(b.number); });
    var sRows = sessions.length ? sessions.map(function (s) {
      return '<tr><td>' + (esc(s.number) || '—') + '</td><td>' + esc(fmtDate(s.date)) + (s.date ? '<br><small>' + esc(weekday(s.date)) + (s.time ? ' • ' + esc(s.time) : '') + '</small>' : '') + '</td><td>' + (esc(s.proc) || '—') + '</td><td>' + (esc(s.notes) || '—') + '</td><td>' + (esc(s.status) || '—') + '</td></tr>';
    }).join('') : '<tr><td colspan="5" style="text-align:center">لا توجد جلسات</td></tr>';
    var atts = attListFor(c.id);
    var attList = atts.length ? '<ul class="p-att">' + atts.map(function (a) { return '<li>' + esc(a.name || 'مرفق') + '</li>'; }).join('') + '</ul>' : '<div class="p-empty">لا توجد مرفقات</div>';
    var appt = c.apptDate ? (esc(longDateAr(c.apptDate)) + ' (' + esc(weekday(c.apptDate)) + ')') : '—';
    var apptTime = c.apptTime ? esc(timeLabel(c.apptTime)) : '—';
    return '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"/>' +
      '<title>تقرير الحالة — ' + esc(c.name || '') + '</title><style>' +
      '*{box-sizing:border-box}body{font-family:"Tajawal","Segoe UI",Arial,sans-serif;color:#12233a;direction:rtl;margin:0;padding:22px;}' +
      '.p-head{display:flex;align-items:center;gap:12px;border-bottom:2px solid #16A8A6;padding-bottom:12px;margin-bottom:14px;}' +
      '.p-logo{width:46px;height:46px;border-radius:10px}.p-brand h1{font-size:18px;margin:0 0 3px;color:#0A2C52}.p-brand div{font-size:12px;color:#5b6b7b}' +
      '.p-sec{font-size:14px;color:#16A8A6;border-bottom:1px solid #dbe6ee;padding-bottom:5px;margin:18px 0 9px}' +
      'table{width:100%;border-collapse:collapse;font-size:12.5px}.p-info td{border:1px solid #dbe6ee;padding:7px 9px}.p-info td:nth-child(odd){background:#f2f7fb;font-weight:700;width:20%;color:#0A2C52}' +
      '.p-table th,.p-table td{border:1px solid #dbe6ee;padding:7px 9px;text-align:start}.p-table th{background:#eaf5f5;color:#0A2C52}' +
      '.p-note{border:1px solid #dbe6ee;border-radius:8px;padding:10px;font-size:12.5px;white-space:pre-wrap}' +
      '.p-att{margin:0;padding-inline-start:20px;font-size:12.5px}.p-att li{margin:2px 0}.p-empty{font-size:12.5px;color:#5b6b7b}' +
      '.p-foot{margin-top:26px;padding-top:10px;border-top:1px solid #dbe6ee;text-align:center;font-size:11.5px;color:#5b6b7b}' +
      '@page{size:A4;margin:14mm}</style></head><body>' +
      '<div class="p-head"><img class="p-logo" src="icon-192.png" alt="DP"/><div class="p-brand">' +
        '<h1>DentPilot Student — دينت بايلوت للطلاب</h1>' +
        '<div>' + (settings.studentName ? 'الطالب: ' + esc(settings.studentName) : 'متابِع الحالات السريرية') + '</div>' +
        '<div>تاريخ التقرير: ' + esc(fmtDate(new Date().toISOString())) + '</div></div></div>' +
      '<h2 class="p-sec">بيانات الحالة</h2><table class="p-info">' +
        '<tr><td>الاسم</td><td>' + (esc(c.name) || '—') + '</td><td>الهاتف</td><td>' + (esc(c.phone) || '—') + '</td></tr>' +
        '<tr><td>المادة/القسم</td><td>' + (esc(c.department) || '—') + '</td><td>نوع الحالة</td><td>' + (esc(c.caseType) || '—') + '</td></tr>' +
        '<tr><td>السن المعالَج</td><td>' + (esc(c.tooth) || '—') + '</td><td>اليوم المخصّص</td><td>' + (c.day ? esc(c.day) : 'بدون يوم') + '</td></tr>' +
        '<tr><td>تاريخ الموعد</td><td>' + appt + '</td><td>وقت الموعد</td><td>' + apptTime + '</td></tr>' +
        '<tr><td>اليوم</td><td>' + (effWeekday(c) ? esc(effWeekday(c)) : '—') + '</td><td>الحالة</td><td>' + (esc(c.status) || '—') + '</td></tr>' +
      '</table>' +
      '<h2 class="p-sec">الجلسات</h2><table class="p-table"><thead><tr><th>#</th><th>التاريخ</th><th>الإجراء</th><th>ملاحظات</th><th>الحالة</th></tr></thead><tbody>' + sRows + '</tbody></table>' +
      '<h2 class="p-sec">ملاحظات الحالة</h2><div class="p-note">' + (c.notes ? esc(c.notes) : '—') + '</div>' +
      '<h2 class="p-sec">المرفقات</h2>' + attList +
      '<div class="p-foot">تم إنشاء التقرير بواسطة DentPilot Student</div>' +
      '</body></html>';
  }
  function printCase(id) {
    var c = cases.find(function (x) { return x.id === id; }); if (!c) return;
    try {
      var html = buildPrintDoc(c);
      var frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.cssText = 'position:fixed;left:-9999px;bottom:0;width:420px;height:600px;border:0;opacity:0;';
      document.body.appendChild(frame);
      var win = frame.contentWindow;
      if (!win) { frame.remove(); toast(T('تعذر تجهيز ملف الطباعة. حاول مرة أخرى.')); return; }
      var doc = win.document; doc.open(); doc.write(html); doc.close();
      var printed = false;
      var fire = function () {
        if (printed) return; printed = true;
        try { win.focus(); win.print(); }
        catch (e) { toast(T('تعذر تجهيز ملف الطباعة. حاول مرة أخرى.')); }
        setTimeout(function () { try { frame.remove(); } catch (e) {} }, 2000);
      };
      frame.onload = function () { setTimeout(fire, 150); };
      setTimeout(fire, 800); // احتياطي إن لم يُطلَق onload على بعض المتصفحات
    } catch (e) {
      toast(T('تعذر تجهيز ملف الطباعة. حاول مرة أخرى.'));
    }
  }

  /* ---------- Confirm ---------- */
  /* ---------- Overlay show/hide (forces immediate paint on mobile WebViews) ---------- */
  function showOverlay(el) {
    if (!el) return;
    el.hidden = false;
    // Force a synchronous reflow so the just-shown overlay is painted on THIS frame.
    // Without this, some mobile WebViews defer the paint until the next input event,
    // making the action look like it "did nothing" until the user taps again.
    void el.offsetHeight;
  }
  function hideOverlay(el) { if (el) el.hidden = true; }

  function confirmAsk(o) { els.confirmTitle.textContent = o.title || T('تأكيد'); els.confirmText.textContent = o.text || ''; els.confirmOk.textContent = o.okLabel || T('تأكيد'); els.confirmOk.className = 'btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger'); pendingConfirm = o.onOk || null; showOverlay(els.confirmOverlay); }
  function confirmYes() { var fn = pendingConfirm; pendingConfirm = null; hideOverlay(els.confirmOverlay); if (fn) fn(); }
  function confirmNo() { pendingConfirm = null; hideOverlay(els.confirmOverlay); }

  /* ---------- Backup ---------- */
  function exportBackup() {
    var data = { app: 'DentPilot Student', version: '1.3.3', exportedAt: new Date().toISOString(), cases: cases, settings: settings, requirements: requirements, customReqs: customReqs, attachments: attachments, casesheets: casesheets, adminConfig: adminConfig };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'dentpilot-student-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast(T('تم تصدير النسخة الاحتياطية'));
  }
  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var o = JSON.parse(reader.result);
        if (!o || !Array.isArray(o.cases)) throw new Error('صيغة غير صالحة');
        cases = o.cases; normalizeCases();
        if (o.settings) settings = Object.assign({ studentName: '', level: '', college: '', schedule: {} }, o.settings);
        if (o.requirements) requirements = o.requirements;
        if (Array.isArray(o.customReqs)) customReqs = o.customReqs;
        if (o.attachments) attachments = o.attachments;
        if (Array.isArray(o.casesheets)) casesheets = o.casesheets;
        if (o.adminConfig) { adminConfig = normalizeAdminConfig(o.adminConfig); saveAdminConfig(); }
        saveCases(); saveSettings(); saveReqs(); saveCustomReqs(); saveCasesheets(); try { saveAtt(); } catch (e) {}
        refresh(); toast(T('تم استيراد النسخة الاحتياطية'));
      } catch (e) { toast(T('تعذّر الاستيراد — تأكد أنه ملف DentPilot Student صحيح')); }
    };
    reader.readAsText(file);
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    document.querySelectorAll('.dash-card, .add-case-bar, .today-viewall, .hero-badge').forEach(function (card) { card.addEventListener('click', function () { go(card.dataset.go, card.dataset.filter); }); });
    // القائمة الجانبية: فتح/إغلاق (لا تمسّ أي منطق تنقّل — تستخدم نفس data-go الحالي)
    if (els.menuBtn) els.menuBtn.addEventListener('click', openDrawer);
    if (els.drawerCloseBtn) els.drawerCloseBtn.addEventListener('click', closeDrawer);
    if (els.drawerOverlay) els.drawerOverlay.addEventListener('click', function (e) {
      if (e.target === els.drawerOverlay) closeDrawer();                      // النقر على الـOverlay فقط
      else if (e.target.closest && e.target.closest('[data-drawer-close]')) closeDrawer();   // اختيار عنصر
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isDrawerOpen()) closeDrawer(); });
    if (els.calStrip) els.calStrip.addEventListener('click', function (e) {
      var btn = e.target.closest('.cal-day'); if (!btn) return;
      els.calStrip.querySelectorAll('.cal-day').forEach(function (b) { b.classList.remove('cal-day-active'); });
      btn.classList.add('cal-day-active');
      updateCalNote(btn.dataset.date, btn.dataset.today === '1');
    });
    els.backBtn.addEventListener('click', goBack);
    els.allSearch.addEventListener('input', debounce(renderAll, 120));
    if (els.patientsSearch) els.patientsSearch.addEventListener('input', debounce(renderPatients, 120));

    els.caseForm.addEventListener('submit', handleCaseSubmit);
    els.caseClose.addEventListener('click', closeCase); els.caseCancel.addEventListener('click', closeCase);
    
    if (els.cDeptBtn) els.cDeptBtn.addEventListener('click', openDeptSheet);
    if (els.deptClose) els.deptClose.addEventListener('click', closeDeptSheet);
    if (els.deptOverlay) els.deptOverlay.addEventListener('click', function(e) {
      if (e.target === els.deptOverlay) closeDeptSheet();
      var card = e.target.closest('.dept-card');
      if (card) {
        els.cDept.value = card.dataset.val;
        onDeptChange();
        closeDeptSheet();
      }
    });
    
    els.cDate.addEventListener('input', updateCaseWeekday); els.cDate.addEventListener('change', updateCaseWeekday);
    // نموذج الحالة خارج #app، فنفوّض أحداثه مباشرةً على caseForm
    els.caseForm.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-act]'); if (!b) return;
      var act = b.dataset.act;
      if (act === 'endo-canal-add') { e.preventDefault(); addEndoCanal(); }
      else if (act === 'endo-canal-del') { e.preventDefault(); delEndoCanal(parseInt(b.dataset.idx, 10)); }
    });
    els.caseForm.addEventListener('change', function (e) {
      var t = e.target;
      if (t === els.cDept) { onDeptChange(); return; }
      if (t.dataset && t.dataset.canalField === 'name') {
        var wrap = els.endoCanalsList.querySelector('.canal-other[data-idx="' + t.dataset.idx + '"]');
        if (wrap) wrap.hidden = (t.value !== 'Other');
      }
    });
    els.sessionForm.addEventListener('submit', handleSessionSubmit);
    els.sessionClose.addEventListener('click', closeSession); els.sessionCancel.addEventListener('click', closeSession);

    if (els.saveSettingsBtn) els.saveSettingsBtn.addEventListener('click', function () {
      settings.schedule = {};
      els.scheduleEditor.querySelectorAll('select').forEach(function (sel) { if (sel.value) settings.schedule[sel.dataset.day] = sel.value; });
      saveSettings(); if (window.DPSync) window.DPSync.markSettingsDirty(); toast('تم حفظ الجدول');
    });
    els.editStudentBtn.addEventListener('click', function () { openStudentSetup(); });
    els.studentSetupForm.addEventListener('submit', handleStudentSetupSubmit);
    els.studentSetupSkip.addEventListener('click', closeStudentSetup);

    // نافذة التنبيه (اختيارية/إلزامية): أزرارها تُبنى ديناميكياً — تفويض نقر
    if (els.trialBanner) els.trialBanner.addEventListener('click', openActivation);
    var actPromptButtons = document.getElementById('actPromptButtons');
    if (actPromptButtons) actPromptButtons.addEventListener('click', function (e) {
      var b = e.target.closest('[data-prompt-act]'); if (!b) return;
      var pact = b.getAttribute('data-prompt-act');
      if (pact === 'plans') { hideOverlay(document.getElementById('activationOverlay')); go('support'); }
      else if (pact === 'code') openActCode('code', accessStateSafe() === 'expired');
      else if (pact === 'dismiss') hideOverlay(document.getElementById('activationOverlay'));
    });

    // نافذة إدخال كود التفعيل
    var actCodeClose = document.getElementById('actCodeClose');
    if (actCodeClose) actCodeClose.addEventListener('click', closeActCode);
    var actNeedCodeBtn = document.getElementById('actNeedCodeBtn');
    if (actNeedCodeBtn) actNeedCodeBtn.addEventListener('click', function () { setActCodeStep('help'); });
    var actHaveCodeBtn = document.getElementById('actHaveCodeBtn');
    if (actHaveCodeBtn) actHaveCodeBtn.addEventListener('click', function () { setActCodeStep('code'); });

    // نافذة إتمام الدفع: إغلاق + أكورديون طرق الدفع + نسخ (تفويض نقر — المحتوى ديناميكي)
    var payClose = document.getElementById('payClose');
    if (payClose) payClose.addEventListener('click', function () { hideOverlay(document.getElementById('paymentOverlay')); enforceAccessLock(); });
    var payBody = document.getElementById('payBody');
    if (payBody) payBody.addEventListener('click', function (e) {
      var toggleBtn = e.target.closest('[data-acc-toggle]');
      if (toggleBtn) {
        var key = toggleBtn.getAttribute('data-acc-toggle');
        document.querySelectorAll('.pay-acc-body').forEach(function (elx) { elx.hidden = (elx.id !== 'payAcc-' + key); });
        return;
      }
      var copyBtn = e.target.closest('[data-pay-act="copy"]');
      if (copyBtn) copyNumber(copyBtn.getAttribute('data-copy'));
    });

    els.exportBtn.addEventListener('click', exportBackup);
    els.importBtn.addEventListener('click', function () { els.importFile.click(); });
    els.importFile.addEventListener('change', function (e) { var f = e.target.files[0]; if (f) importBackup(f); e.target.value = ''; });

    els.confirmOk.addEventListener('click', confirmYes); els.confirmCancel.addEventListener('click', confirmNo);
    if (els.reqNewName) els.reqNewName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (addCustomReq(els.reqNewName.value)) toggleReqAddForm(false); } });
    if (els.updateNowBtn) els.updateNowBtn.addEventListener('click', applyUpdate);
    if (els.updateLaterBtn) els.updateLaterBtn.addEventListener('click', function () { els.updateOverlay.hidden = true; });
    if (els.checkUpdateBtn) els.checkUpdateBtn.addEventListener('click', checkForUpdates);

    // ---- Action delegation: single click listener on the stable #app root ----
    // One event per tap (no pointerup ghost-click that could re-close a just-opened overlay).
    // Overlays are shown via showOverlay() which forces an immediate repaint so the result is
    // visible on the FIRST tap — no action is ever deferred until another button is pressed.
    var appRoot = $('app');
    function findAction(e) {
      var t = e.target; if (!t || !t.closest) return null;
      var actBtn = t.closest('[data-act]'); if (actBtn) return { kind: 'act', el: actBtn };
      return null;
    }
    var ACCESS_LOCK_ALLOWED_ACTIONS = { nav: 1, 'plan-select': 1, 'pay-continue': 1, 'have-code': 1, 'contact-support': 1, 'contact-agent': 1, 'activate-now': 1, copy: 1 };
    function runAction(a, e) {
      if (!a) return;
      var btn = a.el, id = btn.dataset.id, act = btn.dataset.act;
      if (isAccessLocked() && !ACCESS_LOCK_ALLOWED_ACTIONS[act]) { enforceAccessLock(); return; }   // منع أي إجراء تشغيلي (حفظ/تعديل/حذف/فتح) أثناء القفل
      if (e && btn.tagName === 'BUTTON') e.preventDefault();   // buttons only — never anchors (tel:/wa.me keep default)
      if (act === 'open') openFile(id);
      else if (act === 'edit') openCase(id);
      else if (act === 'del') deleteCase(id);
      else if (act === 'complete') completeCase(id);
      else if (act === 'print') printCase(id);
      else if (act === 'sess-add') openSession(id, '');
      else if (act === 'sess-edit') openSession(id, btn.dataset.sid);
      else if (act === 'sess-del') deleteSession(id, btn.dataset.sid);
      else if (act === 'att-add') triggerAttach(id);
      else if (act === 'att-open') openAttachment(id, btn.dataset.att);
      else if (act === 'att-del') deleteAttachment(id, btn.dataset.att);
      else if (act === 'restore') restoreCase(id);
      else if (act === 'subject-open') openSubject(btn.dataset.key);
      else if (act === 'copy') copyNumber(btn.dataset.copy);
      else if (act === 'nav') go(btn.dataset.go);
      else if (act === 'activate-now') openActivation();
      else if (act === 'plan-select') { selectedPlanId = (selectedPlanId === btn.dataset.plan) ? selectedPlanId : btn.dataset.plan; renderSupport(); }
      else if (act === 'pay-continue') openPayment();
      else if (act === 'have-code') openActCode('code', false);
      else if (act === 'contact-support') { var w0 = SUPPORT.wa[0]; if (w0) window.open(waSupportLink(w0.num), '_blank', 'noopener'); }
      else if (act === 'contact-agent') window.open(agentWaLink(), '_blank', 'noopener');
      else if (act === 'renew-plan') { showPlansOverride = true; selectedPlanId = null; renderSupport(); }
      else if (act === 'cancel-renew') { showPlansOverride = false; selectedPlanId = null; renderSupport(); }
      else if (act === 'all-filter') go('all', btn.dataset.filter === 'all' ? '' : btn.dataset.filter);
      else if (act === 'appt-day') go('appointments', btn.dataset.day === 'today' ? '' : btn.dataset.day);
      else if (act === 'patient-open') go('patient', btn.dataset.key);
      else if (act === 'save-notes') saveNotes(id);
      else if (act === 'req-add-toggle') toggleReqAddForm();
      else if (act === 'req-add-cancel') toggleReqAddForm(false);
      else if (act === 'req-add-save') { if (addCustomReq(els.reqNewName && els.reqNewName.value)) toggleReqAddForm(false); }
      else if (act === 'req-del-custom') { var reqName = btn.dataset.name; confirmAsk({ title: T('حذف المادة'), text: T('هل تريد حذف مادة') + ' «' + reqName + '» ' + T('من المتطلبات؟'), okLabel: T('حذف'), onOk: function () { deleteCustomReq(reqName); } }); }
      else if (act === 'install-app') triggerInstall();
      else if (act === 'uni-open') openUniversity(btn.dataset.uni);
      else if (act === 'cs-new') openCasesheetForm(null, btn.dataset.template);
      else if (act === 'cs-open') openCasesheetForm(btn.dataset.id);
      else if (act === 'cs-del') deleteCasesheet(btn.dataset.id);
      else if (act === 'cs-save') saveCasesheetFromForm();
      else if (act === 'cs-preview') previewCasesheetLive();
      else if (act === 'cs-print') printCasesheetLive();
      else if (act === 'cs-photo-add') triggerCasesheetPhoto(btn.dataset.slot);
      else if (act === 'cs-photo-del') removeCasesheetPhoto(btn.dataset.slot);
      else if (act === 'ge-prev') gePrevPage();
      else if (act === 'ge-next') geNextPage();
      else if (act === 'ge-zoomreset') geResetZoom();
      else if (act === 'endo-canal-add') addEndoCanal();
      else if (act === 'endo-canal-del') delEndoCanal(parseInt(btn.dataset.idx, 10));
    }
    appRoot.addEventListener('click', function (e) { runAction(findAction(e), e); });
    appRoot.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('role') === 'button' && (t.classList.contains('row') || t.classList.contains('appt-card') || t.classList.contains('patient-card'))) {
        e.preventDefault(); runAction(findAction(e), e);
      }
    });
    // delegation (change): requirements inputs + attachment input
    $('app').addEventListener('change', function (e) {
      if (e.target && e.target.id === 'attInput') { addAttachments(e.target.dataset.id, e.target.files); e.target.value = ''; }
      else if (e.target && e.target.classList.contains('req-input')) { requirements[e.target.dataset.dept] = Math.max(0, toNum(e.target.value)); saveReqs(); if (window.DPSync) window.DPSync.markRequirementsDirty(); renderReqs(); }
    });

    var overlays = [els.caseOverlay, els.sessionOverlay, els.confirmOverlay];
    overlays.forEach(function (ov) { ov.addEventListener('click', function (e) { if (e.target === ov) hideOverlay(ov); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { overlays.forEach(function (ov) { hideOverlay(ov); }); closeImagePreview(); } });

    // نافذة معاينة المرفق (صورة)
    if (els.attViewClose) els.attViewClose.addEventListener('click', closeImagePreview);
    if (els.attViewCloseBtn) els.attViewCloseBtn.addEventListener('click', closeImagePreview);
    if (els.attViewOverlay) els.attViewOverlay.addEventListener('click', function (e) { if (e.target === els.attViewOverlay) closeImagePreview(); });
    if (els.attViewTab) els.attViewTab.addEventListener('click', function () { if (attViewUrl) { try { window.open(attViewUrl, '_blank'); } catch (e) {} } });

    window.addEventListener('hashchange', applyRoute);
    // إعادة فحص حاجز الوصول عند عودة التطبيق/الصفحة — دون فتح أي نافذة بصورة مزعجة، فقط إعادة فرض القفل إن كان قائماً
    window.addEventListener('pageshow', function () { enforceAccessLock(); });
    window.addEventListener('focus', function () { enforceAccessLock(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') enforceAccessLock(); });
    window.addEventListener('online', function () { enforceAccessLock(); });
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault(); deferredPrompt = e;
      if (!isStandalone()) { if (els.installBanner) els.installBanner.hidden = false; }
    });
    if (els.installBanner) els.installBanner.addEventListener('click', triggerInstall);
    if (els.setInstallBtn) els.setInstallBtn.addEventListener('click', triggerInstall);
    window.addEventListener('appinstalled', function () { hideInstallUI(); });
  }
  /* ---------- تثبيت التطبيق (PWA) ---------- */
  function isStandalone() {
    try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
    catch (e) { return false; }
  }
  function hideInstallUI() {
    deferredPrompt = null;
    if (els.installBanner) els.installBanner.hidden = true;
    updateSettingsInstallUI();
  }
  function updateSettingsInstallUI() {
    if (!els.setInstallStatus) return;
    if (isStandalone()) { els.setInstallStatus.textContent = T('التطبيق مثبت على الشاشة الرئيسية') + ' ✅'; if (els.setInstallBtn) els.setInstallBtn.hidden = true; }
    else { els.setInstallStatus.textContent = T('يمكنك تثبيت التطبيق على شاشتك الرئيسية لفتحه بسرعة كتطبيق مستقل.'); if (els.setInstallBtn) els.setInstallBtn.hidden = false; }
  }
  function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { hideInstallUI(); }, function () { hideInstallUI(); });
    } else {
      toast(T('اضغط على ⋮ أعلى المتصفح ثم اختر «إضافة إلى الشاشة الرئيسية»'), 4500);
    }
  }

  /* ---------- نظام تحديث PWA الآمن ---------- */
  var swReg = null, _refreshing = false;
  function showUpdate() { if (els.updateOverlay) showOverlay(els.updateOverlay); }
  function applyUpdate() {
    if (els.updateOverlay) els.updateOverlay.hidden = true;
    if (swReg && swReg.waiting) swReg.waiting.postMessage({ type: 'SKIP_WAITING' }); // ← يُفعّل التحديث ثم controllerchange يعيد التحميل
    else window.location.reload();
  }
  function checkForUpdates() {
    if (!('serviceWorker' in navigator) || !swReg) { if (els.updateStatus) els.updateStatus.textContent = T('التحديث غير متاح في هذا السياق.'); return; }
    if (els.updateStatus) els.updateStatus.textContent = T('جارٍ التحقق…');
    var handled = false;
    swReg.update().then(function () {
      setTimeout(function () {
        if (swReg.waiting && navigator.serviceWorker.controller) { handled = true; if (els.updateStatus) els.updateStatus.textContent = T('يتوفّر تحديث جديد.'); showUpdate(); }
      }, 700);
    }, function () {});
    fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (handled) return;
      if (j && j.version && j.version !== APP_VERSION) { if (els.updateStatus) els.updateStatus.textContent = T('يتوفّر تحديث') + ' (' + j.version + '). ' + T('سيُطبَّق عند إعادة فتح التطبيق.'); }
      else if (!swReg.waiting) { if (els.updateStatus) els.updateStatus.textContent = T('أنت على أحدث إصدار') + ' (' + APP_VERSION + ').'; }
    }, function () { if (!handled && els.updateStatus) els.updateStatus.textContent = T('تعذّر التحقق (لا يوجد اتصال؟).'); });
  }

  function setupPWA() {
    if (els.appVersion) els.appVersion.textContent = APP_VERSION;
    window.addEventListener('load', function () {
      var s = els.splash; if (s) setTimeout(function () { s.remove(); }, 1600);
      if (!('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('service-worker.js').then(function (reg) {
        swReg = reg;
        if (reg.waiting && navigator.serviceWorker.controller) showUpdate();   // تحديث جاهز من جلسة سابقة
        reg.addEventListener('updatefound', function () {
          var nw = reg.installing; if (!nw) return;
          nw.addEventListener('statechange', function () {
            if (nw.state === 'installed' && navigator.serviceWorker.controller) showUpdate(); // نسخة جديدة بانتظار الموافقة
          });
        });
      }, function () {});
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        if (_refreshing) return; _refreshing = true; window.location.reload();  // بعد الموافقة: إعادة تحميل مرة واحدة
      });
    });
  }

  var _wasInTrial = false;   // لرصد لحظة انتقال الحالة من trial إلى expired أثناء بقاء التطبيق مفتوحاً
  function updateTrialBanner() {
    if (!window.DPLicense || !els.trialBanner) return;
    var st = window.DPLicense.getAccessState();
    if (st === 'trial') {
      var h = window.DPLicense.trialRemainingHours();
      els.trialText.textContent = T('الفترة التجريبية المجانية — متبقٍ من التجربة:') + ' ' + h + ' ' + T('ساعة.');
      els.trialBanner.hidden = false;
      _wasInTrial = true;
    } else {
      els.trialBanner.hidden = true;   // مُفعّل (لا شريط) أو منتهية (شاشة تفعيل)
    }
    if (st === 'expired') {
      var justExpired = _wasInTrial;   // كانت trial في آخر فحص والآن أصبحت expired: انتهت التجربة أثناء الاستخدام
      _wasInTrial = false;
      enforceAccessLock();             // يغلق أي نافذة تشغيلية مفتوحة، يفعّل dp-access-locked، وينقل المسار إلى support فوراً
      if (justExpired) openActivation();   // يفتح شاشة التفعيل الإلزامية دون انتظار إعادة تحميل الصفحة
    } else {
      document.body.classList.remove('dp-access-locked');
    }
  }

  function init() {
    loadAll(); bindEvents();
    applyLanguageBase();   // يطبّق dir/lang/الخط ويترجم عناصر data-i18n الثابتة قبل أول رسم — حرج لتذكّر اختيار اللغة المحفوظ
    enforceAccessLock();   // فرض القفل فوراً قبل أول applyRoute إن كانت التجربة منتهية أصلاً عند الفتح
    applyRoute(); setupPWA();
    renderActivationPrompt();                // يملأ محتوى نافذة التنبيه (اختيارية/إلزامية) قبل أول رسم — activation.js تتحكم بإظهارها فقط
    updateTrialBanner();
    setInterval(updateTrialBanner, 60000);   // تحديث الوقت المتبقّي دورياً
    setTimeout(maybeShowStudentSetup, 700);  // إعداد أولي لبيانات الطالب إن لم تكن محفوظة (لا يتزاحم مع نافذة التفعيل)
    if (window.DPLicense) window.DPLicense.onActivated = function () {
      var wasLocked = document.body.classList.contains('dp-access-locked');
      if (els.trialBanner) els.trialBanner.hidden = true;   // إخفاء الشريط نهائياً بعد التفعيل
      showPlansOverride = false; selectedPlanId = null;     // إعادة ضبط تدفّق اختيار الخطة بعد نجاح التفعيل/التجديد
      hideOverlay(document.getElementById('actCodeOverlay'));
      hideOverlay(document.getElementById('paymentOverlay'));
      hideOverlay(document.getElementById('activationOverlay'));
      actCodeFromForced = false;
      enforceAccessLock();   // getAccessState() أصبحت الآن activated: يزيل dp-access-locked ويُعيد تفعيل الـRouter وعناصر التنقّل
      updateCounts();
      if (wasLocked) go('dashboard');                        // كان مقفلاً داخل support: انتقل الآن إلى dashboard
      else if (currentView === 'settings') renderSettings();
      else if (currentView === 'support') renderSupport();
      setTimeout(maybeShowStudentSetup, 400);
    };
  }
  document.addEventListener('DOMContentLoaded', init);

  /* نقطة دخول صغيرة لملف المزامنة (firebase-sync.js) فقط: إعادة قراءة LocalStorage
     وتحديث الواجهة بعد عملية استعادة/دمج ناجحة. لا تُشارك أي حالة داخلية أخرى. */
  window.DPApp = {
    reloadFromStorage: function () { loadAll(); refresh(); markDrawerActive(); }
  };
})();
