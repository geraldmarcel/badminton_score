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
let isLayoutRendered = false;
let selectedMonthFilter = 'ALL'; // Dynamic period filter ('YYYY-MM' or 'ALL')

// ==========================================
// THEME SYSTEM (LIGHT / DARK MODE)
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

// Inisialisasi tema awal
initTheme();

// ==========================================
// GLOBAL TAB SWITCHER
// ==========================================
window.switchTab = function(tabName) {
    currentActiveTab = tabName;
    isLayoutRendered = false; 
    
    const tabs = {
        matchmaking: document.getElementById('btn-tab-matchmaking'),
        leaderboard: document.getElementById('btn-tab-leaderboard'),
        database: document.getElementById('btn-tab-database')
    };

    Object.keys(tabs).forEach(key => {
        if (!tabs[key]) return;
        if (key === tabName) {
            tabs[key].className = "flex-1 text-center py-1.5 text-[11px] sm:text-xs font-bold rounded-lg bg-[#FF5722] text-white transition duration-200 shadow-md shadow-[#FF5722]/10";
        } else {
            tabs[key].className = "flex-1 text-center py-1.5 text-[11px] sm:text-xs font-bold rounded-lg text-slate-400 hover:text-white transition duration-200";
        }
    });
    renderTabStructure();
};

// ==========================================
// RENDER LAYOUT STRUKTUR UTAMA
// ==========================================
function renderTabStructure() {
    if (isLayoutRendered) return;

    if (currentActiveTab === 'database') {
        appContent.innerHTML = `
            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 space-y-3 shadow-xl">
                <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest">Register New Club Member</h2>
                <div class="flex gap-2">
                    <input type="text" id="input-nama" placeholder="Enter player full name..." class="flex-1 bg-[#0B0F17] border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-[#FF5722] text-sm transition">
                    <button onclick="aksiTambahPemain()" class="bg-[#FF5722] hover:bg-[#e04a1b] text-white font-bold px-5 py-2 rounded-xl text-sm transition">Register</button>
                </div>
            </div>
            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 shadow-xl">
                <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest mb-4">Registered Members (<span id="total-db">0</span>)</h2>
                <div id="container-db-list" class="space-y-2 max-h-96 overflow-y-auto pr-1"></div>
            </div>
        `;
    } else if (currentActiveTab === 'leaderboard') {
        appContent.innerHTML = `
            <!-- FILTER PERIODE BULAN & TAHUN -->
            <div class="bg-[#1E2638] p-4 rounded-2xl border border-slate-800/50 shadow-xl flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                    <span class="text-lg">📅</span>
                    <div>
                        <h3 class="text-xs font-bold text-white">Filter Period</h3>
                        <p class="text-[10px] text-slate-400">Select month and year</p>
                    </div>
                </div>
                <select id="filter-month-year" onchange="changePeriodFilter(this.value)" class="bg-[#0B0F17] text-xs font-bold text-[#FF5722] border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-[#FF5722]">
                    <option value="ALL">All Time (Overall)</option>
                </select>
            </div>

            <!-- LEADERBOARD TABLE -->
            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 shadow-xl space-y-4">
                <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest">🏆 Performance Leaderboard</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-300">
                        <thead class="text-xs uppercase bg-[#0B0F17] text-slate-500 border-b border-slate-800/60">
                            <tr>
                                <th class="py-3 px-2 text-center">Rank</th>
                                <th class="py-3 px-2">Name</th>
                                <th class="py-3 px-2 text-center">Won</th>
                                <th class="py-3 px-2 text-center">Lost</th>
                                <th class="py-3 px-2 text-center text-[#FF5722]">Win Rate</th>
                            </tr>
                        </thead>
                        <tbody id="container-leaderboard-body"></tbody>
                    </table>
                </div>
            </div>

            <!-- ALL MATCHES HISTORY LOG -->
            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 shadow-xl space-y-4">
                <div class="flex justify-between items-center border-b border-slate-800/60 pb-3">
                    <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest">⚔️ All Matches History</h2>
                    <span id="total-matches-count" class="text-[10px] bg-[#0B0F17] text-slate-400 px-2 py-0.5 rounded-full border border-slate-800 font-bold">0 Matches</span>
                </div>
                <div id="container-all-matches-list" class="space-y-2.5 max-h-[500px] overflow-y-auto pr-1 scroll-smooth"></div>
            </div>

            <!-- MODAL DIALOG UNTUK RIWAYAT PERTANDINGAN (SISTEM KLIK) -->
            <div id="modal-history" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 hidden backdrop-blur-sm p-4">
                <div class="bg-[#1E2638] w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl p-5 overflow-hidden">
                    <div class="flex justify-between items-center border-b border-slate-800 pb-3 mb-3">
                        <div>
                            <h3 id="modal-player-name" class="text-sm font-black text-white">Player Name</h3>
                            <p class="text-[10px] text-[#FF5722] uppercase tracking-wider font-bold">📋 Recent Matches History Log</p>
                        </div>
                        <button onclick="closeHistoryModal()" class="text-slate-400 hover:text-white bg-[#0B0F17] w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition border border-slate-800">&times;</button>
                    </div>
                    <div id="modal-history-content" class="space-y-2 max-h-80 overflow-y-auto pr-1"></div>
                </div>
            </div>
        `;
        populateFilterDropdown();
    } else {
        appContent.innerHTML = `
            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 shadow-xl">
                <div class="flex justify-between items-start mb-1">
                    <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest">Attendance Status (Courtside)</h2>
                    <button onclick="resetSemuaJumlahMain()" class="text-[9px] bg-red-950/40 text-red-400 px-2 py-0.5 rounded border border-red-900/20 font-bold hover:bg-red-900/60 transition">Reset Matches Count</button>
                </div>
                <p class="text-[11px] text-slate-500 mb-4">Check "Active" for players currently at the venue. Uncheck immediately if someone rests or goes home early.</p>
                <div id="container-absen-list" class="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1"></div>
            </div>

            <div class="flex gap-2">
                <button onclick="generate10Matches()" class="flex-1 bg-gradient-to-r from-[#FF5722] to-[#ff7043] text-white font-black text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-[#FF5722]/10 transition active:scale-95 uppercase tracking-wider">
                    🎲 Generate 10 Random Matches
                </button>
                <button onclick="simpanSesiHarian()" class="bg-[#1E2638] text-white font-bold text-xs px-4 py-3.5 rounded-xl hover:bg-slate-700 border border-slate-700/60 transition uppercase tracking-wider shadow-lg">
                    💾 Save Daily Session
                </button>
            </div>

            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 shadow-xl space-y-4">
                <h2 class="text-xs font-bold uppercase text-slate-400 tracking-widest border-b border-slate-800/60 pb-3">📋 Current Fixture & Match Schedules</h2>
                <div id="container-schedule-list" class="space-y-4 max-h-[600px] overflow-y-auto pr-1 scroll-smooth"></div>
            </div>
        `;
    }
    isLayoutRendered = true;
    refreshActiveListData();
}

