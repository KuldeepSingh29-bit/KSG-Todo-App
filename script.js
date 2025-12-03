// ==================== GLOBAL VARIABLES ====================
let tasks = [];
let currentFilter = 'all';
let draggedElement = null;

// ==================== DOM ELEMENTS ====================
const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const prioritySelect = document.getElementById('prioritySelect');
const dueDateInput = document.getElementById('dueDateInput');
const todoContainer = document.getElementById('todoContainer');
const emptyState = document.getElementById('emptyState');
const filterTabs = document.querySelectorAll('.filter-tab');
const clearCompletedBtn = document.getElementById('clearCompleted');
const sortBtn = document.getElementById('sortBtn');
const themeToggle = document.getElementById('themeToggle');

// Stats elements
const totalTasksEl = document.getElementById('totalTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const doneTasksEl = document.getElementById('doneTasks');
const allCountEl = document.getElementById('allCount');
const activeCountEl = document.getElementById('activeCount');
const completedCountEl = document.getElementById('completedCount');

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    loadTheme();
    renderTasks();
    updateStats();
    checkOverdueTasks();

    // Check overdue tasks every minute
    setInterval(checkOverdueTasks, 60000);
});

// ==================== EVENT LISTENERS ====================
addBtn.addEventListener('click', addTask);
taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask();
});

filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentFilter = tab.dataset.filter;
        renderTasks();
    });
});

clearCompletedBtn.addEventListener('click', clearCompleted);
sortBtn.addEventListener('click', sortByPriority);
themeToggle.addEventListener('click', toggleTheme);

// ==================== TASK MANAGEMENT ====================
function addTask() {
    const text = taskInput.value.trim();

    if (!text) {
        showNotification('Please enter a task!', 'error');
        return;
    }

    const task = {
        id: Date.now(),
        text: text,
        completed: false,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value || null,
        createdAt: new Date().toISOString()
    };

    tasks.unshift(task);
    saveToLocalStorage();
    renderTasks();
    updateStats();

    // Clear inputs
    taskInput.value = '';
    dueDateInput.value = '';
    prioritySelect.value = 'medium';

    showNotification('Task added successfully!', 'success');
}

function deleteTask(id) {
    const taskElement = document.querySelector(`[data-id="${id}"]`);

    if (taskElement) {
        taskElement.classList.add('deleting');

        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== id);
            saveToLocalStorage();
            renderTasks();
            updateStats();
            showNotification('Task deleted!', 'info');
        }, 300);
    }
}

function toggleComplete(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveToLocalStorage();
        renderTasks();
        updateStats();
    }
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newText = prompt('Edit task:', task.text);

    if (newText !== null && newText.trim() !== '') {
        task.text = newText.trim();
        saveToLocalStorage();
        renderTasks();
        showNotification('Task updated!', 'success');
    }
}

function clearCompleted() {
    const completedCount = tasks.filter(t => t.completed).length;

    if (completedCount === 0) {
        showNotification('No completed tasks to clear!', 'info');
        return;
    }

    if (confirm(`Delete ${completedCount} completed task(s)?`)) {
        tasks = tasks.filter(task => !task.completed);
        saveToLocalStorage();
        renderTasks();
        updateStats();
        showNotification(`${completedCount} task(s) cleared!`, 'success');
    }
}

