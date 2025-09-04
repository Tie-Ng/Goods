// notifications.js
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getFirestore, collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, where, getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// -------------------- Firebase Init --------------------
const firebaseConfig = {
    apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
    authDomain: "goods-16d80.firebaseapp.com",
    projectId: "goods-16d80",
    storageBucket: "goods-16d80.appspot.com",
    messagingSenderId: "751074879040",
    appId: "1:751074879040:web:0080a2badd43fa79fa21a5"
};
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// -------------------- Helpers --------------------
const $ = id => document.getElementById(id);

export function showToast(msg, type = "info") {
    const toast = $("toast"), box = $("toast-content"), icon = $("toast-icon"), title = $("toast-title"), message = $("toast-message");
    if (!toast) return alert(msg);
    const map = {
        info: { cls: "border-blue-500", icon: "fa-info-circle", title: "Info", color: "text-blue-500" },
        success: { cls: "border-green-500", icon: "fa-check-circle", title: "Success", color: "text-green-500" },
        warn: { cls: "border-yellow-500", icon: "fa-exclamation-triangle", title: "Warning", color: "text-yellow-500" },
        error: { cls: "border-red-500", icon: "fa-exclamation-circle", title: "Error", color: "text-red-500" }
    };
    const m = map[type] || map.info;
    box.className = `flex items-center p-6 max-w-md glass ${m.cls} rounded-xl shadow-2xl border-l-4`;
    icon.className = `fas ${m.icon} ${m.color} mr-4 text-xl`;
    title.textContent = m.title;
    message.textContent = msg;
    toast.classList.remove("hidden");
    toast.classList.add("toast-enter");
    setTimeout(() => {
        toast.style.transform = "translateX(100%)";
        toast.style.opacity = "0";
        setTimeout(() => {
            toast.classList.add("hidden");
            toast.style.transform = "translateX(0)";
            toast.style.opacity = "1";
            toast.classList.remove("toast-enter");
        }, 300);
    }, 4000);
}

// -------------------- Render Orders --------------------
let allOrders = [];
let ordersLoaded = false;

function renderOrders(filteredOrders) {
    const container = $("orders-container");
    container.innerHTML = "";

    if (ordersLoaded) {
        $("empty-state").classList.toggle("hidden", filteredOrders.length > 0);
    } else {
        $("empty-state").classList.add("hidden");
    }

    filteredOrders.forEach((o, idx) => {
        const data = o.data;
        const div = document.createElement("div");
        div.className = "order-card show slide-up";
        const img = data.items?.[0]?.image || "https://via.placeholder.com/80x80?text=No+Image";
        const timestamp = data.createdAt?.seconds
            ? new Date(data.createdAt.seconds * 1000).toLocaleString()
            : new Date().toLocaleString();

        const itemsList = data.items?.map(i => `${i.title} (x${i.quantity || 1})`).join(", ") || "—";
        const address = data.shippingInfo?.address || "—";

        div.innerHTML = `
        <div class="flex gap-4 items-center">
            <img src="${img}" class="w-20 h-20 object-cover rounded"/>
            <div class="flex-1">
                <p class="font-semibold">${itemsList}</p>
                <p class="text-gray-500 text-sm mt-1">Total: $${Number(data.summary?.total || 0).toFixed(2)}</p>
                <p class="text-gray-400 text-xs mt-1">Address: ${address}</p>
                <p class="text-gray-400 text-xs mt-1">${timestamp}</p>
            </div>
        </div>
    `;

        // --- Timeline ---
        const flex1 = div.querySelector(".flex-1");
        const timeline = document.createElement("div");
        timeline.className = "flex flex-col gap-1 mt-3";
        const dotRow = document.createElement("div");
        dotRow.className = "flex justify-between";
        timeline.appendChild(dotRow);

        const statusStages = [
            { key: "pending", label: "Order", afterDays: 0 },
            { key: "shipped", label: "Shipping", afterDays: 1 },
            { key: "delivered", label: "Delivered", afterDays: 3 },
        ];

        statusStages.forEach(stage => {
            const dotWrapper = document.createElement("div");
            dotWrapper.className = "flex flex-col items-center timeline-stage";
            const dot = document.createElement("div");
            dot.className = "timeline-dot bg-gray-300 mb-1";
            const label = document.createElement("span");
            label.className = "text-xs text-gray-300";
            label.textContent = stage.label;
            dotWrapper.appendChild(dot);
            dotWrapper.appendChild(label);
            dotRow.appendChild(dotWrapper);
        });

        const statusText = document.createElement("p");
        statusText.className = "text-xs text-gray-500 mt-1 font-semibold";
        timeline.appendChild(statusText);

        flex1.appendChild(timeline);
        container.appendChild(div);
        setTimeout(() => div.classList.add("opacity-100"), idx * 50);

        async function updateStatus() {
            const statusFromDB = data.status || "pending";
            const dotElems = Array.from(dotRow.children).map(c => ({
                dot: c.children[0],
                label: c.children[1]
            }));

            if (statusFromDB === "canceled") {
                dotElems.forEach(d => {
                    d.dot.className = "timeline-dot active bg-red-500 mb-1";
                    d.label.className = "text-xs text-red-500 font-bold";
                });
                statusText.textContent = "Status: Canceled";
                statusText.className = "text-xs font-semibold text-red-500 mt-1";
                return;
            }

            statusText.textContent = `Status: ${statusFromDB.charAt(0).toUpperCase() + statusFromDB.slice(1)}`;
            statusText.className = "text-xs text-gray-500 mt-1 font-semibold";

            if (statusFromDB === "delivered") {
                dotElems.forEach(d => {
                    d.dot.className = "timeline-dot active bg-green-500 mb-1";
                    d.label.className = "text-xs text-green-500 font-bold";
                });

                // --- Thêm nút viết review ---
                if (data.items) {
                    for (let item of data.items) {
                        const reviewBtn = document.createElement("button");
                        reviewBtn.textContent = "Write Review";
                        reviewBtn.className = "mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600";
                        flex1.appendChild(reviewBtn);

                        // kiểm tra nếu user đã review sản phẩm này
                        const reviewsRef = collection(db, "reviews");
                        const q = query(
                            reviewsRef,
                            where("productId", "==", item.id || item.productId),
                            where("uid", "==", data.uid)
                        );
                        const snap = await getDocs(q);

                        if (!snap.empty) {
                            reviewBtn.textContent = "✅ Already Reviewed";
                            reviewBtn.disabled = true;
                            reviewBtn.className = "mt-2 px-3 py-1 bg-gray-400 text-white text-xs rounded cursor-not-allowed";
                        } else {
                            reviewBtn.addEventListener("click", () => {
                                openReviewForm(item, data.uid, reviewBtn);
                            });
                        }
                    }
                }
                return;
            }

            statusStages.forEach((stage, idx) => {
                const dot = dotElems[idx].dot;
                const label = dotElems[idx].label;

                if (stage.key === statusFromDB) {
                    dot.className = "timeline-dot active bg-yellow-500 mb-1";
                    label.className = "text-xs text-yellow-500 font-bold";
                } else if (statusStages.indexOf(stage) < statusStages.findIndex(s => s.key === statusFromDB)) {
                    dot.className = "timeline-dot active bg-green-500 mb-1";
                    label.className = "text-xs text-green-500 font-bold";
                } else {
                    dot.className = "timeline-dot bg-gray-300 mb-1";
                    label.className = "text-xs text-gray-300";
                }
            });
        }

        updateStatus();
        setInterval(updateStatus, 1000 * 60 * 60);
    });
}

