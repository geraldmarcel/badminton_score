// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBupNaZK23M3ErtojxwYRdnKPrwjou1ERc",
  authDomain: "badminton-5cef1.firebaseapp.com",
  databaseURL: "https://badminton-5cef1-default-rtdb.firebaseio.com",
  projectId: "badminton-5cef1",
  storageBucket: "badminton-5cef1.firebasestorage.app",
  messagingSenderId: "857732838646",
  appId: "1:857732838646:web:dd037447f2820cab1828d7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const appContent = document.getElementById('app-content');

// Global Application State
let globalPlayers = {};
let globalHistory = {};
let currentSchedule = {};
let matchHistoryLogs = {}; // Menyimpan riwayat log pertandingan global
let currentActiveTab = 'matchmaking';
let isLayoutRendered = false;

// Global Tab Switcher Function
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
            tabs[key].className = "flex-1 text-center py-2 text-sm font-bold rounded-lg bg-[#FF5722] text-white transition duration-200 shadow-md shadow-[#FF5722]/10";
        } else {
            tabs[key].className = "flex-1 text-center py-2 text-sm font-bold rounded-lg text-slate-400 hover:text-white transition duration-200";
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
            <div class="bg-[#1E2638] p-5 rounded-2xl border border-slate-800/50 shadow-xl">
                <h2 class="text-xs font-bold uppercase text-[#FF5722] tracking-widest mb-4">🏆 Club Performance Leaderboard</h2>
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
        `;
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

// Listener baru untuk mengambil Log Riwayat Pertandingan mendalam
db.ref('badminton/match_history').on('value', (snapshot) => {
    matchHistoryLogs = snapshot.val() || {};
    if (currentActiveTab === 'leaderboard') updateLeaderboardList();
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
// SUBMIT SCORE (DENGAN INJEKSI LOG MATCH HISTORY)
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
    const hariIni = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' });
    let updates = {};
    
    updates[`badminton/current_schedule/${matchId}/status`] = 'done';
    updates[`badminton/current_schedule/${matchId}/winner`] = timPemenang;
    updates[`badminton/current_schedule/${matchId}/scoreA`] = valA;
    updates[`badminton/current_schedule/${matchId}/scoreB`] = valB;

    if (match.status === 'pending') {
        // Skema Tambah match_count pemain harian
        [match.idA1, match.idA2, match.idB1, match.idB2].forEach(pId => {
            if (pId && globalPlayers[pId]) {
                updates[`badminton/players/${pId}/match_count`] = (globalPlayers[pId].match_count || 0) + 1;
            }
        });

        // Simpan partner history
        if (match.idA1 && match.idA2) {
            const keyA = match.idA1 < match.idA2 ? `${match.idA1}_${match.idA2}` : `${match.idA2}_${match.idA1}`;
            updates[`badminton/history/${keyA}/partner`] = (globalHistory[keyA]?.partner || 0) + 1;
        }
        if (match.idB1 && match.idB2) {
            const keyB = match.idB1 < match.idB2 ? `${match.idB1}_${match.idB2}` : `${match.idB2}_${match.idB1}`;
            updates[`badminton/history/${keyB}/partner`] = (globalHistory[keyB]?.partner || 0) + 1;
        }

        // --- INJEKSI DATA DETAIL LOG RIWAYAT BARU ---
        const logId = 'log_' + Date.now() + '_' + matchId;
        updates[`badminton/match_history/${logId}`] = {
            date: hariIni,
            pA1: match.pA1, idA1: match.idA1,
            pA2: match.pA2, idA2: match.idA2,
            pB1: match.pB1, idB1: match.idB1,
            pB2: match.pB2, idB2: match.idB2,
            scoreA: valA, scoreB: valB, winner: timPemenang
        };
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
// SESSION END & STATS UPDATE ARCHIVE
// ==========================================
window.simpanSesiHarian = function() {
    if (!confirm("End today's session? All saved match points will be officially injected into the Leaderboard!")) return;

    let updates = {};
    const matches = Object.values(currentSchedule);

    matches.forEach(m => {
        if (m.status !== 'done') return; 
        if (m.scoreA > m.scoreB) {
            updates[`badminton/players/${m.idA1}/win`] = (globalPlayers[m.idA1]?.win || 0) + 1;
            updates[`badminton/players/${m.idA2}/win`] = (globalPlayers[m.idA2]?.win || 0) + 1;
            updates[`badminton/players/${m.idB1}/lose`] = (globalPlayers[m.idB1]?.lose || 0) + 1;
            updates[`badminton/players/${m.idB2}/lose`] = (globalPlayers[m.idB2]?.lose || 0) + 1;
        } else if (m.scoreB > m.scoreA) {
            updates[`badminton/players/${m.idB1}/win`] = (globalPlayers[m.idB1]?.win || 0) + 1;
            updates[`badminton/players/${m.idB2}/win`] = (globalPlayers[m.idB2]?.win || 0) + 1;
            updates[`badminton/players/${m.idA1}/lose`] = (globalPlayers[m.idA1]?.lose || 0) + 1;
            updates[`badminton/players/${m.idA2}/lose`] = (globalPlayers[m.idA2]?.lose || 0) + 1;
        }
    });

    Object.keys(globalPlayers).forEach(id => { updates[`badminton/players/${id}/match_count`] = 0; });
    updates['badminton/current_schedule'] = null;

    db.ref().update(updates).then(() => {
        alert("Session saved successfully!");
        switchTab('leaderboard');
    });
};

// ==========================================
// TAB: LEADERBOARD VIEW WITH INTERACTIVE HOVER TOOLTIP LOGS
// ==========================================
function updateLeaderboardList() {
    const tbody = document.getElementById('container-leaderboard-body');
    if (!tbody) return;

    let html = '';
    const playersList = Object.values(globalPlayers).map(p => {
        const total = (p.win || 0) + (p.lose || 0);
        const rate = total > 0 ? Math.round((p.win / total) * 100) : 0;
        return { ...p, total, rate };
    });

    playersList.sort((a,b) => b.rate - a.rate || b.win - a.win || a.name.localeCompare(b.name));

    playersList.forEach((p, idx) => {
        // Generate Log List Khusus Pemain ini saat di-hover
        let tooltipRowsHtml = '';
        const logsArray = Object.values(matchHistoryLogs).filter(log => 
            log.idA1 === p.id || log.idA2 === p.id || log.idB1 === p.id || log.idB2 === p.id
        );

        // Ambil maksimal 5 riwayat pertandingan terakhir agar pop-up tooltip tidak kepanjangan
        logsArray.slice(-5).reverse().forEach(log => {
            const isTeamA = (log.idA1 === p.id || log.idA2 === p.id);
            const isWinner = (isTeamA && log.winner === 'A') || (!isTeamA && log.winner === 'B');
            
            const partnerName = isTeamA ? (log.idA1 === p.id ? log.pA2 : log.pA1) : (log.idB1 === p.id ? log.pB2 : log.pB1);
            const opponentString = isTeamA ? `${log.pB1}/${log.pB2}` : `${log.pA1}/${log.pA2}`;
            const finalScoreStr = `${log.scoreA}-${log.scoreB}`;

            tooltipRowsHtml += `
                <div class="flex justify-between items-center text-[10px] py-1 border-b border-slate-800/60 gap-4">
                    <span class="font-bold ${isWinner ? 'text-emerald-500' : 'text-red-400'} uppercase shrink-0">${isWinner ? 'WIN' : 'LOSE'}</span>
                    <span class="text-slate-400 truncate max-w-[120px]">w/ ${partnerName} vs ${opponentString}</span>
                    <span class="text-white font-extrabold shrink-0 ml-auto bg-[#0B0F17] px-1 rounded">${finalScoreStr}</span>
                    <span class="text-slate-600 shrink-0 text-[9px]">${log.date}</span>
                </div>
            `;
        });

        if (!tooltipRowsHtml) {
            tooltipRowsHtml = `<div class="text-[10px] text-slate-500 italic text-center py-2">No history logged yet</div>`;
        }

        html += `
            <tr class="bg-[#1E2638]/40 border-b border-slate-900/60 font-semibold text-xs">
                <td class="py-3 px-2 text-center text-slate-500">${idx + 1}</td>
                
                <!-- KOLOM NAMA DENGAN HOVER TOOLTIP EFFECT -->
                <td class="py-3 px-2 text-white relative group cursor-pointer">
                    <span class="hover:text-[#FF5722] underline decoration-dotted decoration-slate-700 transition duration-150">${p.name}</span>
                    
                    <!-- BOX POPUP OVERLAY (TOOLTIP CONTAINER) -->
                    <div class="absolute left-4 top-8 hidden group-hover:block bg-[#111827] border border-slate-800 p-3 rounded-xl shadow-2xl z-50 w-72 pointer-events-none">
                        <p class="text-[10px] uppercase font-black tracking-widest text-[#FF5722] mb-1.5">📋 Recent Matches History Log</p>
                        <div class="space-y-0.5">
                            ${tooltipRowsHtml}
                        </div>
                    </div>
                </td>
                
                <td class="py-3 px-2 text-center text-[#FF5722]">${p.win || 0}</td>
                <td class="py-3 px-2 text-center text-slate-400">${p.lose || 0}</td>
                <td class="py-3 px-2 text-center text-[#FF5722] font-extrabold">${p.rate}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || `<tr><td colspan="5" class="text-center text-slate-600 py-6">No historical score metrics available yet.</td></tr>`;
}

window.resetSemuaJumlahMain = function() {
    if (!confirm("Force reset everyone's daily match count back to 0?")) return;
    const updates = {};
    Object.keys(globalPlayers).forEach(id => { updates[`badminton/players/${id}/match_count`] = 0; });
    db.ref().update(updates);
};
