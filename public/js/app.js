/**
 * Zana AI — Core App Module
 * ====================================
 * Global utilities: API client, auth tokens, theme,
 * i18n engine, language detection, toast notifications.
 */

'use strict';

// ─── i18n Translations ────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    newChat: 'New Chat',
    searchChats: 'Search conversations…',
    settings: 'Settings',
    signOut: 'Sign Out',
    deleteAccount: 'Delete Account',
    welcomeTitle: 'How can Death AI help you today?',
    welcomeSubtitle: 'Ask anything — Death AI speaks fluent Kurdish Sorani (کوردی سۆرانی).',
    messagePlaceholder: 'Message Death AI…',
    sending: 'Sending…',
    copy: 'Copy',
    copied: 'Copied!',
    regenerate: 'Regenerate',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    confirm: 'Confirm',
    loading: 'Loading…',
    error: 'Something went wrong. Please try again.',
    networkError: 'Network error. Please check your connection.',
    sessionExpired: 'Session expired. Please sign in again.',
    chatDeleted: 'Conversation deleted.',
    exportSuccess: 'Chat exported successfully.',
    voiceStart: 'Listening…',
    voiceStop: 'Voice input stopped.',
    all: 'All',
    pinned: 'Pinned',
    favorites: 'Favorites',
    today: 'Today',
    yesterday: 'Yesterday',
    older: 'Older',
    noChats: 'No conversations yet. Start chatting!',
    appearance: 'Appearance',
    language: 'Language',
    aiBehavior: 'AI Behavior',
    account: 'Account',
    darkMode: 'Dark Mode',
    fontSize: 'Font Size',
    interfaceLang: 'Interface Language',
    responseSpeed: 'Response Speed',
    voiceOutput: 'Voice Output',
    exportChat: 'Export Current Chat',
  },
  ku: {
    newChat: 'گفتوگۆی نوێ',
    searchChats: 'گەڕان لە گفتوگۆکان…',
    settings: 'ڕێکخستنەکان',
    signOut: 'چوونەدەرەوە',
    deleteAccount: 'سڕینەوەی ئەکاونت',
    welcomeTitle: 'دەس ئەی ئای — چۆن یارمەتیت بدەم؟',
    welcomeSubtitle: 'هەر پرسیارێک بکە — بە کوردی سۆرانی ڕەوان وەڵامت دەدەمەوە.',
    messagePlaceholder: 'نامەیەک بۆ Death AI بنووسە…',
    sending: 'ناردن…',
    copy: 'کۆپیکردن',
    copied: 'کۆپی کرا!',
    regenerate: 'دووبارە دروستکردن',
    edit: 'دەستکاریکردن',
    delete: 'سڕینەوە',
    cancel: 'هەڵوەشاندنەوە',
    confirm: 'پشتراستکردنەوە',
    loading: 'چاوەڕێکردن…',
    error: 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵبدەرەوە.',
    networkError: 'هەڵەی تۆڕ. تکایە پەیوەندیت بپشکنە.',
    sessionExpired: 'کات تەواو بوو. تکایە دووبارە بچە ژوورەوە.',
    chatDeleted: 'گفتوگۆکە سڕایەوە.',
    exportSuccess: 'گفتوگۆکە هەڵگیرا.',
    voiceStart: 'گوێدەگرم…',
    voiceStop: 'دەنگی تێدا کرایەوە.',
    all: 'هەمووی',
    pinned: 'پینکراو',
    favorites: 'دڵخوازەکان',
    today: 'ئەمڕۆ',
    yesterday: 'دوێنێ',
    older: 'کۆنتر',
    noChats: 'هیچ گفتوگۆیەک نییە. دەستبکە بە چاتکردن!',
    appearance: 'ڕووکار',
    language: 'زمان',
    aiBehavior: 'ڕەفتاری AI',
    account: 'ئەکاونت',
    darkMode: 'دۆخی تاریک',
    fontSize: 'قەبارەی فۆنت',
    interfaceLang: 'زمانی ڕووکار',
    responseSpeed: 'خێرایی وەڵام',
    voiceOutput: 'دەنگی دەرکەوتن',
    exportChat: 'هەڵگرتنی گفتوگۆکە',
  },
  ar: {
    newChat: 'محادثة جديدة',
    searchChats: 'البحث في المحادثات…',
    settings: 'الإعدادات',
    signOut: 'تسجيل الخروج',
    deleteAccount: 'حذف الحساب',
    welcomeTitle: 'كيف يمكن لـ Death AI مساعدتك اليوم؟',
    welcomeSubtitle: 'اسأل أي شيء — أنا هنا للمساعدة بالكردية السورانية أو العربية أو الإنجليزية.',
    messagePlaceholder: 'راسل Death AI…',
    sending: 'جارٍ الإرسال…',
    copy: 'نسخ',
    copied: 'تم النسخ!',
    regenerate: 'إعادة الإنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    loading: 'جارٍ التحميل…',
    error: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    networkError: 'خطأ في الشبكة. يرجى التحقق من اتصالك.',
    sessionExpired: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
    chatDeleted: 'تم حذف المحادثة.',
    exportSuccess: 'تم تصدير المحادثة بنجاح.',
    voiceStart: 'جارٍ الاستماع…',
    voiceStop: 'تم إيقاف الإدخال الصوتي.',
    all: 'الكل',
    pinned: 'المثبتة',
    favorites: 'المفضلة',
    today: 'اليوم',
    yesterday: 'أمس',
    older: 'أقدم',
    noChats: 'لا توجد محادثات. ابدأ الدردشة!',
    appearance: 'المظهر',
    language: 'اللغة',
    aiBehavior: 'سلوك الذكاء الاصطناعي',
    account: 'الحساب',
    darkMode: 'الوضع الداكن',
    fontSize: 'حجم الخط',
    interfaceLang: 'لغة الواجهة',
    responseSpeed: 'سرعة الاستجابة',
    voiceOutput: 'الإخراج الصوتي',
    exportChat: 'تصدير المحادثة الحالية',
  },
};

