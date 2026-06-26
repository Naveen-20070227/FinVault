import { store } from "../store.js";

export function formatCurrency(amount, customCurrency = null) {
    const currency = customCurrency || store.state.currency || "₹";
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount)) {
        return `${currency}0.00`;
    }
    
    // Format to 2 decimal places with comma separation
    const parts = numericAmount.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${currency}${parts.join(".")}`;
}

export function formatDate(dateString) {
    if (!dateString) return "";
    try {
        const dateObj = new Date(dateString);
        // Avoid timezone shift by reading UTC/Local parts based on split
        const [year, month, day] = dateString.split("-").map(Number);
        const localDate = new Date(year, month - 1, day);
        
        return localDate.toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    } catch (e) {
        return dateString;
    }
}

export function formatPercent(value) {
    const val = parseFloat(value);
    if (isNaN(val)) return "0%";
    return `${val.toFixed(1)}%`;
}

export function getCurrentMonthStr() {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${yyyy}-${mm}`;
}
