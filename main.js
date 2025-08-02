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

// ตารางคะแนนตัวอักษร
const scoreTable = {
    A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5,
    L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1,
    V: 4, W: 4, X: 8, Y: 4, Z: 10
};

const bonusPairs = ["TH", "IN", "ER", "ON", "AN"];
const penaltyPairs = ["QU", "XZ", "JK", "QZ"];
const extraBonusPairs = ["ING", "EST", "ED"]; // 3 ตัวอักษรเพิ่มคะแนน

function calculateScore(word) {
    let score = 0;
    let wordUpper = word.toUpperCase();
    let letterCount = {};

    // ถ้าใส่คำสั้นมาก (น้อยกว่า 3) ให้โดนหักคะแนน
    if (wordUpper.length < 3) return 0;

    // นับคะแนนพื้นฐานและนับตัวอักษร
    for (let i = 0; i < wordUpper.length; i++) {
        const ch = wordUpper[i];
        score += scoreTable[ch] || 0;
        letterCount[ch] = (letterCount[ch] || 0) + 1;
    }

    // คู่ตัวอักษรโบนัส/หักคะแนน
    for (let i = 0; i < wordUpper.length - 1; i++) {
        const pair = wordUpper[i] + wordUpper[i + 1];
        if (bonusPairs.includes(pair)) score += 5;
        if (penaltyPairs.includes(pair)) score -= 5;
    }

    // คู่ตัวอักษร 3 ตัวโบนัส
    for (let i = 0; i < wordUpper.length - 2; i++) {
        const triple = wordUpper.slice(i, i + 3);
        if (extraBonusPairs.includes(triple)) score += 10;
    }

    // โบนัสตัวขึ้นต้น ตัวที่คะแนนสูง จะได้คูณ 2.5 แทน *2 เดิม
    if (["Q", "Z", "X"].includes(wordUpper[0])) score *= 2.5;

    // หักคะแนนถ้าตัวอักษรซ้ำเกิน 2 ครั้ง (แต่ละตัว)
    for (let ch in letterCount) {
        if (letterCount[ch] > 2) {
            // ยิ่งซ้ำเยอะ หักคะแนนเยอะ (แต่ไม่เกิน 10)
            score -= Math.min(10, (letterCount[ch] - 2) * 4);
        }
    }

    // หักคะแนนถ้าคำยาวเกินไป (มากกว่า 10 ตัวอักษร) เพื่อกันคนพิมพ์ยาวๆเอาคะแนนง่าย
    if (wordUpper.length > 10) {
        score -= (wordUpper.length - 10) * 2;
    }

    // โบนัสถ้าคำมีตัวสระเยอะ (>= 40% ของความยาวคำ) +5 คะแนน
    const vowels = ["A", "E", "I", "O", "U"];
    const vowelCount = Object.entries(letterCount)
        .filter(([ch]) => vowels.includes(ch))
        .reduce((sum, [, count]) => sum + count, 0);

    if (vowelCount / wordUpper.length >= 0.4) {
        score += 5;
    }

    // ถ้าคำมีตัวอักษรพิเศษ (ไม่ใช่ A-Z) ให้หัก 20 คะแนน (คำสะอาดๆเท่านั้น)
    if (/[^A-Z]/.test(wordUpper)) {
        score -= 20;
    }

    // ไม่ให้คะแนนติดลบ
    return Math.max(0, Math.round(score));
}

const playerNameInput = document.getElementById("playerName");
const wordInput = document.getElementById("wordInput");
const playLeftCounter = document.getElementById("playLeftCounter");
const maxPlay = 3;

