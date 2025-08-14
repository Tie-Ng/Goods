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
    <div class="bg-white rounded-xl shadow-md p-4 animate-fade-in hover:scale-105 transition-transform cursor-pointer"
         onclick="window.showProductDetail(${product.id})">
      <img src="${product.thumbnail}" alt="${product.title}" class="w-full h-40 object-cover rounded">
      <h2 class="text-lg font-semibold mt-2">${product.title}</h2>
      <p class="text-sm text-gray-600 mt-1 line-clamp-2">${product.description}</p>
      <p class="text-blue-600 font-bold mt-2">${product.price}$</p>
      <p class="text-sm text-yellow-600">Đánh giá: ⭐ ${product.rating}</p>
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
    console.error("Lỗi khi tải sản phẩm:", err);
    recommendedList.innerHTML = `<p class="text-red-600">Không thể tải sản phẩm.</p>`;
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
      item.className = "flex items-center gap-3 min-w-[300px]";
      item.innerHTML = `
        <img src="${product.thumbnail}" alt="${product.title}" class="w-16 h-16 object-cover rounded">
        <div>
          <h3 class="text-sm font-bold">${product.title}</h3>
          <p class="text-sm text-red-600 font-semibold">🔥 Giảm ${product.discountPercentage}%</p>
          <p class="text-xs text-gray-500 line-through">${product.price} USD</p>
          <p class="text-sm font-semibold text-green-600">${priceAfterDiscount} USD</p>
        </div>
      `;
      discountContainer.appendChild(item);
    });
  } catch (err) {
    console.error("Lỗi tải sản phẩm giảm giá:", err);
  }
}

renderDiscountProducts();
// === CAROUSEL LOGIC ===
let scrollAmount = 0;
const productContainer = document.getElementById('discount-products');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');

nextBtn.addEventListener('click', () => {
  scrollAmount += 300; // mỗi lần scroll 300px
  productContainer.style.transform = `translateX(-${scrollAmount}px)`;
});

prevBtn.addEventListener('click', () => {
  scrollAmount = Math.max(0, scrollAmount - 300); // không cho nhỏ hơn 0
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
          <p class="text-lg font-semibold text-blue-600 mb-2">💰 Giá: ${product.price}$</p>
          <p class="text-yellow-600 mb-2">⭐ Đánh giá: ${product.rating}</p>
          <p class="text-sm text-gray-500 mb-2">📦 Brand: ${product.brand}</p>
          <p class="text-sm text-gray-500 mb-2">📂 Category: ${product.category}</p>
          <p class="text-sm text-gray-500 mb-2">🏷️ Discount: ${product.discountPercentage}%</p>
          <p class="text-sm text-gray-500 mb-4">🚚 Còn lại: ${product.stock} sản phẩm</p>
          <button onclick="window.location.href = 'product-details.html?id=${product.id}'"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
  🛒 Xem chi tiết sản phẩm
</button>

        </div>
      </div>
    `;
    popup.classList.remove("hidden");
  } catch (err) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", err);
  }
}

function closePopup() {
  popup.classList.add("hidden");
}

async function addToCart(productId) {
  const user = auth.currentUser;
  if (!user) {
    alert("Bạn cần đăng nhập để thêm vào giỏ hàng.");
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

    alert("🛒 Đã thêm vào giỏ hàng!");
  } catch (err) {
    console.error("❌ Lỗi khi thêm vào giỏ hàng:", err);
    alert("Không thể thêm vào giỏ hàng.");
  }
}

// Gắn hàm vào window để gọi từ HTML
window.showProductDetail = showProductDetail;
window.closePopup = closePopup;
window.addToCart = addToCart;

// Gọi khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  renderTopProducts();
});