// ─── App State ─────────────────────────────────────────────────────────────────
window.ZanaApp = {
  lang: localStorage.getItem('zana_lang') || 'ku',
  theme: localStorage.getItem('zana_theme') || 'dark',
  fontSize: localStorage.getItem('zana_fontSize') || 'medium',
  user: null,
  currentChatId: null,
  isGenerating: false,
  currentRequestId: null,
};

// ─── Translations helper ──────────────────────────────────────────────────────
window.t = (key) => {
  return TRANSLATIONS[ZanaApp.lang]?.[key] || TRANSLATIONS.en[key] || key;
};

// ─── Theme ────────────────────────────────────────────────────────────────────
function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  ZanaApp.theme = theme;
  localStorage.setItem('zana_theme', theme);
}

function applyFontSize(size) {
  document.documentElement.setAttribute('data-fontsize', size);
  ZanaApp.fontSize = size;
  localStorage.setItem('zana_fontSize', size);
}

function applyLanguage(lang) {
  ZanaApp.lang = lang;
  localStorage.setItem('zana_lang', lang);
  const isRTL = lang === 'ku' || lang === 'ar';
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
}

// Apply on load
applyTheme(ZanaApp.theme);
applyFontSize(ZanaApp.fontSize);
applyLanguage(ZanaApp.lang);

