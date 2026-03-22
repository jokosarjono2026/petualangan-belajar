'use strict';

// ── State Quiz ───────────────────────────────────────────────────────────────

let quizState = {
  lokasi:    null,
  level:     null,
  soalList:  [],
  current:   0,
  score:     0,
  answered:  false,
  results:   [],   // { benar: bool } per soal
};

// ── Load & mulai quiz ────────────────────────────────────────────────────────

async function startLevel(lokasiId, levelNum) {
  try {
    const res  = await fetch(`data/${lokasiId}_${levelNum}.json`);
    if (!res.ok) throw new Error('Soal belum tersedia');
    const soal = await res.json();

    // Acak urutan soal
    const shuffled = soal.sort(() => Math.random() - 0.5);

    quizState = {
      lokasi:   lokasiId,
      level:    levelNum,
      soalList: shuffled,
      current:  0,
      score:    0,
      answered: false,
      results:  [],
    };

    showScreen('quiz');
    renderQuiz();

  } catch (e) {
    showToast(`⚠️ ${e.message}`);
  }
}

// ── Render soal ──────────────────────────────────────────────────────────────

function renderQuiz() {
  const { soalList, current, score } = quizState;
  const total = soalList.length;
  const soal  = soalList[current];

  // Progress
  document.getElementById('quiz-progress-text').textContent = `${current + 1} / ${total}`;
  document.getElementById('quiz-progress-bar').style.width  = `${((current) / total) * 100}%`;
  document.getElementById('quiz-score').textContent = `✅ ${score}`;

  // Mata pelajaran badge
  document.getElementById('quiz-mapel').textContent = soal.mapel;

  // Soal
  document.getElementById('quiz-question').textContent = soal.soal;

  // Pilihan
  const optionsEl = document.getElementById('quiz-options');
  const labels    = ['A', 'B', 'C', 'D'];
  optionsEl.innerHTML = soal.pilihan.map((p, i) => `
    <button class="option-btn" id="opt-${i}" onclick="pilihJawaban(${i})">
      <span class="option-label">${labels[i]}</span>
      <span class="option-text">${p}</span>
    </button>
  `).join('');

  // Sembunyikan penjelasan & tombol lanjut
  document.getElementById('quiz-feedback').classList.add('hidden');
  document.getElementById('btn-next').classList.add('hidden');

  quizState.answered = false;
}

// ── Pilih jawaban ────────────────────────────────────────────────────────────

function pilihJawaban(idx) {
  if (quizState.answered) return;
  quizState.answered = true;

  const soal   = quizState.soalList[quizState.current];
  const benar  = idx === soal.jawaban;
  const labels = ['A', 'B', 'C', 'D'];

  if (benar) quizState.score++;
  quizState.results.push({ benar });

  // Warnai pilihan
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === soal.jawaban) btn.classList.add('correct');
    else if (i === idx && !benar) btn.classList.add('wrong');
  });

  // Feedback
  const feedbackEl = document.getElementById('quiz-feedback');
  feedbackEl.className = `quiz-feedback ${benar ? 'benar' : 'salah'}`;
  feedbackEl.innerHTML = `
    <div class="feedback-icon">${benar ? '✅' : '❌'}</div>
    <div class="feedback-result">${benar ? 'Benar!' : `Jawaban: ${labels[soal.jawaban]}`}</div>
    <div class="feedback-explain">${soal.penjelasan}</div>
  `;
  feedbackEl.classList.remove('hidden');
  document.getElementById('btn-next').classList.remove('hidden');
}

// ── Soal berikutnya ──────────────────────────────────────────────────────────

function nextSoal() {
  quizState.current++;
  if (quizState.current >= quizState.soalList.length) {
    showResult();
  } else {
    renderQuiz();
  }
}

// ── Hitung bintang ───────────────────────────────────────────────────────────

function hitungBintang(score, total) {
  const pct = score / total;
  if (pct >= 0.8) return 3;
  if (pct >= 0.6) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}

// ── Hasil quiz ───────────────────────────────────────────────────────────────

function showResult() {
  const { score, soalList, lokasi, level } = quizState;
  const total   = soalList.length;
  const bintang = hitungBintang(score, total);
  const xpGain  = bintang * 30 + score * 5;
  const lulus   = bintang > 0;

  // Simpan progress jika lulus
  if (lulus) saveProgress(lokasi, level, bintang, xpGain);

  // Render result
  document.getElementById('result-stars').textContent  = '⭐'.repeat(bintang) + '☆'.repeat(3 - bintang);
  document.getElementById('result-score').textContent  = `${score} / ${total} benar`;
  document.getElementById('result-xp').textContent     = lulus ? `+${xpGain} XP` : '';
  document.getElementById('result-msg').textContent    = resultMsg(bintang);

  const btnNext = document.getElementById('btn-result-next');
  if (lulus && level < 5) {
    btnNext.textContent = `Level ${level + 1} →`;
    btnNext.onclick     = () => startLevel(lokasi, level + 1);
    btnNext.style.display = 'block';
  } else if (lulus && level === 5) {
    btnNext.textContent = '🏆 Lokasi Selesai!';
    btnNext.onclick     = () => showScreen('map');
    btnNext.style.display = 'block';
  } else {
    btnNext.style.display = 'none';
  }

  showScreen('result');
}

function resultMsg(bintang) {
  if (bintang === 3) return '🎉 Luar biasa! Nilai sempurna!';
  if (bintang === 2) return '👍 Bagus! Terus semangat!';
  if (bintang === 1) return '😊 Lumayan! Bisa lebih baik lagi!';
  return '💪 Jangan menyerah, coba lagi!';
}

// ── Simpan progress ──────────────────────────────────────────────────────────

function saveProgress(lokasiId, level, bintang, xpGain) {
  if (!activeProfile) return;

  const lok = activeProfile.lokasi[lokasiId];

  // Update bintang hanya jika lebih tinggi dari sebelumnya
  const prevStars   = lok.bintang || 0;
  lok.bintang       = Math.max(prevStars, bintang);
  lok.level_done    = Math.max(lok.level_done || 0, level);

  // XP
  activeProfile.xp = (activeProfile.xp || 0) + xpGain;

  // Unlock lokasi berikutnya
  const UNLOCK_MAP = { sekolah: 'kebun', kebun: 'rumah', rumah: 'taman' };
  const next = UNLOCK_MAP[lokasiId];
  if (next && lok.bintang >= 3) {
    activeProfile.lokasi[next].unlocked = true;
  }

  // Simpan ke localStorage
  saveProfileData(activeProfile.name, activeProfile);

  // Update header map
  document.getElementById('map-xp').textContent = activeProfile.xp;
}

// ── Toast helper ─────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.createElement('div');
  t.className   = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
