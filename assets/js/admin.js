class AdminPage {
  constructor() {
    this.isLoading = false;
    this.users = [];
    this.initializeAdminPage();
  }

  initializeAdminPage() {
    // Check if user has admin role
    if (!this.checkAdminAccess()) {
      this.showAccessDenied();
      return;
    }

    // Initialize page
    this.bindEvents();
    this.loadUsers();
  }

  checkAdminAccess() {
    if (!TokenManager.isAuthenticated()) {
      Navigation.redirectToLogin();
      return false;
    }

    const user = TokenManager.getUserInfo();
    if (!user || !user.roles || !user.roles.includes('ADMIN')) {
      return false;
    }

    return true;
  }

  showAccessDenied() {
    const adminPanel = document.getElementById('adminPanel');
    const accessDeniedState = document.getElementById('accessDeniedState');
    
    if (adminPanel) adminPanel.style.display = 'none';
    if (accessDeniedState) accessDeniedState.style.display = 'block';
  }

  bindEvents() {
    const retryBtn = document.getElementById('retryBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.loadUsers();
      });
    }
  }

  showLoading() {
    this.isLoading = true;
    const loadingState = document.getElementById('loadingState');
    const adminPanel = document.getElementById('adminPanel');
    const errorState = document.getElementById('errorState');

    if (loadingState) loadingState.style.display = 'flex';
    if (adminPanel) adminPanel.style.display = 'none';
    if (errorState) errorState.style.display = 'none';
  }

  hideLoading() {
    this.isLoading = false;
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.style.display = 'none';
  }

  showError(message) {
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const adminPanel = document.getElementById('adminPanel');

    if (errorState) errorState.style.display = 'flex';
    if (errorMessage) errorMessage.textContent = message;
    if (adminPanel) adminPanel.style.display = 'none';
    
    this.hideLoading();
  }

  showContent() {
    const adminPanel = document.getElementById('adminPanel');
    const errorState = document.getElementById('errorState');

    if (adminPanel) adminPanel.style.display = 'block';
    if (errorState) errorState.style.display = 'none';
    
    this.hideLoading();
  }

  async loadUsers() {
    if (this.isLoading) return;

    try {
      this.showLoading();

      console.log('🔍 Admin API call:', '/api/admin/users-with-balances');

      // Cache-busting headers hinzufügen (wie in der SPA)
      const response = await HttpClient.request('/api/admin/users-with-balances', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      this.users = response || [];
      
      this.renderUsersTable();
      this.showContent();

    } catch (error) {
      console.error('Failed to load users:', error);
      
      let errorMessage = 'Fehler beim Laden der Benutzerdaten';
      if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Keine Berechtigung für Admin-Funktionen';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server-Fehler beim Laden der Daten';
      }
      
      this.showError(errorMessage);
    }
  }

  renderUsersTable() {
    const usersTable = document.getElementById('usersTable');
    if (!usersTable) return;

    if (!this.users || this.users.length === 0) {
      usersTable.innerHTML = `
        <div class="no-users">
          Keine Benutzer gefunden
        </div>
      `;
      return;
    }

    const tableHTML = `
      <table class="users-table">
        <thead>
          <tr>
            <th>VORNAME</th>
            <th>NACHNAME</th>
            <th>E-MAIL</th>
            <th>ROLLE</th>
            <th>STATUS</th>
            <th>GUTHABEN</th>
            <th>AKTIONEN</th>
          </tr>
        </thead>
        <tbody>
          ${this.users.map(user => `
            <tr>
              <td>${this.escapeHtml(user.firstName || '')}</td>
              <td>${this.escapeHtml(user.lastName || '')}</td>
              <td>${this.escapeHtml(user.email || '')}</td>
              <td>${this.escapeHtml(user.role || 'USER')}</td>
              <td>
                <span class="${this.getStatusClass(user.status)}">
                  ${this.escapeHtml(this.getStatusText(user.status))}
                </span>
              </td>
              <td class="balance">${this.formatBalance(user.balance)}</td>
              <td>
                <button class="action-btn ${user.status === 'ACTIVATED' ? '' : 'activate-btn'}" 
                        onclick="window.adminPage.toggleUserStatus('${user.userId}', '${user.status}')">
                  ${user.status === 'ACTIVATED' ? 'Blockieren' : 'Aktivieren'}
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    usersTable.innerHTML = tableHTML;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getStatusClass(status) {
    if (status === 'ACTIVATED') {
      return 'status-active';
    } else if (status === 'DEACTIVATED') {
      return 'status-inactive';
    }
    return '';
  }

  getStatusText(status) {
    if (status === 'ACTIVATED') {
      return 'Aktiv';
    } else if (status === 'DEACTIVATED') {
      return 'Blockiert';
    }
    return 'Unbekannt';
  }

  formatBalance(balance) {
    if (balance == null) {
      return '0.00 USD';
    }
    return Number(balance).toFixed(2) + ' USD';
  }

  async toggleUserStatus(userId, currentStatus) {
    if (!confirm('Sind Sie sicher, dass Sie den Benutzerstatus ändern möchten?')) {
      return;
    }

    try {
      const newStatus = currentStatus === 'ACTIVATED' ? 'DEACTIVATED' : 'ACTIVATED';
      const action = newStatus === 'ACTIVATED' ? 'activate' : 'deactivate';
      
      await HttpClient.post(`/api/admin/users/${userId}/${action}`, {});
      
      // Reload users table
      await this.loadUsers();
      
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      alert('Fehler beim Ändern des Benutzerstatus: ' + error.message);
    }
  }
}

// Initialize admin page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication first
  if (!Navigation.checkAuthentication()) {
    return;
  }

  // Initialize admin page and store global reference
  window.adminPage = new AdminPage();
});