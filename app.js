// Konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyBupNaZK23M3ErtojxwYRdnKPrwjou1ERc",
  authDomain: "badminton-5cef1.firebaseapp.com",
  databaseURL: "https://badminton-5cef1-default-rtdb.firebaseio.com",
  projectId: "badminton-5cef1",
  storageBucket: "badminton-5cef1.firebasestorage.app",
  messagingSenderId: "857732838646",
  appId: "1:857732838646:web:dd037447f2820cab1828d7"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const appContent = document.getElementById('app-content');

// State Global Aplikasi
let globalPlayers = {};
let globalHistory = {};
let currentSchedule = {};
let currentActiveTab = 'matchmaking';

// Navigasi Tab Global Function Fix
window.switchTab = function(tabName) {
    currentActiveTab = tabName;
    const tabs = {
        matchmaking: document.getElementById('btn-tab-matchmaking'),
        leaderboard: document.getElementById('btn-tab-leaderboard'),
        database: document.getElementById('btn-tab-database')
    };

    Object.keys(tabs).forEach(key => {
        if (!tabs[key]) return;
        if (key === tabName) {
            tabs[key].className = "flex-1 text-center py-2 text-sm font-bold rounded-lg bg-lime-500 text-slate-950 transition";
        } else {
            tabs[key].className = "flex-1 text-center py-2 text-sm font-bold rounded-lg text-slate-400 hover:text-white transition";
        }
    });
    renderCurrentTabUI();
};

// ==========================================
// PENGENDALI RENDER LAYAR UTAMA
// ==========================================
function renderCurrentTabUI() {
    if (currentActiveTab === 'database') {
        appContent.innerHTML = `
            <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
                <h2 class="text-sm font-bold uppercase text-lime-400 tracking-wider">Daftarkan Anggota Baru Club</h2>
                <div class="flex gap-2">
                    <input type="text" id="input-nama" placeholder="Ketik nama lengkap..." class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-lime-500 text-sm">
                    <button onclick="aksiTambahPemain()" class="bg-lime-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm">Daftar</button>
                </div>
            </div>
            <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <h2 class="text-sm font-bold uppercase text-slate-400 tracking-wider mb-3">Total Anggota Terdaftar (<span id="total-db">0</span>)</h2>
                <div id="container-db-list" class="space-y-2 max-h-96 overflow-y-auto"></div>
            </div>
        `;
        updateDatabasePemainList();

    } else if (currentActiveTab === 'leaderboard') {
        appContent.innerHTML = `
            <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <h2 class="text-sm font-bold uppercase text-lime-400 tracking-wider mb-3">🏆 Papan Klasemen Performa</h2>
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm text-slate-300">
                        <thead class="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                            <tr>
                                <th class="py-3 px-2 text-center">Rank</th>
                                <th class="py-3 px-2">Nama</th>
                                <th class="py-3 px-2 text-center">Win</th>
                                <th class="py-3 px-2 text-center">Lose</th>
                                <th class="py-3 px-2 text-center text-lime-400">Win Rate</th>
                            </tr>
                        </thead>
                        <tbody id="container-leaderboard-body"></tbody>
                    </table>
                </div>
            </div>
        `;
        updateLeaderboardList();

    } else {
        appContent.innerHTML = `
            <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800">
                <h2 class="text-sm font-bold uppercase text-lime-400 tracking-wider mb-1">Siapa Saja Yang Hadir Hari Ini?</h2>
                <p class="text-[11px] text-slate-500 mb-3">Centang pemain yang datang ke lapangan sebelum generate match.</p>
                <div id="container-absen-list" class="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1"></div>
            </div>

            <div class="flex gap-2">
                <button onclick="generate10Matches()" class="flex-1 bg-gradient-to-r from-lime-500 to-green-500 text-slate-950 font-black text-sm py-3 px-4 rounded-xl shadow-lg transition active:scale-95">
                    🎲 GENERATE 10 MATCHES
                </button>
                <button onclick="simpanSesiHarian()" class="bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl hover:bg-blue-500 transition">
                    💾 Selesai & Simpan Hari Ini
                </button>
            </div>

            <div class="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-4">
                <h2 class="text-sm font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2">📋 Jadwal Pertandingan Sesi Ini</h2>
                <div id="container-schedule-list" class="space-y-4 max-h-[500px] overflow-y-auto pr-1"></div>
            </div>
        `;
        updateAbsenHariIniList();
        updateScheduleList();
    }
}

