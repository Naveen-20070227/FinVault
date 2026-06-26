import { api } from "./api.js";

export const goalService = {
    getAll() {
        return api.get("/goals/");
    },

    create(data) {
        return api.post("/goals/", data);
    },

    update(id, data) {
        return api.put(`/goals/${id}`, data);
    },

    delete(id) {
        return api.delete(`/goals/${id}`);
    },

    contribute(id, amount) {
        return api.post(`/goals/${id}/contribute`, { amount: parseFloat(amount) });
    }
};
