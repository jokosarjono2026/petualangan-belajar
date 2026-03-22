'use strict';

// ── Konstanta ────────────────────────────────────────────────────────────────

const MAX_PROFILES   = 5;
const STORAGE_KEY    = 'edugame_profiles';
const ONBOARDING_KEY = 'edugame_onboarded';

// ── Security: escape HTML ─────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const AVATARS = [
  '🧑','👦','👧','🧒','👨','👩',
  '🐯','🦊','🐸','🐧','🦁','🐮',
  '🚀','⚽','🎮','🎨','📚','🎵',
];

// ── State ────────────────────────────────────────────────────────────────────

let selectedAvatar = '🧑';
let profileToDelete = null;
let activeProfile   = null;

// ── Storage helpers ──────────────────────────────────────────────────────────

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function getProfileData(name) {
  try {
    return JSON.parse(localStorage.getItem(`edugame_data_${name}`) || 'null');
  } catch {
    return null;
  }
}

function saveProfileData(name, data) {
  localStorage.setItem(`edugame_data_${name}`, JSON.stringify(data));
}

function newProfileData(name, avatar) {
  return {
    name,
    avatar,
    xp: 0,
    created_at: Date.now(),
    lokasi: {
      sekolah: { unlocked: true,  bintang: 0, level_done: 0 },
      kebun:   { unlocked: false, bintang: 0, level_done: 0 },
      rumah:   { unlocked: false, bintang: 0, level_done: 0 },
      taman:   { unlocked: false, bintang: 0, level_done: 0 },
    },
  };
}

// ── Screen router ────────────────────────────────────────────────────────────

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (name === 'profiles') renderProfiles();
  if (name === 'create')   renderAvatarGrid();
}

// ── Render: Profil grid ──────────────────────────────────────────────────────

function renderProfiles() {
  const profiles = getProfiles();
  const grid     = document.getElementById('profile-grid');

  let html = profiles.map(p => {
    const data  = getProfileData(p.name) || {};
    const xp    = data.xp || 0;
    const stars = totalStars(data);
    return `
      <div class="profile-card" onclick="selectProfile('${esc(p.name)}')">
        <div class="profile-avatar">${esc(p.avatar)}</div>
        <div class="profile-name">${esc(p.name)}</div>
        <div class="profile-stats">
          <span>⭐ ${xp} XP</span>
          <span>🌟 ${stars}</span>
        </div>
        <button class="profile-delete" onclick="deleteProfile(event,'${esc(p.name)}','${esc(p.avatar)}')">✕</button>
      </div>`;
  }).join('');

  if (profiles.length < MAX_PROFILES) {
    html += `
      <div class="profile-card add-card" onclick="showScreen('create')">
        <div class="profile-avatar">➕</div>
        <div class="profile-name">Pemain Baru</div>
      </div>`;
  }

  if (profiles.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎒</div>
        <div class="empty-text">Belum ada pemain.<br>Mulai petualanganmu!</div>
      </div>
      <div class="profile-card add-card" onclick="showScreen('create')">
        <div class="profile-avatar">➕</div>
        <div class="profile-name">Pemain Baru</div>
      </div>`;
    return;
  }

  grid.innerHTML = html;
}

function totalStars(data) {
  if (!data || !data.lokasi) return 0;
  return Object.values(data.lokasi).reduce((sum, l) => sum + (l.bintang || 0), 0);
}

// ── Render: Avatar grid ──────────────────────────────────────────────────────

function renderAvatarGrid() {
  selectedAvatar = '🧑';
  document.getElementById('input-name').value = '';
  document.getElementById('error-msg').textContent = '';
  document.getElementById('selected-avatar').textContent = selectedAvatar;

  const grid = document.getElementById('avatar-grid');
  grid.innerHTML = AVATARS.map(a => `
    <button class="avatar-btn ${a === selectedAvatar ? 'selected' : ''}"
            onclick="pickAvatar('${a}', this)">${a}</button>
  `).join('');
}

function pickAvatar(emoji, btn) {
  selectedAvatar = emoji;
  document.getElementById('selected-avatar').textContent = emoji;
  document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}

// ── Aksi: Buat profil baru ───────────────────────────────────────────────────

function createProfile() {
  const nameInput = document.getElementById('input-name');
  const errorEl   = document.getElementById('error-msg');
  const name      = nameInput.value.trim();

  errorEl.textContent = '';

  if (!name) {
    errorEl.textContent = 'Masukkan nama kamu dulu!';
    nameInput.focus();
    return;
  }

  const profiles = getProfiles();

  if (profiles.find(p => p.name.toLowerCase() === name.toLowerCase())) {
    errorEl.textContent = 'Nama ini sudah dipakai, pilih nama lain.';
    nameInput.focus();
    return;
  }

  profiles.push({ name, avatar: selectedAvatar });
  saveProfiles(profiles);
  saveProfileData(name, newProfileData(name, selectedAvatar));

  showScreen('profiles');
}

// ── Aksi: Pilih profil ───────────────────────────────────────────────────────

function selectProfile(name) {
  const profiles = getProfiles();
  const p        = profiles.find(x => x.name === name);
  if (!p) return;

  activeProfile = getProfileData(name);

  document.getElementById('map-avatar').textContent = p.avatar;
  document.getElementById('map-name').textContent   = p.name;
  document.getElementById('map-xp').textContent     = activeProfile.xp || 0;

  showScreen('map');
}

// ── Aksi: Hapus profil ───────────────────────────────────────────────────────

function deleteProfile(event, name, avatar) {
  event.stopPropagation();
  profileToDelete = name;
  document.getElementById('delete-avatar').textContent = esc(avatar);
  document.getElementById('delete-name').textContent   = esc(name);
  showScreen('delete');
}

function confirmDelete() {
  if (!profileToDelete) return;
  const profiles = getProfiles().filter(p => p.name !== profileToDelete);
  saveProfiles(profiles);
  localStorage.removeItem(`edugame_data_${profileToDelete}`);
  profileToDelete = null;
  showScreen('profiles');
}

// ── Onboarding ───────────────────────────────────────────────────────────────

let _onboardSlide = 0;
const ONBOARD_TOTAL = 4;

function nextOnboardingSlide() {
  const slides = document.querySelectorAll('.onboarding-slide');
  const dots   = document.querySelectorAll('.dot');
  const btn    = document.getElementById('btn-onboard-next');

  slides[_onboardSlide].classList.remove('active');
  dots[_onboardSlide].classList.remove('active');

  _onboardSlide++;

  if (_onboardSlide >= ONBOARD_TOTAL) {
    finishOnboarding();
    return;
  }

  slides[_onboardSlide].classList.add('active');
  dots[_onboardSlide].classList.add('active');

  if (_onboardSlide === ONBOARD_TOTAL - 1) {
    btn.textContent = 'Mulai! 🚀';
  }
}

function finishOnboarding() {
  localStorage.setItem(ONBOARDING_KEY, '1');
  _onboardSlide = 0;
  showScreen('profiles');
}

// ── Init ─────────────────────────────────────────────────────────────────────

if (!localStorage.getItem(ONBOARDING_KEY)) {
  showScreen('onboarding');
} else {
  renderProfiles();
}
