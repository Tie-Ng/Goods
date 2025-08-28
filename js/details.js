import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
  authDomain: "goods-16d80.firebaseapp.com",
  projectId: "goods-16d80",
  storageBucket: "goods-16d80.firebasestorage.app",
  messagingSenderId: "751074879040",
  appId: "1:751074879040:web:0080a2badd43fa79fa21a5",
  measurementId: "G-SHDRHGQW81"
};

// --- Khởi tạo Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Biến toàn cục ---
const API_BASE = "https://dummyjson.com";
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const detailContainer = document.getElementById("product-detail");
const relatedContainer = document.getElementById("related-products");

let currentProduct = null;
let currentImageIndex = 0;

// --- Utility functions ---
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
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

function createImageGallery(images, title) {
  return `
    <!-- Image Gallery with Enhanced Features -->
    <div class="relative">
      <!-- Main Image Container with Zoom Effect -->
      <div class="relative overflow-hidden rounded-2xl shadow-2xl bg-gradient-to-br from-gray-50 to-gray-100 p-6 group">
        <div class="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <img id="main-image" 
             src="${images[0]}" 
             alt="${title}" 
             class="w-full h-96 md:h-[500px] object-contain rounded-xl transition-all duration-500 group-hover:scale-105 cursor-zoom-in" />
        
        <!-- Image Navigation Arrows -->
        <button id="prev-image" class="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>
        <button id="next-image" class="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </button>
        
        <!-- Image Counter -->
        <div class="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
          <span id="current-image-num">1</span> / ${images.length}
        </div>
      </div>

      <!-- Thumbnail Grid with Improved Design -->
      <div class="grid grid-cols-5 gap-3 mt-6" id="thumbnail-container">
        ${images.slice(0, 6).map((img, i) => `
          <div class="relative group cursor-pointer">
            <img src="${img}" 
                 data-index="${i}"
                 class="thumbnail w-full h-20 object-cover rounded-lg border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                 ${i === 0 ? "border-blue-500 shadow-md" : "border-gray-200 hover:border-gray-400"}" />
            ${i === 5 && images.length > 6 ? `
              <div class="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                +${images.length - 5}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function createProductBadges(product) {
  const badges = [];

  if (product.discountPercentage > 20) {
    badges.push(`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500 text-white animate-pulse">🔥 Hot Deal</span>`);
  }

  if (product.rating >= 4.5) {
    badges.push(`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">⭐ Bestseller</span>`);
  }

  if (product.stock <= 10) {
    badges.push(`<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">⚡ Limited Stock</span>`);
  }

  return badges.join('');
}

