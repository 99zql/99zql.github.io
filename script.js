/* ======================================================
   Tudo neste site é configurado pelo arquivo config.json
   na raiz do projeto. Edite aquele arquivo, não este.
====================================================== */

let CONFIG = null;
let playlist = [];

fetch('config.json')
  .then(res => res.json())
  .then(config => {
    CONFIG = config;
    playlist = config.playlist || [];
    applyTheme(config.theme || {});
    renderProfile(config);
    renderSocials(config.socials || []);
    renderAbout(config.about || {});
    renderExperiences(config.experiences || []);
    renderMedia(config.media || []);
    initPlayer(config.theme || {});
    bindMediaClicks();
  })
  .catch(err => {
    console.error('Falha ao carregar config.json', err);
  });

/* ================= THEME ================= */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme.accentColor) root.style.setProperty('--accent', theme.accentColor);
  if (theme.accentColor2) root.style.setProperty('--accent-2', theme.accentColor2);
  if (theme.backgroundDarkness !== undefined) root.style.setProperty('--bg-darkness', theme.backgroundDarkness);
  if (theme.glassOpacity !== undefined) root.style.setProperty('--glass-opacity', theme.glassOpacity);
  if (theme.glassBlur !== undefined) root.style.setProperty('--glass-blur', theme.glassBlur + 'px');
}

/* ================= PROFILE HEADER ================= */
function renderProfile(config) {
  const p = config.profile || {};
  document.getElementById('userNick').textContent = p.nick || '';
  document.getElementById('userTagline').textContent = p.tagline || '';
  document.getElementById('user-avatar').src = p.avatar || '';
  document.getElementById('bgLayer').style.backgroundImage = p.background ? `url('${p.background}')` : 'none';
  document.title = p.nick || 'perfil';
}

/* ================= SOCIALS ================= */
function renderSocials(socials) {
  const row = document.getElementById('socialRow');
  row.innerHTML = '';
  socials.forEach(s => {
    const a = document.createElement('a');
    a.className = 'social-btn';
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = s.platform;
    a.innerHTML = `<i class="bi ${s.icon}"></i>`;
    row.appendChild(a);
  });
}

/* ================= ABOUT ================= */
function renderAbout(about) {
  document.getElementById('sobreText').innerHTML = about.html || '';
  const tagsEl = document.getElementById('sobreTags');
  tagsEl.innerHTML = '';
  (about.tags || []).forEach(tag => {
    const span = document.createElement('span');
    span.className = 'sobre-tag';
    span.textContent = tag;
    tagsEl.appendChild(span);
  });
}

/* ================= EXPERIENCES ================= */
function renderExperiences(experiences) {
  const list = document.getElementById('expList');
  list.innerHTML = '';
  experiences.forEach((exp, i) => {
    const isLast = i === experiences.length - 1;
    const item = document.createElement('div');
    item.className = 'exp-item';
    item.innerHTML = `
      <div class="exp-dot-col"><div class="exp-dot"></div>${isLast ? '' : '<div class="exp-line"></div>'}</div>
      <div class="exp-body">
        <p class="exp-company">${exp.title || ''}</p>
        <p class="exp-role">${exp.role || ''}</p>
        <p class="exp-period">${exp.period || ''}</p>
        <p class="exp-desc">${exp.desc || ''}</p>
      </div>`;
    list.appendChild(item);
  });
}

/* ================= MEDIA GRID ================= */
function renderMedia(media) {
  const grid = document.getElementById('midiasGrid');
  grid.innerHTML = '';
  media.forEach(src => {
    const item = document.createElement('div');
    item.className = 'midia-item';
    item.innerHTML = `<img src="${src}" alt="" loading="lazy">`;
    grid.appendChild(item);
  });
}

/* ================= TABS ================= */
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
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

function updateVolIcon() {
  if (audio.volume === 0) mpVolIcon.className = 'bi bi-volume-mute mp-vol-icon';
  else if (audio.volume < 0.5) mpVolIcon.className = 'bi bi-volume-down mp-vol-icon';
  else mpVolIcon.className = 'bi bi-volume-up mp-vol-icon';
}

function initPlayer(theme) {
  audio.volume = theme.defaultVolume !== undefined ? theme.defaultVolume : 0.6;
  mpVolume.value = Math.round(audio.volume * 100);
  updateVolIcon();
  if (playlist.length) loadTrack(0);
}

function loadTrack(index) {
  if (!playlist.length) return;
  currentTrack = (index + playlist.length) % playlist.length;
  const track = playlist[currentTrack];
  audio.src = track.file;
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

mpVolume.addEventListener('input', () => {
  audio.volume = mpVolume.value / 100;
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

mpToggle.addEventListener('click', () => {
  if (!audio.src) return;
  if (audio.paused) {
    playTrack();
    userPausedManually = false;
  } else {
    pauseTrack();
    userPausedManually = true;
  }
});

document.getElementById('mp-prev').addEventListener('click', () => {
  loadTrack(currentTrack - 1);
  if (!userPausedManually) {
    const h = () => { audio.removeEventListener('canplay', h); playTrack(); };
    audio.addEventListener('canplay', h);
  }
});

document.getElementById('mp-next').addEventListener('click', () => {
  loadTrack(currentTrack + 1);
  if (!userPausedManually) {
    const h = () => { audio.removeEventListener('canplay', h); playTrack(); };
    audio.addEventListener('canplay', h);
  }
});

audio.addEventListener('ended', () => {
  loadTrack(currentTrack + 1);
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

function bindMediaClicks() {
  document.querySelectorAll('.midia-item img').forEach(img => {
    img.addEventListener('click', () => openLightbox(img.src));
  });
}

lbBackdrop.addEventListener('click', closeLightbox);
lbClose.addEventListener('click', closeLightbox);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
});
