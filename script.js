/* ======================================================
   PLAYLIST — edite aqui pra adicionar/trocar faixas
====================================================== */
const playlist = [
  { src: 'assets/music/track1.mp3', title: 'faixa 01', cover: 'assets/music/covers/1.jpg' },
  { src: 'assets/music/track2.mp3', title: 'faixa 02', cover: 'assets/music/covers/2.jpg' },
  { src: 'assets/music/track3.mp3', title: 'faixa 03', cover: 'assets/music/covers/3.jpg' },
];

/* ================= TABS ================= */
const catBtns = document.querySelectorAll('.cat-btn');
const panels = document.querySelectorAll('.content-panel');

catBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    catBtns.forEach(b => b.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panel-' + btn.dataset.tab)?.classList.add('active');
  });
});

/* ================= MUSIC PLAYER ================= */
const audio = document.getElementById('audio');
const mpToggle = document.getElementById('mp-toggle');
const mpIcon = document.getElementById('mp-icon');
const mpDisc = document.getElementById('mp-disc');
const mpTitleEl = document.getElementById('mp-title');
const mpCoverArt = document.getElementById('mp-cover-art');
const mpSeek = document.getElementById('mp-seek');
const mpCurTime = document.getElementById('mp-curtime');
const mpDurTime = document.getElementById('mp-durtime');
const mpVolume = document.getElementById('mp-volume');
const mpVolIcon = document.getElementById('mp-vol-icon');

let currentTrack = 0;
let userPausedManually = true;
let isSeeking = false;

function fmtTime(sec) {
  if (!isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const savedVolume = localStorage.getItem('player-volume');
audio.volume = savedVolume !== null ? parseFloat(savedVolume) : 0.6;
mpVolume.value = Math.round(audio.volume * 100);
updateVolIcon();

function updateVolIcon() {
  if (audio.volume === 0) mpVolIcon.className = 'bi bi-volume-mute mp-vol-icon';
  else if (audio.volume < 0.5) mpVolIcon.className = 'bi bi-volume-down mp-vol-icon';
  else mpVolIcon.className = 'bi bi-volume-up mp-vol-icon';
}

mpVolume.addEventListener('input', () => {
  audio.volume = mpVolume.value / 100;
  localStorage.setItem('player-volume', audio.volume);
  updateVolIcon();
});

audio.addEventListener('loadedmetadata', () => {
  mpDurTime.textContent = fmtTime(audio.duration);
});

audio.addEventListener('timeupdate', () => {
  if (isSeeking || !isFinite(audio.duration)) return;
  mpSeek.value = (audio.currentTime / audio.duration) * 100;
  mpCurTime.textContent = fmtTime(audio.currentTime);
  mpDurTime.textContent = fmtTime(audio.duration);
});

mpSeek.addEventListener('input', () => { isSeeking = true; });
mpSeek.addEventListener('change', () => {
  if (isFinite(audio.duration)) {
    audio.currentTime = (mpSeek.value / 100) * audio.duration;
  }
  isSeeking = false;
});

function loadTrack(index) {
  const track = playlist[index];
  audio.src = track.src;
  audio.load();
  mpTitleEl.textContent = track.title || 'música';
  if (track.cover) {
    mpCoverArt.src = track.cover;
    mpCoverArt.classList.add('visible');
  } else {
    mpCoverArt.classList.remove('visible');
    mpCoverArt.src = '';
  }
}

function playTrack() {
  audio.play().catch(() => {});
  mpIcon.className = 'bi bi-pause-fill';
  mpDisc.classList.add('spinning');
}

function pauseTrack() {
  audio.pause();
  mpIcon.className = 'bi bi-play-fill';
  mpDisc.classList.remove('spinning');
}

loadTrack(currentTrack);

mpToggle.addEventListener('click', () => {
  if (audio.paused) {
    playTrack();
    userPausedManually = false;
  } else {
    pauseTrack();
    userPausedManually = true;
  }
});

document.getElementById('mp-prev').addEventListener('click', () => {
  currentTrack = (currentTrack - 1 + playlist.length) % playlist.length;
  loadTrack(currentTrack);
  if (!userPausedManually) {
    const h = () => { audio.removeEventListener('canplay', h); playTrack(); };
    audio.addEventListener('canplay', h);
  }
});

document.getElementById('mp-next').addEventListener('click', () => {
  currentTrack = (currentTrack + 1) % playlist.length;
  loadTrack(currentTrack);
  if (!userPausedManually) {
    const h = () => { audio.removeEventListener('canplay', h); playTrack(); };
    audio.addEventListener('canplay', h);
  }
});

audio.addEventListener('ended', () => {
  currentTrack = (currentTrack + 1) % playlist.length;
  loadTrack(currentTrack);
  const h = () => { audio.removeEventListener('canplay', h); playTrack(); };
  audio.addEventListener('canplay', h);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (!audio.paused) pauseTrack(); }
  else { if (!userPausedManually && audio.paused) playTrack(); }
});
window.addEventListener('blur', () => { if (!audio.paused) pauseTrack(); });
window.addEventListener('focus', () => { if (!userPausedManually && audio.paused) playTrack(); });

/* ================= LIGHTBOX ================= */
const lightbox = document.getElementById('lightbox');
const lbImg = document.getElementById('lb-img');
const lbBackdrop = document.getElementById('lb-backdrop');
const lbClose = document.getElementById('lb-close');

function openLightbox(src) {
  lbImg.src = src;
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lbImg.src = '';
  document.body.style.overflow = '';
}

document.querySelectorAll('.midia-item img').forEach(img => {
  img.addEventListener('click', () => openLightbox(img.src));
});

lbBackdrop.addEventListener('click', closeLightbox);
lbClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
});