// ─── Token Management ─────────────────────────────────────────────────────────
const Auth = {
  getToken() {
    return localStorage.getItem('zana_token');
  },
  setToken(token) {
    localStorage.setItem('zana_token', token);
  },
  removeToken() {
    localStorage.removeItem('zana_token');
    localStorage.removeItem('zana_user');
  },
  getUser() {
    try {
      const u = localStorage.getItem('zana_user');
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  },
  setUser(user) {
    localStorage.setItem('zana_user', JSON.stringify(user));
    ZanaApp.user = user;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    this.removeToken();
    ZanaApp.user = null;
    window.location.href = '/auth.html';
  },
};

window.Auth = Auth;

// ─── API Client ───────────────────────────────────────────────────────────────
const API = {
  BASE: '/api',

  async request(endpoint, options = {}) {
    const token = Auth.getToken();
    const headers = {
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const res = await fetch(this.BASE + endpoint, {
        ...options,
        headers,
      });

      // Handle 401 — auto refresh or redirect
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        if (body.code === 'TOKEN_EXPIRED') {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            // Retry once with new token
            return this.request(endpoint, options);
          }
        }
        Auth.logout();
        return null;
      }

      const data = await res.json().catch(() => ({ error: 'Invalid response format' }));
      return { ok: res.ok, status: res.status, data };
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      console.error('[API Error]', error);
      Toast.show(t('networkError'), 'error');
      return null;
    }
  },

  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  async post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async refreshToken() {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.accessToken) {
        Auth.setToken(data.accessToken);
        return true;
      }
      return false;
    } catch { return false; }
  },

  // Streaming AI request
  async stream(endpoint, body, onDelta, onDone, onError) {
    const token = Auth.getToken();
    const res = await fetch(this.BASE + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      onError(err.error || 'Request failed');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(line.slice(6));
          if (json.type === 'delta') onDelta(json.content);
          else if (json.type === 'done') onDone(json);
          else if (json.type === 'stopped') onDone({ ...json, stopped: true });
          else if (json.type === 'error') onError(json.error);
        } catch (_) {}
      }
    }
  },
};

window.API = API;

// ─── Toast Notifications ──────────────────────────────────────────────────────
const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toast-container');
  },

  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.container = document.getElementById('toast-container');
    if (!this.container) return;

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast-icon" aria-hidden="true" style="font-size:16px;font-weight:700;color:${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--error)' : type === 'warning' ? 'var(--warning)' : 'var(--info)'};">${icons[type]}</span>
      <span>${message}</span>
    `;

    this.container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    });
  },
};

window.Toast = Toast;

// ─── Detect language from text ────────────────────────────────────────────────
function detectLanguage(text) {
  if (!text || text.length < 3) return ZanaApp.lang;
  // Check for Arabic/Kurdish script
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) {
    // Rough: if has Kurdish-specific chars
    if (/[ڤڵۆێ]/.test(text)) return 'ku';
    return 'ar';
  }
  return 'en';
}

window.detectLanguage = detectLanguage;

// ─── Format timestamps ────────────────────────────────────────────────────────
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('today');
  if (diffDays === 1) return t('yesterday');
  if (diffDays < 7) return date.toLocaleDateString(ZanaApp.lang === 'ar' ? 'ar' : ZanaApp.lang === 'ku' ? 'ku' : 'en', { weekday: 'long' });
  return date.toLocaleDateString(ZanaApp.lang === 'ar' ? 'ar' : 'en', { month: 'short', day: 'numeric' });
}

window.formatDate = formatDate;

function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

window.formatRelativeTime = formatRelativeTime;

// ─── Auth Guard ───────────────────────────────────────────────────────────────
async function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = '/auth.html';
    return null;
  }
  // Load user if not cached
  if (!ZanaApp.user) {
    const cached = Auth.getUser();
    if (cached) {
      ZanaApp.user = cached;
    } else {
      const res = await API.get('/auth/me');
      if (res?.ok) {
        Auth.setUser(res.data.user);
        ZanaApp.user = res.data.user;
        // Apply user preferences
        if (res.data.user.theme) applyTheme(res.data.user.theme);
        if (res.data.user.language) applyLanguage(res.data.user.language);
        if (res.data.user.fontSize) applyFontSize(res.data.user.fontSize);
      } else {
        Auth.logout();
        return null;
      }
    }
  }
  return ZanaApp.user;
}

window.requireAuth = requireAuth;

// ─── PWA Service Worker ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();

  // Handle token from URL (Google OAuth redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const tokenFromUrl = urlParams.get('token');
  if (tokenFromUrl) {
    Auth.setToken(tokenFromUrl);
    window.history.replaceState({}, '', window.location.pathname);
  }

  // Handle error from URL
  const errorParam = urlParams.get('error');
  if (errorParam === 'google_failed') {
    Toast.show('Google sign-in failed. Please try again.', 'error');
  }
});
