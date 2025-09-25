// ==================== MODULE IMPORTS ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
    getFirestore, collection, addDoc, doc, getDoc, setDoc,
    query, orderBy, onSnapshot, serverTimestamp,
    updateDoc, deleteDoc, getDocs // <- FIX: Thêm getDocs
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ==================== CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyAZgfT2f2EbBD59t6NheiQywWsnNKazX7o",
    authDomain: "goods-16d80.firebaseapp.com",
    projectId: "goods-16d80",
    storageBucket: "goods-16d80.appspot.com",
    messagingSenderId: "751074879040",
    appId: "1:751074879040:web:0080a2badd43fa79fa21a5",
    measurementId: "G-SHDRHGQW81"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ==================== HELPER ====================
const $ = id => document.getElementById(id);


// Status helper functions
function getStatusBadgeColor(status) {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-blue-100 text-blue-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function getStatusIcon(status) {
    switch (status) {
        case 'active': return '<i class="fas fa-play-circle mr-1"></i>';
        case 'completed': return '<i class="fas fa-check-circle mr-1"></i>';
        case 'cancelled': return '<i class="fas fa-times-circle mr-1"></i>';
        default: return '<i class="fas fa-circle mr-1"></i>';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'active': return 'Đang diễn ra';
        case 'completed': return 'Hoàn tất';
        case 'cancelled': return 'Đã hủy';
        default: return 'Không xác định';
    }
}

// ==================== NOTIFICATION SYSTEM ====================
async function addNotificationForBothUsers(tradeId, ownerId, partnerId, type) {
    try {
        // Notification cho chủ trade
        await addDoc(collection(db, "notifications"), {
            userId: ownerId,
            type,
            tradeId,
            message: "Your trade request has been accepted!",
            createdAt: serverTimestamp(),
            read: false
        });

        // Notification cho người request
        await addDoc(collection(db, "notifications"), {
            userId: partnerId,
            type,
            tradeId,
            message: "Your trade request has been accepted! You can now access the trade details.",
            createdAt: serverTimestamp(),
            read: false
        });
    } catch (err) {
        console.error("Error adding notifications:", err);
    }
}

// ==================== TOAST ====================
function showToast(message, type = "info") {
    const toast = $("toast");
    const content = $("toast-content");
    const icon = $("toast-icon");
    const title = $("toast-title");
    const msg = $("toast-message");

    if (!toast || !content || !icon || !title || !msg) return;

    content.className = "flex items-center p-6 rounded-2xl shadow-2xl glass-effect border-l-4 max-w-md";
    let borderColor = "border-blue-500", iconHtml = "ℹ️", titleText = "Info";

    if (type === "success") { borderColor = "border-green-500"; iconHtml = "✅"; titleText = "Success"; }
    else if (type === "error") { borderColor = "border-red-500"; iconHtml = "❌"; titleText = "Error"; }
    else if (type === "warn") { borderColor = "border-yellow-500"; iconHtml = "⚠️"; titleText = "Warning"; }

    content.classList.add(borderColor);
    icon.textContent = iconHtml;
    title.textContent = titleText;
    msg.textContent = message;

    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 4000);
}

// ==================== AUTH CHECK ====================
onAuthStateChanged(auth, (user) => {
    if (!user) {
        showToast("You must be logged in to access the Trade Center", "warn");
        setTimeout(() => location.href = "home.html", 2000);
    } else {
        loadCategories();
        loadTrades();
        loadActiveTrades(user.uid);
    }
});

