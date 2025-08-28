// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// Firebase configuration (giữ nguyên của bạn)
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

// Globals
let activeTradeId = null;
let currentUser = null;
let userData = null;
let partnerData = null;
let tradeData = null;
let selectedFile = null;
let typingTimeout = null;
let typingInterval = null;
let chatUnsubscribe = null;

// DOM references object (refreshDom sẽ gán)
const dom = {};

// Lấy param từ URL
const urlParams = new URLSearchParams(window.location.search);
activeTradeId = urlParams.get('activeTradeId');

if (!activeTradeId) {
    alert('No active trade ID provided!');
    window.location.href = 'trade-center.html';
}
function debugLog(message, data = null) {
    console.log(`[DEBUG] ${message}`, data || '');
}

function debugError(message, error = null) {
    console.error(`[ERROR] ${message}`, error || '');
}

// ================= helpers =================
function refreshDom() {
    dom.loadingScreen = document.getElementById('loading-screen');
    dom.verifyModal = document.getElementById('verify-modal');
    dom.errorModal = document.getElementById('error-modal');
    dom.confirmationModal = document.getElementById('confirmation-modal');
    dom.chatBox = document.getElementById('chat-box');
    dom.chatForm = document.getElementById('chat-form');
    dom.chatInput = document.getElementById('chat-input');
    dom.sendBtn = document.getElementById('send-btn');
    dom.charCount = document.getElementById('char-count');
    dom.fileInput = document.getElementById('file-input');
    dom.fileBtn = document.getElementById('file-btn');
    dom.filePreview = document.getElementById('file-preview');
    dom.onlineIndicator = document.getElementById('online-indicator');
    dom.onlineStatus = document.getElementById('online-status');
    dom.tradeStatus = document.getElementById('trade-status');
    dom.ownerEmail = document.getElementById('owner-email');
    dom.partnerEmail = document.getElementById('partner-email');
    dom.tokenRemoveFile = document.getElementById('remove-file');
    dom.fileName = document.getElementById('file-name');
    dom.fileSize = document.getElementById('file-size');
    // cố gắng lấy trade-actions nếu có id, nếu không sẽ dò bằng tiêu đề
    dom.tradeActions = document.getElementById('trade-actions') || findTradeActionsElement();
}

function findTradeActionsElement() {
    // tìm phần chứa tiêu đề "Trade Actions" rồi trả về closest container
    const hs = Array.from(document.querySelectorAll('h3'));
    for (const h of hs) {
        if (h.textContent && h.textContent.trim().includes('Trade Actions')) {
            // giả sử container là phần cha 2 cấp
            return h.closest('div') || h.parentElement;
        }
    }
    return null;
}