// -------------------- Review Form --------------------
function openReviewForm(item, uid, btn) {
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50";
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 class="text-lg font-semibold mb-4">Review for ${item.title}</h2>
        <label class="block mb-2">Rating:</label>
        <select id="review-rating" class="w-full border p-2 rounded mb-4">
          <option value="5">⭐ 5 - Excellent</option>
          <option value="4">⭐ 4 - Good</option>
          <option value="3">⭐ 3 - Average</option>
          <option value="2">⭐ 2 - Poor</option>
          <option value="1">⭐ 1 - Bad</option>
        </select>
        <textarea id="review-comment" class="w-full border p-2 rounded mb-4" rows="3" placeholder="Write your review..."></textarea>
        <div class="flex justify-end gap-2">
          <button id="cancel-review" class="px-3 py-1 bg-gray-300 rounded">Cancel</button>
          <button id="submit-review" class="px-3 py-1 bg-green-500 text-white rounded">Submit</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    $("cancel-review").onclick = () => modal.remove();

    $("submit-review").onclick = async () => {
        const rating = parseInt($("review-rating").value);
        const comment = $("review-comment").value.trim();

        if (!comment) {
            showToast("Please enter a comment", "warn");
            return;
        }

        try {
            await addDoc(collection(db, "reviews"), {
                productId: item.id || item.productId,
                uid,
                username: auth.currentUser?.displayName || auth.currentUser?.email || "Anonymous",
                rating,
                comment,
                createdAt: serverTimestamp()
            });
            showToast("Review submitted!", "success");

            // cập nhật nút
            btn.textContent = "✅ Already Reviewed";
            btn.disabled = true;
            btn.className = "mt-2 px-3 py-1 bg-gray-400 text-white text-xs rounded cursor-not-allowed";

            modal.remove();
        } catch (err) {
            console.error("Error adding review:", err);
            showToast("Failed to submit review", "error");
        }
    };
}

// -------------------- Filter Buttons & Auto Update --------------------
function setupFilters() {
    const statusMap = {
        order: { key: "pending", label: "Pending", color: "text-yellow-500" },
        shipping: { key: "shipped", label: "Shipping", color: "text-blue-500" },
        delivered: { key: "delivered", label: "Delivered", color: "text-green-500" },
        all: { key: "all", label: "All", color: "text-gray-500" }
    };

    const buttons = document.querySelectorAll(".filter-btn");

    function updateCounts() {
        buttons.forEach(btn => {
            const map = statusMap[btn.dataset.status];
            const count = map.key === "all"
                ? allOrders.length
                : allOrders.filter(o => o.data.status === map.key).length;
            btn.textContent = `${map.label} (${count})`;
        });
    }

    function applyFilter(filterKey) {
        let filtered = allOrders;
        const map = statusMap[filterKey];

        if (map.key !== "all") {
            filtered = allOrders.filter(o => o.data.status === map.key);
        }

        renderOrders(filtered);

        buttons.forEach(b => b.classList.remove("active"));
        document.querySelector(`.filter-btn[data-status='${filterKey}']`)?.classList.add("active");
    }

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            applyFilter(btn.dataset.status);
        });
    });

    updateCounts();
    applyFilter("all");

    return updateCounts;
}

// -------------------- Load Orders --------------------
onAuthStateChanged(auth, user => {
    if (!user) {
        showToast("Please login to view your orders", "warn");
        setTimeout(() => location.href = "./home.html", 1200);
        return;
    }

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    const updateCounts = setupFilters();

    onSnapshot(q, snapshot => {
        allOrders = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.uid !== user.uid) return;
            allOrders.push({ id: docSnap.id, data });
        });

        ordersLoaded = true;
        updateCounts();
        renderOrders(allOrders);
    });
});
