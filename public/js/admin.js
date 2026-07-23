/**
 * Zana AI — Admin Panel Logic
 */

'use strict';

let usersPage = 1;
let requestsChart, tokensChart;

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === name);
    item.setAttribute('aria-selected', String(item.dataset.tab === name));
  });
  ['dashboard','users','logs'].forEach(t => {
    const el = document.getElementById(`tab-${t}`);
    if (el) el.classList.toggle('hidden', t !== name);
  });
  const titles = { dashboard: 'Dashboard', users: 'User Management', logs: 'API Logs' };
  document.getElementById('admin-page-title').textContent = titles[name] || name;

  if (name === 'users') loadUsers();
  if (name === 'logs')  loadLogs();
}

window.switchTab = switchTab;

document.querySelectorAll('.admin-nav-item[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ─── Load dashboard stats ─────────────────────────────────────────────────────
async function loadStats() {
  const res = await API.get('/admin/stats');
  if (!res?.ok) { Toast.show('Could not load stats.', 'error'); return; }

  const { stats } = res.data;

  document.getElementById('stat-total-users').textContent = stats.users.total.toLocaleString();
  document.getElementById('stat-new-today').textContent   = `+${stats.users.newToday} today`;
  document.getElementById('stat-active-users').textContent= stats.users.active.toLocaleString();
  document.getElementById('stat-total-chats').textContent = stats.chats.total.toLocaleString();
  document.getElementById('stat-api-calls').textContent   = stats.api.callsToday.toLocaleString();
  document.getElementById('stat-errors').textContent      = `${stats.api.errorsThisMonth} errors this month`;
  if (stats.api.errorsThisMonth > 0) {
    document.getElementById('stat-errors').style.color = 'var(--error)';
  }

  // Charts
  const days   = stats.daily.map(d => d._id.slice(5));
  const reqs   = stats.daily.map(d => d.requests);
  const tokens = stats.daily.map(d => d.tokens);

  const totalReqs = reqs.reduce((a, b) => a + b, 0);
  document.getElementById('chart-total-label').textContent = `${totalReqs.toLocaleString()} total`;

  renderRequestsChart(days, reqs);
  renderTokensChart(days, tokens);
}

function renderRequestsChart(labels, data) {
  const ctx = document.getElementById('requests-chart');
  if (!ctx) return;
  if (requestsChart) requestsChart.destroy();

  requestsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Requests',
        data,
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124,58,237,0.08)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: '#7c3aed',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index' } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' }, beginAtZero: true },
      },
    },
  });
}

function renderTokensChart(labels, data) {
  const ctx = document.getElementById('tokens-chart');
  if (!ctx) return;
  if (tokensChart) tokensChart.destroy();

  tokensChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tokens',
        data,
        backgroundColor: 'rgba(8,145,178,0.6)',
        borderColor: '#0891b2',
        borderWidth: 1,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' }, beginAtZero: true },
      },
    },
  });
}

