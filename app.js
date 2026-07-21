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
                                <input type="number" id="admin-score-A" value="0" min="0" onfocus="this.select()" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center text-[#FF5722]">
                            </div>
                            <div>
                                <label class="text-[9px] text-slate-400 uppercase font-bold block mb-1">Score B</label>
                                <input type="number" id="admin-score-B" value="0" min="0" onfocus="this.select()" class="w-full bg-[#1E2638] border border-slate-800 rounded-lg p-1.5 text-xs font-bold text-center text-[#FF5722]">
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
                    <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest">Attendance Status</h2>
                    <button onclick="resetSemuaJumlahMain()" class="text-[9px] bg-red-950/40 text-red-400 px-1.5 py-0.5 rounded border border-red-900/20 font-bold hover:bg-red-900/60 transition shrink-0">Reset Count</button>
                </div>
                <p id="absen-status-desc" class="text-[10px] text-slate-500 mb-3">Check active players at venue. Unchecking active players is disabled once they have ongoing/completed matches.</p>
                <div id="container-absen-list" class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-0.5"></div>
            </div>

            <div class="flex gap-1.5 w-full">
                <button onclick="generateBalancedMatches()" class="flex-1 bg-gradient-to-r from-[#FF5722] to-[#ff7043] text-white font-black text-xs py-3 px-2 rounded-xl shadow-lg shadow-[#FF5722]/10 transition active:scale-95 uppercase tracking-wider truncate">
                    🎲 Generate Balanced Matches
                </button>
                <button onclick="simpanSesiHarian()" class="bg-[#1E2638] text-white font-bold text-xs px-3 py-3 rounded-xl hover:bg-slate-700 border border-slate-700/60 transition uppercase tracking-wider shadow-lg shrink-0">
                    💾 Save Session
                </button>
            </div>

            <div class="bg-[#1E2638] p-3.5 sm:p-4 rounded-2xl border border-slate-800/50 shadow-xl space-y-3 w-full">
                <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-800/60 pb-2.5">📋 Match Schedules</h2>
                <div id="container-schedule-list" class="space-y-3 max-h-[550px] overflow-y-auto pr-0.5 scroll-smooth"></div>
                <div id="container-reset-session" class="pt-2"></div>
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
    if (currentActiveTab === 'matchmaking') {
        updateAbsenHariIniList();
        updateScheduleList();
    }
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
// ADVANCED MATCHMAKING UTILITIES & BALANCING
// ==========================================
function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) return globalHistory[key][tipe];
    return 0;
}

function getRecentMatchPlayers(matchesObj, currentMatchNo, lookbackCount = 1) {
    let recentIds = new Set();
    let sortedMatches = Object.values(matchesObj).sort((a, b) => a.gameNo - b.gameNo);
    let pastMatches = sortedMatches.filter(m => m.gameNo < currentMatchNo && m.gameNo >= (currentMatchNo - lookbackCount));
    
    pastMatches.forEach(m => {
        if (m.idA1) recentIds.add(m.idA1);
        if (m.idA2) recentIds.add(m.idA2);
        if (m.idB1) recentIds.add(m.idB1);
        if (m.idB2) recentIds.add(m.idB2);
    });
    return recentIds;
}

