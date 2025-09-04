const API_URL = 'https://dummyjson.com/products?limit=194';

const recommendedList = document.getElementById("recommended-list");
const searchInput = document.getElementById("search-input");
const categoryFilter = document.getElementById("category-filter");
const brandFilter = document.getElementById("brand-filter");
const priceFilter = document.getElementById("price-filter");
const ratingFilter = document.getElementById("rating-filter");
const sortFilter = document.getElementById("sort-filter");
const productsCount = document.getElementById("products-count");
const loadingIndicator = document.getElementById("loading-indicator");
const backToTopBtn = document.getElementById("back-to-top");

let allProducts = [];
let filteredProducts = [];
let displayedProducts = 12; // Show 12 products initially

// Utility Functions
function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(price);
}

function generateStarRating(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return '⭐'.repeat(fullStars) +
    (hasHalfStar ? '🌟' : '') +
    '☆'.repeat(emptyStars);
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');

  const toastConfig = {
    success: { bg: 'bg-green-500', icon: '✅' },
    error: { bg: 'bg-red-500', icon: '❌' },
    warning: { bg: 'bg-yellow-500', icon: '⚠️' },
    info: { bg: 'bg-blue-500', icon: 'ℹ️' }
  };

  const config = toastConfig[type] || toastConfig.success;

  const toast = document.createElement('div');
  toast.className = `transform transition-all duration-300 ${config.bg} text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 opacity-0 translate-x-full`;

  toast.innerHTML = `
        <span class="text-xl">${config.icon}</span>
        <span class="font-medium flex-1">${message}</span>
        <button class="text-white/80 hover:text-white transition-colors">
          <i class="fas fa-times"></i>
        </button>
      `;

  toast.querySelector('button').addEventListener('click', () => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });

  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// Fetch all products
async function fetchAllProducts() {
  try {
    showLoadingIndicator(true);
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products;
    filteredProducts = allProducts;

    populateFilters(allProducts);
    renderProducts(allProducts.slice(0, displayedProducts));
    updateProductsCount(allProducts.length);
    showToast(`Successfully loaded ${allProducts.length} products!`, 'success');
  } catch (error) {
    console.error('Error loading products:', error);
    showErrorState();
    showToast('Unable to load product list', 'error');
  } finally {
    showLoadingIndicator(false);
  }
}

// Show loading indicator
function showLoadingIndicator(show) {
  loadingIndicator.classList.toggle('hidden', !show);
}

// Update products count
function updateProductsCount(count) {
  const displayCount = Math.min(count, displayedProducts);
  productsCount.innerHTML = `
        <i class="fas fa-box-open mr-2 text-blue-500"></i>
        Showing <span class="font-bold text-blue-600">${displayCount}</span> 
        of <span class="font-bold text-green-600">${count}</span> products
      `;

  // Show/hide load more button
  const loadMoreContainer = document.getElementById('load-more-container');
  if (count > displayedProducts) {
    loadMoreContainer.classList.remove('hidden');
  } else {
    loadMoreContainer.classList.add('hidden');
  }
}

