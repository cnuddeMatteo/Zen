const canvas = document.getElementById('worldCanvas');
const context = canvas.getContext('2d');
let drops = [];
let rainOn = true;
let rainVolume = 0.42;
let audioContext;
let musicGain;
let musicTimer;
let focusDuration = 25 * 60;
let focusSeconds = focusDuration;
let focusInterval;
let idleTimer;
const quotes = [
  ['Respire.', 'Le monde peut attendre.'],
  ['Ralentis.', 'Tout ira doucement.'],
  ['Reste ici.', 'Le calme suffit.'],
  ['Prends ton temps.', 'La nuit veille.'],
  ['Pose-toi.', 'Rien ne presse.']
];

function resizeScene() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * ratio;
  canvas.height = window.innerHeight * ratio;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  drops = Array.from({ length: Math.floor(window.innerWidth / 11) }, () => ({ x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight, length: 7 + Math.random() * 13, speed: 3 + Math.random() * 5, opacity: .08 + Math.random() * .16 }));
}
function block(x, y, width, height, color) { context.fillStyle = color; context.fillRect(Math.round(x), Math.round(y), Math.round(width), Math.round(height)); }
function drawTree(x, ground, scale, color) { const trunk = scale * .2; block(x - trunk / 2, ground - scale * .64, trunk, scale * .64, '#473d32'); block(x - scale * .33, ground - scale * .83, scale * .66, scale * .2, color); block(x - scale * .48, ground - scale * .68, scale * .96, scale * .22, color); block(x - scale * .62, ground - scale * .5, scale * 1.24, scale * .2, color); }
function drawScene() {
  const width = window.innerWidth; const height = window.innerHeight; const horizon = height * .68;
  const sky = context.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, '#1a3b4b'); sky.addColorStop(.5, '#315b67'); sky.addColorStop(1, '#94a77e'); context.fillStyle = sky; context.fillRect(0, 0, width, height);
  context.globalAlpha = .85; context.fillStyle = '#f0dba6'; context.beginPath(); context.arc(width * .76, height * .22, 45, 0, Math.PI * 2); context.fill(); context.globalAlpha = .13; context.fillStyle = '#fff4c4'; context.beginPath(); context.arc(width * .76, height * .22, 68, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;
  for (let i = 0; i < 10; i++) block(i * width / 9 - 30, horizon - 58 - (i % 3) * 18, width / 6, 72 + (i % 3) * 18, '#385967');
  block(0, horizon - 2, width, height - horizon + 2, '#263f3e');
  for (let i = 0; i < 13; i++) block(i * width / 12 - 15, horizon + 18 + (i % 2) * 17, width / 8, 14, i % 2 ? '#456452' : '#385449');
  for (let i = -1; i < width / 95; i++) drawTree(i * 97 + (i % 3) * 21, horizon + 30, 75 + (i % 4) * 14, '#1d3f43');
  for (let i = 0; i < width / 160; i++) drawTree(i * 167 + 38, horizon + 82, 52 + (i % 2) * 12, '#31554b');
  block(0, horizon + 88, width, height - horizon, '#1e3939');
  context.globalAlpha = .42; drops.forEach(drop => { if (rainOn) { context.strokeStyle = '#c3d8cf'; context.lineWidth = 1; context.beginPath(); context.moveTo(drop.x, drop.y); context.lineTo(drop.x - 2, drop.y + drop.length); context.stroke(); drop.y += drop.speed; if (drop.y > height) { drop.y = -drop.length; drop.x = Math.random() * width; } } }); context.globalAlpha = 1;
  requestAnimationFrame(drawScene);
}
function showToast(message) { const toast = document.getElementById('toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(showToast.timeout); showToast.timeout = setTimeout(() => toast.classList.remove('show'), 2200); }
function wakeUI() { document.getElementById('world').classList.remove('sleeping'); clearTimeout(idleTimer); }
function scheduleUIFade() { clearTimeout(idleTimer); idleTimer = setTimeout(() => document.getElementById('world').classList.add('sleeping'), 8000); }
function setMusicButtons(playing) { document.getElementById('playButton').textContent = playing ? 'Ⅱ' : '▶'; document.getElementById('soundButton').classList.toggle('active', playing); }
function startMusic() { audioContext ??= new AudioContext(); if (musicTimer) return; musicGain = audioContext.createGain(); musicGain.gain.value = .06; musicGain.connect(audioContext.destination); const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23]; let index = 0; const playNote = () => { const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = notes[index++ % notes.length]; gain.gain.setValueAtTime(0, audioContext.currentTime); gain.gain.linearRampToValueAtTime(.7, audioContext.currentTime + .18); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + 2.2); oscillator.connect(gain).connect(musicGain); oscillator.start(); oscillator.stop(audioContext.currentTime + 2.3); }; playNote(); musicTimer = setInterval(playNote, 1900); setMusicButtons(true); scheduleUIFade(); }
function stopMusic() { clearInterval(musicTimer); musicTimer = null; if (musicGain) musicGain.disconnect(); wakeUI(); setMusicButtons(false); }
function setRain(value) { rainVolume = Number(value) / 100; document.getElementById('volumeLabel').textContent = `${Math.round(rainVolume * 100)}%`; }
document.getElementById('rainVolume').addEventListener('input', event => setRain(event.target.value));
document.getElementById('rainToggle').addEventListener('click', event => { rainOn = !rainOn; event.currentTarget.textContent = rainOn ? '≋' : '▶'; showToast(rainOn ? 'La pluie reprend' : 'Pluie en pause'); });
document.getElementById('soundButton').addEventListener('click', () => { if (musicTimer) { stopMusic(); showToast('Musique en pause'); } else { startMusic(); showToast('Musique activée'); } });
document.getElementById('playButton').addEventListener('click', () => { if (musicTimer) { stopMusic(); showToast('Musique en pause'); } else { startMusic(); showToast('Musique activée'); } });
document.getElementById('world').addEventListener('click', event => { if (event.target.closest('button, input, label, a')) return; if (document.getElementById('world').classList.contains('sleeping')) { wakeUI(); scheduleUIFade(); } });
document.getElementById('focusButton').addEventListener('click', () => { document.getElementById('focusOverlay').classList.add('visible'); document.getElementById('focusOverlay').setAttribute('aria-hidden', 'false'); });
document.getElementById('closeFocus').addEventListener('click', () => { document.getElementById('focusOverlay').classList.remove('visible'); document.getElementById('focusOverlay').setAttribute('aria-hidden', 'true'); });
function updateTimer() { document.getElementById('focusTimer').textContent = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`; }
function resetFocusTimer() { clearInterval(focusInterval); focusInterval = null; focusSeconds = focusDuration; updateTimer(); document.getElementById('focusStart').textContent = 'Démarrer'; }
document.getElementById('focusDuration').addEventListener('change', event => { focusDuration = Number(event.target.value) * 60; resetFocusTimer(); document.getElementById('focusDurationLabel').textContent = `${event.target.value} min`; });
document.getElementById('focusStart').addEventListener('click', event => { if (focusInterval) { clearInterval(focusInterval); focusInterval = null; event.currentTarget.textContent = 'Démarrer'; return; } event.currentTarget.textContent = 'Pause'; focusInterval = setInterval(() => { focusSeconds = Math.max(0, focusSeconds - 1); updateTimer(); if (!focusSeconds) { clearInterval(focusInterval); focusInterval = null; showToast('Pause terminée'); } }, 1000); });
document.getElementById('focusReset').addEventListener('click', resetFocusTimer);
const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
document.getElementById('quoteText').innerHTML = `${selectedQuote[0]}<br><em>${selectedQuote[1]}</em>`;
window.addEventListener('resize', resizeScene); resizeScene(); drawScene();
