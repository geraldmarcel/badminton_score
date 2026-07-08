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

const appContainer = document.getElementById('app');

// State Global Aplikasi
let globalPlayers = {};
let globalHistory = {};
let currentActiveTab = 'matchmaking'; // 'matchmaking' atau 'database'

// Setup Navigasi Tab
document.getElementById('tab-matchmaking').addEventListener('click', () => switchTab('matchmaking'));
document.getElementById('tab-database').addEventListener('click', () => switchTab('database'));

function switchTab(tabName) {
    currentActiveTab = tabName;
    const btnMatch = document.getElementById('tab-matchmaking');
    const btnData = document.getElementById('tab-database');

    if (tabName === 'matchmaking') {
        btnMatch.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg bg-lime-500 text-slate-950 transition";
        btnData.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg text-slate-400 hover:text-white transition";
    } else {
        btnData.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg bg-lime-500 text-slate-950 transition";
        btnMatch.className = "flex-1 text-center py-2 text-sm font-bold rounded-lg text-slate-400 hover:text-white transition";
    }
    renderUI();
}

// ==========================================
// RENDER UI BERDASARKAN TAB YANG AKTIF
// ==========================================
function renderUI() {
    if (currentActiveTab === 'database') {
        // TAMPILAN HALAMAN INPUT MASTER DATA PEMAIN
        appContainer.innerHTML = `
            <div class="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800 space-y-4">
                <div>
                    <h2 class="text-sm font-bold uppercase tracking-wider text-lime-400">Daftarkan Anggota Baru</h2>
                    <p class="text-xs text-slate-500">Nama yang diinput di sini akan tersimpan permanen di database club.</p>
                </div>
                <div class="flex gap-2">
                    <input type="text" id="input-nama" placeholder="Ketik nama anggota..." 
                        class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-lime-500 text-sm">
                    <button id="btn-tambah" class="bg-lime-500 text-slate-950 font-bold px-4 py-2 rounded-xl hover:bg-lime-400 transition text-sm">Daftar</button>
                </div>
            </div>

            <div class="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800">
                <h2 class="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3">Total Anggota Terdaftar (<span id="total-database">0</span>)</h2>
                <div id="list-database-pemain" class="space-y-2 max-h-96 overflow-y-auto pr-1"></div>
            </div>
        `;
        document.getElementById('btn-tambah').addEventListener('click', aksiTambahPemain);
        updateDatabasePemainUI();

    } else {
        // TAMPILAN HALAMAN UTAMA MATCHMAKING
        appContainer.innerHTML = `
            <div class="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800">
                <div class="flex justify-between items-center mb-3">
                    <div>
                        <h2 class="text-sm font-bold uppercase tracking-wider text-lime-400">Pemain Di Lapangan Hari Ini</h2>
                        <p class="text-[11px] text-slate-500">Centang "Hadir" untuk mabar. Matikan jika pulang/istirahat.</p>
                    </div>
                    <button id="btn-reset-match-count" class="text-[10px] bg-red-950 text-red-400 px-2 py-1 rounded border border-red-900/30 font-bold hover:bg-red-900 transition">Reset Main</button>
                </div>
                <div id="list-mabar-hari-ini" class="space-y-2 max-h-60 overflow-y-auto pr-1"></div>
            </div>

            <button id="btn-kocok" class="bg-gradient-to-r from-lime-500 to-green-500 text-slate-950 font-black text-base py-4 px-6 rounded-2xl w-full shadow-lg hover:brightness-110 transition active:scale-[0.98]">
                🔥 KOCK MATCH SEKARANG
            </button>

            <div id="hasil-match" class="hidden bg-slate-900 p-5 rounded-2xl shadow-xl border-2 border-lime-500/30 text-center">
                <h3 class="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Pertandingan Berikutnya</h3>
                <div class="flex items-center justify-between text-base font-extrabold px-2 gap-2">
                    <div class="text-blue-400 w-2/5 break-words bg-blue-950/20 p-2 rounded-xl border border-blue-900/20" id="tim-a"></div>
                    <div class="text-slate-600 text-xs font-black w-1/5">VS</div>
                    <div class="text-orange-400 w-2/5 break-words bg-orange-950/20 p-2 rounded-xl border border-orange-900/20" id="tim-b"></div>
                </div>
                <div class="mt-5 pt-4 border-t border-slate-800/60 flex gap-2">
                    <button id="btn-selesai-a" class="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-500 transition">Tim A Menang</button>
                    <button id="btn-selesai-b" class="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-orange-500 transition">Tim B Menang</button>
                </div>
            </div>
        `;
        document.getElementById('btn-kocok').addEventListener('click', jalankanMatchmaking);
        document.getElementById('btn-reset-match-count').addEventListener('click', resetSemuaJumlahMain);
        updateMabarHariIniUI();
    }
}

