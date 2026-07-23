/**
 * Zana AI — Settings Module
 */

'use strict';

const Settings = (() => {
  function init(user) {
    // Populate UI from user data
    if (user) {
      document.getElementById('settings-user-name').textContent  = user.name || '—';
      document.getElementById('settings-user-email').textContent = user.email || '—';
      document.getElementById('settings-avatar').textContent     = user.name?.charAt(0)?.toUpperCase() || 'Z';

      // Sync toggles/selects to user preferences
      const darkToggle = document.getElementById('setting-dark-mode');
      if (darkToggle) darkToggle.checked = (user.theme === 'dark' || ZanaApp.theme === 'dark');

      const fontSelect = document.getElementById('setting-font-size');
      if (fontSelect) fontSelect.value = user.fontSize || ZanaApp.fontSize || 'medium';

      const langSelect = document.getElementById('setting-language');
      if (langSelect) langSelect.value = user.language || ZanaApp.lang || 'en';

      const speedSelect = document.getElementById('setting-ai-speed');
      if (speedSelect) speedSelect.value = user.aiSpeed || 'balanced';
    }

    bindEvents();
  }

  function bindEvents() {
    // Dark mode toggle
    document.getElementById('setting-dark-mode')?.addEventListener('change', async (e) => {
      const theme = e.target.checked ? 'dark' : 'light';
      applyTheme(theme);
      await API.put('/user/settings', { theme });
    });

    // Font size
    document.getElementById('setting-font-size')?.addEventListener('change', async (e) => {
      applyFontSize(e.target.value);
      await API.put('/user/settings', { fontSize: e.target.value });
    });

    // Language
    document.getElementById('setting-language')?.addEventListener('change', async (e) => {
      applyLanguage(e.target.value);
      await API.put('/user/settings', { language: e.target.value });
      location.reload(); // Re-render UI in new language
    });

    // AI speed
    document.getElementById('setting-ai-speed')?.addEventListener('change', async (e) => {
      await API.put('/user/settings', { aiSpeed: e.target.value });
    });

    // Close settings
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      document.getElementById('settings-panel')?.classList.add('closed');
    });

    // Logout
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await API.post('/auth/logout', {});
      Auth.logout();
    });

    // Export buttons in settings
    document.getElementById('btn-export-txt')?.addEventListener('click', () => {
      const chatId = ZanaApp.currentChatId;
      if (chatId) window.open(`/api/chats/${chatId}/export?format=txt`, '_blank');
      else Toast.show('No active conversation to export.', 'warning');
    });

    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      const chatId = ZanaApp.currentChatId;
      if (chatId) window.open(`/api/chats/${chatId}/export?format=pdf`, '_blank');
      else Toast.show('No active conversation to export.', 'warning');
    });

    // Delete account
    document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
      const confirmed = confirm('Are you absolutely sure you want to delete your Zana AI account? This action is permanent and cannot be undone.');
      if (!confirmed) return;

      const password = prompt('To confirm, enter your password:');
      if (password === null) return;

      const res = await API.delete('/user/account', { body: JSON.stringify({ password }) });
      // The delete method doesn't accept body — use raw fetch
      const token = Auth.getToken();
      const rawRes = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      }).then(r => r.json());

      if (rawRes.success) {
        Auth.logout();
      } else {
        Toast.show(rawRes.error || 'Could not delete account.', 'error');
      }
    });
  }

  return { init };
})();

window.Settings = Settings;
