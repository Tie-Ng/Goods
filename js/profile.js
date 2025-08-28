// ==================== IMPORTS ====================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ==================== FIREBASE INIT ====================
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

// ==================== TOAST FUNCTION ====================
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-white animate-fade-in-up`;
  toast.innerHTML =
    type === "success"
      ? `✅ <span>${message}</span>`
      : `❌ <span>${message}</span>`;

  toast.classList.add(
    "bg-gradient-to-r",
    ...(type === "success"
      ? ["from-green-400", "to-green-600"]
      : ["from-red-400", "to-red-600"])
  );

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("opacity-0", "translate-x-5", "transition");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
window.showToast = showToast;

// ==================== RANDOM COLOR HELPER ====================
function getColorFromUID(uid) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500"
  ];
  if (!uid) return colors[0];
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ==================== SET DEFAULT AVATAR ====================
function setDefaultAvatar(user, name) {
  const avatarDiv = document.getElementById("avatarPreview");
  let initial = "?";

  if (name && name.trim() !== "") {
    initial = name.trim().charAt(0).toUpperCase();
  } else if (user?.email) {
    initial = user.email.charAt(0).toUpperCase();
  }

  avatarDiv.textContent = initial;

  // reset class
  avatarDiv.className =
    "w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl mb-3 " +
    getColorFromUID(user?.uid);
}

// ==================== LOAD PROFILE ====================
async function loadProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();

      // gán các field từ Firestore
      document.getElementById("name").value = data.name || "";
      document.getElementById("phone").value = data.phone || "";
      document.getElementById("bio").value = data.bio || "";
      document.getElementById("profile-email").value = user.email || "";

      // ✅ avatar ưu tiên dùng nickname (name)
      setDefaultAvatar(user, data.name);
      
      // ✅ hiển thị tên nickname ra ngoài (ví dụ ở header hoặc chỗ hiển thị tên user)
      const displayNameEl = document.getElementById("displayName");
      if (displayNameEl) {
        displayNameEl.textContent = data.name && data.name.trim() !== "" 
          ? data.name 
          : "(Chưa đặt tên)";
      }

    } else {
      // nếu chưa có doc thì tạo doc trống
      await setDoc(userRef, {
        name: "",
        phone: "",
        bio: "",
        email: user.email
      });
      document.getElementById("profile-email").value = user.email || "";
      setDefaultAvatar(user, "");

      const displayNameEl = document.getElementById("displayName");
      if (displayNameEl) {
        displayNameEl.textContent = "(Chưa đặt tên)";
      }
    }
  } catch (err) {
    console.error("Lỗi load profile:", err);
    showToast("Không tải được thông tin!", "error");
  }
}


// ==================== SAVE PROFILE ====================
// ==================== SAVE PROFILE ====================
document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return showToast("Bạn cần đăng nhập trước!", "error");

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const bio = document.getElementById("bio").value.trim();

  const userRef = doc(db, "users", user.uid);

  try {
    let updateData = { name, phone, bio, email: user.email };
    await updateDoc(userRef, updateData);

    setDefaultAvatar(user, name); // update avatar chữ cái đầu
    showToast("Cập nhật thông tin thành công!", "success");

    // 🔥 Cập nhật ngay navbar với nickname mới
    const navbarNameEl = document.getElementById("navbarName");
    if (navbarNameEl) {
      navbarNameEl.textContent = name !== "" ? name : "(Chưa đặt tên)";
    }
  } catch (err) {
    console.error("Lỗi update:", err);
    showToast("Có lỗi khi lưu thông tin!", "error");
  }
});


// ==================== AUTH LISTENER ====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await loadProfile(user);

    // 🔥 Lấy nickname để hiện ở navbar
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);

    const navbarNameEl = document.getElementById("navbarName"); // trong navbar phải có span/div này
    if (navbarNameEl) {
      if (snap.exists() && snap.data().name && snap.data().name.trim() !== "") {
        navbarNameEl.textContent = snap.data().name;
      } else {
        navbarNameEl.textContent = "(Chưa đặt tên)";
      }
    }
  } else {
    showToast("Bạn chưa đăng nhập!", "error");

    // nếu logout thì xóa tên khỏi navbar
    const navbarNameEl = document.getElementById("navbarName");
    if (navbarNameEl) navbarNameEl.textContent = "Khách";
  }
});
