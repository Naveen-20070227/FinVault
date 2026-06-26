import { api } from "./api.js";

export const analyticsService = {
    getOverview() {
        return api.get("/analytics/overview");
    },

    getCategoryBreakdown(month = null) {
        const query = month ? `?month=${month}` : "";
        return api.get(`/analytics/category-breakdown${query}`);
    },

    getMonthlyTrend() {
        return api.get("/analytics/monthly-trend");
    },

    getSavingsGrowth() {
        return api.get("/analytics/savings-growth");
    },

    getTopExpenses() {
        return api.get("/analytics/top-expenses");
    },

    getBudgetPerformance() {
        return api.get("/analytics/budget-performance");
    }
};
