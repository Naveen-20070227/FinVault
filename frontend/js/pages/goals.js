import { goalService } from "../services/goal.service.js";
import { formatCurrency, formatDate } from "../utils/formatters.js";
import { modalManager } from "../utils/modal.js";
import { toast } from "../utils/toast.js";
import { skeleton } from "../utils/skeleton.js";
import { safeHtml, markSafe } from "../utils/dom.js";
import { store } from "../store.js";

let deleteTargetId = null;

export async function init() {
    await loadGoals();
    attachListeners();
}

export function destroy() {
    // Teardown
}

async function loadGoals() {
    const container = document.getElementById("goals-grid-container");
    if (!container) return;

    container.innerHTML = skeleton.cardGrid(3);

    try {
        const goals = await goalService.getAll();
        renderGrid(goals);
    } catch (err) {
        container.innerHTML = `
            <div class="card" style="grid-column: span 3; text-align:center; padding: 24px; color:var(--color-danger)">
                <p>Failed to load savings goals: ${err.message}</p>
            </div>
        `;
    }
}

function renderGrid(goals) {
    const container = document.getElementById("goals-grid-container");
    if (!container) return;

    if (goals.length === 0) {
        container.innerHTML = `
            <div class="card" style="grid-column: span 3; text-align:center; padding: 40px; color:var(--text-secondary)">
                <i class="ti-target" style="font-size: 2.5rem; margin-bottom: 8px;"></i>
                <p>No savings goals configured. Start your savings track by creating a goal!</p>
            </div>
        `;
        return;
    }

    const cards = goals.map(g => {
        const isComplete = g.status === "complete";
        
        // Progress ring: r=44, circumference = 2 * PI * r = ~276.46
        const radius = 44;
        const circ = 2 * Math.PI * radius;
        const progress = Math.min(g.progress_percent, 100);
        const offset = circ - (progress / 100) * circ;
        
        let ringColor = g.color || "var(--color-primary-500)";
        if (isComplete) ringColor = "var(--color-success)";

        let contributeBtn = safeHtml`
            <button class="btn btn-primary contribute-goal-btn" data-id="${g.id}" style="width:100%;">
                <i class="ti-piggy-bank"></i><span>Contribute</span>
            </button>
        `;
        if (isComplete) {
            contributeBtn = safeHtml`
                <button class="btn btn-success" style="width:100%; cursor:default;" disabled>
                    <i class="ti-check"></i><span>Goal Reached!</span>
                </button>
            `;
        }

        return safeHtml`
            <div class="card goal-card ${isComplete ? "complete" : ""} fade-in" data-id="${g.id}">
                <div class="goal-corner-actions">
                    <button class="btn btn-secondary btn-icon edit-goal-btn" style="width:26px; height:26px;">
                        <i class="ti-pencil" style="font-size:0.7rem;"></i>
                    </button>
                    <button class="btn btn-danger btn-icon delete-goal-btn" style="width:26px; height:26px;">
                        <i class="ti-trash" style="font-size:0.7rem;"></i>
                    </button>
                </div>
                
                <span class="goal-title-lbl">${g.title}</span>

                <div class="goal-ring-wrap">
                    <svg width="100" height="100" style="transform: rotate(-90deg);">
                        <circle stroke="var(--border-color)" stroke-width="8" fill="transparent" r="44" cx="50" cy="50"/>
                        <circle stroke="${ringColor}" stroke-width="8" fill="transparent" r="44" cx="50" cy="50"
                                style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}; transition: stroke-dashoffset 0.8s ease-out;"/>
                    </svg>
                    <div class="goal-ring-text">${g.progress_percent.toFixed(0)}%</div>
                </div>

                <div class="goal-amount-details">
                    <div style="display:flex; flex-direction:column; align-items:flex-start;">
                        <span style="font-size:0.7rem; color:var(--text-muted);">Saved</span>
                        <b style="color:var(--color-success); font-size:1rem;">${formatCurrency(g.saved_amount)}</b>
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end;">
                        <span style="font-size:0.7rem; color:var(--text-muted);">Target</span>
                        <b style="font-size:1rem;">${formatCurrency(g.target_amount)}</b>
                    </div>
                </div>

                <div class="goal-footer-meta">
                    <span>Due: <b>${formatDate(g.deadline)}</b></span>
                    <span><b>${g.days_remaining}</b> days left</span>
                </div>

                <div style="width:100%; margin-top:8px;">
                    ${markSafe(contributeBtn)}
                </div>
            </div>
        `;
    });

    container.innerHTML = cards.join("");
}