// ==================== LOAD CATEGORIES ====================
async function loadCategories() {
    const categorySelect = $("category");
    if (!categorySelect) return;

    categorySelect.innerHTML = "<option value=''>Select a category...</option>";

    try {
        const res = await fetch("https://dummyjson.com/products?limit=194");
        const data = await res.json();
        const categories = [...new Set(data.products.map(p => p.category))];
        const categoryIcons = {
            electronics: "📱", clothing: "👕", books: "📚", sports: "⚽",
            home: "🏠", automotive: "🚗", default: "📦"
        };
        categories.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat;
            const icon = categoryIcons[cat] || categoryIcons.default;
            option.textContent = `${icon} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
            categorySelect.appendChild(option);
        });
    } catch (err) {
        console.error(err);
        showToast("Failed to load categories", "error");
    }
}

// ==================== LOAD TRADES ====================
function loadTrades() {
    const tradeList = $("trade-list");
    if (!tradeList) return;

    const q = query(collection(db, "trades"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        tradeList.innerHTML = "";
        if (snapshot.empty) {
            tradeList.innerHTML = `<div class="col-span-full text-center py-20">
                <div class="mb-8">
                    <i class="fas fa-exchange-alt text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-2xl font-bold text-gray-500 mb-2">No trades yet</h3>
                    <p class="text-gray-400">Be the first to post a trade!</p>
                </div>
                <button onclick="document.getElementById('trade-form').scrollIntoView({behavior:'smooth'})" 
                        class="btn-enhanced bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-full">
                    <i class="fas fa-plus mr-2"></i>Create First Trade
                </button>
            </div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const trade = docSnap.data();
            const tradeDate = trade.createdAt?.toDate ? trade.createdAt.toDate().toLocaleDateString() : "Just now";
            const div = document.createElement("div");
            div.className = "trade-card rounded-2xl p-6 shadow-lg animate-fade-in";
            div.id = `trade-${docSnap.id}`;

            const categoryIcons = {
                electronics: "📱", clothing: "👕", books: "📚", sports: "⚽",
                home: "🏠", automotive: "🚗", default: "📦"
            };
            const categoryIcon = categoryIcons[trade.category] || categoryIcons.default;

            div.innerHTML = `
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold">
                            ${trade.userEmail ? trade.userEmail[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                            <p class="font-semibold text-gray-800">${trade.userEmail || 'Anonymous'}</p>
                            <p class="text-sm text-gray-500">${tradeDate}</p>
                        </div>
                    </div>
                    ${trade.category ? `<span class="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center">${categoryIcon} ${trade.category}</span>` : ""}
                </div>
            
                <div class="mb-4">
                    <h3 class="text-xl font-bold text-gray-800 mb-2 flex items-center">
                        <i class="fas fa-tag text-blue-500 mr-2"></i>${trade.title}
                    </h3>
                    <p class="text-gray-600 leading-relaxed">${trade.description}</p>
                </div>

                ${trade.imageUrl ? `<div class="mb-4">
                    <img src="${trade.imageUrl}" alt="Trade image" class="w-full h-48 object-cover rounded-xl shadow-md hover:shadow-lg transition-shadow">
                </div>` : ""}

                <div class="flex items-center justify-between mb-4">
                    <div class="flex items-center space-x-4">
                        <button class="like-trade-btn text-gray-500 hover:text-blue-500 flex items-center space-x-1">
                            <i class="far fa-heart"></i> <span class="like-count text-sm">0</span>
                        </button>
                        <button class="text-gray-500 hover:text-green-500 flex items-center space-x-1">
                            <i class="far fa-comment"></i> <span class="text-sm">Comment</span>
                        </button>
                        <button class="text-gray-500 hover:text-purple-500 flex items-center space-x-1">
                            <i class="fas fa-share"></i> <span class="text-sm">Share</span>
                        </button>
                    </div>
                   ${trade.userId === auth.currentUser?.uid
                    ? `<div class="flex space-x-2">
        <button class="edit-btn text-yellow-600 hover:text-yellow-700"><i class="fas fa-edit"></i></button>
        <button class="delete-btn text-red-600 hover:text-red-700"><i class="fas fa-trash"></i></button>
    </div>`
                    : `<button class="request-btn bg-gradient-to-r from-green-400 to-green-600 text-white px-4 py-2 rounded-full hover:opacity-90">
        <i class="fas fa-handshake mr-2"></i>Yêu cầu Trade
    </button>`
                }
                </div>

                <div class="border-t pt-4">
                    <form class="comment-form flex space-x-3 mb-4">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-sm font-bold">
                            ${auth.currentUser?.email ? auth.currentUser.email[0].toUpperCase() : 'U'}
                        </div>
                        <div class="flex-1">
                            <input type="text" class="comment-input w-full border-2 border-gray-200 rounded-full px-4 py-2 focus:border-blue-500 focus:outline-none" placeholder="Write a comment...">
                        </div>
                        <button type="submit" class="btn-enhanced bg-blue-500 text-white px-4 py-2 rounded-full hover:bg-blue-600">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </form>
                    <div id="comments-${docSnap.id}" class="space-y-3"></div>
                </div>
            `;

            // Setup like functionality
            setupTradeLikeButton(div, docSnap.id);
            
            tradeList.appendChild(div);
            loadComments(docSnap.id);
            attachTradeButtons(docSnap.id, trade.userId);
            
            // FIX: Gọi function enhance status
            enhanceTradeCardWithStatus(div, docSnap.id);
        });
    });
}

