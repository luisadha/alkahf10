/* Pemutar murotal Al-Kahfi ayat 1-10.
 * Data diambil dari kahf.json (audio_url per ayat).
 * Jika kahf.json gagal dimuat, URL audio disusun dari pola everyayah.com
 * sehingga audio tetap bisa diputar.
 */
(function () {
  'use strict';

  var root = document.getElementById('murotal');
  if (!root) return;

  var QARI = 'https://everyayah.com/data/Alafasy_128kbps/';
  var TOTAL = 10;

  var el = {
    label: root.querySelector('.murotal-label'),
    arab: root.querySelector('.murotal-arab'),
    latin: root.querySelector('.murotal-latin'),
    arti: root.querySelector('.murotal-arti'),
    seek: root.querySelector('.murotal-seek'),
    now: root.querySelector('.murotal-now'),
    dur: root.querySelector('.murotal-dur'),
    prev: root.querySelector('.murotal-prev'),
    play: root.querySelector('.murotal-play'),
    next: root.querySelector('.murotal-next'),
    ulang: root.querySelector('.murotal-ulang'),
    speed: root.querySelector('.murotal-speed'),
    loop: root.querySelector('.murotal-loop'),
    list: root.querySelector('.murotal-daftar'),
    status: root.querySelector('.murotal-status')
  };

  var audio = new Audio();
  audio.preload = 'auto';

  var ayat = [];          // [{ayat, arab, latin, terjemahan_id, audio_url}]
  var idx = 0;            // indeks ayat aktif (0-9)
  var playedTimes = 0;    // berapa kali ayat aktif sudah diputar utuh

  /* ---------- data ---------- */
  function fallbackData() {
    var out = [];
    for (var i = 1; i <= TOTAL; i++) {
      out.push({
        ayat: i,
        arab: '',
        latin: '',
        terjemahan_id: '',
        audio_url: QARI + '018' + String(i).padStart(3, '0') + '.mp3'
      });
    }
    return out;
  }

  function loadData() {
    var url = new URL('kahf.json', document.baseURI).href;
    return fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) throw new Error('data kosong');
        return data;
      })
      .catch(function () {
        setStatus('Teks ayat tidak termuat, audio tetap bisa diputar.', true);
        return fallbackData();
      });
  }

  /* ---------- util ---------- */
  function setStatus(msg, galat) {
    el.status.textContent = msg || '';
    el.status.classList.toggle('galat', !!galat);
  }

  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var d = Math.floor(s % 60);
    return m + ':' + (d < 10 ? '0' : '') + d;
  }

  function isPlaying() {
    return !audio.paused && !audio.ended;
  }

  /* ---------- tampilan ---------- */
  function renderAyat() {
    var a = ayat[idx];
    el.label.textContent = 'Ayat ' + a.ayat + ' dari ' + ayat.length;
    el.arab.textContent = a.arab || '';
    el.latin.textContent = a.latin || '';
    el.arti.textContent = a.terjemahan_id || '';

    Array.prototype.forEach.call(el.list.querySelectorAll('button'), function (b, i) {
      if (i === idx) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });

    if ('mediaSession' in navigator && window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: 'Al-Kahfi ayat ' + a.ayat,
        artist: 'Mishary Alafasy',
        album: 'Murotal Al-Kahfi 1-10'
      });
    }
  }

  function renderPlayState() {
    var playing = isPlaying();
    el.play.textContent = playing ? '⏸' : '▶';
    el.play.setAttribute('aria-label', playing ? 'Jeda' : 'Putar');
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }

  function buildList() {
    el.list.innerHTML = '';
    ayat.forEach(function (a, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.ayat;
      b.setAttribute('aria-label', 'Putar ayat ' + a.ayat);
      b.addEventListener('click', function () { go(i, true); });
      li.appendChild(b);
      el.list.appendChild(li);
    });
  }

  /* ---------- kontrol ---------- */
  function load(i) {
    idx = i;
    playedTimes = 0;
    audio.src = ayat[idx].audio_url;
    audio.playbackRate = parseFloat(el.speed.value) || 1;
    el.seek.value = 0;
    el.now.textContent = '0:00';
    el.dur.textContent = '0:00';
    renderAyat();
  }

  function play() {
    var p = audio.play();
    if (p && p.catch) {
      p.catch(function (e) {
        if (e && e.name === 'AbortError') return; // pindah ayat saat loading
        setStatus('Audio tidak bisa diputar. Periksa koneksi internet.', true);
        renderPlayState();
      });
    }
  }

  function go(i, autoplay) {
    if (i < 0) i = 0;
    if (i >= ayat.length) i = ayat.length - 1;
    setStatus('');
    load(i);
    if (autoplay) play();
    else renderPlayState();
  }

  function toggle() {
    if (isPlaying()) audio.pause();
    else play();
  }

  function nextAyat() {
    if (idx < ayat.length - 1) go(idx + 1, true);
    else if (el.loop.checked) go(0, true);
    else { go(0, false); setStatus('Selesai. Tekan putar untuk mengulang dari ayat 1.'); }
  }

  /* ---------- event audio ---------- */
  audio.addEventListener('play', renderPlayState);
  audio.addEventListener('pause', renderPlayState);

  audio.addEventListener('loadedmetadata', function () {
    el.dur.textContent = fmt(audio.duration);
    el.seek.max = Math.floor(audio.duration * 10) / 10;
  });

  audio.addEventListener('timeupdate', function () {
    el.now.textContent = fmt(audio.currentTime);
    if (!el.seek.matches(':active')) el.seek.value = audio.currentTime;
  });

  audio.addEventListener('ended', function () {
    playedTimes++;
    var target = parseInt(el.ulang.value, 10); // 0 = tak terbatas
    if (target === 0 || playedTimes < target) {
      audio.currentTime = 0;
      play();
      return;
    }
    nextAyat();
  });

  audio.addEventListener('error', function () {
    setStatus('Gagal memuat audio ayat ' + ayat[idx].ayat + '.', true);
    renderPlayState();
  });

  /* ---------- event UI ---------- */
  el.play.addEventListener('click', toggle);
  el.prev.addEventListener('click', function () {
    // jika sudah lewat 3 detik, ulangi ayat ini dulu
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    go(idx - 1, isPlaying());
  });
  el.next.addEventListener('click', function () { go(idx + 1, isPlaying()); });

  el.seek.addEventListener('input', function () {
    audio.currentTime = parseFloat(el.seek.value) || 0;
  });

  el.speed.addEventListener('change', function () {
    audio.playbackRate = parseFloat(el.speed.value) || 1;
    try { localStorage.setItem('kahf_speed', el.speed.value); } catch (e) {}
  });
  el.ulang.addEventListener('change', function () {
    playedTimes = 0;
    try { localStorage.setItem('kahf_ulang', el.ulang.value); } catch (e) {}
  });
  el.loop.addEventListener('change', function () {
    try { localStorage.setItem('kahf_loop', el.loop.checked ? '1' : '0'); } catch (e) {}
  });

  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', play);
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function () { go(idx - 1, true); });
      navigator.mediaSession.setActionHandler('nexttrack', function () { go(idx + 1, true); });
    } catch (e) { /* sebagian browser tidak mendukung semua aksi */ }
  }

  /* ---------- preferensi tersimpan ---------- */
  try {
    var s = localStorage.getItem('kahf_speed');
    if (s) el.speed.value = s;
    var u = localStorage.getItem('kahf_ulang');
    if (u !== null) el.ulang.value = u;
    var l = localStorage.getItem('kahf_loop');
    if (l !== null) el.loop.checked = l === '1';
  } catch (e) {}

  /* ---------- mulai ---------- */
  loadData().then(function (data) {
    ayat = data.slice(0, TOTAL);
    buildList();
    load(0);
    renderPlayState();
    root.hidden = false;
  });
})();
