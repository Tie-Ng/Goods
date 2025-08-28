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
    refreshDom();
    if (dom.loadingScreen) {
        dom.loadingScreen.classList.add('hidden');
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
onAuthStateChanged(auth, user => {
    if (user) {
        currentUser = user;
        // đảm bảo DOM đã sẵn sàng
        refreshDom();
        initializePage();
    } else {
        showToast('You must be logged in to access this page', 'error');
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 2000);
    }
});

// ================ INIT PAGE =================
async function initializePage() {
    try {
        // refresh DOM trước mọi thao tác
        refreshDom();

        await loadTradeData();
        setupEventListeners();
        hideLoading();

        // hiển thị chat/trade actions chỉ khi có activeTradeId & currentUser (initializeChat sẽ check lại)
        showChatInterface();
    } catch (error) {
        console.error('Error initializing page:', error);
        showError('Failed to load trade data. Please try again.');
        hideLoading();
    }
}

// ================ LOAD TRADE DATA ==============
async function loadTradeData() {
    try {
        const activeTradeRef = doc(db, "activeTrades", activeTradeId);
        const activeTradeSnap = await getDoc(activeTradeRef);

        if (!activeTradeSnap.exists()) {
            throw new Error("Active trade not found or has been deleted.");
        }

        const activeTradeData = activeTradeSnap.data();

        const tradeRef = doc(db, "trades", activeTradeData.tradeId);
        const tradeSnap = await getDoc(tradeRef);

        if (!tradeSnap.exists()) {
            throw new Error("Original trade not found.");
        }

        tradeData = { id: tradeSnap.id, ...tradeSnap.data(), ...activeTradeData };

        // Owner
        const ownerRef = doc(db, "users", activeTradeData.ownerId);
        const ownerSnap = await getDoc(ownerRef);
        if (ownerSnap.exists()) {
            userData = { userId: ownerSnap.id, ...ownerSnap.data() };
        } else {
            userData = { userId: activeTradeData.ownerId, email: activeTradeData.ownerEmail };
        }

        // Partner
        const partnerRef = doc(db, "users", activeTradeData.partnerId);
        const partnerSnap = await getDoc(partnerRef);
        if (partnerSnap.exists()) {
            partnerData = { userId: partnerSnap.id, ...partnerSnap.data() };
        } else {
            partnerData = { userId: activeTradeData.partnerId, email: activeTradeData.partnerEmail };
        }

        updateTradeUI(tradeData);
    } catch (err) {
        console.error("Error loading trade:", err);
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
    refreshDom();
    if (dom.chatContainer === undefined) dom.chatContainer = document.getElementById('chat-container');

    // show container (if có)
    if (dom.chatContainer) dom.chatContainer.style.display = 'block';

    // show trade actions (fallback nếu id không có)
    if (dom.tradeActions) {
        dom.tradeActions.style.display = 'block';
    }

    initializeChat();
}

// ================ CHAT SYSTEM ==================
function initializeChat() {
    refreshDom();
    // giữ nguyên check: chỉ lắng nghe khi có trade & user
    if (!activeTradeId || !currentUser) {
        console.warn('initializeChat: missing activeTradeId or currentUser', { activeTradeId, currentUser });
        return;
    }

    const messagesRef = collection(db, `activeTrades/${activeTradeId}/messages`);
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    // unsubscribe cũ
    if (chatUnsubscribe) {
        try { chatUnsubscribe(); } catch (e) { /* ignore */ }
        chatUnsubscribe = null;
    }

    chatUnsubscribe = onSnapshot(q, (snapshot) => {
        refreshDom();
        if (dom.chatBox) {
            dom.chatBox.innerHTML = '';
            if (snapshot.empty) {
                // để placeholder nếu rỗng
                dom.chatBox.innerHTML = `
                    <div class="text-center text-gray-500 py-8">
                        <i class="fas fa-comment-dots text-4xl mb-4 text-blue-300"></i>
                        <p class="text-lg font-medium">Start Your Conversation</p>
                        <p class="text-sm">All messages are encrypted and secure</p>
                    </div>
                `;
            } else {
                snapshot.forEach((docSnap) => {
                    const message = { id: docSnap.id, ...docSnap.data() };
                    addMessageToChat(message);
                });
            }
            dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
        }
    }, (error) => {
        console.error("Error loading messages:", error);
        // fallback demo
        loadDemoMessages();
    });

    setupTypingIndicator();
}

function loadDemoMessages() {
    refreshDom();
    if (!dom.chatBox) return;

    const demoMessages = [
        {
            senderId: partnerData?.userId || 'partner123',
            type: 'text',
            text: "Hi! I'm interested in your item.",
            createdAt: new Date(Date.now() - 3600000)
        },
        {
            senderId: currentUser?.uid || 'current123',
            type: 'text',
            text: "Hello! Yes, it's still available.",
            createdAt: new Date(Date.now() - 3300000)
        },
    ];



    dom.chatBox.innerHTML = '';
    demoMessages.forEach(message => addMessageToChat(message));
    dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
}

function addMessageToChat(message) {
    refreshDom();
    if (!dom.chatBox) return;

    const messageDiv = document.createElement('div');
    const isSent = message.senderId === currentUser?.uid;
    messageDiv.className = `flex mb-4 ${isSent ? 'justify-end' : 'justify-start'}`;

    let messageContent = '';
    const timestamp = message.createdAt ? formatDate(message.createdAt) : 'Just now';

    if (message.type === 'text') {
        messageContent = message.text || '';
    } else if (message.type === 'file') {
        const fileName = message.fileName || 'File';
        const fileIcon = getFileIcon(message.fileName);
        messageContent = `
            <div class="file-attachment mb-2">
                <div class="flex items-center space-x-3 p-3 rounded-lg ${isSent ? 'bg-white/20' : 'bg-blue-50'}">
                    <i class="fas ${fileIcon} text-lg"></i>
                    <div class="flex-1">
                        <div class="font-medium">${fileName}</div>
                        <div class="text-xs opacity-75">${message.fileSize || 'Unknown size'}</div>
                    </div>
                    ${message.fileUrl ? `<a href="${message.fileUrl}" target="_blank" class="text-blue-600 hover:text-blue-800"><i class="fas fa-download"></i></a>` : ''}
                </div>
            </div>
        `;
        if (message.text) {
            messageContent += `<div class="mt-2">${message.text}</div>`;
        }
    }

    messageDiv.innerHTML = `
        <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isSent ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-200 text-gray-800 mr-auto'}">
            <div class="message-content">${messageContent}</div>
            <div class="text-xs opacity-75 mt-1">${timestamp}</div>
        </div>
    `;

    dom.chatBox.appendChild(messageDiv);
    dom.chatBox.scrollTop = dom.chatBox.scrollHeight;
}

function getFileIcon(fileName) {
    if (!fileName) return 'fa-file';
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'jpg': case 'jpeg': case 'png': case 'gif': case 'webp': return 'fa-file-image';
        case 'pdf': return 'fa-file-pdf';
        case 'doc': case 'docx': return 'fa-file-word';
        case 'xls': case 'xlsx': return 'fa-file-excel';
        case 'mp4': case 'mov': case 'avi': return 'fa-file-video';
        case 'mp3': case 'wav': return 'fa-file-audio';
        default: return 'fa-file';
    }
}

