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

let currentTrack = 0;
let userPausedManually = true;

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

/* ================= VIEWS COUNTER ================= */
const VIEWS_NAMESPACE = '99zql-profile-9f3a';
const viewsCount = document.getElementById('viewsCount');

fetch(`https://api.counterapi.dev/v1/${VIEWS_NAMESPACE}/views/up`)
  .then(res => res.json())
  .then(data => { viewsCount.textContent = data.count ?? '—'; })
  .catch(() => { viewsCount.textContent = '—'; });
