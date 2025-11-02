class Navigation {
  constructor() {
    this.mobileMenuOpen = false;
    this.initializeNavigation();
  }

  initializeNavigation() {
    console.log('Initializing navigation...'); // Debug log
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuToggle && mobileMenu) {
      mobileMenuToggle.addEventListener('click', () => {
        this.toggleMobileMenu();
      });
    }

    // Logout buttons
    const logoutBtns = document.querySelectorAll('#logoutBtn, #mobileLogoutBtn');
    console.log('Found logout buttons:', logoutBtns.length); // Debug log
    
    logoutBtns.forEach(btn => {
      if (btn) {
        console.log('Adding event listener to:', btn.id); // Debug log
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.logout();
        });
      }
    });

    // Update user info
    this.updateUserInfo();
    
    // Check admin role
    this.checkAdminRole();
  }

  toggleMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (mobileMenuToggle && mobileMenu) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
      
      if (this.mobileMenuOpen) {
        mobileMenuToggle.classList.add('active');
        mobileMenu.style.display = 'flex';
      } else {
        mobileMenuToggle.classList.remove('active');
        mobileMenu.style.display = 'none';
      }
    }
  }

  logout() {
    if (confirm('Sind Sie sicher, dass Sie sich abmelden möchten?')) {
      TokenManager.clearToken();
      window.location.href = 'account.html';
    }
  }

  updateUserInfo() {
    const user = TokenManager.getUserInfo();
    if (user) {
      // No greeting in navbar anymore - it's been removed from HTML

      // Update page greeting if present with real name
      const pageGreeting = document.getElementById('pageGreeting');
      if (pageGreeting) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const displayName = fullName || user.email?.split('@')[0] || 'Trader';
        pageGreeting.innerHTML = `<span>Hallo</span>, ${displayName}.`;
      }

      // Update user info in footer/details if present with real name
      const userInfo = document.getElementById('userInfo');
      if (userInfo) {
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        userInfo.textContent = `Willkommen, ${fullName || user.email}`;
      }
    }
  }

  checkAdminRole() {
    const user = TokenManager.getUserInfo();
    if (user && user.roles && user.roles.includes('ADMIN')) {
      // Show admin links
      const adminLink = document.getElementById('adminLink');
      const mobileAdminLink = document.getElementById('mobileAdminLink');
      
      if (adminLink) adminLink.style.display = 'block';
      if (mobileAdminLink) mobileAdminLink.style.display = 'block';
    }
  }

  // Static methods for page navigation
  static redirectTo(path) {
    window.location.href = path;
  }

  static redirectToLogin() {
    this.redirectTo('account.html');
  }

  static redirectToMarket() {
    this.redirectTo('market.html');
  }

  static checkAuthentication() {
    if (!TokenManager.isAuthenticated()) {
      this.redirectToLogin();
      return false;
    }
    return true;
  }
}

// Initialize navigation globally
let navigationInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  // Only initialize navigation if we're not on the auth page and not already initialized
  if (!document.body.classList.contains('auth-page') && !navigationInstance) {
    navigationInstance = new Navigation();
  }
  
  // Fallback: Ensure logout buttons work even if navigation fails
  const logoutBtns = document.querySelectorAll('#logoutBtn, #mobileLogoutBtn');
  logoutBtns.forEach(btn => {
    if (btn && !btn.hasAttribute('data-logout-initialized')) {
      btn.setAttribute('data-logout-initialized', 'true');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Sind Sie sicher, dass Sie sich abmelden möchten?')) {
          TokenManager.clearToken();
          window.location.href = 'account.html';
        }
      });
    }
  });
  
  // Fallback: Ensure mobile menu works even if navigation fails
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (mobileMenuToggle && mobileMenu && !mobileMenuToggle.hasAttribute('data-mobile-initialized')) {
    mobileMenuToggle.setAttribute('data-mobile-initialized', 'true');
    
    mobileMenuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = mobileMenu.style.display === 'flex';
      
      if (isOpen) {
        mobileMenuToggle.classList.remove('active');
        mobileMenu.style.display = 'none';
      } else {
        mobileMenuToggle.classList.add('active');
        mobileMenu.style.display = 'flex';
      }
    });
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Navigation;
}