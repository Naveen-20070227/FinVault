import { budgetService } from "../services/budget.service.js";
import { categoryService } from "../services/category.service.js";
import { formatCurrency, formatPercent, getCurrentMonthStr } from "../utils/formatters.js";
import { modalManager } from "../utils/modal.js";
import { toast } from "../utils/toast.js";
import { skeleton } from "../utils/skeleton.js";
import { safeHtml, markSafe } from "../utils/dom.js";
import { store } from "../store.js";

let filterMonth = getCurrentMonthStr().split("-")[1];
let filterYear = getCurrentMonthStr().split("-")[0];
let expenseCategories = [];
let deleteTargetId = null;

export async function init() {
    // 1. Initialize filter value
    const periodInput = document.getElementById("budget-period-filter");
    if (periodInput) {
        periodInput.value = `${filterYear}-${filterMonth}`;
    }

    // 2. Fetch categories and budgets
    await fetchExpenseCategories();
    await loadBudgets();

    // 3. Attach Listeners
    attachListeners();
}

export function destroy() {
    // Page cleanup
}

async function fetchExpenseCategories() {
    try {
        const categories = await categoryService.getAll("expense");
        expenseCategories = categories;
        
        // Populate modal select
        const modalSelect = document.getElementById("budget-category");
        if (modalSelect) {
            modalSelect.innerHTML = "";
            if (categories.length === 0) {
                modalSelect.innerHTML = `<option value="">Create expense category first!</option>`;
            } else {
                categories.forEach(cat => {
                    const opt = document.createElement("option");
                    opt.value = cat.id;
                    opt.textContent = cat.name;
                    modalSelect.appendChild(opt);
                });
            }
        }
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

async function loadBudgets() {
    const container = document.getElementById("budgets-grid-container");
    if (!container) return;

    container.innerHTML = skeleton.cardGrid(3);

    try {
        const budgets = await budgetService.getAll(parseInt(filterMonth), parseInt(filterYear));
        renderGrid(budgets);
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="grid-column: span 3; text-align:center; padding: 24px; color:var(--color-danger)">
                <p>Failed to load budgets: ${err.message}</p>
            </div>
        `;
    }
}

function renderGrid(budgets) {
    const container = document.getElementById("budgets-grid-container");
    if (!container) return;

    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-secondary)">
                <i class="ti-pie-chart" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                <p>No budgets configured for this month. Click "Set Budget" to define one.</p>
            </div>
        `;
        return;
    }

    const cards = budgets.map(b => {
        const catName = b.category ? b.category.name : "Category";
        const catColor = b.category ? b.category.color : "#7C3AED";
        const catIcon = b.category ? b.category.icon : "ti-tag";
        
        const cappedPercent = Math.min(b.utilization_percent, 100);
        
        // Choose semantic warning color (closes L9 color drift)
        let barColor = "var(--color-success)";
        if (b.utilization_percent >= 100) {
            barColor = "var(--color-danger)";
        } else if (b.utilization_percent >= store.state.budgetWarningPercent) {
            barColor = "var(--color-warning)";
        }

        return safeHtml`
            <div class="card budget-card fade-in" style="display:flex; flex-direction:column; gap:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="category-icon-circle" style="background-color: ${catColor}; width:38px; height:38px; font-size:1rem;">
                            <i class="${catIcon}"></i>
                        </div>
                        <span style="font-weight:700; font-size:1.05rem;">${catName}</span>
                    </div>
                    <span style="font-size:0.75rem; font-weight:600; color:var(--text-secondary); background-color:var(--color-primary-50); padding:4px 8px; border-radius:12px;">
                        ${b.utilization_percent.toFixed(0)}% Utilized
                    </span>
                </div>

                <div class="budget-progress-track" style="height:10px; margin-top:4px;">
                    <div class="budget-progress-bar" style="width: ${cappedPercent}%; background-color: ${barColor}"></div>
                </div>

                <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-secondary);">
                    <span>Spent: <b>${formatCurrency(b.spent)}</b></span>
                    <span>Limit: <b>${formatCurrency(b.budget_amount)}</b></span>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid var(--border-color); margin-top:4px;">
                    <span style="font-size:0.75rem; color:var(--text-muted);">
                        Remaining: <b style="color:${b.remaining < 0 ? "var(--color-danger)" : "var(--color-success)"}">${formatCurrency(b.remaining)}</b>
                    </span>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-secondary btn-icon edit-budget-btn" data-id="${b.id}" style="width:28px; height:28px;" title="Edit Amount">
                            <i class="ti-pencil" style="font-size:0.75rem;"></i>
                        </button>
                        <button class="btn btn-danger btn-icon delete-budget-btn" data-id="${b.id}" style="width:28px; height:28px;" title="Delete">
                            <i class="ti-trash" style="font-size:0.75rem;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = cards.join("");
}

function attachListeners() {
    // 1. Period filter change
    const periodInput = document.getElementById("budget-period-filter");
    if (periodInput) {
        periodInput.addEventListener("change", (e) => {
            const val = e.target.value;
            if (val) {
                const parts = val.split("-");
                filterYear = parts[0];
                filterMonth = parts[1];
                loadBudgets();
            }
        });
    }

    // 2. Add Budget button click
    const addBtn = document.getElementById("add-budget-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openBudgetModal();
        });
    }

    // 3. Form submit (handles upsert backend side)
    const form = document.getElementById("budget-form");
    if (form && !form.dataset.listenerAttached) {
        form.dataset.listenerAttached = "true";
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (store.state.currentPath !== "/budgets") return;

            const id = document.getElementById("budget-id").value;
            const payload = {
                category_id: parseInt(document.getElementById("budget-category").value),
                budget_amount: parseFloat(document.getElementById("budget-amount").value),
                month: parseInt(document.getElementById("budget-month").value),
                year: parseInt(document.getElementById("budget-year").value)
            };

            try {
                // If editing existing and category or period isn't changeable in UI, we update by calling create (upsert)
                await budgetService.create(payload);
                toast.success("Budget limit saved successfully");
                modalManager.close("budget-modal");
                await loadBudgets();
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            }
        });
    }

    // 4. Delegated Edit / Delete Actions
    if (!document._budgetsListenerAttached) {
        document._budgetsListenerAttached = true;
        document.addEventListener("click", (e) => {
            if (store.state.currentPath !== "/budgets") return;
            
            const editBtn = e.target.closest(".edit-budget-btn");
            const deleteBtn = e.target.closest(".delete-budget-btn");

            if (editBtn) {
                const bId = editBtn.getAttribute("data-id");
                openBudgetModal(parseInt(bId));
            }

            if (deleteBtn) {
                const bId = deleteBtn.getAttribute("data-id");
                deleteTargetId = parseInt(bId);
                modalManager.open("delete-confirm-modal");
            }
        });
    }

    // 5. Delete Confirm action listener
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
    if (confirmDeleteBtn && !confirmDeleteBtn.dataset.budgetListenerAttached) {
        confirmDeleteBtn.dataset.budgetListenerAttached = "true";
        confirmDeleteBtn.addEventListener("click", async () => {
            if (store.state.currentPath !== "/budgets") return;
            
            if (deleteTargetId) {
                try {
                    await budgetService.delete(deleteTargetId);
                    toast.success("Budget deleted successfully");
                    modalManager.close("delete-confirm-modal");
                    await loadBudgets();
                } catch (err) {
                    toast.error(`Delete failed: ${err.message}`);
                } finally {
                    deleteTargetId = null;
                }
            }
        });
    }
}

function populateYearOptions(selectedYear = null) {
    const yearSelect = document.getElementById("budget-year");
    if (!yearSelect) return;
    
    yearSelect.innerHTML = "";
    const currentYear = new Date().getFullYear();
    
    // Generate range +/- 3 years
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
        const opt = document.createElement("option");
        opt.value = y;
        opt.textContent = y;
        if (y === (selectedYear || currentYear)) {
            opt.selected = true;
        }
        yearSelect.appendChild(opt);
    }
}

async function openBudgetModal(editId = null) {
    const titleEl = document.getElementById("budget-modal-title");
    const idField = document.getElementById("budget-id");
    const form = document.getElementById("budget-form");
    
    if (form) form.reset();
    
    // Set default month/year values to currently filtered period
    document.getElementById("budget-month").value = parseInt(filterMonth);
    populateYearOptions(parseInt(filterYear));

    // Disable category and date edits if editing (standard financial restriction)
    document.getElementById("budget-category").disabled = false;
    document.getElementById("budget-month").disabled = false;
    document.getElementById("budget-year").disabled = false;

    if (editId) {
        titleEl.textContent = "Edit Budget Amount";
        idField.value = editId;
        
        try {
            const budgets = await budgetService.getAll(parseInt(filterMonth), parseInt(filterYear));
            const b = budgets.find(x => x.id === editId);
            if (b) {
                document.getElementById("budget-category").value = b.category_id;
                document.getElementById("budget-amount").value = b.budget_amount;
                document.getElementById("budget-month").value = b.month;
                populateYearOptions(b.year);

                // Lock fields to prevent period changes during edit (upsert safety)
                document.getElementById("budget-category").disabled = true;
                document.getElementById("budget-month").disabled = true;
                document.getElementById("budget-year").disabled = true;
            }
        } catch (err) {
            toast.error(`Failed to load details: ${err.message}`);
            return;
        }
    } else {
        titleEl.textContent = "Set Monthly Budget";
        idField.value = "";
    }

    modalManager.open("budget-modal");
}
