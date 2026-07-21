// ==========================================
// ADVANCED MATCHMAKING UTILITIES & BALANCING (FIXED)
// ==========================================
function getHistoryScore(id1, id2, tipe) {
    const key = id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
    if (globalHistory[key] && globalHistory[key][tipe]) return globalHistory[key][tipe];
    return 0;
}

// DIPERKETAT: Lookback count dijadikan 2 agar pemain yang baru main tidak langsung main lagi (mencegah numpuk 2-3 match)
function getRecentMatchPlayers(matchesObj, currentMatchNo, lookbackCount = 2) {
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
    
    // Ambil daftar pemain yang baru saja main (2 match terakhir)
    let recentIds = getRecentMatchPlayers(matchesObj, currentMatchNo, 2);

    let sortedPool = [...pool].sort((a, b) => {
        let countA = currentCounts[a.id] || 0;
        let countB = currentCounts[b.id] || 0;
        
        // Berikan penalti besar bagi pemain yang baru saja main agar tidak dipilih berturut-turut
        let penaltyA = recentIds.has(a.id) ? 5000 : 0;
        let penaltyB = recentIds.has(b.id) ? 5000 : 0;

        return (countA + penaltyA + Math.random() * 0.1) - (countB + penaltyB + Math.random() * 0.1);
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
// AMAN & ANTI-BUG SAAT EDIT PEMAIN DI MATCH
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

    // Update posisi pemain pada match tersebut secara langsung tanpa looping berantai yang menyebabkan ngebug/freeze
    if (posisi === 'A1') { match.pA1 = newPlayer.name; match.idA1 = newPlayer.id; }
    else if (posisi === 'A2') { match.pA2 = newPlayer.name; match.idA2 = newPlayer.id; }
    else if (posisi === 'B1') { match.pB1 = newPlayer.name; match.idB1 = newPlayer.id; }
    else if (posisi === 'B2') { match.pB2 = newPlayer.name; match.idB2 = newPlayer.id; }

    db.ref(`badminton/current_schedule/${matchId}`).set(match);
};