function showToast(message, type = 'info') {
    refreshDom();
    const toast = document.getElementById('toast');
    const content = document.getElementById('toast-content');
    const icon = document.getElementById('toast-icon');
    const title = document.getElementById('toast-title');
    const msg = document.getElementById('toast-message');

    if (!toast || !content || !icon || !title || !msg) return;

    let bgColor, textColor, iconHtml, titleText;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-600';
            textColor = 'text-white';
            iconHtml = '✅';
            titleText = 'Success';
            break;
        case 'error':
            bgColor = 'bg-red-600';
            textColor = 'text-white';
            iconHtml = '❌';
            titleText = 'Error';
            break;
        case 'warning':
            bgColor = 'bg-yellow-600';
            textColor = 'text-white';
            iconHtml = '⚠️';
            titleText = 'Warning';
            break;
        default:
            bgColor = 'bg-blue-600';
            textColor = 'text-white';
            iconHtml = 'ℹ️';
            titleText = 'Info';
    }

    content.className = `flex items-center p-4 rounded-lg shadow-lg min-w-80 ${bgColor} ${textColor}`;
    icon.innerHTML = iconHtml;
    title.textContent = titleText;
    msg.textContent = message;

    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function showConfirmation(title, message, onConfirm, type = 'danger') {
    refreshDom();
    const modal = document.getElementById('confirmation-modal');
    if (!modal) return;

    const titleEl = document.getElementById('confirm-title');
    const messageEl = document.getElementById('confirm-message');
    const iconEl = document.getElementById('confirm-icon');
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');

    if (!titleEl || !messageEl || !iconEl || !okBtn || !cancelBtn) return;

    titleEl.textContent = title;
    messageEl.textContent = message;

    if (type === 'danger') {
        iconEl.className = 'w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4';
        iconEl.innerHTML = '<i class="fas fa-exclamation-triangle text-red-600 text-2xl"></i>';
        okBtn.className = 'flex-1 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition-colors';
    } else {
        iconEl.className = 'w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4';
        iconEl.innerHTML = '<i class="fas fa-question-circle text-blue-600 text-2xl"></i>';
        okBtn.className = 'flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors';
    }

    modal.classList.remove('hidden');

    const handleConfirm = () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
        cleanup();
    };

    const handleCancel = () => {
        modal.classList.add('hidden');
        cleanup();
    };

    const cleanupLocal = () => {
        okBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

function showError(message) {
    refreshDom();
    const errorMessageEl = document.getElementById('error-message');
    if (errorMessageEl && dom.errorModal) {
        errorMessageEl.textContent = message;
        dom.errorModal.classList.remove('hidden');
    } else {
        alert(message);
    }
}

function hideLoading() {
    debugLog('Attempting to hide loading screen');
    refreshDom();
    
    if (dom.loadingScreen) {
        debugLog('Loading screen element found, hiding it');
        dom.loadingScreen.classList.add('hidden');
        debugLog('Loading screen should now be hidden');
    } else {
        debugError('Loading screen element not found in DOM');
        // Try alternative selectors
        const loadingEl = document.querySelector('#loading-screen, .loading-screen, [data-loading]');
        if (loadingEl) {
            debugLog('Found loading element with alternative selector');
            loadingEl.classList.add('hidden');
        } else {
            debugError('No loading screen element found with any selector');
        }
    }
}

function formatDate(timestamp) {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ================= AUTH =================
// Add this debug version to help identify the issue

// Add these debug functions at the top of your script
function debugLog(message, data = null) {
    console.log(`[DEBUG] ${message}`, data || '');
}

function debugError(message, error = null) {
    console.error(`[ERROR] ${message}`, error || '');
}

// Replace your onAuthStateChanged with this debug version:
onAuthStateChanged(auth, user => {
    debugLog('Auth state changed', { user: user?.email || 'No user' });
    
    if (user) {
        currentUser = user;
        debugLog('User authenticated, initializing page');
        
        // Add a small delay to ensure DOM is ready
        setTimeout(() => {
            refreshDom();
            initializePage();
        }, 100);
    } else {
        debugError('No authenticated user');
        showToast('You must be logged in to access this page', 'error');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    }
});

// ================ INIT PAGE =================
async function initializePage() {
    try {
        debugLog('Starting page initialization');
        
        // Check if activeTradeId exists
        if (!activeTradeId) {
            debugError('No activeTradeId found');
            showError('No trade ID provided');
            return;
        }
        
        debugLog('Active trade ID', activeTradeId);
        
        // refresh DOM first
        refreshDom();
        debugLog('DOM refreshed');

        // Load trade data
        debugLog('Loading trade data...');
        await loadTradeData();
        debugLog('Trade data loaded successfully');
        
        // Setup event listeners
        debugLog('Setting up event listeners...');
        setupEventListeners();
        debugLog('Event listeners setup complete');
        
        // Hide loading screen
        debugLog('Hiding loading screen...');
        hideLoading();
        debugLog('Loading screen hidden');

        // Show chat interface
        debugLog('Showing chat interface...');
        showChatInterface();
        debugLog('Chat interface shown');
        
    } catch (error) {
        debugError('Error initializing page', error);
        showError(`Failed to load trade data: ${error.message}`);
        hideLoading();
    }
}

// ================ LOAD TRADE DATA ==============
async function loadTradeData() {
    try {
        debugLog('Loading trade data for ID:', activeTradeId);
        
        const activeTradeRef = doc(db, "activeTrades", activeTradeId);
        debugLog('Getting active trade document...');
        const activeTradeSnap = await getDoc(activeTradeRef);

        if (!activeTradeSnap.exists()) {
            debugError('Active trade document does not exist');
            throw new Error("Active trade not found or has been deleted.");
        }

        debugLog('Active trade document found');
        const activeTradeData = activeTradeSnap.data();
        debugLog('Active trade data:', activeTradeData);

        const tradeRef = doc(db, "trades", activeTradeData.tradeId);
        debugLog('Getting original trade document...');
        const tradeSnap = await getDoc(tradeRef);

        if (!tradeSnap.exists()) {
            debugError('Original trade document does not exist');
            throw new Error("Original trade not found.");
        }

        debugLog('Original trade document found');
        tradeData = { id: tradeSnap.id, ...tradeSnap.data(), ...activeTradeData };
        debugLog('Combined trade data:', tradeData);

        // Load owner data
        debugLog('Loading owner data...');
        const ownerRef = doc(db, "users", activeTradeData.ownerId);
        const ownerSnap = await getDoc(ownerRef);
        if (ownerSnap.exists()) {
            userData = { userId: ownerSnap.id, ...ownerSnap.data() };
            debugLog('Owner data loaded from users collection:', userData);
        } else {
            userData = { userId: activeTradeData.ownerId, email: activeTradeData.ownerEmail };
            debugLog('Owner data from active trade (fallback):', userData);
        }

        // Load partner data
        debugLog('Loading partner data...');
        const partnerRef = doc(db, "users", activeTradeData.partnerId);
        const partnerSnap = await getDoc(partnerRef);
        if (partnerSnap.exists()) {
            partnerData = { userId: partnerSnap.id, ...partnerSnap.data() };
            debugLog('Partner data loaded from users collection:', partnerData);
        } else {
            partnerData = { userId: activeTradeData.partnerId, email: activeTradeData.partnerEmail };
            debugLog('Partner data from active trade (fallback):', partnerData);
        }

        debugLog('Updating trade UI...');
        updateTradeUI(tradeData);
        debugLog('Trade UI updated');
        
    } catch (err) {
        debugError("Error in loadTradeData", err);
        throw err;
    }
}

// ================ UPDATE UI ===================
function updateTradeUI(trade) {
    refreshDom();
    const updateElement = (id, content, isHTML = false) => {
        const element = document.getElementById(id);
        if (element) {
            if (isHTML) element.innerHTML = content;
            else element.textContent = content;
        }
    };

    updateElement('trade-title', trade.title || 'Trade Details');
    updateElement('trade-description', trade.description || 'No description available');
    updateElement('trade-category', trade.category || 'General');
    updateElement('trade-date', formatDate(trade.createdAt));
    updateElement('trade-value', trade.value || 'Not specified');
    updateElement('trade-condition', trade.condition || 'Not specified');
    updateElement('trade-method', trade.method || 'Not specified');
    updateElement('trade-location', trade.location || 'Not specified');

    const tradeImage = document.getElementById('trade-image');
    if (tradeImage && trade.imageUrl) {
        tradeImage.src = trade.imageUrl;
    }

    if (dom.tradeStatus) {
        const status = trade.status || 'active';
        const statusColors = {
            'active': 'bg-green-100 text-green-800',
            'completed': 'bg-blue-100 text-blue-800',
            'cancelled': 'bg-red-100 text-red-800'
        };
        const statusTexts = {
            'active': 'Active',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        dom.tradeStatus.className = `px-4 py-2 rounded-full text-sm font-medium ${statusColors[status] || statusColors.active}`;
        dom.tradeStatus.textContent = statusTexts[status] || 'Unknown';
    }

    if (dom.ownerEmail) dom.ownerEmail.textContent = userData?.email || 'Unknown';
    if (dom.partnerEmail) dom.partnerEmail.textContent = partnerData?.email || 'Unknown';

    const ownerInitial = document.getElementById('owner-initial');
    const partnerInitial = document.getElementById('partner-initial');
    if (ownerInitial) ownerInitial.textContent = (userData?.email || 'U')[0].toUpperCase();
    if (partnerInitial) partnerInitial.textContent = (partnerData?.email || 'U')[0].toUpperCase();

    if (document.getElementById('owner-status')) document.getElementById('owner-status').textContent = 'Online';
    if (document.getElementById('partner-status')) document.getElementById('partner-status').textContent = 'Last seen recently';
    if (dom.onlineStatus) dom.onlineStatus.textContent = 'Partner Online';
    if (dom.onlineIndicator) dom.onlineIndicator.className = 'w-2 h-2 rounded-full bg-green-500';
}

// ================ SHOW CHAT INTERFACE ===========
function showChatInterface() {
    debugLog('Showing chat interface');
    refreshDom();
    
    // Check for chat container
    if (dom.chatContainer === undefined) {
        dom.chatContainer = document.getElementById('chat-container');
    }
    
    if (dom.chatContainer) {
        debugLog('Chat container found, making it visible');
        dom.chatContainer.style.display = 'block';
        dom.chatContainer.classList.remove('hidden'); // Also try removing hidden class
    } else {
        debugError('Chat container not found');
    }

    // Check for trade actions
    if (dom.tradeActions) {
        debugLog('Trade actions found, making it visible');
        dom.tradeActions.style.display = 'block';
        dom.tradeActions.classList.remove('hidden');
    } else {
        debugError('Trade actions element not found');
    }

    debugLog('Initializing chat...');
    initializeChat();
}


// ==================== CHAT SETUP ====================
function setupChat() {
    if (!activeTradeId) {
        debugError("No activeTradeId for chat");
        return;
    }

    refreshDom();
    if (!dom.chatBox || !dom.chatInput || !dom.sendBtn) {
        debugError("Chat elements not found in DOM");
        return;
    }

    const messagesRef = collection(db, "activeTrades", activeTradeId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    // Hủy lắng nghe cũ nếu có
    if (chatUnsubscribe) chatUnsubscribe();
    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        dom.chatBox.innerHTML = "";
        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const isMine = currentUser && msg.senderId === currentUser.uid;

            const msgDiv = document.createElement("div");
            msgDiv.className = `p-2 my-1 rounded-lg max-w-[75%] break-words ${
                isMine ? "ml-auto bg-blue-500 text-white" : "mr-auto bg-gray-200 text-black"
            }`;

            if (msg.type === "file") {
                msgDiv.innerHTML = `
                    <div class="text-sm mb-1">${msg.senderEmail || "Unknown"}</div>
                    <a href="${msg.fileUrl}" target="_blank" class="underline">
                        <i class="fas ${getFileIcon(msg.fileName)}"></i> ${msg.fileName} (${msg.fileSize})
                    </a>
                    <div class="text-xs text-gray-500">${msg.createdAt?.toDate().toLocaleString() || ""}</div>
                `;
            } else {
                msgDiv.innerHTML = `
                    <div class="text-sm">${msg.senderEmail || "Unknown"}</div>
                    <div>${msg.text || ""}</div>
                    <div class="text-xs text-gray-500">${msg.createdAt?.toDate().toLocaleString() || ""}</div>
                `;
            }

            dom.chatBox.appendChild(msgDiv);
        });
        dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
    });

    // Gửi tin nhắn
    dom.chatForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        await sendMessage();
    });
    dom.sendBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        await sendMessage();
    });
    dom.chatInput?.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await sendMessage();
        }
    });
}