// ==========================================
// DATABASE OPERATIONS & SYNC LISTENERS
// ==========================================
db.ref('badminton/players').on('value', (snapshot) => {
    globalPlayers = snapshot.val() || {};
    if (appContent.querySelector('.animate-spin') || !document.getElementById('btn-tab-matchmaking')) {
        renderCurrentTabUI();
    } else {
        refreshActiveListOnly();
    }
});

db.ref('badminton/history').on('value', (snapshot) => { globalHistory = snapshot.val() || {}; });
db.ref('badminton/current_schedule').on('value', (snapshot) => {
    currentSchedule = snapshot.val() || {};
    if (currentActiveTab === 'matchmaking') updateScheduleList();
});

function refreshActiveListOnly() {
    if (currentActiveTab === 'database') updateDatabasePemainList();
    if (currentActiveTab === 'leaderboard') updateLeaderboardList();
    if (currentActiveTab === 'matchmaking') { updateAbsenHariIniList(); updateScheduleList(); }
}

// ==========================================
// LOGIKA TAB DATA PEMAIN (TAB 3)
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
    if (confirm("Hapus pemain dari database club secara permanen?")) {
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
            <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                <span class="text-sm font-semibold">${p.name}</span>
                <button onclick="hapusPemainClub('${p.id}')" class="text-xs bg-red-950 text-red-400 px-3 py-1 rounded-lg font-bold hover:bg-red-900 transition">Hapus</button>
            </div>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-4">Belum ada pemain terdaftar.</p>`;
    document.getElementById('total-db').innerText = sorted.length;
}

// ==========================================
// LOGIKA TAB MATCHMAKING & ABSENSI (TAB 1)
// ==========================================
window.toggleAbsenHariIni = function(id, status) {
    db.ref(`badminton/players/${id}`).update({ is_active: !status });
};

