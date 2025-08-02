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

function calculateScore(word) {
  const baseScoreTable = {
    A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5,
    L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1,
    V:4, W:4, X:8, Y:4, Z:10
  };

  const bonusPairs = ["TH", "IN", "ER", "ON", "AN"];
  const penaltyPairs = ["QU", "XZ", "JK", "QZ"];

  // 3 ตัวโบนัส เช่น "ING", "EST", "ED"
  const tripleBonus = ["ING", "EST", "ED"];

  let score = 0;
  let wordUpper = word.toUpperCase();
  let letterCount = {};

  // หักคะแนนถ้าคำสั้นเกินไป (<3)
  if (wordUpper.length < 3) return 0;

  // นับตัวอักษรและคะแนนพื้นฐาน
  for (let i = 0; i < wordUpper.length; i++) {
    const ch = wordUpper[i];
    score += baseScoreTable[ch] || 0;
    letterCount[ch] = (letterCount[ch] || 0) + 1;
  }

  // เช็คคู่โบนัส/หักคะแนน
  for (let i = 0; i < wordUpper.length - 1; i++) {
    const pair = wordUpper.substring(i, i+2);
    if (bonusPairs.includes(pair)) score += 5;
    if (penaltyPairs.includes(pair)) score -= 5;
  }

  // เช็คโบนัส 3 ตัว
  for (let i = 0; i < wordUpper.length - 2; i++) {
    const triple = wordUpper.substring(i, i+3);
    if (tripleBonus.includes(triple)) score += 8;
  }

  // โบนัสตัวขึ้นต้น ถ้าขึ้นต้นด้วย Q,Z,X ให้คูณ 2.5
  if (["Q", "Z", "X"].includes(wordUpper[0])) score *= 2.5;

  // หักคะแนนถ้าตัวอักษรซ้ำเกิน 2 ครั้ง (แต่ละตัว)
  for (let ch in letterCount) {
    if (letterCount[ch] > 2) {
      // หักหนักขึ้นตามจำนวนที่เกินมา (แต่หักไม่เกิน 15)
      let penalty = Math.min(15, (letterCount[ch] - 2) * 5);
      score -= penalty;
    }
  }

  // หักคะแนนถ้าคำยาวเกิน 10 ตัว (ป้องกันพิมพ์ยาวเกิน)
  if (wordUpper.length > 10) {
    score -= (wordUpper.length - 10) * 3;
  }

  // โบนัสถ้าคำมีสระเยอะ (>=40% ของคำ) +5 คะแนน
  const vowels = ["A","E","I","O","U"];
  let vowelCount = 0;
  for (let ch of vowels) {
    vowelCount += letterCount[ch] || 0;
  }
  if (vowelCount / wordUpper.length >= 0.4) {
    score += 5;
  }

  // หักคะแนนถ้าคำมีตัวอักษรพิเศษ (ไม่ใช่ A-Z)
  if (/[^A-Z]/.test(wordUpper)) {
    score -= 20;
  }

  // ห้ามคะแนนติดลบ
  return Math.max(0, Math.round(score));
}
