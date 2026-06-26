import { api } from "./api.js";

export const transactionService = {
    getAll(filters = {}) {
        const params = new URLSearchParams();
        if (filters.page) params.append("page", filters.page);
        if (filters.limit) params.append("limit", filters.limit);
        if (filters.search) params.append("search", filters.search);
        if (filters.type) params.append("type", filters.type);
        if (filters.category_id) params.append("category_id", filters.category_id);
        if (filters.month) params.append("month", filters.month);
        if (filters.sort) params.append("sort", filters.sort);
        
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return api.get(`/transactions/${queryString}`);
    },

    getCount(filters = {}) {
        const params = new URLSearchParams();
        if (filters.search) params.append("search", filters.search);
        if (filters.type) params.append("type", filters.type);
        if (filters.category_id) params.append("category_id", filters.category_id);
        if (filters.month) params.append("month", filters.month);
        
        const queryString = params.toString() ? `?${params.toString()}` : "";
        return api.get(`/transactions/count${queryString}`);
    },

    getById(id) {
        return api.get(`/transactions/${id}`);
    },

    create(data) {
        return api.post("/transactions/", data);
    },

    update(id, data) {
        return api.put(`/transactions/${id}`, data);
    },

    delete(id) {
        return api.delete(`/transactions/${id}`);
    },

    uploadReceipt(file) {
        const formData = new FormData();
        formData.append("file", file);
        return api.post("/transactions/upload-receipt", formData);
    }
};