function updateAbsenHariIniList() {
    const container = document.getElementById('container-absen-list');
    if (!container) return;
    let html = '';
    const sorted = Object.values(globalPlayers).sort((a,b)=> a.name.localeCompare(b.name));
    sorted.forEach(p => {
        html += `
            <label class="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border ${p.is_active ? 'border-lime-500/40 bg-lime-950/10' : 'border-slate-900'} cursor-pointer select-none">
                <input type="checkbox" ${p.is_active ? 'checked' : ''} onclick="toggleAbsenHariIni('${p.id}', ${p.is_active})" class="w-4 h-4 accent-lime-500">
                <span class="text-xs font-bold ${p.is_active ? 'text-lime-400' : 'text-slate-500'} truncate">${p.name} <span class="text-[10px] text-slate-600">(${p.match_count}x)</span></span>
            </label>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs col-span-2 text-center py-4">Silakan isi tab "Data Pemain" terlebih dahulu.</p>`;
}

// ==========================================
// ALGORITMA MATCHMAKING GENERATE 10 GAME
// ==========================================
window.generate10Matches = function() {
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) {
        alert("Pemain yang dicentang Hadir minimal harus 4 orang untuk sistem ganda!");
        return;
    }

    // Klon data jumlah bermain lokal untuk simulasi pembagian adil 10 game ke depan
    let tempPlayers = JSON.parse(JSON.stringify(globalPlayers));
    let matchesObj = {};

    for (let i = 1; i <= 10; i++) {
        let sorted = Object.values(tempPlayers)
            .filter(p => p.is_active)
            .sort((a, b) => a.match_count - b.match_count);

        let c = sorted.slice(0, 4);
        let p1 = c[0], p2 = c[1], p3 = c[2], p4 = c[3];

        let combos = [
            { tA: [p1, p2], tB: [p3, p4] },
            { tA: [p1, p3], tB: [p2, p4] },
            { tA: [p1, p4], tB: [p2, p3] }
        ];

        let bestCombo = combos[0];
        let minScore = Infinity;

        combos.forEach(combo => {
            let score = 0;
            score += getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner');
            score += getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner');
            if (score < minScore) { minScore = score; bestCombo = combo; }
        });

        // Update counter lokal simulasi
        tempPlayers[bestCombo.tA[0].id].match_count++;
        tempPlayers[bestCombo.tA[1].id].match_count++;
        tempPlayers[bestCombo.tB[0].id].match_count++;
        tempPlayers[bestCombo.tB[1].id].match_count++;

        matchesObj[`m_${i}`] = {
            id: `m_${i}`,
            gameNo: i,
            pA1: bestCombo.tA[0].name, idA1: bestCombo.tA[0].id,
            pA2: bestCombo.tA[1].name, idA2: bestCombo.tA[1].id,
            pB1: bestCombo.tB[0].name, idB1: bestCombo.tB[0].id,
            pB2: bestCombo.tB[1].name, idB2: bestCombo.tB[1].id,
            status: 'pending', winner: ''
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
// RENDER & SUBMIT SKOR PER GAME
// ==========================================
window.submitSkorGame = function(matchId, timPemenang) {
    const match = currentSchedule[matchId];
    if (!match) return;

    let updates = {};
    updates[`badminton/current_schedule/${matchId}/status`] = 'done';
    updates[`badminton/current_schedule/${matchId}/winner`] = timPemenang;

    // Menghitung penambahan jumlah main real-time harian
    const playersInGame = [match.idA1, match.idA2, match.idB1, match.idB2];
    playersInGame.forEach(id => {
        if (globalPlayers[id]) updates[`badminton/players/${id}/match_count`] = globalPlayers[id].match_count + 1;
    });

    // Pasang update Counter Partner Sejarah Internal
    const keyA = match.idA1 < match.idA2 ? `${match.idA1}_${match.idA2}` : `${match.idA2}_${match.idA1}`;
    const keyB = match.idB1 < match.idB2 ? `${match.idB1}_${match.idB2}` : `${match.idB2}_${match.idB1}`;
    updates[`badminton/history/${keyA}/partner`] = (globalHistory[keyA]?.partner || 0) + 1;
    updates[`badminton/history/${keyB}/partner`] = (globalHistory[keyB]?.partner || 0) + 1;

    db.ref().update(updates);
};

function updateScheduleList() {
    const container = document.getElementById('container-schedule-list');
    if (!container) return;

    let html = '';
    const mList = Object.values(currentSchedule).sort((a,b)=> a.gameNo - b.gameNo);

    mList.forEach(m => {
        const isDone = m.status === 'done';
        html += `
            <div class="bg-slate-950 p-3 rounded-xl border ${isDone ? 'border-slate-900 opacity-60' : 'border-slate-800'}">
                <div class="flex justify-between items-center text-[11px] text-slate-500 font-bold mb-2">
                    <span>GAME #${m.gameNo}</span>
                    <span class="${isDone ? 'text-lime-500':'text-amber-500'} uppercase">${m.status}</span>
                </div>
                <div class="flex items-center justify-between text-xs font-bold gap-1 text-center">
                    <div class="w-2/5 p-2 rounded-lg ${m.winner === 'A' ? 'bg-blue-900/40 border border-blue-500 text-blue-400':'bg-slate-900 border border-transparent'}">${m.pA1} & ${m.pA2}</div>
                    <div class="text-slate-700 font-black text-[10px]">VS</div>
                    <div class="w-2/5 p-2 rounded-lg ${m.winner === 'B' ? 'bg-orange-900/40 border border-orange-500 text-orange-400':'bg-slate-900 border border-transparent'}">${m.pB1} & ${m.pB2}</div>
                </div>
                ${!isDone ? `
                    <div class="flex gap-2 mt-3 pt-2 border-t border-slate-900">
                        <button onclick="submitSkorGame('${m.id}', 'A')" class="flex-1 bg-blue-600/20 text-blue-400 py-1 text-[11px] font-bold rounded-lg border border-blue-500/20 hover:bg-blue-600 hover:text-white transition">Tim A Menang</button>
                        <button onclick="submitSkorGame('${m.id}', 'B')" class="flex-1 bg-orange-600/20 text-orange-400 py-1 text-[11px] font-bold rounded-lg border border-orange-500/20 hover:bg-orange-600 hover:text-white transition">Tim B Menang</button>
                    </div>
                ` : ''}
            </div>
        `;
    });
    container.innerHTML = html || `<p class="text-slate-600 text-xs text-center py-6">Klik tombol 'Generate 10 Matches' untuk menyusun bagan jadwal mabar.</p>`;
}

// ==========================================
// SAVE SESI HARIAN & UPDATE DASHBOARD POIN
// ==========================================
window.simpanSesiHarian = function() {
    if (!confirm("Apakah mabar sesi hari ini sudah selesai seluruhnya? Poin kemenangan akan diakumulasikan secara permanen ke dashboard klasemen.")) return;

    let updates = {};
    const matches = Object.values(currentSchedule);

    matches.forEach(m => {
        if (m.status !== 'done') return; // Lewati game yang belum selesai diisi skornya
        if (m.winner === 'A') {
            updates[`badminton/players/${m.idA1}/win`] = (globalPlayers[m.idA1]?.win || 0) + 1;
            updates[`badminton/players/${m.idA2}/win`] = (globalPlayers[m.idA2]?.win || 0) + 1;
            updates[`badminton/players/${m.idB1}/lose`] = (globalPlayers[m.idB1]?.lose || 0) + 1;
            updates[`badminton/players/${m.idB2}/lose`] = (globalPlayers[m.idB2]?.lose || 0) + 1;
        } else if (m.winner === 'B') {
            updates[`badminton/players/${m.idB1}/win`] = (globalPlayers[m.idB1]?.win || 0) + 1;
            updates[`badminton/players/${m.idB2}/win`] = (globalPlayers[m.idB2]?.win || 0) + 1;
            updates[`badminton/players/${m.idA1}/lose`] = (globalPlayers[m.idA1]?.lose || 0) + 1;
            updates[`badminton/players/${m.idA2}/lose`] = (globalPlayers[m.idA2]?.lose || 0) + 1;
        }
    });

    // Reset jumlah main harian ke 0 untuk persiapan minggu depan
    Object.keys(globalPlayers).forEach(id => {
        updates[`badminton/players/${id}/match_count`] = 0;
    });

    // Bersihkan bagan jadwal jadwal
    updates['badminton/current_schedule'] = null;

    db.ref().update(updates).then(() => {
        alert("Sesi mabar hari ini resmi disimpan! Silakan cek Tab Klasemen Poin.");
        switchTab('leaderboard');
    });
};

// ==========================================
// LOGIKA TAB LEADERBOARD KLASEMEN (TAB 2)
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

    // Sort Urutan Klasemen: Win Rate Tertinggi -> Win Terbanyak -> Nama
    playersList.sort((a,b) => b.rate - a.rate || b.win - a.win || a.name.localeCompare(b.name));

    playersList.forEach((p, idx) => {
        html += `
            <tr class="bg-slate-900/40 border-b border-slate-900/60 font-semibold text-xs">
                <td class="py-3 px-2 text-center text-slate-500">${idx + 1}</td>
                <td class="py-3 px-2 text-white">${p.name}</td>
                <td class="py-3 px-2 text-center text-blue-400">${p.win || 0}</td>
                <td class="py-3 px-2 text-center text-orange-400">${p.lose || 0}</td>
                <td class="py-3 px-2 text-center text-lime-400 font-extrabold">${p.rate}%</td>
            </tr>
        `;
    });

    tbody.innerHTML = html || `<tr><td colspan="5" class="text-center text-slate-600 py-6">Belum ada riwayat poin bermain.</td></tr>`;
}
