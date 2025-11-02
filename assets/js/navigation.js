// assets/js/navigation.js
(function () {
  // falls die Datei versehentlich 2x eingebunden wird: nicht nochmal alles definieren
  if (typeof window !== 'undefined' && window.Navigation) {
    return;
  }

  class Navigation {
    constructor() {
      this.mobileMenuOpen = false;
      this.initializeNavigation();
    }

    // ===== statische Helper (für auth.js, index.html usw.) =====
    static redirectTo(path) {
      // ohne führenden Slash, damit es auch aus Unterordnern klappt
      window.location.href = path;
    }

    static redirectToLogin() {
      this.redirectTo('account.html');
    }

    static redirectToMarket() {
      this.redirectTo('market.html');
    }

    static checkAuthentication() {
      const tm = window.TokenManager;
      let isAuthed = false;

      if (tm) {
        if (typeof tm.isAuthenticated === 'function') {
          isAuthed = tm.isAuthenticated();
        } else if (typeof tm.getAccessToken === 'function') {
          isAuthed = !!tm.getAccessToken();
        } else if (typeof tm.getToken === 'function') {
          isAuthed = !!tm.getToken();
        }
      }

      if (!isAuthed) {
        this.redirectToLogin();
        return false;
      }
      return true;
    }
    // ===== Ende statische Helper =====

    initializeNavigation() {
      console.log('Initializing navigation...');

      // Burger + Mobile-Menü
      this.mobileMenuToggle = document.getElementById('mobileMenuToggle');
      this.mobileMenu = document.getElementById('mobileMenu');

      if (this.mobileMenuToggle && this.mobileMenu) {
        this.mobileMenuToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleMobileMenu();
        });
      }

      // Logout-Buttons (Desktop + Mobile)
      this.logoutBtns = document.querySelectorAll('#logoutBtn, #mobileLogoutBtn');
      console.log('Found logout buttons:', this.logoutBtns.length);

      this.logoutBtns.forEach((btn) => {
        if (!btn) return;
        console.log('Adding event listener to:', btn.id);
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      });

      // User-Infos setzen (falls vorhanden)
      this.updateUserInfo();
      this.checkAdminRole();
    }

    toggleMobileMenu() {
      if (!this.mobileMenuToggle || !this.mobileMenu) return;

      this.mobileMenuOpen = !this.mobileMenuOpen;

      if (this.mobileMenuOpen) {
        this.mobileMenuToggle.classList.add('active');
        this.mobileMenu.style.display = 'flex';
      } else {
        this.mobileMenuToggle.classList.remove('active');
        this.mobileMenu.style.display = 'none';
      }
    }

    logout() {
      if (!window.confirm('Sind Sie sicher, dass Sie sich abmelden möchten?')) {
        return;
      }

      const tm = window.TokenManager;
      if (tm) {
        if (typeof tm.removeToken === 'function') {
          tm.removeToken();
        } else if (typeof tm.clearTokens === 'function') {
          tm.clearTokens();
        }
      }

      window.location.href = 'account.html';
    }

    updateUserInfo() {
      const tm = window.TokenManager;
      if (!tm || typeof tm.getUserInfo !== 'function') return;

      const user = tm.getUserInfo();
      if (!user) return;

      const pageGreeting = document.getElementById('pageGreeting');
      const userInfo = document.getElementById('userInfo');

      const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const displayName = fullName || (user.email ? user.email.split('@')[0] : 'Trader');

      if (pageGreeting) {
        pageGreeting.innerHTML = `<span>Hallo</span>, ${displayName}.`;
      }

      if (userInfo) {
        userInfo.textContent = `Willkommen, ${displayName}`;
      }
    }

    checkAdminRole() {
      const tm = window.TokenManager;
      if (!tm || typeof tm.getUserInfo !== 'function') return;

      const user = tm.getUserInfo();
      if (!user || !Array.isArray(user.roles)) return;

      if (user.roles.includes('ADMIN')) {
        const adminLink = document.getElementById('adminLink');
        const mobileAdminLink = document.getElementById('mobileAdminLink');

        if (adminLink) adminLink.style.display = 'block';
        if (mobileAdminLink) mobileAdminLink.style.display = 'block';
      }
    }
  }


  if (typeof window !== 'undefined') {
    window.Navigation = Navigation;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Navigation;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const isAuthPage = document.body.classList.contains('auth-page');
    if (!isAuthPage) {
      window.navigationInstance = new Navigation();
    }
  });
})();