// ─── Load recent users ─────────────────────────────────────────────────────────
async function loadRecentUsers() {
  const res = await API.get('/admin/users?limit=5&page=1');
  if (!res?.ok) return;

  const tbody = document.getElementById('recent-users-tbody');
  if (!tbody) return;

  if (!res.data.users.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:32px;">No users yet</td></tr>';
    return;
  }

  tbody.innerHTML = res.data.users.map(user => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#7c3aed,#0891b2);">${user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div class="user-cell-info">
            <div class="name">${esc(user.name)}</div>
            <div class="email">${esc(user.email)}</div>
          </div>
        </div>
      </td>
      <td><span class="badge ${user.role === 'admin' ? 'badge-primary' : 'badge-success'}">${user.role}</span></td>
      <td><span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
      <td style="font-size:0.8125rem;">${new Date(user.createdAt).toLocaleDateString()}</td>
      <td style="font-size:0.8125rem;">${formatRelativeTime(user.lastActive)}</td>
    </tr>
  `).join('');
}

// ─── Load all users ────────────────────────────────────────────────────────────
async function loadUsers() {
  const search = document.getElementById('user-search')?.value || '';
  const role   = document.getElementById('user-role-filter')?.value || '';
  const q = `/admin/users?page=${usersPage}&limit=20${search ? `&search=${encodeURIComponent(search)}` : ''}${role ? `&role=${role}` : ''}`;

  const res = await API.get(q);
  if (!res?.ok) return;

  const tbody = document.getElementById('users-tbody');
  const { users, pagination } = res.data;

  document.getElementById('users-count').textContent = `${pagination.total} users total`;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:32px;">No users found</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(user => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="avatar avatar-sm" style="background:linear-gradient(135deg,#7c3aed,#0891b2);">${user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          <div class="user-cell-info">
            <div class="name">${esc(user.name)}</div>
            <div class="email">${esc(user.email)}</div>
          </div>
        </div>
      </td>
      <td>
        <select class="form-select" style="width:100px;" onchange="updateUserRole('${user._id}',this.value)" aria-label="Change role">
          <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td>${user.language?.toUpperCase() || 'EN'}</td>
      <td><span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
      <td style="font-size:0.8125rem;">${new Date(user.createdAt).toLocaleDateString()}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="toggleUserStatus('${user._id}', ${user.isActive})" aria-label="${user.isActive ? 'Deactivate user' : 'Activate user'}">
          ${user.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  `).join('');

  document.getElementById('users-prev').disabled = usersPage <= 1;
  document.getElementById('users-next').disabled = usersPage >= pagination.totalPages;
}

window.updateUserRole = async (id, role) => {
  await API.put(`/admin/users/${id}`, { role });
  Toast.show('User role updated.', 'success');
};

window.toggleUserStatus = async (id, isActive) => {
  await API.put(`/admin/users/${id}`, { isActive: !isActive });
  Toast.show(`User ${isActive ? 'deactivated' : 'activated'}.`, 'success');
  loadUsers();
};

// ─── Load logs ────────────────────────────────────────────────────────────────
async function loadLogs() {
  const status = document.getElementById('log-status-filter')?.value || '';
  const res = await API.get(`/admin/logs?limit=50${status ? `&status=${status}` : ''}`);
  if (!res?.ok) return;

  const tbody = document.getElementById('logs-tbody');
  const { logs } = res.data;

  if (!logs.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">No logs</td></tr>';
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr>
      <td>
        <div class="log-item" style="padding:0;border:none;">
          <span class="log-dot ${log.status === 'error' ? 'error' : log.status === 'success' ? 'success' : 'warning'}"></span>
          <span class="badge ${log.status === 'error' ? 'badge-danger' : 'badge-success'}">${log.status}</span>
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:0.8rem;">${esc(log.endpoint)}</td>
      <td style="font-size:0.8125rem;">${log.userId?.name || 'Anonymous'}</td>
      <td style="font-size:0.8125rem;">${log.model || '—'}</td>
      <td style="font-size:0.8125rem;">${log.totalTokens?.toLocaleString() || 0}</td>
      <td style="font-size:0.8125rem;">${log.latencyMs}ms</td>
      <td style="font-size:0.8125rem;">${formatRelativeTime(log.createdAt)}</td>
    </tr>
  `).join('');
}

function esc(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ─── Pagination ───────────────────────────────────────────────────────────────
document.getElementById('users-prev')?.addEventListener('click', () => { usersPage--; loadUsers(); });
document.getElementById('users-next')?.addEventListener('click', () => { usersPage++; loadUsers(); });

// ─── Filters ──────────────────────────────────────────────────────────────────
document.getElementById('user-search')?.addEventListener('input', () => { usersPage = 1; loadUsers(); });
document.getElementById('user-role-filter')?.addEventListener('change', () => { usersPage = 1; loadUsers(); });
document.getElementById('log-status-filter')?.addEventListener('change', loadLogs);
document.getElementById('admin-refresh')?.addEventListener('click', () => {
  loadStats(); loadRecentUsers(); Toast.show('Refreshed.', 'success');
});

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return;

  if (user.role !== 'admin') {
    Toast.show('Access denied. Admin only.', 'error');
    setTimeout(() => window.location.href = '/chat.html', 1500);
    return;
  }

  document.getElementById('admin-username').textContent = user.name;
  applyTheme(user.theme || 'dark');

  await loadStats();
  await loadRecentUsers();
});
