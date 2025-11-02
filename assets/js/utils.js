const API_CONFIG = {
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
    if (!token) {
      console.log('🔍 TokenManager.getUserInfo: No token found');
      return null;
    }
    
    const payload = this.parseJWT(token);
    if (!payload) {
      console.log('🔍 TokenManager.getUserInfo: Failed to parse JWT payload');
      return null;
    }
    
    console.log('🔍 TokenManager.getUserInfo - Raw JWT Payload:', payload);
    
    const userInfo = {
      id: payload.sub,
      email: payload.email,
      firstName: payload.given_name || payload.firstName || '',
      lastName: payload.family_name || payload.lastName || '',
      roles: payload.roles || []
    };
    
    console.log('🔍 TokenManager.getUserInfo - Processed user info:', userInfo);
    
    return userInfo;
  }
}

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

    this.clearFieldError(fieldElement);
    

    fieldElement.classList.add('error');
    

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

    const existingError = formElement.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'polite');
    errorDiv.textContent = message;
    

    formElement.insertBefore(errorDiv, formElement.firstChild);
  }
}

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


window.TokenManager = TokenManager;
window.HttpClient = HttpClient;
window.FormValidator = FormValidator;
window.LoadingManager = LoadingManager;
window.Navigation = Navigation;
window.API_CONFIG = API_CONFIG;