function refreshActiveListData() {
    if (currentActiveTab === 'database') updateDatabasePemainList();
    if (currentActiveTab === 'leaderboard') updateLeaderboardList();
    if (currentActiveTab === 'matchmaking') { updateAbsenHariIniList(); updateScheduleList(); }
}

// ==========================================
// DATABASE REALTIME LISTENERS
// ==========================================
db.ref('badminton/players').on('value', (snapshot) => {
    globalPlayers = snapshot.val() || {};
    renderTabStructure();
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
        populateFilterDropdown();
        updateLeaderboardList();
    }
});

// ==========================================
// TAB: MEMBER DATABASE MANAGEMENT
// ==========================================
window.aksiTambahPemain = function() {
    const input = document.getElementById('input-nama');
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
            <div class="flex items-center justify-between bg-[#0B0F17] p-3 rounded-xl border border-slate-800/40">
                <span class="text-sm font-semibold text-slate-200">${p.name}</span>
                <button onclick="hapusPemainClub('${p.id}')" class="text-xs bg-red-950/30 text-red-400 px-3 py-1 rounded-lg font-bold border border-red-900/10 hover:bg-red-900 transition">Remove</button>
            </div>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-4">No registered members found.</p>`;
    document.getElementById('total-db').innerText = sorted.length;
}

