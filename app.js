// Import Firebase SDK modules yang dibutuhkan
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// TODO: Ganti dengan Firebase Config milik Anda sendiri dari Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "badminton-score.firebaseapp.com",
  projectId: "badminton-score",
  storageBucket: "badminton-score.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:123456:web:abcde12345"
};

// Inisialisasi Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test Koneksi di UI
const appContainer = document.getElementById('app');
appContainer.innerHTML = `
    <div class="bg-slate-800 p-4 rounded-xl text-center shadow-lg border border-lime-500/30">
        <p class="text-lime-400 font-semibold">Firebase Berhasil Terhubung! 🚀</p>
        <button id="btn-kocok" class="mt-4 bg-lime-500 text-slate-950 font-bold py-2 px-4 rounded-lg w-full hover:bg-lime-400 transition">
            Mulai Kocok Pemain
        </button>
    </div>
`;

console.log("Firebase initialized successfully.");
