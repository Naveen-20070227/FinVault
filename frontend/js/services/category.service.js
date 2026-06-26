import { api } from "./api.js";

export const categoryService = {
    getAll(type = null) {
        const query = type ? `?type=${type}` : "";
        return api.get(`/categories/${query}`);
    },

    create(data) {
        return api.post("/categories/", data);
    },

    update(id, data) {
        return api.put(`/categories/${id}`, data);
    },

    delete(id) {
        return api.delete(`/categories/${id}`);
    }
};