// ==================== SEND MESSAGE ====================
async function sendMessage() {
    refreshDom();
    const text = dom.chatInput?.value?.trim();
    if (!text && !selectedFile) return;
    if (!currentUser || !activeTradeId) {
        showToast("Cannot send message: not logged in or trade missing", "error");
        return;
    }

    try {
        const messageData = {
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            createdAt: serverTimestamp(),
            type: selectedFile ? "file" : "text",
        };

        if (text) messageData.text = text;

        if (selectedFile) {
            const storageRef = ref(
                storage,
                `trades/${activeTradeId}/files/${Date.now()}_${selectedFile.name}`
            );
            await uploadBytes(storageRef, selectedFile);
            const fileUrl = await getDownloadURL(storageRef);

            messageData.fileName = selectedFile.name;
            messageData.fileSize = formatFileSize(selectedFile.size);
            messageData.fileUrl = fileUrl;
        }

        await addDoc(collection(db, "activeTrades", activeTradeId, "messages"), messageData);

        // reset
        if (dom.chatInput) dom.chatInput.value = "";
        selectedFile = null;
        dom.filePreview?.classList.add("hidden");
        if (dom.fileInput) dom.fileInput.value = "";
        if (dom.charCount) dom.charCount.textContent = "500 characters left";

        hideTypingIndicator();
    } catch (error) {
        debugError("Error sending message", error);
        showToast("Failed to send message", "error");
    }
}

