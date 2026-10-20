

const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const priorityInput = document.getElementById("priority");
const taskDate = document.getElementById("taskDate");
const taskList = document.getElementById("taskList");

const searchTasks = document.getElementById("searchTasks");
const filterTasks = document.getElementById("filterTasks");

const totalTasks = document.getElementById("totalTasks");
const completedTasks = document.getElementById("completedTasks");
const pendingTasks = document.getElementById("pendingTasks");
const sideTotal = document.getElementById("sideTotal");

const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const visibleCount = document.getElementById("visibleCount");

const emptyState = document.getElementById("emptyState");
const emptyTitle = document.getElementById("emptyTitle");
const emptyMessage = document.getElementById("emptyMessage");
const todayDate = document.getElementById("todayDate");

let tasks = [];

todayDate.textContent = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
});

async function api(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Something went wrong.");
    }

    return data;
}

async function loadTasks() {
    try {
        tasks = await api("/api/tasks");
        renderTasks();
        updateDashboard();
    } catch (error) {
        console.error("Loading tasks failed:", error);
        alert("Tasks load nahi hue. Flask server check karo.");
    }
}

function makeElement(tag, className, text = "") {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
}

function makeButton(label, className, onClick) {
    const button = makeElement("button", className, label);
    button.type = "button";
    button.addEventListener("click", onClick);
    return button;
}

function getVisibleTasks() {
    const query = searchTasks.value.trim().toLowerCase();
    const filter = filterTasks.value;

    return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(query);
        const done = Boolean(task.completed);

        const matchesFilter =
            filter === "all" ||
            (filter === "pending" && !done) ||
            (filter === "completed" && done);

        return matchesSearch && matchesFilter;
    });
}

function renderTasks() {
    taskList.replaceChildren();

    const visible = getVisibleTasks();
    visibleCount.textContent = `${visible.length} tasks`;

    if (visible.length === 0) {
        emptyState.hidden = false;
        emptyTitle.textContent = tasks.length === 0
            ? "Your space is ready to bloom! 🌷"
            : "No matching tasks found 🔎";
        emptyMessage.textContent = tasks.length === 0
            ? "Add your first task and start making progress."
            : "Try another search or filter.";
        return;
    }

    emptyState.hidden = true;

    visible.forEach(task => {
        const done = Boolean(task.completed);
        const card = makeElement("article", `task-card${done ? " completed" : ""}`);

        const check = makeButton(done ? "✓" : "", "task-check", () => toggleTask(task));
        check.setAttribute("aria-label", done ? "Mark pending" : "Mark completed");

        const details = makeElement("div", "task-details");
        details.appendChild(makeElement("div", "task-title", task.title));

        const meta = makeElement("div", "task-meta");
        const priorityClass = {
            High: "priority-high",
            Medium: "priority-medium",
            Low: "priority-low"
        }[task.priority] || "priority-medium";

        meta.appendChild(makeElement(
            "span",
            `priority-badge ${priorityClass}`,
            `${task.priority === "High" ? "🔥" : task.priority === "Low" ? "🌱" : "🌼"} ${task.priority}`
        ));

        meta.appendChild(makeElement(
            "span",
            "task-date",
            `📅 ${task.date || "No due date"}`
        ));

        details.appendChild(meta);

        const actions = makeElement("div", "task-actions");

        actions.append(
            makeButton("✏️ Edit", "task-action-btn", () => editTask(task)),
            makeButton(done ? "↩ Undo" : "✓ Done", "task-action-btn", () => toggleTask(task)),
            makeButton("🗑 Delete", "task-action-btn delete", () => deleteTask(task))
        );

        card.append(check, details, actions);
        taskList.appendChild(card);
    });
}

taskForm.addEventListener("submit", async event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        alert("Please enter a task name.");
        return;
    }

    try {
        await api("/api/tasks", {
            method: "POST",
            body: JSON.stringify({
                title,
                priority: priorityInput.value,
                date: taskDate.value
            })
        });

        taskForm.reset();
        priorityInput.value = "Medium";
        await loadTasks();
        taskInput.focus();
    } catch (error) {
        console.error("Adding task failed:", error);
        alert("Task add nahi hua: " + error.message);
    }
});

async function toggleTask(task) {
    try {
        await api(`/api/tasks/${task.id}`, {
            method: "PATCH",
            body: JSON.stringify({ completed: !Boolean(task.completed) })
        });
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

async function editTask(task) {
    const title = prompt("Task name:", task.title);
    if (title === null) return;

    if (!title.trim()) {
        alert("Task name cannot be empty.");
        return;
    }

    const priority = prompt("Priority: Low, Medium, or High", task.priority);
    if (priority === null) return;

    const priorityMap = { low: "Low", medium: "Medium", high: "High" };
    const selectedPriority = priorityMap[priority.trim().toLowerCase()];

    if (!selectedPriority) {
        alert("Enter Low, Medium, or High.");
        return;
    }

    const date = prompt("Due date (YYYY-MM-DD), or leave blank:", task.date || "");
    if (date === null) return;

    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        alert("Use YYYY-MM-DD date format.");
        return;
    }

    try {
        await api(`/api/tasks/${task.id}`, {
            method: "PATCH",
            body: JSON.stringify({
                title: title.trim(),
                priority: selectedPriority,
                date
            })
        });
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

async function deleteTask(task) {
    if (!confirm(`Delete "${task.title}"?`)) return;

    try {
        await api(`/api/tasks/${task.id}`, { method: "DELETE" });
        await loadTasks();
    } catch (error) {
        alert(error.message);
    }
}

function updateDashboard() {
    const total = tasks.length;
    const completed = tasks.filter(task => Boolean(task.completed)).length;
    const pending = total - completed;
    const percentage = total ? Math.round(completed / total * 100) : 0;

    totalTasks.textContent = total;
    completedTasks.textContent = completed;
    pendingTasks.textContent = pending;
    sideTotal.textContent = total;

    progressPercent.textContent = `${percentage}%`;
    progressFill.style.width = `${percentage}%`;
    progressFill.setAttribute("role", "progressbar");
    progressFill.setAttribute("aria-valuemin", "0");
    progressFill.setAttribute("aria-valuemax", "100");
    progressFill.setAttribute("aria-valuenow", percentage);
}

searchTasks.addEventListener("input", renderTasks);
filterTasks.addEventListener("change", renderTasks);

document.querySelectorAll(".nav-item[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
        filterTasks.value = button.dataset.filter;

        document.querySelectorAll(".nav-item[data-filter]").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        renderTasks();
    });
});

filterTasks.addEventListener("change", () => {
    document.querySelectorAll(".nav-item[data-filter]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === filterTasks.value
        );
    });
});

loadTasks();

