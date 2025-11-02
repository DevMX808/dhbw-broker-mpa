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
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>Keine Benutzer gefunden</h3>
          <p>Es wurden keine Benutzer in der Datenbank gefunden.</p>
        </div>
      `;
      return;
    }

    const tableHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Vorname</th>
            <th>Nachname</th>
            <th>E-Mail</th>
            <th>Status</th>
            <th>Guthaben</th>
          </tr>
        </thead>
        <tbody>
          ${this.users.map(user => `
            <tr>
              <td>${this.escapeHtml(user.firstName || 'N/A')}</td>
              <td>${this.escapeHtml(user.lastName || 'N/A')}</td>
              <td>${this.escapeHtml(user.email || 'N/A')}</td>
              <td>
                <span class="${this.getStatusClass(user.status)}">
                  ${this.escapeHtml(this.getStatusText(user.status))}
                </span>
              </td>
              <td class="balance-cell">
                <span class="balance ${(user.balance || 0) >= 0 ? 'positive' : 'negative'}">
                  ${this.formatBalance(user.balance)}
                </span>
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
      return 'Deaktiviert';
    }
    return 'Unbekannt';
  }

  formatBalance(balance) {
    if (balance == null) {
      return '-';
    }
    return '$' + Number(balance).toFixed(2);
  }
}

// Initialize admin page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Check authentication first
  if (!Navigation.checkAuthentication()) {
    return;
  }

  // Initialize admin page
  new AdminPage();
});