// ================ FILE HANDLING ================
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showToast('File size must be less than 5MB', 'error');
        return;
    }

    selectedFile = file;

    refreshDom();
    if (dom.fileName) dom.fileName.textContent = file.name;
    if (dom.fileSize) dom.fileSize.textContent = formatFileSize(file.size);
    if (dom.filePreview) dom.filePreview.classList.remove('hidden');
}

// ================ EVENT LISTENERS ==============
function setupEventListeners() {
    refreshDom();

    // chat submit
    if (dom.chatForm) {
        dom.chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendMessage();
        });
    }

    if (dom.sendBtn) {
        dom.sendBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await sendMessage();
        });
    }

    // char count + typing
    if (dom.chatInput) {
        dom.chatInput.addEventListener('input', () => {
            const maxLength = 500;
            const remaining = maxLength - dom.chatInput.value.length;
            if (dom.charCount) {
                dom.charCount.textContent = `${remaining} characters left`;
                if (remaining < 0) {
                    dom.charCount.classList.add('text-red-500');
                    if (dom.sendBtn) dom.sendBtn.disabled = true;
                } else {
                    dom.charCount.classList.remove('text-red-500');
                    if (dom.sendBtn) dom.sendBtn.disabled = false;
                }
            }
            showTypingIndicator();
        });

        dom.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) return;
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // file button
    if (dom.fileBtn) {
        dom.fileBtn.addEventListener('click', () => {
            if (dom.fileInput) dom.fileInput.click();
        });
    }

    if (dom.fileInput) {
        dom.fileInput.addEventListener('change', handleFileSelect);
    }

    // attach-file top-right
    const attachFileBtn = document.getElementById('attach-file-btn');
    if (attachFileBtn) {
        attachFileBtn.addEventListener('click', () => {
            if (dom.fileInput) dom.fileInput.click();
        });
    }

    // remove file button - add once
    const removeFileBtn = document.getElementById('remove-file');
    if (removeFileBtn) {
        removeFileBtn.addEventListener('click', () => {
            selectedFile = null;
            if (dom.filePreview) dom.filePreview.classList.add('hidden');
            if (dom.fileInput) dom.fileInput.value = '';
            if (dom.fileName) dom.fileName.textContent = 'File selected';
            if (dom.fileSize) dom.fileSize.textContent = '0 KB';
        });
    }

    // quick actions, trade actions, modals, calls, logout
    setupTradeActionButtons();
    setupQuickActionButtons();
    setupModalHandlers();
    setupCallButtons();

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                window.location.href = 'home.html';
            } catch (error) {
                showToast('Failed to sign out', 'error');
            }
        });
    }
}