// --- Hiển thị chi tiết sản phẩm với nhiều cải tiến ---
async function renderProductDetail() {
  if (!productId) {
    return showError("Không có ID sản phẩm trong URL");
  }

  try {
    detailContainer.innerHTML = `
      <div class="flex items-center justify-center min-h-96">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p class="text-gray-600 text-lg">Đang tải thông tin sản phẩm...</p>
        </div>
      </div>
    `;

    const res = await fetch(`${API_BASE}/products/${productId}`);
    if (!res.ok) throw new Error("Không tìm thấy sản phẩm");

    const product = await res.json();
    currentProduct = product;
    document.title = "Chi tiết - " + product.title;

    const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);
    const savings = (product.price - discountedPrice).toFixed(2);

    detailContainer.innerHTML = `
      <!-- Breadcrumb -->
      <nav class="mb-8">
        <ol class="flex items-center space-x-2 text-sm text-gray-500">
          <li><a href="/" class="hover:text-blue-600 transition-colors">🏠 Home</a></li>
          <li><span class="mx-2">/</span></li>
          <li><a href="/products.html" class="hover:text-blue-600 transition-colors">Products</a></li>
          <li><span class="mx-2">/</span></li>
          <li class="text-gray-900 font-medium">${product.category}</li>
        </ol>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <!-- Enhanced Image Gallery -->
        <div>
          ${createImageGallery(product.images, product.title)}
        </div>

        <!-- Enhanced Product Information -->
        <div class="space-y-6">
          <!-- Product Badges -->
          <div class="flex flex-wrap gap-2 mb-4">
            ${createProductBadges(product)}
          </div>

          <!-- Title and Brand -->
          <div>
            <p class="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">${product.brand}</p>
            <h1 class="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-4">${product.title}</h1>
          </div>

          <!-- Rating and Reviews -->
          <div class="flex items-center space-x-4 py-3">
            <div class="flex items-center">
              <span class="text-lg mr-2">${generateStarRating(product.rating)}</span>
              <span class="text-gray-600 font-medium">${product.rating.toFixed(1)}</span>
            </div>
            <div class="h-4 border-l border-gray-300"></div>
            <p class="text-gray-600">Rating from customers</p>
          </div>

          <!-- Price Section with Enhanced Design -->
          <div class="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
            <div class="flex items-baseline space-x-3 mb-2">
              <span class="text-4xl font-bold text-blue-600">${formatPrice(discountedPrice)}</span>
              <span class="text-xl text-gray-500 line-through">${formatPrice(product.price)}</span>
            </div>
            <div class="flex items-center space-x-3">
              <span class="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                -${product.discountPercentage.toFixed(0)}%
              </span>
              <span class="text-green-600 font-medium">Save ${formatPrice(savings)}</span>
            </div>
          </div>

          <!-- Product Description -->
          <div class="prose prose-gray max-w-none">
            <p class="text-gray-700 leading-relaxed text-justify">${product.description}</p>
          </div>

          <!-- Quick Product Info -->
          <div class="grid grid-cols-2 gap-4 py-4">
            <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <span class="text-2xl">📦</span>
              <div>
                <p class="text-sm text-gray-600">Status</p>
                <p class="font-semibold ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}">
                  ${product.stock > 0 ? `${product.stock} products` : 'Out of stock'}
                </p>
              </div>
            </div>
            <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <span class="text-2xl">🏷️</span>
              <div>
                <p class="text-sm text-gray-600">Danh mục</p>
                <p class="font-semibold text-gray-900 capitalize">${product.category}</p>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="space-y-4">
            <button id="add-to-cart" 
              class="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 ${product.stock === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
              ${product.stock === 0 ? 'disabled' : ''}>
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-1.5-1.5M7 13v6a2 2 0 002 2h8a2 2 0 002-2v-6"></path>
              </svg>
              <span>${product.stock === 0 ? 'Out of stock' : 'Add to cart'}</span>
            </button>
            
            <div class="flex space-x-3">
              <button class="flex-1 border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                </svg>
                <span>Like</span>
              </button>
              
              <button class="flex-1 border border-gray-300 text-gray-700 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                </svg>
                <span>Share</span>
              </button>
            </div>
          </div>

          <!-- Trust Indicators -->
          <div class="bg-green-50 border border-green-200 rounded-xl p-4">
            <div class="flex items-center space-x-2 mb-3">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <h3 class="text-green-800 font-semibold">Commitment to quality</h3>
            </div>
            <ul class="space-y-1 text-sm text-green-700">
              <li>✅ 100% authentic product</li>
              <li>✅ Full warranty as prescribed</li>
              <li>✅ 30 day return</li>
              <li>✅ Free shipping nationwide</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Detailed Product Information Tabs -->
      <div class="mt-16 bg-white rounded-2xl shadow-lg overflow-hidden">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex" id="tab-nav">
            <button class="tab-btn active border-b-2 border-blue-500 text-blue-600 py-4 px-6 text-sm font-medium" data-tab="specifications">
              📋 Specifications
            </button>
            <button class="tab-btn text-gray-500 hover:text-gray-700 py-4 px-6 text-sm font-medium" data-tab="shipping">
              🚚 Shipping & Payment
            </button>
            <button class="tab-btn text-gray-500 hover:text-gray-700 py-4 px-6 text-sm font-medium" data-tab="reviews">
              ⭐ Reviews & Comments
            </button>
          </nav>
        </div>

        <div class="p-8">
          <!-- Specifications Tab -->
          <div id="specifications" class="tab-content">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 class="text-lg font-semibold mb-4 text-gray-900">Basic information</h3>
                <div class="space-y-3">
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Product Id:</span>
                    <span class="font-medium">#${product.id.toString().padStart(6, '0')}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Brand:</span>
                    <span class="font-medium">${product.brand}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Category:</span>
                    <span class="font-medium capitalize">${product.category}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Status:</span>
                    <span class="font-medium ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}">
                      ${product.stock > 0 ? 'In stock' : 'Out of stock'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-4 text-gray-900">Giá cả & Khuyến mãi</h3>
                <div class="space-y-3">
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Original price:</span>
                    <span class="font-medium">${formatPrice(product.price)}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Promotional price:</span>
                    <span class="font-medium text-blue-600">${formatPrice(discountedPrice)}</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Discount:</span>
                    <span class="font-medium text-red-600">${product.discountPercentage.toFixed(0)}%</span>
                  </div>
                  <div class="flex justify-between py-2 border-b border-gray-100">
                    <span class="text-gray-600">Save:</span>
                    <span class="font-medium text-green-600">${formatPrice(savings)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Shipping Tab -->
          <div id="shipping" class="tab-content hidden">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 class="text-lg font-semibold mb-4 text-gray-900 flex items-center">
                  <span class="mr-2">🚚</span> Shipping
                </h3>
                <div class="space-y-4">
                  <div class="border rounded-lg p-4">
                    <div class="flex items-center mb-2">
                      <span class="text-green-600 mr-2">✅</span>
                      <span class="font-medium">Free shipping</span>
                    </div>
                    <p class="text-gray-600 text-sm ml-6">For orders of $50 or more</p>
                  </div>
                  <div class="border rounded-lg p-4">
                    <div class="flex items-center mb-2">
                      <span class="text-blue-600 mr-2">⚡</span>
                      <span class="font-medium">Fast delivery</span>
                    </div>
                    <p class="text-gray-600 text-sm ml-6">1-3 working days within city</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 class="text-lg font-semibold mb-4 text-gray-900 flex items-center">
                  <span class="mr-2">💳</span> Payment
                </h3>
                <div class="space-y-4">
                  <div class="border rounded-lg p-4">
                    <p class="font-medium mb-2">Payment method:</p>
                    <ul class="space-y-1 text-sm text-gray-600 ml-4">
                      <li>• Credit/Debit Card</li>
                      <li>• E-wallet (PayPal, Apple Pay)</li>
                      <li>• Bank transfer</li>
                      <li>• Cash on Delivery (COD)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Reviews Tab -->
          <div id="reviews" class="tab-content hidden">
            <div class="text-center py-8">
              <div class="mb-6">
                <div class="text-5xl font-bold text-blue-600 mb-2">${product.rating.toFixed(1)}</div>
                <div class="text-2xl mb-2">${generateStarRating(product.rating)}</div>
                <p class="text-gray-600">Based on customer reviews</p>
              </div>
              
              <!-- Sample Review -->
              <div class="max-w-2xl mx-auto bg-gray-50 rounded-xl p-6 text-left">
                <div class="flex items-center mb-4">
                  <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold mr-3">
                    KH
                  </div>
                  <div>
                    <p class="font-medium">The customer has purchased</p>
                    <div class="flex items-center text-sm text-gray-500">
                      <span class="mr-2">${generateStarRating(5)}</span>
                      <span>Purchased 2 weeks ago</span>
                    </div>
                  </div>
                </div>
                <p class="text-gray-700 italic">"Good quality product, exactly as described. Fast delivery and well packaged. Very happy with this purchase!"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Setup image gallery functionality
    setupImageGallery(product.images);

    // Setup tabs functionality
    setupTabs();

    // Nút thêm giỏ hàng
    const addToCartBtn = document.getElementById("add-to-cart");
    if (addToCartBtn && product.stock > 0) {
      addToCartBtn.addEventListener("click", addToCart);
    }

    // Render sản phẩm liên quan
    renderRelatedProducts(product.category, product.id);

  } catch (err) {
    showError(err.message);
  }
}

// --- Setup Image Gallery ---
function setupImageGallery(images) {
  const mainImage = document.getElementById("main-image");
  const thumbnails = document.querySelectorAll(".thumbnail");
  const prevBtn = document.getElementById("prev-image");
  const nextBtn = document.getElementById("next-image");
  const currentImageNum = document.getElementById("current-image-num");

  function updateMainImage(index) {
    currentImageIndex = index;
    mainImage.src = images[index];
    currentImageNum.textContent = index + 1;

    // Update thumbnail active state
    thumbnails.forEach((thumb, i) => {
      thumb.classList.remove("border-blue-500");
      thumb.classList.add("border-gray-200");
      if (i === index) {
        thumb.classList.remove("border-gray-200");
        thumb.classList.add("border-blue-500");
      }
    });
  }

  // Thumbnail clicks
  thumbnails.forEach((thumb, index) => {
    thumb.addEventListener("click", () => updateMainImage(index));
  });

  // Navigation arrows
  prevBtn?.addEventListener("click", () => {
    const newIndex = currentImageIndex > 0 ? currentImageIndex - 1 : images.length - 1;
    updateMainImage(newIndex);
  });

  nextBtn?.addEventListener("click", () => {
    const newIndex = currentImageIndex < images.length - 1 ? currentImageIndex + 1 : 0;
    updateMainImage(newIndex);
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") prevBtn?.click();
    if (e.key === "ArrowRight") nextBtn?.click();
  });
}

// --- Setup Tabs ---
function setupTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      // Remove active state from all tabs
      tabBtns.forEach(b => {
        b.classList.remove("active", "border-blue-500", "text-blue-600");
        b.classList.add("text-gray-500");
      });

      // Add active state to clicked tab
      btn.classList.add("active", "border-b-2", "border-blue-500", "text-blue-600");
      btn.classList.remove("text-gray-500");

      // Hide all tab contents
      tabContents.forEach(content => content.classList.add("hidden"));

      // Show target tab content
      const targetContent = document.getElementById(targetTab);
      if (targetContent) {
        targetContent.classList.remove("hidden");
      }
    });
  });
}

// --- Thêm vào giỏ hàng với animation ---
function addToCart() {
  const button = document.getElementById("add-to-cart");
  const originalText = button.innerHTML;

  // Animation loading
  button.innerHTML = `
    <svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
    </svg>
    <span>Đang thêm...</span>
  `;
  button.disabled = true;

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      button.innerHTML = originalText;
      button.disabled = false;
      return showToast("⚠️ You need to login to add to cart.", "warning");
    }

    try {
      const discountedPrice = (currentProduct.price * (1 - currentProduct.discountPercentage / 100)).toFixed(2);
      const cartItemRef = doc(db, "carts", user.uid, "items", String(currentProduct.id));
      const cartItemSnap = await getDoc(cartItemRef);

      if (!cartItemSnap.exists()) {
        await setDoc(cartItemRef, {
          id: currentProduct.id,
          name: currentProduct.title,
          image: currentProduct.thumbnail,
          price: parseFloat(discountedPrice),
          quantity: 1,
        });

        // Success animation
        button.innerHTML = `
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Added!</span>
        `;
        button.classList.add("bg-green-600", "hover:bg-green-700");
        button.classList.remove("bg-gradient-to-r", "from-blue-600", "to-blue-700", "hover:from-blue-700", "hover:to-blue-800");

        setTimeout(() => {
          button.innerHTML = originalText;
          button.classList.remove("bg-green-600", "hover:bg-green-700");
          button.classList.add("bg-gradient-to-r", "from-blue-600", "to-blue-700", "hover:from-blue-700", "hover:to-blue-800");
          button.disabled = false;
        }, 2000);

        showToast("✅ Added to cart!", "success");
      } else {
        button.innerHTML = originalText;
        button.disabled = false;
        showToast("ℹ️ Please go to cart to change quantity", "info");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      button.innerHTML = originalText;
      button.disabled = false;
      showToast("❌ An error occurred while adding to cart.", "error");
    }
  });
}

// --- Sản phẩm liên quan với thiết kế đẹp hơn ---
async function renderRelatedProducts(category, excludeId) {
  try {
    relatedContainer.innerHTML = `
      <div class="mt-20">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">🛍️ Related products</h2>
          <p class="text-gray-600 max-w-2xl mx-auto">Explore more similar products you may be interested in</p>
        </div>
        <div class="flex items-center justify-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    `;

    const res = await fetch(`${API_BASE}/products/category/${category}`);
    const data = await res.json();
    const related = data.products.filter(p => p.id != excludeId).slice(0, 4);

    relatedContainer.innerHTML = `
      <div class="mt-20">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 mb-4">🛍️ Related products</h2>
          <p class="text-gray-600 max-w-2xl mx-auto">Explore more similar products you may be interested in</p>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          ${related.map(p => {
      const finalPrice = (p.price * (1 - p.discountPercentage / 100)).toFixed(2);
      const savings = (p.price - finalPrice).toFixed(2);
      return `
              <div class="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
                <div class="relative overflow-hidden">
                  <img src="${p.thumbnail}" alt="${p.title}" 
                       class="w-full h-56 object-cover group-hover:scale-110 transition-transform duration-300">
                  
                  <!-- Discount Badge -->
                  ${p.discountPercentage > 0 ? `
                    <div class="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
                      -${p.discountPercentage.toFixed(0)}%
                    </div>
                  ` : ''}
                  
                  <!-- Quick Actions -->
                  <div class="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button class="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-full shadow-lg mb-2 block transition-colors">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div class="p-6">
                  <div class="mb-3">
                    <h3 class="font-bold text-gray-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">${p.title}</h3>
                    <div class="flex items-center mb-2">
                      <span class="text-sm mr-2">${generateStarRating(p.rating)}</span>
                      <span class="text-gray-500 text-sm">(${p.rating.toFixed(1)})</span>
                    </div>
                  </div>
                  
                  <div class="mb-4">
                    <div class="flex items-baseline space-x-2 mb-1">
                      <span class="text-2xl font-bold text-blue-600">${formatPrice(finalPrice)}</span>
                      ${p.discountPercentage > 0 ? `<span class="text-sm text-gray-400 line-through">${formatPrice(p.price)}</span>` : ''}
                    </div>
                    ${p.discountPercentage > 0 ? `<p class="text-green-600 text-sm font-medium">Save ${formatPrice(savings)}</p>` : ''}
                  </div>
                  
                  <a href="product-details.html?id=${p.id}" 
                     class="block w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-4 rounded-xl text-center transition-all duration-300 transform hover:scale-105">
                    See details
                  </a>
                </div>
              </div>
            `;
    }).join('')}
        </div>
        
        <div class="text-center mt-12">
          <a href="products.html" 
             class="inline-flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-8 rounded-xl transition-colors">
            <span>View all products</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
            </svg>
          </a>
        </div>
      </div>
    `;
  } catch {
    relatedContainer.innerHTML = `
      <div class="mt-20 text-center">
        <div class="bg-red-50 border border-red-200 rounded-xl p-8 max-w-md mx-auto">
          <div class="text-red-500 text-5xl mb-4">⚠️</div>
          <h3 class="text-red-800 font-semibold mb-2">Unable to load related products</h3>
          <p class="text-red-600 text-sm mb-4">An error occurred while loading data. Please try again later.</p>
          <button onclick="renderRelatedProducts('${category}', ${excludeId})" 
                  class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
            Retry
          </button>
        </div>
      </div>
    `;
  }
}

