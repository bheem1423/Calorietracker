// Constants
const BMR = 1668; // Your Basal Metabolic Rate
const RESET_HOUR = 5; // 5:30 AM reset time
const RESET_MINUTE = 30;

// DOM Elements
const entryDate = document.getElementById('entry-date');
const caloriesConsumed = document.getElementById('calories-consumed');
const caloriesBurnt = document.getElementById('calories-burnt');
const addEntryBtn = document.getElementById('add-entry');
const entriesBody = document.getElementById('entries-body');
const remainingDisplay = document.getElementById('remaining-calories');
const dailySummary = document.getElementById('daily-summary');

// Initialize with today's date
entryDate.valueAsDate = new Date();

// Load entries when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkDailyReset();
    loadEntries();
});

// Add entry event listener
addEntryBtn.addEventListener('click', addEntry);

function checkDailyReset() {
    const now = new Date();
    const lastReset = localStorage.getItem('lastResetDate');
    const lastResetDate = lastReset ? new Date(lastReset) : null;
    
    // Check if we need to reset (after 5:30 AM and a new day)
    if (!lastResetDate || 
        (now.getDate() !== lastResetDate.getDate() && 
         now.getHours() >= RESET_HOUR && 
         now.getMinutes() >= RESET_MINUTE)) {
        localStorage.removeItem('calorieEntries');
        localStorage.setItem('lastResetDate', now.toISOString());
        updateRemainingDisplay(BMR);
        updateDailySummary([], BMR);
    }
}

function addEntry() {
    // Validate inputs
    const consumed = parseInt(caloriesConsumed.value);
    const burnt = parseInt(caloriesBurnt.value);
    
    if (!entryDate.value || isNaN(consumed) || isNaN(burnt)) {
        alert('Please fill all fields with valid numbers (use 0 if needed)');
        return;
    }
    
    // Create entry object with timestamp
    const now = new Date();
    const entry = {
        timestamp: now.toISOString(),
        date: entryDate.value,
        time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        consumed: consumed,
        burnt: burnt
    };
    
    // Get existing entries
    let entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    
    // Add new entry
    entries.push(entry);
    
    // Save to localStorage
    localStorage.setItem('calorieEntries', JSON.stringify(entries));
    
    // Clear inputs
    caloriesConsumed.value = '';
    caloriesBurnt.value = '';
    
    // Refresh display
    loadEntries();
}

function loadEntries() {
    // Get entries from localStorage
    const entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    
    // Filter today's entries
    const todayEntries = entries.filter(entry => isSameDay(new Date(entry.timestamp), new Date()));
    
    // Sort entries by timestamp (oldest first for proper calculation)
    todayEntries.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Clear table body
    entriesBody.innerHTML = '';
    
    // Calculate running total
    let runningTotal = BMR;
    
    // Add entries to table
    todayEntries.forEach(entry => {
        const net = entry.consumed - entry.burnt;
        runningTotal -= net;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.time}</td>
            <td>${entry.consumed} kcal</td>
            <td>${entry.burnt} kcal</td>
            <td>${net} kcal</td>
            <td class="${runningTotal >= 0 ? 'positive' : 'negative'}">${runningTotal} kcal</td>
            <td><button class="delete-btn" data-timestamp="${entry.timestamp}">Delete</button></td>
        `;
        entriesBody.appendChild(row);
    });
    
    // Update remaining calories display
    updateRemainingDisplay(runningTotal);
    
    // Update daily summary
    updateDailySummary(todayEntries, runningTotal);
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteEntry);
    });
}

function deleteEntry(e) {
    const timestampToDelete = e.target.getAttribute('data-timestamp');
    
    // Get entries from localStorage
    let entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    
    // Filter out the entry to delete
    entries = entries.filter(entry => entry.timestamp !== timestampToDelete);
    
    // Save to localStorage
    localStorage.setItem('calorieEntries', JSON.stringify(entries));
    
    // Refresh display
    loadEntries();
}

function updateRemainingDisplay(remaining) {
    remainingDisplay.textContent = remaining;
    remainingDisplay.className = remaining >= 0 ? 'positive' : 'negative';
}

function updateDailySummary(entries, remaining) {
    if (entries.length === 0) {
        dailySummary.innerHTML = `
            <p>BMR: <strong>1668 kcal</strong></p>
            <p>No entries yet today</p>
        `;
        return;
    }
    
    const totalConsumed = entries.reduce((sum, entry) => sum + entry.consumed, 0);
    const totalBurnt = entries.reduce((sum, entry) => sum + entry.burnt, 0);
    const netToday = totalConsumed - totalBurnt;
    
    dailySummary.innerHTML = `
        <p>BMR: <strong>1668 kcal</strong></p>
        <p>Total Consumed: <strong>${totalConsumed} kcal</strong></p>
        <p>Total Burnt: <strong>${totalBurnt} kcal</strong></p>
        <p>Net Intake: <strong class="${netToday <= 0 ? 'positive' : 'negative'}">${netToday} kcal</strong></p>
        <p>Remaining: <strong class="${remaining >= 0 ? 'positive' : 'negative'}">${remaining} kcal</strong></p>
    `;
}

function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}