// ==========================================
// REALTIME FIREBASE LISTENERS
// ==========================================
db.ref('badminton/players').on('value', (snapshot) => {
    globalPlayers = snapshot.val() || {};
    // Trigger render pertama kali jika aplikasi baru dibuka
    if (appContainer.querySelector('.animate-spin')) {
        renderUI();
    } else {
        // Update konten list secara real-time tanpa merusak input focus luar
        if (currentActiveTab === 'database') updateDatabasePemainUI();
        if (currentActiveTab === 'matchmaking') updateMabarHariIniUI();
    }
});

db.ref('badminton/history').on('value', (snapshot) => {
    globalHistory = snapshot.val() || {};
});

// Register global windows function untuk tombol-tombol dinamis
window.toggleKehadiranMabar = function(id, currentStatus) {
    db.ref(`badminton/players/${id}`).update({ is_active: !currentStatus });
};

window.hapusPemainPermanen = function(id, nama) {
    if (confirm(`Hapus ${nama} secara permanen dari keanggotaan club?`)) {
        db.ref(`badminton/players/${id}`).remove();
    }
};

// ==========================================
// LOGIKA STATE & UI DATA CONTROLLER
// ==========================================
function aksiTambahPemain() {
    const nameInput = document.getElementById('input-nama');
    const name = nameInput.value.trim();
    if (!name) return;

    const playerId = 'p_' + Date.now();
    db.ref(`badminton/players/${playerId}`).set({
        id: playerId,
        name: name,
        match_count: 0,
        is_active: false // Standarnya tidak langsung main sebelum dicentang di halaman depan
    });
    nameInput.value = '';
}

function updateDatabasePemainUI() {
    const listContainer = document.getElementById('list-database-pemain');
    if (!listContainer) return;

    let html = '';
    const sortedPlayers = Object.values(globalPlayers).sort((a, b) => a.name.localeCompare(b.name));

    sortedPlayers.forEach(p => {
        html += `
            <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                <span class="text-slate-200 font-semibold text-sm">${p.name}</span>
                <button onclick="hapusPemainPermanen('${p.id}', '${p.name}')" class="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-red-950 text-red-400 hover:bg-red-900 transition">
                    Hapus
                </button>
            </div>
        `;
    });
    listContainer.innerHTML = html || `<p class="text-slate-600 text-center text-xs py-6 font-medium">Belum ada nama terdaftar.</p>`;
    document.getElementById('total-database').innerText = sortedPlayers.length;
}

function updateMabarHariIniUI() {
    const listContainer = document.getElementById('list-mabar-hari-ini');
    if (!listContainer) return;

    let html = '';
    const sortedPlayers = Object.values(globalPlayers).sort((a, b) => a.name.localeCompare(b.name));

    sortedPlayers.forEach(p => {
        html += `
            <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                <span class="${p.is_active ? 'text-lime-400' : 'text-slate-600 line-through'} font-semibold text-sm">
                    ${p.name} <span class="text-xs text-slate-500 font-normal ml-1">(${p.match_count}x main)</span>
                </span>
                <button onclick="toggleKehadiranMabar('${p.id}', ${p.is_active})" 
                    class="text-[11px] px-4 py-1 rounded-lg font-bold transition duration-200 ${p.is_active ? 'bg-lime-500 text-slate-950 hover:bg-amber-600 hover:text-white' : 'bg-slate-800 text-slate-400 hover:bg-lime-950 hover:text-lime-400'}">
                    ${p.is_active ? 'Hadir (Klik Istirahat)' : 'Klik Hadir'}
                </button>
            </div>
        `;
    });
    listContainer.innerHTML = html || `<p class="text-slate-600 text-center text-xs py-6 font-medium">Buka Tab "Data Pemain" untuk mendaftarkan anggota klub.</p>`;
}

