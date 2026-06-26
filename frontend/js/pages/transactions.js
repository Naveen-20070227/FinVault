import { transactionService } from "../services/transaction.service.js";
import { categoryService } from "../services/category.service.js";
import { formatCurrency, formatDate, getCurrentMonthStr } from "../utils/formatters.js";
import { modalManager } from "../utils/modal.js";
import { toast } from "../utils/toast.js";
import { skeleton } from "../utils/skeleton.js";
import { safeHtml, markSafe } from "../utils/dom.js";
import { store } from "../store.js";

// Page State
let filters = {
    page: 1,
    limit: 15,
    search: "",
    type: "",
    category_id: "",
    month: getCurrentMonthStr(),
    sort: "date_desc"
};

let allCategories = [];
let deleteTargetId = null;
let searchDebounceTimeout = null;

export async function init() {
    // 1. Initialize month picker to current month
    const monthPicker = document.getElementById("tx-month-input");
    if (monthPicker) {
        monthPicker.value = filters.month;
    }

    // 2. Fetch categories and transactions
    await fetchCategories();
    await loadTransactions();

    // 3. Attach Listeners
    attachPageListeners();
}

export function destroy() {
    // Teardown timeouts or scroll listeners if any
    if (searchDebounceTimeout) clearTimeout(searchDebounceTimeout);
}

async function fetchCategories() {
    try {
        allCategories = await categoryService.getAll();
        populateFilterCategories();
    } catch (err) {
        console.error("Failed to load categories", err);
    }
}

function populateFilterCategories() {
    const filterSelect = document.getElementById("tx-category-filter");
    if (!filterSelect) return;
    
    // Keep first option
    filterSelect.innerHTML = `<option value="">All Categories</option>`;
    
    allCategories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = `${cat.name} (${cat.type})`;
        filterSelect.appendChild(option);
    });
}

// Populate Category dropdown inside Modal depending on Type chosen (fixes H9 mismatch)
function populateFormCategories(type) {
    const select = document.getElementById("tx-category");
    if (!select) return;
    
    select.innerHTML = "";
    const filtered = allCategories.filter(cat => cat.type === type);
    
    if (filtered.length === 0) {
        select.innerHTML = `<option value="">No categories. Create one first!</option>`;
        return;
    }

    filtered.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat.id;
        option.textContent = cat.name;
        select.appendChild(option);
    });
}

