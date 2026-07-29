/* ============================================================
   DentPilot Student — المزامنة السحابية (نسخة سحابية واحدة متجددة لكل طالب)
   ------------------------------------------------------------
   يشمل فقط: dentpilot_student_settings_v1, dentpilot_student_cases_v1,
             dentpilot_student_requirements_v1, dentpilot_student_custom_reqs_v1
   لا يقرأ ولا يكتب: الكاسشيتات، المرفقات/الصور، Base64/dataUrl،
   device_id، activation_v1، trial_start/expires، admin_config_v1،
   cs_print_v1، auth_gate_v1، ولا يزامن التفعيل أو الفترة التجريبية بأي شكل.

   بنية Firestore:
     users/{uid}                    (لا تُلمس — من firebase-auth.js فقط)
     users/{uid}/sync/meta          {schemaVersion, app, lastSyncAt, casesCount,
                                      requirementsCount, firstSyncCompleted,
                                      casesheetsIncluded:false, attachmentsIncluded:false}
     users/{uid}/sync/settings      {data:{...settings}, syncUpdatedAt}
     users/{uid}/sync/requirements  {requirements:{...}, customReqs:[...], syncUpdatedAt}
     users/{uid}/cases/{caseId}     {data:{...case}, syncUpdatedAt, deleted, deletedAt}
   ============================================================ */
