// Constants
const BMR = 1668; // Your Basal Metabolic Rate

// DOM Elements
const entryDate = document.getElementById('entry-date');
const caloriesConsumed = document.getElementById('calories-consumed');
const caloriesBurnt = document.getElementById('calories-burnt');
const addEntryBtn = document.getElementById('add-entry');
const entriesBody = document.getElementById('entries-body');
const avgNetDisplay = document.getElementById('avg-net');
const trendDisplay = document.getElementById('trend');

// Initialize with today's date
entryDate.valueAsDate = new Date();

// Load entries when page loads
document.addEventListener('DOMContentLoaded', loadEntries);

// Add entry event listener
addEntryBtn.addEventListener('click', addEntry);

function addEntry() {
    // Validate inputs
    if (!entryDate.value || !caloriesConsumed.value || !caloriesBurnt.value) {
        alert('Please fill all fields');
        return;
    }
    
    // Create entry object
    const entry = {
        date: entryDate.value,
        consumed: parseInt(caloriesConsumed.value),
        burnt: parseInt(caloriesBurnt.value)
    };
    
    // Get existing entries
    let entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    
    // Check if entry for this date already exists
    const existingIndex = entries.findIndex(e => e.date === entry.date);
    if (existingIndex >= 0) {
        // Update existing entry
        entries[existingIndex] = entry;
    } else {
        // Add new entry
        entries.push(entry);
    }
    
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
    
    // Sort entries by date (newest first)
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Clear table body
    entriesBody.innerHTML = '';
    
    // Add entries to table
    entries.forEach(entry => {
        const net = entry.consumed - entry.burnt;
        const vsBMR = net - BMR;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(entry.date)}</td>
            <td>${entry.consumed}</td>
            <td>${entry.burnt}</td>
            <td style="color: ${vsBMR > 0 ? 'red' : 'green'}">${vsBMR > 0 ? '+' : ''}${vsBMR}</td>
            <td><button class="delete-btn" data-date="${entry.date}">Delete</button></td>
        `;
        entriesBody.appendChild(row);
    });
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', deleteEntry);
    });
    
    // Update summary
    updateSummary(entries);
}

function deleteEntry(e) {
    const dateToDelete = e.target.getAttribute('data-date');
    
    // Get entries from localStorage
    let entries = JSON.parse(localStorage.getItem('calorieEntries')) || [];
    
    // Filter out the entry to delete
    entries = entries.filter(entry => entry.date !== dateToDelete);
    
    // Save to localStorage
    localStorage.setItem('calorieEntries', JSON.stringify(entries));
    
    // Refresh display
    loadEntries();
}

function updateSummary(entries) {
    if (entries.length === 0) {
        avgNetDisplay.textContent = '0';
        trendDisplay.textContent = 'No data';
        return;
    }
    
    // Calculate average net calories
    const totalNet = entries.reduce((sum, entry) => sum + (entry.consumed - entry.burnt), 0);
    const avgNet = Math.round(totalNet / entries.length);
    avgNetDisplay.textContent = avgNet;
    
    // Simple trend analysis (last 7 days if available)
    const recentEntries = entries.slice(0, 7).reverse(); // Get up to 7 most recent entries, oldest first
    if (recentEntries.length > 1) {
        const firstNet = recentEntries[0].consumed - recentEntries[0].burnt;
        const lastNet = recentEntries[recentEntries.length - 1].consumed - recentEntries[recentEntries.length - 1].burnt;
        
        if (lastNet > firstNet) {
            trendDisplay.textContent = 'Increasing';
            trendDisplay.style.color = 'red';
        } else if (lastNet < firstNet) {
            trendDisplay.textContent = 'Decreasing';
            trendDisplay.style.color = 'green';
        } else {
            trendDisplay.textContent = 'Stable';
            trendDisplay.style.color = 'black';
        }
    } else {
        trendDisplay.textContent = 'Not enough data';
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}
