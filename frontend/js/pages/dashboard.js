import { analyticsService } from "../services/analytics.service.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { chartManager } from "../utils/charts.js";
import { safeHtml, markSafe } from "../utils/dom.js";
import { store } from "../store.js";

let dashboardChart = null;

export async function init() {
    try {
        // Fetch dashboard statistics and category breakdown
        const [overview, breakdown] = await Promise.all([
            analyticsService.getOverview(),
            analyticsService.getCategoryBreakdown()
        ]);

        // 1. Render and Animate KPIs
        animateValue("dashboard-balance", parseFloat(overview.total_balance));
        animateValue("dashboard-income", parseFloat(overview.monthly_income));
        animateValue("dashboard-expense", parseFloat(overview.monthly_expenses));
        animateValue("dashboard-savings", parseFloat(overview.monthly_savings));

        // 2. Render Budget progress ring
        renderBudgetRing(overview.budget_utilization_percent);

        // 3. Render Chart
        renderCategoryChart(breakdown);

        // 4. Render Recent Transactions
        renderRecentTransactions(overview.recent_transactions);

        // 5. Render Upcoming Bills
        renderUpcomingBills(overview.upcoming_bills);
        
        // 6. Fetch top budgets for the sidebar summary
        await renderBudgetProgressBars();

    } catch (error) {
        console.error("Dashboard controller initialization failed:", error);
    }
}

export function destroy() {
    chartManager.destroy("dashboard-category-chart");
}

// Cubic Easing out function for premium count-up feel
function animateValue(id, targetValue) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const duration = 1200; // 1.2 seconds
    const startValue = 0;
    const startTime = performance.now();

    function updateCount(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        
        const currentValue = startValue + (targetValue - startValue) * ease;
        el.textContent = formatCurrency(currentValue);

        if (progress < 1) {
            requestAnimationFrame(updateCount);
        } else {
            el.textContent = formatCurrency(targetValue); // ensure exact target is set
        }
    }
    requestAnimationFrame(updateCount);
}

function renderBudgetRing(percent) {
    const ring = document.getElementById("budget-progress-circle");
    const label = document.getElementById("budget-ring-percent");
    if (!ring || !label) return;

    // Circle radius is 54, Perimeter is 2 * PI * r = ~339.29
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    
    ring.style.strokeDasharray = `${circumference} ${circumference}`;
    
    // Animate stroke dashoffset
    const safePercent = Math.min(Math.max(percent, 0), 100);
    const offset = circumference - (safePercent / 100) * circumference;
    
    // CSS transitions handles transition smoothly
    ring.style.transition = "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)";
    ring.style.strokeDashoffset = offset;
    
    // Change color based on utilization
    if (percent >= 100) {
        ring.setAttribute("stroke", "var(--color-danger)");
    } else if (percent >= 80) {
        ring.setAttribute("stroke", "var(--color-warning)");
    } else {
        ring.setAttribute("stroke", "var(--color-primary-500)");
    }

    label.textContent = `${percent.toFixed(0)}%`;
}

function renderCategoryChart(breakdown) {
    const canvasId = "dashboard-category-chart";
    const emptyEl = document.getElementById("category-chart-empty");
    
    if (breakdown.length === 0) {
        chartManager.destroy(canvasId);
        if (emptyEl) emptyEl.style.display = "block";
        return;
    }
    
    if (emptyEl) emptyEl.style.display = "none";

    const labels = breakdown.map(item => item.category_name);
    const data = breakdown.map(item => parseFloat(item.amount));
    const colors = breakdown.map(item => item.color);

    const chartConfig = {
        labels: labels,
        datasets: [{
            data: data,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 12
        }]
    };

    chartManager.create(canvasId, "doughnut", chartConfig, {
        plugins: {
            legend: {
                position: "right",
                labels: {
                    boxWidth: 12,
                    font: { family: "Inter", size: 12 }
                }
            }
        },
        cutout: "75%"
    });
}

function renderRecentTransactions(transactions) {
    const body = document.getElementById("dashboard-recent-txs-body");
    if (!body) return;

    if (transactions.length === 0) {
        body.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-secondary)">No transactions found.</td></tr>`;
        return;
    }

    const rows = transactions.map(tx => {
        const catName = tx.category ? tx.category.name : "Uncategorized";
        const catColor = tx.category ? tx.category.color : "#7C3AED";
        const isExpense = tx.type === "expense";
        
        return safeHtml`
            <tr>
                <td><span style="font-weight:600;">${tx.title}</span></td>
                <td>
                    <span class="badge" style="background-color:${catColor}20; color:${catColor};">
                        ${catName}
                    </span>
                </td>
                <td>${formatDate(tx.date)}</td>
                <td class="amount-col ${tx.type}">
                    ${isExpense ? "-" : "+"}${formatCurrency(tx.amount)}
                </td>
            </tr>
        `;
    });

    body.innerHTML = rows.join("");
}

function renderUpcomingBills(bills) {
    const list = document.getElementById("dashboard-upcoming-bills-list");
    if (!list) return;

    if (bills.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 24px; color:var(--text-muted);">
                <i class="ti-check-box" style="font-size: 2rem; margin-bottom: 8px; color:var(--color-success)"></i>
                <p style="font-size:0.85rem;">All bills paid for next 7 days!</p>
            </div>
        `;
        return;
    }

    const cards = bills.map(b => {
        const currency = store.state.currency;
        return safeHtml`
            <div class="bill-row-card">
                <div class="bill-row-info">
                    <span class="bill-row-title">${b.title}</span>
                    <span class="bill-row-due">Due: ${formatDate(b.due_date)}</span>
                </div>
                <span class="amount-col expense" style="font-size:0.9rem;">
                    ${formatCurrency(b.amount)}
                </span>
            </div>
        `;
    });

    list.innerHTML = cards.join("");
}

async function renderBudgetProgressBars() {
    const container = document.getElementById("dashboard-budget-details");
    if (!container) return;

    try {
        const performance = await analyticsService.getBudgetPerformance();
        
        if (performance.length === 0) {
            container.innerHTML = `<div style="text-align:center; font-size:0.85rem; color:var(--text-muted); padding: 12px 0;">No active budgets set for this month.</div>`;
            return;
        }

        // Display top 3 budgets by utilization %
        const sorted = performance.sort((a, b) => b.utilization_percent - a.utilization_percent).slice(0, 3);
        
        const items = sorted.map(b => {
            const cappedPercent = Math.min(b.utilization_percent, 100);
            
            // Choose color based on limit
            let barColor = "var(--color-primary-500)";
            if (b.utilization_percent >= 100) barColor = "var(--color-danger)";
            else if (b.utilization_percent >= store.state.budgetWarningPercent) barColor = "var(--color-warning)";

            return safeHtml`
                <div class="budget-bar-item">
                    <div class="budget-bar-header">
                        <span>${b.category_name}</span>
                        <span>${b.utilization_percent.toFixed(0)}%</span>
                    </div>
                    <div class="budget-progress-track">
                        <div class="budget-progress-bar" style="width: ${cappedPercent}%; background-color: ${barColor}"></div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:var(--text-secondary); margin-top:-2px;">
                        <span>Spent: ${formatCurrency(b.spent_amount)}</span>
                        <span>Limit: ${formatCurrency(b.budget_amount)}</span>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = items.join("");

    } catch (err) {
        container.innerHTML = `<div style="color:var(--color-danger); font-size:0.8rem;">Failed to load budgets.</div>`;
    }
}