function setupTradeActions(tradeId) {
    // Mark Complete
    const completeBtn = document.getElementById('mark-complete-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', async () => {
            try {
                await updateDoc(doc(db, "trades", tradeId), {
                    status: "completed",
                    completedAt: serverTimestamp()
                });
                showToast("✅ Trade marked as complete!");
            } catch (error) {
                console.error("Error marking trade complete:", error);
                showError("Failed to mark trade complete.");
            }
        });
    }

    // Cancel Trade
    const cancelBtn = document.getElementById('cancel-trade-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', async () => {
            try {
                await updateDoc(doc(db, "trades", tradeId), {
                    status: "cancelled",
                    cancelledAt: serverTimestamp()
                });
                showToast("❌ Trade cancelled.");
            } catch (error) {
                console.error("Error cancelling trade:", error);
                showError("Failed to cancel trade.");
            }
        });
    }

    // Report Trade
    const reportBtn = document.getElementById('report-trade-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', async () => {
            try {
                await updateDoc(doc(db, "trades", tradeId), {
                    report: {
                        reportedBy: auth.currentUser ? auth.currentUser.uid : null,
                        reportedAt: serverTimestamp()
                    },
                    status: "reported"
                });
                showToast("⚠️ Trade reported to admin.");
            } catch (error) {
                console.error("Error reporting trade:", error);
                showError("Failed to report trade.");
            }
        });
    }
}


