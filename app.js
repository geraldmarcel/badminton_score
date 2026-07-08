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

// Inisialisasi Firebase menggunakan objek global window
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// DOM Element Utama
const appContainer = document.getElementById('app');
let globalPlayers = {};
let globalHistory = {};

function renderMainUI() {
    appContainer.innerHTML = `
        <div class="space-y-6">
            <div class="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800">
                <h2 class="text-sm font-bold uppercase tracking-wider mb-3 text-lime-400">Tambah Pemain Mabar</h2>
                <div class="flex gap-2">
                    <input type="text" id="input-nama" placeholder="Nama Pemain..." 
                        class="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-lime-500 text-sm">
                    <button id="btn-tambah" class="bg-lime-500 text-slate-950 font-bold px-4 py-2 rounded-xl hover:bg-lime-400 transition text-sm">Tambah</button>
                </div>
            </div>

            <div class="bg-slate-900 p-4 rounded-2xl shadow-xl border border-slate-800">
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-sm font-bold uppercase tracking-wider text-lime-400">Daftar Pemain (<span id="total-pemain">0</span>)</h2>
                    <button id="btn-reset-match-count" class="text-[10px] bg-red-950 text-red-400 px-2 py-1 rounded border border-red-900/30 font-bold hover:bg-red-900 transition">Reset Jumlah Main</button>
                </div>
                <div id="list-pemain" class="space-y-2 max-h-60 overflow-y-auto pr-1"></div>
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
        </div>
    `;

    document.getElementById('btn-tambah').addEventListener('click', aksiTambahPemain);
    document.getElementById('btn-kocok').addEventListener('click', jalankanMatchmaking);
    document.getElementById('btn-reset-match-count').addEventListener('click', resetSemuaJumlahMain);
    
    // Daftarkan fungsi toggle agar bisa dibaca atribut onclick HTML
    window.toggleStatusPemain = function(id, currentStatus) {
        db.ref(`badminton/players/${id}`).update({
            is_active: !currentStatus
        });
    };
}

// REALTIME LISTENERS (Sintaks V8 Legacy)
db.ref('badminton/players').on('value', (snapshot) => {
    globalPlayers = snapshot.val() || {};
    if (!document.getElementById('list-pemain')) {
        renderMainUI();
    }
    updateListPemainUI();
});

db.ref('badminton/history').on('value', (snapshot) => {
    globalHistory = snapshot.val() || {};
});

function aksiTambahPemain() {
    const nameInput = document.getElementById('input-nama');
    const name = nameInput.value.trim();
    if (!name) return;

    const playerId = 'p_' + Date.now();
    db.ref(`badminton/players/${playerId}`).set({
        id: playerId,
        name: name,
        match_count: 0,
        is_active: true
    });
    nameInput.value = '';
}

function updateListPemainUI() {
    const listContainer = document.getElementById('list-pemain');
    if (!listContainer) return;

    let html = '';
    let count = 0;
    const sortedPlayers = Object.values(globalPlayers).sort((a, b) => a.name.localeCompare(b.name));

    sortedPlayers.forEach(p => {
        count++;
        html += `
            <div class="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                <span class="${p.is_active ? 'text-slate-200' : 'text-slate-600 line-through'} font-semibold text-sm">
                    ${p.name} <span class="text-xs text-lime-500 font-normal ml-1">(${p.match_count}x)</span>
                </span>
                <button onclick="toggleStatusPemain('${p.id}', ${p.is_active})" 
                    class="text-[11px] px-3 py-1 rounded-lg font-bold transition duration-200 ${p.is_active ? 'bg-slate-800 text-slate-300 hover:bg-red-950/50 hover:text-red-400' : 'bg-lime-950/50 text-lime-400 hover:bg-lime-900'}">
                    ${p.is_active ? 'Istirahat' : 'Main'}
                </button>
            </div>
        `;
    });
    
    listContainer.innerHTML = html || `<p class="text-slate-600 text-center text-xs py-6 font-medium">Belum ada nama pemain.</p>`;
    document.getElementById('total-pemain').innerText = count;
}

function resetSemuaJumlahMain() {
    if (!confirm("Reset semua jumlah main menjadi 0 untuk sesi baru?")) return;
    const updates = {};
    Object.keys(globalPlayers).forEach(id => {
        updates[`badminton/players/${id}/match_count`] = 0;
    });
    db.ref().update(updates);
}

function jalankanMatchmaking() {
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    if (activePlayers.length < 4) {
        alert("Pemain aktif minimal harus 4 orang untuk main Ganda!");
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
    if (globalHistory[key] && globalHistory[key][tipe]) {
        return globalHistory[key][tipe];
    }
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
