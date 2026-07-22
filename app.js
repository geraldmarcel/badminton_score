// ==========================================
// FIREBASE CONFIGURATION & INITIALIZATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyBupNaZK23M3ErtojxwYRdnKPrwjou1ERc",
  authDomain: "badminton-5cef1.firebaseapp.com",
  databaseURL: "https://badminton-5cef1-default-rtdb.firebaseio.com",
  projectId: "badminton-5cef1",
  storageBucket: "badminton-5cef1.firebasestorage.app",
  messagingSenderId: "857732838646",
  appId: "1:857732838646:web:dd037447f2820cab1828d7"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const appContent = document.getElementById('app-content');

// Global Application State
let globalPlayers = {};
let globalHistory = {};
let currentSchedule = {};
let matchHistoryLogs = {}; 
let currentActiveTab = 'matchmaking';

// Admin View State
let isAdminView = false;
let editingMatchLogId = null;

// Dynamic Filter State ('ALL' or 'YYYY-MM')
let selectedPeriod = 'ALL';

// Map Nama Bulan ke Angka untuk Parse Data Format Teks Lama ("21 Jul 26")
const MONTH_MAP = {
    jan: '01', feb: '02', mar: '03', apr: '04', mei: '05', may: '05',
    jun: '06', jul: '07', agu: '08', aug: '08', sep: '09', okt: '10', oct: '10',
    nov: '11', des: '12', dec: '12'
};

// Helper: Konversi Tanggal Beda Format ke String YYYY-MM
function extractIsoPeriod(log) {
    if (log.isoDate) return log.isoDate.substring(0, 7);
    
    if (log.date && typeof log.date === 'string') {
        const parts = log.date.trim().split(' ');
        if (parts.length >= 3) {
            const monthStr = parts[1].substring(0, 3).toLowerCase();
            const monthNum = MONTH_MAP[monthStr] || '01';
            let yearNum = parts[2];
            if (yearNum.length === 2) yearNum = '20' + yearNum;
            return `${yearNum}-${monthNum}`;
        }
    }
    return '';
}

// ==========================================
// THEME SYSTEM
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.remove('dark');
        updateThemeIcon('☀️');
    } else {
        document.documentElement.classList.add('dark');
        updateThemeIcon('🌙');
    }
}

window.toggleTheme = function() {
    const isDark = document.documentElement.classList.toggle('dark');
    const newTheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(isDark ? '🌙' : '☀️');
};

function updateThemeIcon(icon) {
    const btn = document.getElementById('btn-theme-toggle');
    if (btn) btn.innerText = icon;
}

initTheme();

// ==========================================
// GLOBAL TAB SWITCHER
// ==========================================
window.switchTab = function(tabName) {
    currentActiveTab = tabName;
    if (tabName !== 'leaderboard') isAdminView = false;
    
    const tabs = {
        matchmaking: document.getElementById('btn-tab-matchmaking'),
        leaderboard: document.getElementById('btn-tab-[#FF5722]') || document.getElementById('btn-tab-leaderboard'),
        database: document.getElementById('btn-tab-database')
    };

    Object.keys(tabs).forEach(key => {
        if (!tabs[key]) return;
        if (key === tabName) {
            tabs[key].className = "flex-1 text-center py-1.5 text-xs font-bold rounded-lg bg-[#FF5722] text-white transition duration-200 shadow-md shadow-[#FF5722]/10";
        } else {
            tabs[key].className = "flex-1 text-center py-1.5 text-xs font-bold rounded-lg text-slate-400 hover:text-white transition duration-200";
        }
    });
    renderTabStructure();
};

window.toggleAdminMode = function() {
    isAdminView = !isAdminView;
    editingMatchLogId = null;
    renderTabStructure();
};

