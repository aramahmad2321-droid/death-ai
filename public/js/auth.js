/**
 * Zana AI — Auth Page Logic
 * Login, register, forgot/reset password, Google OAuth, email verify.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // Redirect if already logged in
  if (Auth.isLoggedIn()) {
    const user = Auth.getUser();
    if (user) { window.location.href = '/chat.html'; return; }
  }

  const urlParams = new URLSearchParams(window.location.search);

  // ─── Handle reset token in URL ──────────────────────────────────────────
  const resetToken = urlParams.get('reset');
  if (resetToken) {
    showForm('reset');
    document.getElementById('auth-title').textContent = 'Set New Password';
    document.getElementById('auth-subtitle').textContent = '';
    document.getElementById('reset-form').dataset.token = resetToken;
    return;
  }

  // ─── Handle email verify token in URL ───────────────────────────────────
  const verifyToken = urlParams.get('verify');
  if (verifyToken) {
    verifyEmail(verifyToken);
    return;
  }

  // ─── Handle ?tab=register ────────────────────────────────────────────────
  if (urlParams.get('tab') === 'register') {
    switchTab('register');
  }

  // ─── Tab switching ───────────────────────────────────────────────────────
  document.getElementById('tab-login')?.addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-register')?.addEventListener('click', () => switchTab('register'));

  function switchTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('tab-login').setAttribute('aria-selected', String(isLogin));
    document.getElementById('tab-register').setAttribute('aria-selected', String(!isLogin));
    document.getElementById('form-login').classList.toggle('hidden', !isLogin);
    document.getElementById('form-register').classList.toggle('hidden', isLogin);
    hideAlert();
    document.getElementById('auth-title').textContent = isLogin ? 'Welcome back' : 'Create your account';
    document.getElementById('auth-subtitle').textContent = isLogin ? 'Sign in to continue your conversations' : 'Start chatting with Zana for free';
  }

  // ─── Show specific form ──────────────────────────────────────────────────
  function showForm(name) {
    ['login', 'register', 'forgot', 'reset', 'verify'].forEach(f => {
      const el = document.getElementById(`form-${f}`);
      if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(`form-${name}`);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.auth-tabs').forEach(t => t.classList.add('hidden'));
  }

  function restoreTabs() {
    document.querySelectorAll('.auth-tabs').forEach(t => t.classList.remove('hidden'));
    switchTab('login');
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────
  document.getElementById('forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    showForm('forgot');
    document.getElementById('auth-title').textContent = 'Forgot password?';
    document.getElementById('auth-subtitle').textContent = 'Enter your email to get a reset link';
  });

  document.getElementById('back-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    restoreTabs();
    document.getElementById('auth-title').textContent = 'Welcome back';
    document.getElementById('auth-subtitle').textContent = 'Sign in to continue your conversations';
  });

  document.getElementById('back-to-login-2')?.addEventListener('click', (e) => {
    e.preventDefault();
    restoreTabs();
  });

  // ─── Resend verification ─────────────────────────────────────────────────
  document.getElementById('resend-btn')?.addEventListener('click', async () => {
    const email = document.getElementById('reg-email')?.value || '';
    if (!email) return;
    const btn = document.getElementById('resend-btn');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    await API.post('/auth/resend-verification', { email });
    Toast.show('Verification email resent. Check your inbox!', 'success');
    btn.textContent = 'Resend Email';
    btn.disabled = false;
  });

  // ─── Alert helpers ────────────────────────────────────────────────────────
  function showAlert(msg, type = 'error') {
    const el = document.getElementById('auth-alert');
    if (!el) return;
    el.className = `auth-alert ${type}`;
    el.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        ${type === 'success'
          ? '<polyline points="20 6 9 17 4 12"/>'
          : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
      </svg>
      <span>${msg}</span>
    `;
    el.classList.remove('hidden');
  }

  function hideAlert() {
    const el = document.getElementById('auth-alert');
    if (el) el.classList.add('hidden');
  }

  function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
  }

  // ─── Login Form ───────────────────────────────────────────────────────────
  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) { showAlert('Please fill in all fields.'); return; }

    setLoading('login-submit', true);
    const res = await API.post('/auth/login', { email, password });
    setLoading('login-submit', false);

    if (!res) return;
    if (!res.ok) {
      showAlert(res.data?.error || 'Login failed. Please try again.');
      return;
    }

    Auth.setToken(res.data.accessToken);
    Auth.setUser(res.data.user);
    applyTheme(res.data.user.theme || 'dark');
    applyLanguage(res.data.user.language || 'en');

    if (res.data.warning) Toast.show(res.data.warning, 'warning');
    window.location.href = '/chat.html';
  });

  // ─── Register Form ────────────────────────────────────────────────────────
  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const language = document.getElementById('reg-language').value;

    if (!name || !email || !password) { showAlert('Please fill in all fields.'); return; }
    if (name.length < 2) { showAlert('Name must be at least 2 characters.'); return; }
    if (password.length < 8) { showAlert('Password must be at least 8 characters.'); return; }

    setLoading('register-submit', true);
    const res = await API.post('/auth/register', { name, email, password, language });
    setLoading('register-submit', false);

    Auth.setToken(res.data.accessToken);
    Auth.setUser(res.data.user);
    applyTheme(res.data.user.theme || 'dark');
    applyLanguage(res.data.user.language || 'en');

    Toast.show('Account created! Welcome to Zana AI.', 'success');
    window.location.href = '/chat.html';
  });

  // ─── Demo Instant Login ──────────────────────────────────────────────────
  document.getElementById('btn-demo-login')?.addEventListener('click', async () => {
    hideAlert();
    const btn = document.getElementById('btn-demo-login');
    btn.disabled = true;
    btn.textContent = 'Logging in…';

    const res = await API.post('/auth/demo', {});
    btn.disabled = false;
    btn.textContent = '⚡ Instant Demo Login (1-Click)';

    if (res?.ok) {
      Auth.setToken(res.data.accessToken);
      Auth.setUser(res.data.user);
      applyTheme(res.data.user.theme || 'dark');
      applyLanguage(res.data.user.language || 'en');
      window.location.href = '/chat.html';
    } else {
      showAlert(res?.data?.error || 'Demo login failed.');
    }
  });

  // ─── Forgot Password Form ─────────────────────────────────────────────────
  document.getElementById('forgot-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('forgot-email').value.trim();
    if (!email) { showAlert('Please enter your email address.'); return; }

    setLoading('forgot-submit', true);
    const res = await API.post('/auth/forgot-password', { email });
    setLoading('forgot-submit', false);

    if (!res) return;
    showAlert(res.data?.message || 'If this email is registered, a reset link has been sent.', 'success');
  });

  // ─── Reset Password Form ──────────────────────────────────────────────────
  document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const password = document.getElementById('reset-password').value;
    const token    = e.target.dataset.token;

    if (!password || password.length < 8) { showAlert('Password must be at least 8 characters.'); return; }
    if (!token) { showAlert('Invalid reset link.'); return; }

    setLoading('reset-submit', true);
    const res = await API.post(`/auth/reset-password/${token}`, { password });
    setLoading('reset-submit', false);

    if (!res) return;
    if (!res.ok) {
      showAlert(res.data?.error || 'Reset failed. Link may be expired.');
      return;
    }

    showAlert('Password reset! Redirecting to sign in…', 'success');
    setTimeout(() => {
      window.location.href = '/auth.html';
    }, 2000);
  });

  // ─── Password Strength ────────────────────────────────────────────────────
  document.getElementById('reg-password')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');
    if (!fill || !text) return;

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const levels = [
      { cls: '', label: 'Enter a password' },
      { cls: 'weak', label: '⚠ Weak' },
      { cls: 'fair', label: '○ Fair' },
      { cls: 'good', label: '◎ Good' },
      { cls: 'strong', label: '✓ Strong' },
    ];

    const level = val.length === 0 ? 0 : Math.min(score, 4);
    fill.className = `strength-fill ${levels[level].cls}`;
    text.textContent = levels[level].label;
  });

  // ─── Email Verification ───────────────────────────────────────────────────
  async function verifyEmail(token) {
    showForm('verify');
    document.getElementById('auth-title').textContent = 'Verifying your email…';

    const res = await API.get(`/auth/verify/${token}`);

    if (res?.ok) {
      showAlert('✓ Email verified! Redirecting to sign in…', 'success');
      document.getElementById('auth-title').textContent = 'Email Verified!';
      setTimeout(() => { window.location.href = '/auth.html'; }, 2500);
    } else {
      showAlert(res?.data?.error || 'Invalid or expired verification link.');
      document.getElementById('auth-title').textContent = 'Verification Failed';
    }
  }
});
