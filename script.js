// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, set, get, push, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Data Storage
let courts = [];
let players = [];
let playDates = [];

// Form Handler Functions
async function handlePlayDateSubmit(e) {
    e.preventDefault();
    const playDateData = {
        courtId: document.getElementById('courtSelect').value,
        courtNumbers: document.getElementById('courtNumbers').value,
        date: document.getElementById('playDate').value,
        time: document.getElementById('playTime').value,
        createdBy: auth.currentUser.email,  // Make sure we're using email
        createdAt: new Date().toISOString(),
        players: [auth.currentUser.email]
    };

    try {
        const newPlayDateRef = push(ref(db, 'playDates'));
        await set(newPlayDateRef, playDateData);
        hideModal('addPlayDateModal');
        e.target.reset();
    } catch (error) {
        alert(`Failed to add play date: ${error.message}`);
    }
}

async function handlePlayerSubmit(e) {
    e.preventDefault();
    const playerData = {
        firstName: document.getElementById('playerFirstName').value,
        lastName: document.getElementById('playerLastName').value,
        email: document.getElementById('playerEmail').value,
        mobile: document.getElementById('playerMobile').value,
        rating: document.getElementById('playerRating').value,
        createdAt: new Date().toISOString()
    };

    try {
        const newPlayerRef = push(ref(db, 'players'));
        await set(newPlayerRef, playerData);
        hideModal('addPlayerModal');
        e.target.reset();
    } catch (error) {
        alert(`Failed to add player: ${error.message}`);
    }
}

async function handleCourtSubmit(e) {
    e.preventDefault();
    const courtData = {
        name: document.getElementById('courtName').value,
        address: document.getElementById('courtAddress').value,
        city: document.getElementById('courtCity').value,
        state: document.getElementById('courtState').value,
        zipCode: document.getElementById('courtZip').value,
        createdAt: new Date().toISOString()
    };

    try {
        const newCourtRef = push(ref(db, 'courts'));
        await set(newCourtRef, courtData);
        hideModal('addCourtModal');
        e.target.reset();
    } catch (error) {
        alert(`Failed to add court: ${error.message}`);
    }
}

async function editCourt(courtId) {
    const court = courts.find(c => c.id === courtId);
    if (!court) return;

    // Populate the edit form
    document.getElementById('editCourtId').value = court.id;
    document.getElementById('editCourtName').value = court.name;
    document.getElementById('editCourtAddress').value = court.address;
    document.getElementById('editCourtCity').value = court.city;
    document.getElementById('editCourtState').value = court.state;
    document.getElementById('editCourtZip').value = court.zipCode;

    showModal('editCourtModal');
}

async function handleEditCourtSubmit(e) {
    e.preventDefault();
    const courtId = document.getElementById('editCourtId').value;
    const courtData = {
        name: document.getElementById('editCourtName').value,
        address: document.getElementById('editCourtAddress').value,
        city: document.getElementById('editCourtCity').value,
        state: document.getElementById('editCourtState').value,
        zipCode: document.getElementById('editCourtZip').value,
        updatedAt: new Date().toISOString()
    };

    try {
        await set(ref(db, `courts/${courtId}`), courtData);
        hideModal('editCourtModal');
        e.target.reset();
    } catch (error) {
        alert(`Failed to update court: ${error.message}`);
    }
}

async function editPlayer(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;

    // Populate the edit form
    document.getElementById('editPlayerId').value = player.id;
    document.getElementById('editPlayerFirstName').value = player.firstName;
    document.getElementById('editPlayerLastName').value = player.lastName;
    document.getElementById('editPlayerEmail').value = player.email;
    document.getElementById('editPlayerMobile').value = player.mobile;
    document.getElementById('editPlayerRating').value = player.rating || '2.0';

    showModal('editPlayerModal');
}

async function handleEditPlayerSubmit(e) {
    e.preventDefault();
    const playerId = document.getElementById('editPlayerId').value;
    const playerData = {
        firstName: document.getElementById('editPlayerFirstName').value,
        lastName: document.getElementById('editPlayerLastName').value,
        email: document.getElementById('editPlayerEmail').value,
        mobile: document.getElementById('editPlayerMobile').value,
        rating: document.getElementById('editPlayerRating').value,
        updatedAt: new Date().toISOString()
    };

    try {
        await set(ref(db, `players/${playerId}`), playerData);
        hideModal('editPlayerModal');
        e.target.reset();
    } catch (error) {
        alert(`Failed to update player: ${error.message}`);
    }
}

