// API Configuration - unterstützt sowohl lokal als auch Heroku
const API_CONFIG = {
  // Versuche zuerst lokal, dann Heroku als Fallback
  baseUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:8080' 
    : 'https://rocky-atoll-88358-b10b362cee67.herokuapp.com',
  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    symbols: '/api/price/symbols',
    prices: '/api/price/quote'
  }
};

// Token Management
class TokenManager {
  static getToken() {
    return localStorage.getItem('accessToken');
  }

  static setToken(token) {
    localStorage.setItem('accessToken', token);
  }

  static removeToken() {
    localStorage.removeItem('accessToken');
  }

  static parseJWT(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  static isTokenExpired(token) {
    const payload = this.parseJWT(token);
    if (!payload || !payload.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  }

  static isAuthenticated() {
    const token = this.getToken();
    return token && !this.isTokenExpired(token);
  }

  static getUserInfo() {
    const token = this.getToken();
    if (!token) return null;
    
    const payload = this.parseJWT(token);
    if (!payload) return null;
    
    // Debug: Log the payload to see what fields are available
    console.log('JWT Payload:', payload);
    
    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.given_name || payload.firstName || '',
      lastName: payload.family_name || payload.lastName || '',
      roles: payload.roles || []
    };
  }
}

// HTTP Client
class HttpClient {
  static async request(url, options = {}) {
    const token = TokenManager.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token && TokenManager.isAuthenticated()) {
      headers.Authorization = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(`${API_CONFIG.baseUrl}${url}`, config);
      
      // Check if response is HTML (error page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        throw new Error('Server returned HTML instead of JSON - possible authentication error');
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('HTTP Request failed:', error);
      throw error;
    }
  }

  static get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  static post(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static put(url, data, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

// Form Validation Utilities
class FormValidator {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validateRequired(value) {
    return value && value.trim().length > 0;
  }

  static validateMinLength(value, minLength) {
    return value && value.length >= minLength;
  }

  static validateForm(formData, rules) {
    const errors = {};

    for (const [field, fieldRules] of Object.entries(rules)) {
      const value = formData[field];
      
      for (const rule of fieldRules) {
        if (rule.type === 'required' && !this.validateRequired(value)) {
          errors[field] = rule.message;
          break;
        }
        
        if (rule.type === 'email' && value && !this.validateEmail(value)) {
          errors[field] = rule.message;
          break;
        }
        
        if (rule.type === 'minLength' && value && !this.validateMinLength(value, rule.value)) {
          errors[field] = rule.message;
          break;
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  static showFieldError(fieldElement, errorMessage) {
    // Remove existing error
    this.clearFieldError(fieldElement);
    
    // Add error class
    fieldElement.classList.add('error');
    
    // Create and add error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = errorMessage;
    errorDiv.setAttribute('role', 'alert');
    
    fieldElement.parentNode.appendChild(errorDiv);
  }

  static clearFieldError(fieldElement) {
    fieldElement.classList.remove('error');
    const errorElement = fieldElement.parentNode.querySelector('.field-error');
    if (errorElement) {
      errorElement.remove();
    }
  }

  static clearFormErrors(formElement) {
    const errorFields = formElement.querySelectorAll('.error');
    errorFields.forEach(field => this.clearFieldError(field));
    
    const globalError = formElement.querySelector('.error-message');
    if (globalError) {
      globalError.remove();
    }
  }

  static showGlobalError(formElement, message) {
    // Remove existing global error
    const existingError = formElement.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    // Create new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'polite');
    errorDiv.textContent = message;
    
    // Insert at the beginning of the form
    formElement.insertBefore(errorDiv, formElement.firstChild);
  }
}

// Loading State Management
class LoadingManager {
  static showLoading(buttonElement) {
    if (!buttonElement) return;
    
    buttonElement.disabled = true;
    buttonElement.setAttribute('aria-disabled', 'true');
    
    const originalText = buttonElement.textContent;
    buttonElement.dataset.originalText = originalText;
    
    buttonElement.innerHTML = `
      <span class="spinner"></span>
      ${originalText}...
    `;
  }

  static hideLoading(buttonElement) {
    if (!buttonElement) return;
    
    buttonElement.disabled = false;
    buttonElement.setAttribute('aria-disabled', 'false');
    
    const originalText = buttonElement.dataset.originalText;
    if (originalText) {
      buttonElement.textContent = originalText;
    }
  }
}

// Navigation Helper
class Navigation {
  static redirectTo(path) {
    window.location.href = path;
  }

  static redirectToLogin() {
    this.redirectTo('/account.html');
  }

  static redirectToMarket() {
    this.redirectTo('/market.html');
  }

  static checkAuthentication() {
    if (!TokenManager.isAuthenticated()) {
      this.redirectToLogin();
      return false;
    }
    return true;
  }
}

// Make utilities globally available
window.TokenManager = TokenManager;
window.HttpClient = HttpClient;
window.FormValidator = FormValidator;
window.LoadingManager = LoadingManager;
window.Navigation = Navigation;
window.API_CONFIG = API_CONFIG;