// ==========================================
// TAB: MATCHMAKING & AUTO-SUBSTITUTION
// ==========================================
window.toggleAbsenHariIni = function(id, currentStatus) {
    const nextStatus = !currentStatus;
    db.ref(`badminton/players/${id}`).update({ is_active: nextStatus });

    if (nextStatus === false && Object.keys(currentSchedule).length > 0) {
        let scheduleUpdates = {};
        
        Object.values(currentSchedule).forEach(m => {
            if (m.status === 'pending') {
                if (m.idA1 === id || m.idA2 === id || m.idB1 === id || m.idB2 === id) {
                    let currentInMatchIds = [m.idA1, m.idA2, m.idB1, m.idB2];
                    let candidatePlayers = Object.values(globalPlayers).filter(p => 
                        p.is_active && p.id !== id && !currentInMatchIds.includes(p.id)
                    );

                    if (candidatePlayers.length > 0) {
                        candidatePlayers.sort(() => Math.random() - 0.5);
                        candidatePlayers.sort((a, b) => a.match_count - b.match_count);
                        
                        let substitute = candidatePlayers[0];

                        if (m.idA1 === id) { m.pA1 = substitute.name; m.idA1 = substitute.id; }
                        else if (m.idA2 === id) { m.pA2 = substitute.name; m.idA2 = substitute.id; }
                        else if (m.idB1 === id) { m.pB1 = substitute.name; m.idB1 = substitute.id; }
                        else if (m.idB2 === id) { m.pB2 = substitute.name; m.idB2 = substitute.id; }

                        scheduleUpdates[`badminton/current_schedule/${m.id}`] = m;
                        db.ref(`badminton/players/${substitute.id}`).update({
                            match_count: (substitute.match_count || 0) + 1
                        });
                    }
                }
            }
        });

        if (Object.keys(scheduleUpdates).length > 0) {
            db.ref().update(scheduleUpdates);
        }
    }
};

function updateAbsenHariIniList() {
    const container = document.getElementById('container-absen-list');
    if (!container) return;
    let html = '';
    const sorted = Object.values(globalPlayers).sort((a,b)=> a.name.localeCompare(b.name));
    sorted.forEach(p => {
        html += `
            <label class="flex items-center justify-between bg-[#0B0F17] p-2.5 rounded-xl border ${p.is_active ? 'border-[#FF5722]/50 bg-[#FF5722]/5' : 'border-slate-800/40'} cursor-pointer select-none transition">
                <div class="flex items-center gap-2 truncate">
                    <input type="checkbox" ${p.is_active ? 'checked' : ''} onclick="toggleAbsenHariIni('${p.id}', ${p.is_active})" class="w-4 h-4 accent-[#FF5722]">
                    <span class="text-xs font-bold ${p.is_active ? 'text-[#FF5722]' : 'text-slate-500'} truncate">${p.name}</span>
                </div>
                <span class="text-[10px] text-slate-600 font-bold shrink-0 ml-1">(${p.match_count}x)</span>
            </label>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs col-span-2 text-center py-4">Please go to "Member Database" to add club members.</p>`;
}

// ==========================================
// TRUE RANDOM MATCH GENERATOR
// ==========================================
window.generate10Matches = function() {
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) {
        alert("At least 4 'Active' players required to generate double fixtures!");
        return;
    }

    let tempPlayers = JSON.parse(JSON.stringify(globalPlayers));
    let matchesObj = {};

    for (let i = 1; i <= 10; i++) {
        let pool = Object.values(tempPlayers).filter(p => p.is_active);
        pool.sort((a, b) => (a.match_count + Math.random() * 0.49) - (b.match_count + Math.random() * 0.49));

        let selected = pool.slice(0, 4);
        let p1 = selected[0], p2 = selected[1], p3 = selected[2], p4 = selected[3];

        let combos = [
            { tA: [p1, p2], tB: [p3, p4] },
            { tA: [p1, p3], tB: [p2, p4] },
            { tA: [p1, p4], tB: [p2, p3] }
        ];

        let bestCombo = combos[0];
        let minHistoryWeight = Infinity;

        combos.forEach(combo => {
            let weight = getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner') * 3 + getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner') * 3;
            if (weight < minHistoryWeight) { minHistoryWeight = weight; bestCombo = combo; }
        });

        tempPlayers[bestCombo.tA[0].id].match_count++;
        tempPlayers[bestCombo.tA[1].id].match_count++;
        tempPlayers[bestCombo.tB[0].id].match_count++;
        tempPlayers[bestCombo.tB[1].id].match_count++;

        matchesObj[`m_${i}`] = {
            id: `m_${i}`, gameNo: i,
            pA1: bestCombo.tA[0].name, idA1: bestCombo.tA[0].id,
            pA2: bestCombo.tA[1].name, idA2: bestCombo.tA[1].id,
            pB1: bestCombo.tB[0].name, idB1: bestCombo.tB[0].id,
            pB2: bestCombo.tB[1].name, idB2: bestCombo.tB[1].id,
            status: 'pending', winner: '', scoreA: 0, scoreB: 0
        };
    }
    db.ref('badminton/current_schedule').set(matchesObj);
};

