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

// Inisialisasi
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// DOM Elements (Untuk dihubungkan ke index.html nanti)
const appContainer = document.getElementById('app');

// State Lokal Aplikasi
let globalPlayers = {};
let globalHistory = {};

---

## 2. Struktur Dasar Tampilan (UI) di app.js
// Kita render UI utama secara dinamis menggunakan Tailwind CSS
function renderMainUI() {
    appContainer.innerHTML = `
        <div class="space-y-6">
            <div class="bg-slate-800 p-4 rounded-xl shadow-md border border-slate-700">
                <h2 class="text-lg font-semibold mb-3 text-lime-400">Tambah Pemain Mabar</h2>
                <div class="flex gap-2">
                    <input type="text" id="input-nama" placeholder="Nama Pemain..." class="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-lime-500">
                    <button id="btn-tambah" class="bg-lime-500 text-slate-950 font-bold px-4 py-2 rounded-lg hover:bg-lime-400 transition">Tambah</button>
                </div>
            </div>

            <div class="bg-slate-800 p-4 rounded-xl shadow-md border border-slate-700">
                <h2 class="text-lg font-semibold mb-3 text-lime-400">Daftar Pemain (<span id="total-pemain">0</span>)</h2>
                <div id="list-pemain" class="space-y-2 max-h-60 overflow-y-auto pr-1">
                    </div>
            </div>

            <button id="btn-kocok" class="bg-gradient-to-r from-lime-500 to-green-600 text-slate-950 font-black text-lg py-4 px-6 rounded-xl w-full shadow-lg hover:brightness-110 transition active:scale-[0.98]">
                🔥 KOCK MATCH SEKARANG
            </button>

            <div id="hasil-match" class="hidden bg-slate-800 p-5 rounded-xl shadow-md border-2 border-lime-500/50 text-center animate-pulse">
                <h3 class="text-sm font-bold text-slate-400 tracking-wider uppercase mb-3">Pertandingan Berikutnya</h3>
                <div class="flex items-center justify-between text-xl font-bold px-2">
                    <div class="text-blue-400 w-2/5" id="tim-a">Player 1 & Player 2</div>
                    <div class="text-slate-500 text-sm w-1/5">VS</div>
                    <div class="text-orange-400 w-2/5" id="tim-b">Player 3 & Player 4</div>
                </div>
                <div class="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                    <button id="btn-selesai-a" class="flex-1 bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-500">Tim A Menang</button>
                    <button id="btn-selesai-b" class="flex-1 bg-orange-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-orange-500">Tim B Menang</button>
                </div>
            </div>
        </div>
    `;

    // Event Listener Tambah Pemain
    document.getElementById('btn-tambah').addEventListener('click', aksiTambahPemain);
    // Event Listener Kocok Match
    document.getElementById('btn-kocok').addEventListener('click', jalankanMatchmaking);
}

---

## 3. Fungsi Operasi Database (Firebase CRUD)

// Mendengarkan perubahan data Pemain & Riwayat secara Real-time
onValue(ref(db, 'badminton/players'), (snapshot) => {
    globalPlayers = snapshot.val() || {};
    updateListPemainUI();
});

onValue(ref(db, 'badminton/history'), (snapshot) => {
    globalHistory = snapshot.val() || {};
});

// Fungsi menambahkan pemain baru ke Firebase
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

// Fungsi mengubah status istirahat / aktif pemain
window.toggleStatusPemain = function(id, currentStatus) {
    update(ref(db, `badminton/players/${id}`), {
        is_active: !currentStatus
    });
};

// Merender daftar pemain ke layar HTML
function updateListPemainUI() {
    const listContainer = document.getElementById('list-pemain');
    if (!listContainer) return;

    let html = '';
    let count = 0;
    
    Object.values(globalPlayers).forEach(p => {
        count++;
        html += `
            <div class="flex items-center justify-between bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span class="${p.is_active ? 'text-white' : 'text-slate-500 line-through'} font-medium">
                    ${p.name} <span class="text-xs text-lime-400 ml-1">(${p.match_count}x main)</span>
                </span>
                <button onclick="toggleStatusPemain('${p.id}', ${p.is_active})" class="text-xs px-3 py-1 rounded-md font-bold ${p.is_active ? 'bg-slate-700 text-slate-300 hover:bg-red-900/40 hover:text-red-400' : 'bg-lime-950 text-lime-400 hover:bg-lime-900'} transition">
                    ${p.is_active ? 'Istirahat' : 'Mainkan'}
                </button>
            </div>
        `;
    });
    
    listContainer.innerHTML = html || `<p class="text-slate-500 text-center text-sm py-4">Belum ada pemain.</p>`;
    document.getElementById('total-pemain').innerText = count;
}

---

## 4. Inti Algoritma Matchmaking (History-Based)

