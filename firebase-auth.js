/* ============================================================
   DentPilot Student — Firebase Authentication (المرحلة الأولى: الحساب فقط)
   - إنشاء حساب / دخول / خروج / استعادة كلمة المرور / متابعة الحالة
   - يكتب مستند users/{uid} فقط (email, app, createdAt, lastLoginAt, schemaVersion)
   - لا يقرأ ولا يكتب ولا يزامن أي بيانات تطبيق أو تفعيل إطلاقاً.
   ============================================================ */
(function () {
  'use strict';

  var APP_TAG = 'dentpilot-student';
  var SCHEMA_VERSION = 1;

  var listeners = [];
  var currentUser = null;
  var watching = false;

  /* ---------- رسائل الأخطاء بالعربية ---------- */
  var ERRORS = {
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح.',
    'auth/missing-email': 'يرجى إدخال البريد الإلكتروني.',
    'auth/weak-password': 'كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل.',
    'auth/email-already-in-use': 'هذا البريد الإلكتروني مستخدم مسبقاً.',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد الإلكتروني.',
    'auth/wrong-password': 'كلمة المرور غير صحيحة.',
    'auth/invalid-credential': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/invalid-login-credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'auth/user-disabled': 'تم تعطيل هذا الحساب. تواصل مع الدعم.',
    'auth/too-many-requests': 'عدد محاولات كبير. انتظر قليلاً ثم أعد المحاولة.',
    'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.',
    'auth/operation-not-allowed': 'طريقة الدخول هذه غير مفعّلة في المشروع.',
    'auth/requires-recent-login': 'تحتاج إلى تسجيل الدخول من جديد لإتمام هذه العملية.',
    'auth/internal-error': 'حدث خطأ غير متوقع. أعد المحاولة.'
  };

  function messageFor(err) {
    if (!err) return 'حدث خطأ غير متوقع. أعد المحاولة.';
    if (err.code === 'dp/sdk-unavailable') return 'تعذّر الاتصال بخدمة الحساب. تأكد من اتصالك بالإنترنت ثم أعد المحاولة.';
    var code = err.code || '';
    if (ERRORS[code]) return ERRORS[code];
    if (!navigator.onLine) return 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة وأعد المحاولة.';
    return 'حدث خطأ غير متوقع. أعد المحاولة.';
  }

  /* ---------- التحقق الأساسي من المدخلات ---------- */
  function validateEmail(email) {
    var e = (email || '').trim();
    if (!e) return 'يرجى إدخال البريد الإلكتروني.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return 'صيغة البريد الإلكتروني غير صحيحة.';
    return null;
  }
  function validatePassword(pw) {
    if (!pw) return 'يرجى إدخال كلمة المرور.';
    if (String(pw).length < 6) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل.';
    return null;
  }

  /* ---------- توفّر الخدمة ---------- */
  function ready() { return !!(window.DPFirebase && window.DPFirebase.isReady()); }
  function authObj() { return window.firebase.auth(); }
  function sdkError() { var e = new Error('sdk-unavailable'); e.code = 'dp/sdk-unavailable'; return e; }

  /* ---------- مستند المستخدم في Firestore ---------- */
  /* users/{uid} — فقط: email, app, createdAt, lastLoginAt, schemaVersion
     لا يُخزَّن: كلمة المرور، رمز التفعيل، Device ID، أو أي بيانات تطبيق. */
  function touchUserDoc(user, isNewAccount) {
    if (!user || !window.firebase || !window.firebase.firestore) return Promise.resolve();
    var db, ref, FV;
    try {
      db = window.firebase.firestore();
      FV = window.firebase.firestore.FieldValue;
      ref = db.collection('users').doc(user.uid);
    } catch (e) { return Promise.resolve(); }

    var base = {
      email: user.email || '',
      app: APP_TAG,
      schemaVersion: SCHEMA_VERSION,
      lastLoginAt: FV.serverTimestamp()
    };

    if (isNewAccount) {
      base.createdAt = FV.serverTimestamp();
      return ref.set(base, { merge: true })['catch'](function () { });
    }

    // حساب قائم: لا نلمس createdAt إن كان موجوداً — نضيفه فقط إن كان المستند ناقصاً/غير موجود
    return ref.get().then(function (snap) {
      var data = snap && snap.exists ? (snap.data() || {}) : null;
      if (!data || !data.createdAt) base.createdAt = FV.serverTimestamp();
      return ref.set(base, { merge: true });
    })['catch'](function () {
      return ref.set(base, { merge: true })['catch'](function () { });
    });
  }

  /* ---------- مراقبة حالة الدخول ---------- */
  function notify(u) { listeners.forEach(function (fn) { try { fn(u); } catch (e) { } }); }

  var persistencePromise = null;
  var authReadyResolved = false;
  var authReadyCallbacks = [];

  function fireAuthReady() {
    if (authReadyResolved) return;
    authReadyResolved = true;
    var cbs = authReadyCallbacks; authReadyCallbacks = [];
    cbs.forEach(function (fn) { try { fn(currentUser); } catch (e) { } });
  }

  /* LOCAL persistence: تُضبط مرة واحدة، ويُنتظر اكتمالها فعلياً (لا fire-and-forget)
     قبل أي عملية تسجيل دخول/إنشاء حساب، وقبل تسجيل onAuthStateChanged. */
  function ensurePersistence() {
    if (persistencePromise) return persistencePromise;
    if (!ready()) { persistencePromise = Promise.resolve(); return persistencePromise; }
    persistencePromise = authObj().setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
      ['catch'](function () { /* تجاهل فشل الضبط — نكمل بسلوك Firebase الافتراضي (LOCAL أصلاً) بدل تعطيل الدخول */ });
    return persistencePromise;
  }

  function startWatching() {
    if (watching || !ready()) return;
    watching = true;
    try {
      ensurePersistence().then(function () {
        authObj().onAuthStateChanged(function (u) {
          currentUser = u || null;
          fireAuthReady();     // أول استدعاء فقط: يُعلم أن حالة الدخول الحقيقية باتت معروفة
          notify(currentUser);
        });
      });
    } catch (e) { watching = false; }
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return;
    listeners.push(fn);
    startWatching();
    try { fn(currentUser); } catch (e) { }
  }

  /* ينتظر حسم حالة تسجيل الدخول الحقيقية مرة واحدة عند إقلاع التطبيق (onAuthStateChanged الأول)
     قبل أن تقرر الواجهة أي محتوى تعرضه. إن تعذّر توفّر Firebase (بلا اتصال) يُحسم فوراً بلا انتظار. */
  function onAuthReady(fn) {
    if (typeof fn !== 'function') return;
    startWatching();
    if (authReadyResolved) { try { fn(currentUser); } catch (e) { } return; }
    if (!ready()) { fireAuthReady(); try { fn(currentUser); } catch (e) { } return; }
    authReadyCallbacks.push(fn);
  }

  /* ---------- العمليات ---------- */
  function signUp(email, password) {
    if (!ready()) return Promise.reject(sdkError());
    return ensurePersistence().then(function () {
      return authObj().createUserWithEmailAndPassword(String(email).trim(), String(password));
    }).then(function (cred) {
      return touchUserDoc(cred.user, true).then(function () { return cred.user; });
    });
  }

  function signIn(email, password) {
    if (!ready()) return Promise.reject(sdkError());
    return ensurePersistence().then(function () {
      return authObj().signInWithEmailAndPassword(String(email).trim(), String(password));
    }).then(function (cred) {
      return touchUserDoc(cred.user, false).then(function () { return cred.user; });
    });
  }

  function signOutUser() {
    if (!ready()) return Promise.reject(sdkError());
    return authObj().signOut();   // لا يمسّ LocalStorage إطلاقاً
  }

  function resetPassword(email) {
    if (!ready()) return Promise.reject(sdkError());
    return authObj().sendPasswordResetEmail(String(email).trim());
  }

  function getUser() { return currentUser; }
  function getUid() { return currentUser ? currentUser.uid : null; }
  function getEmail() { return currentUser ? (currentUser.email || '') : ''; }
  function isSignedIn() { return !!currentUser; }

  window.DPAuth = {
    ready: ready,
    onChange: onChange,
    onAuthReady: onAuthReady,
    signUp: signUp,
    signIn: signIn,
    signOut: signOutUser,
    resetPassword: resetPassword,
    getUser: getUser,
    getUid: getUid,
    getEmail: getEmail,
    isSignedIn: isSignedIn,
    messageFor: messageFor,
    validateEmail: validateEmail,
    validatePassword: validatePassword
  };
})();