// ==================== LIKE FUNCTIONALITY ====================
function setupTradeLikeButton(tradeCard, tradeId) {
    const likeBtn = tradeCard.querySelector(".like-trade-btn");
    if (!likeBtn) return;

    const likeCount = likeBtn.querySelector(".like-count");
    
    // Realtime update từ Firestore
    const likesCol = collection(db, `trades/${tradeId}/likes`);
    onSnapshot(likesCol, snapshot => {
        likeCount.textContent = snapshot.size;
        likeBtn.querySelector("i").className = snapshot.docs.some(d => d.id === auth.currentUser?.uid)
            ? "fas fa-heart text-pink-500"
            : "far fa-heart";
    });

    // Click handler
    likeBtn.addEventListener("click", async () => {
        if (!auth.currentUser) return;
        likeBtn.disabled = true;
        await toggleLike(tradeId, auth.currentUser.uid, likeBtn);
        likeBtn.disabled = false;
    });
}

async function toggleLike(tradeId, userId, likeBtn) {
    if (!likeBtn || !userId) return;

    const likeDocRef = doc(db, "trades", tradeId, "likes", userId);

    try {
        const likeSnap = await getDoc(likeDocRef);
        const heartIcon = likeBtn.querySelector("i");

        if (likeSnap.exists()) {
            await deleteDoc(likeDocRef);
            heartIcon.className = "far fa-heart";
        } else {
            await setDoc(likeDocRef, {
                userId: userId,
                userEmail: auth.currentUser.email,
                createdAt: serverTimestamp()
            });
            heartIcon.className = "fas fa-heart text-pink-500";
        }
    } catch (err) {
        console.error(err);
    }
}

