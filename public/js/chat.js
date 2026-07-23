/**
 * Zana AI — Chat Engine
 * ====================================
 * Handles message rendering, SSE streaming, markdown,
 * code highlighting, copy, regenerate, edit, and auto-scroll.
 */

'use strict';

// ─── State ────────────────────────────────────────────────────────────────────
let currentChatId = null;
let messages = [];       // In-memory message history for AI context
let isGenerating = false;
let currentRequestId = null;
let activeStreamEl = null; // The streaming message element

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const messagesInner  = document.getElementById('messages-inner');
const chatWelcome    = document.getElementById('chat-welcome');
const chatTextarea   = document.getElementById('chat-textarea');
const btnSend        = document.getElementById('btn-send');
const btnStop        = document.getElementById('btn-stop');
const chatTopbarTitle= document.getElementById('chat-topbar-title');
const fileUpload     = document.getElementById('file-upload');
const attachedFilesEl= document.getElementById('attached-files');
const btnVoice       = document.getElementById('btn-voice');

let pendingAttachments = [];

// ─── Marked.js Configuration ─────────────────────────────────────────────────
if (typeof marked !== 'undefined') {
  marked.setOptions({
    gfm: true,
    breaks: true,
    headerIds: false,
    mangle: false,
  });
}

// ─── Render Markdown with code blocks ────────────────────────────────────────
function renderMarkdown(content) {
  if (typeof marked === 'undefined') return escapeHtml(content).replace(/\n/g, '<br>');

  // Override marked's code renderer to add copy button + syntax highlighting
  const renderer = new marked.Renderer();
  renderer.code = (code, lang) => {
    const language = lang || 'text';
    let highlighted = code;
    try {
      if (typeof hljs !== 'undefined' && hljs.getLanguage(language)) {
        highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value;
      } else if (typeof hljs !== 'undefined') {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch (_) {}

    return `
      <div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-block-lang">${escapeHtml(language)}</span>
          <button class="code-copy-btn" onclick="copyCode(this)" aria-label="Copy code">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
        </div>
        <pre><code class="hljs language-${escapeHtml(language)}">${highlighted}</code></pre>
      </div>`;
  };

  marked.use({ renderer });
  return marked.parse(content);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

window.copyCode = async (btn) => {
  const code = btn.closest('.code-block-wrapper').querySelector('code')?.textContent || '';
  try {
    await navigator.clipboard.writeText(code);
    btn.classList.add('copied');
    btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = `<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    }, 2000);
  } catch (_) {
    Toast.show('Could not copy to clipboard.', 'error');
  }
};

// ─── Create Message Element ───────────────────────────────────────────────────
function createMessageEl(role, content, msgId) {
  const isUser = role === 'user';
  const user   = ZanaApp.user;

  const initials = user?.name?.charAt(0)?.toUpperCase() || 'U';

  const div = document.createElement('div');
  div.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
  div.dataset.msgId = msgId || '';

  const avatarEl = isUser
    ? `<div class="message-avatar" aria-hidden="true" style="background:linear-gradient(135deg,#4f46e5,#7c3aed);">${initials}</div>`
    : `<div class="message-avatar" aria-hidden="true" style="background:linear-gradient(135deg,#7c3aed,#0891b2);">✦</div>`;

  const contentHtml = isUser
    ? `<div class="message-content" role="article">${escapeHtml(content).replace(/\n/g,'<br>')}</div>`
    : `<div class="message-content" role="article">${renderMarkdown(content)}</div>`;

  const actionsHtml = isUser
    ? `<div class="message-actions" aria-label="Message actions">
        <button class="message-action-btn" onclick="copyMessage(this)" aria-label="Copy message">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="message-action-btn" onclick="editMessage(this)" aria-label="Edit message">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
      </div>`
    : `<div class="message-actions" aria-label="Message actions">
        <button class="message-action-btn" onclick="copyMessage(this)" aria-label="Copy response">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="message-action-btn" onclick="regenerateFromHere(this)" aria-label="Regenerate response">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Regenerate
        </button>
        <button class="message-action-btn" onclick="speakMessage(this)" aria-label="Read aloud">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          Speak
        </button>
      </div>`;

  div.innerHTML = `
    ${avatarEl}
    <div class="message-body">
      <div class="message-bubble">${contentHtml}</div>
      ${actionsHtml}
    </div>
  `;

  return div;
}

// ─── Create Streaming Message Element ─────────────────────────────────────────
function createStreamingEl() {
  const div = document.createElement('div');
  div.className = 'message assistant-message';
  div.id = 'streaming-msg';
  div.innerHTML = `
    <div class="message-avatar" aria-hidden="true" style="background:linear-gradient(135deg,#7c3aed,#0891b2);">✦</div>
    <div class="message-body">
      <div class="message-bubble" id="streaming-bubble">
        <div class="message-content">
          <div class="typing-dots" aria-label="Zana is thinking">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
  `;
  return div;
}

// ─── Scroll to bottom ─────────────────────────────────────────────────────────
function scrollToBottom(smooth = true) {
  const container = document.getElementById('chat-messages');
  container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

// ─── Show Welcome / Hide Welcome ──────────────────────────────────────────────
function showWelcome() {
  chatWelcome.classList.remove('hidden');
}

function hideWelcome() {
  chatWelcome.classList.add('hidden');
}

// ─── Load Chat ────────────────────────────────────────────────────────────────
async function loadChat(chatId) {
  currentChatId = chatId;
  ZanaApp.currentChatId = chatId;
  messages = [];

  // Clear existing messages (keep welcome)
  const existingMsgs = messagesInner.querySelectorAll('.message');
  existingMsgs.forEach(m => m.remove());

  if (!chatId) {
    showWelcome();
    chatTopbarTitle.textContent = 'New Conversation';
    return;
  }

  hideWelcome();

  const res = await API.get(`/chats/${chatId}`);
  if (!res?.ok) {
    Toast.show('Could not load chat.', 'error');
    return;
  }

  const chat = res.data.chat;
  chatTopbarTitle.textContent = chat.title || 'Conversation';

  // Render all messages
  for (const msg of chat.messages) {
    if (msg.role === 'system') continue;
    messages.push({ role: msg.role, content: msg.content });
    const el = createMessageEl(msg.role, msg.content, msg._id);
    messagesInner.appendChild(el);
  }

  scrollToBottom(false);

  // Update sidebar
  if (window.Sidebar) Sidebar.setActiveChat(chatId);
}

window.loadChat = loadChat;

// ─── New Chat ─────────────────────────────────────────────────────────────────
async function newChat() {
  const res = await API.post('/chats', {});
  if (res?.ok) {
    currentChatId = res.data.chat._id;
    ZanaApp.currentChatId = currentChatId;
    messages = [];
    const existingMsgs = messagesInner.querySelectorAll('.message');
    existingMsgs.forEach(m => m.remove());
    showWelcome();
    chatTopbarTitle.textContent = 'New Conversation';
    if (window.Sidebar) Sidebar.loadChats();
    return res.data.chat;
  }
}

window.newChat = newChat;

// ─── Send Message ─────────────────────────────────────────────────────────────
async function sendMessage(content) {
  if (!content.trim() || isGenerating) return;

  // Ensure we have a chat
  if (!currentChatId) {
    const chat = await newChat();
    if (!chat) return;
  }

  hideWelcome();
  isGenerating = true;
  btnSend.disabled = true;
  btnStop.classList.remove('hidden');
  btnSend.classList.add('hidden');

  // Detect language
  const detectedLang = detectLanguage(content);

  // Add user message to UI
  const userEl = createMessageEl('user', content, null);
  messagesInner.appendChild(userEl);
  messages.push({ role: 'user', content });
  scrollToBottom();

  // Save user message to server
  await API.post(`/chats/${currentChatId}/messages`, { content, role: 'user' });

  // Show streaming element
  const streamEl = createStreamingEl();
  messagesInner.appendChild(streamEl);
  activeStreamEl = streamEl;
  scrollToBottom();

  let fullContent = '';
  currentRequestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  // Add request ID to body
  const requestId = currentRequestId;

  await API.stream(
    '/ai/generate',
    {
      chatId: currentChatId,
      messages: messages.slice(-20),
      language: detectedLang,
      requestId,
    },
    // onDelta
    (delta) => {
      fullContent += delta;
      const bubble = document.getElementById('streaming-bubble');
      if (bubble) {
        bubble.innerHTML = `<div class="message-content">${renderMarkdown(fullContent)}▌</div>`;
        scrollToBottom();
      }
    },
    // onDone
    async (data) => {
      fullContent = data.content || fullContent;
      finishStreaming(fullContent, data.tokens, data.model);
    },
    // onError
    (errMsg) => {
      const bubble = document.getElementById('streaming-bubble');
      if (bubble) {
        bubble.innerHTML = `<div class="message-content" style="color:var(--error);">⚠ ${errMsg || t('error')}</div>`;
      }
      stopGenerating();
    }
  );
}

function finishStreaming(content, tokens, model) {
  const streamEl = document.getElementById('streaming-msg');
  if (streamEl) {
    streamEl.id = '';
    const bubble = streamEl.querySelector('.message-bubble');
    if (bubble) {
      bubble.innerHTML = `<div class="message-content">${renderMarkdown(content)}</div>`;
    }
    // Add actions
    const body = streamEl.querySelector('.message-body');
    if (body) {
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      actions.innerHTML = `
        <button class="message-action-btn" onclick="copyMessage(this)">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="message-action-btn" onclick="regenerateFromHere(this)">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Regenerate
        </button>
        <button class="message-action-btn" onclick="speakMessage(this)">
          <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          Speak
        </button>
      `;
      body.appendChild(actions);
    }
  }

  messages.push({ role: 'assistant', content });

  // Save to server
  API.post(`/chats/${currentChatId}/ai-message`, { content, tokens, model });

  // Update sidebar (title may have changed)
  setTimeout(() => { if (window.Sidebar) Sidebar.loadChats(); }, 500);

  // Voice output if enabled
  const voiceEnabled = document.getElementById('setting-voice-output')?.checked;
  if (voiceEnabled && window.VoiceModule) {
    VoiceModule.speak(content, ZanaApp.lang);
  }

  stopGenerating();
  scrollToBottom();
}

function stopGenerating() {
  isGenerating = false;
  ZanaApp.isGenerating = false;
  currentRequestId = null;
  btnSend.disabled = false;
  btnStop.classList.add('hidden');
  btnSend.classList.remove('hidden');
}

// ─── Copy message content ─────────────────────────────────────────────────────
window.copyMessage = async (btn) => {
  const content = btn.closest('.message-body')?.querySelector('.message-content')?.textContent || '';
  try {
    await navigator.clipboard.writeText(content.trim());
    const origText = btn.innerHTML;
    btn.innerHTML = '✓ Copied!';
    btn.style.color = 'var(--success)';
    setTimeout(() => { btn.innerHTML = origText; btn.style.color = ''; }, 2000);
  } catch (_) {
    Toast.show('Could not copy text.', 'error');
  }
};

// ─── Edit user message ────────────────────────────────────────────────────────
window.editMessage = (btn) => {
  const msgEl = btn.closest('.message');
  const content = msgEl?.querySelector('.message-content')?.textContent || '';
  chatTextarea.value = content;
  chatTextarea.focus();
  adjustTextareaHeight();

  // Remove this message and all after it from UI
  const allMessages = Array.from(messagesInner.querySelectorAll('.message'));
  const idx = allMessages.indexOf(msgEl);
  if (idx > -1) {
    for (let i = idx; i < allMessages.length; i++) {
      allMessages[i].remove();
    }
    messages = messages.slice(0, idx);
  }

  if (messages.length === 0) showWelcome();
};

// ─── Regenerate ───────────────────────────────────────────────────────────────
window.regenerateFromHere = (btn) => {
  const msgEl = btn.closest('.message');
  const allMessages = Array.from(messagesInner.querySelectorAll('.message'));
  const idx = allMessages.indexOf(msgEl);

  // Remove this response and re-send last user message
  if (idx > 0) {
    const lastUserContent = messages[idx - 1]?.content;
    // Remove from idx onward in UI
    for (let i = idx; i < allMessages.length; i++) allMessages[i].remove();
    messages = messages.slice(0, idx - 1);

    if (lastUserContent) sendMessage(lastUserContent);
  }
};

// ─── Speak message ────────────────────────────────────────────────────────────
window.speakMessage = (btn) => {
  const content = btn.closest('.message-body')?.querySelector('.message-content')?.textContent || '';
  if (window.VoiceModule) VoiceModule.speak(content, ZanaApp.lang);
};

// ─── Auto-resize textarea ─────────────────────────────────────────────────────
function adjustTextareaHeight() {
  chatTextarea.style.height = 'auto';
  chatTextarea.style.height = Math.min(chatTextarea.scrollHeight, 200) + 'px';
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const prompt = chip.dataset.prompt;
    if (prompt) {
      chatTextarea.value = prompt;
      adjustTextareaHeight();
      btnSend.disabled = false;
      chatTextarea.focus();
    }
  });
});

// ─── Input Events ─────────────────────────────────────────────────────────────
chatTextarea.addEventListener('input', () => {
  adjustTextareaHeight();
  btnSend.disabled = !chatTextarea.value.trim();
  // char count
  const count = chatTextarea.value.length;
  const hint = document.getElementById('char-count');
  if (hint) {
    if (count > 14000) {
      hint.textContent = `${count}/16000 — Press Enter to send`;
      hint.style.color = count > 15500 ? 'var(--error)' : 'var(--warning)';
    } else {
      hint.textContent = 'Press Enter to send · Shift+Enter for new line';
      hint.style.color = '';
    }
  }
});

chatTextarea.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!btnSend.disabled) {
      const content = chatTextarea.value.trim();
      chatTextarea.value = '';
      adjustTextareaHeight();
      btnSend.disabled = true;
      sendMessage(content);
    }
  }
});

btnSend.addEventListener('click', () => {
  const content = chatTextarea.value.trim();
  if (!content) return;
  chatTextarea.value = '';
  adjustTextareaHeight();
  btnSend.disabled = true;
  sendMessage(content);
});

// Stop generation
btnStop.addEventListener('click', () => {
  if (currentRequestId) {
    API.post('/ai/stop', { requestId: currentRequestId });
  }
  stopGenerating();
  const streamEl = document.getElementById('streaming-msg');
  if (streamEl) {
    const bubble = streamEl.querySelector('.message-bubble');
    if (bubble) {
      const content = bubble.querySelector('.message-content')?.textContent?.replace('▌','').trim() || '';
      if (content) {
        finishStreaming(content, null, null);
      } else {
        streamEl.remove();
      }
    }
  }
});

// ─── File Upload ──────────────────────────────────────────────────────────────
fileUpload.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  const token = Auth.getToken();
  const res = await fetch('/api/ai/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (res.ok) {
    const data = await res.json();
    pendingAttachments.push(data.file);

    // Show preview
    attachedFilesEl.classList.remove('hidden');
    const tag = document.createElement('div');
    tag.className = 'attached-file';
    tag.innerHTML = `
      <span>📎 ${escapeHtml(file.name)}</span>
      <button class="attached-file-remove" aria-label="Remove file">✕</button>
    `;
    tag.querySelector('.attached-file-remove').onclick = () => {
      tag.remove();
      pendingAttachments = pendingAttachments.filter(f => f.filename !== data.file.filename);
      if (attachedFilesEl.children.length === 0) attachedFilesEl.classList.add('hidden');
    };
    attachedFilesEl.appendChild(tag);

    // If there's content (text file), pre-fill textarea
    if (data.file.content) {
      const note = `[Attached file: ${file.name}]\n\n${data.file.content.slice(0, 2000)}\n\n`;
      chatTextarea.value = note;
      adjustTextareaHeight();
      btnSend.disabled = false;
    }
  } else {
    Toast.show('File upload failed. Check size and format.', 'error');
  }

  fileUpload.value = '';
});

// ─── Top bar actions ──────────────────────────────────────────────────────────
document.getElementById('btn-export')?.addEventListener('click', () => {
  document.getElementById('export-modal').classList.remove('hidden');
});

document.getElementById('close-export-modal')?.addEventListener('click', () => {
  document.getElementById('export-modal').classList.add('hidden');
});

document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
  if (currentChatId) window.open(`/api/chats/${currentChatId}/export?format=pdf`, '_blank');
  document.getElementById('export-modal').classList.add('hidden');
});

document.getElementById('export-txt-btn')?.addEventListener('click', () => {
  if (currentChatId) window.open(`/api/chats/${currentChatId}/export?format=txt`, '_blank');
  document.getElementById('export-modal').classList.add('hidden');
});

document.getElementById('btn-delete-chat')?.addEventListener('click', () => {
  document.getElementById('delete-modal').classList.remove('hidden');
});

document.getElementById('close-delete-modal')?.addEventListener('click', () => {
  document.getElementById('delete-modal').classList.add('hidden');
});

document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
  document.getElementById('delete-modal').classList.add('hidden');
});

document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
  if (!currentChatId) return;
  await API.delete(`/chats/${currentChatId}`);
  document.getElementById('delete-modal').classList.add('hidden');
  currentChatId = null;
  ZanaApp.currentChatId = null;
  messages = [];
  messagesInner.querySelectorAll('.message').forEach(m => m.remove());
  showWelcome();
  chatTopbarTitle.textContent = 'New Conversation';
  if (window.Sidebar) Sidebar.loadChats();
  Toast.show(t('chatDeleted'), 'success');
});

// Close modals on overlay click
document.getElementById('export-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

document.getElementById('delete-modal')?.addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
});

// ─── New Chat button ──────────────────────────────────────────────────────────
document.getElementById('btn-new-chat')?.addEventListener('click', newChat);
document.getElementById('mobile-nav-new-chat')?.addEventListener('click', newChat);

// ─── Mobile nav ───────────────────────────────────────────────────────────────
document.getElementById('mobile-nav-sidebar')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.remove('hidden');
});

document.getElementById('mobile-nav-settings')?.addEventListener('click', () => {
  document.getElementById('settings-panel').classList.remove('closed');
});

// ─── Initialize ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  // Load sidebar
  if (window.Sidebar) await Sidebar.init(user);

  // Apply settings from user prefs
  if (window.Settings) Settings.init(user);

  // Check URL for ?chat=id
  const urlParams = new URLSearchParams(window.location.search);
  const chatId = urlParams.get('chat');
  if (chatId) {
    loadChat(chatId);
  }
});