function selectBest4Players(pool, currentCounts, matchesObj = {}, currentMatchNo = 1) {
    if (pool.length < 4) return null;
    
    let recentIds = getRecentMatchPlayers(matchesObj, currentMatchNo, 1);

    let sortedPool = [...pool].sort((a, b) => {
        let countA = currentCounts[a.id] || 0;
        let countB = currentCounts[b.id] || 0;
        
        let penaltyA = recentIds.has(a.id) ? 1000 : 0;
        let penaltyB = recentIds.has(b.id) ? 1000 : 0;

        return (countA + penaltyA + Math.random() * 0.49) - (countB + penaltyB + Math.random() * 0.49);
    });

    let topCandidates = sortedPool.slice(0, Math.min(8, sortedPool.length));
    topCandidates.sort(() => Math.random() - 0.5);

    let p1 = topCandidates[0];
    let p2 = topCandidates[1];
    let p3 = topCandidates[2];
    let p4 = topCandidates[3];

    let combos = [
        { tA: [p1, p2], tB: [p3, p4] },
        { tA: [p1, p3], tB: [p2, p4] },
        { tA: [p1, p4], tB: [p2, p3] }
    ];

    let bestCombo = combos[0];
    let minHistoryWeight = Infinity;

    combos.forEach(combo => {
        let pWeightA = getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner');
        let pWeightB = getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner');
        let oWeight1 = getHistoryScore(combo.tA[0].id, combo.tB[0].id, 'opponent');
        let oWeight2 = getHistoryScore(combo.tA[0].id, combo.tB[1].id, 'opponent');
        let oWeight3 = getHistoryScore(combo.tA[1].id, combo.tB[0].id, 'opponent');
        let oWeight4 = getHistoryScore(combo.tA[1].id, combo.tB[1].id, 'opponent');
        
        let totalWeight = (pWeightA * 3) + (pWeightB * 3) + oWeight1 + oWeight2 + oWeight3 + oWeight4;
        if (totalWeight < minHistoryWeight) {
            minHistoryWeight = totalWeight;
            bestCombo = combo;
        }
    });

    return bestCombo;
}

// ==========================================
// TAB: MATCHMAKING & REBALANCING SYSTEM
// ==========================================
window.toggleAbsenHariIni = function(id, currentStatus) {
    const nextStatus = !currentStatus;
    
    // Jika pemain ingin di-uncheck (menjadi tidak aktif), periksa apakah dia sudah pernah masuk di match mana pun
    if (!nextStatus) {
        let isPlayerUsed = false;
        Object.values(currentSchedule).forEach(m => {
            if (m.idA1 === id || m.idA2 === id || m.idB1 === id || m.idB2 === id) {
                isPlayerUsed = true;
            }
        });

        if (isPlayerUsed) {
            alert("Cannot uncheck this player because they are already scheduled in current or completed matches!");
            updateAbsenHariIniList();
            return;
        }
    }

    db.ref(`badminton/players/${id}/is_active`).set(nextStatus).then(() => {
        // Jika pemain baru di-check (menjadi aktif) di tengah jalan, jalankan rebalancing penuh dari awal sampai akhir sesi agar jumlah main merata
        if (nextStatus) {
            rebalanceSemuaMatchAktif();
        }
    });
};

function rebalanceSemuaMatchAktif() {
    let existingMatches = Object.values(currentSchedule).sort((a, b) => a.gameNo - b.gameNo);
    if (existingMatches.length === 0) return;

    let activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) return;

    let matchesObj = {};
    let simulatedCounts = {};
    activePlayers.forEach(p => { simulatedCounts[p.id] = 0; });

    // Pertahankan match yang sudah selesai (done)
    existingMatches.forEach(m => {
        if (m.status === 'done') {
            matchesObj[m.id] = m;
            [m.idA1, m.idA2, m.idB1, m.idB2].forEach(pId => {
                if (pId && simulatedCounts[pId] !== undefined) simulatedCounts[pId]++;
            });
        }
    });

    // Re-generate ulang semua match yang masih pending agar mencakup pemain baru secara adil & merata
    let pendingMatches = existingMatches.filter(m => m.status === 'pending');
    pendingMatches.forEach(m => {
        let pool = Object.values(globalPlayers).filter(p => p.is_active);
        let bestCombo = selectBest4Players(pool, simulatedCounts, matchesObj, m.gameNo);
        
        if (bestCombo) {
            simulatedCounts[bestCombo.tA[0].id]++;
            simulatedCounts[bestCombo.tA[1].id]++;
            simulatedCounts[bestCombo.tB[0].id]++;
            simulatedCounts[bestCombo.tB[1].id]++;

            matchesObj[m.id] = {
                ...m,
                pA1: bestCombo.tA[0].name, idA1: bestCombo.tA[0].id,
                pA2: bestCombo.tA[1].name, idA2: bestCombo.tA[1].id,
                pB1: bestCombo.tB[0].name, idB1: bestCombo.tB[0].id,
                pB2: bestCombo.tB[1].name, idB2: bestCombo.tB[1].id
            };
        }
    });

    db.ref('badminton/current_schedule').set(matchesObj);
}

