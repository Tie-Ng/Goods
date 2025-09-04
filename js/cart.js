// ===============================
// FIREBASE CONFIG & INIT
// ===============================
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,        // <-- thêm
  query,          // <-- thêm
  where,          // <-- thêm
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
  authDomain: "goods-16d80.firebaseapp.com",
  projectId: "goods-16d80",
  storageBucket: "goods-16d80.firebasestorage.app",
  messagingSenderId: "751074879040",
  appId: "1:751074879040:web:0080a2badd43fa79fa21a5",
  measurementId: "G-SHDRHGQW81"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// ===============================
// HELPERS
// ===============================
const $ = (id) => document.getElementById(id);
const fmt = (n) => `$${(Number(n) || 0).toFixed(2)}`;
const addDays = (d) => {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const box = document.getElementById("toast-content");
  const icon = document.getElementById("toast-icon");
  const title = document.getElementById("toast-title");
  const msg = document.getElementById("toast-message");
  if (!toast) return alert(message);

  const map = {
    info: { icon: "fa-info-circle", title: "Info" },
    success: { icon: "fa-check-circle", title: "Success" },
    error: { icon: "fa-exclamation-circle", title: "Error" },
    warn: { icon: "fa-exclamation-triangle", title: "Warning" },
  };
  const m = map[type] || map.info;

  // chỉ remove các type trước và thêm type mới
  box.classList.remove("info","success","error","warn");
  box.classList.add(type);

  icon.className = `fas ${m.icon} mt-1`;
  title.textContent = m.title;
  msg.textContent = message;

  toast.classList.remove("hide");
  toast.style.display = "flex";

  void box.offsetWidth; // reflow
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => { toast.style.display = "none"; }, 300);
  }, 2500);
}



// ===============================
// CART MANAGER
// ===============================
// ===============================
// CART MANAGER
// ===============================
class CartPageManager {
  constructor() {
    this.currentUser = null;
    this.items = [];
    this.selected = new Set();
    this.taxRate = 0.08;
    this.freeShipThreshold = 50;
    this.flatShip = 4.99;

    this.promoCode = null;
    this.discountPercent = 0;

    this.el = {
      loading: $("loading-state"),
      list: $("cart-list"),
      empty: $("empty-cart"),
      login: $("login-required"),
      subtotal: $("subtotal"),
      tax: $("tax"),
      total: $("cart-total"),
      selectedCount: $("selected-count"),
      totalItems: $("total-items"),
      selectAllBtn: $("select-all-btn"),
      clearBtn: $("clear-cart-btn"),
      applyPromoBtn: $("apply-promo"),
      promoInput: $("promo-input"),
      discountRow: $("discount-row"),
      discountAmount: $("discount-amount"),
      savingsDisplay: $("savings-display"),
      totalSavings: $("total-savings"),
      checkoutBtn: $("checkout-btn"),
      checkoutText: $("checkout-text"),
      checkoutLoading: $("checkout-loading"),
      deliveryDate: $("delivery-date"),
      loginBtn: $("login-btn")
    };

    this.bindEvents();

    // Lắng nghe user login/logout
    onAuthStateChanged(auth, (user) => {
      this.toggle(this.el.loading, true);
      this.toggle(this.el.list, false);
      this.toggle(this.el.empty, false);
      this.toggle(this.el.login, false);

      if (user) {
        this.currentUser = user;
        this.listenCart(user.uid); // realtime update từ Firestore
      } else {
        this.currentUser = null;
        this.items = [];
        this.selected.clear();
        this.render();
        this.toggle(this.el.login, true);
        this.toggle(this.el.loading, false);
      }
    });
  }

  bindEvents() {
    this.el.selectAllBtn?.addEventListener("click", () => {
      if (!this.items.length) return;
      if (this.selected.size === this.items.length) this.selected.clear();
      else this.items.forEach(it => this.selected.add(it.id));
      this.renderSummary();
      this.renderListCheckedState();
    });

    this.el.clearBtn?.addEventListener("click", async () => {
      if (!this.currentUser || !this.items.length) return;
      if (!confirm("Clear all items from your cart?")) return;
      const batch = writeBatch(db);
      this.items.forEach(it => batch.delete(doc(db, "carts", this.currentUser.uid, "items", it.id)));
      await batch.commit();
      showToast("Cart cleared.", "success");
    });

    this.el.applyPromoBtn?.addEventListener("click", () => this.applyPromo());
    this.el.promoInput?.addEventListener("keydown", e => { if (e.key === "Enter") this.applyPromo(); });

    this.el.checkoutBtn?.addEventListener("click", () => this.checkout());

    this.el.loginBtn?.addEventListener("click", async () => {
      try { await signInWithPopup(auth, new GoogleAuthProvider()); }
      catch (e) { showToast(e.message || "Login failed", "error"); }
    });

    this.el.list?.addEventListener("change", (e) => {
      const ck = e.target;
      if (!ck.matches("[data-check]")) return;
      const id = ck.getAttribute("data-id");
      if (!id) return;
      if (ck.checked) this.selected.add(id);
      else this.selected.delete(id);
      this.renderSummary();
    });
  }