// --- Enhanced Toast UI với nhiều kiểu ---
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer") || createToastContainer();

  const toastConfig = {
    success: {
      bg: "bg-green-500",
      icon: "✅",
      border: "border-green-400"
    },
    error: {
      bg: "bg-red-500",
      icon: "❌",
      border: "border-red-400"
    },
    warning: {
      bg: "bg-yellow-500",
      icon: "⚠️",
      border: "border-yellow-400"
    },
    info: {
      bg: "bg-blue-500",
      icon: "ℹ️",
      border: "border-blue-400"
    }
  };

  const config = toastConfig[type] || toastConfig.success;

  const toast = document.createElement("div");
  toast.className = `transform transition-all duration-300 ${config.bg} text-white px-6 py-4 rounded-xl shadow-lg border-l-4 ${config.border} flex items-center space-x-3 mb-3 translate-x-full opacity-0`;

  toast.innerHTML = `
    <span class="text-xl">${config.icon}</span>
    <span class="font-medium flex-1">${message}</span>
    <button class="text-white/80 hover:text-white transition-colors">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  `;

  // Close button functionality
  toast.querySelector('button').addEventListener('click', () => {
    toast.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-full', 'opacity-0');
  });

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }
  }, 5000);
}

// --- Create toast container if it doesn't exist ---
function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "fixed top-4 right-4 z-50 max-w-sm";
  document.body.appendChild(container);
  return container;
}