function checkNameLock() {
  const player = playerNameInput.value.trim();
  if (!player) {
    playLeftCounter.textContent = "(กรุณากรอกชื่อ)";
    playLeftCounter.style.color = "#e74c3c";
    playerNameInput.disabled = false;
    return;
  }

  const playerRef = db.ref("players/" + player);
  playerRef.once("value").then(snapshot => {
    const data = snapshot.val();
    if (data && data.name) {
      // ชื่อมีแล้ว ล็อก input ไม่ให้แก้ไข
      playerNameInput.value = data.name;
      playerNameInput.disabled = true;

      // แสดงจำนวนครั้งที่เหลือ
      const playLeft = maxPlay - (data.playCount || 0);
      if (playLeft <= 0) {
        playLeftCounter.textContent = "(หมดโอกาสเล่นแล้ว)";
        playLeftCounter.style.color = "#e74c3c";
      } else {
        playLeftCounter.textContent = `(เหลือ ${playLeft} ครั้ง)`;
        playLeftCounter.style.color = "#27ae60";
      }
    } else {
      // ยังไม่มีชื่อใน DB
      playerNameInput.disabled = false;
      playLeftCounter.textContent = `(เหลือ ${maxPlay} ครั้ง)`;
      playLeftCounter.style.color = "#27ae60";
    }
  });
}

// เรียกตอนพิมพ์ชื่อ
playerNameInput.addEventListener("input", checkNameLock);

// ฟังก์ชันส่งคำ
function submitName() {
  const player = playerNameInput.value.trim();
  const word = wordInput.value.trim();

  if (!player || !word) {
    playLeftCounter.textContent = "กรุณากรอกชื่อและคำให้ครบ!";
    playLeftCounter.style.color = "#e74c3c";
    return;
  }

  const playerRef = db.ref("players/" + player);
  playerRef.once("value").then(snapshot => {
    const data = snapshot.val();
    const playCount = data?.playCount || 0;
    const playLeft = maxPlay - playCount;

    if (playLeft <= 0) {
      playLeftCounter.textContent = "(หมดโอกาสเล่นแล้ว)";
      playLeftCounter.style.color = "#e74c3c";
      return;
    }

    const score = calculateScore(word);

    if (!data || !data.name) {
      // บันทึกชื่อครั้งแรก พร้อมคำและคะแนน
      playerRef.set({
        name: player,
        word,
        score,
        playCount: 1,
        lastPlay: Date.now()
      });
      // ล็อกช่องชื่อ
      playerNameInput.disabled = true;
    } else {
      // ชื่อมีแล้ว บันทึกแค่คำและคะแนน + เพิ่ม playCount
      playerRef.update({
        word,
        score,
        playCount: playCount + 1,
        lastPlay: Date.now()
      });
    }

    // อัพเดตเลขนับครั้งเล่นที่เหลือ
    playLeftCounter.textContent = `(เหลือ ${playLeft - 1} ครั้ง)`;
    playLeftCounter.style.color = "#27ae60";

    wordInput.value = "";
  });
}

// เรียกตอนโหลดหน้า ให้เช็คสถานะชื่อ
window.onload = checkNameLock;


function submitName() {
  const player = document.getElementById("playerName").value.trim();
  const word = document.getElementById("wordInput").value.trim();
  const counterSpan = document.getElementById("playLeftCounter");

  if (!player || !word) {
    counterSpan.textContent = "กรุณากรอกชื่อและคำให้ครบ!";
    counterSpan.style.color = "#e74c3c";
    return;
  }

  const playerRef = db.ref("players/" + player);

  playerRef.once("value").then(snapshot => {
    const data = snapshot.val();
    const playCount = data?.playCount || 0;
    const playLeft = maxPlay - playCount;

    if (playLeft <= 0) {
      counterSpan.textContent = `(หมดโอกาสเล่นแล้ว)`;
      counterSpan.style.color = "#e74c3c";
      return;
    }

    const score = calculateScore(word);

    playerRef.set({
      word,
      score,
      playCount: playCount + 1,
      lastPlay: Date.now()
    });

    // อัพเดตตัวเลขหลังส่งคำ
    counterSpan.textContent = `(เหลือ ${playLeft - 1} ครั้ง)`;
    counterSpan.style.color = "#27ae60";

    // เคลียร์ input คำ
    document.getElementById("wordInput").value = "";
  });
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