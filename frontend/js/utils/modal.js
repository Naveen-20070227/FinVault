// Global Modal overlay manager

export const modalManager = {
    init() {
        // Global delegation for closing modals
        document.addEventListener("click", (e) => {
            // 1. Click on Close icon [data-close]
            if (e.target.closest("[data-close]")) {
                const modal = e.target.closest(".modal-overlay");
                if (modal) {
                    this.close(modal.id);
                }
            }
            
            // 2. Click on the blurred backdrop overlay itself
            if (e.target.classList.contains("modal-overlay")) {
                this.close(e.target.id);
            }
        });

        // Close modal on Escape keypress
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                const openModal = document.querySelector(".modal-overlay.open");
                if (openModal) {
                    this.close(openModal.id);
                }
            }
        });
    },

    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("open");
            // Disable background scrolling when modal is open
            document.body.style.overflow = "hidden";
        }
    },

    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("open");
            // Re-enable background scrolling
            document.body.style.overflow = "";
        }
    }
};
export default modalManager;
