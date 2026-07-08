// 1. Import Firebase Core & Realtime Database via CDN (Versi Web Statis)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, onValue, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

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

// Inisialisasi Firebase & Database
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Element Utama
const appContainer = document.getElementById('app');

// State Global Aplikasi untuk menyimpan data dari Firebase
let globalPlayers = {};
let globalHistory = {};

// ==========================================
// 2. FUNGSI RENDER UI UTAMA (Dinamis via JS)
// ==========================================
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
                <div id="list-pemain" class="space-y-2 max-h-60 overflow-y-auto pr-1">
                    </div>
            </div>

            <button id="btn-kocok" class="bg-gradient-to-r from-lime-500 to-green-500 text-slate-950 font-black text-base py-4 px-6 rounded-2xl w-full shadow-lg shadow-lime-500/10 hover:brightness-110 transition active:scale-[0.98]">
                🔥 KOCK MATCH SEKARANG
            </button>

            <div id="hasil-match" class="hidden bg-slate-900 p-5 rounded-2xl shadow-xl border-2 border-lime-500/30 text-center">
                <h3 class="text-xs font-bold text-slate-500 tracking-widest uppercase mb-4">Pertandingan Berikutnya</h3>
                <div class="flex items-center justify-between text-base font-extrabold px-2 gap-2">
                    <div class="text-blue-400 w-2/5 break-words bg-blue-950/20 p-2 rounded-xl border border-blue-900/20" id="tim-a">Player 1 & Player 2</div>
                    <div class="text-slate-600 text-xs font-black w-1/5">VS</div>
                    <div class="text-orange-400 w-2/5 break-words bg-orange-950/20 p-2 rounded-xl border border-orange-900/20" id="tim-b">Player 3 & Player 4</div>
                </div>
                <div class="mt-5 pt-4 border-t border-slate-800/60 flex gap-2">
                    <button id="btn-selesai-a" class="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-500 shadow-md shadow-blue-600/10 transition">Tim A Menang</button>
                    <button id="btn-selesai-b" class="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-orange-500 shadow-md shadow-orange-600/10 transition">Tim B Menang</button>
                </div>
            </div>
        </div>
    `;

    // Pasang Event Listeners setelah UI di-render
    document.getElementById('btn-tambah').addEventListener('click', aksiTambahPemain);
    document.getElementById('btn-kocok').addEventListener('click', jalankanMatchmaking);
    document.getElementById('btn-reset-match-count').addEventListener('click', resetSemuaJumlahMain);
    
    // Daftarkan fungsi toggle ke window object agar bisa dipanggil dari HTML atribut 'onclick'
    window.toggleStatusPemain = function(id, currentStatus) {
        update(ref(db, `badminton/players/${id}`), {
            is_active: !currentStatus
        });
    };
}

// ==========================================
// 3. OPERASI FIREBASE (Realtime Listeners)
// ==========================================

// Dengarkan data Pemain secara Real-time
onValue(ref(db, 'badminton/players'), (snapshot) => {
    globalPlayers = snapshot.val() || {};
    
    // Jika UI belum pernah dibuat (masih layar loading), buat sekarang
    if (!document.getElementById('list-pemain')) {
        renderMainUI();
    }
    
    updateListPemainUI();
});

// Dengarkan data Riwayat Pertandingan secara Real-time
onValue(ref(db, 'badminton/history'), (snapshot) => {
    globalHistory = snapshot.val() || {};
});

// Fungsi tambah pemain baru ke Firebase
function aksiTambahPemain() {
    const nameInput = document.getElementById('input-nama');
    const name = nameInput.value.trim();
    if (!name) return;

    const playerId = 'p_' + Date.now();
    set(ref(db, `badminton/players/${playerId}`), {
        id: playerId,
        name: name,
        match_count: 0,
        is_active: true
    });
    nameInput.value = '';
}

// Render ulang elemen daftar pemain di HTML
function updateListPemainUI() {
    const listContainer = document.getElementById('list-pemain');
    if (!listContainer) return;

    let html = '';
    let count = 0;
    
    // Sort urutan alfabet nama pemain saat ditampilkan
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

// Fungsi opsional untuk me-reset jumlah bermain semua orang kembali ke 0
function resetSemuaJumlahMain() {
    if (!confirm("Reset semua jumlah main menjadi 0 untuk sesi baru?")) return;
    const updates = {};
    Object.keys(globalPlayers).forEach(id => {
        updates[`badminton/players/${id}/match_count`] = 0;
    });
    update(ref(db), updates);
}

// ==========================================
// 4. LOGIKA UTAMA ALGORITMA MATCHMAKING
// ==========================================
function jalankanMatchmaking() {
    // 1. Ambil hanya pemain yang statusnya aktif/hadir
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    
    if (activePlayers.length < 4) {
        alert("Pemain aktif minimal harus 4 orang untuk main Ganda!");
        return;
    }

    // 2. Sort berdasarkan jumlah bermain paling sedikit (Keadilan Antrean)
    activePlayers.sort((a, b) => a.match_count - b.match_count);
    
    // Potong 4 kandidat teratas yang paling berhak main berikutnya
    const candidates = activePlayers.slice(0, 4);

    const p1 = candidates[0], p2 = candidates[1], p3 = candidates[2], p4 = candidates[3];
    
    // 3 Kemungkinan kombinasi format pasangan ganda
    const opsiCombos = [
        { tA: [p1, p2], tB: [p3, p4] },
        { tA: [p1, p3], tB: [p2, p4] },
        { tA: [p1, p4], tB: [p2, p3] }
    ];

    let bestCombo = opsiCombos[0];
    let minScore = Infinity;

    // Hitung opsi kombinasi yang memiliki riwayat pertemuan paling sedikit
    opsiCombos.forEach(combo => {
        let score = 0;
        
        // Cek skor keintiman sebagai rekan tim (partner)
        score += getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner');
        score += getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner');
        
        // Cek skor keintiman sebagai lawan bermain (opponent)
        score += getHistoryScore(combo.tA[0].id, combo.tB[0].id, 'opponent');
        score += getHistoryScore(combo.tA[0].id, combo.tB[1].id, 'opponent');
        score += getHistoryScore(combo.tA[1].id, combo.tB[0].id, 'opponent');
        score += getHistoryScore(combo.tA[1].id, combo.tB[1].id, 'opponent');

        // Cari opsi yang total poin riwayatnya paling kecil
        if (score < minScore) {
            minScore = score;
            bestCombo = combo;
        }
    });

    // 3. Tampilkan hasil kocokan ke UI Block
    document.getElementById('tim-a').innerText = `${bestCombo.tA[0].name} & ${bestCombo.tA[1].name}`;
    document.getElementById('tim-b').innerText = `${bestCombo.tB[0].name} & ${bestCombo.tB[1].name}`;
    
    const blockHasil = document.getElementById('hasil-match');
    blockHasil.classList.remove('hidden');
    blockHasil.scrollIntoView({ behavior: 'smooth' });

    // Set aksi tombol kemenangan hasil pertandingan
    document.getElementById('btn-selesai-a').onclick = () => simpanHasilMatch(bestCombo.tA, bestCombo.tB);
    document.getElementById('btn-selesai-b').onclick = () => simpanHasilMatch(bestCombo.tB, bestCombo.tA);
}

// Helper mengambil nilai dari objek matrix globalHistory
function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) {
        return globalHistory[key][tipe];
    }
    return 0;
}

// ==========================================
// 5. PENYIMPANAN DATA HASIL PERTANDINGAN
// ==========================================
function simpanHasilMatch(pemenang, kalah) {
    const updates = {};

    // 1. Tambahkan jumlah tanding (+1) untuk keempat pemain tersebut
    const semuaPemain = [...pemenang, ...kalah];
    semuaPemain.forEach(p => {
        updates[`badminton/players/${p.id}/match_count`] = globalPlayers[p.id].match_count + 1;
    });

    // Helper fungsi lokal untuk menaikkan counter relasi matrix di database
    function tambahHistoryCounter(id1, id2, tipe) {
        const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
        const currentVal = (globalHistory[key] && globalHistory[key][tipe]) ? globalHistory[key][tipe] : 0;
        updates[`badminton/history/${key}/${tipe}`] = currentVal + 1;
    }

    // 2. Perbarui riwayat sebagai rekan setim (partner)
    tambahHistoryCounter(pemenang[0].id, pemenang[1].id, 'partner');
    tambahHistoryCounter(kalah[0].id, kalah[1].id, 'partner');

    // 3. Perbarui riwayat silang sebagai musuh (opponent)
    tambahHistoryCounter(pemenang[0].id, kalah[0].id, 'opponent');
    tambahHistoryCounter(pemenang[0].id, kalah[1].id, 'opponent');
    tambahHistoryCounter(pemenang[1].id, kalah[0].id, 'opponent');
    tambahHistoryCounter(pemenang[1].id, kalah[1].id, 'opponent');

    // Kirim satu paket update sekaligus ke Firebase (Atomic Update)
    update(ref(db), updates).then(() => {
        document.getElementById('hasil-match').classList.add('hidden');
        alert("Skor & Riwayat Berhasil Diperbarui!");
    }).catch(err => {
        alert("Gagal menyimpan data: " + err.message);
    });
}
