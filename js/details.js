import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
  authDomain: "goods-16d80.firebaseapp.com",
  projectId: "goods-16d80",
  storageBucket: "goods-16d80.firebasestorage.app",
  messagingSenderId: "751074879040",
  appId: "1:751074879040:web:0080a2badd43fa79fa21a5",
  measurementId: "G-SHDRHGQW81"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Biến toàn cục
const API_BASE = "https://dummyjson.com";
const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
const detailContainer = document.getElementById("product-detail");
const relatedContainer = document.getElementById("related-products");

let currentProduct = null; // Để lưu sản phẩm hiện tại sau khi fetch

// --- Hiển thị chi tiết sản phẩm
async function renderProductDetail() {
  try {
    if (!productId) throw new Error("Không có ID sản phẩm trong URL");

    const res = await fetch(`${API_BASE}/products/${productId}`);
    if (!res.ok) throw new Error("Không tìm thấy sản phẩm");

    const product = await res.json();
    currentProduct = product; // lưu vào biến toàn cục
    document.title = "Chi tiết - " + product.title;

    const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);

    // Giao diện chi tiết
    detailContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
        <!-- Ảnh -->
        <div>
          <div class="overflow-hidden rounded-xl shadow">
            <img src="${product.thumbnail}" alt="${product.title}" class="w-full h-96 object-cover">
          </div>
          <div class="grid grid-cols-4 gap-2 mt-4">
            ${product.images.slice(0, 4).map(img => `
              <img src="${img}" class="w-full h-20 object-cover rounded hover:scale-105 transition cursor-pointer">
            `).join('')}
          </div>
        </div>

        <!-- Thông tin -->
        <div>
          <h1 class="text-3xl font-bold mb-3">${product.title}</h1>
          <p class="text-gray-600 mb-4 text-justify">${product.description}</p>

          <div class="mb-4">
            <p class="text-2xl font-bold text-blue-600">
              $${discountedPrice}
              <span class="text-gray-400 text-sm line-through ml-2">$${product.price}</span>
              <span class="text-sm bg-red-500 text-white px-2 py-0.5 rounded ml-2">-${product.discountPercentage}%</span>
            </p>
          </div>

          <div class="flex items-center space-x-4 mb-2">
            <span class="text-sm text-gray-600">⭐ ${product.rating}/5</span>
            <span class="text-sm text-gray-600">📦 Còn lại: ${product.stock}</span>
          </div>

          <p class="text-sm text-gray-600 mb-1">🏷️ Thương hiệu: <strong>${product.brand}</strong></p>
          <p class="text-sm text-gray-600 mb-4">📁 Danh mục: ${product.category}</p>

          <div class="flex flex-wrap gap-4 mt-6">
            <button id="add-to-cart" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition">🛒 Thêm vào giỏ</button>
            <button class="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition">⚡ Mua ngay</button>
          </div>
        </div>
      </div>

      <!-- Thông tin chi tiết -->
      <div class="mt-10">
        <h2 class="text-xl font-semibold mb-3">📄 Thông tin chi tiết</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <p><strong>Loại sản phẩm:</strong> ${product.category}</p>
          <p><strong>Thương hiệu:</strong> ${product.brand}</p>
          <p><strong>Tình trạng:</strong> ${product.stock > 0 ? "Còn hàng" : "Hết hàng"}</p>
          <p><strong>Giảm giá:</strong> ${product.discountPercentage}%</p>
          <p><strong>Mã sản phẩm:</strong> #${product.id}</p>
          <p><strong>Giá chưa giảm:</strong> $${product.price}</p>
        </div>
      </div>
    `;

    // Gắn sự kiện nút thêm vào giỏ hàng
    document.getElementById("add-to-cart").addEventListener("click", addToCart);

    // Hiển thị sản phẩm liên quan
    renderRelatedProducts(product.category, product.id);

  } catch (err) {
    detailContainer.innerHTML = `
      <p class="text-red-600 text-center mt-10">⚠️ ${err.message}</p>
      <p class="text-center text-sm mt-2"><a href="products.html" class="text-blue-500 hover:underline">Quay lại danh sách sản phẩm</a></p>
    `;
    console.error(err);
  }
}

// --- Thêm vào giỏ hàng (Firebase Firestore)
function addToCart() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showToast("⚠️ Bạn cần đăng nhập để thêm vào giỏ hàng.", "warning");
      return;
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
        showToast("✅ Đã thêm vào giỏ hàng!", "success");
      } else {
        showToast("ℹ️ Vui lòng vào giỏ hàng để thay đổi số lượng", "warning");
      }
    } catch (error) {
      console.error("Lỗi thêm giỏ hàng:", error);
      showToast("❌ Đã xảy ra lỗi khi thêm vào giỏ.", "error");
    }
  });
}



// --- Sản phẩm liên quan
async function renderRelatedProducts(category, excludeId) {
  try {
    const res = await fetch(`${API_BASE}/products/category/${category}`);
    const data = await res.json();
    const related = data.products.filter(p => p.id != excludeId).slice(0, 4);

    relatedContainer.innerHTML = `
      <h2 class="text-2xl font-semibold mb-4 mt-12">🛍️ Sản phẩm liên quan</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        ${related.map(p => {
          const finalPrice = (p.price * (1 - p.discountPercentage / 100)).toFixed(2);
          return `
            <div class="bg-white rounded-lg shadow hover:shadow-lg transition">
              <img src="${p.thumbnail}" alt="${p.title}" class="w-full h-40 object-cover rounded-t-lg">
              <div class="p-3">
                <h3 class="font-semibold text-sm mb-1 truncate">${p.title}</h3>
                <p class="text-blue-600 text-sm font-bold">
                  $${finalPrice}
                  <span class="text-xs text-gray-400 line-through ml-1">$${p.price}</span>
                </p>
                <a href="product-details.html?id=${p.id}" class="inline-block mt-2 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded">
                  Xem
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  } catch (err) {
    relatedContainer.innerHTML = `
      <p class="text-red-600 mt-4">⚠️ Không thể tải sản phẩm liên quan.</p>
    `;
    console.error(err);
  }
}

function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");

  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 5000);
}


// Gọi khi load trang
renderProductDetail();