let currentMatchData = null;

function jalankanMatchmaking() {
    // 1. Filter pemain yang siap main (is_active == true)
    const activePlayers = Object.values(globalPlayers).filter(p => p.is_active);
    
    if (activePlayers.length < 4) {
        alert("Pemain aktif minimal harus 4 orang untuk main Ganda!");
        return;
    }

    // 2. Sort berdasarkan jumlah main tersedikit (keadilan antrean)
    activePlayers.sort((a, b) => a.match_count - b.match_count);
    
    // Ambil 4 kandidat teratas
    const candidates = activePlayers.slice(0, 4);

    // 3. Cari kombinasi pasangan terbaik agar orangnya bervariasi
    const p1 = candidates[0], p2 = candidates[1], p3 = candidates[2], p4 = candidates[3];
    
    // 3 Kemungkinan kombinasi pertandingan
    const opsiCombos = [
        { tA: [p1, p2], tB: [p3, p4] },
        { tA: [p1, p3], tB: [p2, p4] },
        { tA: [p1, p4], tB: [p2, p3] }
    ];

    let bestCombo = opsiCombos[0];
    let minScore = Infinity;

    opsiCombos.forEach(combo => {
        let score = 0;
        
        // Ambil riwayat relasi partner tim A dan tim B
        score += getHistoryScore(combo.tA[0].id, combo.tA[1].id, 'partner');
        score += getHistoryScore(combo.tB[0].id, combo.tB[1].id, 'partner');
        
        // Ambil riwayat relasi sebagai lawan silang
        score += getHistoryScore(combo.tA[0].id, combo.tB[0].id, 'opponent');
        score += getHistoryScore(combo.tA[0].id, combo.tB[1].id, 'opponent');
        score += getHistoryScore(combo.tA[1].id, combo.tB[0].id, 'opponent');
        score += getHistoryScore(combo.tA[1].id, combo.tB[1].id, 'opponent');

        // Pilih skor terkecil (pertemuan paling jarang)
        if (score < minScore) {
            minScore = score;
            bestCombo = combo;
        }
    });

    // 4. Tampilkan Hasil ke UI
    currentMatchData = bestCombo;
    
    document.getElementById('tim-a').innerText = `${bestCombo.tA[0].name} & ${bestCombo.tA[1].name}`;
    document.getElementById('tim-b').innerText = `${bestCombo.tB[0].name} & ${bestCombo.tB[1].name}`;
    
    const blockHasil = document.getElementById('hasil-match');
    blockHasil.classList.remove('hidden');
    blockHasil.scrollIntoView({ behavior: 'smooth' });

    // Pasang handler tombol kemenangan
    document.getElementById('btn-selesai-a').onclick = () => simpanHasilMatch(bestCombo.tA, bestCombo.tB);
    document.getElementById('btn-selesai-b').onclick = () => simpanHasilMatch(bestCombo.tB, bestCombo.tA);
}

// Mengambil skor riwayat bertemunya pemain dari objek database globalHistory
function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) {
        return globalHistory[key][tipe];
    }
    return 0;
}

---

## 5. Simpan Hasil & Update Riwayat Pertandingan

function simpanHasilMatch(pemenang, kalah) {
    const updates = {};

    // 1. Tambah match_count (+1) ke 4 pemain tersebut
    const semuaPemain = [...pemenang, ...kalah];
    semuaPemain.forEach(p => {
        updates[`badminton/players/${p.id}/match_count`] = globalPlayers[p.id].match_count + 1;
    });

    // Helper fungsi untuk update skor matrix relasi di database
    function tambahHistoryCounter(id1, id2, tipe) {
        const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
        const currentVal = (globalHistory[key] && globalHistory[key][tipe]) ? globalHistory[key][tipe] : 0;
        updates[`badminton/history/${key}/${tipe}`] = currentVal + 1;
    }

    // 2. Update riwayat pasangan (partner)
    tambahHistoryCounter(pemenang[0].id, pemenang[1].id, 'partner');
    tambahHistoryCounter(kalah[0].id, kalah[1].id, 'partner');

    // 3. Update riwayat lawan (opponent)
    tambahHistoryCounter(pemenang[0].id, kalah[0].id, 'opponent');
    tambahHistoryCounter(pemenang[0].id, kalah[1].id, 'opponent');
    tambahHistoryCounter(pemenang[1].id, kalah[0].id, 'opponent');
    tambahHistoryCounter(pemenang[1].id, kalah[1].id, 'opponent');

    // Kirim satu kali request gabungan (*atomic update*) ke Firebase
    update(ref(db), updates).then(() => {
        document.getElementById('hasil-match').classList.add('hidden');
        alert("Skor & Riwayat Berhasil Diperbarui!");
    });
}

// Eksekusi render UI pertama kali aplikasi dibuka
renderMainUI();
