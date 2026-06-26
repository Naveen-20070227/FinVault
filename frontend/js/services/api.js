import { store } from "../store.js";
import { router } from "../router.js";

const getBackendUrl = () => {
    const hostname = window.location.hostname;
    // If running on Vercel or any other deployed frontend
    if (hostname.includes("vercel.app") || hostname.includes("github.io")) {
        return "https://finvault-zsby.onrender.com";
    }
    // If running locally on a separate port (like 5500 for Live Server)
    if ((hostname === "localhost" || hostname === "127.0.0.1") && window.location.port !== "8000") {
        return "http://localhost:8000";
    }
    // Default to relative path (for when backend serves frontend or they share domain)
    return "";
};

export const BACKEND_URL = getBackendUrl();
const BASE_URL = `${BACKEND_URL}/api/v1`;


class ApiService {
    async request(endpoint, options = {}) {
        const url = `${BASE_URL}${endpoint}`;
        
        // 1. Prepare Headers
        options.headers = options.headers || {};
        if (store.state.accessToken) {
            options.headers["Authorization"] = `Bearer ${store.state.accessToken}`;
        }
        
        // 2. Set default content type if sending body and not multipart (file upload)
        if (options.body && !(options.body instanceof FormData) && !options.headers["Content-Type"]) {
            options.headers["Content-Type"] = "application/json";
        }

        try {
            let response = await fetch(url, options);

            // 3. Intercept 401 Unauthorized for Token Refresh
            if (response.status === 401 && store.state.refreshToken && !options._isRetry) {
                options._isRetry = true;
                const refreshSuccess = await this.attemptTokenRefresh();
                
                if (refreshSuccess) {
                    // Retry with new access token
                    options.headers["Authorization"] = `Bearer ${store.state.accessToken}`;
                    response = await fetch(url, options);
                } else {
                    // Force logout
                    store.clearSession();
                    router.handleRouting();
                    throw new Error("Session expired. Please log in again.");
                }
            }

            // 4. Handle HTTP error responses
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error || `HTTP error! status: ${response.status}`;
                throw new Error(errMsg);
            }

            // Return JSON or raw bytes if downloading attachments
            const contentType = response.headers.get("content-type");
            if (contentType && (contentType.includes("application/pdf") || 
                                 contentType.includes("text/csv") || 
                                 contentType.includes("spreadsheetml"))) {
                return await response.blob();
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error("API Request failed:", error);
            throw error;
        }
    }

    async attemptTokenRefresh() {
        const url = `${BASE_URL}/auth/refresh`;
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: store.state.refreshToken })
            });
            
            if (!response.ok) return false;
            
            const data = await response.json();
            store.setTokens(data.access_token, data.refresh_token);
            return true;
        } catch (e) {
            return false;
        }
    }

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: "GET" });
    }

    post(endpoint, body, options = {}) {
        const bodyData = body instanceof FormData ? body : JSON.stringify(body);
        return this.request(endpoint, { ...options, method: "POST", body: bodyData });
    }

    put(endpoint, body, options = {}) {
        const bodyData = body instanceof FormData ? body : JSON.stringify(body);
        return this.request(endpoint, { ...options, method: "PUT", body: bodyData });
    }

    patch(endpoint, body, options = {}) {
        const bodyData = body instanceof FormData ? body : JSON.stringify(body);
        return this.request(endpoint, { ...options, method: "PATCH", body: bodyData });
    }

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: "DELETE" });
    }
}

export const api = new ApiService();
