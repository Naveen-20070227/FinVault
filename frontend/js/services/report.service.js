import { api } from "./api.js";

export const reportService = {
    getMonthly(month) {
        return api.get(`/reports/monthly?month=${month}`);
    },

    getYearly(year) {
        return api.get(`/reports/yearly?year=${year}`);
    },

    async exportCsv(month) {
        const blob = await api.get(`/reports/export/csv?month=${month}`);
        this._triggerDownload(blob, `transactions_${month}.csv`);
    },

    async exportXlsx(month) {
        const blob = await api.get(`/reports/export/xlsx?month=${month}`);
        this._triggerDownload(blob, `report_${month}.xlsx`);
    },

    async exportPdf(month) {
        const blob = await api.get(`/reports/export/pdf?month=${month}`);
        this._triggerDownload(blob, `report_${month}.pdf`);
    },

    _triggerDownload(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }
};