/* ================= SETTINGS ================= */
const DEFAULTS = {
  accent: '#5fb8ff',
  accent2: '#7c6aff',
  bgDarkness: 58,
  glassOpacity: 55,
  glassBlur: 22,
};

const root = document.documentElement;
const settingsPanel = document.getElementById('settingsPanel');
const settingsToggle = document.getElementById('settingsToggle');
const settingsClose = document.getElementById('settingsClose');
const settingsReset = document.getElementById('settingsReset');

const accentColorInput = document.getElementById('accentColor');
const accentColor2Input = document.getElementById('accentColor2');
const bgDarknessInput = document.getElementById('bgDarkness');
const bgDarknessVal = document.getElementById('bgDarknessVal');
const glassOpacityInput = document.getElementById('glassOpacity');
const glassOpacityVal = document.getElementById('glassOpacityVal');
const glassBlurInput = document.getElementById('glassBlur');
const glassBlurVal = document.getElementById('glassBlurVal');

function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('profile-settings') || '{}');
  return { ...DEFAULTS, ...saved };
}

function saveSettings(settings) {
  localStorage.setItem('profile-settings', JSON.stringify(settings));
}

function applySettings(settings) {
  root.style.setProperty('--accent', settings.accent);
  root.style.setProperty('--accent-2', settings.accent2);
  root.style.setProperty('--bg-darkness', settings.bgDarkness / 100);
  root.style.setProperty('--glass-opacity', settings.glassOpacity / 100);
  root.style.setProperty('--glass-blur', settings.glassBlur + 'px');

  accentColorInput.value = settings.accent;
  accentColor2Input.value = settings.accent2;
  bgDarknessInput.value = settings.bgDarkness;
  bgDarknessVal.textContent = settings.bgDarkness + '%';
  glassOpacityInput.value = settings.glassOpacity;
  glassOpacityVal.textContent = settings.glassOpacity + '%';
  glassBlurInput.value = settings.glassBlur;
  glassBlurVal.textContent = settings.glassBlur + 'px';
}

let currentSettings = loadSettings();
applySettings(currentSettings);

function updateSetting(key, value) {
  currentSettings[key] = value;
  applySettings(currentSettings);
  saveSettings(currentSettings);
}

accentColorInput.addEventListener('input', () => updateSetting('accent', accentColorInput.value));
accentColor2Input.addEventListener('input', () => updateSetting('accent2', accentColor2Input.value));
bgDarknessInput.addEventListener('input', () => updateSetting('bgDarkness', parseInt(bgDarknessInput.value)));
glassOpacityInput.addEventListener('input', () => updateSetting('glassOpacity', parseInt(glassOpacityInput.value)));
glassBlurInput.addEventListener('input', () => updateSetting('glassBlur', parseInt(glassBlurInput.value)));

settingsReset.addEventListener('click', () => {
  currentSettings = { ...DEFAULTS };
  applySettings(currentSettings);
  saveSettings(currentSettings);
});

settingsToggle.addEventListener('click', () => settingsPanel.classList.add('open'));
settingsClose.addEventListener('click', () => settingsPanel.classList.remove('open'));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && settingsPanel.classList.contains('open')) {
    settingsPanel.classList.remove('open');
  }
});
