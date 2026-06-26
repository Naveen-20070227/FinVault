import { reportService } from "../services/report.service.js";
import { formatCurrency, formatDate, getCurrentMonthStr } from "../utils/formatters.js";
import { toast } from "../utils/toast.js";
import { skeleton } from "../utils/skeleton.js";
import { safeHtml, markSafe } from "../utils/dom.js";

let activeReportTab = "monthly";
let selectedMonth = getCurrentMonthStr();
let selectedYear = new Date().getFullYear();

export async function init() {
    // Initialize Year Selector values
    populateYearsFilter();

    // Set initial Month picker value
    const monthPicker = document.getElementById("reports-month-filter");
    if (monthPicker) {
        monthPicker.value = selectedMonth;
    }

    await loadReport();
    attachListeners();
}

export function destroy() {
    // Cleanup page
}

function populateYearsFilter() {
    const select = document.getElementById("reports-year-filter");
    if (!select) return;

    select.innerHTML = "";
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        if (y === selectedYear) opt.selected = true;
        select.appendChild(opt);
    }
}

async function loadReport() {
    const container = document.getElementById("reports-preview-container");
    const exportRow = document.getElementById("reports-export-label").closest(".card");
    const exportLabel = document.getElementById("reports-export-label");

    if (!container) return;

    container.innerHTML = skeleton.table(6, 4);

    try {
        if (activeReportTab === "monthly") {
            if (exportRow) exportRow.style.display = "flex";
            if (exportLabel) {
                // Parse date label
                const parts = selectedMonth.split("-");
                const monthName = new Date(parts[0], parts[1] - 1, 1).toLocaleString("en-US", { month: "long" });
                exportLabel.textContent = `Export Statement for ${monthName} ${parts[0]}:`;
            }

            const data = await reportService.getMonthly(selectedMonth);
            renderMonthlyPreview(data);
        } else {
            // Yearly - hide monthly exports as api only defines month exports
            if (exportRow) exportRow.style.display = "none";

            const data = await reportService.getYearly(selectedYear);
            renderYearlyPreview(data);
        }
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 24px; color:var(--color-danger)">
                <p>Failed to compile report: ${err.message}</p>
            </div>
        `;
    }
}

function renderMonthlyPreview(data) {
    const container = document.getElementById("reports-preview-container");
    if (!container) return;

    const breakRows = data.category_breakdown.map(item => {
        return safeHtml`
            <tr>
                <td><span style="font-weight:600;">${item.category_name}</span></td>
                <td style="text-align: right;">${formatPercent(item.percentage)}</td>
                <td class="amount-col expense">${formatCurrency(item.amount)}</td>
            </tr>
        `;
    });

    const hasData = data.category_breakdown.length > 0;
    const bodyContent = hasData ? breakRows.join("") : `<tr><td colspan="3" style="text-align:center; color:var(--text-secondary)">No expense records for this month.</td></tr>`;

    container.innerHTML = safeHtml`
        <!-- KPI Row -->
        <div class="grid-cols-4" style="margin-bottom: 24px;">
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Total Income</span>
                <h3 class="amount-col income" style="text-align:left; font-size:1.25rem; margin-top:4px;">${formatCurrency(data.total_income)}</h3>
            </div>
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Total Expenses</span>
                <h3 class="amount-col expense" style="text-align:left; font-size:1.25rem; margin-top:4px;">${formatCurrency(data.total_expense)}</h3>
            </div>
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Net Savings</span>
                <h3 class="amount-col" style="text-align:left; font-size:1.25rem; margin-top:4px; color:${data.net_savings >= 0 ? "var(--color-success)" : "var(--color-danger)"}">${formatCurrency(data.net_savings)}</h3>
            </div>
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Savings Rate</span>
                <h3 style="text-align:left; font-size:1.25rem; margin-top:4px; font-weight:700;">${data.savings_rate.toFixed(1)}%</h3>
            </div>
        </div>

        <!-- Details Row -->
        <div class="grid-cols-3">
            <div class="card" style="grid-column: span 2;">
                <h3 class="card-title">Category Spending Tabulation</h3>
                <div class="table-container" style="border:none;">
                    <table>
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th style="text-align: right;">Percentage</th>
                                <th style="text-align: right;">Amount Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${markSafe(bodyContent)}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center;">
                <div class="kpi-icon-wrap bg-info" style="width:60px; height:60px; font-size:1.8rem; margin-bottom:16px;"><i class="ti-calendar"></i></div>
                <h3 style="font-size:1.4rem; font-weight:800;">${formatCurrency(data.avg_daily_spend)}</h3>
                <span style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">Average Daily Spending</span>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:8px; line-height:1.4; padding: 0 16px;">
                    Calculated by dividing total month expenses by days in month. Use this to track budget paces.
                </p>
            </div>
        </div>
    `;
}

function renderYearlyPreview(data) {
    const container = document.getElementById("reports-preview-container");
    if (!container) return;

    const rows = data.monthly_table.map(row => {
        const isPositive = row.savings >= 0;
        return safeHtml`
            <tr>
                <td><span style="font-weight:600;">${row.month_name}</span></td>
                <td class="amount-col income">${formatCurrency(row.income)}</td>
                <td class="amount-col expense">${formatCurrency(row.expense)}</td>
                <td class="amount-col" style="color:${isPositive ? "var(--color-success)" : "var(--color-danger)"}">
                    ${formatCurrency(row.savings)}
                </td>
            </tr>
        `;
    });

    container.innerHTML = safeHtml`
        <!-- Overview Grid -->
        <div class="grid-cols-4" style="margin-bottom: 24px;">
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Yearly Income</span>
                <h3 class="amount-col income" style="text-align:left; font-size:1.25rem; margin-top:4px;">${formatCurrency(data.total_income)}</h3>
            </div>
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Yearly Expenses</span>
                <h3 class="amount-col expense" style="text-align:left; font-size:1.25rem; margin-top:4px;">${formatCurrency(data.total_expense)}</h3>
            </div>
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Net Savings</span>
                <h3 class="amount-col" style="text-align:left; font-size:1.25rem; margin-top:4px; color:${data.net_savings >= 0 ? "var(--color-success)" : "var(--color-danger)"}">${formatCurrency(data.net_savings)}</h3>
            </div>
            <div class="card" style="padding:16px;">
                <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:500;">Savings Rate</span>
                <h3 style="text-align:left; font-size:1.25rem; margin-top:4px; font-weight:700;">${data.savings_rate.toFixed(1)}%</h3>
            </div>
        </div>

        <!-- Table Row -->
        <div class="card">
            <h3 class="card-title">Yearly Monthly statement preview</h3>
            <div class="table-container" style="border:none;">
                <table>
                    <thead>
                        <tr>
                            <th>Month</th>
                            <th style="text-align: right;">Income</th>
                            <th style="text-align: right;">Expenses</th>
                            <th style="text-align: right;">Savings</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${markSafe(rows.join(""))}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function formatPercent(value) {
    return `${parseFloat(value).toFixed(1)}%`;
}

function attachListeners() {
    // 1. Tab switches
    const tabContainer = document.getElementById("reports-type-tabs");
    if (tabContainer) {
        tabContainer.addEventListener("click", (e) => {
            const tab = e.target.closest(".tab");
            if (tab) {
                tabContainer.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                
                activeReportTab = tab.getAttribute("data-type");
                
                // Show/hide inputs
                const monthlyInputs = document.getElementById("reports-monthly-inputs");
                const yearlyInputs = document.getElementById("reports-yearly-inputs");
                
                if (activeReportTab === "monthly") {
                    if (monthlyInputs) monthlyInputs.style.display = "flex";
                    if (yearlyInputs) yearlyInputs.style.display = "none";
                } else {
                    if (monthlyInputs) monthlyInputs.style.display = "none";
                    if (yearlyInputs) yearlyInputs.style.display = "flex";
                }
                
                loadReport();
            }
        });
    }

    // 2. Month filter picker
    const monthPicker = document.getElementById("reports-month-filter");
    if (monthPicker) {
        monthPicker.addEventListener("change", (e) => {
            selectedMonth = e.target.value;
            loadReport();
        });
    }

    // 3. Year filter picker
    const yearPicker = document.getElementById("reports-year-filter");
    if (yearPicker) {
        yearPicker.addEventListener("change", (e) => {
            selectedYear = parseInt(e.target.value);
            loadReport();
        });
    }

    // 4. Download buttons
    const csvBtn = document.getElementById("export-csv-btn");
    if (csvBtn) {
        csvBtn.addEventListener("click", async () => {
            csvBtn.disabled = true;
            try {
                await reportService.exportCsv(selectedMonth);
                toast.success("CSV report downloaded successfully");
            } catch (err) {
                toast.error(`Export failed: ${err.message}`);
            } finally {
                csvBtn.disabled = false;
            }
        });
    }

    const xlsxBtn = document.getElementById("export-xlsx-btn");
    if (xlsxBtn) {
        xlsxBtn.addEventListener("click", async () => {
            xlsxBtn.disabled = true;
            try {
                await reportService.exportXlsx(selectedMonth);
                toast.success("Excel report downloaded successfully");
            } catch (err) {
                toast.error(`Export failed: ${err.message}`);
            } finally {
                xlsxBtn.disabled = false;
            }
        });
    }

    const pdfBtn = document.getElementById("export-pdf-btn");
    if (pdfBtn) {
        pdfBtn.addEventListener("click", async () => {
            pdfBtn.disabled = true;
            try {
                await reportService.exportPdf(selectedMonth);
                toast.success("PDF report downloaded successfully");
            } catch (err) {
                toast.error(`Export failed: ${err.message}`);
            } finally {
                pdfBtn.disabled = false;
            }
        });
    }
}
