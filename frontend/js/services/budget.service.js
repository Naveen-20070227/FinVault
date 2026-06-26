import { api } from "./api.js";

export const budgetService = {
    getAll(month, year) {
        const params = new URLSearchParams();
        if (month) params.append("month", month);
        if (year) params.append("year", year);
        const query = params.toString() ? `?${params.toString()}` : "";
        return api.get(`/budgets/${query}`);
    },

    create(data) {
        return api.post("/budgets/", data);
    },

    update(id, data) {
        return api.put(`/budgets/${id}`, data);
    },

    delete(id) {
        return api.delete(`/budgets/${id}`);
    }
};