  toggle(el, show) { if (!el) return; el.style.display = show ? "" : "none"; }

  // Lắng nghe cart realtime từ Firestore
  listenCart(uid) {
    const itemsRef = collection(db, "carts", uid, "items");
    onSnapshot(itemsRef, (snap) => {
      this.items = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          productId: data.productId ?? data.id ?? d.id,
          title: data.title ?? data.name ?? "Unnamed",
          image: data.image ?? data.thumbnail ?? "",
          price: Number(data.price) || 0,
          quantity: Number(data.quantity) || 1,
        };
      });
      this.selected = new Set(this.items.map(it => it.id));
      this.render();
    }, (err) => { console.error(err); showToast("Failed to load cart.", "error"); this.toggle(this.el.loading, false); });
  }

  async changeQuantity(itemId, delta) {
    const item = this.items.find(i => i.id === itemId);
    if (!item || !this.currentUser) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { await this.deleteItem(itemId); return; }
    try { await updateDoc(doc(db, "carts", this.currentUser.uid, "items", itemId), { quantity: newQty }); }
    catch (e) { console.error(e); showToast("Cannot update quantity.", "error"); }
  }

  // Xóa trực tiếp Firestore
  async deleteItem(itemId) {
    if (!this.currentUser) return;
    try {
      await deleteDoc(doc(db, "carts", this.currentUser.uid, "items", itemId));
      showToast("Item removed.", "success");
      // onSnapshot tự động cập nhật this.items → không cần sửa thủ công
    } catch (e) { console.error(e); showToast("Cannot remove item.", "error"); }
  }

  render() {
    this.toggle(this.el.loading, false);
    const empty = this.items.length === 0;
    this.toggle(this.el.empty, empty);
    this.toggle(this.el.list, !empty);
    if (this.el.totalItems) this.el.totalItems.textContent = String(this.items.reduce((a, b) => a + (b.quantity || 0), 0));
    this.renderList();
    this.renderSummary();
    if (this.el.deliveryDate) this.el.deliveryDate.textContent = `${addDays(3)} – ${addDays(5)}`;
  }

  renderList() {
    if (!this.el.list) return;
    this.el.list.innerHTML = "";
    this.items.forEach(item => {
      const row = document.createElement("div");
      row.className = "cart-item flex justify-between items-center border rounded-xl p-3 mb-3";
      row.innerHTML = `
        <div class="flex items-center gap-3">
          <input type="checkbox" data-check data-id="${item.id}" ${this.selected.has(item.id) ? "checked" : ""} class="w-4 h-4 accent-blue-600" />
          <img src="${item.image || ""}" class="w-14 h-14 object-cover rounded" alt="">
          <div>
            <p class="font-medium text-gray-800">${item.title}</p>
            <p class="text-sm text-gray-500">$${item.price.toFixed(2)}</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <button class="quantity-btn bg-gray-200 px-3 py-1 rounded" data-action="minus" data-id="${item.id}">−</button>
            <span class="min-w-[2ch] text-center">${item.quantity}</span>
            <button class="quantity-btn bg-gray-200 px-3 py-1 rounded" data-action="plus" data-id="${item.id}">+</button>
          </div>
          <button class="text-red-500" title="Remove" data-action="delete" data-id="${item.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      // Gán sự kiện cho nút
      row.querySelector("[data-action='minus']")?.addEventListener("click", () => this.changeQuantity(item.id, -1));
      row.querySelector("[data-action='plus']")?.addEventListener("click", () => this.changeQuantity(item.id, 1));
      row.querySelector("[data-action='delete']")?.addEventListener("click", () => this.deleteItem(item.id));

      this.el.list.appendChild(row);
    });
  }

  renderListCheckedState() { this.el.list?.querySelectorAll("[data-check]").forEach(ck => ck.checked = this.selected.has(ck.getAttribute("data-id"))); }

  renderSummary() {
    const selectedItems = this.items.filter(it => this.selected.has(it.id));
    const selectedCount = selectedItems.reduce((a, b) => a + (b.quantity || 0), 0);
    const subtotal = selectedItems.reduce((a, b) => a + b.price * b.quantity, 0);
    const discount = subtotal * (this.discountPercent / 100);
    const shipping = subtotal - discount >= this.freeShipThreshold ? 0 : (subtotal > 0 ? this.flatShip : 0);
    const taxedBase = Math.max(0, subtotal - discount) + shipping;
    const tax = taxedBase * this.taxRate;
    const total = taxedBase + tax;

    if (this.el.selectedCount) this.el.selectedCount.textContent = String(selectedCount);
    if (this.el.subtotal) this.el.subtotal.textContent = fmt(subtotal);
    if (this.el.tax) this.el.tax.textContent = fmt(tax);
    if (this.el.total) this.el.total.textContent = fmt(total);

    if (discount > 0) {
      if (this.el.discountAmount) this.el.discountAmount.textContent = `-${fmt(discount)}`;
      this.toggle(this.el.discountRow, true);
      if (this.el.savingsDisplay) { this.el.totalSavings.textContent = fmt(discount); this.el.savingsDisplay.style.display = "block"; }
    } else { this.toggle(this.el.discountRow, false); if (this.el.savingsDisplay) this.el.savingsDisplay.style.display = "none"; }

    const shipEl = $("shipping-cost"); if (shipEl) shipEl.textContent = shipping === 0 ? "Free" : fmt(shipping);
    if (this.el.checkoutBtn) this.el.checkoutBtn.disabled = selectedItems.length === 0;
  }

 // ========================
// PROMO APPLY
// ========================
// ========================
// PROMO APPLY
// ========================
async applyPromo() {
  const code = (this.el.promoInput?.value || "").trim().toUpperCase();
  
  // Nếu xóa promo
  if (!code) {
    this.promoCode = null;
    this.discountPercent = 0;
    this.renderSummary();
    showToast("Promo cleared.", "info");
    return;
  }

  try {
    // Lấy promo từ Firestore
    const q = query(collection(db, "promos"), where("code", "==", code));
    const snap = await getDocs(q);

    if (snap.empty) {
      showToast("Invalid promo code.", "error");
      return;
    }

    const docPromo = snap.docs[0];
    const p = docPromo.data();

    console.log("Promo fetched:", p); // debug

    // Kiểm tra thời gian
    const now = new Date();
    const start = p.startAt?.toDate?.() || null;
    const end = p.endAt?.toDate?.() || null;
    const inWindow = (!start || start <= now) && (!end || end >= now);

    if (!p.active) { showToast(`Promo "${code}" is not active.`, "warn"); return; }
    if (!inWindow) { showToast(`Promo "${code}" is not within valid period.`, "warn"); return; }

    // Lấy các item đang chọn
    const selectedItems = this.items.filter(it => this.selected.has(it.id));
    if (!selectedItems.length) {
      showToast("No items selected.", "warn");
      return;
    }

    const subtotal = selectedItems.reduce((a, b) => a + b.price * b.quantity, 0);

    if (subtotal < (Number(p.min) || 0)) {
      showToast(`This code requires minimum subtotal $${Number(p.min).toFixed(2)}.`, "warn");
      return;
    }

    // Áp dụng promo
    this.promoCode = code;
    this.discountPercent = Number(p.percent) || 0;
    this.renderSummary();
    showToast(`Promo "${code}" applied (-${this.discountPercent}%)`, "success");

  } catch (e) {
    console.error("applyPromo error:", e);
    showToast("Cannot verify promo now.", "error");
  }
}


  // ========================
  // CHECKOUT
  // ========================
  async checkout() {
    if (!this.currentUser) { showToast("Please sign in to checkout.", "warn"); return; }
    const selectedItems = this.items.filter(it => this.selected.has(it.id));
    if (!selectedItems.length) return;

    const subtotal = selectedItems.reduce((a, b) => a + b.price * b.quantity, 0);
    const discount = subtotal * (this.discountPercent / 100);
    const shipping = subtotal - discount >= this.freeShipThreshold ? 0 : (subtotal > 0 ? this.flatShip : 0);
    const taxedBase = Math.max(0, subtotal - discount) + shipping;
    const tax = taxedBase * this.taxRate;
    const total = taxedBase + tax;

    const checkoutData = {
      user: { uid: this.currentUser.uid, email: this.currentUser.email },
      items: selectedItems.map(i => ({ id: i.id, productId: i.productId, title: i.title, price: i.price, quantity: i.quantity, image: i.image })),
      summary: { subtotal, discount, shipping, tax, total, promoCode: this.promoCode }
    };
    sessionStorage.setItem("checkoutData", JSON.stringify(checkoutData));
    window.location.href = "./payment.html";
  }
}

// ===============================
// INIT
// ===============================
new CartPageManager();
