/**
 * Zana AI — Sidebar Module
 * Chat history, search, pin, favorite, active state.
 */

'use strict';

const Sidebar = (() => {
  let chats = [];
  let activeFilter = 'all';
  let searchTimer = null;
  let activeId = null;

  const chatList    = document.getElementById('chat-list');
  const searchInput = document.getElementById('chat-search');
  const sidebarEl   = document.getElementById('sidebar');
  const overlay     = document.getElementById('sidebar-overlay');

  // ─── Init ──────────────────────────────────────────────────────────────────
  async function init(user) {
    // Fill user info
    const name  = document.getElementById('sidebar-user-name');
    const email = document.getElementById('sidebar-user-email');
    const avatar= document.getElementById('sidebar-avatar');

    if (name) name.textContent = user.name || 'User';
    if (email) email.textContent = user.email || '';
    if (avatar) {
      avatar.textContent = user.name?.charAt(0)?.toUpperCase() || 'U';
    }

    await loadChats();
    bindEvents();
  }

  // ─── Load chats ────────────────────────────────────────────────────────────
  async function loadChats(search = '') {
    const filter = activeFilter !== 'all' ? `&filter=${activeFilter}` : '';
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    const res = await API.get(`/chats?limit=50${filter}${q}`);

    const skeleton = document.getElementById('chat-list-skeleton');
    if (skeleton) skeleton.remove();

    if (!res?.ok) return;
    chats = res.data.chats;
    renderChats(chats);
  }

  // ─── Render chat list ──────────────────────────────────────────────────────
  function renderChats(list) {
    // Remove all existing items
    chatList.querySelectorAll('.chat-item, .chat-list-section, .chat-list-label, .chat-empty').forEach(el => el.remove());

    if (!list.length) {
      const empty = document.createElement('div');
      empty.className = 'chat-empty';
      empty.style.cssText = 'text-align:center;padding:40px 16px;color:var(--text-muted);font-size:0.875rem;';
      empty.textContent = t('noChats');
      chatList.appendChild(empty);
      return;
    }

    // Group by date
    const pinned = list.filter(c => c.pinned);
    const unpinned = list.filter(c => !c.pinned);

    if (pinned.length) {
      const section = createSection('📌 ' + t('pinned'), pinned);
      chatList.appendChild(section);
    }

    // Group unpinned by date
    const groups = groupByDate(unpinned);
    for (const [label, items] of Object.entries(groups)) {
      if (items.length === 0) continue;
      const section = createSection(label, items);
      chatList.appendChild(section);
    }
  }

  function groupByDate(list) {
    const groups = { Today: [], Yesterday: [], 'Last 7 Days': [], Older: [] };
    const now = new Date();
    for (const chat of list) {
      const d = new Date(chat.updatedAt);
      const diff = (now - d) / 86400000;
      if (diff < 1) groups.Today.push(chat);
      else if (diff < 2) groups.Yesterday.push(chat);
      else if (diff < 7) groups['Last 7 Days'].push(chat);
      else groups.Older.push(chat);
    }
    return groups;
  }

  function createSection(label, items) {
    const section = document.createElement('div');
    section.className = 'chat-list-section';

    const labelEl = document.createElement('div');
    labelEl.className = 'chat-list-label';
    labelEl.textContent = label;
    section.appendChild(labelEl);

    items.forEach(chat => {
      section.appendChild(createChatItem(chat));
    });

    return section;
  }

  function createChatItem(chat) {
    const item = document.createElement('div');
    item.className = `chat-item${chat._id === activeId ? ' active' : ''}`;
    item.dataset.chatId = chat._id;
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');
    item.setAttribute('aria-label', chat.title || 'Chat');

    const pinIcon   = chat.pinned ? '📌' : '📎';
    const favIcon   = chat.favorite ? '⭐' : '☆';
    const time      = formatRelativeTime(chat.updatedAt);

    item.innerHTML = `
      <div class="chat-item-icon" aria-hidden="true">💬</div>
      <div class="chat-item-content">
        <div class="chat-item-title">${escHtml(chat.title || 'New Conversation')}</div>
        <div class="chat-item-meta">${time} · ${chat.messageCount || 0} msgs</div>
      </div>
      <div class="chat-item-actions">
        <button class="chat-item-btn pin${chat.pinned ? ' active' : ''}" data-id="${chat._id}" title="${chat.pinned ? 'Unpin' : 'Pin'}" aria-label="${chat.pinned ? 'Unpin chat' : 'Pin chat'}">📌</button>
        <button class="chat-item-btn fav${chat.favorite ? ' active' : ''}" data-id="${chat._id}" title="${chat.favorite ? 'Unfavorite' : 'Favorite'}" aria-label="${chat.favorite ? 'Remove from favorites' : 'Add to favorites'}">${favIcon}</button>
        <button class="chat-item-btn danger" data-id="${chat._id}" title="Delete" aria-label="Delete chat">🗑</button>
      </div>
    `;

    // Click to open
    item.addEventListener('click', (e) => {
      if (e.target.closest('.chat-item-actions')) return;
      setActiveChat(chat._id);
      window.loadChat(chat._id);
      // Close sidebar on mobile
      if (window.innerWidth <= 768) closeSidebar();
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveChat(chat._id);
        window.loadChat(chat._id);
        if (window.innerWidth <= 768) closeSidebar();
      }
    });

    // Pin
    item.querySelector('.pin').addEventListener('click', async (e) => {
      e.stopPropagation();
      await API.put(`/chats/${chat._id}`, { pinned: !chat.pinned });
      loadChats();
    });

    // Favorite
    item.querySelector('.fav').addEventListener('click', async (e) => {
      e.stopPropagation();
      await API.put(`/chats/${chat._id}`, { favorite: !chat.favorite });
      loadChats();
    });

    // Delete
    item.querySelector('.danger').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this conversation?')) return;
      await API.delete(`/chats/${chat._id}`);
      if (chat._id === activeId) {
        activeId = null;
        window.loadChat(null);
      }
      loadChats();
      Toast.show(t('chatDeleted'), 'success');
    });

    return item;
  }

  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ─── Set active chat ───────────────────────────────────────────────────────
  function setActiveChat(id) {
    activeId = id;
    chatList.querySelectorAll('.chat-item').forEach(item => {
      item.classList.toggle('active', item.dataset.chatId === id);
    });
  }

  // ─── Sidebar open/close ────────────────────────────────────────────────────
  function openSidebar() {
    sidebarEl?.classList.add('open');
    overlay?.classList.remove('hidden');
    document.getElementById('btn-sidebar-toggle')?.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebarEl?.classList.remove('open');
    overlay?.classList.add('hidden');
    document.getElementById('btn-sidebar-toggle')?.setAttribute('aria-expanded', 'false');
  }

  // ─── Bind events ──────────────────────────────────────────────────────────
  function bindEvents() {
    // Sidebar toggle
    document.getElementById('btn-sidebar-toggle')?.addEventListener('click', () => {
      sidebarEl?.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    // Mobile nav sidebar button
    document.getElementById('mobile-nav-sidebar')?.addEventListener('click', openSidebar);

    // Overlay close
    overlay?.addEventListener('click', closeSidebar);

    // Sidebar user click → open settings
    document.getElementById('sidebar-user')?.addEventListener('click', () => {
      document.getElementById('settings-panel')?.classList.remove('closed');
    });

    // Filter tabs
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.sidebar-tab').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        activeFilter = tab.dataset.filter;
        loadChats(searchInput?.value || '');
      });
    });

    // Search
    searchInput?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        loadChats(searchInput.value);
      }, 300);
    });

    // Settings button
    document.getElementById('btn-settings')?.addEventListener('click', () => {
      document.getElementById('settings-panel')?.classList.remove('closed');
    });

    document.getElementById('btn-settings-topbar')?.addEventListener('click', () => {
      document.getElementById('settings-panel')?.classList.remove('closed');
    });
  }

  return { init, loadChats, setActiveChat, openSidebar, closeSidebar };
})();

window.Sidebar = Sidebar;