function setupQuickActionButtons() {
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.textContent.trim();
            let message = '';

            switch (action) {
                case 'Request photos':
                    message = 'Could you please share some additional photos of the item?';
                    break;
                case 'Ask about condition':
                    message = 'Can you tell me more about the condition of the item?';
                    break;
                case 'Suggest meeting location':
                    message = 'Would you like to meet at a public place like a coffee shop?';
                    break;
                case 'Negotiate terms':
                    message = 'I\'d like to discuss the terms of this trade. Are you flexible on the price?';

                    break;
            }

            refreshDom();
            if (dom.chatInput && message) {
                dom.chatInput.value = message;
                dom.chatInput.focus();
            }
        });
    });
}

function setupModalHandlers() {
    const closeErrorBtn = document.getElementById('close-error-modal');
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener('click', () => {
            refreshDom();
            if (dom.errorModal) dom.errorModal.classList.add('hidden');
        });
    }

    const closeToastBtn = document.getElementById('close-toast');
    if (closeToastBtn) {
        closeToastBtn.addEventListener('click', () => {
            refreshDom();
            const toast = document.getElementById('toast');
            if (toast) toast.classList.add('hidden');
        });
    }

    const closeConfirmBtn = document.getElementById('confirm-cancel');
    if (closeConfirmBtn) {
        closeConfirmBtn.addEventListener('click', () => {
            refreshDom();
            if (dom.confirmationModal) dom.confirmationModal.classList.add('hidden');
        });
    }
}


function setupCallButtons() {
    const voiceCallBtn = document.getElementById('voice-call-btn');
    if (voiceCallBtn) {
        voiceCallBtn.addEventListener('click', () => {
            showToast("📞 Voice Call feature is under development.");
        });
    }

    const videoCallBtn = document.getElementById('video-call-btn');
    if (videoCallBtn) {
        videoCallBtn.addEventListener('click', () => {
            showToast("🎥 Video Call feature is under development.");
        });
    }
}


// ================ TYPING INDICATOR =============
function showTypingIndicator() {
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => hideTypingIndicator(), 2000);
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) typingIndicator.classList.add('hidden');
}

function setupTypingIndicator() {
    const typingEl = document.getElementById('typing-indicator');
    if (!dom.chatInput || !typingEl) return;

    dom.chatInput.addEventListener('input', () => {
        typingEl.classList.remove('hidden');
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            typingEl.classList.add('hidden');
        }, 1500);
    });
}

function hideTypingIndicator() {
    const typingEl = document.getElementById('typing-indicator');
    if (typingEl) typingEl.classList.add('hidden');
}


// ================ LOGIN PAGE ===================
function showLoginPage() {
    showToast('Please log in to access this page', 'warning');
    setTimeout(() => {
        window.location.href = 'home.html';
    }, 2000);
}

// ================ CLEANUP =====================
function cleanup() {
    if (chatUnsubscribe) {
        try { chatUnsubscribe(); } catch (e) { /*ignore*/ }
        chatUnsubscribe = null;
    }
    if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
    }
    if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
    }
}
function checkDOMElements() {
    debugLog('Checking DOM elements...');
    
    const elements = [
        'loading-screen',
        'chat-container', 
        'chat-box',
        'chat-form',
        'chat-input',
        'send-btn'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            debugLog(`✓ Found element: ${id}`);
        } else {
            debugError(`✗ Missing element: ${id}`);
        }
    });
}
document.addEventListener('DOMContentLoaded', () => {
    debugLog('DOM Content Loaded');
    checkDOMElements();
});
window.addEventListener('load', () => {
    debugLog('Window fully loaded');
    checkDOMElements();
});


// trước unload
window.addEventListener('beforeunload', cleanup);

// xuất ra để debug trong console
window.tradeApp = {
    showToast,
    showConfirmation,
    sendMessage,
    addMessageToChat,
    loadTradeData,
    cleanup
};