// ==================== COMMENTS ====================
function loadComments(tradeId) {
    const container = $(`comments-${tradeId}`);
    if (!container) return;

    const commentsCol = collection(db, `trades/${tradeId}/comments`);
    onSnapshot(commentsCol, snapshot => {
        container.innerHTML = "";
        if (snapshot.empty) {
            container.innerHTML = `<p class='text-gray-400 text-center py-4'>No comments yet. Be the first to comment!</p>`;
            return;
        }

        snapshot.docs.sort((a, b) => {
            const ta = a.data().createdAt?.toMillis?.() || 0;
            const tb = b.data().createdAt?.toMillis?.() || 0;
            return ta - tb;
        }).forEach(docSnap => {
            const c = { id: docSnap.id, ...docSnap.data() };
            const time = c.createdAt?.toDate?.()?.toLocaleString() || "Just now";
            const div = document.createElement("div");
            div.className = "comment-item bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors";

            div.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex space-x-3 flex-1">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            ${c.userEmail ? c.userEmail[0].toUpperCase() : 'U'}
                        </div>
                        <div class="flex-1">
                            <div class="flex items-center space-x-2 mb-1">
                                <p class="font-semibold text-gray-800 text-sm">${c.userEmail || 'Anonymous'}</p>
                                <span class="text-xs text-gray-500">•</span>
                                <span class="text-xs text-gray-500">${time}</span>
                            </div>
                            <p class="comment-text text-gray-700">${c.text}</p>
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        ${c.userId === auth.currentUser?.uid ? `
                        <button class="edit-comment-btn text-blue-500 hover:text-blue-700 text-xs"><i class="fas fa-edit"></i></button>
                        <button class="delete-comment-btn text-red-500 hover:text-red-700 text-xs"><i class="fas fa-trash"></i></button>
                        ` : ""}
                        <button class="like-comment-btn text-gray-500 hover:text-pink-500 flex items-center space-x-1">
                            <i class="far fa-heart"></i>
                            <span class="like-count text-sm">0</span>
                        </button>
                    </div>
                </div>
            `;

            container.appendChild(div);
            setupCommentLike(div, tradeId, c.id);
            attachCommentButtons(tradeId, c.id, div.querySelector(".comment-text"));
        });
    });
}

function setupCommentLike(commentDiv, tradeId, commentId) {
    const likeBtn = commentDiv.querySelector(".like-comment-btn");
    const likeCount = likeBtn.querySelector(".like-count");
    
    const likesCol = collection(db, `trades/${tradeId}/comments/${commentId}/likes`);
    onSnapshot(likesCol, snapshot => {
        likeCount.textContent = snapshot.size;
        likeBtn.querySelector("i").className = snapshot.docs.some(d => d.id === auth.currentUser?.uid)
            ? "fas fa-heart text-pink-500"
            : "far fa-heart";
    });

    likeBtn.addEventListener("click", async () => {
        if (!auth.currentUser) return;
        likeBtn.disabled = true;
        await toggleCommentLike(tradeId, commentId, auth.currentUser.uid, likeBtn);
        likeBtn.disabled = false;
    });
}

async function toggleCommentLike(tradeId, commentId, userId, likeBtn) {
    if (!likeBtn || !userId) return;

    const likeDocRef = doc(db, "trades", tradeId, "comments", commentId, "likes", userId);
    const heartIcon = likeBtn.querySelector("i");

    try {
        const likeSnap = await getDoc(likeDocRef);

        if (likeSnap.exists()) {
            await deleteDoc(likeDocRef);
            heartIcon.className = "far fa-heart";
        } else {
            await setDoc(likeDocRef, {
                userId: userId,
                userEmail: auth.currentUser.email,
                createdAt: serverTimestamp()
            });
            heartIcon.className = "fas fa-heart text-pink-500";
        }
    } catch (err) {
        console.error(err);
    }
}

// ==================== TRADE BUTTONS ====================
function attachTradeButtons(tradeId, userId) {
    const tradeCard = $(`trade-${tradeId}`);
    if (!tradeCard) return;

    if (userId === auth.currentUser?.uid) {
        const deleteBtn = tradeCard.querySelector(".delete-btn");
        const editBtn = tradeCard.querySelector(".edit-btn");

        deleteBtn?.addEventListener("click", async () => {
            if (!confirm("Delete this trade?")) return;
            try {
                await deleteDoc(doc(db, "trades", tradeId));
                showToast("Trade deleted!", "success");
            } catch (err) {
                console.error(err);
                showToast("Failed to delete trade!", "error");
            }
        });

        editBtn?.addEventListener("click", () => openEditTradeModal(tradeId));
        
        // Load requests for owner
        loadTradeRequests(tradeId, tradeCard);
    } else {
        // Setup request button for non-owners
        const requestBtn = tradeCard.querySelector(".request-btn");
        requestBtn?.addEventListener("click", async () => {
            try {
                await addDoc(collection(db, `trades/${tradeId}/requests`), {
                    fromUserId: auth.currentUser.uid,
                    fromEmail: auth.currentUser.email,
                    createdAt: serverTimestamp(),
                    status: "pending"
                });
                showToast("Yêu cầu trade đã được gửi!", "success");
            } catch (err) {
                console.error(err);
                showToast("Không thể gửi yêu cầu trade!", "error");
            }
        });
    }

    // Setup comment form
    setupCommentForm(tradeCard, tradeId);
}

function loadTradeRequests(tradeId, tradeCard) {
    const requestsCol = collection(db, `trades/${tradeId}/requests`);
    onSnapshot(requestsCol, snapshot => {
        // Remove old container
        const oldContainer = tradeCard.querySelector(".requests-container");
        if (oldContainer) oldContainer.remove();

        if (snapshot.empty) return;

        const reqContainer = document.createElement("div");
        reqContainer.className = "requests-container mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200";
        reqContainer.innerHTML = "<h4 class='font-semibold text-gray-700 mb-3 flex items-center'><i class='fas fa-handshake text-blue-500 mr-2'></i>Trade Requests:</h4>";

        const requestsList = document.createElement("div");
        requestsList.className = "space-y-3";

        snapshot.forEach(reqSnap => {
            const req = reqSnap.data();
            const reqTime = req.createdAt?.toDate?.()?.toLocaleString() || "Vừa xong";
            
            const div = document.createElement("div");
            div.className = "flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm";

            div.innerHTML = `
                <div class="flex-1">
                    <div class="flex items-center space-x-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                            ${req.fromEmail ? req.fromEmail[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                            <p class="text-sm font-semibold text-gray-700">${req.fromEmail}</p>
                            <p class="text-xs text-gray-500">${reqTime}</p>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2">
                    <button class="accept-btn bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium transition-colors flex items-center">
                        <i class="fas fa-check mr-2"></i>Accept
                    </button>
                    <button class="decline-btn bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm font-medium transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;

            // Accept button
            div.querySelector(".accept-btn").addEventListener("click", async () => {
                try {
                    const activeTradeRef = await addDoc(collection(db, "activeTrades"), {
                        tradeId,
                        ownerId: auth.currentUser.uid,
                        ownerEmail: auth.currentUser.email,
                        partnerId: req.fromUserId,
                        partnerEmail: req.fromEmail,
                        createdAt: serverTimestamp(),
                        status: "active"
                    });

                    await updateDoc(doc(db, "trades", tradeId), {
                        status: "in_progress",
                        activeTradeId: activeTradeRef.id
                    });

                    // Delete all requests
                    const allRequests = await getDocs(collection(db, `trades/${tradeId}/requests`));
                    await Promise.all(allRequests.docs.map(doc => deleteDoc(doc.ref)));

                    showToast("Trade accepted! Cả hai bên giờ có thể vào trang trade details", "success");
                    await addNotificationForBothUsers(tradeId, auth.currentUser.uid, req.fromUserId, "trade_accepted");

                } catch (err) {
                    console.error(err);
                    showToast("Failed to accept trade!", "error");
                }
            });

            // Decline button
            div.querySelector(".decline-btn").addEventListener("click", async () => {
                if (!confirm("Từ chối yêu cầu trade này?")) return;
                try {
                    await deleteDoc(doc(db, `trades/${tradeId}/requests`, reqSnap.id));
                    showToast("Đã từ chối yêu cầu trade", "info");
                } catch (err) {
                    console.error(err);
                    showToast("Không thể từ chối yêu cầu!", "error");
                }
            });

            requestsList.appendChild(div);
        });

        reqContainer.appendChild(requestsList);
        tradeCard.appendChild(reqContainer);
    });
}

