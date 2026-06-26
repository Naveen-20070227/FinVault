import { api } from "./api.js";

export const notificationService = {
    getAll() {
        return api.get("/notifications/");
    },

    getUnreadCount() {
        return api.get("/notifications/unread-count");
    },

    markRead(id) {
        return api.patch(`/notifications/${id}/read`);
    },

    markAllRead() {
        return api.patch("/notifications/read-all");
    },

    delete(id) {
        return api.delete(`/notifications/${id}`);
    }
};
