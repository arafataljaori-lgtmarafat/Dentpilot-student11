/* ============================================================
   DentPilot Student — إعدادات Firebase
   ملف مستقل تماماً. لا يقرأ ولا يكتب أي مفتاح من مفاتيح التطبيق.
   لا يمسّ التفعيل أو الفترة التجريبية إطلاقاً.
   ============================================================ */
(function () {
  'use strict';

  var firebaseConfig = {
    apiKey: "AIzaSyDo3ip-UjMGp6xnIh7t-CIfPHAVWp-wh-0",
    authDomain: "dentpilot-student-production.firebaseapp.com",
    projectId: "dentpilot-student-production",
    storageBucket: "dentpilot-student-production.firebasestorage.app",
    messagingSenderId: "496218972908",
    appId: "1:496218972908:web:42a03ad23716d1da087bc9"
  };

  // هل تم تحميل Firebase SDK فعلياً؟ (قد يفشل عند انقطاع الشبكة — التطبيق يجب أن يستمر بالعمل)
  function sdkReady() {
    return !!(window.firebase && window.firebase.initializeApp && window.firebase.auth);
  }

  var initialized = false, initError = null;

  function ensureApp() {
    if (initialized) return true;
    if (!sdkReady()) return false;
    try {
      if (!window.firebase.apps || !window.firebase.apps.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      initialized = true;
      return true;
    } catch (e) {
      initError = e;
      return false;
    }
  }

  window.DPFirebase = {
    config: firebaseConfig,
    sdkReady: sdkReady,
    ensureApp: ensureApp,
    isReady: function () { return ensureApp(); },
    lastError: function () { return initError; }
  };
})();
