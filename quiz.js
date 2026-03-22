'use strict';

// ── State Quiz ───────────────────────────────────────────────────────────────

let quizState = {
  lokasi:       null,
  level:        null,
  soalList:     [],
  current:      0,
  score:        0,
  answered:     false,
  results:      [],   // { benar: bool } per soal
  streak:       0,    // jawaban benar berturut-turut
  streakBonus:  0,    // XP bonus dari combo
};

// ── Load & mulai quiz ────────────────────────────────────────────────────────

async function startLevel(lokasiId, levelNum) {
  try {
    const res  = await fetch(`data/${lokasiId}_${levelNum}.json`);
    if (!res.ok) throw new Error('Soal belum tersedia');
    const soal = await res.json();

    // Acak urutan soal, ambil 10 soal dari pool
    const shuffled = soal.sort(() => Math.random() - 0.5).slice(0, 10);

    quizState = {
      lokasi:      lokasiId,
      level:       levelNum,
      soalList:    shuffled,
      current:     0,
      score:       0,
      answered:    false,
      results:     [],
      streak:      0,
      streakBonus: 0,
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
    <button class="option-btn" id="opt-${i}" onclick="pilihJawaban(${i})"
      aria-label="Pilihan ${labels[i]}: ${p.replace(/"/g, '&quot;')}">
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

  // Update streak
  if (benar) {
    quizState.streak++;
  } else {
    quizState.streak = 0;
  }

  // Feedback
  const feedbackEl = document.getElementById('quiz-feedback');
  feedbackEl.className = `quiz-feedback ${benar ? 'benar' : 'salah'}`;

  const comboBadge = (benar && quizState.streak >= 3)
    ? ` <span class="combo-badge">🔥 COMBO x${quizState.streak}</span>` : '';

  feedbackEl.innerHTML = `
    <div class="feedback-icon">${benar ? '✅' : '❌'}${comboBadge}</div>
    <div class="feedback-result">${benar ? 'Benar!' : `Jawaban: ${labels[soal.jawaban]}`}</div>
    <div class="feedback-explain">${soal.penjelasan}</div>
  `;
  feedbackEl.classList.remove('hidden');
  document.getElementById('btn-next').classList.remove('hidden');

  // Auto-scroll ke btn-next
  setTimeout(() => {
    const screen = document.getElementById('screen-quiz');
    screen.scrollTo({ top: screen.scrollHeight, behavior: 'smooth' });
  }, 80);

  // Cek milestone (delay agar scroll selesai dulu)
  setTimeout(() => checkMilestone(), 400);
}

// ── Milestone & Surprise ─────────────────────────────────────────────────────

const MILESTONES = {
  2: { emoji: '🔥', title: 'Keren!',         sub: '3 soal selesai, tetap fokus!' },
  4: { emoji: '⭐', title: 'Setengah jalan!', sub: 'Kamu sudah sampai soal ke-5!' },
  7: { emoji: '💪', title: 'Hampir selesai!', sub: 'Tinggal 3 soal lagi, ayo!' },
};

const COMBO_MILESTONES = {
  3: { emoji: '🔥', title: 'COMBO x3!',  sub: '+15 XP Bonus!' },
  5: { emoji: '🚀', title: 'COMBO x5!',  sub: '+25 XP Bonus! Luar biasa!' },
  7: { emoji: '👑', title: 'COMBO x7!',  sub: '+35 XP Bonus! Jenius!' },
  10:{ emoji: '🏆', title: 'PERFECT!',   sub: 'Semua benar! +50 XP Bonus!' },
};

function checkMilestone() {
  const { current, streak } = quizState;

  // Combo milestone
  if (streak > 0 && COMBO_MILESTONES[streak]) {
    const m = COMBO_MILESTONES[streak];
    const bonus = streak * 5;
    quizState.streakBonus += bonus;
    showMilestone(m.emoji, m.title, m.sub);
    return;
  }

  // Progress milestone
  if (MILESTONES[current]) {
    const m = MILESTONES[current];
    showMilestone(m.emoji, m.title, m.sub);
  }
}

function showMilestone(emoji, title, sub) {
  const el = document.createElement('div');
  el.className = 'milestone-popup';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', `${title} — ${sub}`);
  el.innerHTML = `
    <div class="milestone-emoji">${emoji}</div>
    <div class="milestone-title">${title}</div>
    <div class="milestone-sub">${sub}</div>
  `;
  // Tap to dismiss
  el.addEventListener('click', () => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 300);
  });
  document.body.appendChild(el);

  // Auto-remove setelah 1.2 detik
  setTimeout(() => {
    if (document.body.contains(el)) {
      el.classList.add('hiding');
      setTimeout(() => el.remove(), 300);
    }
  }, 1200);
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
  const { score, soalList, lokasi, level, streakBonus } = quizState;
  const total   = soalList.length;
  const bintang = hitungBintang(score, total);
  const xpGain  = bintang * 30 + score * 5 + streakBonus;
  const lulus   = bintang > 0;

  // Simpan progress jika lulus
  if (lulus) saveProgress(lokasi, level, bintang, xpGain);

  // Render result
  document.getElementById('result-stars').textContent  = '⭐'.repeat(bintang) + '☆'.repeat(3 - bintang);
  document.getElementById('result-score').textContent  = `${score} / ${total} benar`;
  document.getElementById('result-xp').textContent     = lulus
    ? `+${xpGain} XP${streakBonus > 0 ? ` (termasuk +${streakBonus} combo bonus!)` : ''}`
    : '';
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

  // Tampilkan upgrade screen setelah level 2 selesai di tiap lokasi
  if (lulus && level === 2) {
    setTimeout(() => showUpgradeScreen(lokasi), 800);
  }
}

// ── Upgrade Screen ────────────────────────────────────────────────────────────

const LOKASI_LABEL = {
  sekolah: 'SEKOLAH',
  kebun:   'KEBUN',
  rumah:   'RUMAH',
  taman:   'TAMAN',
};

function showUpgradeScreen(lokasiId) {
  const label = LOKASI_LABEL[lokasiId] || lokasiId.toUpperCase();
  document.getElementById('upgrade-congrats').textContent  = `Level 2 ${label} Selesai! 🎉`;
  document.getElementById('upgrade-subtitle').textContent  = `Kamu telah menyelesaikan semua soal di Lokasi ${label}.`;
  document.getElementById('upgrade-subject').textContent   = `UPGRADE ${label}`;
  showScreen('upgrade');
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
