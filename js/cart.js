// cart.js
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// --- DÙNG CHUNG 1 APP (fix lỗi user = null giữa các file) ---
const firebaseConfig = {
  apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
  authDomain: "goods-16d80.firebaseapp.com",
  projectId: "goods-16d80",
  storageBucket: "goods-16d80.firebasestorage.app",
  messagingSenderId: "751074879040",
  appId: "1:751074879040:web:0080a2badd43fa79fa21a5",
  measurementId: "G-SHDRHGQW81"
};

// Lấy app hiện có nếu đã init ở file khác; nếu chưa thì mới init
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
// Quan trọng: dùng getAuth() KHÔNG truyền app để luôn gắn với [DEFAULT]
const auth = getAuth();
const db = getFirestore();

// --- DOM ---
const cartList = document.getElementById("cart-list");
const cartTotal = document.getElementById("cart-total");

// --- State ---
let currentItems = [];

// --- Helpers ---
const parsePrice = (val) => Number(String(val).replace(/[^0-9.]/g, "")) || 0;

function setLoading(msg = "Đang kiểm tra phiên đăng nhập...") {
  cartList.innerHTML = `<p class="col-span-full text-center text-gray-500">${msg}</p>`;
}

function renderCart(uid) {
  let html = "";
  currentItems.forEach(item => {
    html += `
      <div class="bg-white rounded-lg shadow p-4 animate-fade-in flex items-center gap-3">
        <input type="checkbox" class="item-checkbox" data-id="${item.id}" checked>
        <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded">
        <div class="flex-1">
          <h3 class="font-semibold">${item.name}</h3>
          <p class="text-blue-600 font-bold">$${item.price.toFixed(2)}</p>
          <div class="flex items-center gap-2 mt-2">
            <button class="decrease bg-gray-200 px-2 rounded" data-id="${item.id}">-</button>
            <input type="number" min="1" value="${item.quantity}"
                   class="quantity-input border rounded w-14 text-center" data-id="${item.id}">
            <button class="increase bg-gray-200 px-2 rounded" data-id="${item.id}">+</button>
          </div>
        </div>
        <button class="delete-item text-red-500 hover:text-red-700" data-id="${item.id}">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
  });

  cartList.innerHTML = html;

  document.querySelectorAll(".item-checkbox").forEach(cb =>
    cb.addEventListener("change", updateTotal)
  );
  document.querySelectorAll(".increase").forEach(btn =>
    btn.addEventListener("click", () => changeQuantity(uid, btn.dataset.id, 1))
  );
  document.querySelectorAll(".decrease").forEach(btn =>
    btn.addEventListener("click", () => changeQuantity(uid, btn.dataset.id, -1))
  );
  document.querySelectorAll(".quantity-input").forEach(input =>
    input.addEventListener("change", () =>
      setQuantity(uid, input.dataset.id, parseInt(input.value))
    )
  );
  document.querySelectorAll(".delete-item").forEach(btn =>
    btn.addEventListener("click", () => deleteItem(uid, btn.dataset.id))
  );

  updateTotal();
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll(".item-checkbox:checked").forEach(cb => {
    const item = currentItems.find(i => i.id === cb.dataset.id);
    if (item) total += item.price * item.quantity;
  });
  cartTotal.textContent = `$${total.toFixed(2)}`;
}

async function changeQuantity(uid, id, delta) {
  const item = currentItems.find(i => i.id === id);
  if (!item) return;
  const newQuantity = Math.max(1, item.quantity + delta);
  await updateDoc(doc(db, "carts", uid, "items", id), { quantity: newQuantity });
  item.quantity = newQuantity;
  renderCart(uid);
}

async function setQuantity(uid, id, newQuantity) {
  if (newQuantity < 1) newQuantity = 1;
  const item = currentItems.find(i => i.id === id);
  if (!item) return;
  await updateDoc(doc(db, "carts", uid, "items", id), { quantity: newQuantity });
  item.quantity = newQuantity;
  renderCart(uid);
}

async function deleteItem(uid, id) {
  await deleteDoc(doc(db, "carts", uid, "items", id));
  currentItems = currentItems.filter(i => i.id !== id);
  renderCart(uid);
}

async function loadCart(uid) {
  setLoading("Đang tải giỏ hàng...");
  const itemsRef = collection(db, "carts", uid, "items");
  const snapshot = await getDocs(itemsRef);

  if (snapshot.empty) {
    cartList.innerHTML = `<p class="col-span-full text-center text-gray-500">Giỏ hàng của bạn đang trống.</p>`;
    cartTotal.textContent = "$0.00";
    return;
  }

  currentItems = snapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      price: parsePrice(data.price),
      quantity: Number(data.quantity) || 1
    };
  });

  renderCart(uid);
}

// --- Đảm bảo persistence cục bộ (giữ phiên đăng nhập) ---
setPersistence(auth, browserLocalPersistence).catch(() => {});

// --- Lắng nghe trạng thái đăng nhập ---
setLoading(); // hiển thị trạng thái trong lúc đợi
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cartList.innerHTML = `<p class="col-span-full text-center text-gray-500">Vui lòng đăng nhập để xem giỏ hàng</p>`;
    cartTotal.textContent = "$0.00";
    return;
  }
  // Đã đăng nhập
  loadCart(user.uid).catch(err => {
    console.error("Lỗi khi tải giỏ hàng:", err);
    cartList.innerHTML = `<p class="col-span-full text-center text-red-500">Không thể tải giỏ hàng.</p>`;
  });
});
