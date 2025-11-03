class AdminPage {
    constructor() {
        this.users = [];
        this.updatingUserId = null;
        this.pendingUser = null;
        this.messageTimeout = null;

        this.loadingBlock = document.getElementById('loadingBlock');
        this.errorAlert = document.getElementById('errorAlert');
        this.errorMessageText = document.getElementById('errorMessageText');
        this.successMessage = document.getElementById('successMessage');
        this.successText = document.getElementById('successText');
        this.errorMessageBox = document.getElementById('errorMessageBox');
        this.errorText = document.getElementById('errorText');
        this.adminContent = document.getElementById('adminContent');
        this.accessDeniedState = document.getElementById('accessDeniedState');
        this.usersTableBody = document.getElementById('usersTableBody');
        this.emptyText = document.getElementById('emptyText');
        this.confirmModal = document.getElementById('confirmModal');
        this.modalUserName = document.getElementById('modalUserName');
        this.modalUserEmail = document.getElementById('modalUserEmail');
        this.retryBtn = document.getElementById('retryBtn');
        this.modalCloseBtn = document.getElementById('modalCloseBtn');
        this.modalCancelBtn = document.getElementById('modalCancelBtn');
        this.modalConfirmBtn = document.getElementById('modalConfirmBtn');

        this.init();
    }

    init() {
        if (!Navigation.checkAuthentication()) {
            return;
        }

        if (!this.checkAdminAccess()) {
            this.showAccessDenied();
            return;
        }

        this.bindEvents();
        this.loadUsers();
    }

    checkAdminAccess() {
        const user = TokenManager.getUserInfo();
        return user && user.roles && user.roles.includes('ADMIN');
    }

    showAccessDenied() {
        this.adminContent.style.display = 'none';
        this.accessDeniedState.style.display = 'block';
    }

    bindEvents() {
        this.retryBtn.addEventListener('click', () => this.loadUsers());
        this.modalCloseBtn.addEventListener('click', () => this.closeModal());
        this.modalCancelBtn.addEventListener('click', () => this.closeModal());
        this.modalConfirmBtn.addEventListener('click', () => this.confirmBlock());
        this.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) this.closeModal();
        });
    }

    async loadUsers() {
        try {
            this.showLoading();

            const response = await HttpClient.request('/api/admin/users-with-balances', {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            this.users = response || [];
            this.renderUsers();
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

    showLoading() {
        this.loadingBlock.style.display = 'flex';
        this.errorAlert.style.display = 'none';
        this.adminContent.style.display = 'none';
        this.clearMessages();
    }

    showContent() {
        this.loadingBlock.style.display = 'none';
        this.errorAlert.style.display = 'none';
        this.adminContent.style.display = 'block';
    }

    showError(message) {
        this.loadingBlock.style.display = 'none';
        this.adminContent.style.display = 'none';
        this.errorAlert.style.display = 'flex';
        this.errorMessageText.textContent = message;
    }

    renderUsers() {
        if (!this.users || this.users.length === 0) {
            this.usersTableBody.innerHTML = '';
            this.emptyText.style.display = 'block';
            return;
        }

        this.emptyText.style.display = 'none';

        this.usersTableBody.innerHTML = this.users.map(user => `
      <tr class="table-row">
        <td class="col-left">${this.escapeHtml(user.firstName || '')}</td>
        <td class="col-left">${this.escapeHtml(user.lastName || '')}</td>
        <td class="col-left">${this.escapeHtml(user.email || '')}</td>
        <td class="col-right">
          <span class="role-badge ${user.role === 'ADMIN' ? 'role-admin' : 'role-user'}">
            ${user.role === 'ADMIN' ? 'ADMIN' : 'USER'}
          </span>
        </td>
        <td class="col-right">
          <span class="status-badge ${this.getStatusClass(user.status)}">
            ${this.getStatusText(user.status)}
          </span>
        </td>
        <td class="td-num col-right">
          ${this.formatBalance(user.balance)}
        </td>
        <td class="td-actions col-right">
          <div class="row-actions">
            ${user.status === 'ACTIVATED'
            ? `<button class="btn btn-danger btn-sm" 
                   data-user-id="${user.userId}"
                   onclick="window.adminPage.showBlockDialog('${user.userId}')"
                   ${this.updatingUserId === user.userId ? 'disabled' : ''}>
                   ${this.updatingUserId === user.userId ? 'Wird blockiert…' : 'Blockieren'}
                 </button>`
            : `<button class="btn btn-primary btn-sm" 
                   data-user-id="${user.userId}"
                   onclick="window.adminPage.updateUserStatus('${user.userId}', 'ACTIVATED')"
                   ${this.updatingUserId === user.userId ? 'disabled' : ''}>
                   ${this.updatingUserId === user.userId ? 'Wird aktiviert…' : 'Aktivieren'}
                 </button>`
        }
          </div>
        </td>
      </tr>
    `).join('');
    }

    showBlockDialog(userId) {
        const user = this.users.find(u => u.userId === userId);
        if (!user) return;

        this.pendingUser = user;
        this.modalUserName.textContent = `${user.firstName} ${user.lastName}`;
        this.modalUserEmail.textContent = user.email;
        this.confirmModal.style.display = 'flex';
    }

    closeModal() {
        this.confirmModal.style.display = 'none';
        this.pendingUser = null;
    }

    confirmBlock() {
        if (!this.pendingUser) return;
        this.updateUserStatus(this.pendingUser.userId, 'DEACTIVATED');
        this.closeModal();
    }

    async updateUserStatus(userId, newStatus) {
        this.updatingUserId = userId;
        this.renderUsers();

        try {
            const action = newStatus === 'ACTIVATED' ? 'activate' : 'deactivate';
            await HttpClient.post(`/api/admin/users/${userId}/${action}`, {});

            const user = this.users.find(u => u.userId === userId);
            if (user) {
                user.status = newStatus;
                const msg = newStatus === 'DEACTIVATED'
                    ? `Benutzer ${user.firstName} ${user.lastName} wurde blockiert.`
                    : `Benutzer ${user.firstName} ${user.lastName} wurde aktiviert.`;
                this.showSuccessMessage(msg);
            }

            this.updatingUserId = null;
            this.renderUsers();

        } catch (error) {
            console.error('Failed to update user status:', error);
            this.updatingUserId = null;
            this.renderUsers();
            this.showErrorMessage('Änderung konnte nicht gespeichert werden.');
        }
    }

    showSuccessMessage(msg) {
        this.clearMessages();
        this.successText.textContent = msg;
        this.successMessage.style.display = 'flex';

        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            this.successMessage.style.display = 'none';
        }, 5000);
    }

    showErrorMessage(msg) {
        this.clearMessages();
        this.errorText.textContent = msg;
        this.errorMessageBox.style.display = 'flex';

        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            this.errorMessageBox.style.display = 'none';
        }, 5000);
    }

    clearMessages() {
        this.successMessage.style.display = 'none';
        this.errorMessageBox.style.display = 'none';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getStatusClass(status) {
        return status === 'ACTIVATED' ? 'status-badge--active' : 'status-badge--blocked';
    }

    getStatusText(status) {
        return status === 'ACTIVATED' ? 'Aktiv' : 'Blockiert';
    }

    formatBalance(balance) {
        if (balance == null) return '0.00 USD';
        return Number(balance).toFixed(2) + ' USD';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (!Navigation.checkAuthentication()) {
        return;
    }
    window.adminPage = new AdminPage();
});