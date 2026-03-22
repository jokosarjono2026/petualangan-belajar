'use strict';

// ── Definisi Lokasi ──────────────────────────────────────────────────────────

const LOKASI = [
  {
    id:       'sekolah',
    nama:     'Sekolah',
    emoji:    '🏫',
    subjects: ['📐 Matematika', '📖 B. Indonesia'],
    color:    '#7C3AED',
    gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)',
    unlock_after: null,   // selalu terbuka
    unlock_min_stars: 0,
  },
  {
    id:       'kebun',
    nama:     'Kebun',
    emoji:    '🌿',
    subjects: ['🔬 IPA'],
    color:    '#16A34A',
    gradient: 'linear-gradient(135deg, #16A34A, #15803D)',
    unlock_after: 'sekolah',
    unlock_min_stars: 3,  // butuh ≥3 bintang di Sekolah
  },
  {
    id:       'rumah',
    nama:     'Rumah',
    emoji:    '🏠',
    subjects: ['🌏 IPS'],
    color:    '#D97706',
    gradient: 'linear-gradient(135deg, #D97706, #B45309)',
    unlock_after: 'kebun',
    unlock_min_stars: 3,
  },
  {
    id:       'taman',
    nama:     'Taman',
    emoji:    '🌳',
    subjects: ['🗣️ B. Inggris'],
    color:    '#0EA5E9',
    gradient: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
    unlock_after: 'rumah',
    unlock_min_stars: 3,
  },
];

const LEVELS_PER_LOKASI = 5;
const STARS_PER_LEVEL   = 3;

// ── Render: Peta ─────────────────────────────────────────────────────────────

function renderMap() {
  const data    = activeProfile;
  const lokasiEl = document.getElementById('map-locations');
  if (!data) return;

  lokasiEl.innerHTML = LOKASI.map((lok, i) => {
    const progres  = data.lokasi[lok.id] || { unlocked: false, bintang: 0, level_done: 0 };
    const unlocked = progres.unlocked;
    const stars    = progres.bintang || 0;
    const maxStars = LEVELS_PER_LOKASI * STARS_PER_LEVEL;
    const pct      = Math.min((stars / maxStars) * 100, 100);
    const isDone   = stars >= maxStars;

    // Connector ke lokasi berikutnya
    const connector = i < LOKASI.length - 1
      ? `<div class="map-connector ${unlocked ? '' : 'locked-connector'}">
           <div class="connector-dots"></div>
         </div>`
      : '';

    if (!unlocked) {
      const prev = LOKASI[i - 1];
      return `
        ${connector}
        <div class="loc-card locked">
          <div class="loc-lock">🔒</div>
          <div class="loc-emoji">${lok.emoji}</div>
          <div class="loc-name">${lok.nama}</div>
          <div class="loc-unlock-hint">Kumpulkan ${lok.unlock_min_stars}⭐ di ${prev?.nama || ''}</div>
        </div>`;
    }

    return `
      ${connector}
      <div class="loc-card unlocked" style="--loc-color:${lok.color};--loc-grad:${lok.gradient}"
           onclick="openLokasi('${lok.id}')">
        <div class="loc-badge ${isDone ? 'done' : ''}">${isDone ? '✅' : `${stars}/${maxStars}⭐`}</div>
        <div class="loc-emoji">${lok.emoji}</div>
        <div class="loc-name">${lok.nama}</div>
        <div class="loc-subjects">${lok.subjects.join(' · ')}</div>
        <div class="loc-progress-wrap">
          <div class="loc-progress-bar" style="width:${pct}%"></div>
        </div>
      </div>`;
  }).reverse().join(''); // reverse agar Sekolah di atas (posisi 1)
}

// ── Render: Level list ───────────────────────────────────────────────────────

function openLokasi(lokasiId) {
  const lok     = LOKASI.find(l => l.id === lokasiId);
  const progres = activeProfile.lokasi[lokasiId];
  if (!lok || !progres) return;

  currentLokasi = lokasiId;

  document.getElementById('levels-location-name').textContent = `${lok.emoji} ${lok.nama}`;
  document.getElementById('levels-subjects').textContent = lok.subjects.join(' · ');

  const listEl = document.getElementById('levels-list');
  listEl.innerHTML = Array.from({ length: LEVELS_PER_LOKASI }, (_, i) => {
    const levelNum  = i + 1;
    const isDone    = levelNum <= (progres.level_done || 0);
    const isNext    = levelNum === (progres.level_done || 0) + 1;
    const isLocked  = !isDone && !isNext;
    const stars     = isDone ? STARS_PER_LEVEL : 0; // TODO: simpan bintang per level
    const starsHtml = '★'.repeat(stars) + '☆'.repeat(STARS_PER_LEVEL - stars);

    let cls = 'level-card';
    if (isDone)   cls += ' done';
    if (isNext)   cls += ' next';
    if (isLocked) cls += ' locked';

    const label = isDone ? 'Selesai' : isNext ? 'Mulai →' : '🔒';

    return `
      <div class="${cls}" ${!isLocked ? `onclick="startLevel('${lokasiId}', ${levelNum})"` : ''}>
        <div class="level-num">Level ${levelNum}</div>
        <div class="level-stars">${starsHtml}</div>
        <div class="level-label">${label}</div>
      </div>`;
  }).join('');

  showScreen('levels');
}

// ── Quit quiz ────────────────────────────────────────────────────────────────

let currentLokasi = null;

function confirmQuit() {
  if (confirm('Keluar dari quiz? Progress soal ini tidak akan disimpan.')) {
    showScreen('map');
  }
}

// ── Patch showScreen untuk render map ────────────────────────────────────────

const _origShowScreen = showScreen;
window.showScreen = function(name) {
  _origShowScreen(name);
  if (name === 'map') renderMap();
};