async function editPlayDate(playDateId) {
    const playDate = playDates.find(p => p.id === playDateId);
    if (!playDate) return;

    // Make sure courts are loaded in the dropdown
    updateCourtSelect();

    // Populate the edit form
    document.getElementById('editPlayDateId').value = playDate.id;
    document.getElementById('editPlayDateCourtSelect').value = playDate.courtId;
    document.getElementById('editPlayDateCourtNumbers').value = playDate.courtNumbers;
    document.getElementById('editPlayDateDate').value = playDate.date;
    document.getElementById('editPlayDateTime').value = playDate.time;

    showModal('editPlayDateModal');
}

async function handleEditPlayDateSubmit(e) {
    e.preventDefault();
    const playDateId = document.getElementById('editPlayDateId').value;
    const playDateData = {
        courtId: document.getElementById('editPlayDateCourtSelect').value,
        courtNumbers: document.getElementById('editPlayDateCourtNumbers').value,
        date: document.getElementById('editPlayDateDate').value,
        time: document.getElementById('editPlayDateTime').value,
        updatedAt: new Date().toISOString()
    };

    try {
        const currentPlayDate = playDates.find(p => p.id === playDateId);
        // Preserve existing players and created info
        playDateData.players = currentPlayDate.players || [];
        playDateData.createdBy = currentPlayDate.createdBy;
        playDateData.createdAt = currentPlayDate.createdAt;

        await set(ref(db, `playDates/${playDateId}`), playDateData);
        hideModal('editPlayDateModal');
        e.target.reset();
    } catch (error) {
        alert(`Failed to update play date: ${error.message}`);
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            document.querySelector('main')?.classList.remove('hidden');
            loadData();
        } else {
            window.location.href = 'index.html';
        }
    });
    
    // Only add event listeners for elements that exist in app.html
    setupEventListeners();
});

function setupEventListeners() {
    // Add event listeners for forms that exist in app.html
    document.getElementById('addPlayDateForm')?.addEventListener('submit', handlePlayDateSubmit);
    document.getElementById('addPlayerForm')?.addEventListener('submit', handlePlayerSubmit);
    document.getElementById('addCourtForm')?.addEventListener('submit', handleCourtSubmit);
    document.getElementById('editCourtForm')?.addEventListener('submit', handleEditCourtSubmit);
    document.getElementById('editPlayerForm')?.addEventListener('submit', handleEditPlayerSubmit);
    document.getElementById('editPlayDateForm')?.addEventListener('submit', handleEditPlayDateSubmit);
}

async function updateCurrentUserDisplay() {
    const userEmail = auth.currentUser.email;
    const currentPlayer = players.find(p => p.email === userEmail);
    if (currentPlayer) {
        const displayName = `${currentPlayer.firstName} ${currentPlayer.lastName}`;
        document.getElementById('currentUserName').textContent = displayName;
    } else {
        document.getElementById('currentUserName').textContent = userEmail;
    }
}

