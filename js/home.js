import { auth } from './auth.js';
import {
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const API_BASE = "https://dummyjson.com";
const recommendedList = document.getElementById("recommended-list");
const popup = document.getElementById("product-detail-popup");
const popupContent = document.getElementById("popup-content");

function createProductCard(product) {
  return `
    <div class="product-card bg-white rounded-xl shadow-md p-4 animate-fade-in cursor-pointer relative group"
         onclick="window.showProductDetail(${product.id})">
      <div class="product-image-container relative overflow-hidden rounded-lg mb-3">
        <img src="${product.thumbnail}" alt="${product.title}" 
             class="product-image w-full h-48 object-contain bg-white rounded-t-xl p-2">
        
        <!-- Hover Overlay -->
        <div class="hover-overlay">
          <button class="quick-view-btn" onclick="event.stopPropagation(); window.showProductDetail(${product.id})">
            <i class="fas fa-eye mr-2"></i>Quick View
          </button>
        </div>
        
        <!-- Rating Badge -->
        <div class="absolute top-2 right-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
          ⭐ ${product.rating}
        </div>
      </div>

      <div class="product-content">
        <h2 class="product-title text-lg font-semibold mt-2 transition-all duration-300">${product.title}</h2>
        <p class="text-sm text-gray-600 mt-1 line-clamp-2">${product.description}</p>
        <div class="flex items-center justify-between mt-3">
          <p class="product-price text-blue-600 font-bold text-xl transition-all duration-300">${product.price}</p>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function renderTopProducts() {
  try {
    const res = await fetch(`${API_BASE}/products?limit=100`);
    const data = await res.json();
    const products = data.products;

    const topRated = products.sort((a, b) => b.rating - a.rating).slice(0, 8);
    recommendedList.innerHTML = topRated.map(createProductCard).join('');
  } catch (err) {
    console.error("Error loading products:", err);
    recommendedList.innerHTML = `<p class="text-red-600">Unable to load products.</p>`;
  }
}
const discountContainer = document.getElementById("discount-products");

async function renderDiscountProducts() {
  try {
    const res = await fetch("https://dummyjson.com/products?limit=100");
    const data = await res.json();
    const discounted = data.products.filter(p => p.discountPercentage > 10);

    discounted.forEach(product => {
      const priceAfterDiscount = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);

      const item = document.createElement("div");
      item.className = "discount-item flex items-center gap-3 min-w-[300px]";
      item.onclick = () => window.showProductDetail(product.id);
      item.innerHTML = `
        <img src="${product.thumbnail}" alt="${product.title}" class="w-16 h-16 object-cover rounded transition-all duration-300">
        <div>
          <h3 class="discount-title text-sm font-bold transition-all duration-300">${product.title}</h3>
          <p class="text-sm text-red-600 font-semibold">🔥 ${product.discountPercentage}% OFF</p>
          <p class="text-xs text-gray-500 line-through">${product.price}</p>
          <p class="text-sm font-semibold text-green-600">${priceAfterDiscount}</p>
        </div>
      `;
      discountContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Error loading discount products:", err);
  }
}

renderDiscountProducts();
// === CAROUSEL LOGIC ===
let scrollAmount = 0;
const productContainer = document.getElementById('discount-products');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');

nextBtn.addEventListener('click', () => {
  scrollAmount += 300; // scroll 300px each time
  productContainer.style.transform = `translateX(-${scrollAmount}px)`;
});

prevBtn.addEventListener('click', () => {
  scrollAmount = Math.max(0, scrollAmount - 300); // don't allow less than 0
  productContainer.style.transform = `translateX(-${scrollAmount}px)`;
});


async function showProductDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/products/${id}`);
    const product = await res.json();

    popupContent.innerHTML = `
      <div class="grid md:grid-cols-2 gap-6">
        <img src="${product.thumbnail}" alt="${product.title}" class="w-full h-64 object-cover rounded">
        <div>
          <h2 class="text-3xl font-bold mb-2">${product.title}</h2>
          <p class="text-gray-700 mb-2">${product.description}</p>
          <p class="text-lg font-semibold text-blue-600 mb-2">💰 Price: $${product.price}</p>
          <p class="text-yellow-600 mb-2">⭐ Rating: ${product.rating}</p>
          <p class="text-sm text-gray-500 mb-2">📦 Brand: ${product.brand}</p>
          <p class="text-sm text-gray-500 mb-2">📂 Category: ${product.category}</p>
          <p class="text-sm text-gray-500 mb-2">🏷️ Discount: ${product.discountPercentage}%</p>
          <p class="text-sm text-gray-500 mb-4">🚚 In Stock: ${product.stock} items</p>
          <button onclick="window.location.href = 'product-details.html?id=${product.id}'"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
  🛒 View Product Details
</button>

        </div>
      </div>
    `;
    popup.classList.remove("hidden");
  } catch (err) {
    console.error("Error getting product details:", err);
  }
}

function closePopup() {
  popup.classList.add("hidden");
}

async function addToCart(productId) {
  const user = auth.currentUser;
  if (!user) {
    alert("You need to login to add items to cart.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/products/${productId}`);
    const product = await res.json();

    const productRef = doc(db, "carts", user.uid, "products", product.id.toString());
    await setDoc(productRef, {
      id: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      price: product.price,
      quantity: 1,
      timestamp: new Date()
    });

    alert("🛒 Added to cart!");
  } catch (err) {
    console.error("❌ Error adding to cart:", err);
    alert("Unable to add to cart.");
  }
}

// Attach functions to window to call from HTML
window.showProductDetail = showProductDetail;
window.closePopup = closePopup;
window.addToCart = addToCart;

// Call when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  renderTopProducts();
});