// --- Enhanced Error Display ---
function showError(msg) {
  detailContainer.innerHTML = `
    <div class="min-h-96 flex items-center justify-center">
      <div class="text-center max-w-md mx-auto">
        <div class="bg-red-100 border border-red-300 rounded-2xl p-8 mb-6">
          <div class="text-red-500 text-6xl mb-4">😞</div>
          <h2 class="text-2xl font-bold text-red-800 mb-3">Oops! An error occurred</h2>
          <p class="text-red-600 mb-6">${msg}</p>
          <div class="space-y-3">
            <button onclick="renderProductDetail()" 
                    class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
              🔄 Retry
            </button>
            <a href="products.html" 
               class="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-xl transition-colors">
              ← Back to product list
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Add CSS for smooth animations ---
const style = document.createElement('style');
style.textContent = `
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  .tab-btn.active {
    border-bottom-width: 2px !important;
  }
  
  @keyframes slideInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-slide-up {
    animation: slideInUp 0.6s ease-out;
  }
  
  /* Hover effects for product cards */
  .group:hover .group-hover\\:scale-110 {
    transform: scale(1.1);
  }
  
  /* Smooth transitions */
  * {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;
document.head.appendChild(style);

// --- Initialize page ---
document.addEventListener('DOMContentLoaded', () => {
  renderProductDetail();

  // Add fade-in animation to the main container
  if (detailContainer) {
    detailContainer.classList.add('animate-slide-up');
  }
});

// --- Chạy khi load ---
renderProductDetail();