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
  var APP_VERSION = '1.10.1';

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
  function deptLabel(v) { for (var i = 0; i < DEPT_DEFS.length; i++) { if (DEPT_DEFS[i].value === v) return DEPT_DEFS[i].label; } return v; }
  var MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var WEEKDAYS_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت']; // getDay(): 0..6
  var WEEKDAYS_SHORT = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت'];
  var DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  var STATUSES = ['قيد الانتظار', 'قيد العمل', 'مكتملة', 'تحتاج مراجعة', 'ملغاة'];
  var VIEWS = ['dashboard', 'all', 'reqs', 'completed', 'bysubject', 'subject', 'backup', 'settings', 'support', 'file', 'casesheets', 'csform'];

  var $ = function (id) { return document.getElementById(id); };
  var els = {};
  ['backBtn','menuBtn','installBanner','dcAll','dcReqsRing','dcReqsVal','allSearch','allList','allEmpty',
   'reqsList','reqAddBtn','reqAddForm','reqNewName','completedList','completedEmpty','bySubjectList','bySubjectEmpty','subjectTitle','subjectList','subjectEmpty','exportBtn','importBtn','importFile','setNameDisplay','setLevelDisplay','setCollegeDisplay','editStudentBtn','scheduleEditor','saveSettingsBtn','setDeviceId',
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
   'csTemplates','csTitle','csFormBody'
  ].forEach(function (k) { els[k] = $(k); });

  var cases = [], settings = { studentName: '', level: '', college: '', schedule: {} }, requirements = {}, attachments = {}, customReqs = [], casesheets = [];
  var currentCsId = null, currentCsPhotos = {};   // حالة نموذج الكاسشيت المفتوح حالياً (غير محفوظة بعد إن كانت جديدة)
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
    var changed = false;
    cases.forEach(function (c) {
      if (!Array.isArray(c.sessions)) c.sessions = [];
      if (typeof c.apptDate !== 'string') c.apptDate = '';   // ترحيل: حقل تاريخ الموعد الجديد
      if (typeof c.day !== 'string') c.day = c.day || '';
      // ترحيل أسماء المواد القديمة إلى القيم الجديدة (دون فقدان أي حالة أو أي بيانات أخرى)
      if (c.department && DEPT_MIGRATE[c.department]) { c.department = DEPT_MIGRATE[c.department]; changed = true; }
      // ترحيل: تعيين تاريخ الأرشفة للحالات المكتملة القديمة دون حذف أو تغيير أي بيانات أخرى
      if (c.status === 'مكتملة' && !c.completedAt) c.completedAt = c.createdAt || '';
    });
    if (changed) { try { saveCases(); } catch (e) {} }   // ثبّت ترحيل أسماء المواد في التخزين مرة واحدة
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
  function weekday(s) { var d = parseDateLocal(s); return d ? WEEKDAYS_AR[d.getDay()] : ''; }
  function longDateAr(s) { var d = parseDateLocal(s); return d ? (d.getDate() + ' ' + MONTHS_AR[d.getMonth()] + ' ' + d.getFullYear()) : ''; }
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
  function timeLabel(t) { if (!t) return ''; var p = String(t).split(':'); var h = +p[0], m = p[1] || '00'; var ap = h < 12 ? 'صباحاً' : 'مساءً'; var h12 = h % 12; if (h12 === 0) h12 = 12; return h12 + ':' + m + ' ' + ap; }
  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
  function statusMeta(s) {
    return { 'قيد الانتظار': { cls: 'st-wait' }, 'قيد العمل': { cls: 'st-work' }, 'مكتملة': { cls: 'st-done' }, 'تحتاج مراجعة': { cls: 'st-review' }, 'ملغاة': { cls: 'st-cancel' } }[s] || { cls: 'st-wait' };
  }
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
    if (t.indexOf('image/') === 0) return 'صورة';
    if (t.indexOf('pdf') >= 0 || /\.pdf$/i.test(nm)) return 'PDF';
    if (t.indexOf('word') >= 0 || /\.docx?$/i.test(nm)) return 'مستند';
    var ext = nm.indexOf('.') >= 0 ? nm.split('.').pop() : '';
    return (ext && ext.length <= 5) ? ext.toUpperCase() : 'ملف';
  }
  function fmtSize(n) { n = +n; if (!n || isNaN(n)) return ''; if (n < 1024) return n + ' ب'; if (n < 1048576) return Math.round(n / 1024) + ' ك.ب'; return (n / 1048576).toFixed(1) + ' م.ب'; }
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
    var name = settings.studentName || 'طالب طب الأسنان';
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
  function openDrawer() {
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
        '<span class="cal-day-name">' + WEEKDAYS_AR[d.getDay()] + '</span>' +
        '<span class="cal-day-num">' + d.getDate() + '</span></button>';
    }
    els.calStrip.innerHTML = html;
    updateCalNote(todayIso, true);
  }
  function updateCalNote(iso, isToday) {
    if (!els.calNote) return;
    var n = cases.filter(function (c) { return c.apptDate === iso; }).length;
    var suffix = isToday ? 'اليوم' : 'في هذا اليوم';
    els.calNote.textContent = n > 0 ? ('لديك ' + n + ' ' + (n === 1 ? 'حالة' : 'حالات') + ' ' + suffix) : ('لا توجد حالات ' + suffix);
  }
  function todayTomorrowIso() {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    return { todayIso: isoDate(today), tomorrowIso: isoDate(tomorrow) };
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
      var tag = isToday ? 'قريب' : 'غداً';
      var deptText = c.department ? deptLabel(c.department) : '';
      var typeText = [deptText, c.caseType].filter(Boolean).join(' · ');
      var desc = c.notes ? c.notes : (isToday ? 'موعد متابعة الحالة السريرية' : 'موعد الحالة السريرية');
      var timeText = c.apptTime || '—';
      return '<button type="button" class="today-card" data-act="open" data-id="' + c.id + '">' +
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
    if (els.heroName) els.heroName.textContent = settings.studentName || 'طالب طب الأسنان';
    if (els.heroMeta) {
      var metaParts = [settings.level, settings.college].filter(Boolean);
      els.heroMeta.textContent = metaParts.length ? metaParts.join(' · ') : 'DentPilot Student';
    }
    if (els.heroBadgeTotal) els.heroBadgeTotal.textContent = totalCount + ' حالات';
    if (els.heroBadgeDone) els.heroBadgeDone.textContent = doneCount + ' مكتملة';
    els.dcAll.textContent = totalCount;   // جميع المرضى: كل الحالات (مكتملة وغير مكتملة)
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
    var restoreBtn = opts.showRestore ? '<button type="button" class="btn-restore" data-act="restore" data-id="' + c.id + '" title="إرجاع إلى الحالات الحالية">↩︎ إرجاع</button>' : '';
    var completeBtn = (c.status !== 'مكتملة') ? '<button type="button" class="row-complete-btn" data-act="complete" data-id="' + c.id + '" title="إنهاء الحالة">✅ إنهاء</button>' : '';
    return '<div class="row ' + (c.status === 'مكتملة' ? 'is-done' : '') + '">' +
      '<span class="row-no">' + pad(index) + '</span>' +
      '<div class="row-main">' +
        '<span class="row-name">' + esc(c.name) + '</span>' +
        (deptText ? '<span class="row-dept">' + esc(deptText) + '</span>' : '') +
        '<span class="row-status ' + st.cls + '">' + (c.status === 'مكتملة' ? '✅ ' : '') + esc(c.status || '—') + '</span>' +
      '</div>' +
      restoreBtn + completeBtn +
      '<button type="button" class="row-open-btn" data-act="open" data-id="' + c.id + '">📁 فتح ملف المريض</button>' +
    '</div>';
  }

  /* ---------- All patients ---------- */
  function renderAll() {
    var q = els.allSearch.value.trim().toLowerCase();
    var base = cases;   // إجمالي الحالات: تطابق رقم الإحصائية العلوية (تشمل المكتملة وغير المكتملة)
    var list = q ? base.filter(function (c) {
      return (c.name || '').toLowerCase().indexOf(q) >= 0 || (c.phone || '').toLowerCase().indexOf(q) >= 0 ||
             (c.department || '').toLowerCase().indexOf(q) >= 0 || (c.caseType || '').toLowerCase().indexOf(q) >= 0;
    }) : base;
    if (base.length === 0) { els.allList.innerHTML = ''; els.allEmpty.hidden = false; els.allEmpty.querySelector('p').textContent = 'لا توجد حالات بعد.'; els.allEmpty.querySelector('span').textContent = 'اضغط «إضافة حالة» لتسجيل أول حالة.'; return; }
    if (list.length === 0) { els.allList.innerHTML = ''; els.allEmpty.hidden = false; els.allEmpty.querySelector('p').textContent = 'لا توجد نتائج.'; els.allEmpty.querySelector('span').textContent = 'جرّب بحثاً آخر.'; return; }
    els.allEmpty.hidden = true;
    els.allList.innerHTML = list.slice().sort(caseSort).map(function (c, i) { return caseRow(c, i + 1); }).join('');
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
          (isCustom ? '<button type="button" class="req-del" data-act="req-del-custom" data-name="' + esc(d) + '" title="حذف المادة" aria-label="حذف المادة">✕</button>' : '') +
          '<input class="req-input" type="number" min="0" inputmode="numeric" data-dept="' + esc(d) + '" value="' + (req || 0) + '" /></div>' +
        '<div class="req-bar"><div class="req-fill ' + (full ? 'full' : '') + '" style="width:' + pct + '%"></div></div>' +
        '<div class="req-meta"><span class="req-done">المكتمل: <b>' + done + ' / ' + (req || 0) + '</b></span><span>المتبقي: <b>' + remaining + '</b></span></div>' +
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
    if (exists) { toast('هذه المادة موجودة بالفعل'); return false; }
    customReqs.push(n); saveCustomReqs(); renderReqs(); toast('تمت إضافة «' + n + '»');
    return true;
  }
  function deleteCustomReq(name) {
    customReqs = customReqs.filter(function (d) { return d !== name; });
    delete requirements[name];
    saveCustomReqs(); saveReqs(); renderReqs();
  }

  /* ============================================================
     الكاسشيتات (نظام مستقل تماماً عن نظام الحالات — لا يُغيّر أي منطق فيه)
     ============================================================ */
  var CS_TEMPLATES = { 'jazeera-oral-surgery': { name: 'جامعة الجزيرة — Oral Surgery', sub: 'University of Al-Jazeera — Faculty of Oral and Dental Medicine' } };
  var CS_PHOTO_SLOTS = [
    { key: 'pre1', label: 'Preoperative Image 1' },
    { key: 'pre2', label: 'Preoperative Image 2' },
    { key: 'during', label: 'During operative Image' },
    { key: 'xray', label: 'X-ray Image' }
  ];

  function csField(label, inputHtml) { return '<div class="field"><label>' + esc(label) + '</label>' + inputHtml + '</div>'; }
  function csSelect(fieldKey, options, placeholder) {
    return '<select data-field="' + fieldKey + '"><option value="">' + esc(placeholder || '—') + '</option>' +
      options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>';
  }
  var CS_YESNO = [['yes', 'Yes'], ['no', 'No']];
  function csCheck(fieldKey, label) { return '<label class="cs-check"><input type="checkbox" data-field="' + fieldKey + '" /> ' + esc(label) + '</label>'; }
  function csSection(title, bodyHtml) { return '<div class="cs-block"><h3 class="cs-sec-title">' + esc(title) + '</h3>' + bodyHtml + '</div>'; }

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

  function collectCasesheetForm() {
    var data = {};
    document.querySelectorAll('#csFormBody [data-field]').forEach(function (el) {
      var k = el.dataset.field;
      data[k] = (el.type === 'checkbox') ? el.checked : el.value;
    });
    return data;
  }
  function fillCasesheetForm(data) {
    data = data || {};
    document.querySelectorAll('#csFormBody [data-field]').forEach(function (el) {
      var k = el.dataset.field, v = data[k];
      if (el.type === 'checkbox') el.checked = !!v;
      else el.value = (v === undefined || v === null) ? '' : v;
    });
  }
  function refreshCasesheetPhotos() {
    CS_PHOTO_SLOTS.forEach(function (s) {
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
    var tpl = CS_TEMPLATES['jazeera-oral-surgery'];
    var tplCard = '<button type="button" class="dash-card accent" data-act="cs-new" data-template="jazeera-oral-surgery" style="width:100%">' +
      '<span class="dash-emoji icon-svg"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"></path><path d="M14 3v4h4"></path><path d="M9 12h6M9 16h6"></path></svg></span><span class="dash-title">' + esc(tpl.name) + '</span><span class="dash-sub">' + esc(tpl.sub) + '</span></button>';
    var saved = casesheets.slice().sort(function (a, b) { return (b.updatedAt || '').localeCompare(a.updatedAt || ''); });
    var savedHtml = saved.length
      ? '<h3 class="sub-h" style="margin-top:18px">📁 الكاسشيتات المحفوظة</h3><div class="rows">' + saved.map(csRow).join('') + '</div>'
      : '';
    if (els.csTemplates) els.csTemplates.innerHTML = tplCard + savedHtml;
  }
  function csRow(sheet) {
    var d = sheet.data || {};
    return '<div class="row">' +
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
  function openCasesheetForm(id) { location.hash = 'csform/' + (id || 'new'); applyRoute(); }
  function renderCasesheetForm(param) {
    var sheet = (param && param !== 'new') ? casesheets.find(function (x) { return x.id === param; }) : null;
    currentCsId = sheet ? sheet.id : null;
    currentCsPhotos = sheet && sheet.photos ? Object.assign({}, sheet.photos) : {};
    if (els.csTitle) els.csTitle.textContent = sheet ? 'تعديل الكاسشيت' : 'كاسشيت جديد — ' + (CS_TEMPLATES['jazeera-oral-surgery'].name);
    if (els.csFormBody) {
      els.csFormBody.innerHTML = buildCasesheetFormHTML();
      fillCasesheetForm(sheet ? sheet.data : {});
      refreshCasesheetPhotos();
      // مستمعات ملفات الصور (خاصة بهذا الرسم فقط، لا تتراكم لأن innerHTML يُستبدل بالكامل في كل مرة)
      CS_PHOTO_SLOTS.forEach(function (s) {
        var inp = document.getElementById('csPhotoInput_' + s.key);
        if (inp) inp.addEventListener('change', function (e) { handleCasesheetPhotoChange(s.key, e.target.files && e.target.files[0]); e.target.value = ''; });
      });
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
      var sheet = { id: uid(), template: 'jazeera-oral-surgery', data: data, photos: currentCsPhotos, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
      localStorage.setItem(CS_PRINT_HANDOFF_KEY, JSON.stringify({ template: 'jazeera-oral-surgery', data: collectCasesheetForm(), photos: currentCsPhotos }));
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
    confirmAsk({ title: 'إنهاء الحالة', text: 'تعيين حالة «' + esc(c.name) + '» كمكتملة؟ يمكنك إرجاعها لاحقاً من قسم الحالات المكتملة.', okLabel: 'إنهاء الحالة', danger: false,
      onOk: function () {
        c.status = 'مكتملة'; if (!c.completedAt) c.completedAt = new Date().toISOString();
        saveCases(); refresh(); toast('تم إنهاء الحالة');
      } });
  }
  function restoreCase(id) {
    var c = cases.find(function (x) { return x.id === id; }); if (!c) return;
    confirmAsk({ title: 'إرجاع الحالة', text: 'إرجاع الحالة «' + esc(c.name) + '» إلى الحالات الحالية؟', okLabel: 'إرجاع', danger: false,
      onOk: function () {
        c.status = 'قيد العمل';           // إرجاعها لحالة نشطة/قيد العمل
        if ('completedAt' in c) delete c.completedAt;
        saveCases(); refresh(); toast('تم إرجاع الحالة إلى الحالات الحالية');
      } });
  }

  function saveNotes(id) {
    var c = cases.find(function (x) { return x.id === id; }); if (!c) return;
    var ta = $('caseNotes'); if (!ta) return;
    c.notes = ta.value; saveCases(); toast('تم حفظ الملاحظات');
  }

  /* ---------- Attachments helper (per-case) ---------- */
  function attListFor(caseId) { return attachments[caseId] || []; }

  /* ---------- Cases by subject/material ---------- */
  var NO_SUBJECT = 'بدون مادة محددة';
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
    els.bySubjectList.innerHTML = g.order.map(function (k) {
      var label = (k === NO_SUBJECT) ? k : deptLabel(k);
      return '<button type="button" class="subj-strip" data-act="subject-open" data-key="' + encodeURIComponent(k) + '">' +
        '<span class="subj-strip-bar"></span>' +
        '<span class="subj-strip-main"><span class="subj-strip-name">' + esc(label) + '</span><span class="subj-strip-count">' + g.groups[k].length + ' حالة</span></span>' +
        '<span class="subj-strip-btn">عرض الحالات ›</span>' +
      '</button>';
    }).join('');
  }
  function openSubject(keyEncoded) { location.hash = 'subject/' + keyEncoded; applyRoute(); }
  function renderSubjectCases(key) {
    var label = (key === NO_SUBJECT) ? key : deptLabel(key);
    if (els.subjectTitle) els.subjectTitle.textContent = '📋 حالات ' + label;
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
  function waMessage() {
    var st = accessStateSafe();
    var stAr = st === 'activated' ? 'مفعل' : (st === 'expired' ? 'انتهت الفترة التجريبية' : 'فترة تجريبية');
    // ملاحظة: لا تتضمّن الرسالة أي بيانات مرضى/حالات/مرفقات/ملاحظات — رمز التطبيق وحالة التفعيل فقط.
    return 'السلام عليكم\nأريد تفعيل DentPilot Student\n\nرمز التطبيق الخاص بهذا الهاتف: ' + appCode() + '\nحالة التفعيل: ' + stAr + '\nطريقة الدفع:\nرقم العملية:';
  }
  function waSupportLink(num) { return 'https://wa.me/' + num + '?text=' + encodeURIComponent(waMessage()); }
  function openActivation() {
    var ov = document.getElementById('activationOverlay'); if (!ov) return;
    var later = document.getElementById('actLaterBtn');
    if (later) later.hidden = (accessStateSafe() === 'expired');   // أثناء التجربة: يمكن الإغلاق — بعد الانتهاء: التفعيل إلزامي
    showOverlay(ov);
    try { var inp = document.getElementById('actCode'); if (inp) inp.focus(); } catch (e) {}
  }
  function waButtons() {
    return '<div class="wa-row">' + SUPPORT.wa.map(function (w) {
      return '<a class="wa-btn" href="' + waSupportLink(w.num) + '" target="_blank" rel="noopener">واتساب ' + w.label + '</a>';
    }).join('') + '</div>';
  }
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
  function agentCardHtml(afterActivation) {
    var note = afterActivation
      ? 'يمكنكم التواصل مع الوكيل الطلابي لأي استفسار أو دعم فني.'
      : 'يمكنكم الحصول على كود التفعيل من الوكيل لطلاب محافظة إب.';
    return '<div class="sup-card agents-card"><div class="sup-h">الوكلاء الطلابيون</div>' +
      '<div class="agent-mini"><div><b>وكيل طلابي لطلاب محافظة إب</b>' +
        '<span>الاسم: فراس المجمر</span><span>واتساب: 771697735</span>' +
        '<p>' + note + '</p></div>' +
        '<a class="wa-btn agent-wa" href="https://wa.me/967771697735" target="_blank" rel="noopener">واتساب 771697735</a></div></div>';
  }
  function renderSupport() {
    if (!els.supportBody) return;
    var st = accessStateSafe(), code = esc(appCode());
    if (st === 'activated') {
      els.supportBody.innerHTML =
        '<div class="sup-activated"><div class="sup-ok">✅ التطبيق مفعل بنجاح</div>' +
          '<div class="dev-name">تم تطوير التطبيق بواسطة: <b>' + esc(SUPPORT.dev) + '</b></div>' +
          '<div class="dev-name" style="margin-top:8px">للدعم أو الاستفسار:</div>' + waButtons() + '</div>' +
        '<div class="sup-divider"></div>' +
        agentCardHtml(true);
      return;
    }
    var trialBlock;
    if (st === 'expired') {
      trialBlock = '<div class="sup-card warn"><div class="sup-h">انتهت الفترة التجريبية</div><p>للاستمرار في استخدام التطبيق، يرجى التفعيل عبر التواصل مع الدعم.</p></div>';
    } else {
      var h = (window.DPLicense && window.DPLicense.trialRemainingHours) ? window.DPLicense.trialRemainingHours() : 0;
      trialBlock = '<div class="sup-card"><div class="sup-h">الفترة التجريبية المجانية</div>' +
        '<p>يمكنك تجربة التطبيق مجاناً، ويمكنك تفعيله في أي وقت دون انتظار انتهاء الفترة.</p>' +
        (h ? '<div class="sup-remain">المتبقي من التجربة: ' + h + ' ساعة</div>' : '') + '</div>';
    }
    els.supportBody.innerHTML =
      trialBlock +
      '<div class="sup-card activate-cta"><button type="button" class="btn btn-primary" data-act="activate-now" style="width:100%">تفعيل التطبيق الآن</button></div>' +
      '<div class="sup-card"><div class="sup-h">شراء مرة واحدة</div><p>التطبيق لا يحتاج اشتراكاً شهرياً. بعد التفعيل يمكنك استخدامه على هذا الهاتف بشكل دائم.</p></div>' +
      '<div class="sup-card price-card"><div class="sup-h">سعر تفعيل نسخة الطلاب</div><div class="sup-price">' + esc(SUPPORT.price) + '</div></div>' +
      '<div class="sup-card"><div class="sup-h">تعليمات الدفع</div><ol class="sup-steps"><li>ادفع عبر إحدى طرق الدفع التالية.</li><li>انسخ رقم الحساب أو رقم الدفع.</li><li>بعد الدفع أرسل صورة الإيصال أو رقم العملية عبر واتساب مع رمز التطبيق الخاص بهذا الهاتف.</li><li>سيتم إرسال كود التفعيل لك.</li></ol></div>' +
      '<div class="sup-card"><div class="sup-h">طرق الدفع</div>' +
        '<div class="pay-card"><div class="pay-title">🏦 بنك الكريمي</div>' +
          '<div class="pay-kv"><span>صاحب الحساب</span><b>' + esc(SUPPORT.kuraimi.name) + '</b></div>' +
          '<div class="pay-kv"><span>رقم الحساب</span><b class="mono">' + esc(SUPPORT.kuraimi.acct) + '</b></div>' +
          '<button type="button" class="btn btn-ghost copy-btn" data-act="copy" data-copy="' + esc(SUPPORT.kuraimi.acct) + '">نسخ الرقم</button></div>' +
        '<div class="pay-card"><div class="pay-title">👛 محفظة جيب</div>' +
          '<div class="pay-kv"><span>صاحب الحساب</span><b>' + esc(SUPPORT.jeeb.name) + '</b></div>' +
          '<div class="pay-kv"><span>رقم الدفع</span><b class="mono">' + esc(SUPPORT.jeeb.pay) + '</b></div>' +
          '<div class="pay-note">هذا رقم الدفع البديل لمحفظة جيب</div>' +
          '<button type="button" class="btn btn-ghost copy-btn" data-act="copy" data-copy="' + esc(SUPPORT.jeeb.pay) + '">نسخ الرقم</button></div>' +
      '</div>' +
      '<div class="sup-card"><div class="sup-h">بعد الدفع:</div><p>أرسل صورة الإيصال أو رقم العملية عبر واتساب مع رمز التطبيق الخاص بهذا الهاتف.</p></div>' +
      '<div class="sup-card"><div class="sup-h">تواصل مع الدعم عبر واتساب</div>' + waButtons() +
        '</div>' +
      agentCardHtml(false);
  }

  /* ---------- Settings ---------- */
  function openStudentSetup() {
    els.setupName.value = settings.studentName || '';
    els.setupLevel.value = settings.level || '';
    els.setupCollege.value = settings.college || '';
    els.setupName.classList.remove('invalid');
    els.studentSetupTitle.textContent = settings.studentName ? 'تعديل بيانات الطالب' : 'مرحباً بك في DentPilot 👋';
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
    closeStudentSetup();
    renderStudentDisplay();
    updateCounts();
    toast('تم حفظ بيانات الطالب');
  }
  function maybeShowStudentSetup() {
    if (settings.studentName) return;                                              // بيانات محفوظة أصلاً — لا تظهر تلقائياً
    var actOv = document.getElementById('activationOverlay');
    if (actOv && !actOv.hidden) return;                                            // لا نتزاحم مع نافذة التفعيل
    openStudentSetup();
  }
  function renderSettings() {
    renderStudentDisplay();
    els.scheduleEditor.innerHTML = DAYS.map(function (day) {
      var cur = settings.schedule[day] || '';
      return '<div class="sched-row"><span class="sched-day">' + esc(day) + '</span>' +
        '<select data-day="' + esc(day) + '"><option value="">—</option>' +
        DEPTS.map(function (d) { return '<option value="' + esc(d) + '"' + (d === cur ? ' selected' : '') + '>' + esc(d) + '</option>'; }).join('') +
        '</select></div>';
    }).join('');
    els.setDeviceId.textContent = (window.DPLicense && window.DPLicense.getDeviceId) ? window.DPLicense.getDeviceId() : '—';
    if (els.appVersion) els.appVersion.textContent = APP_VERSION;
    updateSettingsInstallUI();
    if (els.accessStatus && window.DPLicense) {
      var stt = window.DPLicense.getAccessState();
      var info = window.DPLicense.getActivationInfo ? window.DPLicense.getActivationInfo() : null;
      if (stt === 'activated' && info) {
        els.accessStatus.textContent = 'مفعل — ' + (info.planLabel || 'مدى الحياة') + (info.expiresAt ? (' — ينتهي في ' + fmtDate(new Date(info.expiresAt).toISOString().slice(0, 10))) : '');
      } else {
        els.accessStatus.textContent = stt === 'activated' ? 'مفعل'
          : stt === 'trial' ? ('فترة تجريبية — المتبقي: ' + window.DPLicense.trialRemainingHours() + ' ساعة')
          : 'انتهت الفترة التجريبية';
      }
    }
  }

  /* ---------- Case file ---------- */
  function renderFile(id) {
    var c = cases.find(function (x) { return x.id === id; });
    if (!c) { go(fileOrigin || 'all'); return; }
    var st = statusMeta(c.status);
    var info = function (l, v) { return '<div class="info-card"><span class="info-label">' + l + '</span><span class="info-value">' + v + '</span></div>'; };
    els.fileBody.innerHTML =
      '<div class="file-hero"><span class="file-avatar">' + esc(initial(c.name)) + '</span>' +
        '<div class="file-hero-main"><h2>' + esc(c.name) + '</h2><div class="file-hero-sub">' + (esc(c.department) || '—') + (c.caseType ? ' • ' + esc(c.caseType) : '') + '</div></div>' +
        '<span class="file-status">' + esc(c.status || '—') + '</span></div>' +
      '<div class="file-actions">' +
        callLink(c.phone, '', ' اتصال') + waLink(c.phone, '', ' واتساب') +
        (c.status !== 'مكتملة' ? '<button type="button" class="card-btn complete" data-act="complete" data-id="' + c.id + '">✅ إنهاء الحالة</button>' : '') +
        '<button type="button" class="card-btn" data-act="edit" data-id="' + c.id + '">✏️ تعديل</button>' +
        '<button type="button" class="card-btn" data-act="print" data-id="' + c.id + '">🖨 طباعة</button>' +
        '<button type="button" class="card-btn del" data-act="del" data-id="' + c.id + '">🗑️ حذف</button>' +
      '</div>' +
      '<div class="file-block"><div class="fs-head"><span class="fs-ico">🧾</span><h3>بيانات الحالة</h3></div>' +
        '<div class="info-grid">' +
          info('الاسم', esc(c.name)) + info('الهاتف', esc(c.phone) || '—') +
          info('القسم', esc(c.department) || '—') + info('نوع الحالة', esc(c.caseType) || '—') +
          info('السن المعالَج', esc(c.tooth) || '—') + info('اليوم المخصّص', c.day ? esc(c.day) : 'بدون يوم محدد') +
          info('تاريخ الموعد', c.apptDate ? esc(longDateAr(c.apptDate)) : '—') +
          info('اليوم', effWeekday(c) ? esc(effWeekday(c)) : '—') +
          info('وقت الموعد', c.apptTime ? esc(timeLabel(c.apptTime)) : '—') +
          info('حالة الإنجاز', '<span class="row-status ' + st.cls + '">' + esc(c.status || '—') + '</span>') +
        '</div></div>' +
      sessionsSection(c) + notesSection(c) + attachSection(c);
  }

  function sessionsSection(c) {
    var list = (c.sessions || []).slice().sort(function (a, b) { return (toNum(a.number) - toNum(b.number)); });
    var body = list.length ? list.map(function (s) {
      return '<div class="sess-card ' + (s.status === 'منجزة' ? 'done' : '') + '">' +
        '<div class="sess-head"><span class="sess-no">جلسة ' + (esc(s.number) || '—') + '</span>' +
          '<span class="sess-when">' + esc(fmtDate(s.date)) + (s.date ? ' • ' + esc(weekday(s.date)) : '') + (s.time ? ' • ' + esc(s.time) : '') + '</span>' +
          '<span class="sess-st ' + sessStMeta(s.status) + '">' + esc(s.status || '') + '</span>' +
          '<span><button type="button" class="mini-btn" data-act="sess-edit" data-id="' + c.id + '" data-sid="' + s.id + '">✏️</button>' +
          '<button type="button" class="mini-btn del" data-act="sess-del" data-id="' + c.id + '" data-sid="' + s.id + '">🗑️</button></span></div>' +
        (s.proc ? '<div class="sess-body">🦷 ' + esc(s.proc) + '</div>' : '') +
        (s.notes ? '<div class="sess-note">📝 ' + esc(s.notes) + '</div>' : '') +
        (s.next ? '<div class="sess-next">🗓️ القادم: ' + esc(fmtDT(s.next)) + ' • ' + esc(weekday(s.next)) + '</div>' : '') +
      '</div>';
    }).join('') : '<div class="sub-empty">لا توجد جلسات بعد.</div>';
    return '<div class="file-block"><div class="fs-head"><span class="fs-ico">🦷</span><h3>الجلسات</h3>' +
      '<button type="button" class="card-btn" data-act="sess-add" data-id="' + c.id + '">➕ إضافة جلسة</button></div>' +
      '<div>' + body + '</div></div>';
  }

  function notesSection(c) {
    return '<div class="file-block"><div class="fs-head"><span class="fs-ico">📝</span><h3>ملاحظات الحالة</h3></div>' +
      '<textarea id="caseNotes" class="notes-area" placeholder="اكتب ملاحظات عامة عن الحالة…">' + esc(c.notes || '') + '</textarea>' +
      '<div class="form-actions" style="margin-top:10px"><button type="button" id="saveNotesBtn" class="btn btn-primary" data-act="save-notes" data-id="' + c.id + '">حفظ الملاحظات</button></div></div>';
  }

  function attachSection(c) {
    var list = attListFor(c.id);
    var body = list.length ? '<div class="att-grid">' + list.map(function (a) { return attCard(a, c, false); }).join('') + '</div>' : '<div class="sub-empty">لا توجد مرفقات. أضف صوراً/أشعة/مستندات للحالة.</div>';
    return '<div class="file-block"><div class="fs-head"><span class="fs-ico">📎</span><h3>المرفقات</h3>' +
      '<button type="button" class="card-btn" data-act="att-add" data-id="' + c.id + '">➕ إضافة مرفق</button></div>' + body +
      '<input type="file" id="attInput" accept="image/*,.pdf,.doc,.docx" multiple hidden /></div>';
  }

  /* ---------- Router ---------- */
  function parseHash() { var raw = location.hash.replace(/^#/, ''); var p = raw.split('/'); return { name: VIEWS.indexOf(p[0]) >= 0 ? p[0] : 'dashboard', param: decodeURIComponent(p[1] || '') }; }
  function go(name) { if (name === 'add') { openCase(null); return; } location.hash = name; applyRoute(); }
  function openFile(id) { fileOrigin = (currentView === 'subject') ? ('subject/' + encodeURIComponent(currentParam)) : (currentView === 'bysubject' ? 'bysubject' : (currentView === 'completed' ? 'completed' : (currentView === 'all' ? 'all' : fileOrigin))); location.hash = 'file/' + id; applyRoute(); }
  function goBack() {
    if (currentView === 'file') { var o = fileOrigin || 'all'; location.hash = o; applyRoute(); }
    else if (currentView === 'csform') go('casesheets');
    else if (currentView === 'subject') go('bysubject');
    else go('dashboard');
  }
  function applyRoute() {
    var r = parseHash(); currentView = r.name; currentParam = r.param;
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.dataset.view !== r.name; });
    els.backBtn.hidden = (r.name === 'dashboard');
    if (els.menuBtn) els.menuBtn.hidden = (r.name !== 'dashboard');
    renderActiveView();
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, 0); }
  }
  function renderActiveView() {
    updateCounts();
    if (currentView === 'dashboard') { /* static */ }
    else if (currentView === 'all') renderAll();
    else if (currentView === 'reqs') renderReqs();
    else if (currentView === 'completed') renderCompleted();
    else if (currentView === 'bysubject') renderBySubject();
    else if (currentView === 'subject') renderSubjectCases(currentParam);
    else if (currentView === 'settings') renderSettings();
    else if (currentView === 'support') renderSupport();
    else if (currentView === 'file') renderFile(currentParam);
    else if (currentView === 'casesheets') renderCasesheets();
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
    if (!currentEndoCanals.length) { els.endoCanalsList.innerHTML = '<p class="req-desc" style="margin:0 0 8px">لا توجد قنوات بعد. اضغط «+ إضافة قناة».</p>'; return; }
    els.endoCanalsList.innerHTML = currentEndoCanals.map(function (cn, i) {
      // اسم القناة: إن لم يكن ضمن القائمة القياسية فهو قيمة مخصّصة (Other)
      var isKnown = CANAL_NAMES.indexOf(cn.name) >= 0 && cn.name !== 'Other';
      var selVal = isKnown ? cn.name : (cn.name ? 'Other' : '');
      var otherVal = isKnown ? '' : (cn.name || '');
      var showOther = selVal === 'Other';
      return '<div class="canal-card" data-canal="' + i + '">' +
        '<div class="canal-head"><span class="canal-idx">قناة ' + (i + 1) + '</span>' +
          '<button type="button" class="canal-del" data-act="endo-canal-del" data-idx="' + i + '" title="حذف القناة" aria-label="حذف القناة">✕</button></div>' +
        '<div class="canal-grid">' +
          '<div class="field full"><label>Canal name</label><select data-canal-field="name" data-idx="' + i + '"><option value="">—</option>' + canalNameOptions(selVal) + '</select></div>' +
          '<div class="field full canal-other" data-idx="' + i + '"' + (showOther ? '' : ' hidden') + '><label>اسم القناة (مخصّص)</label><input type="text" data-canal-field="nameOther" data-idx="' + i + '" value="' + esc(otherVal) + '" placeholder="اكتب اسم القناة" /></div>' +
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
      'Prosthodontics': '👑 Prosthodontics', 'أخرى': 'أخرى...' };
    if (els.cDeptBtn) els.cDeptBtn.textContent = (d && DEPT_LABELS[d]) ? DEPT_LABELS[d] : (d || 'اختر التخصص');

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
    els.caseForm.reset(); els.cName.classList.remove('invalid');
    fillSelect(els.cStatus, STATUSES); fillSelect(els.cDay, DAYS, 'بدون يوم محدد');
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
        els.caseTitle.textContent = 'تعديل الحالة'; els.caseId.value = c.id;
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
      els.caseTitle.textContent = 'إضافة حالة'; els.caseId.value = ''; els.cStatus.value = 'قيد الانتظار'; 
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
    saveCases(); refresh(); closeCase(); toast(id ? 'تم تحديث الحالة' : 'تمت إضافة الحالة');
  }

  /* ---------- Session modal ---------- */
  function openSession(caseId, sId) {
    var c = cases.find(function (x) { return x.id === caseId; }); if (!c) return;
    els.sessionForm.reset(); els.sCaseId.value = caseId; els.sId.value = sId || '';
    if (sId) {
      var s = (c.sessions || []).find(function (x) { return x.id === sId; });
      if (s) { els.sessionTitle.textContent = 'تعديل الجلسة'; els.sNum.value = s.number || ''; els.sDate.value = s.date || ''; els.sTime.value = s.time || ''; els.sProc.value = s.proc || ''; els.sNotes.value = s.notes || ''; els.sNext.value = s.next || ''; els.sStatus.value = s.status || 'مجدولة'; }
    } else { els.sessionTitle.textContent = 'إضافة جلسة'; els.sNum.value = String((c.sessions || []).length + 1); els.sDate.value = new Date().toISOString().slice(0, 10); els.sStatus.value = 'مجدولة'; }
    showOverlay(els.sessionOverlay); setTimeout(function () { els.sDate.focus(); }, 50);
  }
  function closeSession() { els.sessionOverlay.hidden = true; }
  function handleSessionSubmit(e) {
    e.preventDefault();
    var c = cases.find(function (x) { return x.id === els.sCaseId.value; }); if (!c) { closeSession(); return; }
    if (!Array.isArray(c.sessions)) c.sessions = [];
    var data = { number: els.sNum.value.trim(), date: els.sDate.value || '', time: els.sTime.value || '', proc: els.sProc.value.trim(), notes: els.sNotes.value.trim(), next: els.sNext.value || '', status: els.sStatus.value };
    var sId = els.sId.value;
    if (sId) { var i = c.sessions.findIndex(function (s) { return s.id === sId; }); if (i >= 0) c.sessions[i] = Object.assign({}, c.sessions[i], data); }
    else { data.id = sid('s'); c.sessions.push(data); }
    saveCases(); renderActiveView(); closeSession(); toast(sId ? 'تم تحديث الجلسة' : 'تمت إضافة الجلسة');
  }
  function deleteSession(caseId, sId) {
    var c = cases.find(function (x) { return x.id === caseId; }); if (!c) return;
    confirmAsk({ title: 'حذف الجلسة', text: 'هل تريد حذف هذه الجلسة؟', okLabel: 'حذف', onOk: function () { c.sessions = (c.sessions || []).filter(function (s) { return s.id !== sId; }); saveCases(); renderActiveView(); toast('تم حذف الجلسة'); } });
  }

  /* ---------- Delete case ---------- */
  function deleteCase(id) {
    confirmAsk({ title: 'حذف الحالة', text: 'هل تريد حذف هذه الحالة؟', okLabel: 'حذف',
      onOk: function () { cases = cases.filter(function (x) { return x.id !== id; }); if (attachments[id]) { delete attachments[id]; try { saveAtt(); } catch (e) {} } saveCases(); if (currentView === 'file') go('all'); else refresh(); toast('تم حذف الحالة'); } });
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
          return next.then(function (fin) { var iso = new Date().toISOString(); attachments[id].push({ id: sid('a'), name: file.name || 'مرفق', type: type.indexOf('image/') === 0 ? 'image/jpeg' : type, size: file.size || 0, dataUrl: fin, addedAt: iso, createdAt: iso }); added++; });
        });
      });
    });
    chain.then(function () {
      try { saveAtt(); } catch (err) { attachments[id] = attachments[id].slice(0, attachments[id].length - added); try { saveAtt(); } catch (e) {} toast('المساحة المحلية ممتلئة — تعذّر حفظ المرفق.'); renderActiveView(); return; }
      renderActiveView(); toast(added > 1 ? 'تم إضافة المرفقات' : 'تمت إضافة المرفق');
    });
  }
  function deleteAttachment(id, attId) {
    confirmAsk({ title: 'حذف المرفق', text: 'هل تريد حذف هذا المرفق؟', okLabel: 'حذف', onOk: function () { attachments[id] = (attachments[id] || []).filter(function (a) { return a.id !== attId; }); try { saveAtt(); } catch (e) {} renderActiveView(); toast('تم حذف المرفق'); } });
  }

  /* ---------- Open attachment (Blob-based, reliable across browsers) ---------- */
  function findAtt(caseId, attId) { var l = attachments[caseId] || []; for (var i = 0; i < l.length; i++) if (l[i].id === attId) return l[i]; return null; }
  var attViewUrl = null;
  function openImagePreview(url, name) {
    if (!els.attViewOverlay) { try { window.open(url, '_blank'); } catch (e) {} return; }
    if (attViewUrl) { try { URL.revokeObjectURL(attViewUrl); } catch (e) {} }
    attViewUrl = url;
    els.attViewImg.src = url;
    els.attViewTitle.textContent = name || 'معاينة المرفق';
    showOverlay(els.attViewOverlay);
  }
  function closeImagePreview() {
    if (els.attViewOverlay) els.attViewOverlay.hidden = true;
    if (els.attViewImg) els.attViewImg.removeAttribute('src');
    if (attViewUrl) { try { URL.revokeObjectURL(attViewUrl); } catch (e) {} attViewUrl = null; }
  }
  function openAttachment(caseId, attId) {
    var a = findAtt(caseId, attId);
    if (!a) { toast('تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.'); return; }
    if (!a.dataUrl) { toast('هذا المرفق قديم ولا يحتوي على بيانات كافية للفتح.'); return; }
    var blob, url;
    try { blob = dataURLtoBlob(a.dataUrl); url = URL.createObjectURL(blob); }
    catch (e) { toast('تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.'); return; }
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
    if (!opened) toast('تعذر فتح هذا المرفق. حاول إعادة إضافته مرة أخرى.');
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
      if (!win) { frame.remove(); toast('تعذر تجهيز ملف الطباعة. حاول مرة أخرى.'); return; }
      var doc = win.document; doc.open(); doc.write(html); doc.close();
      var printed = false;
      var fire = function () {
        if (printed) return; printed = true;
        try { win.focus(); win.print(); }
        catch (e) { toast('تعذر تجهيز ملف الطباعة. حاول مرة أخرى.'); }
        setTimeout(function () { try { frame.remove(); } catch (e) {} }, 2000);
      };
      frame.onload = function () { setTimeout(fire, 150); };
      setTimeout(fire, 800); // احتياطي إن لم يُطلَق onload على بعض المتصفحات
    } catch (e) {
      toast('تعذر تجهيز ملف الطباعة. حاول مرة أخرى.');
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

  function confirmAsk(o) { els.confirmTitle.textContent = o.title || 'تأكيد'; els.confirmText.textContent = o.text || ''; els.confirmOk.textContent = o.okLabel || 'تأكيد'; els.confirmOk.className = 'btn ' + (o.danger === false ? 'btn-primary' : 'btn-danger'); pendingConfirm = o.onOk || null; showOverlay(els.confirmOverlay); }
  function confirmYes() { var fn = pendingConfirm; pendingConfirm = null; hideOverlay(els.confirmOverlay); if (fn) fn(); }
  function confirmNo() { pendingConfirm = null; hideOverlay(els.confirmOverlay); }

  /* ---------- Backup ---------- */
  function exportBackup() {
    var data = { app: 'DentPilot Student', version: '1.3.3', exportedAt: new Date().toISOString(), cases: cases, settings: settings, requirements: requirements, customReqs: customReqs, attachments: attachments, casesheets: casesheets, adminConfig: adminConfig };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'dentpilot-student-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast('تم تصدير النسخة الاحتياطية');
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
        refresh(); toast('تم استيراد النسخة الاحتياطية');
      } catch (e) { toast('تعذّر الاستيراد — تأكد أنه ملف DentPilot Student صحيح'); }
    };
    reader.readAsText(file);
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    document.querySelectorAll('.dash-card, .add-case-bar, .today-viewall').forEach(function (card) { card.addEventListener('click', function () { go(card.dataset.go); }); });
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

    els.saveSettingsBtn.addEventListener('click', function () {
      settings.schedule = {};
      els.scheduleEditor.querySelectorAll('select').forEach(function (sel) { if (sel.value) settings.schedule[sel.dataset.day] = sel.value; });
      saveSettings(); toast('تم حفظ الجدول');
    });
    els.editStudentBtn.addEventListener('click', function () { openStudentSetup(); });
    els.studentSetupForm.addEventListener('submit', handleStudentSetupSubmit);
    els.studentSetupSkip.addEventListener('click', closeStudentSetup);

    els.exportBtn.addEventListener('click', exportBackup);
    els.importBtn.addEventListener('click', function () { els.importFile.click(); });
    els.importFile.addEventListener('change', function (e) { var f = e.target.files[0]; if (f) importBackup(f); e.target.value = ''; });

    els.confirmOk.addEventListener('click', confirmYes); els.confirmCancel.addEventListener('click', confirmNo);
    if (els.reqNewName) els.reqNewName.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (addCustomReq(els.reqNewName.value)) toggleReqAddForm(false); } });
    var actLater = document.getElementById('actLaterBtn');
    if (actLater) actLater.addEventListener('click', function () { var ov = document.getElementById('activationOverlay'); if (ov) ov.hidden = true; });
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
    function runAction(a, e) {
      if (!a) return;
      var btn = a.el, id = btn.dataset.id, act = btn.dataset.act;
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
      else if (act === 'save-notes') saveNotes(id);
      else if (act === 'req-add-toggle') toggleReqAddForm();
      else if (act === 'req-add-cancel') toggleReqAddForm(false);
      else if (act === 'req-add-save') { if (addCustomReq(els.reqNewName && els.reqNewName.value)) toggleReqAddForm(false); }
      else if (act === 'req-del-custom') { var reqName = btn.dataset.name; confirmAsk({ title: 'حذف المادة', text: 'هل تريد حذف مادة «' + reqName + '» من المتطلبات؟', okLabel: 'حذف', onOk: function () { deleteCustomReq(reqName); } }); }
      else if (act === 'install-app') triggerInstall();
      else if (act === 'cs-new') openCasesheetForm(null);
      else if (act === 'cs-open') openCasesheetForm(btn.dataset.id);
      else if (act === 'cs-del') deleteCasesheet(btn.dataset.id);
      else if (act === 'cs-save') saveCasesheetFromForm();
      else if (act === 'cs-preview') previewCasesheetLive();
      else if (act === 'cs-print') printCasesheetLive();
      else if (act === 'cs-photo-add') triggerCasesheetPhoto(btn.dataset.slot);
      else if (act === 'cs-photo-del') removeCasesheetPhoto(btn.dataset.slot);
      else if (act === 'endo-canal-add') addEndoCanal();
      else if (act === 'endo-canal-del') delEndoCanal(parseInt(btn.dataset.idx, 10));
    }
    appRoot.addEventListener('click', function (e) { runAction(findAction(e), e); });
    // delegation (change): requirements inputs + attachment input
    $('app').addEventListener('change', function (e) {
      if (e.target && e.target.id === 'attInput') { addAttachments(e.target.dataset.id, e.target.files); e.target.value = ''; }
      else if (e.target && e.target.classList.contains('req-input')) { requirements[e.target.dataset.dept] = Math.max(0, toNum(e.target.value)); saveReqs(); renderReqs(); }
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
    if (isStandalone()) { els.setInstallStatus.textContent = 'التطبيق مثبت على الشاشة الرئيسية ✅'; if (els.setInstallBtn) els.setInstallBtn.hidden = true; }
    else { els.setInstallStatus.textContent = 'يمكنك تثبيت التطبيق على شاشتك الرئيسية لفتحه بسرعة كتطبيق مستقل.'; if (els.setInstallBtn) els.setInstallBtn.hidden = false; }
  }
  function triggerInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () { hideInstallUI(); }, function () { hideInstallUI(); });
    } else {
      toast('اضغط على ⋮ أعلى المتصفح ثم اختر «إضافة إلى الشاشة الرئيسية»', 4500);
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
    if (!('serviceWorker' in navigator) || !swReg) { if (els.updateStatus) els.updateStatus.textContent = 'التحديث غير متاح في هذا السياق.'; return; }
    if (els.updateStatus) els.updateStatus.textContent = 'جارٍ التحقق…';
    var handled = false;
    swReg.update().then(function () {
      setTimeout(function () {
        if (swReg.waiting && navigator.serviceWorker.controller) { handled = true; if (els.updateStatus) els.updateStatus.textContent = 'يتوفّر تحديث جديد.'; showUpdate(); }
      }, 700);
    }, function () {});
    fetch('version.json', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (handled) return;
      if (j && j.version && j.version !== APP_VERSION) { if (els.updateStatus) els.updateStatus.textContent = 'يتوفّر تحديث (' + j.version + '). سيُطبَّق عند إعادة فتح التطبيق.'; }
      else if (!swReg.waiting) { if (els.updateStatus) els.updateStatus.textContent = 'أنت على أحدث إصدار (' + APP_VERSION + ').'; }
    }, function () { if (!handled && els.updateStatus) els.updateStatus.textContent = 'تعذّر التحقق (لا يوجد اتصال؟).'; });
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

  function updateTrialBanner() {
    if (!window.DPLicense || !els.trialBanner) return;
    var st = window.DPLicense.getAccessState();
    if (st === 'trial') {
      var h = window.DPLicense.trialRemainingHours();
      els.trialText.textContent = 'الفترة التجريبية المجانية — متبقٍ من التجربة: ' + h + ' ساعة.';
      els.trialBanner.hidden = false;
    } else {
      els.trialBanner.hidden = true;   // مُفعّل (لا شريط) أو منتهية (شاشة تفعيل)
    }
  }

  function init() {
    loadAll(); bindEvents(); applyRoute(); setupPWA();
    updateTrialBanner();
    setInterval(updateTrialBanner, 60000);   // تحديث الوقت المتبقّي دورياً
    setTimeout(maybeShowStudentSetup, 700);  // إعداد أولي لبيانات الطالب إن لم تكن محفوظة (لا يتزاحم مع نافذة التفعيل)
    if (window.DPLicense) window.DPLicense.onActivated = function () {
      if (els.trialBanner) els.trialBanner.hidden = true;   // إخفاء الشريط نهائياً بعد التفعيل
      updateCounts();
      if (currentView === 'settings') renderSettings();
      else if (currentView === 'support') renderSupport();
      setTimeout(maybeShowStudentSetup, 400);
    };
  }
  document.addEventListener('DOMContentLoaded', init);
})();
