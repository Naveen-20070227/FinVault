// Premium Toast Notification Service

export const toast = {
    show(title, message, type = "info") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toastEl = document.createElement("div");
        toastEl.className = `toast toast-${type}`;

        // Select Icon
        let iconClass = "ti-info-alt";
        if (type === "success") iconClass = "ti-check-box";
        else if (type === "danger") iconClass = "ti-alert";
        else if (type === "warning") iconClass = "ti-info";

        toastEl.innerHTML = `
            <div class="toast-icon"><i class="${iconClass}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toastEl);

        // Slide In transition
        setTimeout(() => {
            toastEl.classList.add("show");
        }, 50);

        const closeHandler = () => {
            toastEl.classList.remove("show");
            // Wait for transition to complete before removing from DOM
            setTimeout(() => {
                toastEl.remove();
            }, 400);
        };

        toastEl.querySelector(".toast-close").addEventListener("click", closeHandler);

        // Auto dismiss after 4 seconds
        setTimeout(closeHandler, 4000);
    },

    success(message, title = "Success") {
        this.show(title, message, "success");
    },

    error(message, title = "Error") {
        this.show(title, message, "danger");
    },

    warning(message, title = "Warning") {
        this.show(title, message, "warning");
    },

    info(message, title = "Notice") {
        this.show(title, message, "info");
    }
};
