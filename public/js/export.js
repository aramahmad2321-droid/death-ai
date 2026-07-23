/**
 * Zana AI — Export Module (client-side fallback)
 * Delegates to server-side export via API.
 */

'use strict';

const ExportModule = (() => {
  function downloadChat(format) {
    const chatId = ZanaApp.currentChatId;
    if (!chatId) {
      Toast.show('No active conversation to export.', 'warning');
      return;
    }

    const token = Auth.getToken();
    const url = `/api/chats/${chatId}/export?format=${format}`;

    // Trigger download via hidden link
    const a = document.createElement('a');
    a.href = url;
    a.download = `zana-chat-${chatId}.${format}`;
    // We need auth header — fetch as blob
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      if (!res.ok) throw new Error('Export failed');
      return res.blob();
    }).then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `zana-chat-${chatId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      Toast.show(t('exportSuccess'), 'success');
    }).catch(() => {
      Toast.show('Export failed. Please try again.', 'error');
    });
  }

  return { downloadChat };
})();

window.ExportModule = ExportModule;
