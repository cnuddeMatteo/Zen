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
const audioPlayer = new Audio();
let activeTrack = { type: 'synth', name: 'Une nuit dans les bois', detail: 'musique originale · calme' };
let localTracks = [];
let savedLinks = JSON.parse(localStorage.getItem('zen-links') || '[]');
let queueIndex = -1;
let loopMode = 'off';
let embedType = null;
let embedVolume = 42;
const mediaEmbed = document.getElementById('mediaEmbed');
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
function setMusicButtons(playing) { const playLabel = playing ? 'Mettre la musique en pause' : 'Lancer la musique'; document.getElementById('playButton').textContent = playing ? 'Ⅱ' : '▶'; document.getElementById('playButton').title = playLabel; document.getElementById('playButton').setAttribute('aria-label', playLabel); document.getElementById('soundButton').classList.toggle('active', playing); document.getElementById('soundButton').title = playLabel; document.getElementById('soundButton').setAttribute('aria-label', playLabel); }
function setTrackLabel(track) { document.getElementById('trackName').textContent = track.name; document.getElementById('trackArtist').textContent = track.detail; const cover = document.getElementById('trackCover'); cover.src = track.cover || ''; cover.alt = track.cover ? `Pochette de ${track.name}` : ''; cover.classList.toggle('visible', Boolean(track.cover)); }
function youtubeId(url) { const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i); return match ? match[1] : null; }
function sendEmbedCommand(method, value) { if (!mediaEmbed.contentWindow || !embedType) return; if (embedType === 'youtube') mediaEmbed.contentWindow.postMessage(JSON.stringify({ event: 'command', func: method, args: value === undefined ? [] : [value] }), '*'); if (embedType === 'soundcloud') mediaEmbed.contentWindow.postMessage(JSON.stringify({ method, value }), '*'); }
function setActiveVolume(value) { embedVolume = Number(value); if (activeTrack.type === 'local') audioPlayer.volume = embedVolume / 100; if (activeTrack.type === 'synth' && musicGain) musicGain.gain.value = embedVolume / 100 * .14; sendEmbedCommand('setVolume', embedVolume); document.getElementById('volumeLabel').textContent = `${embedVolume}%`; }
function getQueue() { return [...localTracks.map(track => ({ ...track, type: 'local', detail: 'fichier local · votre bibliothèque' })), ...savedLinks.map(link => ({ ...link, type: 'link', name: link.title || link.source, detail: `${link.source} · lien externe` }))]; }
function startMusic() { audioPlayer.pause(); mediaEmbed.src = ''; embedType = null; audioContext ??= new AudioContext(); if (musicTimer) return; activeTrack = { type: 'synth', name: 'Une nuit dans les bois', detail: 'musique originale · calme' }; setTrackLabel(activeTrack); musicGain = audioContext.createGain(); musicGain.gain.value = embedVolume / 100 * .14; musicGain.connect(audioContext.destination); const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23]; let index = 0; const playNote = () => { const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain(); oscillator.type = 'sine'; oscillator.frequency.value = notes[index++ % notes.length]; gain.gain.setValueAtTime(0, audioContext.currentTime); gain.gain.linearRampToValueAtTime(.7, audioContext.currentTime + .18); gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + 2.2); oscillator.connect(gain).connect(musicGain); oscillator.start(); oscillator.stop(audioContext.currentTime + 2.3); }; playNote(); musicTimer = setInterval(playNote, 1900); setMusicButtons(true); scheduleUIFade(); }
function stopMusic() { clearInterval(musicTimer); musicTimer = null; if (musicGain) musicGain.disconnect(); audioPlayer.pause(); sendEmbedCommand('pauseVideo'); sendEmbedCommand('pause'); mediaEmbed.src = ''; embedType = null; wakeUI(); setMusicButtons(false); }
function playLocalTrack(track, index = localTracks.indexOf(track)) { stopMusic(); queueIndex = index; activeTrack = { type: 'local', name: track.name, detail: 'fichier local · votre bibliothèque' }; audioPlayer.src = track.url; audioPlayer.volume = embedVolume / 100; setTrackLabel(activeTrack); audioPlayer.play().then(() => { setMusicButtons(true); scheduleUIFade(); }).catch(() => showToast('Impossible de lire ce fichier')); }
async function loadLinkMetadata(link, id) { try { const response = await fetch(`https://${link.source === 'YouTube' ? 'www.youtube.com' : 'soundcloud.com'}/oembed?url=${encodeURIComponent(link.url)}&format=json`); if (!response.ok) return; const data = await response.json(); if (activeTrack.type !== 'link' || queueIndex !== localTracks.length + savedLinks.indexOf(link)) return; activeTrack.name = data.title || activeTrack.name; activeTrack.detail = data.author_name ? `${data.author_name} · ${link.source}` : activeTrack.detail; activeTrack.cover = data.thumbnail_url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''); setTrackLabel(activeTrack); } catch (error) { return; } }
function playSavedLink(link, index = localTracks.length + savedLinks.indexOf(link)) { stopMusic(); queueIndex = index; const id = link.source === 'YouTube' ? youtubeId(link.url) : null; if (link.source === 'YouTube' && !id) { showToast('Cette URL YouTube ne peut pas être intégrée'); return; } activeTrack = { type: 'link', name: link.title || (id ? 'Vidéo YouTube' : 'Piste SoundCloud'), detail: link.artist || `${link.source} · lecture intégrée`, cover: id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '' }; setTrackLabel(activeTrack); loadLinkMetadata(link, id); embedType = link.source === 'YouTube' ? 'youtube' : 'soundcloud'; mediaEmbed.src = embedType === 'youtube' ? `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&playsinline=1` : `https://w.soundcloud.com/player/?url=${encodeURIComponent(link.url)}&auto_play=true&hide_related=true&show_comments=false&show_user=true&visual=true`; mediaEmbed.onload = () => { setTimeout(() => { sendEmbedCommand('playVideo'); sendEmbedCommand('play'); sendEmbedCommand('setVolume', embedVolume); }, 500); }; setMusicButtons(true); showToast(`${link.source} en lecture dans Zen`); }
function playQueueTrack(index) { const queue = getQueue(); if (!queue.length) { showToast('Ajoutez d’abord un son à votre bibliothèque'); return; } const nextIndex = (index + queue.length) % queue.length; const track = queue[nextIndex]; if (track.type === 'local') playLocalTrack(localTracks[nextIndex], nextIndex); else playSavedLink(savedLinks[nextIndex - localTracks.length], nextIndex); }
function skipTrack(direction) { const queue = getQueue(); if (!queue.length) { showToast('Ajoutez d’abord un son à votre bibliothèque'); return; } playQueueTrack(queueIndex < 0 ? direction > 0 ? 0 : queue.length - 1 : queueIndex + direction); }
function renderTracks() { const list = document.getElementById('trackList'); const localMarkup = localTracks.map((track, index) => `<button class="saved-track" data-local-index="${index}"><span class="track-source">♪</span><span><strong>${track.name}</strong><small>fichier local · cette session</small></span><span class="card-arrow">▶</span></button>`).join(''); const linkMarkup = savedLinks.map((link, index) => `<button class="saved-track" data-link-index="${index}"><span class="track-source">${link.source === 'YouTube' ? '▶' : 's'}</span><span><strong>${link.title || link.source}</strong><small>${link.url.replace(/^https?:\/\//, '').slice(0, 34)}</small></span><span class="card-arrow">↗</span></button>`).join(''); list.innerHTML = localMarkup + linkMarkup; const count = localTracks.length + savedLinks.length; document.getElementById('trackCount').textContent = `${count} ajouté${count > 1 ? 's' : ''}`; list.querySelectorAll('[data-local-index]').forEach(button => button.addEventListener('click', () => playQueueTrack(Number(button.dataset.localIndex)))); list.querySelectorAll('[data-link-index]').forEach(button => button.addEventListener('click', () => playQueueTrack(localTracks.length + Number(button.dataset.linkIndex)))); }
document.getElementById('localAudioInput').addEventListener('change', event => { Array.from(event.target.files).forEach(file => { const track = { name: file.name.replace(/\.[^/.]+$/, ''), url: URL.createObjectURL(file) }; localTracks.push(track); playLocalTrack(track); }); renderTracks(); showToast(`${event.target.files.length} son ajouté${event.target.files.length > 1 ? 's' : ''}`); event.target.value = ''; });
document.getElementById('linkForm').addEventListener('submit', event => { event.preventDefault(); const url = document.getElementById('linkInput').value.trim(); const source = document.getElementById('linkSource').value; if (!new RegExp(source === 'YouTube' ? 'youtube\\.com|youtu\\.be' : 'soundcloud\\.com', 'i').test(url)) { showToast(`Ajoutez une adresse ${source} valide`); return; } savedLinks.unshift({ source, url, title: `${source} · nouveau lien` }); localStorage.setItem('zen-links', JSON.stringify(savedLinks)); renderTracks(); event.target.reset(); showToast('Lien ajouté à votre bibliothèque'); });
function setRain(value) { rainVolume = Number(value) / 100; setActiveVolume(value); }
document.getElementById('rainVolume').addEventListener('input', event => setRain(event.target.value));
document.getElementById('rainToggle').addEventListener('click', event => { rainOn = !rainOn; event.currentTarget.textContent = rainOn ? '≋' : '▶'; showToast(rainOn ? 'La pluie reprend' : 'Pluie en pause'); });
function toggleMusic() { if (activeTrack.type === 'local' && audioPlayer.src) { if (audioPlayer.paused) { audioPlayer.play().then(() => { setMusicButtons(true); showToast('Son local relancé'); }).catch(() => showToast('Impossible de lire ce fichier')); } else { audioPlayer.pause(); setMusicButtons(false); showToast('Son local en pause'); } return; } if (musicTimer) { stopMusic(); showToast('Musique en pause'); } else { startMusic(); showToast('Musique activée'); } }
document.getElementById('soundButton').addEventListener('click', toggleMusic);
document.getElementById('playButton').addEventListener('click', toggleMusic);
document.getElementById('world').addEventListener('click', event => { if (event.target.closest('button, input, label, a')) return; if (document.getElementById('world').classList.contains('sleeping')) { wakeUI(); scheduleUIFade(); } });
document.getElementById('focusButton').addEventListener('click', () => { document.getElementById('focusOverlay').classList.add('visible'); document.getElementById('focusOverlay').setAttribute('aria-hidden', 'false'); });
document.getElementById('closeFocus').addEventListener('click', () => { document.getElementById('focusOverlay').classList.remove('visible'); document.getElementById('focusOverlay').setAttribute('aria-hidden', 'true'); });
function updateTimer() { document.getElementById('focusTimer').textContent = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`; }
function resetFocusTimer() { clearInterval(focusInterval); focusInterval = null; focusSeconds = focusDuration; updateTimer(); document.getElementById('focusStart').textContent = 'Démarrer'; }
document.getElementById('focusDuration').addEventListener('change', event => { focusDuration = Number(event.target.value) * 60; resetFocusTimer(); document.getElementById('focusDurationLabel').textContent = `${event.target.value} min`; });
document.getElementById('focusStart').addEventListener('click', event => { if (focusInterval) { clearInterval(focusInterval); focusInterval = null; event.currentTarget.textContent = 'Démarrer'; return; } event.currentTarget.textContent = 'Pause'; focusInterval = setInterval(() => { focusSeconds = Math.max(0, focusSeconds - 1); updateTimer(); if (!focusSeconds) { clearInterval(focusInterval); focusInterval = null; showToast('Pause terminée'); } }, 1000); });
document.getElementById('focusReset').addEventListener('click', resetFocusTimer);
document.getElementById('previousButton').addEventListener('click', () => skipTrack(-1));
document.getElementById('nextButton').addEventListener('click', () => skipTrack(1));
document.getElementById('loopButton').addEventListener('click', event => { loopMode = loopMode === 'off' ? 'all' : loopMode === 'all' ? 'one' : 'off'; const labels = { off: 'Répétition désactivée', all: 'Répéter la file', one: 'Répéter ce morceau' }; event.currentTarget.title = labels[loopMode]; event.currentTarget.setAttribute('aria-label', labels[loopMode]); event.currentTarget.classList.toggle('active', loopMode !== 'off'); event.currentTarget.dataset.mode = loopMode; showToast(labels[loopMode]); });
document.getElementById('libraryButton').addEventListener('click', () => { document.getElementById('libraryPanel').classList.add('visible'); document.getElementById('libraryPanel').setAttribute('aria-hidden', 'false'); renderTracks(); });
document.getElementById('closeLibrary').addEventListener('click', () => { document.getElementById('libraryPanel').classList.remove('visible'); document.getElementById('libraryPanel').setAttribute('aria-hidden', 'true'); });
document.getElementById('libraryPanel').addEventListener('click', event => { if (event.target === event.currentTarget) document.getElementById('closeLibrary').click(); });
audioPlayer.addEventListener('ended', () => { if (loopMode === 'one' && queueIndex >= 0) { playQueueTrack(queueIndex); return; } if (loopMode === 'all' && queueIndex >= 0) { skipTrack(1); return; } setMusicButtons(false); });
const selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
document.getElementById('quoteText').innerHTML = `${selectedQuote[0]}<br><em>${selectedQuote[1]}</em>`;
window.addEventListener('resize', resizeScene); resizeScene(); drawScene();