function setupCommentForm(tradeCard, tradeId) {
    const form = tradeCard.querySelector(".comment-form");
    form?.addEventListener("submit", async e => {
        e.preventDefault();
        const input = form.querySelector(".comment-input");
        const text = input.value.trim();
        if (!text) return;

        try {
            await addDoc(collection(db, `trades/${tradeId}/comments`), {
                text,
                userId: auth.currentUser.uid,
                userEmail: auth.currentUser.email,
                createdAt: serverTimestamp()
            });
            input.value = "";
            showToast("Comment added!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to add comment", "error");
        }
    });
}

function attachCommentButtons(tradeId, commentId, textDiv) {
    const commentItem = textDiv.closest(".comment-item");
    const editBtn = commentItem.querySelector(".edit-comment-btn");
    const deleteBtn = commentItem.querySelector(".delete-comment-btn");

    editBtn?.addEventListener("click", () => openEditCommentModal(tradeId, commentId, textDiv));
    deleteBtn?.addEventListener("click", async () => {
        try {
            await deleteDoc(doc(db, `trades/${tradeId}/comments`, commentId));
            showToast("Comment deleted!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to delete comment", "error");
        }
    });
}

// ==================== DELETE ACTIVE TRADE FUNCTION ====================
async function deleteActiveTrade(activeTradeId, tradeId, userId) {
    try {
        // Xác nhận xóa
        const confirmed = confirm(
            "⚠️ CẢNH BÁO: Bạn có chắc chắn muốn XÓA HOÀN TOÀN trade đang diễn ra này?\n\n" +
            "Hành động này sẽ:\n" +
            "• Xóa toàn bộ dữ liệu trade details\n" +
            "• Xóa tất cả tin nhắn và file đã trao đổi\n" +
            "• Không thể hoàn tác được\n\n" +
            "Nếu chỉ muốn dừng trade, hãy chọn 'Hủy' thay vì 'Xóa hoàn toàn'"
        );

        if (!confirmed) return;

        // Xóa active trade document
        await deleteDoc(doc(db, "activeTrades", activeTradeId));

        // Reset trạng thái của trade gốc về "active"
        await updateDoc(doc(db, "trades", tradeId), {
            status: "active",
            activeTradeId: null
        });

        // Thông báo thành công
        showToast("Trade đã được xóa hoàn toàn khỏi hệ thống!", "success");

    } catch (err) {
        console.error("Error deleting active trade:", err);
        showToast("Không thể xóa trade! Vui lòng thử lại.", "error");
    }
}

