
// Constants
const BMR = 1668; // Your Basal Metabolic Rate
const RESET_HOUR = 5; // 5:30 AM reset time
const RESET_MINUTE = 30;
const GIST_FILENAME = 'calorie_history.json';
const GIST_DESCRIPTION = 'Calorie deficit/excess history';

// DOM Elements
const entryDate = document.getElementById('entry-date');
const caloriesConsumed = document.getElementById('calories-consumed');
const caloriesBurnt = document.getElementById('calories-burnt');
const addEntryBtn = document.getElementById('add-entry');
const entriesBody = document.getElementById('entries-body');
const remainingDisplay = document.getElementById('remaining-calories');
const dailySummary = document.getElementById('daily-summary');
const saveDailyResultBtn = document.getElementById('save-daily-result');
const historySummary = document.getElementById('history-summary');
const totalDeficitDisplay = document.getElementById('total-deficit');
const deficitTypeDisplay = document.getElementById('deficit-type');
const githubTokenInput = document.getElementById('github-token');
const saveTokenBtn = document.getElementById('save-token');

// Initialize with today's date
entryDate.valueAsDate = new Date();

// Load entries when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Load GitHub token if exists
    const token = localStorage.getItem('githubToken');
    if (token) {
        githubTokenInput.value = token;
        document.getElementById('github-token-section').style.display = 'none';
    }
    
    checkDailyReset();
    loadEntries();
    loadHistory();
});

// Event listeners
addEntryBtn.addEventListener('click', addEntry);
saveDailyResultBtn.addEventListener('click', saveDailyResult);
saveTokenBtn.addEventListener('click', saveGitHubToken);

function saveGitHubToken() {
    const token = githubTokenInput.value.trim();
    if (!token) {
        alert('Please enter a GitHub token');
        return;
    }
    
    localStorage.setItem('githubToken', token);
    document.getElementById('github-token-section').style.display = 'none';
    alert('Token saved successfully!');
}

function checkDailyReset() {
    const now = new Date();
    const lastReset = localStorage.getItem('lastResetDate');
    const lastResetDate = lastReset ? new Date(lastReset) : null;
    
    // Check if we need to reset (after 5:30 AM and a new day)
    if (!lastResetDate || 
        (now.getDate() !== lastResetDate.getDate() && 
         now.getHours() >= RESET_HOUR && 
         now.getMinutes() >= RESET_MINUTE)) {
        // Save yesterday's result if not already saved
        const yesterdayEntries = getYesterdayEntries();
        if (yesterdayEntries.length > 0 && !localStorage.getItem('yesterdaySaved')) {
            const net = calculateNetCalories(yesterdayEntries);
            saveDailyNet(net);
            localStorage.setItem('yesterdaySaved', 'true');
        }
        
        localStorage.removeItem('calorieEntries');
        localStorage.setItem('lastResetDate', now.toISOString());
        localStorage.removeItem('yesterdaySaved');
        updateRemainingDisplay(BMR);
        updateDailySummary([], BMR);
    }
}

function getYesterdayEntries() {
    const entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    return entries.filter(entry => isSameDay(new Date(entry.timestamp), yesterday));
}

function calculateNetCalories(entries) {
    const totalConsumed = entries.reduce((sum, entry) => sum + entry.consumed, 0);
    const totalBurnt = entries.reduce((sum, entry) => sum + entry.burnt, 0);
    return totalConsumed - totalBurnt;
}

async function saveDailyResult() {
    const entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    const todayEntries = entries.filter(entry => isSameDay(new Date(entry.timestamp), new Date()));
    
    if (todayEntries.length === 0) {
        alert('No entries to save for today');
        return;
    }
    
    const net = calculateNetCalories(todayEntries);
    await saveDailyNet(net);
    alert('Today\'s result saved successfully!');
    loadHistory();
}

async function saveDailyNet(net) {
    const token = localStorage.getItem('githubToken');
    if (!token) {
        alert('Please set up GitHub token first');
        return;
    }
    
    try {
        // Get existing history
        let history = await getHistoryFromGist(token);
        
        // Add today's entry
        const today = new Date().toISOString().split('T')[0];
        history[today] = net;
        
        // Save back to gist
        await updateGist(token, history);
    } catch (error) {
        console.error('Error saving daily result:', error);
        alert('Failed to save daily result: ' + error.message);
    }
}

async function getHistoryFromGist(token) {
    const gistId = localStorage.getItem('gistId');
    
    if (gistId) {
        // Get existing gist
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch gist');
        
        const gist = await response.json();
        return JSON.parse(gist.files[GIST_FILENAME].content);
    } else {
        // Create new gist
        const history = {};
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: GIST_DESCRIPTION,
                public: false,
                files: {
                    [GIST_FILENAME]: {
                        content: JSON.stringify(history)
                    }
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to create gist');
        
        const gist = await response.json();
        localStorage.setItem('gistId', gist.id);
        return history;
    }
}

async function updateGist(token, history) {
    const gistId = localStorage.getItem('gistId');
    if (!gistId) throw new Error('No gist ID found');
    
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            description: GIST_DESCRIPTION,
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(history)
                }
            }
        })
    });
    
    if (!response.ok) throw new Error('Failed to update gist');
}

async function loadHistory() {
    const token = localStorage.getItem('githubToken');
    if (!token) {
        historySummary.innerHTML = '<p>Set up GitHub token to view history</p>';
        return;
    }
    
    try {
        const history = await getHistoryFromGist(token);
        displayHistory(history);
    } catch (error) {
        console.error('Error loading history:', error);
        historySummary.innerHTML = `<p>Error loading history: ${error.message}</p>`;
    }
}

function displayHistory(history) {
    if (!history || Object.keys(history).length === 0) {
        historySummary.innerHTML = '<p>No history available</p>';
        totalDeficitDisplay.textContent = '0';
        deficitTypeDisplay.textContent = 'deficit';
        return;
    }
    
    // Sort by date (newest first)
    const sortedDates = Object.keys(history).sort((a, b) => new Date(b) - new Date(a));
    
    let html = '<table><thead><tr><th>Date</th><th>Net Calories</th><th>Status</th></tr></thead><tbody>';
    
    let total = 0;
    
    sortedDates.forEach(date => {
        const net = history[date];
        total += net;
        
        html += `
            <tr>
                <td>${formatDate(date)}</td>
                <td>${net > 0 ? '+' : ''}${net} kcal</td>
                <td class="${net <= 0 ? 'positive' : 'negative'}">${net <= 0 ? 'Deficit' : 'Excess'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    historySummary.innerHTML = html;
    
    // Update total summary
    totalDeficitDisplay.textContent = Math.abs(total);
    deficitTypeDisplay.textContent = total <= 0 ? 'deficit' : 'excess';
    deficitTypeDisplay.className = total <= 0 ? 'positive' : 'negative';
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

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
