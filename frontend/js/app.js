import { store } from "./store.js";
import { router } from "./router.js";
import { authService } from "./services/auth.service.js";
import { notificationService } from "./services/notification.service.js";
import { toast } from "./utils/toast.js";
import { modalManager } from "./utils/modal.js";
import { BACKEND_URL } from "./services/api.js";

// Update Topbar username and avatar from store
function updateTopbarUserUI() {
    const user = store.state.user;
    const usernameEl = document.getElementById("topbar-username");
    const avatarEl = document.getElementById("topbar-avatar");

    if (usernameEl) {
        usernameEl.textContent = user ? user.username : "Guest";
    }

    if (avatarEl) {
        if (user && user.profile_image) {
            avatarEl.src = `${BACKEND_URL}/uploads/${user.profile_image}`;

        } else {
            avatarEl.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23a855f7'><circle cx='50' cy='35' r='20'/><path d='M50,60 C30,60 15,75 15,90 L85,90 C85,75 70,60 50,60 Z'/></svg>";
        }
    }
}

// Check if user has active session and retrieve profile
async function verifySession() {
    if (store.state.accessToken) {
        try {
            const user = await authService.getProfile();
            store.setUser(user);
            updateTopbarUserUI();
            // Load initial notification unread count
            const countData = await notificationService.getUnreadCount();
            store.state.unreadNotificationCount = countData.unread_count;
            updateNotificationBadge();
        } catch (error) {
            console.warn("Session verification failed. Clearing credentials.", error);
            store.clearSession();
            updateTopbarUserUI();
        }
    } else {
        updateTopbarUserUI();
    }
}

// Update bell badge count UI
function updateNotificationBadge() {
    const badge = document.getElementById("notif-badge");
    if (badge) {
        const count = store.state.unreadNotificationCount;
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
    }
}

// Load external UI components programmatically
async function loadGlobalComponents() {
    try {
        const version = "1.0.0";
        const [sidebarHtml, topbarHtml, modalsHtml, toastHtml] = await Promise.all([
            fetch(`components/sidebar.html?v=${version}`).then(r => r.text()),
            fetch(`components/topbar.html?v=${version}`).then(r => r.text()),
            fetch(`components/modals.html?v=${version}`).then(r => r.text()),
            fetch(`components/toast.html?v=${version}`).then(r => r.text())
        ]);

        const sidebarEl = document.getElementById("sidebar-container");
        if (sidebarEl) sidebarEl.innerHTML = sidebarHtml;

        const topbarEl = document.getElementById("topbar-container");
        if (topbarEl) topbarEl.innerHTML = topbarHtml;

        // Load modals
        const modalWrap = document.createElement("div");
        modalWrap.id = "global-modals";
        modalWrap.innerHTML = modalsHtml;
        document.body.appendChild(modalWrap);

        // Load toast container
        const toastWrap = document.createElement("div");
        toastWrap.id = "global-toast";
        toastWrap.innerHTML = toastHtml;
        document.body.appendChild(toastWrap);
    } catch (e) {
        console.error("Failed to load layout components:", e);
    }
}

// Bind topbar, sidebar actions
function attachGlobalListeners() {
    // 1. Theme toggle
    document.addEventListener("click", async (e) => {
        const toggleBtn = e.target.closest("#theme-toggle");
        if (toggleBtn) {
            const currentTheme = store.state.theme;
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            
            // Optimistic update
            store.setTheme(newTheme);
            updateThemeIcon();
            
            // Persist to backend if logged in
            if (store.state.user) {
                try {
                    await authService.updateProfile({ theme: newTheme });
                } catch (err) {
                    console.error("Failed to save theme setting", err);
                }
            }
        }
    });

    // 2. Notification Toggle Dropdown
    document.addEventListener("click", async (e) => {
        const bellBtn = e.target.closest("#notif-bell-btn");
        const dropdown = document.getElementById("notif-dropdown");
        
        if (bellBtn && dropdown) {
            e.stopPropagation();
            const isOpen = dropdown.style.display === "flex";
            if (!isOpen) {
                dropdown.style.display = "flex";
                await renderNotificationsList();
            } else {
                dropdown.style.display = "none";
            }
        } else if (dropdown && !e.target.closest("#notif-dropdown")) {
            // Close if clicking outside
            dropdown.style.display = "none";
        }
    });

    // 3. Mark All Read
    document.addEventListener("click", async (e) => {
        const readAllBtn = e.target.closest("#notif-read-all-btn");
        if (readAllBtn) {
            try {
                await notificationService.markAllRead();
                store.state.unreadNotificationCount = 0;
                updateNotificationBadge();
                await renderNotificationsList();
                toast.success("All notifications marked as read");
            } catch (err) {
                toast.error("Failed to update notifications");
            }
        }
    });

    // 4. Mark Single Read & Delete Notification
    document.addEventListener("click", async (e) => {
        const notifItem = e.target.closest(".notif-item");
        const deleteBtn = e.target.closest(".notif-item-delete");
        
        if (deleteBtn && notifItem) {
            e.stopPropagation();
            const notifId = parseInt(notifItem.dataset.id);
            try {
                await notificationService.delete(notifId);
                // Reload list and badge count
                const countData = await notificationService.getUnreadCount();
                store.state.unreadNotificationCount = countData.unread_count;
                updateNotificationBadge();
                await renderNotificationsList();
            } catch (err) {
                toast.error("Failed to delete notification");
            }
        } else if (notifItem && notifItem.classList.contains("unread")) {
            const notifId = parseInt(notifItem.dataset.id);
            try {
                await notificationService.markRead(notifId);
                notifItem.classList.remove("unread");
                
                // Decrement count
                store.state.unreadNotificationCount = Math.max(0, store.state.unreadNotificationCount - 1);
                updateNotificationBadge();
            } catch (err) {
                console.error("Failed to mark notification read", err);
            }
        }
    });

    // 5. Logout
    document.addEventListener("click", (e) => {
        const logoutBtn = e.target.closest("#sidebar-logout-btn");
        if (logoutBtn) {
            e.preventDefault();
            store.clearSession();
            updateTopbarUserUI();
            toast.success("Successfully logged out");
            window.location.hash = "";
            router.handleRouting();
        }
    });

    // 6. Mobile Sidebar Toggle & Close on Navigation
    document.addEventListener("click", (e) => {
        const toggle = e.target.closest("#mobile-nav-toggle");
        const sidebar = document.getElementById("sidebar-container");
        const navLink = e.target.closest(".sidebar .nav-item a");
        if (toggle && sidebar) {
            sidebar.classList.toggle("open");
        } else if (sidebar && sidebar.classList.contains("open")) {
            if (!e.target.closest("#sidebar-container") || navLink) {
                sidebar.classList.remove("open");
            }
        }
    });

    // Initialize theme icon
    updateThemeIcon();
}

