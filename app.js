const shell = document.querySelector('.app-shell');
const canvas = document.getElementById('rainCanvas');
const ctx = canvas.getContext('2d');
let drops = [];
let rainOn = true;
let rainVolume = 0.42;
let audioContext;
let noiseSource;
let noiseGain;
let focusSeconds = 25 * 60;
let focusInterval;
let layoutUpdateFrame;

const mediaLibrary = [
  { title: 'Rain on window', meta: 'Pluie douce · 01:42:08', type: 'ambiance' },
  { title: 'Café calme', meta: 'Ambiance · 00:58:20', type: 'ambiance' },
  { title: 'Forêt après la pluie', meta: 'Nature · 02:10:12', type: 'ambiance' },
  { title: 'Bruit blanc léger', meta: 'Concentration · 01:00:00', type: 'ambiance' },
  { title: 'Piano du matin', meta: 'Instrumental · 00:46:31', type: 'musique' }
];

function resizeRain() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  drops = Array.from({ length: Math.floor(canvas.width / 9) }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    length: 8 + Math.random() * 18,
    speed: 4 + Math.random() * 7,
    opacity: 0.08 + Math.random() * 0.2
  }));
}
function drawRain() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (rainOn) {
    ctx.strokeStyle = '#b8ded0';
    ctx.lineWidth = 1;
    drops.forEach(drop => {
      ctx.globalAlpha = drop.opacity * rainVolume * 2;
      ctx.beginPath(); ctx.moveTo(drop.x, drop.y); ctx.lineTo(drop.x - 2, drop.y + drop.length); ctx.stroke();
      drop.y += drop.speed;
      if (drop.y > canvas.height) { drop.y = -drop.length; drop.x = Math.random() * canvas.width; }
    });
  }
  requestAnimationFrame(drawRain);
}
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.classList.add('show');
  window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 2200);
}
function startRainAudio() {
  audioContext ??= new AudioContext();
  if (noiseSource) return;
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 2, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.12;
  noiseSource = audioContext.createBufferSource(); noiseSource.buffer = buffer; noiseSource.loop = true;
  const filter = audioContext.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
  noiseGain = audioContext.createGain(); noiseGain.gain.value = rainVolume * 0.32;
  noiseSource.connect(filter).connect(noiseGain).connect(audioContext.destination); noiseSource.start();
}
function setRain(value) {
  rainVolume = Number(value) / 100;
  if (noiseGain) noiseGain.gain.value = rainVolume * 0.32;
}
document.getElementById('rainVolume').addEventListener('input', event => setRain(event.target.value));
document.getElementById('rainToggle').addEventListener('click', event => { rainOn = !rainOn; event.currentTarget.textContent = rainOn ? 'Ⅱ' : '▶'; showToast(rainOn ? 'La pluie reprend' : 'Pluie en pause'); });
document.getElementById('muteRain').addEventListener('click', () => { rainOn = false; document.getElementById('rainToggle').textContent = '▶'; setRain(0); showToast('Ambiance coupée'); });
document.getElementById('soundButton').addEventListener('click', () => { startRainAudio(); rainOn = !rainOn; setRain(rainOn ? 42 : 0); showToast(rainOn ? 'Ambiance activée' : 'Ambiance coupée'); });

document.getElementById('layoutButton').addEventListener('click', () => {
  const layouts = ['full', 'compact', 'mini']; const current = layouts.indexOf(shell.dataset.layout);
  const next = layouts[(current + 1) % layouts.length]; shell.dataset.layout = next;
  document.getElementById('layoutButton').title = next === 'full' ? 'Format plein écran' : next === 'compact' ? 'Format 640 x 480' : 'Format mini fenêtre';
  showToast(next === 'full' ? 'Plein écran' : next === 'compact' ? 'Fenêtre 640 x 480' : 'Mini fenêtre');
});

function setLayoutForSize() {
  const width = shell.getBoundingClientRect().width;
  const height = shell.getBoundingClientRect().height;
  const next = width <= 410 ? 'mini' : width <= 700 || height <= 520 ? 'compact' : 'full';
  if (shell.dataset.layout !== next) shell.dataset.layout = next;
}
const layoutObserver = new ResizeObserver(() => {
  cancelAnimationFrame(layoutUpdateFrame);
  layoutUpdateFrame = requestAnimationFrame(setLayoutForSize);
});
layoutObserver.observe(shell);

const moduleSettings = document.getElementById('moduleSettings');
document.getElementById('moduleButton').addEventListener('click', () => {
  const isOpen = moduleSettings.classList.toggle('visible');
  moduleSettings.setAttribute('aria-hidden', String(!isOpen));
});
document.querySelectorAll('[data-module-toggle]').forEach(toggle => toggle.addEventListener('change', event => {
  const module = document.querySelector(`[data-module="${event.currentTarget.dataset.moduleToggle}"]`);
  if (module) module.hidden = !event.currentTarget.checked;
}));

document.querySelectorAll('.check-button').forEach(button => button.addEventListener('click', () => {
  const item = button.closest('.task-item'); item.classList.toggle('completed');
  const remaining = document.querySelectorAll('.task-item:not(.completed)').length;
  document.getElementById('taskCount').textContent = remaining;
  showToast(item.classList.contains('completed') ? 'Tâche terminée, bien joué' : 'Tâche remise à faire');
}));
document.getElementById('addTask').addEventListener('click', () => {
  const title = window.prompt('Quelle est la prochaine petite chose ?');
  if (!title?.trim()) return;
  const item = document.createElement('article'); item.className = 'task-item';
  item.innerHTML = '<button class="check-button" aria-label="Marquer comme terminé"></button><div class="task-main"><strong></strong><span><i class="project-dot mint"></i> À traiter <b>·</b> maintenant</span></div><span class="task-time">--:--</span><button class="more-button" aria-label="Plus d’options">•••</button>';
  item.querySelector('strong').textContent = title.trim(); item.querySelector('.check-button').addEventListener('click', () => { item.classList.toggle('completed'); });
  document.getElementById('taskList').appendChild(item); showToast('Tâche ajoutée');
});
document.getElementById('completedRow').addEventListener('click', () => showToast('Les tâches terminées restent en mémoire'));

