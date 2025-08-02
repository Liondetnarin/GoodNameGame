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

// login
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

    // คำนวณคะแนน และเก็บเวลา
    const score = calculateScore(word);
    const now = firebase.database.ServerValue.TIMESTAMP; // ✅ ใช้เวลาเซิร์ฟเวอร์

    // บันทึกข้อมูลใหม่ลง Firebase
    userRef.set({
      word,
      score,
      password,
      time: now   // ✅ เก็บ timestamp ลงไป
    });

    alert("บันทึกชื่อสำเร็จ!");
  });
}


// อัปเดต Leaderboard
function loadLeaderboard() {
  db.ref("players").on("value", (snapshot) => {
    const data = snapshot.val() || {};
    const sorted = Object.entries(data)
      .map(([username, player]) => ({
        username,
        word: player.word,
        score: player.score,
        time: player.time || 0
      }))
      .sort((a, b) => {
        if (b.score === a.score) {
          return a.time - b.time;  // คนพิมพ์ก่อน (timestamp น้อยกว่า) อยู่ก่อน
        }
        return b.score - a.score;  // เรียงคะแนนจากมากไปน้อย
      });

    const leaderboard = document.getElementById("leaderboard");
    leaderboard.innerHTML = "";

    sorted.forEach(({ username, word, score }, index) => {
      const li = document.createElement("li");
      li.textContent = `#${index + 1} ${word} (${username}) - ${score} คะแนน`;
      leaderboard.appendChild(li);
    });
  });
}


function calculateScore(word) {
  if (!word || word.length < 3) return 0;

  const baseScoreTable = {
    A:1, B:3, C:3, D:2, E:1, F:4, G:2, H:4, I:1, J:8, K:5,
    L:1, M:3, N:1, O:1, P:3, Q:10, R:1, S:1, T:1, U:1,
    V:4, W:4, X:8, Y:4, Z:10
  };

  const bonusPairs = ["TH", "IN", "ER", "ON", "AN"];
  const penaltyPairs = ["QU", "XZ", "JK", "QZ"];
  const tripleBonus = ["ING", "EST", "ED"];

  const MAX_REPEAT_COUNT = 2; // นับคะแนนตัวละไม่เกิน 2 ครั้ง

  const wordUpper = word.toUpperCase();
  let letterCount = {};
  let score = 0;

  // 1. นับคะแนนตัวอักษร แต่ละตัวนับแค่ MAX_REPEAT_COUNT ครั้ง
  for (let i = 0; i < wordUpper.length; i++) {
    const ch = wordUpper[i];
    letterCount[ch] = (letterCount[ch] || 0) + 1;
    if (letterCount[ch] <= MAX_REPEAT_COUNT) {
      score += baseScoreTable[ch] || 0;
    }
    // ถ้าซ้ำเกิน MAX_REPEAT_COUNT ไม่ได้คะแนนเพิ่ม
  }

  // 2. โบนัสคู่ตัวอักษร (แต่ละคู่เพิ่มแค่ 3 คะแนน)
  for (let i = 0; i < wordUpper.length - 1; i++) {
    const pair = wordUpper.substring(i, i + 2);
    if (bonusPairs.includes(pair)) {
      score += 3;
    }
    if (penaltyPairs.includes(pair)) {
      score -= 3;
    }
  }

  // 3. โบนัส 3 ตัว (แต่ละชุดเพิ่ม 5 คะแนน)
  for (let i = 0; i < wordUpper.length - 2; i++) {
    const triple = wordUpper.substring(i, i + 3);
    if (tripleBonus.includes(triple)) {
      score += 5;
    }
  }

  // 4. หักคะแนนคำยาวเกิน 10 ตัว ตัวละ 4 คะแนน (แรงกว่าของเก่า)
  if (wordUpper.length > 10) {
    score -= (wordUpper.length - 10) * 4;
  }

  // 5. หักคะแนนถ้าคำมีตัวอักษรพิเศษ (ไม่ใช่ A-Z) หัก 25 คะแนน
  if (/[^A-Z]/.test(wordUpper)) {
    score -= 25;
  }

  // 6. หักคะแนนถ้าคำสั้นเกินไป (น้อยกว่า 3) แต่เผื่อไว้นิดหน่อย (นับเป็น 0 แล้วตอนต้น)
  // ไม่ต้องทำอะไร

  // 7. ห้ามคะแนนติดลบ
  return Math.max(0, score);
}