/* ======================================================
   PLAYLIST
   Adicione/remova faixas aqui. Os arquivos ficam em
   assets/music/. O player toca em sequência automaticamente.
====================================================== */
const PLAYLIST = [
  { title: "faixa-01", file: "assets/music/track1.mp3" },
  { title: "faixa-02", file: "assets/music/track2.mp3" },
  { title: "faixa-03", file: "assets/music/track3.mp3" },
];

/* ======================================================
   PLAYER
====================================================== */
const audio = document.getElementById("audio");
const player = document.getElementById("player");
const playerToggle = document.getElementById("playerToggle");
const playBtn = document.getElementById("playBtn");
const playIcon = document.getElementById("playIcon");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const seek = document.getElementById("seek");
const curTime = document.getElementById("curTime");
const durTime = document.getElementById("durTime");
const trackTitle = document.getElementById("trackTitle");
const trackSub = document.getElementById("trackSub");
const playerPlaylist = document.getElementById("playerPlaylist");

let currentIndex = 0;
let isPlaying = false;

function fmtTime(sec) {
  if (!isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function renderPlaylist() {
  playerPlaylist.innerHTML = "";
  PLAYLIST.forEach((track, i) => {
    const item = document.createElement("div");
    item.className = "pl-item" + (i === currentIndex ? " active" : "");
    item.innerHTML = `<span class="pl-index">${(i + 1).toString().padStart(2, "0")}</span><span>${track.title}</span>`;
    item.addEventListener("click", () => loadTrack(i, true));
    playerPlaylist.appendChild(item);
  });
}

function loadTrack(index, autoplay) {
  currentIndex = (index + PLAYLIST.length) % PLAYLIST.length;
  const track = PLAYLIST[currentIndex];
  audio.src = track.file;
  trackTitle.textContent = track.title;
  trackSub.textContent = `faixa ${currentIndex + 1} de ${PLAYLIST.length}`;
  renderPlaylist();
  if (autoplay) {
    audio.play().then(() => setPlayingState(true)).catch(() => setPlayingState(false));
  }
}

function setPlayingState(playing) {
  isPlaying = playing;
  playIcon.innerHTML = playing
    ? '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>'
    : '<path d="M8 5v14l11-7-11-7Z"/>';
}

playBtn.addEventListener("click", () => {
  if (!audio.src) { loadTrack(0, true); return; }
  if (isPlaying) {
    audio.pause();
    setPlayingState(false);
  } else {
    audio.play().then(() => setPlayingState(true)).catch(() => {});
  }
});

prevBtn.addEventListener("click", () => loadTrack(currentIndex - 1, true));
nextBtn.addEventListener("click", () => loadTrack(currentIndex + 1, true));

audio.addEventListener("ended", () => loadTrack(currentIndex + 1, true));

audio.addEventListener("timeupdate", () => {
  if (!isFinite(audio.duration)) return;
  seek.value = (audio.currentTime / audio.duration) * 100;
  curTime.textContent = fmtTime(audio.currentTime);
  durTime.textContent = fmtTime(audio.duration);
});

seek.addEventListener("input", () => {
  if (!isFinite(audio.duration)) return;
  audio.currentTime = (seek.value / 100) * audio.duration;
});

playerToggle.addEventListener("click", () => {
  player.classList.toggle("open");
});

renderPlaylist();
if (PLAYLIST.length) {
  const first = PLAYLIST[0];
  trackTitle.textContent = first.title;
  trackSub.textContent = `faixa 1 de ${PLAYLIST.length}`;
}

/* ======================================================
   VIEWS COUNTER
   Usa a API pública e gratuita do CounterAPI (sem backend
   próprio). Troque "99zql-profile" pelo seu próprio namespace
   caso queira isolar o contador.
====================================================== */
const VIEWS_NAMESPACE = "99zql-profile-9f3a";
const viewsCount = document.getElementById("viewsCount");

fetch(`https://api.counterapi.dev/v1/${VIEWS_NAMESPACE}/views/up`)
  .then((res) => res.json())
  .then((data) => {
    viewsCount.textContent = data.count ?? "—";
  })
  .catch(() => {
    viewsCount.textContent = "—";
  });