document.getElementById('focusButton').addEventListener('click', () => { document.getElementById('focusOverlay').classList.add('visible'); document.getElementById('focusOverlay').setAttribute('aria-hidden', 'false'); });
document.getElementById('closeFocus').addEventListener('click', closeFocus);
function closeFocus() { document.getElementById('focusOverlay').classList.remove('visible'); document.getElementById('focusOverlay').setAttribute('aria-hidden', 'true'); }
function updateTimer() { const minutes = String(Math.floor(focusSeconds / 60)).padStart(2, '0'); const seconds = String(focusSeconds % 60).padStart(2, '0'); document.getElementById('focusTimer').textContent = `${minutes}:${seconds}`; }
document.getElementById('focusStart').addEventListener('click', event => { if (focusInterval) { clearInterval(focusInterval); focusInterval = null; event.currentTarget.textContent = 'Démarrer'; return; } event.currentTarget.textContent = 'Pause'; focusInterval = setInterval(() => { focusSeconds = Math.max(0, focusSeconds - 1); updateTimer(); if (!focusSeconds) { clearInterval(focusInterval); focusInterval = null; showToast('Session terminée'); } }, 1000); });
document.getElementById('focusReset').addEventListener('click', () => { clearInterval(focusInterval); focusInterval = null; focusSeconds = 25 * 60; updateTimer(); document.getElementById('focusStart').textContent = 'Démarrer'; });

document.getElementById('playButton').addEventListener('click', event => { startRainAudio(); event.currentTarget.textContent = event.currentTarget.textContent === '▶' ? 'Ⅱ' : '▶'; showToast(event.currentTarget.textContent === 'Ⅱ' ? 'Lecture en cours' : 'Lecture en pause'); });
document.getElementById('audioUpload').addEventListener('change', event => { const file = event.target.files[0]; if (file) { document.getElementById('trackName').textContent = file.name; document.getElementById('trackMeta').textContent = 'Votre bibliothèque · prêt à lire'; showToast('Son chargé dans le lecteur'); } });
document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => { document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active')); item.classList.add('active'); showToast(item.textContent.trim()); }));

function youtubeId(value) {
  const match = value.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/i);
  return match?.[1] || null;
}
function loadMedia(result) {
  const query = result.trim();
  const videoId = youtubeId(query);
  const youtubeFrame = document.getElementById('youtubeFrame');
  if (videoId) {
    youtubeFrame.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=1`;
    youtubeFrame.classList.add('visible');
    document.getElementById('trackName').textContent = 'YouTube · lecture en cours';
    document.getElementById('trackMeta').textContent = 'Lien ajouté à votre espace';
    showToast('Lien YouTube chargé');
    return;
  }
  const match = mediaLibrary.find(item => item.title.toLowerCase() === query.toLowerCase()) || mediaLibrary.find(item => item.title.toLowerCase().includes(query.toLowerCase()));
  if (match) {
    document.getElementById('trackName').textContent = match.title;
    document.getElementById('trackMeta').textContent = `${match.meta} · bibliothèque`; 
    youtubeFrame.classList.remove('visible'); youtubeFrame.removeAttribute('src');
    showToast(`${match.title} sélectionné`);
  }
}
function renderSuggestions(value) {
  const query = value.trim();
  const suggestions = document.getElementById('suggestions');
  if (!query) { suggestions.classList.remove('visible'); suggestions.innerHTML = ''; return; }
  const videoId = youtubeId(query);
  const results = videoId ? [{ title: 'Lire cette vidéo YouTube', meta: 'Lien détecté · lecture intégrée', value: query }] : mediaLibrary.filter(item => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 4);
  suggestions.innerHTML = results.length ? results.map((item, index) => `<button class="suggestion" data-suggestion-index="${index}"><span class="suggestion-mark">${videoId ? '▶' : '≈'}</span><span><strong>${item.title}</strong><small>${item.meta}</small></span></button>`).join('') : '<span class="empty-suggestion">Aucune ambiance trouvée · essayez un lien YouTube</span>';
  suggestions.classList.add('visible');
  suggestions.querySelectorAll('.suggestion').forEach((button, index) => button.addEventListener('click', () => { loadMedia(videoId ? query : results[index].title); suggestions.classList.remove('visible'); }));
}
const mediaQuery = document.getElementById('mediaQuery');
mediaQuery.addEventListener('input', event => renderSuggestions(event.target.value));
mediaQuery.addEventListener('keydown', event => { if (event.key === 'Enter') { loadMedia(event.currentTarget.value); document.getElementById('suggestions').classList.remove('visible'); } });
document.getElementById('mediaSearchButton').addEventListener('click', () => { loadMedia(mediaQuery.value); document.getElementById('suggestions').classList.remove('visible'); });
document.addEventListener('click', event => { if (!event.target.closest('.media-search')) document.getElementById('suggestions').classList.remove('visible'); });
window.addEventListener('resize', resizeRain); resizeRain(); drawRain(); setLayoutForSize();
