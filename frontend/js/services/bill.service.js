import { api } from "./api.js";

export const billService = {
    getAll() {
        return api.get("/bills/");
    },

    create(data) {
        return api.post("/bills/", data);
    },

    update(id, data) {
        return api.put(`/bills/${id}`, data);
    },

    delete(id) {
        return api.delete(`/bills/${id}`);
    },

    pay(id) {
        return api.post(`/bills/${id}/pay`);
    },

    unpay(id) {
        return api.post(`/bills/${id}/unpay`);
    }
};
