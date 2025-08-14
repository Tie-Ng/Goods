import { auth } from './auth.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";


// js/navbar.js

window.addEventListener("DOMContentLoaded", async () => {
  const res = await fetch("navbar.html");
  const html = await res.text();
  document.getElementById("navbar-container").innerHTML = html;

  const authScript = document.createElement("script");
  authScript.src = "js/auth.js";
  document.body.appendChild(authScript);
});


// ✅ Switch tab đăng nhập/đăng ký
window.switchAuthTab = function (tab) {
  const loginForm = document.getElementById("form-login");
  const signupForm = document.getElementById("form-signup");
  const loginTab = document.getElementById("tab-login");
  const signupTab = document.getElementById("tab-signup");

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
    loginTab.classList.add("border-blue-600", "text-blue-600", "font-semibold");
    loginTab.classList.remove("border-transparent", "text-gray-500");
    signupTab.classList.remove("border-blue-600", "text-blue-600", "font-semibold");
    signupTab.classList.add("border-transparent", "text-gray-500");
  } else {
    loginForm.classList.add("hidden");
    signupForm.classList.remove("hidden");
    signupTab.classList.add("border-blue-600", "text-blue-600", "font-semibold");
    signupTab.classList.remove("border-transparent", "text-gray-500");
    loginTab.classList.remove("border-blue-600", "text-blue-600", "font-semibold");
    loginTab.classList.add("border-transparent", "text-gray-500");
  }
};

// ✅ Mở / đóng modal
window.openModal = function (tab = "login") {
  const modal = document.getElementById("auth-modal");
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("auth-content");

  modal.classList.remove("hidden");
  overlay.classList.remove("hidden");

  setTimeout(() => {
    content.classList.add("scale-100", "opacity-100");
  }, 10);

  switchAuthTab(tab);
};

window.closeModal = function () {
  const modal = document.getElementById("auth-modal");
  const overlay = document.getElementById("modal-overlay");
  const content = document.getElementById("auth-content");

  content.classList.remove("scale-100", "opacity-100");
  content.classList.add("scale-95", "opacity-0");

  setTimeout(() => {
    modal.classList.add("hidden");
    overlay.classList.add("hidden");
    content.classList.remove("scale-95", "opacity-0");
    content.classList.add("scale-100", "opacity-100");
  }, 200);
};

// ✅ Toast thông báo
function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  toastMessage.textContent = message;

  toast.className = `fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${type === 'success'
    ? 'bg-green-100 text-green-800 border border-green-300'
    : 'bg-red-100 text-red-800 border border-red-300'
    }`;

  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// ✅ Đăng ký tài khoản
window.signup = async function () {
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });
    await sendEmailVerification(user);

    showToast("🎉 Đăng ký thành công! Kiểm tra email xác minh để kích hoạt tài khoản.", "success");

    await signOut(auth); // ❗ Đăng xuất sau khi đăng ký để không dùng khi chưa xác minh
    closeModal();
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      showToast("📧 Email đã được sử dụng!", "error");
    } else if (error.code === 'auth/weak-password') {
      showToast("🔐 Mật khẩu quá yếu!", "error");
    } else {
      showToast("❌ Lỗi đăng ký: " + error.message, "error");
    }
  }
};


// ✅ Đăng nhập
window.login = async function () {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!user.emailVerified) {
      await sendEmailVerification(user);
      showToast("📩 Email chưa xác minh. Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.", "error");
      await signOut(auth); // ❗ Không cho đăng nhập nếu chưa xác minh
      return;
    }

    showToast("✅ Đăng nhập thành công!", "success");
    closeModal();
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      showToast("👤 Tài khoản không tồn tại!", 'error');
    } else if (error.code === 'auth/wrong-password') {
      showToast("🔑 Mật khẩu không chính xác!", 'error');
    } else {
      showToast("🚫 Đăng nhập thất bại: " + error.message, 'error');
    }
  }
};


// ✅ Đăng xuất
window.logout = function () {
  signOut(auth)
    .then(() => {
      showToast("👋 Đã đăng xuất!", "success");
      location.reload(); // reload lại UI
    })
    .catch(err => showToast("❌ Lỗi khi đăng xuất: " + err.message, 'error'));
};

// ✅ Theo dõi đăng nhập
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    document.getElementById("login-btn")?.classList.add("hidden");
    document.getElementById("user-dropdown").classList.remove("hidden");

    const name = user.displayName || user.email;
    document.getElementById("user-name").textContent = `👋 ${name}`;
  } else {
    document.getElementById("login-btn")?.classList.remove("hidden");
    document.getElementById("user-dropdown").classList.add("hidden");
  }
});


// ✅ Gửi lại email xác minh
window.resendVerificationEmail = function () {
  const user = auth.currentUser;

  if (user) {
    sendEmailVerification(user)
      .then(() => {
        alert("📩 Email xác minh đã được gửi lại.");
      })
      .catch((error) => {
        alert("❌ Lỗi gửi lại email: " + error.message);
      });
  } else {
    alert("⚠️ Bạn cần đăng nhập trước khi gửi lại email xác minh.");
  }
};

// ✅ Dropdown toggle + animation
document.addEventListener('click', function (event) {
  const button = document.getElementById("user-button");
  const menu = document.getElementById("dropdown-menu");

  if (button.contains(event.target)) {
    menu.classList.toggle("hidden");

    if (!menu.classList.contains("hidden")) {
      setTimeout(() => {
        menu.classList.remove("opacity-0", "scale-95");
        menu.classList.add("opacity-100", "scale-100");
      }, 10);
    } else {
      menu.classList.remove("opacity-100", "scale-100");
      menu.classList.add("opacity-0", "scale-95");
    }
  } else if (!menu.contains(event.target)) {
    menu.classList.add("hidden", "opacity-0", "scale-95");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const navbarContainer = document.getElementById("navbar-container");
  if (navbarContainer) {
    navbarContainer.innerHTML = `
      <nav class="bg-white shadow-md p-4 flex justify-between items-center">
        <div class="text-xl font-bold text-blue-600">Trang chủ</div>
        <div class="space-x-4">
          <a href="home.html" class="text-gray-700 hover:text-blue-600">Home</a>
          <a href="trade.html" class="text-gray-700 hover:text-blue-600">Trao đổi</a>
          <a href="about.html" class="text-gray-700 hover:text-blue-600">Giới thiệu</a>
          <button id="logoutBtn" class="text-red-600 hover:underline">Đăng xuất</button>
        </div>
      </nav>
    `;
  }
});// js/navbar.js
document.addEventListener("DOMContentLoaded", () => {
  const navbarContainer = document.getElementById("navbar-container");
  if (navbarContainer) {
    navbarContainer.innerHTML = `
      <nav class="bg-white shadow-md p-4 flex justify-between items-center">
        <div class="text-xl font-bold text-blue-600">Goods</div>
        <div class="space-x-4">
          <a href="home.html" class="text-gray-700 hover:text-blue-600">Trang chủ</a>
          <a href="trade.html" class="text-gray-700 hover:text-blue-600">Trao đổi</a>
          <a href="about.html" class="text-gray-700 hover:text-blue-600">Giới thiệu</a>
          <button id="logoutBtn" class="text-red-600 hover:underline">Đăng xuất</button>
        </div>
      </nav>
    `;
  } else {
    console.warn("Không tìm thấy phần tử #navbar-container");
  }
});

