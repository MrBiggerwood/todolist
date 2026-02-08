// Goal Horizon App - Hierarchical Goal Tracking System

// State Management
let appState = {
    userName: '',
    goals: [],
    settings: {
        sound: 'bell',
    }
};

let currentGoalId = null;
let currentPeriodId = null;
let countdownInterval = null;

// Swipe tracking
let touchStartX = 0;
let touchCurrentX = 0;
let isSwiping = false;
let swipeTarget = null;

// Initialize app
function init() {
    loadState();
    
    if (!appState.userName) {
        showOnboarding();
    } else {
        showMainApp();
    }
    
    // Set sound preference
    const soundSelect = document.getElementById('soundSelect');
    if (soundSelect) {
        soundSelect.value = appState.settings.sound;
    }
    
    // Setup icon picker
    setupIconPicker();
    
    // Auto-calculate end date when duration changes
    const durationInput = document.getElementById('goalDuration');
    const unitSelect = document.getElementById('goalUnit');
    if (durationInput && unitSelect) {
        durationInput.addEventListener('input', updateEndDate);
        unitSelect.addEventListener('change', updateEndDate);
    }
    
    // Auto-save every 30 seconds as backup
    setInterval(() => {
        if (appState.userName) {
            saveState();
        }
    }, 30000);
}

// Onboarding
function showOnboarding() {
    document.getElementById('onboardingScreen').classList.remove('hidden');
}

function completeOnboarding() {
    const nameInput = document.getElementById('userName');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Please enter your name to continue!');
        return;
    }
    
    appState.userName = name;
    saveState();
    showMainApp();
}

function showMainApp() {
    document.getElementById('onboardingScreen').classList.add('hidden');
    document.getElementById('mainHeader').classList.add('visible');
    document.getElementById('mainContainer').classList.add('visible');
    document.getElementById('userNameDisplay').textContent = appState.userName;
    
    renderGoalsGrid();
    updateStats();
}

