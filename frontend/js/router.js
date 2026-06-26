import { store } from "./store.js";

const routes = {
    "/dashboard": { html: "pages/dashboard.html", controller: "./pages/dashboard.js" },
    "/transactions": { html: "pages/transactions.html", controller: "./pages/transactions.js" },
    "/categories": { html: "pages/categories.html", controller: "./pages/categories.js" },
    "/budgets": { html: "pages/budgets.html", controller: "./pages/budgets.js" },
    "/bills": { html: "pages/bills.html", controller: "./pages/bills.js" },
    "/goals": { html: "pages/goals.html", controller: "./pages/goals.js" },
    "/analytics": { html: "pages/analytics.html", controller: "./pages/analytics.js" },
    "/reports": { html: "pages/reports.html", controller: "./pages/reports.js" },
    "/settings": { html: "pages/settings.html", controller: "./pages/settings.js" }
};

class Router {
    constructor() {
        this.currentController = null;
        this.cachedFragments = {};
        
        window.addEventListener("hashchange", () => this.handleRouting());
    }

    async init() {
        // Initial routing trigger
        await this.handleRouting();
    }

    async handleRouting() {
        const hash = window.location.hash || "#/dashboard";
        let path = hash.replace("#", "");
        
        // Strip query params if any
        if (path.includes("?")) {
            path = path.split("?")[0];
        }

        const route = routes[path] || routes["/dashboard"];
        store.state.currentPath = path;

        // Auth guard: If user not logged in, force showing auth containers and prevent subpage fetches
        if (!store.state.accessToken) {
            this.showAuthLayout();
            return;
        }

        this.showAppLayout();
        await this.loadRoute(path, route);
    }

    showAuthLayout() {
        document.getElementById("auth-layout").style.display = "flex";
        document.getElementById("app-layout").style.display = "none";
        window.location.hash = "";
    }

    showAppLayout() {
        document.getElementById("auth-layout").style.display = "none";
        document.getElementById("app-layout").style.display = "flex";
    }

    async loadRoute(path, route) {
        try {
            // Call destroy on previous page controller
            if (this.currentController && this.currentController.destroy) {
                this.currentController.destroy();
            }
            this.currentController = null;

            // Fetch and inject HTML page fragment (with caching)
            let htmlContent = this.cachedFragments[route.html];
            if (!htmlContent) {
                const response = await fetch(`${route.html}?v=${Date.now()}`);
                if (!response.ok) throw new Error(`Failed to load page: ${response.statusText}`);
                htmlContent = await response.text();
                this.cachedFragments[route.html] = htmlContent;
            }

            const wrapper = document.getElementById("page-wrapper");
            wrapper.innerHTML = htmlContent;
            
            // Safe fade-in animation trigger
            wrapper.classList.remove("fade-in");
            void wrapper.offsetWidth; // Trigger reflow
            wrapper.classList.add("fade-in");

            // Update page title and sidebar active state
            this.updateLayoutUI(path);

            // Import and run page controller module
            const controllerModule = await import(route.controller);
            this.currentController = controllerModule;
            
            if (this.currentController.init) {
                await this.currentController.init();
            }
        } catch (error) {
            console.error("Router error:", error);
            document.getElementById("page-wrapper").innerHTML = `
                <div class="card" style="text-align:center; padding: 40px; margin-top:20px;">
                    <i class="ti-alert" style="font-size: 3rem; color:var(--color-danger); margin-bottom:16px;"></i>
                    <h2>Failed to load section</h2>
                    <p style="color:var(--text-secondary); margin-top:8px;">${error.message}</p>
                    <button class="btn btn-primary" onclick="window.location.reload()" style="margin-top:16px;">Reload Application</button>
                </div>
            `;
        }
    }

    updateLayoutUI(path) {
        // Set header page title
        const titleEl = document.getElementById("page-title");
        if (titleEl) {
            const prettyTitle = path.replace("/", "").replace("-", " ");
            titleEl.textContent = prettyTitle.charAt(0).toUpperCase() + prettyTitle.slice(1);
        }

        // Highlight sidebar nav item
        document.querySelectorAll(".sidebar .nav-item").forEach(item => {
            const itemRoute = item.getAttribute("data-route");
            if (itemRoute === path) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });
    }
}

export const router = new Router();
