const firebaseConfig = {
  apiKey: "AIzaSyAjsh8BCiwDWLyBT9P_smxcAXyY3qbjhdE",
  authDomain: "good-name-game.firebaseapp.com",
  databaseURL: "https://good-name-game-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "good-name-game",
  storageBucket: "good-name-game.firebasestorage.app",
  messagingSenderId: "217411017180",
  appId: "1:217411017180:web:c8d6fd5f1b287acd64d719",
  measurementId: "G-KVZP39W0SM"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function login() {
  const player = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const word = document.getElementById("displayName").value.trim();

  if (!player || !password || !word) {
    return alert("ใส่ให้ครบก่อนนะ!");
  }

  const userRef = db.ref("players/" + player);

  userRef.once("value", (snapshot) => {
    const data = snapshot.val();

    // ถ้ามีผู้ใช้นี้อยู่แล้ว
    if (data) {
      if (data.password !== password) {
        alert("รหัสผ่านผิดจ้า!");
        return;
      }
    }

    // ถ้ายังไม่มี หรือ password ถูกต้อง
    const score = calculateScore(word);
    userRef.set({
      word,
      score,
      password
    });

    alert("บันทึกชื่อสำเร็จ!");
  });
}

// อัปเดต Leaderboard
db.ref("players").on("value", snapshot => {
  const data = snapshot.val() || {};
  const sorted = Object.entries(data).sort((a, b) => b[1].score - a[1].score);
  const leaderboard = document.getElementById("leaderboard");
  leaderboard.innerHTML = "";

  sorted.forEach(([player, { word, score }]) => {
    const li = document.createElement("li");
    li.textContent = `${player} ➜ "${word}" = ${score} คะแนน`;
    leaderboard.appendChild(li);
  });
});

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