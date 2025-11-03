class Navigation {
    constructor() {
        this.mobileMenuOpen = false;
        this.initializeNavigation();
    }

    initializeNavigation() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const mobileMenu = document.getElementById('mobileMenu');

        if (mobileMenuToggle && mobileMenu) {
            mobileMenuToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }

        const logoutBtns = document.querySelectorAll('#logoutBtn, #mobileLogoutBtn');
        logoutBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.logout();
            });
        });

        this.updateUserInfo();

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
            TokenManager.removeToken();
            window.location.href = 'account.html';
        }
    }

    updateUserInfo() {
        const user = TokenManager.getUserInfo();
        if (user) {
            const pageGreeting = document.getElementById('pageGreeting');
            if (pageGreeting) {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                const displayName = fullName || user.email?.split('@')[0] || 'Trader';
                pageGreeting.innerHTML = `<span>Hallo</span>, ${displayName}.`;
            }

            const userInfo = document.getElementById('userInfo');
            if (userInfo) {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                userInfo.textContent = `Willkommen, ${fullName || user.email}`;
            }
        }
    }

    checkAdminRole() {
        const user = TokenManager.getUserInfo();
        console.log('🔍 Checking admin role...');
        console.log('User info:', user);

        if (user && user.roles) {
            console.log('User roles:', user.roles);
            console.log('Has ADMIN role:', user.roles.includes('ADMIN'));

            if (user.roles.includes('ADMIN')) {
                console.log('✅ User has ADMIN role, showing admin links');

                const adminLink = document.getElementById('adminLink');
                const mobileAdminLink = document.getElementById('mobileAdminLink');

                console.log('Desktop admin link element:', adminLink);
                console.log('Mobile admin link element:', mobileAdminLink);

                if (adminLink) {
                    adminLink.style.display = 'block';
                    console.log('✅ Desktop admin link shown');
                } else {
                    console.log('❌ Desktop admin link element not found');
                }

                if (mobileAdminLink) {
                    mobileAdminLink.style.display = 'block';
                    console.log('✅ Mobile admin link shown');
                } else {
                    console.log('❌ Mobile admin link element not found');
                }
            } else {
                console.log('❌ User does not have ADMIN role');
            }
        } else {
            console.log('❌ No user info or roles found');
        }
    }

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

document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('auth-page')) {
        new Navigation();
    }
});

window.Navigation = Navigation;