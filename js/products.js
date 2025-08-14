const API_URL = 'https://dummyjson.com/products?limit=0';

const recommendedList = document.getElementById("recommended-list");
const searchInput = document.getElementById("search-input");

let allProducts = []; // Biến toàn cục lưu toàn bộ sản phẩm

// Hàm fetch toàn bộ sản phẩm và gọi render
async function fetchAllProducts() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    allProducts = data.products;
    renderProducts(allProducts);
  } catch (error) {
    console.error('Lỗi khi tải sản phẩm:', error);
    recommendedList.innerHTML = `<p class="text-red-600">Không thể tải danh sách sản phẩm.</p>`;
  }
}

// Hàm render danh sách sản phẩm
function renderProducts(products) {
  recommendedList.innerHTML = "";

  if (products.length === 0) {
    recommendedList.innerHTML = `
      <p class='col-span-full text-center text-gray-500 text-lg'>
        😕 Không tìm thấy sản phẩm phù hợp.
      </p>`;
    return;
  }

  products.forEach(product => {
    const discountedPrice = (product.price * (1 - product.discountPercentage / 100)).toFixed(2);

    const card = document.createElement("div");
    card.className = "bg-white rounded-xl shadow-lg hover:shadow-2xl transition duration-300 animate-fade-in overflow-hidden flex flex-col";

    card.innerHTML = `
      <div class="relative">
        <img src="${product.thumbnail}" alt="${product.title}" class="w-full h-48 object-cover">
        <span class="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow text-[0.75rem]">
          ⭐ ${product.rating}
        </span>
        <span class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded shadow text-[0.75rem]">
          -${product.discountPercentage}%
        </span>
      </div>
      <div class="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="text-lg font-bold text-gray-800 mb-1 truncate">${product.title}</h3>
          <p class="text-gray-500 text-sm line-clamp-2 mb-2">${product.description}</p>
        </div>
        <div class="mt-auto">
          <div class="mb-2">
            <p class="text-blue-600 font-bold text-lg">
              <i class="fas fa-dollar-sign"></i> ${discountedPrice}
              <span class="text-sm text-gray-400 line-through ml-2">
                ${product.price}
              </span>
            </p>
          </div>
          <a href="product-details.html?id=${product.id}" class="inline-block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 px-3 rounded-md transition">
            Xem chi tiết
          </a>
        </div>
      </div>
    `;

    recommendedList.appendChild(card);
  });
}


// Lọc sản phẩm khi người dùng nhập vào ô tìm kiếm
searchInput.addEventListener("input", () => {
  const keyword = searchInput.value.toLowerCase().trim();

  const filtered = allProducts.filter(product =>
    product.title.toLowerCase().includes(keyword) ||
    product.description.toLowerCase().includes(keyword) ||
    product.price.toString().includes(keyword)
  );

  renderProducts(filtered);
});

// Gọi hàm fetch ban đầu
fetchAllProducts();