async function loadTransactions() {
    const container = document.getElementById("transactions-list-container");
    if (!container) return;

    // Render skeleton loading state
    container.innerHTML = skeleton.table(10, 6);

    try {
        const [txs, countData] = await Promise.all([
            transactionService.getAll(filters),
            transactionService.getCount(filters)
        ]);

        renderTable(txs);
        updatePagination(countData.count);

    } catch (err) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 24px; color:var(--color-danger)">
                <p>Failed to load transactions: ${err.message}</p>
            </div>
        `;
    }
}

function renderTable(transactions) {
    const container = document.getElementById("transactions-list-container");
    if (!container) return;

    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align:center; padding: 40px; color:var(--text-secondary)">
                <i class="ti-exchange-vertical" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                <p>No transactions found for the selected filters.</p>
            </div>
        `;
        return;
    }

    const rows = transactions.map(tx => {
        const catName = tx.category ? tx.category.name : "Uncategorized";
        const catColor = tx.category ? tx.category.color : "#7C3AED";
        const isExpense = tx.type === "expense";
        
        // Receipt file download/view button
        let receiptEl = "-";
        if (tx.receipt_image) {
            receiptEl = safeHtml`
                <a href="/uploads/${tx.receipt_image}" target="_blank" class="btn btn-secondary btn-icon" style="width:28px; height:28px;" title="View Receipt">
                    <i class="ti-image"></i>
                </a>
            `;
        }

        return safeHtml`
            <tr>
                <td><span style="font-weight:600;">${tx.title}</span></td>
                <td>
                    <span class="badge" style="background-color:${catColor}20; color:${catColor};">
                        ${catName}
                    </span>
                </td>
                <td>${formatDate(tx.date)}</td>
                <td style="text-align:center;">${receiptEl}</td>
                <td class="amount-col ${tx.type}">
                    ${isExpense ? "-" : "+"}${formatCurrency(tx.amount)}
                </td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="btn btn-secondary btn-icon edit-tx-btn" data-id="${tx.id}" style="width:30px; height:30px; margin-right:4px;" title="Edit">
                        <i class="ti-pencil"></i>
                    </button>
                    <button class="btn btn-danger btn-icon delete-tx-btn" data-id="${tx.id}" style="width:30px; height:30px;" title="Delete">
                        <i class="ti-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div class="table-container fade-in">
            <table>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Date</th>
                        <th style="text-align:center;">Receipt</th>
                        <th style="text-align:right;">Amount</th>
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.join("")}
                </tbody>
            </table>
        </div>
    `;
}

function updatePagination(totalCount) {
    const prevBtn = document.getElementById("tx-prev-page-btn");
    const nextBtn = document.getElementById("tx-next-page-btn");
    const info = document.getElementById("tx-pagination-info");

    const totalPages = Math.ceil(totalCount / filters.limit) || 1;
    
    if (prevBtn && nextBtn && info) {
        prevBtn.disabled = filters.page <= 1;
        nextBtn.disabled = filters.page >= totalPages;

        const startIdx = totalCount === 0 ? 0 : (filters.page - 1) * filters.limit + 1;
        const endIdx = Math.min(filters.page * filters.limit, totalCount);
        info.textContent = `Showing ${startIdx} - ${endIdx} of ${totalCount} transactions (Page ${filters.page}/${totalPages})`;
    }
}

function attachPageListeners() {
    // 1. Search Input (Debounced 300ms - cleans L7)
    const searchInput = document.getElementById("tx-search-input");
    if (searchInput) {
        searchInput.value = filters.search;
        searchInput.addEventListener("input", (e) => {
            clearTimeout(searchDebounceTimeout);
            filters.search = e.target.value;
            filters.page = 1;
            searchDebounceTimeout = setTimeout(() => loadTransactions(), 300);
        });
    }

    // 2. Month Picker
    const monthInput = document.getElementById("tx-month-input");
    if (monthInput) {
        monthInput.addEventListener("change", (e) => {
            filters.month = e.target.value;
            filters.page = 1;
            loadTransactions();
        });
    }

    // 3. Filters
    const typeSelect = document.getElementById("tx-type-filter");
    if (typeSelect) {
        typeSelect.value = filters.type;
        typeSelect.addEventListener("change", (e) => {
            filters.type = e.target.value;
            filters.page = 1;
            loadTransactions();
        });
    }

    const catSelect = document.getElementById("tx-category-filter");
    if (catSelect) {
        catSelect.value = filters.category_id;
        catSelect.addEventListener("change", (e) => {
            filters.category_id = e.target.value;
            filters.page = 1;
            loadTransactions();
        });
    }

    const sortSelect = document.getElementById("tx-sort-filter");
    if (sortSelect) {
        sortSelect.value = filters.sort;
        sortSelect.addEventListener("change", (e) => {
            filters.sort = e.target.value;
            filters.page = 1;
            loadTransactions();
        });
    }

    // 4. Pagination
    const prevBtn = document.getElementById("tx-prev-page-btn");
    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (filters.page > 1) {
                filters.page--;
                loadTransactions();
            }
        });
    }

    const nextBtn = document.getElementById("tx-next-page-btn");
    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            filters.page++;
            loadTransactions();
        });
    }

    // 5. Add Transaction button click opens Modal
    const addBtn = document.getElementById("add-transaction-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openTransactionModal();
        });
    }

    // 6. Form Type change triggers Category rebuild (fixes H9 type misalignment)
    const formType = document.getElementById("tx-type");
    if (formType && !formType.dataset.listenerAttached) {
        formType.dataset.listenerAttached = "true";
        formType.addEventListener("change", (e) => {
            populateFormCategories(e.target.value);
        });
    }

    // 7. Receipt File selection upload trigger
    const receiptInput = document.getElementById("tx-receipt");
    if (receiptInput && !receiptInput.dataset.listenerAttached) {
        receiptInput.dataset.listenerAttached = "true";
        receiptInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Immediately upload file and store reference
            const preview = document.getElementById("tx-receipt-preview");
            if (preview) {
                preview.style.display = "block";
                preview.textContent = "Uploading receipt...";
            }

            try {
                const res = await transactionService.uploadReceipt(file);
                document.getElementById("transaction-receipt-url").value = res.filename;
                if (preview) preview.textContent = `Uploaded: ${file.name}`;
            } catch (err) {
                toast.error(`Upload failed: ${err.message}`);
                if (preview) preview.textContent = "Upload failed.";
                receiptInput.value = ""; // Clear file choice
            }
        });
    }

    // 8. Form submit handler (creates or updates transaction)
    const form = document.getElementById("transaction-form");
    if (form && !form.dataset.listenerAttached) {
        form.dataset.listenerAttached = "true";
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById("transaction-submit-btn");
            if (submitBtn) submitBtn.disabled = true;

            const id = document.getElementById("transaction-id").value;
            const payload = {
                title: document.getElementById("tx-title").value,
                amount: parseFloat(document.getElementById("tx-amount").value),
                date: document.getElementById("tx-date").value,
                type: document.getElementById("tx-type").value,
                category_id: parseInt(document.getElementById("tx-category").value),
                notes: document.getElementById("tx-notes").value || null,
                receipt_image: document.getElementById("transaction-receipt-url").value || null
            };

            try {
                if (id) {
                    await transactionService.update(id, payload);
                    toast.success("Transaction updated successfully");
                } else {
                    await transactionService.create(payload);
                    toast.success("Transaction created successfully");
                }
                modalManager.close("transaction-modal");
                await loadTransactions();
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    // 9. Delegated Edit / Delete Actions (avoids H5 onclick closure leak)
    if (!document._txListenerAttached) {
        document._txListenerAttached = true;
        document.addEventListener("click", (e) => {
            if (store.state.currentPath !== "/transactions") return;
            
            const editBtn = e.target.closest(".edit-tx-btn");
            const deleteBtn = e.target.closest(".delete-tx-btn");

            if (editBtn) {
                const txId = editBtn.getAttribute("data-id");
                openTransactionModal(parseInt(txId));
            }

            if (deleteBtn) {
                const txId = deleteBtn.getAttribute("data-id");
                deleteTargetId = parseInt(txId);
                modalManager.open("delete-confirm-modal");
            }
        });
    }

    // 10. Delete Confirm action listener
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
    if (confirmDeleteBtn && !confirmDeleteBtn.dataset.txListenerAttached) {
        confirmDeleteBtn.dataset.txListenerAttached = "true";
        confirmDeleteBtn.addEventListener("click", async () => {
            if (store.state.currentPath !== "/transactions") return;
            
            if (deleteTargetId) {
                try {
                    await transactionService.delete(deleteTargetId);
                    toast.success("Transaction deleted successfully");
                    modalManager.close("delete-confirm-modal");
                    await loadTransactions();
                } catch (err) {
                    toast.error(`Delete failed: ${err.message}`);
                } finally {
                    deleteTargetId = null;
                }
            }
        });
    }
}

async function openTransactionModal(editId = null) {
    const titleEl = document.getElementById("transaction-modal-title");
    const idField = document.getElementById("transaction-id");
    const form = document.getElementById("transaction-form");
    
    if (form) form.reset();
    document.getElementById("transaction-receipt-url").value = "";
    const preview = document.getElementById("tx-receipt-preview");
    if (preview) {
        preview.style.display = "none";
        preview.textContent = "";
    }

    if (editId) {
        titleEl.textContent = "Edit Transaction";
        idField.value = editId;
        
        try {
            const tx = await transactionService.getById(editId);
            document.getElementById("tx-title").value = tx.title;
            document.getElementById("tx-amount").value = tx.amount;
            document.getElementById("tx-date").value = tx.date;
            document.getElementById("tx-type").value = tx.type;
            
            // Build matching category select list
            populateFormCategories(tx.type);
            document.getElementById("tx-category").value = tx.category_id;
            
            document.getElementById("tx-notes").value = tx.notes || "";
            document.getElementById("transaction-receipt-url").value = tx.receipt_image || "";
            
            if (tx.receipt_image && preview) {
                preview.style.display = "block";
                preview.textContent = `Stored receipt: ${tx.receipt_image.substring(0,25)}...`;
            }
        } catch (err) {
            toast.error(`Failed to fetch details: ${err.message}`);
            return;
        }
    } else {
        titleEl.textContent = "Add Transaction";
        idField.value = "";
        
        // Defaults: Set date to today, type to expense, load matching categories
        document.getElementById("tx-date").value = new Date().toISOString().split("T")[0];
        document.getElementById("tx-type").value = "expense";
        populateFormCategories("expense");
    }

    modalManager.open("transaction-modal");
}
