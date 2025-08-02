const firebaseConfig = {
    apiKey: "AIzaSyBszTN08U6ScSEPP7gr00DsS8nb2vDATf4",
    authDomain: "goodnamegame-df472.firebaseapp.com",
    databaseURL: "https://goodnamegame-df472-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "goodnamegame-df472",
    storageBucket: "goodnamegame-df472.firebasestorage.app",
    messagingSenderId: "8128999711",
    appId: "1:8128999711:web:a1d7d19801d75ba907402a",
    measurementId: "G-Z1G5814RLG"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ตารางคะแนนตัวอักษร
const scoreTable = {
    A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5,
    L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1,
    V:4, W:4, X:8, Y:4, Z:10
};

const bonusPairs = ["TH", "IN", "ER", "ON", "AN"];
const penaltyPairs = ["QU", "XZ", "JK", "QZ"];

function calculateScore(word) {
    let score = 0;
    let wordUpper = word.toUpperCase();
    let letterCount = {};

    for (let i = 0; i < wordUpper.length; i++) {
        const ch = wordUpper[i];
        score += scoreTable[ch] || 0;
        letterCount[ch] = (letterCount[ch] || 0) + 1;
  }

  // คู่ตัวอักษร
  for (let i = 0; i < wordUpper.length - 1; i++) {
        const pair = wordUpper[i] + wordUpper[i + 1];
        if (bonusPairs.includes(pair)) score += 5;
        if (penaltyPairs.includes(pair)) score -= 5;
  }

  // โบนัสตัวขึ้นต้น
  if (["Q", "Z", "X"].includes(wordUpper[0])) score *= 2;

  // ตัวซ้ำเกิน 3
  for (let ch in letterCount) {
        if (letterCount[ch] >= 3) score -= 3;
  }

  return Math.max(0, score);
}

function submitName() {
    const player = document.getElementById("playerName").value.trim();
    const word = document.getElementById("wordInput").value.trim();
    if (!player || !word) return alert("ใส่ให้ครบก่อนนะ!");

    const score = calculateScore(word);
    db.ref("players/" + player).set({ word, score });
}

// อัปเดต Leaderboard
db.ref("players").on("value", snapshot => {
    const data = snapshot.val() || {};
    const sorted = Object.entries(data).sort((a, b) => b[1].score - a[1].score);
    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";

    sorted.forEach(([player, { word, score }], index) => {
        const li = document.createElement("li");
        li.textContent = `#${index + 1} ${player} ➜ "${word}" = ${score} คะแนน`;
        leaderboard.appendChild(li);
    });
});