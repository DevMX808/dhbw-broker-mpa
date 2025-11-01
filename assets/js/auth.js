class AuthPage {
  constructor() {
    this.container = document.getElementById('container');
    this.signInForm = document.getElementById('signInForm');
    this.signUpForm = document.getElementById('signUpForm');
    this.signInButton = document.getElementById('signInButton');
    this.signUpButton = document.getElementById('signUpButton');
    this.showSignInBtn = document.getElementById('showSignIn');
    this.showSignUpBtn = document.getElementById('showSignUp');
    
    this.init();
  }

  init() {
    // Check if user is already authenticated
    if (TokenManager.isAuthenticated()) {
      Navigation.redirectToMarket();
      return;
    }

    this.bindEvents();
  }

  bindEvents() {
    // Panel switching
    this.showSignUpBtn.addEventListener('click', () => this.showSignUp());
    this.showSignInBtn.addEventListener('click', () => this.showSignIn());

    // Form submissions
    this.signInForm.addEventListener('submit', (e) => this.handleSignIn(e));
    this.signUpForm.addEventListener('submit', (e) => this.handleSignUp(e));

    // Real-time validation
    this.bindInputValidation();
  }

  bindInputValidation() {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          FormValidator.clearFieldError(input);
        }
      });
    });
  }

  showSignUp() {
    this.container.classList.add('right-panel-active');
    this.resetForm(this.signUpForm);
  }

  showSignIn() {
    this.container.classList.remove('right-panel-active');
    this.resetForm(this.signInForm);
  }

  resetForm(form) {
    form.reset();
    FormValidator.clearFormErrors(form);
  }

  validateField(input) {
    const value = input.value.trim();
    const name = input.name;
    
    switch (name) {
      case 'email':
        if (!value) {
          FormValidator.showFieldError(input, 'E-Mail ist erforderlich');
          return false;
        }
        if (!FormValidator.validateEmail(value)) {
          FormValidator.showFieldError(input, 'Ungültige E-Mail-Adresse');
          return false;
        }
        break;
      
      case 'password':
        if (!value) {
          FormValidator.showFieldError(input, 'Passwort ist erforderlich');
          return false;
        }
        if (value.length < 6) {
          FormValidator.showFieldError(input, 'Passwort muss mindestens 6 Zeichen lang sein');
          return false;
        }
        break;
      
      case 'firstName':
      case 'lastName':
        if (!value) {
          const fieldName = name === 'firstName' ? 'Vorname' : 'Nachname';
          FormValidator.showFieldError(input, `${fieldName} ist erforderlich`);
          return false;
        }
        if (value.length < 2) {
          const fieldName = name === 'firstName' ? 'Vorname' : 'Nachname';
          FormValidator.showFieldError(input, `${fieldName} muss mindestens 2 Zeichen lang sein`);
          return false;
        }
        break;
    }
    
    FormValidator.clearFieldError(input);
    return true;
  }

  validateForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  async handleSignIn(event) {
    event.preventDefault();
    
    if (!this.validateForm(this.signInForm)) {
      return;
    }

    const formData = new FormData(this.signInForm);
    const credentials = {
      email: formData.get('email').trim(),
      password: formData.get('password')
    };

    try {
      LoadingManager.showLoading(this.signInButton);
      FormValidator.clearFormErrors(this.signInForm);

      const response = await HttpClient.post(API_CONFIG.endpoints.login, credentials);
      
      if (response.accessToken) {
        TokenManager.setToken(response.accessToken);
        
        // Small delay for better UX
        setTimeout(() => {
          Navigation.redirectToMarket();
        }, 500);
      } else {
        throw new Error('Keine Zugangsdaten in der Antwort erhalten');
      }
      
    } catch (error) {
      console.error('Login failed:', error);
      
      let errorMessage = 'Ein Fehler ist aufgetreten';
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Ungültige Anmeldedaten';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Authentifizierungsfehler - bitte versuchen Sie es erneut';
      }
      
      FormValidator.showGlobalError(this.signInForm, errorMessage);
    } finally {
      LoadingManager.hideLoading(this.signInButton);
    }
  }

  async handleSignUp(event) {
    event.preventDefault();
    
    if (!this.validateForm(this.signUpForm)) {
      return;
    }

    const formData = new FormData(this.signUpForm);
    const userData = {
      firstName: formData.get('firstName').trim(),
      lastName: formData.get('lastName').trim(),
      email: formData.get('email').trim(),
      password: formData.get('password')
    };

    try {
      LoadingManager.showLoading(this.signUpButton);
      FormValidator.clearFormErrors(this.signUpForm);

      const response = await HttpClient.post(API_CONFIG.endpoints.register, userData);
      
      if (response.accessToken) {
        TokenManager.setToken(response.accessToken);
        
        // Small delay for better UX
        setTimeout(() => {
          Navigation.redirectToMarket();
        }, 500);
      } else {
        throw new Error('Keine Zugangsdaten in der Antwort erhalten');
      }
      
    } catch (error) {
      console.error('Registration failed:', error);
      
      let errorMessage = 'Ein Fehler ist aufgetreten';
      if (error.message.includes('409') || error.message.includes('Conflict')) {
        errorMessage = 'E-Mail-Adresse bereits registriert';
      } else if (error.message.includes('400')) {
        errorMessage = 'Ungültige Eingabedaten';
      }
      
      FormValidator.showGlobalError(this.signUpForm, errorMessage);
    } finally {
      LoadingManager.hideLoading(this.signUpButton);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AuthPage();
});