/* ============================================================
   DentPilot Student — الصفحة الافتتاحية (Onboarding Gate)
   تظهر مرة واحدة فقط عند أول فتح فعلي للتطبيق، قبل صفحة حساب DentPilot.
   لا تستبدل صفحة الحساب ولا تغيّر منطق الدخول المحلي أو تسجيل الحساب —
   فقط طبقة اختيار أولى فوقها، ثم تُخفى نهائياً بعد أول اختيار.
   مستقلة تماماً عن account-ui.js: تقرأ/تكتب نفس مفتاح "بوابة الدخول"
   (GATE_KEY) بالقيم المتوافقة نفسها ('local' | 'account') دون تعديل تلك الوحدة إطلاقاً.
   ============================================================ */
(function () {
  'use strict';

  var SEEN_KEY = 'dentpilot_student_welcome_seen_v1';   // مفتاح جديد مستقل خاص بهذه الصفحة فقط
  var GATE_KEY = 'dentpilot_student_auth_gate_v1';       // نفس مفتاح account-ui.js — قراءة/كتابة بنفس القيم فقط

  function seen() { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } }
  function markSeen() { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} }
  function gate() { try { return localStorage.getItem(GATE_KEY) || ''; } catch (e) { return ''; } }
  function setGate(v) { try { localStorage.setItem(GATE_KEY, v); } catch (e) {} }

  function boot() {
    var ov = document.getElementById('welcomeGate');
    if (!ov) return;

    /* تظهر فقط عند أول دخول فعلي: لا اختيار سابق مخزَّن لهذه الصفحة، ولا بوابة دخول مفعّلة أصلاً من قبل
       (لمستخدمي التحديث ممن اختاروا مسبقاً محلياً أو حسابهم — لا تظهر لهم الصفحة الافتتاحية إطلاقاً). */
    if (seen() || gate()) { ov.hidden = true; return; }
    ov.hidden = false;

    var localBtn = document.getElementById('welcomeLocalBtn');
    var emailBtn = document.getElementById('welcomeEmailBtn');

    function close() { ov.hidden = true; }

    if (localBtn) localBtn.addEventListener('click', function () {
      markSeen();
      setGate('local');                          // نفس آلية «المتابعة محلياً» الحالية تماماً — بلا أي منطق جديد
      if (window.location.hash.replace(/^#/, '') !== 'dashboard') window.location.hash = 'dashboard';
      close();
    });

    if (emailBtn) emailBtn.addEventListener('click', function () {
      markSeen();                                // لا نضبط GATE هنا: يبقى فارغاً حتى ينجح تسجيل الدخول/الحساب فعلياً
      if (window.location.hash.replace(/^#/, '') !== 'account') window.location.hash = 'account';
      close();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