(function () {
  'use strict';

  var K = {
    settings: 'dentpilot_student_settings_v1',
    cases: 'dentpilot_student_cases_v1',
    requirements: 'dentpilot_student_requirements_v1',
    customReqs: 'dentpilot_student_custom_reqs_v1',
    syncState: 'dentpilot_student_sync_state_v1'
  };
  var APP_TAG = 'dentpilot-student';
  var SCHEMA_VERSION = 1;
  var AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

  /* ---------- تخزين محلي بدائي (قراءة/كتابة مباشرة — بلا أي ارتباط بمتغيرات script.js) ---------- */
  function jget(key, fallback) {
    try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch (e) { return fallback; }
  }
  function jset(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

  function defaultSyncState() {
    return {
      lastSyncAt: null, lastAutoSyncCheckAt: null,
      dirtyCaseIds: [], deletedCases: [],
      settingsDirty: false, requirementsDirty: false,
      firstSyncCompleted: false, syncDeviceId: null,
      casesheetNoticeDismissed: false
    };
  }
  function getState() {
    var s = jget(K.syncState, null);
    if (!s || typeof s !== 'object') s = defaultSyncState();
    var d = defaultSyncState();
    for (var k in d) if (!(k in s)) s[k] = d[k];
    if (!Array.isArray(s.dirtyCaseIds)) s.dirtyCaseIds = [];
    if (!Array.isArray(s.deletedCases)) s.deletedCases = [];
    if (!s.syncDeviceId) s.syncDeviceId = 'sync_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    return s;
  }
  function setState(s) { jset(K.syncState, s); notifyState(s); }
  function patchState(patch) { var s = getState(); Object.assign(s, patch); setState(s); return s; }

  /* ---------- Pub/Sub بسيط لحالة المزامنة (تستخدمه صفحة الحساب لتحديث نفسها) ---------- */
  var stateListeners = [];
  function onStateChange(fn) { if (typeof fn === 'function') stateListeners.push(fn); }
  function notifyState(s) { stateListeners.forEach(function (fn) { try { fn(s); } catch (e) { } }); }

  var busyListeners = [];
  var syncing = false;
  function onBusyChange(fn) { if (typeof fn === 'function') busyListeners.push(fn); }
  function setBusy(b) { syncing = b; busyListeners.forEach(function (fn) { try { fn(b); } catch (e) { } }); }
  function isSyncing() { return syncing; }

  /* ============================================================
     Dirty Tracking — تُستدعى من script.js فقط بعد نجاح الحفظ المحلي
     (لا تغيّر منطق الحفظ، تُعلِّم حالة المزامنة فقط)
     ============================================================ */
  function markCaseDirty(caseId) {
    if (!caseId) return;
    var s = getState();
    if (s.dirtyCaseIds.indexOf(caseId) === -1) s.dirtyCaseIds.push(caseId);
    var di = s.deletedCases.indexOf(caseId);
    if (di !== -1) s.deletedCases.splice(di, 1);   // إن كانت معلَّمة كمحذوفة ثم عادت (نادر) — التعديل يلغي علامة الحذف المحلية
    setState(s);
  }
  function markCaseDeleted(caseId) {
    if (!caseId) return;
    var s = getState();
    var i = s.dirtyCaseIds.indexOf(caseId);
    if (i !== -1) s.dirtyCaseIds.splice(i, 1);
    if (s.deletedCases.indexOf(caseId) === -1) s.deletedCases.push(caseId);
    setState(s);
  }
  function markSettingsDirty() { patchState({ settingsDirty: true }); }
  function markRequirementsDirty() { patchState({ requirementsDirty: true }); }
  function dismissCasesheetNotice() { patchState({ casesheetNoticeDismissed: true }); }

  /* ---------- توفّر الخدمة ---------- */
  function authReady() { return !!(window.DPAuth && window.DPAuth.ready() && window.DPAuth.isSignedIn()); }
  function online() { return typeof navigator === 'undefined' || navigator.onLine !== false; }
  function db() { return window.firebase.firestore(); }
  function uid() { return window.DPAuth.getUid(); }
  function FV() { return window.firebase.firestore.FieldValue; }

  function userDoc() { return db().collection('users').doc(uid()); }
  function metaRef() { return userDoc().collection('sync').doc('meta'); }
  function settingsRef() { return userDoc().collection('sync').doc('settings'); }
  function reqsRef() { return userDoc().collection('sync').doc('requirements'); }
  function casesCol() { return userDoc().collection('cases'); }

  function hasAnyDirty(s) {
    return s.dirtyCaseIds.length > 0 || s.deletedCases.length > 0 || s.settingsDirty || s.requirementsDirty;
  }

  /* ============================================================
     المزامنة (يدوية أو تلقائية) — دفعة واحدة ذرّية (batch) حتى لا يتحدّث
     lastSyncAt أو تُمسح علامات Dirty إلا عند نجاح كل الكتابة معاً.
     ============================================================ */
  function syncNow() {
    if (syncing) return Promise.reject(err('dp/sync-busy', 'مزامنة قيد التنفيذ بالفعل.'));
    if (!authReady()) return Promise.reject(err('dp/not-signed-in', 'يجب تسجيل الدخول أولاً.'));
    if (!online()) return Promise.reject(err('dp/offline', 'بانتظار الاتصال بالإنترنت.'));

    setBusy(true);
    var s = getState();
    var isFirst = !s.firstSyncCompleted;

    if (!isFirst && !hasAnyDirty(s)) {
      // لا يوجد جديد لرفعه — لا تكتب شيئاً ولا تُحدّث lastSyncAt، فقط أبلغ الواجهة
      setBusy(false);
      return Promise.resolve({ ok: true, noop: true });
    }

    // احترازاً: إن كانت هذه "أول مزامنة" من منظور هذا الجهاز، تحقّق أولاً هل الحساب لديه بالفعل
    // بيانات سحابية مؤسَّسة من جهاز آخر — حتى لا يكتب جهاز جديد/فارغ بيانات فارغة فوق بيانات الحساب الحقيقية.
    var metaCheck = isFirst ? metaRef().get() : Promise.resolve(null);

    return metaCheck.then(function (metaSnap) {
      var cloudEstablished = !!(metaSnap && metaSnap.exists && metaSnap.data() && metaSnap.data().firstSyncCompleted === true);
      var deviceJoiningEmpty = isFirst && cloudEstablished && localIsEmpty();

      var localCases = jget(K.cases, []); if (!Array.isArray(localCases)) localCases = [];
      var localSettings = jget(K.settings, {}) || {};
      var localReqs = jget(K.requirements, {}) || {};
      var localCustomReqs = jget(K.customReqs, []); if (!Array.isArray(localCustomReqs)) localCustomReqs = [];
      var casesById = {}; localCases.forEach(function (c) { if (c && c.id) casesById[c.id] = c; });

      var batch = db().batch();
      var touchedCaseIds = [];

      if (isFirst) {
        // ارفع الحالات المحلية (إن وُجدت) دائماً — كتابة آمنة دوماً، كل حالة في مستندها الخاص فقط
        localCases.forEach(function (c) {
          if (!c || !c.id) return;
          batch.set(casesCol().doc(c.id), { data: c, syncUpdatedAt: FV().serverTimestamp(), deleted: false, deletedAt: null });
          touchedCaseIds.push(c.id);
        });
        // الإعدادات والمتطلبات: لا تُكتب إن كان هذا جهازاً فارغاً ينضم إلى حساب لديه بيانات فعلاً —
        // لتفادي استبدال بيانات الحساب الحقيقية بقيم فارغة. الاستعادة الصحيحة تتم عبر «استعادة البيانات».
        if (!deviceJoiningEmpty) {
          batch.set(settingsRef(), { data: localSettings, syncUpdatedAt: FV().serverTimestamp() });
          batch.set(reqsRef(), { requirements: localReqs, customReqs: localCustomReqs, syncUpdatedAt: FV().serverTimestamp() });
        }
      } else {
        // مزامنة تراكمية: العناصر المعلَّمة Dirty فقط
        s.dirtyCaseIds.forEach(function (id) {
          var c = casesById[id];
          if (!c) return;  // حالة حُذفت محلياً قبل أن تُرفع تعديلاتها — تُعالج عبر deletedCases
          batch.set(casesCol().doc(id), { data: c, syncUpdatedAt: FV().serverTimestamp(), deleted: false, deletedAt: null });
          touchedCaseIds.push(id);
        });
        s.deletedCases.forEach(function (id) {
          batch.set(casesCol().doc(id), { deleted: true, deletedAt: FV().serverTimestamp() }, { merge: true });
          touchedCaseIds.push(id);
        });
        if (s.settingsDirty) batch.set(settingsRef(), { data: localSettings, syncUpdatedAt: FV().serverTimestamp() });
        if (s.requirementsDirty) batch.set(reqsRef(), { requirements: localReqs, customReqs: localCustomReqs, syncUpdatedAt: FV().serverTimestamp() });
      }

      var metaPatch = {
        schemaVersion: SCHEMA_VERSION, app: APP_TAG,
        lastSyncAt: FV().serverTimestamp(),
        firstSyncCompleted: true,
        casesheetsIncluded: false, attachmentsIncluded: false
      };
      // لا تُحدَّث الأعداد التقديرية عند انضمام جهاز فارغ لحساب مؤسَّس — أبقِ أعداد الحساب الحقيقية كما هي (merge يحافظ عليها)
      if (!deviceJoiningEmpty) {
        metaPatch.casesCount = localCases.length;
        metaPatch.requirementsCount = Object.keys(localReqs || {}).length;
      }
      batch.set(metaRef(), metaPatch, { merge: true });

      return batch.commit().then(function () { return { isFirst: isFirst, s: s, touchedCaseIds: touchedCaseIds, localCasesCount: localCases.length }; });
    }).then(function (r) {
      var isFirst = r.isFirst, s = r.s, touchedCaseIds = r.touchedCaseIds;
      var s2 = getState();      // أعد القراءة تحسّباً لأي تعليم Dirty جديد وقع أثناء الرفع
      s2.dirtyCaseIds = s2.dirtyCaseIds.filter(function (id) { return touchedCaseIds.indexOf(id) === -1; });
      s2.deletedCases = s2.deletedCases.filter(function (id) { return touchedCaseIds.indexOf(id) === -1; });
      if (isFirst || s.settingsDirty) s2.settingsDirty = false;
      if (isFirst || s.requirementsDirty) s2.requirementsDirty = false;
      s2.firstSyncCompleted = true;
      s2.lastSyncAt = Date.now();
      s2.lastAutoSyncCheckAt = Date.now();
      setState(s2);
      setBusy(false);
      return { ok: true, casesCount: r.localCasesCount };
    })['catch'](function (e) {
      setBusy(false);   // فشل: لا تُحدَّث lastSyncAt ولا تُمسح علامات Dirty — تبقى كما هي للمحاولة القادمة
      throw normalizeError(e);
    });
  }

  /* مزامنة تلقائية خفيفة عند فتح التطبيق — لا تُعطّل الإقلاع (غير منتظرة) ولا تستخدم Realtime listeners */
  function autoSyncCheck() {
    if (!authReady() || !online()) return;
    var s = getState();
    if (!hasAnyDirty(s)) return;
    var last = s.lastAutoSyncCheckAt;
    if (last && (Date.now() - last) < AUTO_CHECK_INTERVAL_MS) return;
    patchState({ lastAutoSyncCheckAt: Date.now() });   // نُسجّل محاولة الفحص فوراً لمنع تكرارها خلال 24 ساعة بغض النظر عن نتيجتها
    syncNow()['catch'](function () { /* صامتة: ستُعاد المحاولة عند فتح التطبيق القادم أو بالمزامنة اليدوية */ });
  }

  /* ============================================================
     الاستعادة والدمج
     ============================================================ */
  function restorePreview() {
    if (!authReady()) return Promise.reject(err('dp/not-signed-in', 'يجب تسجيل الدخول أولاً.'));
    if (!online()) return Promise.reject(err('dp/offline', 'بانتظار الاتصال بالإنترنت.'));
    return metaRef().get().then(function (snap) {
      if (!snap || !snap.exists) return null;
      var m = snap.data() || {};
      if (!m.firstSyncCompleted) return null;
      return {
        lastSyncAt: m.lastSyncAt && m.lastSyncAt.toDate ? m.lastSyncAt.toDate() : null,
        casesCount: m.casesCount || 0,
        requirementsCount: m.requirementsCount || 0
      };
    })['catch'](function (e) { throw normalizeError(e); });
  }

  function localIsEmpty() {
    var c = jget(K.cases, []); if (!Array.isArray(c)) c = [];
    var st = jget(K.settings, {}) || {};
    var r = jget(K.requirements, {}) || {};
    var cr = jget(K.customReqs, []); if (!Array.isArray(cr)) cr = [];
    return c.length === 0 && !st.studentName && Object.keys(r).length === 0 && cr.length === 0;
  }

  function fetchCloudBundle() {
    return Promise.all([
      settingsRef().get(),
      reqsRef().get(),
      casesCol().get()
    ]).then(function (res) {
      var settingsSnap = res[0], reqsSnap = res[1], casesSnap = res[2];
      var cloudSettings = settingsSnap.exists ? (settingsSnap.data().data || {}) : null;
      var reqDoc = reqsSnap.exists ? reqsSnap.data() : {};
      var cloudReqs = reqDoc.requirements || {};
      var cloudCustomReqs = Array.isArray(reqDoc.customReqs) ? reqDoc.customReqs : [];
      var cloudCases = [];
      casesSnap.forEach(function (doc) {
        var d = doc.data() || {};
        if (d.deleted === true) return;              // لا تُعِد الحالات المحذوفة سحابياً إطلاقاً
        if (d.data) cloudCases.push(d.data);
      });
      return { settings: cloudSettings, requirements: cloudReqs, customReqs: cloudCustomReqs, cases: cloudCases };
    });
  }

  /* mode: 'replace' (جهاز فارغ) أو 'merge' (توجد بيانات محلية) */
  function restoreData(mode) {
    if (!authReady()) return Promise.reject(err('dp/not-signed-in', 'يجب تسجيل الدخول أولاً.'));
    if (!online()) return Promise.reject(err('dp/offline', 'بانتظار الاتصال بالإنترنت.'));

    // نسخة احتياطية مؤقتة من القيم الحالية — تُستخدم للتراجع الكامل عند أي فشل
    var snapshot = {
      settings: localStorage.getItem(K.settings),
      cases: localStorage.getItem(K.cases),
      requirements: localStorage.getItem(K.requirements),
      customReqs: localStorage.getItem(K.customReqs)
    };
    function rollback() {
      Object.keys(snapshot).forEach(function (k) {
        var key = K[k];
        if (snapshot[k] == null) { try { localStorage.removeItem(key); } catch (e) { } }
        else { try { localStorage.setItem(key, snapshot[k]); } catch (e) { } }
      });
    }

    return fetchCloudBundle().then(function (cloud) {
      var s = getState();
      var finalSettings, finalCases, finalReqs, finalCustomReqs;

      if (mode === 'replace') {
        finalSettings = cloud.settings || {};
        finalCases = cloud.cases || [];
        finalReqs = cloud.requirements || {};
        finalCustomReqs = cloud.customReqs || [];
      } else {
        // دمج: أضف الحالات السحابية غير الموجودة محلياً فقط — لا تستبدل أي حالة محلية موجودة أياً كانت حالتها
        var localCases = jget(K.cases, []); if (!Array.isArray(localCases)) localCases = [];
        var localIds = {}; localCases.forEach(function (c) { if (c && c.id) localIds[c.id] = true; });
        var added = (cloud.cases || []).filter(function (c) { return c && c.id && !localIds[c.id]; });
        finalCases = localCases.concat(added);

        // احتفظ بالتغييرات المحلية غير المتزامنة: إن كانت معلَّمة Dirty، أبقِ المحلي كما هو
        finalSettings = s.settingsDirty ? (jget(K.settings, {}) || {}) : (cloud.settings || jget(K.settings, {}) || {});
        finalReqs = s.requirementsDirty ? (jget(K.requirements, {}) || {}) : (cloud.requirements || jget(K.requirements, {}) || {});
        finalCustomReqs = s.requirementsDirty ? (jget(K.customReqs, []) || []) : (cloud.customReqs || jget(K.customReqs, []) || []);
      }

      var okSettings = jset(K.settings, finalSettings);
      var okCases = jset(K.cases, finalCases);
      var okReqs = jset(K.requirements, finalReqs);
      var okCustom = jset(K.customReqs, finalCustomReqs);

      if (!okSettings || !okCases || !okReqs || !okCustom) { rollback(); throw err('dp/storage-failed', 'تعذّر حفظ البيانات المستعادة على هذا الجهاز.'); }

      if (window.DPApp && typeof window.DPApp.reloadFromStorage === 'function') {
        try { window.DPApp.reloadFromStorage(); } catch (e) { }
      }
      return { ok: true, casesCount: finalCases.length, mode: mode };
    })['catch'](function (e) {
      rollback();
      throw normalizeError(e);
    });
  }

  /* ---------- أخطاء عربية مختصرة (بلا أي تفاصيل تقنية) ---------- */
  function err(code, msg) { var e = new Error(msg); e.code = code; return e; }
  function normalizeError(e) {
    if (e && e.code && String(e.code).indexOf('dp/') === 0) return e;
    if (!online()) return err('dp/offline', 'بانتظار الاتصال بالإنترنت.');
    return err('dp/failed', 'تعذر تحديث البيانات. حاول مرة أخرى.');
  }
  function messageFor(e) { return (e && e.message) || 'تعذر تحديث البيانات. حاول مرة أخرى.'; }

  window.DPSync = {
    markCaseDirty: markCaseDirty,
    markCaseDeleted: markCaseDeleted,
    markSettingsDirty: markSettingsDirty,
    markRequirementsDirty: markRequirementsDirty,
    dismissCasesheetNotice: dismissCasesheetNotice,
    getState: getState,
    onStateChange: onStateChange,
    onBusyChange: onBusyChange,
    isSyncing: isSyncing,
    syncNow: syncNow,
    autoSyncCheck: autoSyncCheck,
    restorePreview: restorePreview,
    restoreData: restoreData,
    localIsEmpty: localIsEmpty,
    messageFor: messageFor
  };
})();