// ==================== ACTIVE TRADES ====================
function loadActiveTrades(userId) {
    const container = $("active-trades");
    if (!container) return;

    const q = query(collection(db, "activeTrades"), orderBy("createdAt", "desc"));

    onSnapshot(q, snapshot => {
        container.innerHTML = "";

        // Filter trades where user is participant
        const userTrades = snapshot.docs.filter(doc => {
            const trade = doc.data();
            return trade.ownerId === userId || trade.partnerId === userId;
        });

        if (userTrades.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-handshake text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-400">Bạn chưa có trade nào đang diễn ra</p>
                </div>`;
            return;
        }

        userTrades.forEach(docSnap => {
            const trade = { id: docSnap.id, ...docSnap.data() };
            const isOwner = trade.ownerId === userId;
            const partnerEmail = isOwner ? trade.partnerEmail : trade.ownerEmail;
            const partnerRole = isOwner ? "Người nhận trade" : "Chủ trade";

            const div = document.createElement("div");
            div.className = "bg-white shadow-lg rounded-xl p-6 border border-gray-200 hover:shadow-xl transition-shadow";

            div.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                ${partnerEmail ? partnerEmail[0].toUpperCase() : 'U'}
                            </div>
                            <div>
                                <p class="font-semibold text-gray-800">${partnerEmail || 'N/A'}</p>
                                <p class="text-sm text-gray-500">${partnerRole}</p>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 mb-2">Trade ID: <span class="font-mono bg-gray-100 px-2 py-1 rounded">${trade.tradeId}</span></p>
                        <p class="text-xs text-gray-400">Bắt đầu: ${trade.createdAt?.toDate?.().toLocaleString() || ""}</p>
                        <div class="mt-3">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(trade.status)}">
                                ${getStatusIcon(trade.status)} ${getStatusText(trade.status)}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="flex space-x-2">
                    <a href="trade-details.html?activeTradeId=${trade.id}" 
                       class="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-colors flex items-center justify-center">
                        <i class="fas fa-arrow-right mr-2"></i>Vào Trade Details
                    </a>
                    ${trade.status === 'active' ? `
                        <button class="complete-btn bg-green-500 text-white px-3 py-3 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors flex items-center" title="Hoàn tất trade">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="cancel-btn bg-yellow-500 text-white px-3 py-3 rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors flex items-center" title="Hủy trade">
                            <i class="fas fa-pause"></i>
                        </button>
                        <button class="delete-active-btn bg-red-500 text-white px-3 py-3 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center" title="Xóa hoàn toàn trade">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : trade.status === 'completed' || trade.status === 'cancelled' ? `
                        <button class="delete-active-btn bg-red-500 text-white px-3 py-3 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center" title="Xóa trade đã kết thúc">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            `;

            // Event listeners for action buttons
            if (trade.status === 'active') {
                // Complete button
                div.querySelector(".complete-btn")?.addEventListener("click", async () => {
                    if (!confirm("Đánh dấu trade này là hoàn tất?")) return;
                    try {
                        await updateDoc(doc(db, "activeTrades", trade.id), { 
                            status: "completed",
                            completedAt: serverTimestamp(),
                            completedBy: userId
                        });
                        await updateDoc(doc(db, "trades", trade.tradeId), { 
                            status: "completed" 
                        });
                        showToast("Trade đã hoàn tất!", "success");
                    } catch (err) {
                        console.error(err);
                        showToast("Không thể hoàn tất trade!", "error");
                    }
                });

                // Cancel button
                div.querySelector(".cancel-btn")?.addEventListener("click", async () => {
                    if (!confirm("Hủy trade này? Trade sẽ được tạm dừng nhưng dữ liệu vẫn được lưu.")) return;
                    try {
                        await updateDoc(doc(db, "activeTrades", trade.id), { 
                            status: "cancelled",
                            cancelledAt: serverTimestamp(),
                            cancelledBy: userId
                        });
                        await updateDoc(doc(db, "trades", trade.tradeId), { 
                            status: "cancelled" 
                        });
                        showToast("Trade đã bị hủy!", "warn");
                    } catch (err) {
                        console.error(err);
                        showToast("Không thể hủy trade!", "error");
                    }
                });
            }

            // Delete button (available for all statuses)
            div.querySelector(".delete-active-btn")?.addEventListener("click", () => {
                deleteActiveTrade(trade.id, trade.tradeId, userId);
            });

            container.appendChild(div);
        });
    });
}

