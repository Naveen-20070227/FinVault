import { api } from "./api.js";

export const authService = {
    register(username, email, password) {
        return api.post("/auth/register", { username, email, password });
    },
    
    login(username, password) {
        return api.post("/auth/login", { username, password });
    },
    
    getProfile() {
        return api.get("/users/me");
    },
    
    updateProfile(profileData) {
        return api.patch("/users/me", profileData);
    },
    
    changePassword(current_password, new_password) {
        return api.patch("/users/me/password", { current_password, new_password });
    },
    
    uploadAvatar(file) {
        const formData = new FormData();
        formData.append("file", file);
        return api.post("/users/me/avatar", formData);
    }
};