function attachListeners() {
    // 1. Add Goal button
    const addBtn = document.getElementById("add-goal-btn");
    if (addBtn) {
        addBtn.addEventListener("click", () => {
            openGoalModal();
        });
    }

    // 2. Goal creation form submit
    const form = document.getElementById("goal-form");
    if (form && !form.dataset.listenerAttached) {
        form.dataset.listenerAttached = "true";
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (store.state.currentPath !== "/goals") return;

            const id = document.getElementById("goal-id").value;
            const payload = {
                title: document.getElementById("goal-title").value,
                target_amount: parseFloat(document.getElementById("goal-target").value),
                deadline: document.getElementById("goal-deadline").value,
                icon: document.getElementById("goal-icon").value,
                color: document.getElementById("goal-color").value
            };

            try {
                if (id) {
                    await goalService.update(id, payload);
                    toast.success("Savings goal updated successfully");
                } else {
                    await goalService.create(payload);
                    toast.success("Savings goal created successfully");
                }
                modalManager.close("goal-modal");
                await loadGoals();
            } catch (err) {
                toast.error(`Save failed: ${err.message}`);
            }
        });
    }

    // 3. Goal Contribution form submit (fixes H4)
    const contribForm = document.getElementById("goal-contribute-form");
    if (contribForm && !contribForm.dataset.listenerAttached) {
        contribForm.dataset.listenerAttached = "true";
        contribForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (store.state.currentPath !== "/goals") return;

            const goalId = document.getElementById("goal-contribute-id").value;
            const amount = parseFloat(document.getElementById("goal-contrib-amount").value);

            try {
                await goalService.contribute(goalId, amount);
                toast.success("Contribution recorded!");
                modalManager.close("goal-contribute-modal");
                await loadGoals();
            } catch (err) {
                toast.error(`Contribution failed: ${err.message}`);
            }
        });
    }

    // 4. Delegated Click listeners: Contribute, Edit, Delete
    if (!document._goalsListenerAttached) {
        document._goalsListenerAttached = true;
        document.addEventListener("click", (e) => {
            if (store.state.currentPath !== "/goals") return;

            const contribBtn = e.target.closest(".contribute-goal-btn");
            const editBtn = e.target.closest(".edit-goal-btn");
            const deleteBtn = e.target.closest(".delete-goal-btn");
            
            const card = e.target.closest(".goal-card");
            if (!card) return;
            const goalId = parseInt(card.getAttribute("data-id"));

            if (contribBtn) {
                openContributionModal(goalId);
            }

            if (editBtn) {
                openGoalModal(goalId);
            }

            if (deleteBtn) {
                deleteTargetId = goalId;
                modalManager.open("delete-confirm-modal");
            }
        });
    }

    // 5. Delete Confirm
    const confirmDeleteBtn = document.getElementById("delete-confirm-btn");
    if (confirmDeleteBtn && !confirmDeleteBtn.dataset.goalListenerAttached) {
        confirmDeleteBtn.dataset.goalListenerAttached = "true";
        confirmDeleteBtn.addEventListener("click", async () => {
            if (store.state.currentPath !== "/goals") return;
            
            if (deleteTargetId) {
                try {
                    await goalService.delete(deleteTargetId);
                    toast.success("Goal deleted successfully");
                    modalManager.close("delete-confirm-modal");
                    await loadGoals();
                } catch (err) {
                    toast.error(`Delete failed: ${err.message}`);
                } finally {
                    deleteTargetId = null;
                }
            }
        });
    }
}

async function openGoalModal(editId = null) {
    const titleEl = document.getElementById("goal-modal-title");
    const idField = document.getElementById("goal-id");
    const form = document.getElementById("goal-form");
    
    if (form) form.reset();

    if (editId) {
        titleEl.textContent = "Edit Savings Goal";
        idField.value = editId;
        
        try {
            const goals = await goalService.getAll();
            const g = goals.find(x => x.id === editId);
            if (g) {
                document.getElementById("goal-title").value = g.title;
                document.getElementById("goal-target").value = g.target_amount;
                document.getElementById("goal-deadline").value = g.deadline;
                document.getElementById("goal-icon").value = g.icon;
                document.getElementById("goal-color").value = g.color;
            }
        } catch (err) {
            toast.error(`Failed to load details: ${err.message}`);
            return;
        }
    } else {
        titleEl.textContent = "New Savings Goal";
        idField.value = "";
        
        // Defaults: Set deadline to 6 months from now
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 6);
        document.getElementById("goal-deadline").value = futureDate.toISOString().split("T")[0];
        document.getElementById("goal-icon").value = "ti-target";
        document.getElementById("goal-color").value = "#7C3AED";
    }

    modalManager.open("goal-modal");
}

async function openContributionModal(goalId) {
    const idField = document.getElementById("goal-contribute-id");
    const titleLabel = document.getElementById("goal-contribute-title");
    const savedLabel = document.getElementById("goal-contribute-saved");
    const targetLabel = document.getElementById("goal-contribute-target");
    const amountField = document.getElementById("goal-contrib-amount");
    
    if (amountField) amountField.value = "";
    
    try {
        const goals = await goalService.getAll();
        const g = goals.find(x => x.id === goalId);
        
        if (g) {
            idField.value = g.id;
            titleLabel.textContent = g.title;
            savedLabel.textContent = formatCurrency(g.saved_amount);
            targetLabel.textContent = formatCurrency(g.target_amount);
            
            // Set max contribution to remaining amount
            const remaining = g.target_amount - g.saved_amount;
            amountField.max = remaining;
            amountField.value = remaining.toFixed(2);
            
            modalManager.open("goal-contribute-modal");
        }
    } catch (err) {
        toast.error(`Failed to load goal: ${err.message}`);
    }
}