// ==================== ENHANCE TRADE STATUS ====================
function enhanceTradeCardWithStatus(tradeCard, tradeId) {
    onSnapshot(doc(db, "trades", tradeId), (docSnap) => {
        if (docSnap.exists()) {
            const trade = docSnap.data();
            const statusContainer = tradeCard.querySelector(".trade-status");
            
            if (statusContainer) statusContainer.remove();
            
            if (trade.status && trade.status !== "active") {
                const statusDiv = document.createElement("div");
                statusDiv.className = "trade-status mt-3 p-2 rounded-lg text-center";
                
                if (trade.status === "in_progress") {
                    statusDiv.className += " bg-yellow-100 text-yellow-800";
                    statusDiv.innerHTML = `
                        <i class="fas fa-clock mr-2"></i>Trade in progress
                        ${trade.activeTradeId ? `
                            <br><a href="trade-details.html?activeTradeId=${trade.activeTradeId}" 
                               class="text-blue-600 hover:text-blue-800 underline text-sm">
                                Chat with partner
                            </a>
                        ` : ''}
                    `;
                } else if (trade.status === "completed") {
                    statusDiv.className += " bg-green-100 text-green-800";
                    statusDiv.innerHTML = `<i class="fas fa-check-circle mr-2"></i>Done! Trade completed`;
                } else if (trade.status === "cancelled") {
                    statusDiv.className += " bg-red-100 text-red-800";
                    statusDiv.innerHTML = `<i class="fas fa-times-circle mr-2"></i>Trade cancelled`;
                }
                
                tradeCard.appendChild(statusDiv);
            }
        }
    });
}

