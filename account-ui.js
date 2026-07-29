/* ============================================================
   DentPilot Student — واجهة صفحة الحساب (المرحلة الأولى)
   صفحة واحدة موحّدة: شاشة ترحيب/دخول عند عدم التسجيل، وحالة حساب بعد الدخول.
   لا تمسّ أي بيانات محلية، ولا التفعيل، ولا تبدأ أي مزامنة.
   ============================================================ */
(function () {
  'use strict';

  /* مفتاح جديد مستقل لتذكّر اختيار «المتابعة محلياً» فقط.
     لا يُعدّل ولا يُقرأ أي مفتاح قائم. القيم: 'local' | 'account' */
  var GATE_KEY = 'dentpilot_student_auth_gate_v1';

  var root = null, mode = 'signin', busy = false, notice = null, authResolved = false;

  function gate() { try { return localStorage.getItem(GATE_KEY) || ''; } catch (e) { return ''; } }
  function setGate(v) { try { localStorage.setItem(GATE_KEY, v); } catch (e) { } }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg) {
    if (window.DPToast) { window.DPToast(msg); return; }
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(function () { el.hidden = true; }, 2600);
  }

  /* ---------- القوالب ---------- */

  /* ---------- نافذة تأكيد صغيرة قابلة لإعادة الاستخدام (تستعمل أنماط .modal-overlay القائمة) ---------- */
  function ensureConfirmModal() {
    var ov = document.getElementById('accConfirmOverlay');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'accConfirmOverlay';
    ov.className = 'modal-overlay';
    ov.hidden = true;
    ov.innerHTML =
      '<div class="modal modal-sm" role="alertdialog" aria-modal="true">' +
      '  <div class="modal-head"><h2 id="accConfirmTitle">تأكيد</h2></div>' +
      '  <p class="confirm-text" id="accConfirmText"></p>' +
      '  <div class="form-actions">' +
      '    <button type="button" id="accConfirmCancel" class="btn btn-ghost">إلغاء</button>' +
      '    <button type="button" id="accConfirmOk" class="btn btn-primary">تأكيد</button>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(ov);
    return ov;
  }
  function showConfirmModal(opts) {
    var ov = ensureConfirmModal();
    document.getElementById('accConfirmTitle').textContent = opts.title || 'تأكيد';
    document.getElementById('accConfirmText').textContent = opts.text || '';
    var okBtn = document.getElementById('accConfirmOk');
    okBtn.textContent = opts.okLabel || 'تأكيد';
    ov.hidden = false;
    function close() { ov.hidden = true; okBtn.removeEventListener('click', onOk); cancelBtn.removeEventListener('click', close); }
    function onOk() { close(); if (typeof opts.onOk === 'function') opts.onOk(); }
    var cancelBtn = document.getElementById('accConfirmCancel');
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', close);
  }

  function heroSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.5c-2 0-2.6 1-4.2 1C6 4.5 4.5 6 4.5 8.6c0 3.4 1.6 5.2 2.4 7.6.5 1.6.6 3.8 2 3.8 1.2 0 1.3-1.6 1.7-3.2.3-1.1.6-1.8 1.4-1.8s1.1.7 1.4 1.8c.4 1.6.5 3.2 1.7 3.2 1.4 0 1.5-2.2 2-3.8.8-2.4 2.4-4.2 2.4-7.6C19.5 6 18 4.5 16.2 4.5c-1.6 0-2.2-1-4.2-1Z"/>' +
      '</svg>';
  }

  function linkedSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5l1-1a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M13 17.5l-1 1a3.5 3.5 0 0 1-5-5l1-1"/>' +
      '</svg>';
  }

  function signedOutHTML() {
    var isSignup = mode === 'signup';
    var offline = !(window.DPAuth && window.DPAuth.ready());
    return '' +
      '<div class="acc-wrap">' +

      '  <div class="acc-hero">' +
      '    <div class="acc-hero-glow"></div>' +
      '    <div class="acc-hero-badge">' + heroSvg() + '</div>' +
      '    <div class="acc-hero-text">' +
      '      <h2 class="acc-hero-title">حساب DentPilot</h2>' +
      '      <p class="acc-hero-sub">احفظ بياناتك واستعدها عند تغيير الهاتف</p>' +
      '    </div>' +
      '  </div>' +

      (offline ? '<div class="acc-alert acc-alert-warn">تعذّر الوصول إلى خدمة الحساب حالياً. يمكنك المتابعة محلياً واستخدام التطبيق بشكل كامل.</div>' : '') +

      '  <div class="acc-card">' +
      '    <div class="acc-tabs" role="tablist">' +
      '      <button type="button" class="acc-tab' + (!isSignup ? ' is-active' : '') + '" data-acc-mode="signin">تسجيل الدخول</button>' +
      '      <button type="button" class="acc-tab' + (isSignup ? ' is-active' : '') + '" data-acc-mode="signup">إنشاء حساب</button>' +
      '    </div>' +

      '    <form id="accForm" class="acc-form" novalidate autocomplete="on">' +
      '      <div class="acc-field">' +
      '        <label for="accEmail">البريد الإلكتروني</label>' +
      '        <input type="email" id="accEmail" name="email" dir="ltr" inputmode="email" autocomplete="email" placeholder="name@example.com" />' +
      '      </div>' +
      '      <div class="acc-field">' +
      '        <label for="accPassword">كلمة المرور</label>' +
      '        <div class="acc-pw">' +
      '          <input type="password" id="accPassword" name="password" dir="ltr" autocomplete="' + (isSignup ? 'new-password' : 'current-password') + '" placeholder="••••••••" />' +
      '          <button type="button" class="acc-pw-toggle" id="accPwToggle" aria-label="إظهار كلمة المرور">إظهار</button>' +
      '        </div>' +
      (isSignup ? '        <span class="acc-hint-sm">6 أحرف على الأقل</span>' : '') +
      '      </div>' +

      '      <div class="acc-msg" id="accMsg" hidden></div>' +

      '      <button type="submit" class="acc-btn acc-btn-primary" id="accSubmit">' +
      '        <span class="acc-btn-label">' + (isSignup ? 'إنشاء الحساب' : 'تسجيل الدخول') + '</span>' +
      '        <span class="acc-spinner" hidden></span>' +
      '      </button>' +

      (!isSignup ?
        '      <button type="button" class="acc-link" id="accForgot">نسيت كلمة المرور؟</button>' : '') +
      '    </form>' +
      '  </div>' +

      '  <div class="acc-divider"><span>أو</span></div>' +

      '  <button type="button" class="acc-btn acc-btn-ghost" id="accLocal">' +
      '    <span>المتابعة محلياً</span>' +
      '  </button>' +
      '  <p class="acc-fine">بياناتك محفوظة على هذا الجهاز. المزامنة السحابية لم تبدأ بعد في هذه النسخة.</p>' +

      '</div>';
  }

  function syncSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 12a9 9 0 0 1 15.3-6.4L21 8"/><path d="M21 4v4h-4"/><path d="M21 12a9 9 0 0 1-15.3 6.4L3 16"/><path d="M3 20v-4h4"/>' +
      '</svg>';
  }
  function shieldSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M12 3.5 19 6.5v5c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5v-5Z"/><path d="m9.2 12 1.9 1.9 3.7-3.8"/>' +
      '</svg>';
  }
  function restoreSvg() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M3 11a9 9 0 1 1 2.6 6.4"/><path d="M3 17v-5h5"/>' +
      '</svg>';
  }

  function fmtDate(d) {
    if (!d) return '—';
    try {
      var dt = (d instanceof Date) ? d : new Date(d);
      if (isNaN(dt.getTime())) return '—';
      return dt.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) +
        ' — ' + dt.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }

  /* بطاقة المزامنة: حالتان فقط — قبل أول مزامنة، وبعدها */
  function syncCardHTML() {
    var s = (window.DPSync && window.DPSync.getState()) || {};
    var busy = !!(window.DPSync && window.DPSync.isSyncing());
    if (!s.firstSyncCompleted) {
      return '' +
        '  <div class="acc-card acc-sync-card">' +
        '    <div class="acc-sync-head">' +
        '      <span class="acc-sync-ico">' + shieldSvg() + '</span>' +
        '      <div class="acc-sync-head-text"><b>حماية بياناتك</b><span>ابدأ المزامنة لتتمكن من استعادة بياناتك عند تغيير الجهاز.</span></div>' +
        '    </div>' +
        '    <div class="acc-sync-status"><span>الحالة</span><b class="acc-kv-muted">لم تبدأ بعد</b></div>' +
        '    <div class="acc-sync-actions">' +
        '      <button type="button" class="acc-btn acc-btn-primary" id="accSyncNow">' +
        '        <span class="acc-btn-label">بدء المزامنة</span><span class="acc-spinner" hidden></span>' +
        '      </button>' +
        '      <button type="button" class="acc-btn acc-btn-ghost" id="accRestore">' +
        '        <span class="acc-btn-label">' + restoreSvg() + ' استعادة البيانات</span><span class="acc-spinner" hidden></span>' +
        '      </button>' +
        '    </div>' +
        '  </div>';
    }
    var noticeHTML = s.casesheetNoticeDismissed ? '' :
      '    <div class="acc-sync-note" id="accCasesheetNotice">' +
      '      <span>الكاسشيتات والصور والمرفقات غير مشمولة حالياً.</span>' +
      '      <button type="button" id="accNoticeClose" aria-label="إغلاق">×</button>' +
      '    </div>';
    return '' +
      '  <div class="acc-card acc-sync-card">' +
      '    <div class="acc-sync-head">' +
      '      <span class="acc-sync-ico acc-sync-ico-good">' + shieldSvg() + '</span>' +
      '      <div class="acc-sync-head-text"><b>بياناتك محدّثة</b><span>يمكنك استعادتها عند تسجيل الدخول من جهاز آخر.</span></div>' +
      '    </div>' +
      '    <div class="acc-sync-status"><span>آخر تحديث</span><b>' + esc(fmtDate(s.lastSyncAt)) + '</b></div>' +
      '    <div class="acc-sync-actions">' +
      '      <button type="button" class="acc-btn acc-btn-primary" id="accSyncNow">' +
      '        <span class="acc-btn-label">مزامنة الآن</span><span class="acc-spinner" hidden></span>' +
      '      </button>' +
      '      <button type="button" class="acc-btn acc-btn-ghost" id="accRestore">' +
      '        <span class="acc-btn-label">' + restoreSvg() + ' استعادة البيانات</span><span class="acc-spinner" hidden></span>' +
      '      </button>' +
      '    </div>' +
      noticeHTML +
      '  </div>';
  }

  function techInfoHTML() {
    var uid = (window.DPAuth && window.DPAuth.getUid()) || '';
    var shortUid = uid ? (uid.slice(0, 6) + '…' + uid.slice(-4)) : '—';
    return '' +
      '  <details class="acc-tech" id="accTech">' +
      '    <summary>معلومات تقنية</summary>' +
      '    <div class="acc-tech-body">' +
      '      <div class="acc-kv-row"><span>معرّف الحساب</span><b dir="ltr" class="acc-mono">' + esc(shortUid) + '</b></div>' +
      '      <button type="button" class="acc-copy-btn" id="accCopyUid" data-uid="' + esc(uid) + '">نسخ المعرّف الكامل</button>' +
      '    </div>' +
      '  </details>';
  }

  function signedInHTML() {
    var email = (window.DPAuth && window.DPAuth.getEmail()) || '';
    var initial = email ? email.charAt(0).toUpperCase() : '?';
    return '' +
      '<div class="acc-wrap">' +

      '  <div class="acc-hero acc-hero-in">' +
      '    <div class="acc-hero-glow"></div>' +
      '    <div class="acc-avatar">' + esc(initial) + '</div>' +
      '    <div class="acc-hero-text">' +
      '      <h2 class="acc-hero-title">حسابك</h2>' +
      '      <p class="acc-hero-sub acc-email-top" dir="ltr">' + esc(email) + '</p>' +
      '    </div>' +
      '  </div>' +

      '  <div class="acc-linked-card">' +
      '    <span class="acc-linked-ico">' + linkedSvg() + '</span>' +
      '    <div class="acc-linked-text">' +
      '      <b>الحساب مرتبط</b>' +
      '      <span>يمكنك الوصول إلى بياناتك عند تسجيل الدخول بهذا الحساب من جهاز آخر.</span>' +
      '    </div>' +
      '  </div>' +

      syncCardHTML() +

      '  <div class="acc-msg" id="accMsg" hidden></div>' +

      techInfoHTML() +

      '  <button type="button" class="acc-btn acc-btn-outline" id="accSignOut">' +
      '    <span class="acc-btn-label">تسجيل الخروج</span>' +
      '    <span class="acc-spinner" hidden></span>' +
      '  </button>' +
      '  <p class="acc-fine">تسجيل الخروج لا يحذف بيانات هذا الجهاز.</p>' +

      '</div>';
  }

  /* حالة محايدة مؤقتة فقط: تُعرض إلى أن تُحسم حالة تسجيل الدخول الحقيقية أول مرة عند الإقلاع،
     لمنع وميض شاشة الدخول لحظياً لمستخدم مسجَّل فعلاً بالفعل (جلسة LOCAL persistence قائمة). */
  function pendingHTML() {
    return '' +
      '<div class="acc-wrap">' +
      '  <div class="acc-loading">' +
      '    <span class="acc-spinner acc-spinner-dark"></span>' +
      '    <p>جارٍ التحقق من حالة الحساب…</p>' +
      '  </div>' +
      '</div>';
  }

  /* ---------- عرض ---------- */

  function render() {
    if (!root) root = document.getElementById('view-account');
    if (!root) return;
    if (!authResolved && window.DPAuth && window.DPAuth.ready()) { root.innerHTML = pendingHTML(); return; }
    var signedIn = !!(window.DPAuth && window.DPAuth.isSignedIn());
    root.innerHTML = signedIn ? signedInHTML() : signedOutHTML();
    if (notice) { showMsg(notice.text, notice.kind); notice = null; }
    bind(signedIn);
  }

  function showMsg(text, kind) {
    var el = document.getElementById('accMsg');
    if (!el) return;
    el.textContent = text;
    el.className = 'acc-msg ' + (kind === 'ok' ? 'is-ok' : 'is-err');
    el.hidden = false;
  }
  function clearMsg() {
    var el = document.getElementById('accMsg');
    if (el) { el.hidden = true; el.textContent = ''; }
  }

  function setBusy(btn, on) {
    busy = on;
    if (!btn) return;
    var sp = btn.querySelector('.acc-spinner');
    var lb = btn.querySelector('.acc-btn-label');
    btn.disabled = on;
    btn.classList.toggle('is-busy', on);
    if (sp) sp.hidden = !on;
    if (lb) lb.style.opacity = on ? '.55' : '';
    var form = document.getElementById('accForm');
    if (form) Array.prototype.forEach.call(form.querySelectorAll('input,button'), function (el) {
      if (el !== btn) el.disabled = on;
    });
  }

  /* ---------- ربط الأحداث ---------- */

  function bind(signedIn) {
    if (!signedIn) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-acc-mode]'), function (b) {
        b.addEventListener('click', function () {
          if (busy) return;
          mode = b.getAttribute('data-acc-mode'); render();
        });
      });

      var pwT = document.getElementById('accPwToggle');
      if (pwT) pwT.addEventListener('click', function () {
        var inp = document.getElementById('accPassword'); if (!inp) return;
        var show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        pwT.textContent = show ? 'إخفاء' : 'إظهار';
      });

      var form = document.getElementById('accForm');
      if (form) form.addEventListener('submit', onSubmit);

      var forgot = document.getElementById('accForgot');
      if (forgot) forgot.addEventListener('click', onForgot);

      var local = document.getElementById('accLocal');
      if (local) local.addEventListener('click', function () {
        setGate('local');
        toast('تم الدخول بالوضع المحلي');
        if (window.location.hash.replace(/^#/, '') === 'account') window.location.hash = 'dashboard';
      });
    } else {
      var out = document.getElementById('accSignOut');
      if (out) out.addEventListener('click', function () {
        if (busy) return;
        clearMsg(); setBusy(out, true);
        window.DPAuth.signOut().then(function () {
          setBusy(out, false);
          notice = { text: 'تم تسجيل الخروج. بياناتك المحلية كما هي.', kind: 'ok' };
          mode = 'signin';
          render();
        })['catch'](function (err) {
          setBusy(out, false);
          showMsg(window.DPAuth.messageFor(err), 'err');
        });
      });

      var syncBtn = document.getElementById('accSyncNow');
      if (syncBtn) syncBtn.addEventListener('click', function () {
        if (busy || (window.DPSync && window.DPSync.isSyncing())) return;    // منع الضغط المتكرر
        if (!navigator.onLine) { showMsg('بانتظار الاتصال بالإنترنت.', 'err'); return; }
        clearMsg(); setBusy(syncBtn, true);
        showMsg('جارٍ تحديث بياناتك…', 'ok');
        window.DPSync.syncNow().then(function (res) {
          setBusy(syncBtn, false);
          notice = { text: (res && res.noop) ? 'بياناتك محدّثة بالفعل.' : 'تم تحديث بياناتك بنجاح.', kind: 'ok' };
          render();
        })['catch'](function (e) {
          setBusy(syncBtn, false);
          showMsg(window.DPSync.messageFor(e), 'err');
        });
      });

      var restoreBtn = document.getElementById('accRestore');
      if (restoreBtn) restoreBtn.addEventListener('click', function () {
        if (busy || (window.DPSync && window.DPSync.isSyncing())) return;
        if (!navigator.onLine) { showMsg('بانتظار الاتصال بالإنترنت.', 'err'); return; }
        clearMsg(); setBusy(restoreBtn, true);
        window.DPSync.restorePreview().then(function (info) {
          setBusy(restoreBtn, false);
          if (!info) { showMsg('لا توجد بيانات سابقة مرتبطة بهذا الحساب.', 'err'); return; }
          var localEmpty = window.DPSync.localIsEmpty();
          var when = fmtDate(info.lastSyncAt);
          if (localEmpty) {
            showConfirmModal({
              title: 'استعادة البيانات', okLabel: 'استعادة',
              text: 'سيتم استعادة بياناتك من آخر نسخة سحابية — آخر تحديث: ' + when + '، عدد الحالات: ' + info.casesCount + '. الكاسشيتات والصور والمرفقات غير مشمولة.',
              onOk: function () { runRestore('replace'); }
            });
          } else {
            showConfirmModal({
              title: 'دمج البيانات', okLabel: 'دمج',
              text: 'توجد بيانات على هذا الجهاز. ستتم إضافة الحالات السحابية غير الموجودة هنا فقط (آخر تحديث سحابي: ' + when + ')، دون حذف أو استبدال أي بيانات محلية.',
              onOk: function () { runRestore('merge'); }
            });
          }
        })['catch'](function (e) {
          setBusy(restoreBtn, false);
          showMsg(window.DPSync.messageFor(e), 'err');
        });
      });

      var copyBtn = document.getElementById('accCopyUid');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        var full = copyBtn.getAttribute('data-uid') || '';
        var done = function () { toast('تم نسخ المعرّف'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(done)['catch'](done);
        else done();
      });

      var noticeClose = document.getElementById('accNoticeClose');
      if (noticeClose) noticeClose.addEventListener('click', function () {
        if (window.DPSync) window.DPSync.dismissCasesheetNotice();
        var n = document.getElementById('accCasesheetNotice');
        if (n) n.remove();
      });
    }
  }

  function runRestore(mode) {
    clearMsg();
    var restoreBtn = document.getElementById('accRestore');
    setBusy(restoreBtn, true);
    showMsg('جارٍ تحديث بياناتك…', 'ok');
    window.DPSync.restoreData(mode).then(function () {
      setBusy(restoreBtn, false);
      notice = { text: 'تم تحديث بياناتك بنجاح.', kind: 'ok' };
      render();
    })['catch'](function (e) {
      setBusy(restoreBtn, false);
      showMsg(window.DPSync.messageFor(e), 'err');
    });
  }

  function onSubmit(e) {
    e.preventDefault();
    if (busy) return;                       // منع الإرسال المتكرر أثناء التحميل
    clearMsg();

    var emailEl = document.getElementById('accEmail');
    var pwEl = document.getElementById('accPassword');
    var btn = document.getElementById('accSubmit');
    var email = emailEl ? emailEl.value : '';
    var pw = pwEl ? pwEl.value : '';

    var vE = window.DPAuth.validateEmail(email);
    if (vE) { showMsg(vE, 'err'); if (emailEl) emailEl.focus(); return; }
    var vP = window.DPAuth.validatePassword(pw);
    if (vP) { showMsg(vP, 'err'); if (pwEl) pwEl.focus(); return; }

    setBusy(btn, true);
    var isSignup = mode === 'signup';
    var op = isSignup ? window.DPAuth.signUp(email, pw) : window.DPAuth.signIn(email, pw);

    op.then(function () {
      setGate('account');
      setBusy(btn, false);
      notice = { text: isSignup ? 'تم إنشاء الحساب بنجاح.' : 'تم تسجيل الدخول بنجاح.', kind: 'ok' };
      render();                              // onChange سيعيد الرسم أيضاً — آمن
      toast(isSignup ? 'تم إنشاء الحساب' : 'مرحباً بعودتك');
    })['catch'](function (err) {
      setBusy(btn, false);
      showMsg(window.DPAuth.messageFor(err), 'err');
    });
  }

  function onForgot() {
    if (busy) return;
    clearMsg();
    var emailEl = document.getElementById('accEmail');
    var email = emailEl ? emailEl.value : '';
    var vE = window.DPAuth.validateEmail(email);
    if (vE) { showMsg('أدخل بريدك الإلكتروني أولاً ثم اضغط «نسيت كلمة المرور؟».', 'err'); if (emailEl) emailEl.focus(); return; }

    var btn = document.getElementById('accSubmit');
    setBusy(btn, true);
    window.DPAuth.resetPassword(email).then(function () {
      setBusy(btn, false);
      showMsg('أرسلنا رابط استعادة كلمة المرور إلى بريدك. تحقق من صندوق الوارد والرسائل غير المرغوبة.', 'ok');
    })['catch'](function (err) {
      setBusy(btn, false);
      showMsg(window.DPAuth.messageFor(err), 'err');
    });
  }

  /* ---------- التشغيل ---------- */

  function onRoute() {
    if (window.location.hash.replace(/^#/, '').split('/')[0] === 'account') render();
  }

  function boot() {
    root = document.getElementById('view-account');
    if (!root) return;

    render();                              // حالة تحميل محايدة إلى أن تُحسم حالة الدخول الحقيقية
    window.addEventListener('hashchange', onRoute);

    if (window.DPAuth) {
      window.DPAuth.onChange(function (u) {
        if (u) setGate('account');
        render();
      });
      if (window.DPAuth.onAuthReady) {
        window.DPAuth.onAuthReady(function () {
          authResolved = true;
          render();
          if (window.DPSync) window.DPSync.autoSyncCheck();   // مزامنة تلقائية خفيفة عند فتح التطبيق فقط (مشروطة داخلياً)
        });
      } else {
        authResolved = true;               // احتياط توافقي فقط — لا يُفترض حدوثه
      }
    } else {
      authResolved = true;
    }

    if (window.DPSync) {
      // تحديث حي لبطاقة المزامنة عند أي تغيّر حالة (مزامنة تلقائية بالخلفية مثلاً) — فقط أثناء عرض صفحة الحساب فعلياً
      window.DPSync.onStateChange(function () {
        if (authResolved && window.location.hash.replace(/^#/, '').split('/')[0] === 'account') render();
      });
    }

    // أول تشغيل فقط: لا يوجد اختيار سابق ولا جلسة → اعرض صفحة الحساب (سلوك غير معدَّل)
    if (!gate()) {
      var cur = window.location.hash.replace(/^#/, '');
      if (!cur || cur === 'dashboard') window.location.hash = 'account';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
