// Client-side Input Validation Utilities

export const validators = {
    isValidEmail(email) {
        const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        return regex.test(email);
    },

    isValidPassword(password) {
        // Minimum 8 characters
        return password && password.length >= 8;
    },

    isValidAmount(amount) {
        const val = parseFloat(amount);
        return !isNaN(val) && val > 0;
    },

    isValidDate(dateString) {
        if (!dateString) return false;
        const timestamp = Date.parse(dateString);
        return !isNaN(timestamp);
    }
};
export default validators;