function sortByPriority() {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    tasks.sort((a, b) => {
        // Completed tasks go to bottom
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        // Sort by priority
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    saveToLocalStorage();
    renderTasks();
    showNotification('Tasks sorted by priority!', 'success');
}

// ==================== RENDER FUNCTIONS ====================
function renderTasks() {
    const filteredTasks = getFilteredTasks();

    // Clear container
    todoContainer.innerHTML = '';

    // Show/hide empty state
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
        todoContainer.appendChild(emptyState);
        return;
    } else {
        emptyState.classList.add('hidden');
    }

    // Render tasks
    filteredTasks.forEach(task => {
        const taskEl = createTaskElement(task);
        todoContainer.appendChild(taskEl);
    });
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `todo priority-${task.priority} ${task.completed ? 'completed' : ''}`;
    div.setAttribute('data-id', task.id);
    div.setAttribute('draggable', 'true');

    // Check if overdue
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

    div.innerHTML = `
        <div class="priority-indicator"></div>
        
        <div class="todo-checkbox" onclick="toggleComplete(${task.id})">
            <i class="fa-solid fa-check"></i>
        </div>
        
        <div class="todo-content">
            <div class="todo-text">${escapeHtml(task.text)}</div>
            <div class="todo-meta">
                <span class="priority-badge ${task.priority}">${task.priority}</span>
                ${task.dueDate ? `
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">
                        <i class="fa-solid fa-clock"></i>
                        ${formatDate(task.dueDate)}
                        ${isOverdue ? '<strong>OVERDUE</strong>' : ''}
                    </span>
                ` : ''}
            </div>
        </div>
        
        <div class="todo-actions">
            <button class="todo-btn edit-btn" onclick="editTask(${task.id})" title="Edit task">
                <i class="fa-solid fa-pen"></i>
            </button>
            <button class="todo-btn delete-btn" onclick="deleteTask(${task.id})" title="Delete task">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;

    // Add drag and drop event listeners
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    div.addEventListener('dragover', handleDragOver);
    div.addEventListener('drop', handleDrop);

    return div;
}

function getFilteredTasks() {
    switch (currentFilter) {
        case 'active':
            return tasks.filter(t => !t.completed);
        case 'completed':
            return tasks.filter(t => t.completed);
        default:
            return tasks;
    }
}

// ==================== DRAG AND DROP ====================
function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
    this.classList.remove('dragging');

    // Remove all drag-over classes
    document.querySelectorAll('.todo').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }

    e.dataTransfer.dropEffect = 'move';

    const afterElement = getDragAfterElement(todoContainer, e.clientY);
    const dragging = document.querySelector('.dragging');

    if (afterElement == null) {
        todoContainer.appendChild(dragging);
    } else {
        todoContainer.insertBefore(dragging, afterElement);
    }

    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    // Update tasks array based on new DOM order
    const taskElements = Array.from(todoContainer.querySelectorAll('.todo'));
    const newTasksOrder = taskElements.map(el => {
        const id = parseInt(el.getAttribute('data-id'));
        return tasks.find(t => t.id === id);
    }).filter(Boolean);

    tasks = newTasksOrder;
    saveToLocalStorage();

    return false;
}

function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.todo:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==================== STATISTICS ====================
function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    totalTasksEl.textContent = total;
    pendingTasksEl.textContent = pending;
    doneTasksEl.textContent = completed;

    allCountEl.textContent = total;
    activeCountEl.textContent = pending;
    completedCountEl.textContent = completed;
}

// ==================== LOCAL STORAGE ====================
function saveToLocalStorage() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

function loadFromLocalStorage() {
    const stored = localStorage.getItem('tasks');
    if (stored) {
        tasks = JSON.parse(stored);
    }
}

// ==================== THEME ====================
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update icon
    const icon = themeToggle.querySelector('i');
    if (newTheme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const icon = themeToggle.querySelector('i');
    if (savedTheme === 'dark') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// ==================== UTILITY FUNCTIONS ====================
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();

    const options = {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
        return 'Today ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    return date.toLocaleDateString('en-US', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkOverdueTasks() {
    const now = new Date();
    tasks.forEach(task => {
        if (task.dueDate && !task.completed) {
            const dueDate = new Date(task.dueDate);
            if (dueDate < now) {
                // Task is overdue - will be highlighted in render
            }
        }
    });
    renderTasks();
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        font-weight: 500;
        max-width: 300px;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(100%);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }
        @keyframes slideOutRight {
            from {
                opacity: 1;
                transform: translateX(0);
            }
            to {
                opacity: 0;
                transform: translateX(100%);
            }
        }
    `;
    document.head.appendChild(style);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 300);
    }, 3000);
}

// ==================== MAKE FUNCTIONS GLOBAL ====================
window.toggleComplete = toggleComplete;
window.editTask = editTask;
window.deleteTask = deleteTask;