// ================ SEND MESSAGE =================
async function sendMessage() {
    refreshDom();
    const text = dom.chatInput?.value?.trim();
    if (!text && !selectedFile) return;
    if (!currentUser || !activeTradeId) {
        showToast('Cannot send message: not logged in or trade missing', 'error');
        return;
    }

    try {
        const messageData = {
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            createdAt: serverTimestamp(),
            type: selectedFile ? 'file' : 'text'
        };

        if (text) messageData.text = text;

        if (selectedFile) {
            const storageRef = ref(storage, `trades/${activeTradeId}/files/${Date.now()}_${selectedFile.name}`);
            await uploadBytes(storageRef, selectedFile);
            const fileUrl = await getDownloadURL(storageRef);

            messageData.fileName = selectedFile.name;
            messageData.fileSize = formatFileSize(selectedFile.size);
            messageData.fileUrl = fileUrl;
        }

        await addDoc(collection(db, `activeTrades/${activeTradeId}/messages`), messageData);

        // reset inputs
        if (dom.chatInput) dom.chatInput.value = '';
        selectedFile = null;
        if (dom.filePreview) dom.filePreview.classList.add('hidden');
        if (dom.fileInput) dom.fileInput.value = '';
        if (dom.charCount) dom.charCount.textContent = '500 characters left';

        hideTypingIndicator();

    } catch (error) {
        console.error('Error sending message:', error);
        showToast('Failed to send message', 'error');
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

function setupTradeActionButtons() {
    const completeBtn = document.getElementById('complete-trade-btn');
    if (completeBtn) {
        completeBtn.addEventListener('click', () => {
            showConfirmation(
                'Complete Trade',
                'Are you sure you want to mark this trade as completed? This action cannot be undone.',
                async () => {
                    try {
                        await updateDoc(doc(db, "activeTrades", activeTradeId), {
                            status: "completed",
                            completedAt: serverTimestamp()
                        });
                        showToast('Trade marked as completed!', 'success');
                        if (dom.tradeStatus) {
                            dom.tradeStatus.textContent = 'Completed';
                            dom.tradeStatus.className = 'px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800';
                        }
                    } catch (error) {
                        console.error('Error completing trade:', error);
                        showToast('Failed to complete trade', 'error');
                    }
                },
                'info'
            );
        });
    }

    const scheduleBtn = document.getElementById('schedule-meetup-btn');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', () => {
            showToast('Meetup scheduling feature coming soon!', 'info');
        });
    }

    const cancelBtn = document.getElementById('cancel-trade-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            showConfirmation(
                'Cancel Trade',
                'Are you sure you want to cancel this trade? This will notify the other party.',
                async () => {
                    try {
                        await updateDoc(doc(db, "activeTrades", activeTradeId), {
                            status: "cancelled",
                            cancelledAt: serverTimestamp()
                        });
                        showToast('Trade cancelled successfully', 'warning');
                        if (dom.tradeStatus) {
                            dom.tradeStatus.textContent = 'Cancelled';
                            dom.tradeStatus.className = 'px-4 py-2 rounded-full text-sm font-medium bg-red-100 text-red-800';
                        }
                    } catch (error) {
                        console.error('Error cancelling trade:', error);
                        showToast('Failed to cancel trade', 'error');
                    }
                }
            );
        });
    }

    const reportBtn = document.getElementById('report-trade-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            showConfirmation(
                'Report Issue',
                'This will report the trade to our support team for review. Please provide details in your next message.',
                () => {
                    showToast('Report submitted. Our team will review this trade.', 'warning');
                }
            );
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
            const toast = document.getElementById('toast');
            if (toast) toast.classList.add('hidden');
        });
    }
}

function setupCallButtons() {
    const voiceBtn = document.getElementById('voice-call-btn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', () => {
            showToast('Voice calling feature coming soon!', 'info');
        });
    }

    const videoBtn = document.getElementById('video-call-btn');
    if (videoBtn) {
        videoBtn.addEventListener('click', () => {
            showToast('Video calling feature coming soon!', 'info');
        });
    }

    const emojiBtn = document.getElementById('emoji-btn');
    if (emojiBtn) {
        emojiBtn.addEventListener('click', () => {
            showToast('Emoji picker coming soon!', 'info');
        });
    }

    const gifBtn = document.getElementById('gif-btn');
    if (gifBtn) {
        gifBtn.addEventListener('click', () => {
            showToast('GIF selector coming soon!', 'info');
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
    // clear cũ nếu có
    if (typingInterval) clearInterval(typingInterval);
    typingInterval = setInterval(() => {
        if (Math.random() < 0.1) {
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.classList.remove('hidden');
                setTimeout(() => typingIndicator.classList.add('hidden'), 3000);
            }
        }
    }, 10000);
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