function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) return globalHistory[key][tipe];
    return 0;
}

// ==========================================
// SUBMIT SCORE MATCH JADWAL HARIAN
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

function updateScheduleList() {
    const container = document.getElementById('container-schedule-list');
    if (!container) return;

    let html = '';
    const mList = Object.values(currentSchedule).sort((a,b)=> a.gameNo - b.gameNo);

    mList.forEach(m => {
        const isDone = m.status === 'done';
        const displayScoreA = m.scoreA || 0;
        const displayScoreB = m.scoreB || 0;

        html += `
            <div id="card-match-no-${m.gameNo}" class="bg-[#0B0F17] p-4 rounded-xl border ${isDone ? 'border-slate-900 opacity-60' : 'border-slate-800/80'} shadow-inner">
                <div class="flex justify-between items-center text-[10px] text-slate-500 font-bold mb-3 tracking-wider">
                    <span>MATCH #${m.gameNo}</span>
                    <span class="${isDone ? 'text-emerald-500':'text-[#FF5722]'} uppercase font-black">${m.status}</span>
                </div>
                
                <div class="flex items-center justify-between text-xs font-bold gap-2">
                    <div class="w-[41%] p-2 rounded-lg truncate ${isDone && m.winner === 'A' ? 'bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]' : 'bg-[#1E2638] text-slate-300'}">${m.pA1} & ${m.pA2}</div>
                    <div class="flex items-center justify-center gap-1 w-[18%]">
                        ${isDone ? `
                            <span class="text-sm font-black text-white bg-[#1E2638] px-2 py-0.5 rounded">${displayScoreA}</span>
                            <span class="text-slate-600">:</span>
                            <span class="text-sm font-black text-white bg-[#1E2638] px-2 py-0.5 rounded">${displayScoreB}</span>
                        ` : `
                            <input type="number" id="input-score-A-${m.id}" value="${displayScoreA}" class="w-8 bg-[#1E2638] border border-slate-800 rounded text-center text-xs py-1 text-[#FF5722] font-extrabold focus:outline-none">
                            <span class="text-slate-700">:</span>
                            <input type="number" id="input-score-B-${m.id}" value="${displayScoreB}" class="w-8 bg-[#1E2638] border border-slate-800 rounded text-center text-xs py-1 text-[#FF5722] font-extrabold focus:outline-none">
                        `}
                    </div>
                    <div class="w-[41%] p-2 rounded-lg truncate ${isDone && m.winner === 'B' ? 'bg-[#FF5722]/10 border border-[#FF5722]/30 text-[#FF5722]' : 'bg-[#1E2638] text-slate-300'}">${m.pB1} & ${m.pB2}</div>
                </div>

                ${!isDone ? `
                    <button onclick="submitSkorGame('${m.id}')" class="w-full mt-3 bg-[#1E2638] hover:bg-[#FF5722] hover:text-white text-slate-400 font-bold py-1.5 rounded-lg text-[10px] transition uppercase tracking-widest">💾 Save Score</button>
                ` : `
                    <button onclick="bukaEditSkorGame('${m.id}')" class="w-full mt-3 bg-[#0B0F17] hover:bg-slate-800 text-slate-500 font-bold py-1 rounded-lg text-[9px] transition uppercase tracking-widest">✏️ Edit Score</button>
                `}
            </div>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-6">Tap 'Generate 10 Random Matches' button.</p>`;

    if (mList.length > 0) {
        const firstPendingMatch = mList.find(m => m.status === 'pending');
        if (firstPendingMatch) {
            setTimeout(() => {
                const targetCard = document.getElementById(`card-match-no-${firstPendingMatch.gameNo}`);
                if (targetCard) targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
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
    const day = String(now.getDate()).padStart(2, '0');
    const isoDateStr = `${year}-${month}-${day}`;
    
    const displayDateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });

    let sessionStats = {};
    Object.keys(globalPlayers).forEach(id => { sessionStats[id] = { win: 0, lose: 0 }; });

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

        if (valA > valB) {
            if (m.idA1 && sessionStats[m.idA1]) sessionStats[m.idA1].win += 1;
            if (m.idA2 && sessionStats[m.idA2]) sessionStats[m.idA2].win += 1;
            if (m.idB1 && sessionStats[m.idB1]) sessionStats[m.idB1].lose += 1;
            if (m.idB2 && sessionStats[m.idB2]) sessionStats[m.idB2].lose += 1;
        } else if (valB > valA) {
            if (m.idB1 && sessionStats[m.idB1]) sessionStats[m.idB1].win += 1;
            if (m.idB2 && sessionStats[m.idB2]) sessionStats[m.idB2].win += 1;
            if (m.idA1 && sessionStats[m.idA1]) sessionStats[m.idA1].lose += 1;
            if (m.idA2 && sessionStats[m.idA2]) sessionStats[m.idA2].lose += 1;
        }
    });

    Object.keys(globalPlayers).forEach(id => {
        const currentWin = globalPlayers[id]?.win || 0;
        const currentLose = globalPlayers[id]?.lose || 0;
        updates[`badminton/players/${id}/win`] = currentWin + (sessionStats[id]?.win || 0);
        updates[`badminton/players/${id}/lose`] = currentLose + (sessionStats[id]?.lose || 0);
        updates[`badminton/players/${id}/match_count`] = 0;
    });

    updates['badminton/current_schedule'] = null;

    db.ref().update(updates).then(() => {
        alert("Session saved successfully!");
        switchTab('leaderboard');
    });
};

// ==========================================
// GENERATOR FILTER PERIODE BULAN & TAHUN
// ==========================================
function populateFilterDropdown() {
    const select = document.getElementById('filter-month-year');
    if (!select) return;

    const monthsMap = new Set();

    // 1. Ambil semua tanggal dari riwayat pertandingan yang ada
    Object.values(matchHistoryLogs).forEach(log => {
        if (log.isoDate) {
            monthsMap.add(log.isoDate.substring(0, 7)); // YYYY-MM
        }
    });

    // 2. Selalu generasikan 12 bulan terakhir secara otomatis agar dropdown tidak kosong
    const now = new Date();
    for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        monthsMap.add(`${yyyy}-${mm}`);
    }

    const sortedMonths = Array.from(monthsMap).sort().reverse();

    let optionsHtml = `<option value="ALL" ${selectedMonthFilter === 'ALL' ? 'selected' : ''}>All Time (Overall)</option>`;
    sortedMonths.forEach(ym => {
        const [year, month] = ym.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        optionsHtml += `<option value="${ym}" ${selectedMonthFilter === ym ? 'selected' : ''}>${monthName}</option>`;
    });

    select.innerHTML = optionsHtml;
}

window.changePeriodFilter = function(filterValue) {
    selectedMonthFilter = filterValue;
    updateLeaderboardList();
};

// ==========================================
// UPDATE LEADERBOARD & ALL MATCHES LOG
// ==========================================
function updateLeaderboardList() {
    const tbody = document.getElementById('container-leaderboard-body');
    const matchesContainer = document.getElementById('container-all-matches-list');
    if (!tbody || !matchesContainer) return;

    const allLogs = Object.values(matchHistoryLogs);
    const filteredLogs = allLogs.filter(log => {
        if (selectedMonthFilter === 'ALL') return true;
        return log.isoDate && log.isoDate.startsWith(selectedMonthFilter);
    });

    let playerStatsMap = {};
    Object.values(globalPlayers).forEach(p => {
        playerStatsMap[p.id] = { id: p.id, name: p.name, win: 0, lose: 0 };
    });

    if (selectedMonthFilter === 'ALL') {
        Object.values(globalPlayers).forEach(p => {
            playerStatsMap[p.id].win = p.win || 0;
            playerStatsMap[p.id].lose = p.lose || 0;
        });
    } else {
        filteredLogs.forEach(log => {
            const winTeam = log.winner;
            if (winTeam === 'A') {
                if (playerStatsMap[log.idA1]) playerStatsMap[log.idA1].win += 1;
                if (playerStatsMap[log.idA2]) playerStatsMap[log.idA2].win += 1;
                if (playerStatsMap[log.idB1]) playerStatsMap[log.idB1].lose += 1;
                if (playerStatsMap[log.idB2]) playerStatsMap[log.idB2].lose += 1;
            } else {
                if (playerStatsMap[log.idB1]) playerStatsMap[log.idB1].win += 1;
                if (playerStatsMap[log.idB2]) playerStatsMap[log.idB2].win += 1;
                if (playerStatsMap[log.idA1]) playerStatsMap[log.idA1].lose += 1;
                if (playerStatsMap[log.idA2]) playerStatsMap[log.idA2].lose += 1;
            }
        });
    }

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
                <td class="py-3 px-2 text-center text-slate-500">${idx + 1}</td>
                <td class="py-3 px-2 text-white">
                    <span onclick="openHistoryModal('${p.id}', '${p.name}')" class="text-slate-200 hover:text-[#FF5722] cursor-pointer underline decoration-dashed decoration-[#FF5722]/40 transition duration-150 font-bold">
                        ${p.name}
                    </span>
                </td>
                <td class="py-3 px-2 text-center text-[#FF5722]">${p.win}</td>
                <td class="py-3 px-2 text-center text-slate-400">${p.lose}</td>
                <td class="py-3 px-2 text-center text-[#FF5722] font-extrabold">${p.rate}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = lbHtml || `<tr><td colspan="5" class="text-center text-slate-600 py-6">No historical score metrics available for this period.</td></tr>`;

    document.getElementById('total-matches-count').innerText = `${filteredLogs.length} Matches`;
    
    let matchesHtml = '';
    filteredLogs.slice().reverse().forEach(log => {
        matchesHtml += `
            <div class="bg-[#0B0F17] p-3 rounded-xl border border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <div class="w-[40%] truncate ${log.winner === 'A' ? 'text-[#FF5722] font-black' : 'text-slate-400'}">
                    ${log.pA1} & ${log.pA2}
                </div>
                <div class="w-[20%] text-center shrink-0">
                    <span class="bg-[#1E2638] px-2 py-0.5 rounded text-white font-black text-xs border border-slate-800">${log.scoreA} - ${log.scoreB}</span>
                    <div class="text-[9px] text-slate-600 mt-0.5">${log.date}</div>
                </div>
                <div class="w-[40%] text-right truncate ${log.winner === 'B' ? 'text-[#FF5722] font-black' : 'text-slate-400'}">
                    ${log.pB1} & ${log.pB2}
                </div>
            </div>
        `;
    });

    matchesContainer.innerHTML = matchesHtml || `<p class="text-slate-600 text-xs text-center py-6">No matches recorded for this period.</p>`;
}

// ==========================================
// MODAL POPUP OPERATIONAL (SISTEM KLIK)
// ==========================================
window.openHistoryModal = function(playerId, playerName) {
    const modal = document.getElementById('modal-history');
    const title = document.getElementById('modal-player-name');
    const content = document.getElementById('modal-history-content');
    
    if (!modal || !title || !content) return;

    title.innerText = playerName;

    const logsArray = Object.values(matchHistoryLogs).filter(log => {
        const isPlayerInMatch = (log.idA1 === playerId || log.idA2 === playerId || log.idB1 === playerId || log.idB2 === playerId);
        if (selectedMonthFilter === 'ALL') return isPlayerInMatch;
        return isPlayerInMatch && log.isoDate && log.isoDate.startsWith(selectedMonthFilter);
    });

    let modalRowsHtml = '';
    logsArray.slice(-8).reverse().forEach(log => {
        const isTeamA = (log.idA1 === playerId || log.idA2 === playerId);
        const isWinner = (isTeamA && log.winner === 'A') || (!isTeamA && log.winner === 'B');
        
        const partnerName = isTeamA ? (log.idA1 === playerId ? log.pA2 : log.pA1) : (log.idB1 === playerId ? log.pB2 : log.pB1);
        const opponentString = isTeamA ? `${log.pB1} / ${log.pB2}` : `${log.pA1} / ${log.pA2}`;
        const finalScoreStr = `${log.scoreA} - ${log.scoreB}`;

        modalRowsHtml += `
            <div class="flex justify-between items-center text-[11px] py-2 border-b border-slate-800/80 gap-3">
                <span class="font-black px-1.5 py-0.5 rounded text-[10px] ${isWinner ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' : 'bg-red-950/50 text-red-400 border border-red-900/30'} shrink-0">
                    ${isWinner ? 'WIN' : 'LOSE'}
                </span>
                <div class="text-slate-400 truncate max-w-[180px] flex-1">
                    <span class="text-slate-500">w/</span> ${partnerName} <span class="text-slate-600">vs</span> ${opponentString}
                </div>
                <span class="text-white font-black shrink-0 bg-[#0B0F17] px-2 py-0.5 rounded border border-slate-800">${finalScoreStr}</span>
                <span class="text-slate-600 shrink-0 text-[10px]">${log.date}</span>
            </div>
        `;
    });

    content.innerHTML = modalRowsHtml || `<div class="text-xs text-slate-500 italic text-center py-6">No historical matches registered for this member in selected period.</div>`;
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
