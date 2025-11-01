// Market Page JavaScript
class MarketPage {
  constructor() {
    this.symbols = [];
    this.prices = {};
    this.loadingPrices = new Set();
    
    // DOM Elements
    this.userInfo = document.getElementById('userInfo');
    this.pageGreeting = document.getElementById('pageGreeting');
    this.logoutBtn = document.getElementById('logoutBtn');
    this.marketGrid = document.getElementById('marketGrid');
    this.loadingState = document.getElementById('loadingState');
    this.errorState = document.getElementById('errorState');
    this.emptyState = document.getElementById('emptyState');
    this.errorMessage = document.getElementById('errorMessage');
    this.retryBtn = document.getElementById('retryBtn');
    
    this.init();
  }

  async init() {
    // Check authentication
    if (!Navigation.checkAuthentication()) {
      return;
    }

    this.setupUserInfo();
    this.bindEvents();
    await this.loadMarketData();
  }

  setupUserInfo() {
    const userInfo = TokenManager.getUserInfo();
    if (userInfo) {
      // Update only the page-specific user info, not the navbar
      if (this.userInfo) {
        const fullName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim();
        this.userInfo.textContent = `Willkommen, ${fullName || userInfo.email}`;
      }
      
      if (this.pageGreeting) {
        const fullName = `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim();
        const displayName = fullName || userInfo.email?.split('@')[0] || 'Trader';
        this.pageGreeting.innerHTML = `<span>Hallo</span>, ${displayName}.`;
      }
    }
  }

  bindEvents() {
    this.logoutBtn.addEventListener('click', () => this.handleLogout());
    this.retryBtn.addEventListener('click', () => this.loadMarketData());
  }

  handleLogout() {
    TokenManager.removeToken();
    Navigation.redirectToLogin();
  }

  async loadMarketData() {
    try {
      this.showLoading();
      
      // Load symbols first
      const symbols = await HttpClient.get(API_CONFIG.endpoints.symbols);
      console.log('Loaded symbols:', symbols);
      
      this.symbols = symbols || [];
      
      if (this.symbols.length === 0) {
        this.showEmptyState();
        return;
      }
      
      // Render symbols immediately
      this.renderMarketGrid();
      
      // Load prices for each symbol
      await this.loadPrices();
      
    } catch (error) {
      console.error('Failed to load market data:', error);
      this.showError(error.message);
    }
  }

  async loadPrices() {
    // Load prices for all symbols
    const pricePromises = this.symbols.map(symbol => this.loadPriceForSymbol(symbol.symbol));
    await Promise.allSettled(pricePromises);
  }

  async loadPriceForSymbol(symbol) {
    if (this.loadingPrices.has(symbol)) {
      return;
    }

    try {
      this.loadingPrices.add(symbol);
      this.updateCardLoadingState(symbol, true);
      
      // Load both price and trend data like in SPA
      const [priceData, trendData] = await Promise.allSettled([
        HttpClient.get(`${API_CONFIG.endpoints.prices}/${symbol}`),
        HttpClient.get(`/api/price/trend/${symbol}`)
      ]);
      
      const price = priceData.status === 'fulfilled' ? priceData.value : null;
      const trend = trendData.status === 'fulfilled' ? trendData.value : null;
      
      // Combine price and trend data
      const combinedData = price ? {
        ...price,
        priceChange: trend?.priceChange || null
      } : null;
      
      console.log(`Loaded price for ${symbol}:`, combinedData);
      
      this.prices[symbol] = combinedData;
      this.updateCardPrice(symbol, combinedData);
      
    } catch (error) {
      console.error(`Failed to load price for ${symbol}:`, error);
      this.updateCardPrice(symbol, null);
    } finally {
      this.loadingPrices.delete(symbol);
      this.updateCardLoadingState(symbol, false);
    }
  }

  showLoading() {
    this.hideAllStates();
    this.loadingState.style.display = 'grid';
  }

  showError(message) {
    this.hideAllStates();
    this.errorMessage.textContent = message;
    this.errorState.style.display = 'flex';
  }

  showEmptyState() {
    this.hideAllStates();
    this.emptyState.style.display = 'block';
  }

  showMarketGrid() {
    this.hideAllStates();
    this.marketGrid.style.display = 'grid';
  }

  hideAllStates() {
    this.loadingState.style.display = 'none';
    this.errorState.style.display = 'none';
    this.emptyState.style.display = 'none';
    this.marketGrid.style.display = 'none';
  }

  renderMarketGrid() {
    this.marketGrid.innerHTML = '';
    
    this.symbols.forEach(symbol => {
      const cardElement = this.createMarketCard(symbol);
      this.marketGrid.appendChild(cardElement);
    });
    
    this.showMarketGrid();
  }

  createMarketCard(symbol) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'market-grid-item';
    cardDiv.dataset.symbol = symbol.symbol;
    
    cardDiv.innerHTML = `
      <div class="market-card" data-loading="false">
        <span class="indicator-dot"></span>
        
        <div class="header">
          <div class="symbol-icon icon-${symbol.symbol.toLowerCase()}">
            <span>♦</span>
          </div>
          <span class="asset-name">${symbol.name}</span>
          <span class="separator">|</span>
          <span class="ticker">${symbol.symbol}</span>
        </div>

        <div class="price-section">
          <div class="skeleton-loader" style="display: none;">
            <div class="skeleton-box skeleton-price"></div>
          </div>

          <div class="price-content" style="display: none;">
            <div class="price-value">
              <span class="price-amount">0.00</span>
              <span class="price-currency">USD</span>
            </div>
          </div>

          <div class="no-price" style="display: block;">—</div>
        </div>

        <div class="change-indicator" style="display: none;">
          <span class="change-arrow"></span>
        </div>
      </div>
    `;
    
    return cardDiv;
  }

  updateCardLoadingState(symbol, isLoading) {
    const cardElement = this.marketGrid.querySelector(`[data-symbol="${symbol}"]`);
    if (!cardElement) return;
    
    const marketCard = cardElement.querySelector('.market-card');
    const skeletonLoader = cardElement.querySelector('.skeleton-loader');
    const priceContent = cardElement.querySelector('.price-content');
    const noPrice = cardElement.querySelector('.no-price');
    
    marketCard.dataset.loading = isLoading;
    
    if (isLoading) {
      skeletonLoader.style.display = 'block';
      priceContent.style.display = 'none';
      noPrice.style.display = 'none';
    } else {
      skeletonLoader.style.display = 'none';
      // Show appropriate price state
      if (this.prices[symbol]) {
        priceContent.style.display = 'block';
        noPrice.style.display = 'none';
      } else {
        priceContent.style.display = 'none';
        noPrice.style.display = 'block';
      }
    }
  }

  updateCardPrice(symbol, priceData) {
    const cardElement = this.marketGrid.querySelector(`[data-symbol="${symbol}"]`);
    if (!cardElement) return;
    
    const priceContent = cardElement.querySelector('.price-content');
    const priceAmount = cardElement.querySelector('.price-amount');
    const changeIndicator = cardElement.querySelector('.change-indicator');
    const changeArrow = cardElement.querySelector('.change-arrow');
    const noPrice = cardElement.querySelector('.no-price');
    
    if (priceData && priceData.price !== null && priceData.price !== undefined) {
      // Format price
      const formattedPrice = this.formatPrice(priceData.price);
      priceAmount.textContent = formattedPrice;
      
      // Show price content
      priceContent.style.display = 'block';
      noPrice.style.display = 'none';
      
      // Update change indicator
      if (priceData.priceChange) {
        changeIndicator.style.display = 'block';
        changeIndicator.className = 'change-indicator';
        
        switch (priceData.priceChange) {
          case 'UP':
            changeIndicator.classList.add('change-indicator--positive');
            changeArrow.textContent = '▲';
            break;
          case 'DOWN':
            changeIndicator.classList.add('change-indicator--negative');
            changeArrow.textContent = '▼';
            break;
          case 'SAME':
          default:
            changeIndicator.classList.add('change-indicator--neutral');
            changeArrow.textContent = '—';
            break;
        }
      } else {
        changeIndicator.style.display = 'none';
      }
    } else {
      // No price data available
      priceContent.style.display = 'none';
      noPrice.style.display = 'block';
      changeIndicator.style.display = 'none';
    }
  }

  formatPrice(price) {
    if (price === null || price === undefined) {
      return '—';
    }
    
    const numPrice = parseFloat(price);
    if (isNaN(numPrice)) {
      return '—';
    }
    
    // Format with appropriate decimal places
    if (numPrice >= 1000) {
      return numPrice.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else if (numPrice >= 1) {
      return numPrice.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } else {
      return numPrice.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
      });
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new MarketPage();
});