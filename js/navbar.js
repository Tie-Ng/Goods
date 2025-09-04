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

// ✅ Switch login / signup tab
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

// ✅ Open / close modal
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

// ✅ Toast notification
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");

  if (!toast || !toastMessage) return;

  // Gán nội dung
  toastMessage.textContent = message;

  // Reset class
  toast.className =
    "fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300";

  // Thêm màu theo type
  if (type === "success") {
    toast.classList.add("bg-green-100", "text-green-800", "border", "border-green-300");
  } else {
    toast.classList.add("bg-red-100", "text-red-800", "border", "border-red-300");
  }

  // Hiện toast
  toast.classList.remove("hidden");

  // 3s sau tự ẩn
  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// ✅ Sign up
window.signup = async function () {
  const name = document.getElementById("signup-name").value;
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });
    await sendEmailVerification(user);

    showToast("🎉 Registration successful! Please check your inbox to verify your email.", "success");

    await signOut(auth); // logout until verified
    closeModal();
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      showToast("📧 Email is already in use!", "error");
    } else if (error.code === 'auth/weak-password') {
      showToast("🔐 Password is too weak!", "error");
    } else {
      showToast("❌ Registration failed: " + error.message, "error");
    }
  }
};

// ✅ Login
window.login = async function () {
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 🔑 Special case for admin
    if (user.email === "admin@gmail.com") {
      window.location.href = "./adpage.html";
      return;
    }

    // 👤 Regular users must verify email
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      showToast("📩 Please verify your email before logging in.", "error");
      await signOut(auth);
      return;
    }

    showToast("✅ Login successful!", "success");
    closeModal();
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      showToast("👤 Account does not exist!", 'error');
    } else if (error.code === 'auth/wrong-password') {
      showToast("🔑 Incorrect password!", 'error');
    } else {
      showToast("🚫 Login failed: " + error.message, 'error');
    }
  }
};

// ✅ Logout
window.logout = function () {
  signOut(auth)
    .then(() => {
      showToast("👋 Logged out!", "success");
      location.reload();
    })
    .catch(err => showToast("❌ Logout failed: " + err.message, 'error'));
};

// ✅ Auth state listener
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (user.email === "admin@gmail.com") {
      // auto-redirect if admin
      window.location.href = "./adpage.html";
    } else if (user.emailVerified) {
      document.getElementById("login-btn")?.classList.add("hidden");
      document.getElementById("user-dropdown").classList.remove("hidden");

      const name = user.displayName || user.email;
      document.getElementById("user-name").textContent = `👋 ${name}`;
    }
  } else {
    document.getElementById("login-btn")?.classList.remove("hidden");
    document.getElementById("user-dropdown").classList.add("hidden");
  }
});

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

// ✅ Navbar rendering
document.addEventListener("DOMContentLoaded", () => {
  const navbarContainer = document.getElementById("navbar-container");
  if (navbarContainer) {
    navbarContainer.innerHTML = `
      <nav class="bg-white shadow-md p-4 flex justify-between items-center">
        <div class="text-xl font-bold text-blue-600">Goods</div>
        <div class="space-x-4">
          <a href="home.html" class="text-gray-700 hover:text-blue-600">Home</a>
          <a href="trade.html" class="text-gray-700 hover:text-blue-600">Trade</a>
          <a href="about.html" class="text-gray-700 hover:text-blue-600">About</a>
          <button id="logoutBtn" class="text-red-600 hover:underline">Logout</button>
        </div>
      </nav>
    `;
  } else {
    console.warn("Navbar container #navbar-container not found");
  }
});