async function loadData() {
    try {
        // Load players first
        onValue(ref(db, 'players'), (snapshot) => {
            players = [];
            snapshot.forEach((childSnapshot) => {
                players.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            updatePlayers();
            updateCurrentUserDisplay(); // Add this line to update user display when players load
        });

        // Load courts
        onValue(ref(db, 'courts'), (snapshot) => {
            courts = [];
            snapshot.forEach((childSnapshot) => {
                courts.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            updateCourts();
            updateCourtSelect();
        });

        // Load play dates
        onValue(ref(db, 'playDates'), (snapshot) => {
            playDates = [];
            snapshot.forEach((childSnapshot) => {
                playDates.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            updatePlayDates();
            updateDashboard();
        });
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// UI Update Functions
function updateDashboard() {
    const upcomingContainer = document.getElementById('upcomingPlayDates');
    const recentContainer = document.getElementById('recentPlayers');

    // Update upcoming play dates
    const upcomingDates = playDates
        .filter(date => new Date(date.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);

    upcomingContainer.innerHTML = upcomingDates.length > 0 
        ? upcomingDates.map(renderPlayDateCard).join('')
        : '<p class="text-gray-500">No upcoming play dates scheduled.</p>';

    // Update recent players
    const recentPlayersList = players
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

    recentContainer.innerHTML = recentPlayersList.length > 0
        ? recentPlayersList.map(renderPlayerCard).join('')
        : '<p class="text-gray-500">No recent players.</p>';
}

function updatePlayDates() {
    const container = document.getElementById('playDatesList');
    container.innerHTML = playDates
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(renderPlayDateCard)
        .join('');
}

function updatePlayers() {
    const container = document.getElementById('playersList');
    container.innerHTML = players
        .sort((a, b) => a.firstName.localeCompare(b.firstName))
        .map(renderPlayerCard)
        .join('');
}

function updateCourts() {
    const container = document.getElementById('courtsList');
    container.innerHTML = courts
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(renderCourtCard)
        .join('');
}

// Update updateCourtSelect function to handle both dropdowns
function updateCourtSelect() {
    const addSelect = document.getElementById('courtSelect');
    const editSelect = document.getElementById('editPlayDateCourtSelect');
    
    const options = `
        <option value="">Select a court</option>
        ${courts.map(court => `
            <option value="${court.id}">${court.name}</option>
        `).join('')}
    `;

    // Update both select elements if they exist
    if (addSelect) addSelect.innerHTML = options;
    if (editSelect) editSelect.innerHTML = options;
}

// Add this new function to get player details
async function getPlayerByUserId(userId) {
    const snapshot = await get(ref(db, 'players'));
    const allPlayers = snapshot.val();
    for (let id in allPlayers) {
        if (allPlayers[id].email === userId) {
            return { id, ...allPlayers[id] };
        }
    }
    return null;
}

// Modify the renderPlayDateCard function to use auth UIDs
function renderPlayDateCard(playDate) {
    const court = courts.find(c => c.id === playDate.courtId) || {};
    const attendingPlayers = playDate.players || [];
    
    // Format time to include AM/PM and PT
    const timeFormat = new Date(`2000-01-01T${playDate.time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    const formattedTime = `${timeFormat} PT`;
    
    // Find the creator's name
    const creator = players.find(p => p.email === playDate.createdBy);
    const creatorName = creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown';
    
    const playerNames = attendingPlayers
        .map(uid => {
            const player = players.find(p => p.email === uid);
            return player ? `${player.firstName} ${player.lastName}` : 'Unknown Player';
        })
        .join(', ');
    
    return `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">${court.name || 'Unknown Court'}</h3>
                <div class="flex gap-2 items-center">
                    <span class="card-badge">Court ${playDate.courtNumbers}</span>
                    ${playDate.createdBy === auth.currentUser.email ? 
                        `<button onclick="editPlayDate('${playDate.id}')" class="text-gray-500 hover:text-green-600">
                            <span class="icon">✏️</span>
                        </button>` 
                        : ''
                    }
                </div>
            </div>
            <div class="space-y-2">
                <p class="text-gray-600">
                    <span class="icon">📅</span>${new Date(playDate.date).toLocaleDateString()} at ${formattedTime}
                </p>
                <p class="text-gray-600">
                    <span class="icon">📍</span>${court.address}, ${court.city}
                </p>
                <p class="text-gray-600">
                    <span class="icon">👤</span>Created by: ${creatorName}
                </p>
                <div class="mt-2">
                    <p class="text-sm font-semibold">Players (${attendingPlayers.length}):</p>
                    <p class="text-sm text-gray-600 mt-1">${playerNames || 'No players yet'}</p>
                </div>
                <div class="mt-4">
                    ${attendingPlayers.includes(auth.currentUser.email)
                        ? `<button onclick="leavePlayDate('${playDate.id}')" class="btn-secondary w-full">Leave Play Date</button>`
                        : `<button onclick="joinPlayDate('${playDate.id}')" class="btn-primary w-full">Join Play Date</button>`
                    }
                </div>
            </div>
        </div>
    `;
}

// Update the join/leave functions
async function joinPlayDate(playDateId) {
    try {
        const playDateRef = ref(db, `playDates/${playDateId}`);
        const snapshot = await get(playDateRef);
        const playDate = snapshot.val();
        
        const players = playDate.players || [];
        if (!players.includes(auth.currentUser.email)) {
            players.push(auth.currentUser.email);
            await set(ref(db, `playDates/${playDateId}/players`), players);
            // The UI will update automatically through the onValue listener
        }
    } catch (error) {
        alert(`Failed to join play date: ${error.message}`);
    }
}

async function leavePlayDate(playDateId) {
    try {
        const playDateRef = ref(db, `playDates/${playDateId}`);
        const snapshot = await get(playDateRef);
        const playDate = snapshot.val();
        
        const players = playDate.players.filter(email => email !== auth.currentUser.email);
        await set(ref(db, `playDates/${playDateId}/players`), players);
        // The UI will update automatically through the onValue listener
    } catch (error) {
        alert(`Failed to leave play date: ${error.message}`);
    }
}

// Render Functions
function renderPlayerCard(player) {
    const ratingLabels = {
        '2.0': 'Beginner',
        '3.0': 'Intermediate',
        '3.5': 'Advanced Intermediate',
        '4.0': 'Advanced',
        '4.5': 'Highly Skilled',
        '5.0': 'Expert Level'
    };

    return `
        <div class="card">
            <div class="list-item-content">
                <div>
                    <h3 class="font-bold">${player.firstName} ${player.lastName}</h3>
                    <p class="text-gray-600">${player.email}</p>
                    <p class="text-gray-600">${player.mobile}</p>
                    ${player.rating ? `<p class="text-green-600 font-semibold">${player.rating} (${ratingLabels[player.rating]})</p>` : ''}
                </div>
                <button onclick="editPlayer('${player.id}')" class="text-gray-500 hover:text-green-600">
                    <span class="icon">✏️</span>
                </button>
            </div>
        </div>
    `;
}

function renderCourtCard(court) {
    return `
        <div class="card">
            <div class="list-item-content">
                <div>
                    <h3 class="font-bold">${court.name}</h3>
                    <p class="text-gray-600">${court.address}</p>
                    <p class="text-gray-600">${court.city}, ${court.state} ${court.zipCode}</p>
                </div>
                <button onclick="editCourt('${court.id}')" class="text-gray-500 hover:text-green-600">
                    <span class="icon">✏️</span>
                </button>
            </div>
        </div>
    `;
}

// Utility Functions
async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        alert(`Failed to log out: ${error.message}`);
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    loginForm.classList.toggle('hidden');
    signupForm.classList.toggle('hidden');
}

// Make functions globally available
window.showSection = showSection;
window.showModal = showModal;
window.hideModal = hideModal;
window.toggleForms = toggleForms;
window.joinPlayDate = joinPlayDate;
window.leavePlayDate = leavePlayDate;
window.logout = logout;
window.editCourt = editCourt;
window.editPlayer = editPlayer;
window.editPlayDate = editPlayDate;

// Add this function to show the rating info modal
function showRatingInfo() {
    const ratingInfo = `
        <div class="space-y-4">
            <div>
                <h3 class="font-bold">2.0 (Beginner)</h3>
                <p>Just learning the game. Can hit basic shots but struggles with consistency. Lacks control and strategy.</p>
            </div>
            <div>
                <h3 class="font-bold">3.0 (Intermediate)</h3>
                <p>Can sustain short rallies with medium pace. Beginning to understand basic strategies like dinking and positioning. Struggles with shot consistency and unforced errors.</p>
            </div>
            <div>
                <h3 class="font-bold">3.5 (Advanced Intermediate)</h3>
                <p>More consistent with basic shots (forehand, backhand, serve, and volley). Understands court positioning and basic strategy. Beginning to add spin and placement. Can anticipate opponents' shots but lacks high-level execution.</p>
            </div>
            <div>
                <h3 class="font-bold">4.0 (Advanced)</h3>
                <p>Controls pace and placement of shots. Has reliable third-shot drops, dinks, and volleys. Strategically moves and adapts during games. Executes offensive and defensive shots with confidence.</p>
            </div>
            <div>
                <h3 class="font-bold">4.5 (Highly Skilled)</h3>
                <p>Strong shot variety and control. Can create offensive opportunities with well-placed dinks and drives. Consistently wins against lower-rated players. Excellent anticipation and reaction speed.</p>
            </div>
            <div>
                <h3 class="font-bold">5.0+ (Expert)</h3>
                <p>Plays at an elite level with high consistency, power, and precision. Competes in high-level tournaments. Has mastered all aspects of the game, including spin, strategy, and fast-paced exchanges.</p>
            </div>
        </div>
    `;

    // Create and show a modal with the rating information
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-bold">Pickleball Skill Ratings</h2>
                <button onclick="this.closest('.modal').remove()" class="text-gray-500">&times;</button>
            </div>
            ${ratingInfo}
        </div>
    `;
    document.body.appendChild(modal);
}

// Make the function globally available
window.showRatingInfo = showRatingInfo;