// ==========================================
// RENDER LAYOUT STRUKTUR UTAMA
// ==========================================
function renderTabStructure() {
    if (currentActiveTab === 'database') {
        appContent.innerHTML = `
            <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 space-y-3 shadow-xl w-full">
                <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest">Register New Club Member</h2>
                <div class="flex gap-2 w-full">
                    <input type="text" id="input-nama" placeholder="Enter player full name..." class="flex-1 bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#FF5722] text-xs transition min-w-0">
                    <button onclick="aksiTambahPemain()" class="bg-[#FF5722] hover:bg-[#e04a1b] text-white font-bold px-3.5 py-2 rounded-xl text-xs transition shrink-0">Register</button>
                </div>
            </div>
            <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 shadow-xl w-full">
                <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest mb-3">Registered Members (<span id="total-db">0</span>)</h2>
                <div id="container-db-list" class="space-y-2 max-h-96 overflow-y-auto pr-0.5"></div>
            </div>
        `;
    } else if (currentActiveTab === 'leaderboard') {
        appContent.innerHTML = `
            <div class="bg-[#1E2638] p-3.5 rounded-2xl border border-slate-800/50 shadow-xl space-y-2.5 w-full">
                <div class="flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 shrink-0">
                        <span class="text-xs">📅</span>
                        <h3 class="text-xs font-bold text-white">Filter Period</h3>
                    </div>
                    <button onclick="resetFilterPeriode()" class="text-[10px] bg-[#0B0F17] text-[#FF5722] px-2.5 py-1 rounded-lg border border-slate-800 font-bold hover:border-[#FF5722] transition shrink-0">Show All Time</button>
                </div>
                <div class="w-full">
                    <input type="month" id="filter-month-picker" oninput="onMonthPickerChange(this.value)" onchange="onMonthPickerChange(this.value)" 
                           class="w-full bg-[#0B0F17] text-xs font-bold text-[#FF5722] border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF5722] transition">
                </div>
            </div>

            ${!isAdminView ? `
                <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 shadow-xl space-y-3 w-full overflow-hidden">
                    <div class="flex justify-between items-center cursor-pointer" onclick="toggleAdminMode()" title="Click to open Admin Panel">
                        <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest hover:underline flex items-center gap-1.5">
                            <span>🏆 Performance Leaderboard</span>
                        </h2>
                        <span class="text-[10px] bg-[#0B0F17] text-slate-400 px-2 py-0.5 rounded-full border border-slate-800 hover:text-white font-bold transition">⚙️ Admin Mode</span>
                    </div>
                    <div class="overflow-x-auto w-full">
                        <table class="w-full text-left text-xs text-slate-300 min-w-[280px]">
                            <thead class="text-[10px] uppercase bg-[#0B0F17] text-slate-500 border-b border-slate-800/60">
                                <tr>
                                    <th class="py-2 px-1 text-center w-6">#</th>
                                    <th class="py-2 px-1.5">Name</th>
                                    <th class="py-2 px-1 text-center w-8">W</th>
                                    <th class="py-2 px-1 text-center w-8">L</th>
                                    <th class="py-2 px-1 text-center w-12 text-[#FF5722]">Rate</th>
                                </tr>
                            </thead>
                            <tbody id="container-leaderboard-body"></tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 shadow-xl space-y-3 w-full">
                    <div class="flex justify-between items-center border-b border-slate-800/60 pb-2.5">
                        <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest">⚔️ Matches History</h2>
                        <span id="total-matches-count" class="text-[10px] bg-[#0B0F17] text-slate-400 px-2 py-0.5 rounded-full border border-slate-800 font-bold">0 Matches</span>
                    </div>
                    <div id="container-all-matches-list" class="space-y-2 max-h-[450px] overflow-y-auto pr-0.5 scroll-smooth"></div>
                </div>
            ` : `
                <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-amber-500/30 shadow-2xl space-y-3 w-full">
                    <div class="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                        <div class="flex items-center gap-1.5">
                            <span class="text-xs">🛠️</span>
                            <h2 class="text-xs font-extrabold uppercase text-amber-400 tracking-wider">Admin Panel - Matches Data</h2>
                        </div>
                        <button onclick="toggleAdminMode()" class="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1 rounded-lg border border-slate-700 transition">
                            ✖ Exit Admin
                        </button>
                    </div>

                    <div id="container-admin-form" class="bg-[#0B0F17] p-3 rounded-xl border border-slate-800 space-y-2.5">
                        <h3 id="form-admin-title" class="text-[11px] font-bold text-[#FF5722] uppercase tracking-wider">➕ Add New Match Entry</h3>
                        
                        <div class="grid grid-cols-2 gap-2">
                            <div>
                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Team A (Player 1 & 2)</label>
                                <select id="admin-select-pA1" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs text-white mb-1.5 focus:outline-none focus:border-[#FF5722]"></select>
                                <select id="admin-select-pA2" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"></select>
                            </div>
                            <div>
                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Team B (Player 1 & 2)</label>
                                <select id="admin-select-pB1" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs text-white mb-1.5 focus:outline-none focus:border-[#FF5722]"></select>
                                <select id="admin-select-pB2" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"></select>
                            </div>
                        </div>

                        <div class="grid grid-cols-3 gap-2 items-center pt-1">
                            <div>
                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Score A</label>
                                <input type="number" id="admin-score-A" value="0" min="0" onfocus="if(this.value==='0') this.value='';" onblur="if(this.value==='') this.value='0';" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center text-[#FF5722]">
                            </div>
                            <div>
                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Score B</label>
                                <input type="number" id="admin-score-B" value="0" min="0" onfocus="if(this.value==='0') this.value='';" onblur="if(this.value==='') this.value='0';" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center text-[#FF5722]">
                            </div>
                            <div>
                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Match Date</label>
                                <input type="date" id="admin-match-date" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-[10px] text-white">
                            </div>
                        </div>

                        <div class="flex gap-2 pt-2">
                            <button onclick="simpanAdminMatch()" id="btn-admin-submit" class="flex-1 bg-[#FF5722] hover:bg-[#e04a1b] text-white font-bold py-2 rounded-xl text-xs transition uppercase tracking-wider">
                                💾 Save Match Data
                            </button>
                            <button id="btn-admin-cancel-edit" onclick="batalEditAdmin()" class="hidden bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-2 rounded-xl text-xs transition">
                                Batal
                            </button>
                        </div>
                    </div>

                    <div class="space-y-2">
                        <div class="flex justify-between items-center pt-2 border-t border-slate-800">
                            <h3 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Existing Matches (<span id="total-matches-admin-count">0</span>)</h3>
                        </div>
                        <div id="container-admin-matches-list" class="space-y-2 max-h-[400px] overflow-y-auto pr-0.5 scroll-smooth"></div>
                    </div>
                </div>
            `}

            <div id="modal-history" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 hidden backdrop-blur-sm p-3">
                <div class="bg-[#1E2638] w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-4 overflow-hidden">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-2.5 mb-2.5">
                        <div class="min-w-0 flex-1 pr-2">
                            <h3 id="modal-player-name" class="text-xs sm:text-sm font-black text-white truncate">Player Name</h3>
                            <p class="text-[9px] text-[#FF5722] uppercase tracking-wider font-bold">📋 Matches History Log</p>
                        </div>
                        <button onclick="closeHistoryModal()" class="text-slate-400 hover:text-white bg-[#0B0F17] w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition border border-slate-800 shrink-0">&times;</button>
                    </div>
                    <div id="modal-history-content" class="space-y-2 max-h-72 overflow-y-auto pr-0.5"></div>
                </div>
            </div>
        `;
    } else {
        appContent.innerHTML = `
            <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 shadow-xl w-full">
                <div class="flex justify-between items-start mb-1 gap-1">
                    <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest">Attendance Status (Check-in)</h2>
                    <button onclick="resetSemuaJumlahMain()" class="text-[9px] bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/20 font-bold hover:bg-red-900/60 transition shrink-0">Reset Count</button>
                </div>
                <p class="text-[10px] text-slate-500 mb-3">Check members who are present today for full rotation matchmaking.</p>
                <div id="container-absen-list" class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5"></div>
            </div>

            <div class="flex gap-1.5 w-full">
                <button onclick="generateFairMatches()" class="flex-1 bg-gradient-to-r from-[#FF5722] to-[#ff7043] text-white font-black text-xs py-3 px-2 rounded-xl shadow-lg shadow-[#FF5722]/10 transition active:scale-95 uppercase tracking-wider truncate">
                    🎲 Generate Full Rotation
                </button>
                <button onclick="simpanSesiHarian()" class="bg-[#1E2638] text-white font-bold text-xs px-3 py-3 rounded-xl hover:bg-slate-700 border border-slate-700/60 transition uppercase tracking-wider shadow-lg shrink-0">
                    💾 Save Session
                </button>
            </div>

            <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 shadow-xl space-y-3 w-full">
                <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-800/60 pb-2.5">📋 Match Schedules & Lineup</h2>
                <div id="container-schedule-list" class="space-y-3 max-h-[550px] overflow-y-auto pr-0.5 scroll-smooth"></div>
                <div id="container-reset-session" class="pt-2"></div>
            </div>

            <!-- MODAL EDIT LINEUP MATCH -->
            <div id="modal-edit-lineup" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 hidden backdrop-blur-sm p-3">
                <div class="bg-[#1E2638] w-full max-w-sm rounded-2xl border border-slate-800 shadow-2xl p-4 overflow-hidden space-y-3">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-2">
                        <h3 class="text-xs font-black text-white uppercase tracking-wider">✏️ Edit Match Lineup</h3>
                        <button onclick="closeEditLineupModal()" class="text-slate-400 hover:text-white bg-[#0B0F17] w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition border border-slate-800">&times;</button>
                    </div>
                    <input type="hidden" id="edit-match-id-target">
                    <div class="grid grid-cols-2 gap-2">
                        <div>
                            <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Team A - P1</label>
                            <select id="select-edit-pA1" class="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"></select>
                        </div>
                        <div>
                            <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Team A - P2</label>
                            <select id="select-edit-pA2" class="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"></select>
                        </div>
                        <div>
                            <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Team B - P1</label>
                            <select id="select-edit-pB1" class="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"></select>
                        </div>
                        <div>
                            <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Team B - P2</label>
                            <select id="select-edit-pB2" class="w-full bg-[#0B0F17] border border-slate-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF5722]"></select>
                        </div>
                    </div>
                    <button onclick="saveAndRebalanceLineup()" class="w-full bg-[#FF5722] hover:bg-[#e04a1b] text-white font-bold py-2 rounded-xl text-xs transition uppercase tracking-wider mt-2">
                        💾 Save & Re-balance Subsequent
                    </button>
                </div>
            </div>
        `;
    }
    
    refreshActiveListData();
}

function refreshActiveListData() {
    if (currentActiveTab === 'database') updateDatabasePemainList();
    if (currentActiveTab === 'leaderboard') {
        syncMonthPickerUI();
        if (isAdminView) {
            populateAdminPlayerDropdowns();
            renderAdminMatchesList();
        } else {
            updateLeaderboardList();
        }
    }
    if (currentActiveTab === 'matchmaking') { 
        updateAbsenHariIniList(); 
        updateScheduleList(); 
    }
}

// ==========================================
// DATABASE REALTIME LISTENERS
// ==========================================
db.ref('badminton/players').on('value', (snapshot) => {
    globalPlayers = snapshot.val() || {};
    refreshActiveListData();
});

db.ref('badminton/history').on('value', (snapshot) => { 
    globalHistory = snapshot.val() || {}; 
});

db.ref('badminton/current_schedule').on('value', (snapshot) => {
    currentSchedule = snapshot.val() || {};
    if (currentActiveTab === 'matchmaking') updateScheduleList();
});

db.ref('badminton/match_history').on('value', (snapshot) => {
    matchHistoryLogs = snapshot.val() || {};
    if (currentActiveTab === 'leaderboard') {
        if (isAdminView) renderAdminMatchesList();
        else updateLeaderboardList();
    }
});

renderTabStructure();

// ==========================================
// TAB: MEMBER DATABASE MANAGEMENT
// ==========================================
window.aksiTambahPemain = function() {
    const input = document.getElementById('input-nama');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    const id = 'p_' + Date.now();
    db.ref(`badminton/players/${id}`).set({
        id: id, name: name, match_count: 0, is_active: false, win: 0, lose: 0
    });
    input.value = '';
};

window.hapusPemainClub = function(id) {
    if (confirm("Permanently remove this player from the club member database?")) {
        db.ref(`badminton/players/${id}`).remove();
    }
};

function updateDatabasePemainList() {
    const container = document.getElementById('container-db-list');
    if (!container) return;
    let html = '';
    const sorted = Object.values(globalPlayers).sort((a,b)=> a.name.localeCompare(b.name));
    sorted.forEach(p => {
        html += `
            <div class="flex items-center justify-between bg-[#0B0F17] p-2.5 rounded-xl border border-slate-800/40">
                <span class="text-xs font-semibold text-slate-200 truncate mr-2">${p.name}</span>
                <button onclick="hapusPemainClub('${p.id}')" class="text-[10px] bg-red-950/30 text-red-400 px-2.5 py-1 rounded-lg font-bold border border-red-900/10 hover:bg-red-900 transition shrink-0">Remove</button>
            </div>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-4">No registered members found.</p>`;
    const totalElem = document.getElementById('total-db');
    if (totalElem) totalElem.innerText = sorted.length;
}

// ==========================================
// TAB: ATTENDANCE TOGGLE
// ==========================================
window.toggleAbsenHariIni = function(id, currentStatus) {
    const nextStatus = !currentStatus;
    const hasActiveMatches = Object.keys(currentSchedule).length > 0;

    if (hasActiveMatches && !nextStatus) {
        alert("Action Denied: Cannot uncheck players once matches are generated!");
        renderTabStructure();
        return;
    }

    db.ref(`badminton/players/${id}`).update({ is_active: nextStatus }).then(() => {
        if (hasActiveMatches && nextStatus) {
            autoBalanceCurrentSchedule();
        }
    });
};

function updateAbsenHariIniList() {
    const container = document.getElementById('container-absen-list');
    if (!container) return;
    let html = '';
    const sorted = Object.values(globalPlayers).sort((a,b)=> a.name.localeCompare(b.name));

    sorted.forEach(p => {
        html += `
            <label class="flex items-center justify-between bg-[#0B0F17] p-2 rounded-xl border ${p.is_active ? 'border-[#FF5722]/50 bg-[#FF5722]/5' : 'border-slate-800/40'} cursor-pointer select-none transition min-w-0">
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                    <input type="checkbox" ${p.is_active ? 'checked' : ''} onclick="toggleAbsenHariIni('${p.id}', ${p.is_active})" class="w-3.5 h-3.5 accent-[#FF5722] shrink-0">
                    <span class="text-xs font-bold ${p.is_active ? 'text-[#FF5722]' : 'text-slate-500'} truncate">${p.name}</span>
                </div>
                <span class="text-[9px] text-slate-600 font-bold shrink-0 ml-0.5">(${p.match_count}x)</span>
            </label>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs col-span-2 text-center py-4">Please go to "Members" tab to add players.</p>`;
}

// ==========================================
// HELPER: SMART MATCHMAKING (MENCEGAH MONOTON)
// ==========================================
function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) return globalHistory[key][tipe];
    return 0;
}

function getCombinations(array, k) {
    let results = [];
    function run(level, start) {
        if(level.length === k) {
            results.push([...level]);
            return;
        }
        for(let i = start; i < array.length; i++) {
            level.push(array[i]);
            run(level, i + 1);
            level.pop();
        }
    }
    run([], 0);
    return results;
}

function findBestMatchup(pool) {
    if (pool.length < 4) return null;
    
    let minMatchCount = pool[0].match_count;
    // Diperbesar agar opsi kombinasi pemain jauh lebih bervariasi
    let candidatePool = pool.slice(0, Math.min(pool.length, 16));
    let quadCombos = getCombinations(candidatePool, 4);

    let bestCombo = null;
    let minScore = Infinity;

    quadCombos.forEach(quad => {
        let p1 = quad[0], p2 = quad[1], p3 = quad[2], p4 = quad[3];
        let teamConfigs = [
            { tA: [p1, p2], tB: [p3, p4] },
            { tA: [p1, p3], tB: [p2, p4] },
            { tA: [p1, p4], tB: [p2, p3] }
        ];

        // Penalti match count diperbesar agar pemain yang jarang main lebih diprioritaskan
        let matchCountPenalty = quad.reduce((sum, p) => sum + ((p.match_count - minMatchCount) * 60), 0);

        teamConfigs.forEach(combo => {
            let partnerScore = getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner') + 
                               getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner');
            
            let opponentScore = getHistoryScore(combo.tA[0].id, combo.tB[0].id, 'opponent') + 
                                getHistoryScore(combo.tA[0].id, combo.tB[1].id, 'opponent') +
                                getHistoryScore(combo.tA[1].id, combo.tB[0].id, 'opponent') + 
                                getHistoryScore(combo.tA[1].id, combo.tB[1].id, 'opponent');

            // Bobot partner diturunkan dan faktor random diperbesar untuk menghilangkan perulangan monoton
            let totalWeight = (partnerScore * 8) + (opponentScore * 2) + matchCountPenalty + (Math.random() * 5.0);

            if (totalWeight < minScore) {
                minScore = totalWeight;
                bestCombo = combo;
            }
        });
    });

    return bestCombo;
}

// ==========================================
// FULL ROTATION FAIR MATCHES GENERATOR 
// ==========================================
window.generateFairMatches = function(preserveDone = true) {
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) {
        alert("Minimal harus ada 4 pemain yang 'Check-in' (aktif) untuk membuat jadwal!");
        return;
    }

    let tempPlayers = {};
    activePlayers.forEach(p => {
        tempPlayers[p.id] = { 
            id: p.id, 
            name: p.name, 
            match_count: 0, 
            last_played_match: -5 
        };
    });

    let newMatchesObj = {};
    let existingDoneMatches = {};

    if (preserveDone && currentSchedule) {
        Object.values(currentSchedule).forEach(m => {
            if (m.status === 'done') {
                existingDoneMatches[m.id] = m;
                [m.idA1, m.idA2, m.idB1, m.idB2].forEach(pId => {
                    if (pId && tempPlayers[pId]) {
                        tempPlayers[pId].match_count++;
                        tempPlayers[pId].last_played_match = m.gameNo;
                    }
                });
            }
        });
    }

    let startingGameNo = Object.keys(existingDoneMatches).length + 1;
    let totalActive = activePlayers.length;
    let targetTotalMatches = Math.max(4, Math.ceil((totalActive * 10) / 4)); 
    let endingGameNo = startingGameNo + targetTotalMatches;

    for (let i = startingGameNo; i < endingGameNo; i++) {
        let pool = Object.values(tempPlayers);
        
        pool.sort((a, b) => {
            let restA = i - a.last_played_match;
            let restB = i - b.last_played_match;
            
            if (restA < 2 && restB >= 2) return 1;
            if (restB < 2 && restA >= 2) return -1;
            
            if (a.match_count !== b.match_count) {
                return a.match_count - b.match_count;
            }
            return Math.random() - 0.5;
        });

        let bestCombo = findBestMatchup(pool);
        if (!bestCombo) break;

        [bestCombo.tA[0], bestCombo.tA[1], bestCombo.tB[0], bestCombo.tB[1]].forEach(p => {
            tempPlayers[p.id].match_count++;
            tempPlayers[p.id].last_played_match = i;
        });

        newMatchesObj[`m_${i}`] = {
            id: `m_${i}`, 
            gameNo: i,
            pA1: bestCombo.tA[0].name, idA1: bestCombo.tA[0].id,
            pA2: bestCombo.tA[1].name, idA2: bestCombo.tA[1].id,
            pB1: bestCombo.tB[0].name, idB1: bestCombo.tB[0].id,
            pB2: bestCombo.tB[1].name, idB2: bestCombo.tB[1].id,
            status: 'pending', 
            winner: '', 
            scoreA: 0, 
            scoreB: 0
        };
    }

    const finalSchedule = { ...existingDoneMatches, ...newMatchesObj };
    db.ref('badminton/current_schedule').set(finalSchedule);
};

function autoBalanceCurrentSchedule() {
    generateFairMatches(true);
}

// ==========================================
// SUBMIT & EDIT LINEUP DENGAN BALANCING OTOMATIS
// ==========================================
window.submitSkorGame = function(matchId) {
    const match = currentSchedule[matchId];
    if (!match) return;

    const valA = parseInt(document.getElementById(`input-score-A-${matchId}`).value);
    const valB = parseInt(document.getElementById(`input-score-B-${matchId}`).value);

    if (isNaN(valA) || isNaN(valB)) {
        alert("Please fill in valid scores!");
        return;
    }

    const timPemenang = valA >= valB ? 'A' : 'B';
    let updates = {};
    
    updates[`badminton/current_schedule/${matchId}/status`] = 'done';
    updates[`badminton/current_schedule/${matchId}/winner`] = timPemenang;
    updates[`badminton/current_schedule/${matchId}/scoreA`] = valA;
    updates[`badminton/current_schedule/${matchId}/scoreB`] = valB;

    if (match.status === 'pending') {
        [match.idA1, match.idA2, match.idB1, match.idB2].forEach(pId => {
            if (pId && globalPlayers[pId]) {
                updates[`badminton/players/${pId}/match_count`] = (globalPlayers[pId].match_count || 0) + 1;
            }
        });

        if (match.idA1 && match.idA2) {
            const keyA = match.idA1 < match.idA2 ? `${match.idA1}_${match.idA2}` : `${match.idA2}_${match.idA1}`;
            updates[`badminton/history/${keyA}/partner`] = (globalHistory[keyA]?.partner || 0) + 1;
        }
        if (match.idB1 && match.idB2) {
            const keyB = match.idB1 < match.idB2 ? `${match.idB1}_${match.idB2}` : `${match.idB2}_${match.idB1}`;
            updates[`badminton/history/${keyB}/partner`] = (globalHistory[keyB]?.partner || 0) + 1;
        }
    }

    db.ref().update(updates);
};

window.bukaEditSkorGame = function(matchId) {
    db.ref(`badminton/current_schedule/${matchId}`).update({ status: 'pending' });
};

window.bukaEditLineupModal = function(matchId) {
    const match = currentSchedule[matchId];
    if (!match) return;

    document.getElementById('edit-match-id-target').value = matchId;
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active).sort((a,b)=> a.name.localeCompare(b.name));

    ['select-edit-pA1', 'select-edit-pA2', 'select-edit-pB1', 'select-edit-pB2'].forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        let html = `<option value="">-- Select Player --</option>`;
        activePlayers.forEach(p => {
            html += `<option value="${p.id}">${p.name}</option>`;
        });
        sel.innerHTML = html;
    });

    if (match.idA1) document.getElementById('select-edit-pA1').value = match.idA1;
    if (match.idA2) document.getElementById('select-edit-pA2').value = match.idA2;
    if (match.idB1) document.getElementById('select-edit-pB1').value = match.idB1;
    if (match.idB2) document.getElementById('select-edit-pB2').value = match.idB2;

    document.getElementById('modal-edit-lineup').classList.remove('hidden');
};

window.closeEditLineupModal = function() {
    document.getElementById('modal-edit-lineup').classList.add('hidden');
};

window.saveAndRebalanceLineup = function() {
    const matchId = document.getElementById('edit-match-id-target').value;
    const pA1Id = document.getElementById('select-edit-pA1').value;
    const pA2Id = document.getElementById('select-edit-pA2').value;
    const pB1Id = document.getElementById('select-edit-pB1').value;
    const pB2Id = document.getElementById('select-edit-pB2').value;

    if (!pA1Id || !pA2Id || !pB1Id || !pB2Id) {
        alert("Semua 4 slot pemain harus terisi!");
        return;
    }

    if (new Set([pA1Id, pA2Id, pB1Id, pB2Id]).size !== 4) {
        alert("Setiap pemain hanya boleh dipilih sekali dalam satu match yang sama!");
        return;
    }

    let match = currentSchedule[matchId];
    if (!match) return;

    match.idA1 = pA1Id; match.pA1 = globalPlayers[pA1Id]?.name || '';
    match.idA2 = pA2Id; match.pA2 = globalPlayers[pA2Id]?.name || '';
    match.idB1 = pB1Id; match.pB1 = globalPlayers[pB1Id]?.name || '';
    match.idB2 = pB2Id; match.pB2 = globalPlayers[pB2Id]?.name || '';

    let updates = {};
    updates[`badminton/current_schedule/${matchId}`] = match;

    let playerMatchCounts = {};
    Object.keys(globalPlayers).forEach(id => { playerMatchCounts[id] = 0; });

    const sortedMatches = Object.values(currentSchedule).sort((a,b)=> a.gameNo - b.gameNo);
    sortedMatches.forEach(m => {
        if (m.id === matchId) {
            [pA1Id, pA2Id, pB1Id, pB2Id].forEach(id => { playerMatchCounts[id] = (playerMatchCounts[id] || 0) + 1; });
        } else if (m.gameNo > match.gameNo && m.status === 'pending') {
            let activePool = Object.values(globalPlayers).filter(p => p.is_active);
            let tempPool = activePool.map(p => ({
                id: p.id, 
                name: p.name, 
                match_count: playerMatchCounts[p.id] || 0
            }));

            tempPool.sort((a, b) => {
                if (a.match_count !== b.match_count) return a.match_count - b.match_count;
                return Math.random() - 0.5;
            });
            
            let bestCombo = findBestMatchup(tempPool);

            if (bestCombo) {
                m.idA1 = bestCombo.tA[0].id; m.pA1 = bestCombo.tA[0].name;
                m.idA2 = bestCombo.tA[1].id; m.pA2 = bestCombo.tA[1].name;
                m.idB1 = bestCombo.tB[0].id; m.pB1 = bestCombo.tB[0].name;
                m.idB2 = bestCombo.tB[1].id; m.pB2 = bestCombo.tB[1].name;

                [bestCombo.tA[0].id, bestCombo.tA[1].id, bestCombo.tB[0].id, bestCombo.tB[1].id].forEach(id => {
                    playerMatchCounts[id] = (playerMatchCounts[id] || 0) + 1;
                });
                updates[`badminton/current_schedule/${m.id}`] = m;
            }
        } else {
            [m.idA1, m.idA2, m.idB1, m.idB2].forEach(id => {
                if (id) playerMatchCounts[id] = (playerMatchCounts[id] || 0) + 1;
            });
        }
    });

    db.ref().update(updates).then(() => {
        closeEditLineupModal();
        alert("Lineup berhasil diperbarui dan sisa match berhasil di-rebalance secara adil!");
    });
};

window.batalSesiMatch = function() {
    if (!confirm("Are you sure you want to cancel and clear the current schedule?")) return;

    let updates = {};
    updates['badminton/current_schedule'] = null;
    Object.keys(globalPlayers).forEach(id => {
        updates[`badminton/players/${id}/match_count`] = 0;
    });

    db.ref().update(updates);
};

function updateScheduleList() {
    const container = document.getElementById('container-schedule-list');
    const resetContainer = document.getElementById('container-reset-session');
    if (!container) return;

    let html = '';
    const mList = Object.values(currentSchedule).sort((a,b)=> a.gameNo - b.gameNo);

    mList.forEach(m => {
        const isDone = m.status === 'done';
        const displayScoreA = m.scoreA || 0;
        const displayScoreB = m.scoreB || 0;

        html += `
            <div id="card-match-no-${m.gameNo}" class="bg-[#0B0F17] p-3 rounded-xl border ${isDone ? 'border-slate-900 opacity-60' : 'border-slate-800/80'} shadow-inner w-full">
                <div class="flex justify-between items-center text-[9px] text-slate-500 font-bold mb-2 tracking-wider">
                    <span>MATCH #${m.gameNo}</span>
                    <div class="flex items-center gap-2">
                        <button onclick="bukaEditLineupModal('${m.id}')" class="text-amber-400 hover:underline uppercase font-bold">✏️ Edit Lineup</button>
                        <span class="${isDone ? 'text-emerald-500':'text-[#FF5722]'} uppercase font-black">${m.status}</span>
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-xs font-bold gap-1 w-full">
                    <div class="w-[38%] p-1.5 rounded-lg truncate ${isDone && m.winner === 'A' ? 'bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]' : 'bg-[#1E2638] text-slate-300'}">${m.pA1} & ${m.pA2}</div>
                    
                    <div class="flex items-center justify-center gap-0.5 w-[24%] shrink-0">
                        ${isDone ? `
                            <span class="text-xs font-black text-white bg-[#1E2638] px-1.5 py-0.5 rounded">${displayScoreA}</span>
                            <span class="text-slate-600 text-[10px]">:</span>
                            <span class="text-xs font-black text-white bg-[#1E2638] px-1.5 py-0.5 rounded">${displayScoreB}</span>
                        ` : `
                            <input type="number" id="input-score-A-${m.id}" value="${displayScoreA}" onfocus="if(this.value==='0') this.value='';" onblur="if(this.value==='') this.value='0';" class="w-7 sm:w-8 bg-[#1E2638] border border-slate-800 rounded text-center text-xs py-0.5 text-[#FF5722] font-extrabold focus:outline-none">
                            <span class="text-slate-700 text-[10px]">:</span>
                            <input type="number" id="input-score-B-${m.id}" value="${displayScoreB}" onfocus="if(this.value==='0') this.value='';" onblur="if(this.value==='') this.value='0';" class="w-7 sm:w-8 bg-[#1E2638] border border-slate-800 rounded text-center text-xs py-0.5 text-[#FF5722] font-extrabold focus:outline-none">
                        `}
                    </div>

                    <div class="w-[38%] p-1.5 rounded-lg truncate text-right ${isDone && m.winner === 'B' ? 'bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]' : 'bg-[#1E2638] text-slate-300'}">${m.pB1} & ${m.pB2}</div>
                </div>

                ${!isDone ? `
                    <button onclick="submitSkorGame('${m.id}')" class="w-full mt-2 bg-[#1E2638] hover:bg-[#FF5722] hover:text-white text-slate-400 font-bold py-1 rounded-lg text-[9px] transition uppercase tracking-widest">💾 Save Score</button>
                ` : `
                    <button onclick="bukaEditSkorGame('${m.id}')" class="w-full mt-2 bg-[#0B0F17] hover:bg-slate-800 text-slate-500 font-bold py-0.5 rounded-lg text-[8px] transition uppercase tracking-widest">✏️ Edit Score</button>
                `}
            </div>
        `;
    });

    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-6">Tap 'Generate Full Rotation' button.</p>`;

    if (resetContainer) {
        if (mList.length > 0) {
            resetContainer.innerHTML = `
                <button onclick="batalSesiMatch()" class="w-full bg-red-950/30 hover:bg-red-900/60 text-red-400 border border-red-900/30 font-bold text-xs py-2.5 px-3 rounded-xl transition duration-150 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <span>🚫</span> Cancel / Reset Current Schedule
                </button>
            `;
        } else {
            resetContainer.innerHTML = '';
        }
    }
}

// ==========================================
// SAVE SESSION & ACCUMULATE POINTS
// ==========================================
window.simpanSesiHarian = function() {
    if (!confirm("End today's session? All saved match points will be officially injected into the Leaderboard & History!")) return;

    let updates = {};
    const matches = Object.values(currentSchedule);
    const now = new Date();
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const isoDateStr = `${year}-${month}`;
    const displayDateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });

    matches.forEach(m => {
        if (m.status !== 'done') return;

        const valA = parseInt(m.scoreA || 0);
        const valB = parseInt(m.scoreB || 0);

        const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        updates[`badminton/match_history/${logId}`] = {
            date: displayDateStr,
            isoDate: isoDateStr,
            pA1: m.pA1, idA1: m.idA1,
            pA2: m.pA2, idA2: m.idA2,
            pB1: m.pB1, idB1: m.idB1,
            pB2: m.pB2, idB2: m.idB2,
            scoreA: valA, scoreB: valB,
            winner: valA >= valB ? 'A' : 'B'
        };

        if (m.idA1 && m.idA2) {
            const k = m.idA1 < m.idA2 ? `${m.idA1}_${m.idA2}` : `${m.idA2}_${m.idA1}`;
            updates[`badminton/history/${k}/partner`] = (globalHistory[k]?.partner || 0) + 1;
        }
        if (m.idB1 && m.idB2) {
            const k = m.idB1 < m.idB2 ? `${m.idB1}_${m.idB2}` : `${m.idB2}_${m.idB1}`;
            updates[`badminton/history/${k}/partner`] = (globalHistory[k]?.partner || 0) + 1;
        }
        [m.idA1, m.idA2].forEach(aId => {
            [m.idB1, m.idB2].forEach(bId => {
                if (aId && bId) {
                    const k = aId < bId ? `${aId}_${bId}` : `${bId}_${aId}`;
                    updates[`badminton/history/${k}/opponent`] = (globalHistory[k]?.opponent || 0) + 1;
                }
            });
        });
    });

    Object.keys(globalPlayers).forEach(id => {
        updates[`badminton/players/${id}/match_count`] = 0;
        updates[`badminton/players/${id}/is_active`] = false;
    });

    updates['badminton/current_schedule'] = null;

    db.ref().update(updates).then(() => {
        alert("Session saved successfully!");
        switchTab('leaderboard');
    });
};