// ==========================================
// KANDIDAT MATCHMAKING & RIWAYAT (Sama Seperti Logika Kemarin)
// ==========================================
function resetSemuaJumlahMain() {
    if (!confirm("Reset semua jumlah main menjadi 0 untuk sesi baru?")) return;
    const updates = {};
    Object.keys(globalPlayers).forEach(id => { updates[`badminton/players/${id}/match_count`] = 0; });
    db.ref().update(updates);
}

function jalankanMatchmaking() {
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) {
        alert("Pemain dengan status 'Hadir' minimal harus 4 orang untuk main Ganda!");
        return;
    }

    activePlayers.sort((a, b) => a.match_count - b.match_count);
    const candidates = activePlayers.slice(0, 4);
    const p1 = candidates[0], p2 = candidates[1], p3 = candidates[2], p4 = candidates[3];
    
    const opsiCombos = [
        { tA: [p1, p2], tB: [p3, p4] },
        { tA: [p1, p3], tB: [p2, p4] },
        { tA: [p1, p4], tB: [p2, p3] }
    ];

    let bestCombo = opsiCombos[0];
    let minScore = Infinity;

    opsiCombos.forEach(combo => {
        let score = 0;
        score += getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner');
        score += getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner');
        score += getHistoryScore(combo.tA[0].id, combo.tB[0].id, 'opponent');
        score += getHistoryScore(combo.tA[0].id, combo.tB[1].id, 'opponent');
        score += getHistoryScore(combo.tA[1].id, combo.tB[0].id, 'opponent');
        score += getHistoryScore(combo.tA[1].id, combo.tB[1].id, 'opponent');

        if (score < minScore) {
            minScore = score;
            bestCombo = combo;
        }
    });

    document.getElementById('tim-a').innerText = `${bestCombo.tA[0].name} & ${bestCombo.tA[1].name}`;
    document.getElementById('tim-b').innerText = `${bestCombo.tB[0].name} & ${bestCombo.tB[1].name}`;
    
    const blockHasil = document.getElementById('hasil-match');
    blockHasil.classList.remove('hidden');
    blockHasil.scrollIntoView({ behavior: 'smooth' });

    document.getElementById('btn-selesai-a').onclick = () => simpanHasilMatch(bestCombo.tA, bestCombo.tB);
    document.getElementById('btn-selesai-b').onclick = () => simpanHasilMatch(bestCombo.tB, bestCombo.tA);
}

function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) return globalHistory[key][tipe];
    return 0;
}

function simpanHasilMatch(pemenang, kalah) {
    const updates = {};
    const semuaPemain = [...pemenang, ...kalah];
    semuaPemain.forEach(p => {
        updates[`badminton/players/${p.id}/match_count`] = globalPlayers[p.id].match_count + 1;
    });

    function tambahHistoryCounter(id1, id2, tipe) {
        const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
        const currentVal = (globalHistory[key] && globalHistory[key][tipe]) ? globalHistory[key][tipe] : 0;
        updates[`badminton/history/${key}/${tipe}`] = currentVal + 1;
    }

    tambahHistoryCounter(pemenang[0].id, pemenang[1].id, 'partner');
    tambahHistoryCounter(kalah[0].id, kalah[1].id, 'partner');
    tambahHistoryCounter(pemenang[0].id, kalah[0].id, 'opponent');
    tambahHistoryCounter(pemenang[0].id, kalah[1].id, 'opponent');
    tambahHistoryCounter(pemenang[1].id, kalah[0].id, 'opponent');
    tambahHistoryCounter(pemenang[1].id, kalah[1].id, 'opponent');

    db.ref().update(updates).then(() => {
        document.getElementById('hasil-match').classList.add('hidden');
        alert("Skor & Riwayat Berhasil Diperbarui!");
    }).catch(err => {
        alert("Gagal menyimpan data: " + err.message);
    });
}