// Icon Picker Setup
function setupIconPicker() {
    const icons = document.querySelectorAll('.icon-option');
    icons.forEach(icon => {
        icon.addEventListener('click', function() {
            icons.forEach(i => i.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
}

// Goal Suggestions
function setSuggestion(suggestion) {
    document.getElementById('goalTitle').value = suggestion;
}

// Auto-update end date
function updateEndDate() {
    const duration = parseInt(document.getElementById('goalDuration').value);
    const unit = document.getElementById('goalUnit').value;
    const endDateInput = document.getElementById('goalEndDate');
    
    if (!duration || duration <= 0) return;
    
    const now = new Date();
    let endDate = new Date(now);
    
    switch(unit) {
        case 'days':
            endDate.setDate(endDate.getDate() + duration);
            break;
        case 'weeks':
            endDate.setDate(endDate.getDate() + (duration * 7));
            break;
        case 'months':
            endDate.setMonth(endDate.getMonth() + duration);
            break;
        case 'years':
            endDate.setFullYear(endDate.getFullYear() + duration);
            break;
    }
    
    endDateInput.value = endDate.toISOString().split('T')[0];
}

// Goal Creator
function openGoalCreator() {
    document.getElementById('goalCreatorModal').classList.add('active');
    updateEndDate();
}

function closeGoalCreator() {
    document.getElementById('goalCreatorModal').classList.remove('active');
    clearGoalForm();
}

function clearGoalForm() {
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalDescription').value = '';
    document.getElementById('goalDuration').value = '';
    document.getElementById('goalEndDate').value = '';
    
    // Reset icon selection
    const icons = document.querySelectorAll('.icon-option');
    icons.forEach(i => i.classList.remove('selected'));
    icons[0].classList.add('selected');
}

function createGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const description = document.getElementById('goalDescription').value.trim();
    const duration = parseInt(document.getElementById('goalDuration').value);
    const unit = document.getElementById('goalUnit').value;
    const endDate = document.getElementById('goalEndDate').value;
    const selectedIcon = document.querySelector('.icon-option.selected');
    const icon = selectedIcon ? selectedIcon.dataset.icon : '🎯';
    
    if (!title) {
        alert('Please enter a goal title!');
        return;
    }
    
    if (!duration || duration <= 0) {
        alert('Please enter a valid time period!');
        return;
    }
    
    if (!endDate) {
        alert('Please select an end date!');
        return;
    }
    
    const goal = {
        id: Date.now().toString(),
        title,
        description,
        duration,
        unit,
        endDate,
        icon,
        createdAt: new Date().toISOString(),
        periods: [],
    };
    
    appState.goals.push(goal);
    saveState();
    renderGoalsGrid();
    closeGoalCreator();
    updateStats();
    
    // Play success sound
    soundGen.play(appState.settings.sound);
}

// Render Goals Grid with Swipe-to-Delete
function renderGoalsGrid() {
    const grid = document.getElementById('goalsGrid');
    grid.innerHTML = '';
    
    if (appState.goals.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; opacity: 0.6;">
                <div style="font-size: 4rem; margin-bottom: 20px;">🎯</div>
                <h3 style="font-size: 1.5rem; margin-bottom: 10px;">No goals yet!</h3>
                <p style="font-size: 1.1rem;">Click "Create New Goal" to start your journey</p>
            </div>
        `;
        return;
    }
    
    appState.goals.forEach(goal => {
        const wrapper = createGoalCardWrapper(goal);
        grid.appendChild(wrapper);
    });
}

function createGoalCardWrapper(goal) {
    const wrapper = document.createElement('div');
    wrapper.className = 'goal-card-wrapper';
    
    const deleteAction = document.createElement('div');
    deleteAction.className = 'delete-action';
    deleteAction.textContent = 'Delete';
    deleteAction.style.display = 'none';
    
    const card = createGoalCard(goal);
    
    // Add swipe functionality
    card.addEventListener('touchstart', handleTouchStart, { passive: true });
    card.addEventListener('touchmove', handleTouchMove, { passive: false });
    card.addEventListener('touchend', handleTouchEnd);
    
    wrapper.appendChild(deleteAction);
    wrapper.appendChild(card);
    
    return wrapper;
}

function handleTouchStart(e) {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchCurrentX = touch.clientX;
    swipeTarget = e.currentTarget;
    isSwiping = false;
}

function handleTouchMove(e) {
    if (!swipeTarget) return;
    
    const touch = e.touches[0];
    touchCurrentX = touch.clientX;
    const diff = touchStartX - touchCurrentX;
    
    // Only allow left swipe and prevent vertical scroll during swipe
    if (Math.abs(diff) > 10) {
        isSwiping = true;
        e.preventDefault();
    }
    
    if (diff > 0 && diff < 100) {
        swipeTarget.style.transform = `translateX(-${diff}px)`;
        swipeTarget.classList.add('swiping');
        const deleteAction = swipeTarget.parentElement.querySelector('.delete-action');
        if (deleteAction) {
            deleteAction.style.display = 'flex';
        }
    }
}

function handleTouchEnd(e) {
    if (!swipeTarget) return;
    
    const diff = touchStartX - touchCurrentX;
    const goalId = swipeTarget.dataset.goalId;
    
    if (diff > 60) {
        // Swipe threshold met - show delete
        swipeTarget.style.transform = 'translateX(-100px)';
        setTimeout(() => {
            if (confirm('Delete this goal and all its data?')) {
                appState.goals = appState.goals.filter(g => g.id !== goalId);
                saveState();
                renderGoalsGrid();
                updateStats();
            } else {
                swipeTarget.style.transform = 'translateX(0)';
                const deleteAction = swipeTarget.parentElement.querySelector('.delete-action');
                if (deleteAction) {
                    deleteAction.style.display = 'none';
                }
            }
        }, 100);
    } else {
        // Return to position
        swipeTarget.style.transform = 'translateX(0)';
        const deleteAction = swipeTarget.parentElement.querySelector('.delete-action');
        if (deleteAction) {
            deleteAction.style.display = 'none';
        }
        
        // Only open detail if not swiping
        if (!isSwiping) {
            openGoalDetail(goalId);
        }
    }
    
    setTimeout(() => {
        if (swipeTarget) {
            swipeTarget.classList.remove('swiping');
        }
    }, 300);
    
    swipeTarget = null;
    isSwiping = false;
}

function createGoalCard(goal) {
    const card = document.createElement('div');
    card.className = 'goal-card';
    card.dataset.goalId = goal.id;
    
    const progress = calculateGoalProgress(goal);
    const color = getColorForPercentage(progress);
    const countdown = getCountdown(goal.endDate);
    
    card.style.setProperty('--card-color', color);
    
    card.innerHTML = `
        <span class="goal-card-icon">${goal.icon}</span>
        <h3 class="goal-card-title">${goal.title}</h3>
        <div class="goal-card-countdown">${countdown.display}</div>
        <div class="goal-card-progress">
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-text">${progress}% complete · ${getTotalTasks(goal).completed}/${getTotalTasks(goal).total} tasks</div>
        </div>
    `;
    
    // Only open on click if not swiping (handled in touchend)
    card.addEventListener('click', (e) => {
        if (!isSwiping && e.type === 'click') {
            openGoalDetail(goal.id);
        }
    });
    
    return card;
}

// Calculate goal progress
function calculateGoalProgress(goal) {
    const tasks = getTotalTasks(goal);
    if (tasks.total === 0) return 0;
    return Math.round((tasks.completed / tasks.total) * 100);
}

// Get total tasks across all periods
function getTotalTasks(goal) {
    let total = 0;
    let completed = 0;
    
    goal.periods.forEach(period => {
        total += period.tasks.length;
        completed += period.tasks.filter(t => t.completed).length;
    });
    
    return { total, completed };
}

// Get countdown
function getCountdown(endDate) {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) {
        return { display: 'Completed!', days: 0, hours: 0, minutes: 0 };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    let display;
    if (days > 0) {
        display = `${days} day${days !== 1 ? 's' : ''}`;
    } else if (hours > 0) {
        display = `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
        display = `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    return { display, days, hours, minutes };
}

// Get color based on percentage
function getColorForPercentage(percentage) {
    if (percentage === 0) return '#ff0844';
    if (percentage < 25) return '#ff6b35';
    if (percentage < 50) return '#ffd700';
    if (percentage < 75) return '#a8e063';
    return '#56f000';
}

// Goal Detail View
function openGoalDetail(goalId) {
    currentGoalId = goalId;
    const goal = appState.goals.find(g => g.id === goalId);
    
    if (!goal) return;
    
    const modal = document.getElementById('goalDetailModal');
    document.getElementById('detailIcon').textContent = goal.icon;
    document.getElementById('detailTitle').textContent = goal.title;
    document.getElementById('detailDescription').textContent = goal.description || '';
    
    const progress = calculateGoalProgress(goal);
    const color = getColorForPercentage(progress);
    
    // Update CSS variable for current color
    document.documentElement.style.setProperty('--current-glow-color', color);
    
    // Update progress ring
    updateProgressRing(progress);
    
    // Update countdown
    updateCountdownDisplay(goal.endDate);
    
    // Start countdown interval
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => updateCountdownDisplay(goal.endDate), 1000);
    
    // Render periods
    renderPeriods(goal);
    
    modal.classList.add('active');
}

function closeGoalDetail() {
    document.getElementById('goalDetailModal').classList.remove('active');
    currentGoalId = null;
    
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

function updateProgressRing(percentage) {
    const circle = document.getElementById('progressCircle');
    const percentageText = document.getElementById('detailPercentage');
    
    // Correct circumference calculation: 2 * PI * radius
    // radius = 85 (from CSS)
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
    percentageText.textContent = `${percentage}%`;
}

function updateCountdownDisplay(endDate) {
    const countdown = getCountdown(endDate);
    
    document.getElementById('daysLeft').textContent = countdown.days;
    document.getElementById('hoursLeft').textContent = countdown.hours;
    document.getElementById('minutesLeft').textContent = countdown.minutes;
}

// Periods Management
function renderPeriods(goal) {
    const container = document.getElementById('periodBreakdown');
    container.innerHTML = '';
    
    if (goal.periods.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; opacity: 0.6;">
                <p style="font-size: 1.1rem;">No breakdown periods yet. Click below to add one!</p>
            </div>
        `;
        return;
    }
    
    goal.periods.forEach(period => {
        const periodCard = createPeriodCard(period, goal);
        container.appendChild(periodCard);
    });
}

function createPeriodCard(period, goal) {
    const card = document.createElement('div');
    card.className = 'period-card';
    
    const completed = period.tasks.filter(t => t.completed).length;
    const total = period.tasks.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate period deadline if it has one
    let deadlineText = '';
    if (period.endDate) {
        const countdown = getCountdown(period.endDate);
        deadlineText = `⏱️ ${countdown.display} remaining`;
    }
    
    card.innerHTML = `
        <div class="period-card-header">
            <div class="period-card-title">${period.name}</div>
            <div class="period-card-progress">${completed}/${total} tasks (${progress}%)</div>
        </div>
        ${deadlineText ? `<div style="font-size: 0.85rem; margin-top: 8px; opacity: 0.8;">${deadlineText}</div>` : ''}
        <button class="period-delete-btn" onclick="event.stopPropagation(); deletePeriod('${period.id}')">Delete</button>
    `;
    
    card.addEventListener('click', () => openPeriodDetail(period.id));
    
    return card;
}

function addPeriod() {
    const goal = appState.goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    
    const periodName = prompt('Enter period name (e.g., "This Month", "Q1 2024", "Year 1"):');
    if (!periodName || !periodName.trim()) return;
    
    // Ask for period deadline
    const wantsDeadline = confirm('Do you want to set a deadline for this period?');
    let endDate = null;
    
    if (wantsDeadline) {
        const dateInput = prompt('Enter deadline (YYYY-MM-DD):');
        if (dateInput) {
            endDate = dateInput;
        }
    }
    
    const period = {
        id: Date.now().toString(),
        name: periodName.trim(),
        endDate: endDate,
        tasks: []
    };
    
    goal.periods.push(period);
    saveState();
    renderPeriods(goal);
    renderGoalsGrid();
}

function deletePeriod(periodId) {
    if (!confirm('Delete this period and all its tasks?')) return;
    
    const goal = appState.goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    
    goal.periods = goal.periods.filter(p => p.id !== periodId);
    saveState();
    renderPeriods(goal);
    renderGoalsGrid();
}

// Period Detail View
function openPeriodDetail(periodId) {
    currentPeriodId = periodId;
    const goal = appState.goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    
    const period = goal.periods.find(p => p.id === periodId);
    if (!period) return;
    
    document.getElementById('periodTitle').textContent = period.name;
    
    // Show deadline if exists
    const deadlineElement = document.getElementById('periodDeadline');
    if (period.endDate) {
        const countdown = getCountdown(period.endDate);
        deadlineElement.textContent = `⏱️ ${countdown.display} remaining`;
        deadlineElement.style.display = 'block';
    } else {
        deadlineElement.style.display = 'none';
    }
    
    renderTasks(period);
    
    document.getElementById('periodDetailModal').classList.add('active');
}

function closePeriodDetail() {
    document.getElementById('periodDetailModal').classList.remove('active');
    currentPeriodId = null;
    document.getElementById('newTaskInput').value = '';
}

// Tasks Management
function renderTasks(period) {
    const container = document.getElementById('tasksList');
    container.innerHTML = '';
    
    if (period.tasks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; opacity: 0.6;">
                <p>No tasks yet. Add your first task below!</p>
            </div>
        `;
        return;
    }
    
    period.tasks.forEach((task, index) => {
        const taskItem = createTaskItem(task, index);
        container.appendChild(taskItem);
    });
}

function createTaskItem(task, index) {
    const item = document.createElement('div');
    item.className = `task-item ${task.completed ? 'completed' : ''}`;
    
    item.innerHTML = `
        <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${index})"></div>
        <div class="task-text">${task.text}</div>
        <button class="task-delete" onclick="deleteTask(${index})">Delete</button>
    `;
    
    return item;
}

function addTask() {
    const input = document.getElementById('newTaskInput');
    const text = input.value.trim();
    
    if (!text) return;
    
    const goal = appState.goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    
    const period = goal.periods.find(p => p.id === currentPeriodId);
    if (!period) return;
    
    period.tasks.push({
        text,
        completed: false,
        createdAt: new Date().toISOString()
    });
    
    input.value = '';
    saveState();
    renderTasks(period);
    
    // Update the goal detail view
    const progress = calculateGoalProgress(goal);
    updateProgressRing(progress);
    renderPeriods(goal);
    renderGoalsGrid();
}

function toggleTask(index) {
    const goal = appState.goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    
    const period = goal.periods.find(p => p.id === currentPeriodId);
    if (!period) return;
    
    period.tasks[index].completed = !period.tasks[index].completed;
    
    // FIXED: Always play sound when completing (not deleting)
    if (period.tasks[index].completed) {
        soundGen.play(appState.settings.sound);
    }
    
    saveState();
    renderTasks(period);
    
    // Update progress
    const progress = calculateGoalProgress(goal);
    const color = getColorForPercentage(progress);
    document.documentElement.style.setProperty('--current-glow-color', color);
    updateProgressRing(progress);
    renderPeriods(goal);
    renderGoalsGrid();
    updateStats();
}

function deleteTask(index) {
    const goal = appState.goals.find(g => g.id === currentGoalId);
    if (!goal) return;
    
    const period = goal.periods.find(p => p.id === currentPeriodId);
    if (!period) return;
    
    period.tasks.splice(index, 1);
    saveState();
    renderTasks(period);
    
    const progress = calculateGoalProgress(goal);
    updateProgressRing(progress);
    renderPeriods(goal);
    renderGoalsGrid();
    updateStats();
}

function deleteCurrentGoal() {
    if (!confirm('Are you sure you want to delete this goal and all its data?')) return;
    
    appState.goals = appState.goals.filter(g => g.id !== currentGoalId);
    saveState();
    closeGoalDetail();
    renderGoalsGrid();
    updateStats();
}

// Settings
function openSettings() {
    const modal = document.getElementById('settingsModal');
    document.getElementById('settingsName').value = appState.userName;
    updateStats();
    modal.classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
}

function updateName() {
    const newName = document.getElementById('settingsName').value.trim();
    if (!newName) {
        alert('Please enter a valid name!');
        return;
    }
    
    appState.userName = newName;
    document.getElementById('userNameDisplay').textContent = newName;
    saveState();
    alert('Name updated successfully!');
}

function previewSound() {
    const soundSelect = document.getElementById('soundSelect');
    const selectedSound = soundSelect.value;
    appState.settings.sound = selectedSound;
    soundGen.play(selectedSound);
    saveState();
}

function updateStats() {
    let totalTasks = 0;
    let completedTasks = 0;
    
    appState.goals.forEach(goal => {
        const tasks = getTotalTasks(goal);
        totalTasks += tasks.total;
        completedTasks += tasks.completed;
    });
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    document.getElementById('totalGoalsCount').textContent = appState.goals.length;
    document.getElementById('completedTasksCount').textContent = completedTasks;
    document.getElementById('completionRate').textContent = `${completionRate}%`;
}

// Data Management
function exportData() {
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `goal-horizon-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    alert('Data exported successfully!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (confirm('This will replace all your current data. Continue?')) {
                appState = importedData;
                saveState();
                showMainApp();
                alert('Data imported successfully!');
            }
        } catch (error) {
            alert('Invalid file format!');
        }
    };
    reader.readAsText(file);
}

function resetAllData() {
    if (!confirm('Are you sure you want to reset ALL data? This cannot be undone!')) return;
    if (!confirm('Really? This will delete everything including your name and all goals!')) return;
    
    localStorage.removeItem('goalHorizonState');
    appState = {
        userName: '',
        goals: [],
        settings: {
            sound: 'bell',
        }
    };
    
    closeSettings();
    location.reload();
}

// State Management - FIXED FOR GITHUB PAGES
function saveState() {
    try {
        localStorage.setItem('goalHorizonState', JSON.stringify(appState));
        console.log('State saved successfully');
    } catch (error) {
        console.error('Error saving state:', error);
        alert('Error saving data. Your browser storage might be full.');
    }
}

function loadState() {
    try {
        const saved = localStorage.getItem('goalHorizonState');
        if (saved) {
            appState = JSON.parse(saved);
            console.log('State loaded successfully');
        }
    } catch (error) {
        console.error('Error loading state:', error);
    }
}

// Click outside modal to close
window.onclick = function(event) {
    const modals = ['settingsModal', 'goalCreatorModal', 'periodDetailModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.classList.remove('active');
            if (modalId === 'periodDetailModal') {
                closePeriodDetail();
            } else if (modalId === 'goalCreatorModal') {
                closeGoalCreator();
            } else {
                closeSettings();
            }
        }
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Save state before page unload
window.addEventListener('beforeunload', () => {
    saveState();
});
