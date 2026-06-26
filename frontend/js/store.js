// Global reactive app state container
class Store {
    constructor() {
        this.state = {
            user: null,
            accessToken: sessionStorage.getItem("access_token") || null,
            refreshToken: sessionStorage.getItem("refresh_token") || null,
            theme: localStorage.getItem("theme") || "light",
            currency: "₹",
            largeExpenseThreshold: 10000.00,
            budgetWarningPercent: 80,
            currentPath: "/dashboard",
            unreadNotificationCount: 0
        };
        this.listeners = [];
    }

    setTokens(accessToken, refreshToken) {
        this.state.accessToken = accessToken;
        this.state.refreshToken = refreshToken;
        
        if (accessToken) {
            sessionStorage.setItem("access_token", accessToken);
        } else {
            sessionStorage.removeItem("access_token");
        }
        
        if (refreshToken) {
            sessionStorage.setItem("refresh_token", refreshToken);
        } else {
            sessionStorage.removeItem("refresh_token");
        }
        this.triggerUpdate();
    }

    clearSession() {
        this.setTokens(null, null);
        this.state.user = null;
        this.triggerUpdate();
    }

    setUser(user) {
        this.state.user = user;
        if (user) {
            this.state.currency = user.currency;
            this.state.theme = user.theme;
            this.state.largeExpenseThreshold = parseFloat(user.large_expense_threshold);
            this.state.budgetWarningPercent = parseInt(user.budget_warning_percent);
            
            // Persist theme choice
            localStorage.setItem("theme", user.theme);
            document.documentElement.setAttribute("data-theme", user.theme);
        }
        this.triggerUpdate();
    }

    setTheme(theme) {
        this.state.theme = theme;
        localStorage.setItem("theme", theme);
        document.documentElement.setAttribute("data-theme", theme);
        this.triggerUpdate();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    triggerUpdate() {
        this.listeners.forEach(l => l(this.state));
    }
}

export const store = new Store();
