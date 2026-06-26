import { authService } from "../services/auth.service.js";
import { store } from "../store.js";
import { toast } from "../utils/toast.js";

export function init() {
    loadUserSettings();
    attachListeners();
}

export function destroy() {
    // Page cleanup
}

function loadUserSettings() {
    const user = store.state.user;
    if (!user) return;

    // Profile fields
    document.getElementById("settings-username").value = user.username;
    document.getElementById("settings-email").value = user.email;

    // Avatar preview
    const avatarPreview = document.getElementById("settings-avatar-preview");
    if (avatarPreview) {
        if (user.profile_image) {
            avatarPreview.src = `/uploads/${user.profile_image}`;
        } else {
            avatarPreview.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' fill='%23a855f7'><circle cx='50' cy='35' r='20'/><path d='M50,60 C30,60 15,75 15,90 L85,90 C85,75 70,60 50,60 Z'/></svg>";
        }
    }

    // Preferences fields
    document.getElementById("settings-currency").value = user.currency;
    document.getElementById("settings-threshold").value = user.large_expense_threshold;
    
    const slider = document.getElementById("settings-warning-pct");
    const sliderVal = document.getElementById("warning-pct-val");
    if (slider && sliderVal) {
        slider.value = user.budget_warning_percent;
        sliderVal.textContent = `${user.budget_warning_percent}%`;
    }
}

function attachListeners() {
    // 1. Slider change update text value
    const slider = document.getElementById("settings-warning-pct");
    const sliderVal = document.getElementById("warning-pct-val");
    if (slider && sliderVal) {
        slider.addEventListener("input", (e) => {
            sliderVal.textContent = `${e.target.value}%`;
        });
    }

    // 2. Avatar file input change upload
    const avatarInput = document.getElementById("settings-avatar-file");
    if (avatarInput) {
        avatarInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const updatedUser = await authService.uploadAvatar(file);
                store.setUser(updatedUser);
                
                // Update UIs
                const preview = document.getElementById("settings-avatar-preview");
                const topbarAvatar = document.getElementById("topbar-avatar");
                
                if (preview) preview.src = `/uploads/${updatedUser.profile_image}`;
                if (topbarAvatar) topbarAvatar.src = `/uploads/${updatedUser.profile_image}`;
                
                toast.success("Avatar image uploaded successfully");
            } catch (err) {
                toast.error(`Upload failed: ${err.message}`);
                avatarInput.value = "";
            }
        });
    }

    // 3. Profile details submit
    const profileForm = document.getElementById("settings-profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const payload = {
                username: document.getElementById("settings-username").value,
                email: document.getElementById("settings-email").value
            };

            try {
                const updatedUser = await authService.updateProfile(payload);
                store.setUser(updatedUser);
                
                // Update Topbar username
                const topbarUser = document.getElementById("topbar-username");
                if (topbarUser) topbarUser.textContent = updatedUser.username;

                toast.success("Profile saved successfully");
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            }
        });
    }

    // 4. Preferences details submit
    const prefForm = document.getElementById("settings-pref-form");
    if (prefForm) {
        prefForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const payload = {
                currency: document.getElementById("settings-currency").value,
                large_expense_threshold: parseFloat(document.getElementById("settings-threshold").value),
                budget_warning_percent: parseInt(document.getElementById("settings-warning-pct").value)
            };

            try {
                const updatedUser = await authService.updateProfile(payload);
                store.setUser(updatedUser);
                toast.success("Preferences saved successfully");
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            }
        });
    }

    // 5. Password submit
    const securityForm = document.getElementById("settings-security-form");
    if (securityForm) {
        securityForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const oldPwd = document.getElementById("settings-old-pwd").value;
            const newPwd = document.getElementById("settings-new-pwd").value;
            const confirmPwd = document.getElementById("settings-confirm-pwd").value;

            if (newPwd !== confirmPwd) {
                toast.error("New passwords do not match");
                return;
            }

            try {
                await authService.changePassword(oldPwd, newPwd);
                toast.success("Password changed successfully");
                securityForm.reset();
            } catch (err) {
                toast.error(`Change failed: ${err.message}`);
            }
        });
    }
}
