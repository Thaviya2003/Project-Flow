// --- 1. DOM Elements ---
const addTaskBtn = document.querySelector('.btn-primary');
const modal = document.getElementById('modal-overlay');
const closeModal = document.getElementById('close-modal');
const taskForm = document.getElementById('task-form');
const taskGrid = document.querySelector('.task-grid');
const themeToggle = document.getElementById('theme-toggle');
const filterTabs = document.querySelectorAll('.tabs button');
const statValues = document.querySelectorAll('.stat-value');
const searchInput = document.querySelector('.search-wrapper input');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const toastContainer = document.getElementById('toast-container');
const sortTrigger = document.getElementById('sort-trigger');
const sortLabel = document.getElementById('sort-label');

// --- 2. State Management ---
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let editingTaskId = null; 
let currentSort = 'date';

// --- 3. Core Functions ---

function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --- NEW: Countdown Logic ---
function getCountdown(dueDate) {
    if (!dueDate) return { text: "", class: "" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { text: "Overdue", class: "status-overdue" };
    if (diffDays === 0) return { text: "Today", class: "status-today" };
    if (diffDays === 1) return { text: "Tomorrow", class: "status-upcoming" };
    return { text: `In ${diffDays} days`, class: "status-upcoming" };
}

function highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function updateStats() {
    const total = tasks.length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const completedCount = tasks.filter(t => t.status === 'Completed' || t.status === 'Done').length;
    
    if (statValues.length >= 4) {
        statValues[0].textContent = total;
        statValues[1].textContent = inProgress;
        statValues[2].textContent = completedCount;
        statValues[3].textContent = tasks.filter(t => t.priority === 'High').length; 
    }

    const percentage = total === 0 ? 0 : Math.round((completedCount / total) * 100);
    if(progressFill) progressFill.style.width = `${percentage}%`;
    if(progressText) progressText.textContent = `${percentage}%`;
}

function getPriorityValue(priority) {
    const map = { 'High': 1, 'Medium': 2, 'Low': 3 };
    return map[priority] || 3;
}

function renderTasks() {
    const activeTab = document.querySelector('.tabs button.active').textContent.trim();
    const searchText = searchInput.value.toLowerCase();
    
    taskGrid.innerHTML = ''; 
    updateStats();

    if (activeTab === 'Completed') {
        clearCompletedBtn.style.display = 'inline-flex';
    } else {
        clearCompletedBtn.style.display = 'none';
    }

    let filteredTasks = tasks.filter(task => {
        const matchesFilter = activeTab === 'All' || task.status === activeTab;
        const matchesSearch = task.title.toLowerCase().includes(searchText) || 
                              task.desc.toLowerCase().includes(searchText);
        return matchesFilter && matchesSearch;
    });

    filteredTasks.sort((a, b) => {
        if (currentSort === 'date') {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        } else if (currentSort === 'priority') {
            return getPriorityValue(a.priority) - getPriorityValue(b.priority);
        } else if (currentSort === 'name') {
            return a.title.localeCompare(b.title);
        }
    });

    filteredTasks.forEach((task) => {
        const priorityClass = `priority-${task.priority.toLowerCase()}`;
        const displayDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No Date';
        
        // --- Countdown Logic Application ---
        const countdown = getCountdown(task.dueDate);
        const highlightedTitle = highlightText(task.title, searchInput.value);
        const highlightedDesc = highlightText(task.desc, searchInput.value);

        const taskCard = `
            <div class="task-card ${priorityClass}" data-id="${task.id}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                     <span class="countdown-text ${countdown.class}">${countdown.text}</span>
                     <span class="tag tag-${task.priority.toLowerCase()}">${task.priority}</span>
                </div>
                <h3>${highlightedTitle}</h3>
                <p>${highlightedDesc}</p>
                <div class="task-footer" style="margin-top: 15px;">
                    <span style="font-size: 0.85rem; color: var(--text-muted);">
                        <i data-lucide="calendar" style="width:14px; height:14px; vertical-align:text-bottom; margin-right:4px;"></i>${displayDate}
                    </span>
                    <div class="actions">
                        <button class="btn-text" onclick="fillEditModal(${task.id})">Edit</button>
                        <button class="btn-text" style="color: var(--red);" onclick="deleteTask(${task.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
        taskGrid.insertAdjacentHTML('beforeend', taskCard);
    });
    lucide.createIcons();
}

// --- 4. Event Listeners ---

sortTrigger.addEventListener('click', () => {
    if (currentSort === 'date') {
        currentSort = 'priority';
        sortLabel.textContent = 'Sort: Priority';
    } else if (currentSort === 'priority') {
        currentSort = 'name';
        sortLabel.textContent = 'Sort: Name';
    } else {
        currentSort = 'date';
        sortLabel.textContent = 'Sort: Date';
    }
    renderTasks();
});

searchInput.addEventListener('input', renderTasks);

clearCompletedBtn.addEventListener('click', () => {
    if (confirm("Remove all completed tasks?")) {
        tasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');
        saveToLocalStorage();
        renderTasks();
        showToast("Completed tasks cleared");
    }
});

window.fillEditModal = function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    editingTaskId = id; 
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-desc').value = task.desc;
    document.getElementById('task-priority').value = task.priority;
    document.getElementById('task-date-input').value = task.dueDate || "";
    
    const statusSelect = document.getElementById('task-due-date');
    for (let i = 0; i < statusSelect.options.length; i++) {
        if (statusSelect.options[i].text === task.status) {
            statusSelect.selectedIndex = i;
            break;
        }
    }
    modal.style.display = 'flex';
};

window.deleteTask = function(id) {
    if (confirm("Delete this task?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveToLocalStorage();
        renderTasks();
        showToast("Task deleted", "error");
    }
};

addTaskBtn.addEventListener('click', () => {
    editingTaskId = null;
    taskForm.reset();
    modal.style.display = 'flex';
});

closeModal.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('task-title').value.trim();
    const desc = document.getElementById('task-desc').value;
    const priority = document.getElementById('task-priority').value;
    const dueDate = document.getElementById('task-date-input').value;
    const statusSelect = document.getElementById('task-due-date');
    const status = statusSelect.options[statusSelect.selectedIndex].text;

    if (!title) return;

    if (editingTaskId) {
        const index = tasks.findIndex(t => t.id === editingTaskId);
        tasks[index] = { ...tasks[index], title, desc, priority, status, dueDate };
        editingTaskId = null;
        showToast("Task updated");
    } else {
        tasks.push({
            id: Date.now(),
            title, desc, priority, status, dueDate,
            dateCreated: new Date().toISOString()
        });
        showToast("Task created");
    }

    saveToLocalStorage();
    renderTasks();
    modal.style.display = 'none';
    taskForm.reset();
});

themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.setAttribute('data-lucide', newTheme === 'dark' ? 'sun' : 'moon');
        lucide.createIcons();
    }
});

filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderTasks();
    });
});

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.setAttribute('data-lucide', 'sun');
        lucide.createIcons();
    }
    renderTasks();
});