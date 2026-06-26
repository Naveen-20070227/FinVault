import { analyticsService } from "../services/analytics.service.js";
import { chartManager } from "../utils/charts.js";
import { formatCurrency, getCurrentMonthStr } from "../utils/formatters.js";

let currentBreakdownMonth = getCurrentMonthStr();

export async function init() {
    // Set initial date filter value
    const dateInput = document.getElementById("analytics-month-filter");
    if (dateInput) {
        dateInput.value = currentBreakdownMonth;
        dateInput.addEventListener("change", async (e) => {
            currentBreakdownMonth = e.target.value;
            await renderCategoryBreakdown();
        });
    }

    // Load and render all charts
    await Promise.all([
        renderCategoryBreakdown(),
        renderBudgetPerformance(),
        renderTrendChart(),
        renderSavingsGrowthChart()
    ]);
}

export function destroy() {
    chartManager.destroyAll();
}

async function renderCategoryBreakdown() {
    const canvasId = "chart-category-breakdown";
    const emptyEl = document.getElementById("analytics-category-empty");
    
    try {
        const breakdown = await analyticsService.getCategoryBreakdown(currentBreakdownMonth);
        
        if (breakdown.length === 0) {
            chartManager.destroy(canvasId);
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }
        
        if (emptyEl) emptyEl.style.display = "none";

        const labels = breakdown.map(item => item.category_name);
        const data = breakdown.map(item => parseFloat(item.amount));
        const colors = breakdown.map(item => item.color);

        const config = {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 12
            }]
        };

        chartManager.create(canvasId, "doughnut", config, {
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        boxWidth: 12,
                        font: { family: "Inter", size: 12 }
                    }
                }
            },
            cutout: "70%"
        });

    } catch (err) {
        console.error("Failed to load category breakdown", err);
    }
}

async function renderBudgetPerformance() {
    const canvasId = "chart-budget-performance";
    const emptyEl = document.getElementById("analytics-budget-empty");

    try {
        const budgets = await analyticsService.getBudgetPerformance();

        if (budgets.length === 0) {
            chartManager.destroy(canvasId);
            if (emptyEl) emptyEl.style.display = "block";
            return;
        }

        if (emptyEl) emptyEl.style.display = "none";

        const labels = budgets.map(item => item.category_name);
        const spentData = budgets.map(item => parseFloat(item.spent_amount));
        const limitData = budgets.map(item => parseFloat(item.budget_amount));
        
        const config = {
            labels: labels,
            datasets: [
                {
                    label: "Spent",
                    data: spentData,
                    backgroundColor: "rgba(239, 68, 68, 0.85)", // Red accent
                    borderRadius: 6
                },
                {
                    label: "Limit",
                    data: limitData,
                    backgroundColor: "rgba(124, 58, 237, 0.25)", // Light purple background border
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: "rgba(124, 58, 237, 0.6)"
                }
            ]
        };

        chartManager.create(canvasId, "bar", config, {
            indexAxis: "y", // Horizontal Bar chart
            scales: {
                x: { grid: { display: false } },
                y: { grid: { display: false } }
            }
        });

    } catch (err) {
        console.error("Failed to load budget performance", err);
    }
}

async function renderTrendChart() {
    const canvasId = "chart-income-vs-expense";

    try {
        const trend = await analyticsService.getMonthlyTrend();

        const labels = trend.map(t => t.month);
        const incomes = trend.map(t => parseFloat(t.income));
        const expenses = trend.map(t => parseFloat(t.expense));

        const config = {
            labels: labels,
            datasets: [
                {
                    label: "Income",
                    data: incomes,
                    backgroundColor: "rgba(16, 185, 129, 0.85)", // Green success
                    borderRadius: 6
                },
                {
                    label: "Expense",
                    data: expenses,
                    backgroundColor: "rgba(239, 68, 68, 0.85)", // Red danger
                    borderRadius: 6
                }
            ]
        };

        chartManager.create(canvasId, "bar", config, {
            scales: {
                x: { grid: { display: false } },
                y: { 
                    grid: { color: "rgba(124, 58, 237, 0.05)" },
                    ticks: { callback: (v) => formatCurrency(v).replace("₹", "") }
                }
            }
        });

    } catch (err) {
        console.error("Failed to load trend chart", err);
    }
}

async function renderSavingsGrowthChart() {
    const canvasId = "chart-savings-growth";
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    try {
        const growth = await analyticsService.getSavingsGrowth();

        const labels = growth.map(g => g.month);
        const cumulative = growth.map(g => parseFloat(g.cumulative_savings));

        // Create gradient fill effect (closes premium visuals)
        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.4)");
        gradient.addColorStop(1, "rgba(168, 85, 247, 0)");

        const config = {
            labels: labels,
            datasets: [{
                label: "Cumulative Savings",
                data: cumulative,
                borderColor: "#7C3AED",
                borderWidth: 3,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4, // Curved smooth lines
                pointBackgroundColor: "#7C3AED",
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        };

        chartManager.create(canvasId, "line", config, {
            scales: {
                x: { grid: { display: false } },
                y: { 
                    grid: { color: "rgba(124, 58, 237, 0.05)" },
                    ticks: { callback: (v) => formatCurrency(v).replace("₹", "") }
                }
            }
        });

    } catch (err) {
        console.error("Failed to load savings growth", err);
    }
}