// ==========================================
// CONTROLLER: MONTH PICKER & FILTER LOGIC
// ==========================================
function syncMonthPickerUI() {
    const monthPicker = document.getElementById('filter-month-picker');
    if (monthPicker) {
        monthPicker.value = selectedPeriod === 'ALL' ? '' : selectedPeriod;
    }
}

window.onMonthPickerChange = function(val) {
    selectedPeriod = val && val.trim() !== '' ? val : 'ALL';
    if (isAdminView) renderAdminMatchesList();
    else updateLeaderboardList();
};

window.resetFilterPeriode = function() {
    selectedPeriod = 'ALL';
    syncMonthPickerUI();
    if (isAdminView) renderAdminMatchesList();
    else updateLeaderboardList();
};

// ==========================================
// ADMIN PANEL CRUD LOGIC
// ==========================================
function populateAdminPlayerDropdowns() {
    const ids = ['admin-select-pA1', 'admin-select-pA2', 'admin-select-pB1', 'admin-select-pB2'];
    const playersArr = Object.values(globalPlayers).sort((a,b)=> a.name.localeCompare(b.name));
    
    ids.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        let opts = `<option value="">-- Select Player --</option>`;
        playersArr.forEach(p => {
            opts += `<option value="${p.id}">${p.name}</option>`;
        });
        sel.innerHTML = opts;
    });

    const dateInput = document.getElementById('admin-match-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

function renderAdminMatchesList() {
    const container = document.getElementById('container-admin-matches-list');
    const countElem = document.getElementById('total-matches-admin-count');
    if (!container) return;

    const allLogs = Object.entries(matchHistoryLogs);
    const filteredEntries = allLogs.filter(([id, log]) => {
        if (selectedPeriod === 'ALL') return true;
        const logPeriod = extractIsoPeriod(log);
        return logPeriod === selectedPeriod;
    });

    if (countElem) countElem.innerText = filteredEntries.length;

    let html = '';
    filteredEntries.slice().reverse().forEach(([logId, log]) => {
        const valA = parseInt(log.scoreA || 0);
        const valB = parseInt(log.scoreB || 0);
        const isTeamAWin = log.winner ? (log.winner === 'A') : (valA >= valB);

        html += `
            <div class="bg-[#0B0F17] p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-1.5 text-xs">
                <div class="w-[34%] truncate ${isTeamAWin ? 'text-[#FF5722] font-black' : 'text-slate-400'}">
                    ${log.pA1 || 'P1'} & ${log.pA2 || 'P2'}
                </div>
                <div class="w-[20%] text-center shrink-0">
                    <span class="bg-[#1E2638] px-1.5 py-0.5 rounded text-white font-black text-[11px] border border-slate-800">${log.scoreA} - ${log.scoreB}</span>
                    <div class="text-[8px] text-slate-600 mt-0.5">${log.date || ''}</div>
                </div>
                <div class="w-[34%] text-right truncate ${!isTeamAWin ? 'text-[#FF5722]' : 'text-slate-400'}">
                    ${log.pB1 || 'P1'} & ${log.pB2 || 'P2'}
                </div>
                <div class="flex items-center gap-1 shrink-0 ml-1">
                    <button onclick="mulaiEditAdmin('${logId}')" class="bg-amber-950/40 hover:bg-amber-900 text-amber-400 p-1.5 rounded-lg text-[10px] font-bold border border-amber-900/30 transition" title="Edit">✏️</button>
                    <button onclick="hapusAdminMatch('${logId}')" class="bg-red-950/40 hover:bg-red-900 text-red-400 p-1.5 rounded-lg text-[10px] font-bold border border-red-900/30 transition" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html || `<p class="text-slate-500 text-xs text-center py-6 italic">No matches found for this period.</p>`;
}

window.simpanAdminMatch = function() {
    const pA1 = document.getElementById('admin-select-pA1').value;
    const pA2 = document.getElementById('admin-select-pA2').value;
    const pB1 = document.getElementById('admin-select-pB1').value;
    const pB2 = document.getElementById('admin-select-pB2').value;
    const scoreA = parseInt(document.getElementById('admin-score-A').value) || 0;
    const scoreB = parseInt(document.getElementById('admin-score-B').value) || 0;
    const matchDateVal = document.getElementById('admin-match-date').value;

    if (!pA1 || !pA2 || !pB1 || !pB2) {
        alert("Please select all 4 players!");
        return;
    }

    if (new Set([pA1, pA2, pB1, pB2]).size !== 4) {
        alert("Players in a match must all be different!");
        return;
    }

    const dateObj = matchDateVal ? new Date(matchDateVal) : new Date();
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const isoDateStr = `${year}-${month}`;
    const displayDateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });

    const logData = {
        date: displayDateStr,
        isoDate: isoDateStr,
        idA1: pA1, pA1: globalPlayers[pA1]?.name || 'Player',
        idA2: pA2, pA2: globalPlayers[pA2]?.name || 'Player',
        idB1: pB1, pB1: globalPlayers[pB1]?.name || 'Player',
        idB2: pB2, pB2: globalPlayers[pB2]?.name || 'Player',
        scoreA: scoreA,
        scoreB: scoreB,
        winner: scoreA >= scoreB ? 'A' : 'B'
    };

    const targetId = editingMatchLogId ? editingMatchLogId : ('log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4));

    db.ref(`badminton/match_history/${targetId}`).set(logData).then(() => {
        alert(editingMatchLogId ? "Match entry updated successfully!" : "New match entry inserted successfully!");
        batalEditAdmin();
    });
};

window.mulaiEditAdmin = function(logId) {
    const log = matchHistoryLogs[logId];
    if (!log) return;

    editingMatchLogId = logId;
    document.getElementById('form-admin-title').innerText = "✏️ Edit Match Entry";
    document.getElementById('btn-admin-submit').innerText = "💾 Update Match Data";
    document.getElementById('btn-admin-cancel-edit').classList.remove('hidden');

    document.getElementById('admin-select-pA1').value = log.idA1 || '';
    document.getElementById('admin-select-pA2').value = log.idA2 || '';
    document.getElementById('admin-select-pB1').value = log.idB1 || '';
    document.getElementById('admin-select-pB2').value = log.idB2 || '';
    document.getElementById('admin-score-A').value = log.scoreA || 0;
    document.getElementById('admin-score-B').value = log.scoreB || 0;

    if (log.isoDate) {
        document.getElementById('admin-match-date').value = `${log.isoDate}-01`;
    }

    document.getElementById('container-admin-form').scrollIntoView({ behavior: 'smooth' });
};

window.batalEditAdmin = function() {
    editingMatchLogId = null;
    const title = document.getElementById('form-admin-title');
    const submitBtn = document.getElementById('btn-admin-submit');
    const cancelBtn = document.getElementById('btn-admin-cancel-edit');

    if (title) title.innerText = "➕ Add New Match Entry";
    if (submitBtn) submitBtn.innerText = "💾 Save Match Data";
    if (cancelBtn) cancelBtn.classList.add('hidden');

    ['admin-select-pA1', 'admin-select-pA2', 'admin-select-pB1', 'admin-select-pB2'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    if (document.getElementById('admin-score-A')) document.getElementById('admin-score-A').value = 0;
    if (document.getElementById('admin-score-B')) document.getElementById('admin-score-B').value = 0;
};

window.hapusAdminMatch = function(logId) {
    if (confirm("Permanently delete this match entry from history?")) {
        db.ref(`badminton/match_history/${logId}`).remove();
    }
};

// ==========================================
// LEADERBOARD & MODALS
// ==========================================
function updateLeaderboardList() {
    const tbody = document.getElementById('container-leaderboard-body');
    const matchesContainer = document.getElementById('container-all-matches-list');
    
    if (!tbody || !matchesContainer) return;

    const allLogs = Object.values(matchHistoryLogs);
    const filteredLogs = allLogs.filter(log => {
        if (selectedPeriod === 'ALL') return true;
        const logPeriod = extractIsoPeriod(log);
        return logPeriod === selectedPeriod;
    });

    let playerStatsMap = {};
    if (selectedPeriod === 'ALL') {
        Object.values(globalPlayers).forEach(p => {
            playerStatsMap[p.id] = { id: p.id, name: p.name, win: 0, lose: 0 };
        });
    }

    filteredLogs.forEach(log => {
        const valA = parseInt(log.scoreA || 0);
        const valB = parseInt(log.scoreB || 0);
        const isTeamAWin = log.winner ? (log.winner === 'A') : (valA >= valB);

        if (log.idA1 && !playerStatsMap[log.idA1]) playerStatsMap[log.idA1] = { id: log.idA1, name: log.pA1 || 'Player', win: 0, lose: 0 };
        if (log.idA2 && !playerStatsMap[log.idA2]) playerStatsMap[log.idA2] = { id: log.idA2, name: log.pA2 || 'Player', win: 0, lose: 0 };
        if (log.idB1 && !playerStatsMap[log.idB1]) playerStatsMap[log.idB1] = { id: log.idB1, name: log.pB1 || 'Player', win: 0, lose: 0 };
        if (log.idB2 && !playerStatsMap[log.idB2]) playerStatsMap[log.idB2] = { id: log.idB2, name: log.pB2 || 'Player', win: 0, lose: 0 };

        if (isTeamAWin) {
            if (log.idA1 && playerStatsMap[log.idA1]) playerStatsMap[log.idA1].win += 1;
            if (log.idA2 && playerStatsMap[log.idA2]) playerStatsMap[log.idA2].win += 1;
            if (log.idB1 && playerStatsMap[log.idB1]) playerStatsMap[log.idB1].lose += 1;
            if (log.idB2 && playerStatsMap[log.idB2]) playerStatsMap[log.idB2].lose += 1;
        } else {
            if (log.idB1 && playerStatsMap[log.idB1]) playerStatsMap[log.idB1].win += 1;
            if (log.idB2 && playerStatsMap[log.idB2]) playerStatsMap[log.idB2].win += 1;
            if (log.idA1 && playerStatsMap[log.idA1]) playerStatsMap[log.idA1].lose += 1;
            if (log.idA2 && playerStatsMap[log.idA2]) playerStatsMap[log.idA2].lose += 1;
        }
    });

    const playersList = Object.values(playerStatsMap).map(p => {
        const total = p.win + p.lose;
        const rate = total > 0 ? Math.round((p.win / total) * 100) : 0;
        return { ...p, total, rate };
    });

    playersList.sort((a,b) => b.rate - a.rate || b.win - a.win || a.name.localeCompare(b.name));

    let lbHtml = '';
    playersList.forEach((p, idx) => {
        lbHtml += `
            <tr class="bg-[#1E2638]/40 border-b border-slate-900/60 font-semibold text-xs">
                <td class="py-2.5 px-1 text-center text-slate-500 font-bold">${idx + 1}</td>
                <td class="py-2.5 px-1.5 text-white truncate max-w-[120px]">
                    <span onclick="openHistoryModal('${p.id}', '${p.name}')" class="text-slate-200 hover:text-[#FF5722] cursor-pointer underline decoration-dashed decoration-[#FF5722]/40 transition duration-150 font-bold truncate block">
                        ${p.name}
                    </span>
                </td>
                <td class="py-2.5 px-1 text-center text-[#FF5722] font-bold">${p.win}</td>
                <td class="py-2.5 px-1 text-center text-slate-400 font-bold">${p.lose}</td>
                <td class="py-2.5 px-1 text-center text-[#FF5722] font-black">${p.rate}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = lbHtml || `<tr><td colspan="5" class="text-center text-slate-500 py-6 text-xs italic">No match data available.</td></tr>`;

    const countElem = document.getElementById('total-matches-count');
    if (countElem) countElem.innerText = `${filteredLogs.length} Matches`;
    
    let matchesHtml = '';
    filteredLogs.slice().reverse().forEach(log => {
        const valA = parseInt(log.scoreA || 0);
        const valB = parseInt(log.scoreB || 0);
        const isTeamAWin = log.winner ? (log.winner === 'A') : (valA >= valB);

        matchesHtml += `
            <div class="bg-[#0B0F17] p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between gap-1.5 text-xs">
                <div class="w-[38%] truncate ${isTeamAWin ? 'text-[#FF5722] font-black' : 'text-slate-400'}">
                    ${log.pA1} & ${log.pA2}
                </div>
                <div class="w-[24%] text-center shrink-0">
                    <span class="bg-[#1E2638] px-1.5 py-0.5 rounded text-white font-black text-[11px] border border-slate-800">${log.scoreA} - ${log.scoreB}</span>
                    <div class="text-[8px] text-slate-600 mt-0.5">${log.date || ''}</div>
                </div>
                <div class="w-[38%] text-right truncate ${!isTeamAWin ? 'text-[#FF5722]' : 'text-slate-400'}">
                    ${log.pB1} & ${log.pB2}
                </div>
            </div>
        `;
    });

    matchesContainer.innerHTML = matchesHtml || `<p class="text-slate-500 text-xs text-center py-6 italic">No match history available.</p>`;
}

window.openHistoryModal = function(playerId, playerName) {
    const modal = document.getElementById('modal-history');
    const title = document.getElementById('modal-player-name');
    const content = document.getElementById('modal-history-content');
    
    if (!modal || !title || !content) return;
    title.innerText = playerName;

    const logsArray = Object.values(matchHistoryLogs).filter(log => {
        const isPlayerInMatch = (log.idA1 === playerId || log.idA2 === playerId || log.idB1 === playerId || log.idB2 === playerId);
        const logPeriod = extractIsoPeriod(log);
        const matchPeriod = (selectedPeriod === 'ALL' || logPeriod === selectedPeriod);
        return isPlayerInMatch && matchPeriod;
    });

    let modalRowsHtml = '';
    logsArray.slice(-15).reverse().forEach(log => {
        const valA = parseInt(log.scoreA || 0);
        const valB = parseInt(log.scoreB || 0);
        const isTeamAWin = log.winner ? (log.winner === 'A') : (valA >= valB);
        const isTeamA = (log.idA1 === playerId || log.idA2 === playerId);
        const isWinner = (isTeamA && isTeamAWin) || (!isTeamA && !isTeamAWin);
        
        const partnerName = isTeamA ? (log.idA1 === playerId ? log.pA2 : log.pA1) : (log.idB1 === playerId ? log.pB2 : log.pB1);
        const opponentString = isTeamA ? `${log.pB1} / ${log.pB2}` : `${log.pA1} / ${log.pA2}`;
        const myTeamScore = isTeamA ? valA : valB;
        const opponentScore = isTeamA ? valB : valA;
        
        modalRowsHtml += `
            <div class="bg-[#0B0F17] p-2 rounded-xl border border-slate-800/80 space-y-1">
                <div class="flex justify-between items-center text-[10px]">
                    <span class="font-black px-1.5 py-0.5 rounded text-[8px] ${isWinner ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/50 text-red-400 border border-red-900/30'} shrink-0">
                        ${isWinner ? 'WIN' : 'LOSE'}
                    </span>
                    <span class="text-[9px] text-slate-500 font-semibold">${log.date || ''}</span>
                </div>
                <div class="flex justify-between items-center text-[10px] gap-1">
                    <div class="text-slate-300 truncate flex-1 min-w-0">
                        <span class="text-slate-500">w/</span> <strong class="text-slate-200">${partnerName}</strong> 
                        <span class="text-slate-600 font-bold">vs</span> <span class="text-slate-400">${opponentString}</span>
                    </div>
                    <span class="text-white font-black shrink-0 bg-[#1E2638] px-1.5 py-0.5 rounded border border-slate-800 text-[9px]">${myTeamScore} - ${opponentScore}</span>
                </div>
            </div>
        `;
    });

    content.innerHTML = modalRowsHtml || `<div class="text-xs text-slate-500 italic text-center py-6">No match history available.</div>`;
    modal.classList.remove('hidden');
};

window.closeHistoryModal = function() {
    const modal = document.getElementById('modal-history');
    if (modal) modal.classList.add('hidden');
};

window.resetSemuaJumlahMain = function() {
    if (!confirm("Force reset everyone's daily match count back to 0?")) return;
    const updates = {};
    Object.keys(globalPlayers).forEach(id => { updates[`badminton/players/${id}/match_count`] = 0; });
    db.ref().update(updates);
};
