// ═══════════════════════════════════════════════════
//  auth-script.js  —  Auth Overlay Frontend Logic
//  No frameworks. Vanilla JS only.
// ═══════════════════════════════════════════════════

(function () {
  'use strict';

  // ── DOM refs ────────────────────────────────────────
  const overlay        = document.getElementById('auth-overlay');
  const card           = document.getElementById('auth-card');
  const tabs           = document.getElementById('auth-tabs');
  const tabBtns        = document.querySelectorAll('.tab-btn');
  const loginForm      = document.getElementById('login-form');
  const signupForm     = document.getElementById('signup-form');
  const forgotPanel    = document.getElementById('forgot-panel');
  const toast          = document.getElementById('auth-toast');
  const toastIcon      = document.getElementById('toast-icon');
  const toastMsg       = document.getElementById('toast-msg');
  const welcomeBanner  = document.getElementById('welcome-banner');

  // ── Login fields ────────────────────────────────────
  const loginId        = document.getElementById('login-identifier');
  const loginPass      = document.getElementById('login-password');
  const loginRemember  = document.getElementById('remember-me');
  const loginBtn       = document.getElementById('login-btn');
  const loginIdMsg     = document.getElementById('login-id-msg');
  const loginPassMsg   = document.getElementById('login-pass-msg');

  // ── Signup fields ───────────────────────────────────
  const signupName     = document.getElementById('signup-name');
  const signupUser     = document.getElementById('signup-username');
  const signupEmail    = document.getElementById('signup-email');
  const signupPass     = document.getElementById('signup-password');
  const signupConfirm  = document.getElementById('signup-confirm');
  const signupTerms    = document.getElementById('signup-terms');
  const signupBtn      = document.getElementById('signup-btn');
  const strengthFill   = document.getElementById('strength-fill');
  const strengthLabel  = document.getElementById('strength-label');

  const signupMsgs = {
    name:    document.getElementById('signup-name-msg'),
    user:    document.getElementById('signup-user-msg'),
    email:   document.getElementById('signup-email-msg'),
    pass:    document.getElementById('signup-pass-msg'),
    confirm: document.getElementById('signup-confirm-msg'),
    terms:   document.getElementById('signup-terms-msg'),
  };

  // ── Forgot password fields ──────────────────────────
  const forgotEmail    = document.getElementById('forgot-email');
  const forgotBtn      = document.getElementById('forgot-btn');
  const forgotMsg      = document.getElementById('forgot-msg');

  // ── Particle canvas ────────────────────────────────
  const particlesContainer = document.getElementById('auth-particles');

  // ════════════════════════════════════════════════════
  //  FLOATING PARTICLES
  // ════════════════════════════════════════════════════
  function spawnParticle() {
    const p = document.createElement('div');
    p.className = 'auth-particle';
    const size = 1 + Math.random() * 2;
    p.style.cssText = `
      left:     ${Math.random() * 100}%;
      width:    ${size}px;
      height:   ${size}px;
      animation-duration:  ${4 + Math.random() * 6}s;
      animation-delay:     ${Math.random() * 4}s;
      opacity:  ${0.3 + Math.random() * 0.5};
    `;
    particlesContainer.appendChild(p);
    // Remove after animation ends to avoid DOM bloat
    setTimeout(() => p.remove(), 12000);
  }
  // Keep spawning particles
  setInterval(spawnParticle, 350);
  for (let i = 0; i < 14; i++) spawnParticle(); // initial burst

  // ════════════════════════════════════════════════════
  //  SESSION CHECK  — skip overlay if already logged in
  // ════════════════════════════════════════════════════
  (function checkSession() {
    const session = getSession();
    if (session) {
      // Already logged in — remove overlay immediately (no animation)
      overlay.remove();
      showWelcomeBanner(session.fullname || session.username, false);
    }
    // else: overlay stays visible (default)
  })();

  // ════════════════════════════════════════════════════
  //  TAB SWITCHING
  // ════════════════════════════════════════════════════
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      switchTab(target);
    });
  });

  function switchTab(tab) {
    // Update tab indicators
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    tabs.dataset.active = tab;

    // Show correct form
    loginForm.classList.toggle('active',  tab === 'login');
    signupForm.classList.toggle('active', tab === 'signup');
    forgotPanel.classList.remove('active');

    clearAllMessages();
  }

  // ════════════════════════════════════════════════════
  //  PASSWORD VISIBILITY TOGGLES
  // ════════════════════════════════════════════════════
  document.querySelectorAll('[data-eye]').forEach(btn => {
    btn.addEventListener('click', () => {
      const inputId = btn.dataset.eye;
      const input   = document.getElementById(inputId);
      if (!input) return;
      const isPass  = input.type === 'password';
      input.type    = isPass ? 'text' : 'password';
      btn.textContent = isPass ? '🙈' : '👁';
    });
  });

  // ════════════════════════════════════════════════════
  //  FORGOT PASSWORD  (UI only — demo flow)
  // ════════════════════════════════════════════════════
  document.getElementById('forgot-link').addEventListener('click', e => {
    e.preventDefault();
    loginForm.classList.remove('active');
    forgotPanel.classList.add('active');
    clearAllMessages();
  });

  document.getElementById('back-to-login').addEventListener('click', () => {
    forgotPanel.classList.remove('active');
    loginForm.classList.add('active');
    clearAllMessages();
  });

  forgotBtn.addEventListener('click', async () => {
    const email = forgotEmail.value.trim();
    setMsg(forgotMsg, '', '');

    if (!email || !isValidEmail(email)) {
      setMsg(forgotMsg, 'Enter a valid email address.', 'error');
      forgotEmail.classList.add('error');
      return;
    }
    forgotEmail.classList.remove('error');

    // Simulate sending (we don't have a real email server)
    setLoading(forgotBtn, true);
    await delay(1200);
    setLoading(forgotBtn, false);

    setMsg(forgotMsg, '✓ Reset link sent! Check your inbox.', 'success');
    showToast('If that email is registered, a reset link has been sent.', 'success');
  });

  // ════════════════════════════════════════════════════
  //  REAL-TIME SIGNUP VALIDATION
  // ════════════════════════════════════════════════════
  signupName.addEventListener('input', () => validateName());
  signupUser.addEventListener('input', () => validateUsername());
  signupEmail.addEventListener('input', () => validateEmail());
  signupPass.addEventListener('input', () => {
    validateSignupPassword();
    updateStrength(signupPass.value);
    if (signupConfirm.value) validateConfirm();
  });
  signupConfirm.addEventListener('input', () => validateConfirm());

  function validateName() {
    const v = signupName.value.trim();
    if (!v)           return setFieldState(signupName, signupMsgs.name, '', '');
    if (v.length < 2) return setFieldState(signupName, signupMsgs.name, 'Name too short.', 'error');
    setFieldState(signupName, signupMsgs.name, '✓ Looks good.', 'success');
    return true;
  }

  function validateUsername() {
    const v = signupUser.value.trim();
    if (!v)             return setFieldState(signupUser, signupMsgs.user, '', '');
    if (v.length < 3)   return setFieldState(signupUser, signupMsgs.user, 'At least 3 characters.', 'error');
    if (!/^[a-zA-Z0-9_]+$/.test(v))
                        return setFieldState(signupUser, signupMsgs.user, 'Only letters, numbers, underscores.', 'error');
    setFieldState(signupUser, signupMsgs.user, '✓ Username available.', 'success');
    return true;
  }

  function validateEmail() {
    const v = signupEmail.value.trim();
    if (!v)              return setFieldState(signupEmail, signupMsgs.email, '', '');
    if (!isValidEmail(v)) return setFieldState(signupEmail, signupMsgs.email, 'Invalid email format.', 'error');
    setFieldState(signupEmail, signupMsgs.email, '✓ Valid email.', 'success');
    return true;
  }

  function validateSignupPassword() {
    const v = signupPass.value;
    if (!v)            return setFieldState(signupPass, signupMsgs.pass, '', '');
    if (v.length < 6)  return setFieldState(signupPass, signupMsgs.pass, 'At least 6 characters.', 'error');
    setFieldState(signupPass, signupMsgs.pass, '✓ Strong enough.', 'success');
    return true;
  }

  function validateConfirm() {
    const v = signupConfirm.value;
    if (!v) return setFieldState(signupConfirm, signupMsgs.confirm, '', '');
    if (v !== signupPass.value)
      return setFieldState(signupConfirm, signupMsgs.confirm, 'Passwords do not match.', 'error');
    setFieldState(signupConfirm, signupMsgs.confirm, '✓ Passwords match.', 'success');
    return true;
  }

  // ── Password strength meter ──────────────────────
  function updateStrength(pass) {
    if (!pass) {
      strengthFill.className  = 'strength-fill';
      strengthLabel.textContent = '';
      strengthLabel.style.color = '';
      return;
    }
    let score = 0;
    if (pass.length >= 6)  score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    const levels = ['', 'weak', 'fair', 'good', 'strong', 'strong'];
    const labels = ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG', 'VERY STRONG'];
    const colors = ['', '#ff0033', '#ffaa00', '#00ffff', '#00ff41', '#00ff41'];
    const lvl = Math.min(score, 5);

    strengthFill.className    = `strength-fill ${levels[lvl]}`;
    strengthLabel.textContent = labels[lvl];
    strengthLabel.style.color = colors[lvl];
  }

  // ════════════════════════════════════════════════════
  //  LOGIN SUBMIT
  // ════════════════════════════════════════════════════
  loginBtn.addEventListener('click', async () => {
    clearAllMessages();
    let valid = true;

    const identifier = loginId.value.trim();
    const password   = loginPass.value;

    if (!identifier) {
      setFieldState(loginId, loginIdMsg, 'Enter your username or email.', 'error');
      valid = false;
    }
    if (!password) {
      setFieldState(loginPass, loginPassMsg, 'Enter your password.', 'error');
      valid = false;
    }
    if (!valid) return;

    setLoading(loginBtn, true);

    try {
      const res  = await fetch('/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ identifier, password })
      });
      const data = await res.json();

      if (data.success) {
        // Optionally remember session
        if (loginRemember.checked) {
          saveSession(data.user, true);   // localStorage (persistent)
        } else {
          saveSession(data.user, false);  // sessionStorage (tab-only)
        }
        onLoginSuccess(data.user, data.message);
      } else {
        setLoading(loginBtn, false);
        showToast(data.message || 'Login failed.', 'error');
        setFieldState(loginPass, loginPassMsg, data.message, 'error');
      }
    } catch (err) {
      setLoading(loginBtn, false);
      showToast('Cannot reach server. Is it running?', 'error');
      console.error('[Auth] Login error:', err);
    }
  });

  // ── Allow Enter key to submit login ─────────────
  [loginId, loginPass].forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') loginBtn.click();
    });
  });

  // ════════════════════════════════════════════════════
  //  SIGNUP SUBMIT
  // ════════════════════════════════════════════════════
  signupBtn.addEventListener('click', async () => {
    clearAllMessages();

    // Run all validators and collect results
    const nameOk    = validateName();
    const userOk    = validateUsername();
    const emailOk   = validateEmail();
    const passOk    = validateSignupPassword();
    const confirmOk = validateConfirm();

    if (!signupTerms.checked) {
      setMsg(signupMsgs.terms, 'You must accept the terms.', 'error');
    }

    if (!nameOk || !userOk || !emailOk || !passOk || !confirmOk || !signupTerms.checked) {
      return;
    }

    setLoading(signupBtn, true);

    try {
      const res  = await fetch('/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          fullname: signupName.value.trim(),
          username: signupUser.value.trim(),
          email:    signupEmail.value.trim(),
          password: signupPass.value
        })
      });
      const data = await res.json();

      if (data.success) {
        saveSession(data.user, false); // sessionStorage by default
        onLoginSuccess(data.user, data.message);
      } else {
        setLoading(signupBtn, false);
        showToast(data.message || 'Signup failed.', 'error');
      }
    } catch (err) {
      setLoading(signupBtn, false);
      showToast('Cannot reach server. Is it running?', 'error');
      console.error('[Auth] Signup error:', err);
    }
  });

  // ── Allow Enter key to submit signup ─────────────
  [signupName, signupUser, signupEmail, signupPass, signupConfirm].forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') signupBtn.click();
    });
  });

  // ════════════════════════════════════════════════════
  //  SUCCESS: dismiss overlay + welcome banner
  // ════════════════════════════════════════════════════
  function onLoginSuccess(user, message) {
    const name = user.fullname || user.username;
    showToast(`${message}`, 'success');

    // Wait a beat, then fade out overlay
    setTimeout(() => {
      overlay.classList.add('dismissing');
      overlay.addEventListener('animationend', () => {
        overlay.remove();
        showWelcomeBanner(name, true);
      }, { once: true });
    }, 900);
  }

  function showWelcomeBanner(name, animate) {
    welcomeBanner.textContent = `▶ ACCESS GRANTED — WELCOME, ${name.toUpperCase()} ◀`;
    if (animate) {
      requestAnimationFrame(() => {
        welcomeBanner.classList.add('show');
        setTimeout(() => welcomeBanner.classList.remove('show'), 4000);
      });
    }
  }

  // ════════════════════════════════════════════════════
  //  TOAST NOTIFICATIONS
  // ════════════════════════════════════════════════════
  let toastTimer;
  function showToast(msg, type = 'info') {
    clearTimeout(toastTimer);
    toastIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toastMsg.textContent  = msg;
    toast.className       = `show ${type}`;

    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3800);
  }

  // ════════════════════════════════════════════════════
  //  SESSION STORAGE HELPERS
  // ════════════════════════════════════════════════════
  function saveSession(user, persistent) {
    const store = persistent ? localStorage : sessionStorage;
    store.setItem('auth_user', JSON.stringify(user));
  }

  function getSession() {
    const ls = localStorage.getItem('auth_user');
    const ss = sessionStorage.getItem('auth_user');
    if (ls) {
      try { return JSON.parse(ls); } catch (e) { localStorage.removeItem('auth_user'); }
    }
    if (ss) {
      try { return JSON.parse(ss); } catch (e) { sessionStorage.removeItem('auth_user'); }
    }
    return null;
  }

  // ════════════════════════════════════════════════════
  //  FIELD STATE HELPERS
  // ════════════════════════════════════════════════════
  function setFieldState(input, msgEl, msg, state) {
    input.classList.remove('error', 'success');
    if (state) input.classList.add(state);
    if (msgEl) setMsg(msgEl, msg, state);
    return state === 'success';
  }

  function setMsg(el, msg, state) {
    if (!el) return;
    el.textContent = msg;
    el.className   = `field-msg ${state || ''}`;
  }

  function clearAllMessages() {
    document.querySelectorAll('.field-msg').forEach(el => {
      el.textContent = '';
      el.className   = 'field-msg';
    });
    document.querySelectorAll('.auth-input').forEach(el => {
      el.classList.remove('error', 'success');
    });
  }

  function setLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle('loading', on);
  }

  // ════════════════════════════════════════════════════
  //  UTILITY
  // ════════════════════════════════════════════════════
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── Typing animation for auth title ─────────────
  const titleEl = document.getElementById('auth-typing-title');
  if (titleEl) {
    const fullText  = titleEl.dataset.text || 'SECURE ACCESS';
    titleEl.textContent = '';
    let i = 0;
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    titleEl.after(cursor);

    const typeInterval = setInterval(() => {
      if (i < fullText.length) {
        titleEl.textContent += fullText[i++];
      } else {
        clearInterval(typeInterval);
        // Remove cursor after 2s
        setTimeout(() => cursor.remove(), 2000);
      }
    }, 80);
  }

})(); // end IIFE
