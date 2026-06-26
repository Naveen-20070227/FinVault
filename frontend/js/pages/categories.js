import { categoryService } from "../services/category.service.js";
import { modalManager } from "../utils/modal.js";
import { toast } from "../utils/toast.js";
import { skeleton } from "../utils/skeleton.js";
import { safeHtml, markSafe } from "../utils/dom.js";
import { store } from "../store.js";

let filterType = "";
let deleteTargetId = null;

export async function init() {
    await loadCategories();
    attachListeners();
}

export function destroy() {
    // Teardown event listeners
}

async function loadCategories() {
    const container = document.getElementById("categories-grid-container");
    if (!container) return;

    // Show skeletons
    container.innerHTML = skeleton.cardGrid(3);

    try {
        const categories = await categoryService.getAll(filterType);
        renderGrid(categories);
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="grid-column: span 3; text-align:center; padding: 24px; color:var(--color-danger)">
                <p>Failed to load categories: ${err.message}</p>
            </div>
        `;
    }
}

function renderGrid(categories) {
    const container = document.getElementById("categories-grid-container");
    if (!container) return;

    if (categories.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-secondary)">
                <i class="ti-folder" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                <p>No categories found. Create a new category to get started!</p>
            </div>
        `;
        return;
    }

    const cards = categories.map(cat => {
        return safeHtml`
            <div class="card category-card fade-in">
                <div class="category-icon-circle" style="background-color: ${cat.color}">
                    <i class="${cat.icon}"></i>
                </div>
                <div class="category-meta">
                    <span class="category-name-label">${cat.name}</span>
                    <span class="category-type-label">${cat.type.toUpperCase()}</span>
                </div>
                <div class="category-actions">
                    <button class="btn btn-secondary btn-icon edit-cat-btn" data-id="${cat.id}" style="width:28px; height:28px;" title="Edit">
                        <i class="ti-pencil" style="font-size:0.75rem;"></i>
                    </button>
                    <button class="btn btn-danger btn-icon delete-cat-btn" data-id="${cat.id}" style="width:28px; height:28px;" title="Delete">
                        <i class="ti-trash" style="font-size:0.75rem;"></i>
                    </button>
                </div>
            </div>
        `;
    });

    container.innerHTML = cards.join("");
}

function attachListeners() {
    // 1. Tab switches
    const tabs = document.getElementById("categories-type-tab");
    if (tabs) {
        tabs.addEventListener("click", (e) => {
            const tab = e.target.closest(".tab");
            if (tab) {
                // Remove active class
                tabs.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
                tab.classList.add("active");
                
                filterType = tab.getAttribute("data-type");
                loadCategories();
            }
        });
    }

    // 2. Add Category button click opens Modal
    const addBtn = document.getElementById("add-category-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openCategoryModal();
        });
    }

    // 3. Form submit (create or update)
    const form = document.getElementById("category-form");
    if (form && !form.dataset.listenerAttached) {
        form.dataset.listenerAttached = "true";
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (store.state.currentPath !== "/categories") return;
            
            const id = document.getElementById("category-id").value;
            const payload = {
                name: document.getElementById("cat-name").value,
                type: document.getElementById("cat-type").value,
                icon: document.getElementById("cat-icon").value,
                color: document.getElementById("cat-color").value
            };

            try {
                if (id) {
                    await categoryService.update(id, payload);
                    toast.success("Category updated successfully");
                } else {
                    await categoryService.create(payload);
                    toast.success("Category created successfully");
                }
                modalManager.close("category-modal");
                await loadCategories();
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            }
        });
    }

    // 4. Delegated Edit / Delete Actions (replaces individual bindings)
    if (!document._categoriesListenerAttached) {
        document._categoriesListenerAttached = true;
        document.addEventListener("click", (e) => {
            if (store.state.currentPath !== "/categories") return;
            
            const editBtn = e.target.closest(".edit-cat-btn");
            const deleteBtn = e.target.closest(".delete-cat-btn");

            if (editBtn) {
                const catId = editBtn.getAttribute("data-id");
                openCategoryModal(parseInt(catId));
            }

            if (deleteBtn) {
                const catId = deleteBtn.getAttribute("data-id");
                deleteTargetId = parseInt(catId);
                modalManager.open("delete-confirm-modal");
            }
        });
    }

    // 5. Delete Confirm action listener
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
    if (confirmDeleteBtn && !confirmDeleteBtn.dataset.catListenerAttached) {
        confirmDeleteBtn.dataset.catListenerAttached = "true";
        confirmDeleteBtn.addEventListener("click", async () => {
            if (store.state.currentPath !== "/categories") return;
            
            if (deleteTargetId) {
                try {
                    await categoryService.delete(deleteTargetId);
                    toast.success("Category deleted successfully");
                    modalManager.close("delete-confirm-modal");
                    await loadCategories();
                } catch (err) {
                    // This triggers the 400 error toast alert on cascade blocks
                    toast.error(`Delete failed: ${err.message}`);
                } finally {
                    deleteTargetId = null;
                }
            }
        });
    }
}

async function openCategoryModal(editId = null) {
    const titleEl = document.getElementById("category-modal-title");
    const idField = document.getElementById("category-id");
    const form = document.getElementById("category-form");
    
    if (form) form.reset();

    if (editId) {
        titleEl.textContent = "Edit Category";
        idField.value = editId;
        
        try {
            // Find category data locally or fetch it
            const categories = await categoryService.getAll();
            const cat = categories.find(c => c.id === editId);
            if (cat) {
                document.getElementById("cat-name").value = cat.name;
                document.getElementById("cat-type").value = cat.type;
                document.getElementById("cat-icon").value = cat.icon;
                document.getElementById("cat-color").value = cat.color;
            }
        } catch (err) {
            toast.error(`Failed to load details: ${err.message}`);
            return;
        }
    } else {
        titleEl.textContent = "Add Category";
        idField.value = "";
        
        // Set default values
        document.getElementById("cat-type").value = "expense";
        document.getElementById("cat-icon").value = "ti-tag";
        document.getElementById("cat-color").value = "#7C3AED";
    }

    modalManager.open("category-modal");
}