// ==================== MODALS ====================
function openEditTradeModal(tradeId) {
    const modal = $("edit-trade-modal");
    const input = $("edit-trade-input");
    modal.classList.remove("hidden");
    input.focus();

    $("save-trade-edit").onclick = async () => {
        const newDesc = input.value.trim();
        if (!newDesc) return showToast("Please enter a description!", "warn");
        try {
            await updateDoc(doc(db, "trades", tradeId), { description: newDesc });
            modal.classList.add("hidden");
            showToast("Trade updated!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to update trade!", "error");
        }
    };
    $("cancel-trade-edit").onclick = () => modal.classList.add("hidden");
}

function openEditCommentModal(tradeId, commentId, textDiv) {
    const modal = $("edit-comment-modal");
    const input = $("edit-comment-input");
    input.value = textDiv.textContent;
    modal.classList.remove("hidden");
    input.focus();

    $("save-edit").onclick = async () => {
        const newText = input.value.trim();
        if (!newText) return showToast("Please enter content!", "warn");
        try {
            await updateDoc(doc(db, `trades/${tradeId}/comments`, commentId), { text: newText });
            textDiv.textContent = newText;
            modal.classList.add("hidden");
            showToast("Comment updated!", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to update comment!", "error");
        }
    };
    $("cancel-edit").onclick = () => modal.classList.add("hidden");
}

// ==================== ADD TRADE ====================
$("trade-form")?.addEventListener("submit", async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return showToast("You are not logged in!", "error");

    const title = $("title").value.trim();
    const desc = $("desc").value.trim();
    const category = $("category").value;
    const file = $("image").files[0];

    if (!title || !desc || !category) return showToast("Fill all fields!", "warn");

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Posting...';
    submitBtn.disabled = true;

    try {
        let imageUrl = "";
        if (file) {
            const storageRef = ref(storage, `trades/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            imageUrl = await getDownloadURL(storageRef);
        }

        await addDoc(collection(db, "trades"), {
            title, description: desc, category,
            userId: user.uid, userEmail: user.email,
            imageUrl, createdAt: serverTimestamp()
        });

        e.target.reset();
        showToast("Trade posted!", "success");
        setTimeout(() => $("trade-list")?.scrollIntoView({ behavior: "smooth" }), 500);

    } catch (err) {
        console.error(err);
        showToast("Failed to post trade!", "error");
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// ==================== ENHANCEMENTS ====================
// Smooth scroll for anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute("href"));
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
});

// Close modals when clicking outside
document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", e => {
        if (e.target === modal) modal.classList.add("hidden");
    });
});

// Press ESC to close modals
document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
        document.querySelectorAll(".modal").forEach(modal => modal.classList.add("hidden"));
    }
});

// Animate new trade cards
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.classList && node.classList.contains("trade-card")) {
                node.classList.add("animate-fade-in");
            }
        });
    });
});

if ($("trade-list")) {
    observer.observe($("trade-list"), { childList: true });
}

// Input focus border color enhancement
document.querySelectorAll("input, textarea").forEach(input => {
    input.addEventListener("focus", () => input.classList.add("border-blue-500", "ring-1", "ring-blue-300"));
    input.addEventListener("blur", () => input.classList.remove("border-blue-500", "ring-1", "ring-blue-300"));
});

// Limit file upload size to 5MB
$("image")?.addEventListener("change", e => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
        showToast("File size cannot exceed 5MB", "warn");
        e.target.value = "";
    }
});

// Preview uploaded image
$("image")?.addEventListener("change", e => {
    const file = e.target.files[0];
    const preview = $("image-preview");
    if (file && preview) {
        const reader = new FileReader();
        reader.onload = () => preview.src = reader.result;
        reader.readAsDataURL(file);
    }
});