function updateAbsenHariIniList() {
    const container = document.getElementById('container-absen-list');
    if (!container) return;

    // Kumpulkan ID pemain yang sudah ada di match (baik pending maupun done) agar tidak bisa di-uncheck
    let scheduledPlayerIds = new Set();
    Object.values(currentSchedule).forEach(m => {
        if (m.idA1) scheduledPlayerIds.add(m.idA1);
        if (m.idA2) scheduledPlayerIds.add(m.idA2);
        if (m.idB1) scheduledPlayerIds.add(m.idB1);
        if (m.idB2) scheduledPlayerIds.add(m.idB2);
    });

    let html = '';
    const sorted = Object.values(globalPlayers).sort((a,b)=> a.name.localeCompare(b.name));
    sorted.forEach(p => {
        const isScheduled = scheduledPlayerIds.has(p.id);
        const isDisabledUncheck = p.is_active && isScheduled;

        html += `
            <label class="flex items-center justify-between bg-[#0B0F17] p-2 rounded-xl border ${p.is_active ? 'border-[#FF5722]/50 bg-[#FF5722]/5' : 'border-slate-800/40'} ${isDisabledUncheck ? 'opacity-80' : 'cursor-pointer'} select-none transition min-w-0" title="${isDisabledUncheck ? 'Cannot uncheck: Player is already in schedule' : ''}">
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
// FULL REBALANCING SAAT MANUAL EDIT MATCH
// ==========================================
window.ubahPemainMatch = function(matchId, posisi, newPlayerId) {
    if (!currentSchedule[matchId]) return;
    let match = currentSchedule[matchId];
    if (match.status === 'done') {
        alert("Cannot modify a completed match!");
        updateScheduleList();
        return;
    }

    let oldPlayerId = match[posisi === 'A1' ? 'idA1' : posisi === 'A2' ? 'idA2' : posisi === 'B1' ? 'idB1' : 'idB2'];
    if (oldPlayerId === newPlayerId) return;

    let newPlayer = globalPlayers[newPlayerId];
    if (!newPlayer) return;

    let currentIds = [match.idA1, match.idA2, match.idB1, match.idB2];
    if (currentIds.includes(newPlayerId)) {
        alert("This player is already playing in this match!");
        updateScheduleList();
        return;
    }

    // 1. Update posisi pemain di match saat ini
    if (posisi === 'A1') { match.pA1 = newPlayer.name; match.idA1 = newPlayer.id; }
    else if (posisi === 'A2') { match.pA2 = newPlayer.name; match.idA2 = newPlayer.id; }
    else if (posisi === 'B1') { match.pB1 = newPlayer.name; match.idB1 = newPlayer.id; }
    else if (posisi === 'B2') { match.pB2 = newPlayer.name; match.idB2 = newPlayer.id; }

    let updates = {};
    updates[`badminton/current_schedule/${match.id}`] = match;

    // 2. Jalankan Full Rebalancing Berantai ke seluruh match pending di bawahnya agar jumlah main seluruh pemain tetap seimbang
    let existingMatches = Object.values(currentSchedule).sort((a, b) => a.gameNo - b.gameNo);
    let activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    
    let matchesObj = {};
    let simulatedCounts = {};
    activePlayers.forEach(p => { simulatedCounts[p.id] = 0; });

    existingMatches.forEach(m => {
        if (m.status === 'done') {
            matchesObj[m.id] = m;
            [m.idA1, m.idA2, m.idB1, m.idB2].forEach(pId => {
                if (pId && simulatedCounts[pId] !== undefined) simulatedCounts[pId]++;
            });
        }
    });

    // Masukkan match yang sedang diedit ke state simulasi
    let targetMatchId = match.id;
    matchesObj[targetMatchId] = match;
    [match.idA1, match.idA2, match.idB1, match.idB2].forEach(pId => {
        if (pId && simulatedCounts[pId] !== undefined) simulatedCounts[pId]++;
    });

    let subsequentPendingMatches = existingMatches.filter(m => m.gameNo > match.gameNo && m.status === 'pending');
    subsequentPendingMatches.forEach(subMatch => {
        let pool = Object.values(globalPlayers).filter(p => p.is_active);
        let bestCombo = selectBest4Players(pool, simulatedCounts, matchesObj, subMatch.gameNo);
        
        if (bestCombo) {
            simulatedCounts[bestCombo.tA[0].id]++;
            simulatedCounts[bestCombo.tA[1].id]++;
            simulatedCounts[bestCombo.tB[0].id]++;
            simulatedCounts[bestCombo.tB[1].id]++;

            matchesObj[subMatch.id] = {
                ...subMatch,
                pA1: bestCombo.tA[0].name, idA1: bestCombo.tA[0].id,
                pA2: bestCombo.tA[1].name, idA2: bestCombo.tA[1].id,
                pB1: bestCombo.tB[0].name, idB1: bestCombo.tB[0].id,
                pB2: bestCombo.tB[1].name, idB2: bestCombo.tB[1].id
            };
        }
    });

    db.ref('badminton/current_schedule').set(matchesObj);
};

// ==========================================
// BALANCED MATCH GENERATOR (DYNAMIC FAIR SESSIONS)
// ==========================================
window.generateBalancedMatches = function() {
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) {
        alert("At least 4 'Active' players required to generate fixtures!");
        return;
    }

    let existingMatches = Object.values(currentSchedule);
    let doneMatches = existingMatches.filter(m => m.status === 'done');
    let maxGameNo = doneMatches.reduce((max, m) => Math.max(max, m.gameNo), 0);

    let matchesObj = {};
    doneMatches.forEach(m => {
        matchesObj[m.id] = m;
    });

    let simulatedCounts = {};
    activePlayers.forEach(p => { simulatedCounts[p.id] = 0; });
    doneMatches.forEach(m => {
        [m.idA1, m.idA2, m.idB1, m.idB2].forEach(pId => {
            if (pId && simulatedCounts[pId] !== undefined) simulatedCounts[pId]++;
        });
    });

    // Tentukan target jumlah main yang adil (misal: setiap pemain bermain minimal 4-5 match per sesi atau kelipatan adil berdasarkan jumlah pemain aktif)
    // Formula dinamis: Target total slot pemain dibagi jumlah pemain aktif (dibulatkan ke atas minimal 4 match per orang)
    let totalDoneCount = Object.values(simulatedCounts).reduce((a, b) => a + b, 0);
    let targetMatchesPerPlayer = Math.max(4, Math.ceil((totalDoneCount + (activePlayers.length * 4)) / activePlayers.length));
    
    // Total match yang perlu di-generate agar setiap pemain mencapai target count secara merata
    let totalSlotsNeeded = targetMatchesPerPlayer * activePlayers.length;
    let currentTotalSlots = totalDoneCount;
    let gamesToGenerate = Math.max(10, Math.ceil((totalSlotsNeeded - currentTotalSlots) / 4));

    for (let i = 1; i <= gamesToGenerate; i++) {
        let gameNo = maxGameNo + i;
        let pool = Object.values(globalPlayers).filter(p => p.is_active);
        let bestCombo = selectBest4Players(pool, simulatedCounts, matchesObj, gameNo);
        
        if (!bestCombo) break;

        simulatedCounts[bestCombo.tA[0].id]++;
        simulatedCounts[bestCombo.tA[1].id]++;
        simulatedCounts[bestCombo.tB[0].id]++;
        simulatedCounts[bestCombo.tB[1].id]++;

        matchesObj[`m_${gameNo}`] = {
            id: `m_${gameNo}`, gameNo: gameNo,
            pA1: bestCombo.tA[0].name, idA1: bestCombo.tA[0].id,
            pA2: bestCombo.tA[1].name, idA2: bestCombo.tA[1].id,
            pB1: bestCombo.tB[0].name, idB1: bestCombo.tB[0].id,
            pB2: bestCombo.tB[1].name, idB2: bestCombo.tB[1].id,
            status: 'pending', winner: '', scoreA: 0, scoreB: 0
        };
    }
    
    let updates = {};
    updates['badminton/current_schedule'] = matchesObj;

    db.ref().update(updates).then(() => {
        // Auto scroll balik lagi ke match 1 / paling atas setelah generate
        const container = document.getElementById('container-schedule-list');
        if (container) {
            container.scrollTop = 0;
        }
        const firstCard = document.getElementById('card-match-no-1') || document.getElementById('card-match-no-' + (maxGameNo + 1));
        if (firstCard) {
            firstCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
};

// ==========================================
// SUBMIT SKOR GAME & HISTORY RECORDING
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

        [match.idA1, match.idA2].forEach(idA => {
            [match.idB1, match.idB2].forEach(idB => {
                if (idA && idB) {
                    const keyO = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
                    updates[`badminton/history/${keyO}/opponent`] = (globalHistory[keyO]?.opponent || 0) + 1;
                }
            });
        });
    }

    db.ref().update(updates);
};

window.bukaEditSkorGame = function(matchId) {
    db.ref(`badminton/current_schedule/${matchId}`).update({ status: 'pending' });
};

window.batalSesiMatch = function() {
    if (!confirm("Are you sure you want to cancel and clear the current generated matches?")) return;

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
    const activePlayersList = Object.values(globalPlayers).filter(p => p.is_active).sort((a,b)=> a.name.localeCompare(b.name));

    mList.forEach(m => {
        const isDone = m.status === 'done';
        const displayScoreA = m.scoreA || 0;
        const displayScoreB = m.scoreB || 0;

        const generatePlayerOptions = (selectedId) => {
            let opts = '';
            activePlayersList.forEach(p => {
                opts += `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.name}</option>`;
            });
            return opts;
        };

        html += `
            <div id="card-match-no-${m.gameNo}" class="bg-[#0B0F17] p-3 rounded-xl border ${isDone ? 'border-slate-900 opacity-60' : 'border-slate-800/80'} shadow-inner w-full">
                <div class="flex justify-between items-center text-[9px] text-slate-500 font-bold mb-2 tracking-wider">
                    <span>MATCH #${m.gameNo}</span>
                    <span class="${isDone ? 'text-emerald-500':'text-[#FF5722]'} uppercase font-black">${m.status}</span>
                </div>
                
                <div class="flex items-center justify-between text-xs font-bold gap-1 w-full">
                    <div class="w-[38%] p-1.5 rounded-lg ${isDone && m.winner === 'A' ? 'bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]' : 'bg-[#1E2638] text-slate-300'} space-y-1">
                        ${isDone ? `
                            <div class="truncate">${m.pA1}</div>
                            <div class="truncate">${m.pA2}</div>
                        ` : `
                            <select onchange="ubahPemainMatch('${m.id}', 'A1', this.value)" class="w-full bg-[#0B0F17] text-[10px] text-white border border-slate-700 rounded p-0.5 focus:outline-none focus:border-[#FF5722]">${generatePlayerOptions(m.idA1)}</select>
                            <select onchange="ubahPemainMatch('${m.id}', 'A2', this.value)" class="w-full bg-[#0B0F17] text-[10px] text-white border border-slate-700 rounded p-0.5 focus:outline-none focus:border-[#FF5722]">${generatePlayerOptions(m.idA2)}</select>
                        `}
                    </div>
                    
                    <div class="flex items-center justify-center gap-0.5 w-[24%] shrink-0">
                        ${isDone ? `
                            <span class="text-xs font-black text-white bg-[#1E2638] px-1.5 py-0.5 rounded">${displayScoreA}</span>
                            <span class="text-slate-600 text-[10px]">:</span>
                            <span class="text-xs font-black text-white bg-[#1E2638] px-1.5 py-0.5 rounded">${displayScoreB}</span>
                        ` : `
                            <input type="number" id="input-score-A-${m.id}" value="${displayScoreA}" min="0" max="30" onfocus="this.select()" class="w-7 sm:w-8 bg-[#1E2638] border border-slate-800 rounded text-center text-xs py-0.5 text-[#FF5722] font-extrabold focus:outline-none">
                            <span class="text-slate-700 text-[10px]">:</span>
                            <input type="number" id="input-score-B-${m.id}" value="${displayScoreB}" min="0" max="30" onfocus="this.select()" class="w-7 sm:w-8 bg-[#1E2638] border border-slate-800 rounded text-center text-xs py-0.5 text-[#FF5722] font-extrabold focus:outline-none">
                        `}
                    </div>

                    <div class="w-[38%] p-1.5 rounded-lg text-right ${isDone && m.winner === 'B' ? 'bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]' : 'bg-[#1E2638] text-slate-300'} space-y-1">
                        ${isDone ? `
                            <div class="truncate">${m.pB1}</div>
                            <div class="truncate">${m.pB2}</div>
                        ` : `
                            <select onchange="ubahPemainMatch('${m.id}', 'B1', this.value)" class="w-full bg-[#0B0F17] text-[10px] text-white border border-slate-700 rounded p-0.5 focus:outline-none focus:border-[#FF5722]">${generatePlayerOptions(m.idB1)}</select>
                            <select onchange="ubahPemainMatch('${m.id}', 'B2', this.value)" class="w-full bg-[#0B0F17] text-[10px] text-white border border-slate-700 rounded p-0.5 focus:outline-none focus:border-[#FF5722]">${generatePlayerOptions(m.idB2)}</select>
                        `}
                    </div>
                </div>

                ${!isDone ? `
                    <button onclick="submitSkorGame('${m.id}')" class="w-full mt-2 bg-[#1E2638] hover:bg-[#FF5722] hover:text-white text-slate-400 font-bold py-1 rounded-lg text-[9px] transition uppercase tracking-widest">💾 Save Score</button>
                ` : `
                    <button onclick="bukaEditSkorGame('${m.id}')" class="w-full mt-2 bg-[#0B0F17] hover:bg-slate-800 text-slate-500 font-bold py-0.5 rounded-lg text-[8px] transition uppercase tracking-widest">✏️ Edit Score</button>
                `}
            </div>
        `;
    });

    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-6">Tap 'Generate Balanced Matches' button.</p>`;

    if (resetContainer) {
        if (mList.length > 0) {
            resetContainer.innerHTML = `
                <button onclick="batalSesiMatch()" class="w-full bg-red-950/30 hover:bg-red-900/60 text-red-400 border border-red-900/30 font-bold text-xs py-2.5 px-3 rounded-xl transition duration-150 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <span>🚫</span> Cancel / Reset Current Matches
                </button>
            `;
        } else {
            resetContainer.innerHTML = '';
        }
    }
};

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
    });

    Object.keys(globalPlayers).forEach(id => {
        updates[`badminton/players/${id}/match_count`] = 0;
    });

    updates['badminton/current_schedule'] = null;

    db.ref().update(updates).then(() => {
        alert("Session saved successfully!");
        switchTab('leaderboard');
    });
};

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
    if (playersList.length > 0) {
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
    }

    tbody.innerHTML = lbHtml || `<tr><td colspan="5" class="text-center text-slate-500 py-6 text-xs italic">No match data available for this month/year.</td></tr>`;

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
        const finalScoreStr = `${myTeamScore} - ${opponentScore}`;
        
        const matchDate = log.date || '';

        modalRowsHtml += `
            <div class="bg-[#0B0F17] p-2 rounded-xl border border-slate-800/80 space-y-1">
                <div class="flex justify-between items-center text-[10px]">
                    <span class="font-black px-1.5 py-0.5 rounded text-[8px] ${isWinner ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/50 text-red-400 border border-red-900/30'} shrink-0">
                        ${isWinner ? 'WIN' : 'LOSE'}
                    </span>
                    <span class="text-[9px] text-slate-500 font-semibold">${matchDate}</span>
                </div>
                <div class="flex justify-between items-center text-[10px] gap-1">
                    <div class="text-slate-300 truncate flex-1 min-w-0">
                        <span class="text-slate-500">w/</span> <strong class="text-slate-200">${partnerName}</strong> 
                        <span class="text-slate-600 font-bold">vs</span> <span class="text-slate-400">${opponentString}</span>
                    </div>
                    <span class="text-white font-black shrink-0 bg-[#1E2638] px-1.5 py-0.5 rounded border border-slate-800 text-[9px]">${finalScoreStr}</span>
                </div>
            </div>
        `;
    });

    content.innerHTML = modalRowsHtml || `<div class="text-xs text-slate-500 italic text-center py-6">No match history available for this period.</div>`;
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