function updateThemeIcon() {
    const btn = document.getElementById("theme-toggle");
    if (btn) {
        if (store.state.theme === "dark") {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
        } else {
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
        }
    }
}

async function renderNotificationsList() {
    const listContainer = document.getElementById("notif-dropdown-list");
    if (!listContainer) return;
    
    try {
        const list = await notificationService.getAll();
        listContainer.innerHTML = "";
        
        if (list.length === 0) {
            listContainer.innerHTML = '<div class="notif-empty">No notifications</div>';
            return;
        }
        
        list.forEach(n => {
            const item = document.createElement("div");
            item.className = `notif-item ${n.is_read ? "" : "unread"}`;
            item.dataset.id = n.id;
            
            // Format time
            const createdDate = new Date(n.created_at);
            const timeLabel = createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + " " + createdDate.toLocaleDateString();
            
            // Escape values
            const safeTitle = esc(n.title);
            const safeMsg = esc(n.message);
            
            item.innerHTML = `
                <button class="notif-item-delete" title="Delete">&times;</button>
                <div class="notif-item-title">${safeTitle}</div>
                <div class="notif-item-desc">${safeMsg}</div>
                <div class="notif-item-time">${timeLabel}</div>
            `;
            listContainer.appendChild(item);
        });
    } catch (e) {
        listContainer.innerHTML = '<div class="notif-empty" style="color:var(--color-danger)">Failed to load</div>';
    }
}

// XSS Sanitizer Helper (replaces Bug C6)
function esc(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
window.esc = esc; // expose globally

function attachAuthListeners() {
    const gotoRegister = document.getElementById("goto-register");
    const gotoLogin = document.getElementById("goto-login");
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const authTitle = document.getElementById("auth-form-title");

    if (gotoRegister) {
        gotoRegister.addEventListener("click", (e) => {
            e.preventDefault();
            loginForm.style.display = "none";
            registerForm.style.display = "block";
            authTitle.textContent = "Create your FinVault Account";
        });
    }

    if (gotoLogin) {
        gotoLogin.addEventListener("click", (e) => {
            e.preventDefault();
            registerForm.style.display = "none";
            loginForm.style.display = "block";
            authTitle.textContent = "Login to FinVault";
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("login-username").value;
            const passwordInput = document.getElementById("login-password").value;

            try {
                const data = await authService.login(usernameInput, passwordInput);
                store.setTokens(data.access_token, data.refresh_token);
                await verifySession();
                
                const welcomeUser = store.state.user ? store.state.user.username : "User";
                toast.success(`Welcome back, ${welcomeUser}!`);
                
                await router.handleRouting();
            } catch (err) {
                toast.error(`Login failed: ${err.message}`);
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById("register-username").value;
            const emailInput = document.getElementById("register-email").value;
            const passwordInput = document.getElementById("register-password").value;

            try {
                // Register User
                await authService.register(usernameInput, emailInput, passwordInput);
                toast.success("Account registered successfully! Logging you in...");
                
                // Perform Auto Login
                const data = await authService.login(usernameInput, passwordInput);
                store.setTokens(data.access_token, data.refresh_token);
                await verifySession();
                await router.handleRouting();
            } catch (err) {
                toast.error(`Registration failed: ${err.message}`);
            }
        });
    }
}

// App Bootstrapper
async function boot() {
    // 1. Set document theme from store
    document.documentElement.setAttribute("data-theme", store.state.theme);
    
    // 2. Load Global layout components
    await loadGlobalComponents();
    
    // Subscribe topbar updates to store changes
    store.subscribe(updateTopbarUserUI);
    
    // 3. Attach layout and auth listeners
    attachGlobalListeners();
    attachAuthListeners();
    
    // 4. Verify session in background (does not block initial render)
    if (store.state.accessToken) {
        verifySession().catch(() => {}).then(() => {
            updateTopbarUserUI();
        });
    }
    
    // 5. Initialize router immediately
    await router.init();
    
    // Initialize Modal managers
    modalManager.init();
}

window.addEventListener("DOMContentLoaded", boot);
export { updateNotificationBadge };