// Render products with enhanced design
function renderProducts(products) {
  if (products.length === 0) {
    recommendedList.innerHTML = `
      <div class="col-span-full text-center py-16">
        <div class="text-8xl mb-4">😕</div>
        <h3 class="text-2xl font-bold text-gray-600 mb-2">No products found</h3>
        <p class="text-gray-500 mb-6">Try changing your filters or search keywords</p>
        <button onclick="clearAllFilters()" class="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
          <i class="fas fa-redo mr-2"></i>Reset filters
        </button>
      </div>
    `;
    return;
  }

  const productsToShow = products.slice(0, displayedProducts);
  recommendedList.className = "grid grid-cols-4 gap-6 items-stretch"; // ✅ grid ngoài
  recommendedList.innerHTML = "";

  productsToShow.forEach((product, index) => {
    const discountedPrice = (product.price * (1 - product.discountPercentage / 100));
    const savings = (product.price - discountedPrice);

    const card = document.createElement("div");
    card.className = "bg-white rounded-2xl shadow-md overflow-hidden group flex flex-col h-full transition-all hover:shadow-xl";

    const getBadges = () => {
      const badges = [];
      if (product.discountPercentage > 20) {
        badges.push('<span class="absolute top-3 left-3 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">🔥 HOT</span>');
      }
      if (product.rating >= 4.5) {
        badges.push('<span class="absolute top-3 right-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white text-xs font-bold px-2 py-1 rounded-full">⭐ TOP</span>');
      }
      return badges.join('');
    };

    card.innerHTML = `
      <div class="relative overflow-hidden">
        <img src="${product.thumbnail}" alt="${product.title}" 
             class="w-full h-56 object-contain bg-gray-50 group-hover:scale-110 transition-transform duration-500 p-4">
        ${getBadges()}
        ${product.discountPercentage > 0 ? `
          <div class="absolute bottom-3 left-3 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
            -${product.discountPercentage.toFixed(0)}%
          </div>
        ` : ''}
      </div>

      <div class="p-6 flex flex-col flex-1">
        <p class="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">${product.brand || 'No Brand'}</p>
        <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors duration-300">${product.title}</h3>

        <div class="flex items-center mb-3">
          <span class="text-sm">${generateStarRating(product.rating)}</span>
          <span class="text-gray-600 font-medium ml-1">${product.rating.toFixed(1)}</span>
        </div>

        <p class="text-gray-600 text-sm line-clamp-2 mb-4">${product.description}</p>

        <div class="mb-4">
          <div class="flex items-baseline space-x-2 mb-1">
            <span class="text-2xl font-bold text-blue-600">${formatPrice(discountedPrice)}</span>
            ${product.discountPercentage > 0 ? `<span class="text-sm text-gray-400 line-through">${formatPrice(product.price)}</span>` : ''}
          </div>
          ${product.discountPercentage > 0 ? `
            <p class="text-green-600 text-sm font-medium">
              <i class="fas fa-piggy-bank mr-1"></i>Save ${formatPrice(savings)}
            </p>
          ` : ''}
        </div>

        <div class="flex items-center mb-4 text-sm">
          <div class="flex items-center ${product.stock > 20 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}">
            <i class="fas fa-box mr-1"></i>
            <span class="font-medium">
              ${product.stock > 20 ? `${product.stock} in stock` :
        product.stock > 0 ? `Only ${product.stock} left` : 'Out of stock'}
            </span>
          </div>
        </div>

        <div class="mt-auto">
          <a href="product-details.html?id=${product.id}" 
             class="block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl text-center transition-all duration-300 transform hover:scale-105 hover:shadow-lg">
            <i class="fas fa-eye mr-2"></i>View details
          </a>
        </div>
      </div>
    `;

    recommendedList.appendChild(card);
  });
}

