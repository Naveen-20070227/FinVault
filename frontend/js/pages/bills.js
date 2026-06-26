import { billService } from "../services/bill.service.js";
import { categoryService } from "../services/category.service.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { modalManager } from "../utils/modal.js";
import { toast } from "../utils/toast.js";
import { skeleton } from "../utils/skeleton.js";
import { safeHtml, markSafe } from "../utils/dom.js";
import { store } from "../store.js";

let deleteTargetId = null;

export async function init() {
    await fetchExpenseCategories();
    await loadBills();
    attachListeners();
}

export function destroy() {
    // Teardown page
}

async function fetchExpenseCategories() {
    try {
        const categories = await categoryService.getAll("expense");
        const select = document.getElementById("bill-category");
        if (select) {
            select.innerHTML = `<option value="">No category linked</option>`;
            categories.forEach(cat => {
                const opt = document.createElement("option");
                opt.value = cat.id;
                opt.textContent = cat.name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

async function loadBills() {
    const overdueCol = document.getElementById("bills-overdue-col");
    const soonCol = document.getElementById("bills-soon-col");
    const upcomingCol = document.getElementById("bills-upcoming-col");

    if (!overdueCol || !soonCol || !upcomingCol) return;

    // Show skeletons
    overdueCol.innerHTML = skeleton.table(2, 1);
    soonCol.innerHTML = skeleton.table(2, 1);
    upcomingCol.innerHTML = skeleton.table(2, 1);

    try {
        const bills = await billService.getAll();
        
        overdueCol.innerHTML = "";
        soonCol.innerHTML = "";
        upcomingCol.innerHTML = "";

        const today = new Date();
        today.setHours(0,0,0,0);
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(today.getDate() + 7);
        sevenDaysLater.setHours(23,59,59,999);

        let overdueCount = 0;
        let soonCount = 0;
        let upcomingCount = 0;

        bills.forEach(b => {
            const dueDate = new Date(b.due_date);
            const isOverdue = b.status === "pending" && dueDate < today;
            const isDueSoon = b.status === "pending" && dueDate >= today && dueDate <= sevenDaysLater;
            
            // Build card
            const card = document.createElement("div");
            card.dataset.id = b.id;
            
            let statusBadge = "";
            let actionBtn = "";
            
            if (b.status === "paid") {
                card.className = "card bill-card paid fade-in";
                statusBadge = `<span class="badge badge-paid"><i class="ti-check" style="margin-right:4px;"></i>Paid</span>`;
                actionBtn = `<button class="btn btn-secondary unpay-bill-btn" style="padding:4px 8px; font-size:0.75rem;">Unpay</button>`;
                upcomingCount++;
            } else if (isOverdue) {
                card.className = "card bill-card overdue fade-in";
                statusBadge = `<span class="badge badge-overdue"><i class="ti-alert" style="margin-right:4px;"></i>Overdue</span>`;
                actionBtn = `<button class="btn btn-primary pay-bill-btn" style="padding:4px 10px; font-size:0.8rem;">Pay Bill</button>`;
                overdueCount++;
            } else if (isDueSoon) {
                card.className = "card bill-card due-soon fade-in";
                statusBadge = `<span class="badge badge-pending"><i class="ti-timer" style="margin-right:4px;"></i>Due Soon</span>`;
                actionBtn = `<button class="btn btn-primary pay-bill-btn" style="padding:4px 10px; font-size:0.8rem;">Pay Bill</button>`;
                soonCount++;
            } else {
                card.className = "card bill-card fade-in";
                statusBadge = `<span class="badge badge-pending">Upcoming</span>`;
                actionBtn = `<button class="btn btn-primary pay-bill-btn" style="padding:4px 10px; font-size:0.8rem;">Pay Bill</button>`;
                upcomingCount++;
            }

            const catName = b.category ? b.category.name : "Utilities";
            
            // Safe HTML inject
            card.innerHTML = safeHtml`
                <div class="bill-corner-actions">
                    <button class="btn btn-secondary btn-icon edit-bill-btn" style="width:26px; height:26px;">
                        <i class="ti-pencil" style="font-size:0.7rem;"></i>
                    </button>
                    <button class="btn btn-danger btn-icon delete-bill-btn" style="width:26px; height:26px;">
                        <i class="ti-trash" style="font-size:0.7rem;"></i>
                    </button>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span class="bill-title-label">${b.title}</span>
                    ${markSafe(statusBadge)}
                </div>
                <div class="bill-meta-info">
                    <span>Due: <b>${formatDate(b.due_date)}</b></span>
                    <span>${b.frequency}</span>
                </div>
                <div class="bill-card-actions">
                    <span class="amount-col expense" style="font-size:1.1rem;">
                        ${formatCurrency(b.amount)}
                    </span>
                    ${markSafe(actionBtn)}
                </div>
            `;

            // Append to appropriate column
            if (b.status === "paid") {
                upcomingCol.appendChild(card);
            } else if (isOverdue) {
                overdueCol.appendChild(card);
            } else if (isDueSoon) {
                soonCol.appendChild(card);
            } else {
                upcomingCol.appendChild(card);
            }
        });

        // Add empty indicators if columns are empty
        if (overdueCount === 0) {
            overdueCol.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border-color); border-radius:8px;">No overdue bills.</div>`;
        }
        if (soonCount === 0) {
            soonCol.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border-color); border-radius:8px;">No bills due in next 7 days.</div>`;
        }
        if (upcomingCount === 0) {
            upcomingCol.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border-color); border-radius:8px;">No paid or upcoming bills.</div>`;
        }

    } catch (err) {
        overdueCol.innerHTML = soonCol.innerHTML = upcomingCol.innerHTML = `
            <div style="color:var(--color-danger); font-size:0.8rem;">Failed to load.</div>
        `;
    }
}

function attachListeners() {
    // 1. Add Bill button
    const addBtn = document.getElementById("add-bill-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openBillModal();
        });
    }

    // 2. Form submit (create or update)
    const form = document.getElementById("bill-form");
    if (form && !form.dataset.listenerAttached) {
        form.dataset.listenerAttached = "true";
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (store.state.currentPath !== "/bills") return;

            const id = document.getElementById("bill-id").value;
            const payload = {
                title: document.getElementById("bill-title").value,
                amount: parseFloat(document.getElementById("bill-amount").value),
                frequency: document.getElementById("bill-frequency").value,
                due_date: document.getElementById("bill-due").value,
                category_id: document.getElementById("bill-category").value ? parseInt(document.getElementById("bill-category").value) : null
            };

            try {
                if (id) {
                    await billService.update(id, payload);
                    toast.success("Bill updated successfully");
                } else {
                    await billService.create(payload);
                    toast.success("Bill registered successfully");
                }
                modalManager.close("bill-modal");
                await loadBills();
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            }
        });
    }

    // 3. Delegated actions: Pay, Unpay, Edit, Delete
    if (!document._billsListenerAttached) {
        document._billsListenerAttached = true;
        document.addEventListener("click", async (e) => {
            if (store.state.currentPath !== "/bills") return;

            const payBtn = e.target.closest(".pay-bill-btn");
            const unpayBtn = e.target.closest(".unpay-bill-btn");
            const editBtn = e.target.closest(".edit-bill-btn");
            const deleteBtn = e.target.closest(".delete-bill-btn");
            
            const card = e.target.closest(".bill-card");
            if (!card) return;
            const billId = parseInt(card.getAttribute("data-id"));

            if (payBtn) {
                payBtn.disabled = true;
                try {
                    // Paying advances due date & creates transaction (closes H1 double-click)
                    await billService.pay(billId);
                    toast.success("Bill marked as paid. Expense transaction created.");
                    await loadBills();
                } catch (err) {
                    toast.error(`Payment failed: ${err.message}`);
                    payBtn.disabled = false;
                }
            }

            if (unpayBtn) {
                unpayBtn.disabled = true;
                try {
                    await billService.unpay(billId);
                    toast.success("Bill payment undone. Expense transaction removed.");
                    await loadBills();
                } catch (err) {
                    toast.error(`Action failed: ${err.message}`);
                    unpayBtn.disabled = false;
                }
            }

            if (editBtn) {
                openBillModal(billId);
            }

            if (deleteBtn) {
                deleteTargetId = billId;
                modalManager.open("delete-confirm-modal");
            }
        });
    }

    // 4. Delete Confirm
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
    if (confirmDeleteBtn && !confirmDeleteBtn.dataset.billListenerAttached) {
        confirmDeleteBtn.dataset.billListenerAttached = "true";
        confirmDeleteBtn.addEventListener("click", async () => {
            if (store.state.currentPath !== "/bills") return;
            
            if (deleteTargetId) {
                try {
                    await billService.delete(deleteTargetId);
                    toast.success("Bill deleted successfully");
                    modalManager.close("delete-confirm-modal");
                    await loadBills();
                } catch (err) {
                    toast.error(`Delete failed: ${err.message}`);
                } finally {
                    deleteTargetId = null;
                }
            }
        });
    }
}

async function openBillModal(editId = null) {
    const titleEl = document.getElementById("bill-modal-title");
    const idField = document.getElementById("bill-id");
    const form = document.getElementById("bill-form");
    
    if (form) form.reset();

    if (editId) {
        titleEl.textContent = "Edit Bill Settings";
        idField.value = editId;
        
        try {
            const bills = await billService.getAll();
            const b = bills.find(x => x.id === editId);
            if (b) {
                document.getElementById("bill-title").value = b.title;
                document.getElementById("bill-amount").value = b.amount;
                document.getElementById("bill-due").value = b.due_date;
                document.getElementById("bill-frequency").value = b.frequency;
                document.getElementById("bill-category").value = b.category_id || "";
            }
        } catch (err) {
            toast.error(`Failed to load details: ${err.message}`);
            return;
        }
    } else {
        titleEl.textContent = "Add Bill / Subscription";
        idField.value = "";
        document.getElementById("bill-due").value = new Date().toISOString().split("T")[0];
        document.getElementById("bill-frequency").value = "Monthly";
    }

    modalManager.open("bill-modal");
}
