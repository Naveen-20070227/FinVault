// Chart.js helper wrapping setup and automatic cleanup

export const chartManager = {
    instances: {},

    create(canvasId, type, data, options = {}) {
        // Cleanup existing chart instance on this canvas to prevent redraw overlay bugs
        this.destroy(canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;

        // Dynamic legend adjustment for mobile and tablet viewports
        const isMobileOrTablet = window.innerWidth <= 1024;
        if (isMobileOrTablet && options.plugins?.legend?.position === "right") {
            options.plugins.legend.position = "bottom";
        }

        const ctx = canvas.getContext("2d");
        const chart = new Chart(ctx, {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary").trim() || "#666"
                        }
                    }
                },
                ...options
            }
        });

        this.instances[canvasId] = chart;
        return chart;
    },

    destroy(canvasId) {
        if (this.instances[canvasId]) {
            this.instances[canvasId].destroy();
            delete this.instances[canvasId];
        }
    },

    destroyAll() {
        Object.keys(this.instances).forEach(id => {
            this.destroy(id);
        });
        this.instances = {};
    }
};
export default chartManager;