// Populate filter options
function populateFilters(products) {
  // Categories
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
  categoryFilter.innerHTML =
    '<option value="">🏷️ All categories</option>' +
    categories
      .map(
        c =>
          `<option value="${c}">📁 ${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
      )
      .join("");

  // Brands
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
  brandFilter.innerHTML =
    '<option value="">🏷️ All brands</option>' +
    brands
      .map(
        b =>
          `<option value="${b}">🏢 ${b.charAt(0).toUpperCase() + b.slice(1)}</option>`
      )
      .join("");

  // Price filter (dynamic max)
  const maxPrice = Math.max(...products.map(p => p.price));
  priceFilter.max = maxPrice;
  priceFilter.value = maxPrice;
  document.getElementById("price-value").textContent = maxPrice;

  // Rating filter
  ratingFilter.innerHTML = `
        <option value="">⭐ All ratings</option>
        <option value="4.5">⭐ 4.5+</option>
        <option value="4">⭐ 4+</option>
        <option value="3">⭐ 3+</option>
        <option value="2">⭐ 2+</option>
      `;

  // Sort filter
  sortFilter.innerHTML = `
        <option value="">🔀 Default</option>
        <option value="price-asc">⬆️ Price: Low → High</option>
        <option value="price-desc">⬇️ Price: High → Low</option>
        <option value="rating-desc">⭐ Highest rated</option>
        <option value="discount-desc">🔥 Highest discount</option>
        <option value="name-asc">📝 Name A-Z</option>
      `;
}

// Apply all filters
function applyFilters(isInstantSearch = false) {
  if (!isInstantSearch) {
    showLoadingIndicator(true);
  }
  displayedProducts = 12; // Reset displayed products

  const keyword = searchInput.value.toLowerCase().trim();
  const category = categoryFilter.value;
  const brand = brandFilter.value;
  const maxPrice = parseFloat(priceFilter.value);
  const minRating = parseFloat(ratingFilter.value);
  const sort = sortFilter.value;

  // Update price display
  document.getElementById('price-value').textContent = Math.round(maxPrice);

  let filtered = allProducts.filter(product => {
    const matchesKeyword = !keyword ||
      (product.title && product.title.toLowerCase().includes(keyword)) ||
      (product.description && product.description.toLowerCase().includes(keyword)) ||
      (product.brand && product.brand.toLowerCase().includes(keyword)) ||
      (product.category && product.category.toLowerCase().includes(keyword));

    const matchesCategory = !category || product.category === category;
    const matchesBrand = !brand || product.brand === brand;
    const matchesPrice = product.price <= maxPrice;
    const matchesRating = !minRating || product.rating >= minRating;

    return matchesKeyword && matchesCategory && matchesBrand && matchesPrice && matchesRating;
  });

  // Apply sorting
  switch (sort) {
    case 'price-asc':
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-desc':
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'rating-desc':
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'discount-desc':
      filtered.sort((a, b) => (b.discountPercentage || 0) - (a.discountPercentage || 0));
      break;
    case 'name-asc':
      filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      break;
    default:
      // Default: keep original order
      break;
  }

  filteredProducts = filtered;
  renderProducts(filtered);
  updateProductsCount(filtered.length);

  if (!isInstantSearch) {
    showLoadingIndicator(false);
  }

  // Smooth scroll to products only for non-search actions
  if (!isInstantSearch && (category || brand || sort)) {
    document.getElementById('recommended-list').scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

// Quick filter functions
function setupQuickFilters() {
  document.querySelectorAll('.quick-filter').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget;

      if (button.dataset.discount) {
        // Filter by discount
        const minDiscount = parseFloat(button.dataset.discount);
        filteredProducts = allProducts.filter(p => p.discountPercentage >= minDiscount);
        renderProducts(filteredProducts);
        updateProductsCount(filteredProducts.length);
        showToast(`Filtered products with discount over ${minDiscount}%`, 'info');
      }

      if (button.dataset.rating) {
        // Filter by rating
        const minRating = parseFloat(button.dataset.rating);
        ratingFilter.value = minRating;
        applyFilters();
        showToast(`Filtered products with ${minRating}+ star rating`, 'info');
      }

      if (button.dataset.price) {
        // Filter by price
        const maxPrice = parseFloat(button.dataset.price);
        priceFilter.value = maxPrice;
        applyFilters();
        showToast(`Filtered products under ${maxPrice}`, 'info');
      }
    });
  });
}

// Clear all filters
function clearAllFilters() {
  searchInput.value = '';
  categoryFilter.value = '';
  brandFilter.value = '';
  ratingFilter.value = '';
  sortFilter.value = '';
  priceFilter.value = priceFilter.max;
  document.getElementById('price-value').textContent = priceFilter.max;

  filteredProducts = allProducts;
  displayedProducts = 12;
  renderProducts(allProducts);
  updateProductsCount(allProducts.length);
  showToast('All filters cleared', 'success');
}

// Load more products
function loadMoreProducts() {
  displayedProducts += 12;
  renderProducts(filteredProducts);
  updateProductsCount(filteredProducts.length);

  if (displayedProducts >= filteredProducts.length) {
    document.getElementById('load-more-container').classList.add('hidden');
    showToast('All products displayed', 'info');
  }
}

// Show error state
function showErrorState() {
  recommendedList.innerHTML = `
        <div class="col-span-full text-center py-16">
          <div class="text-8xl mb-4">😞</div>
          <h3 class="text-2xl font-bold text-red-600 mb-2">Data loading error</h3>
          <p class="text-gray-600 mb-6">Unable to connect to server. Please try again later.</p>
          <button onclick="fetchAllProducts()" class="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300">
            <i class="fas fa-redo mr-2"></i>Try again
          </button>
        </div>
      `;
}

// Back to top functionality
function setupBackToTop() {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTopBtn.classList.remove('opacity-0', 'invisible');
    } else {
      backToTopBtn.classList.add('opacity-0', 'invisible');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Setup event listeners
function setupEventListeners() {
  // Search input - instant search without debounce
  searchInput.addEventListener('input', () => {
    applyFilters(true); // Instant search
  });

  // Other filters with light debounce
  let debounceTimer;
  const debouncedApplyFilters = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyFilters(false), 150); // Reduced from 300ms to 150ms
  };

  [categoryFilter, brandFilter, ratingFilter, sortFilter].forEach(el => {
    el.addEventListener('change', () => applyFilters(false)); // Immediate for dropdowns
  });

  // Price filter with minimal debounce for smooth slider
  priceFilter.addEventListener('input', () => {
    document.getElementById('price-value').textContent = Math.round(priceFilter.value);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => applyFilters(false), 100); // Very short debounce for price
  });

  // Load more button
  document.getElementById('load-more-btn').addEventListener('click', loadMoreProducts);

  // Quick filters
  setupQuickFilters();

  // Back to top
  setupBackToTop();
}

// Initialize page
async function initializePage() {
  setupEventListeners();
  await fetchAllProducts();
}

// Start the application
document.addEventListener('DOMContentLoaded', initializePage);

// Make clearAllFilters available globally
window.clearAllFilters = clearAllFilters;