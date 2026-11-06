(() => {
  'use strict';
  const { sessions, feelings, endpoint, appLink } = window.TAP;
  const byId = Object.fromEntries(sessions.map((s) => [s.id, s]));
  const root = document.getElementById('app');
  const embedded = root.hasAttribute('data-embed'); // lives inside the homepage rather than its own page
  const isProd = location.hostname === 'earlyshift.app' || location.hostname === 'www.earlyshift.app';
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(navigator.userAgent);
  const params = new URLSearchParams(location.search);

  /* ---------- Measuring ---------- */

  const STORE = 'shift_tap_v1';
  const store = (() => {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
  })();
  const saveStore = () => { try { localStorage.setItem(STORE, JSON.stringify(store)); } catch { /* private mode */ } };
  const today = () => Math.floor(Date.now() / 86400000);
  const randomId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');

  // ?internal=1 marks this browser as ours so test plays stay out of the numbers.
  if (params.has('internal')) { store.off = params.get('internal') !== '0'; saveStore(); }
  const measuringOff = () => store.off || navigator.globalPrivacyControl === true;

  if (!store.id) { store.id = randomId(); store.first = today(); }
  saveStore();
  const src = (params.get('src') || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  let refHost = '';
  try { refHost = document.referrer ? new URL(document.referrer).hostname.slice(0, 60) : ''; } catch { /* no referrer */ }
  if (refHost === location.hostname) refHost = '';
  const device = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop';

  function track(e, fields = {}) {
    if (measuringOff()) return;
    const body = JSON.stringify({ e, v: store.id, day: today() - store.first, src, ...fields });
    const url = isProd ? endpoint : '/__tap_event';
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
    } catch { /* fall through */ }
    fetch(url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'text/plain' } }).catch(() => {});
  }

  /* ---------- Small helpers ---------- */

  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.500z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.3"/><rect x="13.5" y="5" width="4" height="14" rx="1.3"/></svg>',
    back10: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 12A11 11 0 1 1 5 18.5"/><path d="M7 6v6.500h6.5"/><text x="16" y="22" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>',
    fwd10: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24.5 12A11 11 0 1 0 27 18.5"/><path d="M25 6v6.500h-6.5"/><text x="16" y="22" font-size="10" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="inherit">10</text></svg>',
  };
  const clock = (ms) => {
    const s = Math.max(0, Math.round(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const nav = (left) => (embedded && !left ? '' : `<div class="nav">${left}${!embedded && !isAndroid ? `<a class="applink" data-app="nav" href="${esc(appLink)}" rel="noopener">SHIFT for iPhone</a>` : ''}</div>`);
  const brand = embedded ? '' : '<a class="brand" href="/"><img src="/assets/img/icon.webp" alt="">SHIFT</a>';
  const backBtn = '<button class="back" data-back aria-label="Back">' + icon.back + '</button>';
  const legal = () => (embedded ? `<p class="legal">Self-care practice, not medical treatment. AI voices. <a href="/privacy.html#web-player">Privacy</a> · <button class="optout" data-optout>${store.off ? 'Measuring is off' : "Don't measure my visit"}</button></p>` : `<p class="legal">EFT tapping is a self-care practice, not medical treatment. Voices are AI-generated. If you're struggling, please reach out to a professional. In a crisis in the US, call or text 988.<br><a href="/privacy.html#web-player">Privacy</a> · <a href="/terms.html">Terms</a> · <button class="optout" data-optout>${store.off ? 'Measuring is off' : "Don't measure my visit"}</button></p>`);
  const lengthLabel = (s) => (s.kind === 'quick' ? `${s.minutes} min, one round` : `${s.minutes} min, three rounds`);
  const card = (s) => `<button class="card" data-session="${esc(s.id)}"><img src="/tap/thumb/${esc(s.id)}.webp" alt="" loading="lazy" width="68" height="68"><div><b>${esc(s.title)}</b><span>${esc(s.subtitle)}</span><span class="len">${lengthLabel(s)}</span></div></button>`;

  /* ---------- Screens ---------- */

  let current = null; // the running player, if any
  let startId = null; // the session on the start screen
  const starter = byId['quick-reset-for-a-rough-day'] || sessions[0];

  function setLive(on) {
    root.classList.toggle('live', on);
    document.documentElement.classList.toggle('tap-live', on);
  }

  function toTop() {
    if (!embedded) { window.scrollTo(0, 0); return; }
    root.scrollTop = 0;
    if (root.getBoundingClientRect().top < 0) root.scrollIntoView({ block: 'start' });
  }

  function renderHome() {
    const last = store.last && byId[store.last];
    if (embedded) {
      root.innerHTML = `<div class="screen">
        <h2 class="first">What's going on right now?</h2>
        <div class="feelings">${feelings.map((f) => `<button class="feeling" data-feeling="${esc(f.id)}">${esc(f.label)}</button>`).join('')}</div>
        <button class="textbtn" data-all>See all ${sessions.length} sessions</button>
        <h2>Not sure? Start here.</h2>
        ${card(starter)}
        <img class="embed-art" src="/tap/art/face.webp" alt="">
        ${legal()}
      </div>`;
      return;
    }
    root.innerHTML = `<main class="screen">
      ${nav(brand)}
      <h1>Tap along for two minutes.</h1>
      <p class="lede">A guided EFT tapping session, right here in your browser. No download. No sign-up.</p>
      ${last ? `<h2>Last time</h2>${card(last)}` : ''}
      <h2>What's going on right now?</h2>
      <div class="feelings">${feelings.map((f) => `<button class="feeling" data-feeling="${esc(f.id)}">${esc(f.label)}</button>`).join('')}</div>
      <button class="textbtn" data-all>See all ${sessions.length} sessions</button>
      <details><summary>What is tapping?</summary>
        <p>EFT tapping means gently tapping on points on your face and body while you name what you're feeling. A voice guides you through it, and the picture shows you where to tap.</p>
        <p>Use two fingers and tap lightly. Say each phrase out loud or quietly in your head. There's no perfect way to do it.</p>
      </details>
      ${legal()}
    </main>`;
  }

  function renderFeeling(id) {
    const feeling = feelings.find((f) => f.id === id);
    const list = feeling ? feeling.sessions.map((i) => byId[i]) : sessions;
    root.innerHTML = `<main class="screen">
      ${nav(backBtn)}
      <h1>${feeling ? esc(feeling.label) : 'All sessions'}</h1>
      <p class="lede">${feeling ? 'Pick the one that fits. The short one is a good place to start.' : 'Pick the one that fits.'}</p>
      <div style="margin-top:20px">${list.map(card).join('')}</div>
      ${legal()}
    </main>`;
  }

  function scale(kind) {
    const nums = Array.from({ length: 11 }, (_, n) => `<button data-rate="${n}" aria-label="${n} out of 10">${n}</button>`).join('');
    return `<div class="scale" data-scale="${kind}">${nums}</div><div class="scale-ends"><span>0 calm</span><span>10 very stressed</span></div>`;
  }

  function renderStart(id) {
    const s = byId[id];
    startId = id;
    root.innerHTML = `<main class="screen">
      ${nav(backBtn)}
      <p class="rate-title" style="margin-top:6px">${esc(s.title)}</p>
      <p class="about">${esc(s.about)}</p>
      <h2>How stressed do you feel right now?</h2>
      ${scale('before')}
      <p class="tips">Tapping a number starts the session, so turn your sound on first.</p>
      <button class="textbtn" data-skip-rate>Start without rating</button>
      ${legal()}
    </main>`;
    [ 'hand', 'face', 'body' ].forEach((n) => { new Image().src = `/tap/art/${n}.webp`; });
  }

  function renderDone(s, before, after) {
    let result = '';
    if (before != null && after != null) {
      const change = after < before ? `You went from ${before} to ${after}.` : after === before ? `You stayed at ${after}. Some days take more than one round.` : `You went from ${before} to ${after}. That's okay. Naming hard things can stir them up at first.`;
      result = `<div class="result">${change}</div>`;
    }
    const care = after != null && after >= 8 ? `<p class="care">If today feels like too much, you don't have to handle it alone. Reach out to someone you trust, or a professional. In the US, you can call or text 988 at any time.</p>` : '';
    root.innerHTML = `<main class="screen">
      ${nav(brand)}
      <h1>Nice work.</h1>
      <p class="lede">You took a moment for yourself.</p>
      ${result}${care}
      <button class="primary" data-again>Tap this one again</button>
      <button class="secondary" data-home>Try a different session</button>
      ${!isAndroid ? `<p class="promo">Want more sessions? <a data-app="done" href="${esc(appLink)}" rel="noopener">SHIFT is free on iPhone.</a></p>` : ''}
      ${legal()}
    </main>`;
  }

  function renderAfter(s, onRated) {
    root.innerHTML = `<main class="screen">
      ${nav(brand)}
      <h1>How stressed do you feel now?</h1>
      ${scale('after')}
      <button class="textbtn" data-skip-after>Skip</button>
      ${legal()}
    </main>`;
    current = { onAfter: onRated };
  }

  /* ---------- Player ---------- */

  const POINT_ORDER = ['side_of_hand', 'top_of_head', 'beginning_of_eyebrows', 'side_of_eye', 'under_eye', 'under_nose', 'chin', 'collarbones', 'underarm'];
  const POINT_NAME = {
    side_of_hand: 'Side of hand', top_of_head: 'Top of head', beginning_of_eyebrows: 'Eyebrows', side_of_eye: 'Side of eyes',
    under_eye: 'Under eyes', under_nose: 'Under nose', chin: 'Chin', collarbones: 'Collarbones', underarm: 'Under arm',
  };
  // Art and glow placement match PlayerTappingVisual in the app. refW is the width the
  // art has on a reference iPhone, so the app's fixed glow sizes can scale with the screen.
  const VIEWS = {
    hand: { w: 1003, h: 1568, refW: 275, scale: 1, offset: 0 },
    face: { w: 1024, h: 1536, refW: 287, scale: 1.18, offset: -24 },
    body: { w: 1116, h: 1410, refW: 340, scale: 1, offset: 0 },
  };
  const GLOWS = {
    side_of_hand: ['hand', [[-.28, -.10, 28, 104, -.04, 1]]],
    top_of_head: ['face', [[0, -.65, 112, 38, 0, 1]]],
    beginning_of_eyebrows: ['face', [[-.22, -.12, 42, 22, -.12, 1.18], [.22, -.12, 42, 22, .12, 1.18]]],
    side_of_eye: ['face', [[-.59, -.03, 42, 30, -.10, 1.18], [.57, -.03, 42, 30, .10, 1.18]]],
    under_eye: ['face', [[-.39, .07, 58, 26, .08, 1.18], [.39, .07, 58, 26, -.08, 1.18]]],
    under_nose: ['face', [[0, .27, 34, 20, 0, 1.38]]],
    chin: ['face', [[0, .49, 52, 25, 0, 1.18]]],
    collarbones: ['body', [[-.24, -.43, 78, 27, .17, 1], [0, -.46, 78, 27, -.27, 1]]],
    underarm: ['body', [[.47, -.04, 34, 112, .12, 1]]],
  };

  function glowHtml(ax, ay, w, h, rot, intensity, boxW, boxH, k) {
    const gw = w * k;
    const gh = h * k;
    const left = ((ax + 1) / 2) * (boxW - gw);
    const top = ((ay + 1) / 2) * (boxH - gh);
    const layer = (ix, iy, op, blur) => `<i style="left:${(gw * ix).toFixed(1)}px;right:${(gw * ix).toFixed(1)}px;top:${(gh * iy).toFixed(1)}px;bottom:${(gh * iy).toFixed(1)}px;opacity:${Math.min(1, op * intensity).toFixed(3)};filter:blur(${(blur * k).toFixed(1)}px)"></i>`;
    return `<div class="glow" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;width:${gw.toFixed(1)}px;height:${gh.toFixed(1)}px;--r:${rot}rad">${layer(.02, .02, .27, 18)}${layer(.08, .06, .33, 10)}${layer(.15, .11, .25, 5)}</div>`;
  }

  async function startSession(id, before, audio) {
    const s = byId[id];
    store.last = id;
    saveStore();
    const playId = randomId();
    setLive(true);
    if (before != null) track('rating', { s: id, play: playId, when: 'before', val: before });

    root.innerHTML = `<main class="player">
      <div class="ptop"><button class="close" data-close aria-label="End session">${icon.close}</button><span class="round" id="round"></span><span class="spacer"></span></div>
      <div class="words" aria-live="polite"><div class="label" id="label"></div><div class="hint" id="hint"></div><div class="say" id="say">Getting your session ready…</div></div>
      <div class="dots" id="dots" aria-hidden="true">${POINT_ORDER.map(() => '<i></i>').join('')}</div>
      <div class="stage" id="stage">${Object.keys(VIEWS).map((n) => `<div class="view" data-view="${n}"><img src="/tap/art/${n}.webp" alt="" draggable="false"><div class="glows"></div></div>`).join('')}<div class="notice" id="notice" hidden></div></div>
      <div class="time"><span id="pos">0:00</span><input id="seek" type="range" min="0" max="${s.minutes * 60000}" value="0" step="250" aria-label="Session position"><span id="dur"></span></div>
      <div class="ctrl"><button class="skip" data-skip="-10" aria-label="Back 10 seconds">${icon.back10}</button><button class="pp" id="pp" aria-label="Pause">${icon.pause}</button><button class="skip" data-skip="10" aria-label="Forward 10 seconds">${icon.fwd10}</button></div>
    </main>`;

    const $ = (sel) => root.querySelector(sel);
    const el = { round: $('#round'), label: $('#label'), hint: $('#hint'), say: $('#say'), dots: [...root.querySelectorAll('#dots i')], stage: $('#stage'), pos: $('#pos'), dur: $('#dur'), seek: $('#seek'), pp: $('#pp'), notice: $('#notice'), views: Object.fromEntries([...root.querySelectorAll('.view')].map((v) => [v.dataset.view, v])) };

    const state = {
      id, s, playId, before, audio, timeline: [], rounds: 1, dur: 0, listened: 0, lastT: 0, started: false, finished: false, marks: new Set(),
      scrubbing: false, seg: null, phase: '', layoutKey: '', wake: null, raf: 0, closed: false,
    };
    current = state;

    function showPausedStart() {
      el.notice.hidden = false;
      el.notice.innerHTML = 'Tap play to start.';
      setPP(false);
    }
    function setPP(playing) {
      el.pp.innerHTML = playing ? icon.pause : icon.play;
      el.pp.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    }

    async function loadData() {
      try {
        const res = await fetch(`/tap/data/${id}.json`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (state.closed) return;
        state.timeline = data.timeline;
        state.rounds = data.rounds;
        state.dur = data.dur;
        el.seek.max = data.dur;
        el.dur.textContent = clock(data.dur);
        el.notice.hidden = !audio.paused || audio.currentTime > 0 || el.notice.textContent === '';
        paint(true);
      } catch (err) {
        if (!state.closed) fail('data');
      }
    }

    function fail(code) {
      track('play_error', { s: id, code });
      el.say.className = 'say dim';
      el.say.textContent = "This session didn't load. Check your connection and try again.";
      el.notice.hidden = false;
      el.notice.innerHTML = '<button data-retry>Try again</button>';
      setPP(false);
    }

    function layoutViews() {
      const W = el.stage.clientWidth;
      const H = el.stage.clientHeight;
      Object.entries(VIEWS).forEach(([name, v]) => {
        const fit = Math.min(W / v.w, H / v.h);
        const w = v.w * fit;
        const h = v.h * fit;
        const node = el.views[name];
        node.style.width = `${w}px`;
        node.style.height = `${h}px`;
        node.style.left = `${(W - w) / 2}px`;
        node.style.top = `${(H - h) / 2}px`;
        node.style.transform = `translateY(${v.offset * (w / v.refW)}px) scale(${v.scale})`;
      });
      state.layoutKey = '';
      if (state.timeline.length) paint(true);
      else setGlow('side_of_hand', false);
    }

    function setGlow(pointId, lit) {
      const key = `${pointId}|${lit}|${el.stage.clientWidth}x${el.stage.clientHeight}`;
      if (key === state.layoutKey) return;
      state.layoutKey = key;
      const [viewName, regions] = GLOWS[pointId];
      Object.entries(el.views).forEach(([name, node]) => {
        node.classList.toggle('on', name === viewName);
        node.querySelector('.glows').innerHTML = '';
      });
      if (!lit) return;
      const v = VIEWS[viewName];
      const node = el.views[viewName];
      const w = node.clientWidth;
      const h = node.clientHeight;
      const k = w / v.refW;
      node.querySelector('.glows').innerHTML = regions.map((r) => glowHtml(r[0], r[1], r[2], r[3], r[4], r[5], w, h, k)).join('');
    }

    function paint(force) {
      const ms = audio.currentTime * 1000;
      if (!state.scrubbing) {
        el.seek.value = ms;
        el.pos.textContent = clock(ms);
      }
      el.seek.style.setProperty('--p', `${(100 * Number(el.seek.value)) / Number(el.seek.max)}%`);
      const at = state.scrubbing ? Number(el.seek.value) : ms;
      let seg = state.timeline.find((g) => at >= g.s && at < g.e) || state.timeline[state.timeline.length - 1];
      if (!seg) return;
      const isPoint = seg.t === 'point';
      const phase = isPoint ? (at >= seg.a ? 'say' : 'ins') : 'text';
      if (!force && seg === state.seg && phase === state.phase) return;
      state.seg = seg;
      state.phase = phase;

      if (isPoint) {
        el.label.textContent = POINT_NAME[seg.p];
        el.hint.textContent = phase === 'say' ? 'Repeat after me' : '';
        el.say.className = phase === 'say' ? 'say' : 'say dim';
        el.say.textContent = phase === 'say' ? seg.say : seg.ins;
      } else {
        el.label.textContent = '';
        el.hint.textContent = '';
        el.say.className = 'say long';
        el.say.textContent = seg.text;
      }
      el.round.textContent = state.rounds > 1 && seg.r ? `Round ${seg.r} of ${state.rounds}` : '';
      const latest = state.timeline.filter((g) => g.t === 'point' && g.s <= at).pop();
      const idx = isPoint ? POINT_ORDER.indexOf(seg.p) : latest ? 8 : -1;
      el.dots.forEach((d, i) => d.classList.toggle('on', i <= idx));
      setGlow(latest ? latest.p : 'side_of_hand', isPoint);
    }

    function measure() {
      const t = audio.currentTime;
      const delta = t - state.lastT;
      state.lastT = t;
      if (!state.scrubbing && !audio.paused && delta > 0 && delta < 2) state.listened += delta;
      if (!state.dur) return;
      const frac = (state.listened * 1000) / state.dur;
      [25, 50, 75].forEach((pct) => {
        if (frac * 100 >= pct && !state.marks.has(pct)) {
          state.marks.add(pct);
          track('progress', { s: id, play: playId, pct });
        }
      });
    }

    function tick() {
      if (state.closed) return;
      paint(false);
      state.raf = requestAnimationFrame(tick);
    }
    state.measure = setInterval(measure, 500);
    state.raf = requestAnimationFrame(tick);

    async function keepAwake() {
      try {
        if ('wakeLock' in navigator && !audio.paused && !state.wake) {
          state.wake = await navigator.wakeLock.request('screen');
          state.wake.addEventListener('release', () => { state.wake = null; });
        }
      } catch { /* not available here */ }
    }
    function releaseWake() { if (state.wake) { state.wake.release().catch(() => {}); state.wake = null; } }

    const on = (node, type, fn) => { node.addEventListener(type, fn); (state.off = state.off || []).push(() => node.removeEventListener(type, fn)); };
    on(audio, 'playing', () => {
      el.notice.hidden = true;
      setPP(true);
      keepAwake();
      if (!state.started) {
        state.started = true;
        track('start', { s: id, play: playId, kind: s.kind });
      }
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    on(audio, 'waiting', () => {
      el.notice.hidden = false;
      el.notice.textContent = 'Loading…';
    });
    on(audio, 'pause', () => {
      setPP(false);
      releaseWake();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    on(audio, 'error', () => { if (!state.closed) fail(`audio_${audio.error ? audio.error.code : 0}`); });
    on(audio, 'ended', () => finish());
    on(document, 'visibilitychange', () => { if (!document.hidden) keepAwake(); });
    const stageWatcher = new ResizeObserver(layoutViews);
    stageWatcher.observe(el.stage);
    (state.off = state.off || []).push(() => stageWatcher.disconnect());
    on(window, 'pagehide', () => { if (state.started && !state.finished) sendLeave(); });

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: 'SHIFT', artwork: [{ src: '/assets/img/icon.png', sizes: '512x512', type: 'image/png' }] });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', () => skip(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => skip(10));
    }

    function skip(by) { audio.currentTime = Math.min(Math.max(0, audio.currentTime + by), (state.dur || 1e9) / 1000 - .25); state.lastT = audio.currentTime; }
    function sendLeave() {
      if (state.leftSent) return;
      state.leftSent = true;
      measure();
      const seg = state.seg;
      track('leave', { s: id, play: playId, heard: Math.round(state.listened), pos: Math.round(audio.currentTime), seg: seg ? (seg.p || seg.t) : '' });
    }
    function teardown() {
      state.closed = true;
      cancelAnimationFrame(state.raf);
      clearInterval(state.measure);
      (state.off || []).forEach((f) => f());
      releaseWake();
      setLive(false);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if ('mediaSession' in navigator) navigator.mediaSession.metadata = null;
    }
    function finish() {
      if (state.finished || state.closed) return;
      state.finished = true;
      measure();
      track('finish', { s: id, play: playId, kind: s.kind, heard: Math.round(state.listened) });
      store.finished = (store.finished || 0) + 1;
      saveStore();
      teardown();
      push('after');
      toTop();
      renderAfter(s, (after) => {
        if (after != null) track('rating', { s: id, play: playId, when: 'after', val: after });
        current = { doneFor: id };
        replace('done');
        renderDone(s, before, after);
        toTop();
      });
    }

    state.handlers = {
      close() { sendLeave(); teardown(); current = null; },
      toggle() { if (audio.paused) audio.play().catch(() => fail('play')); else audio.pause(); },
      skip,
      retry() {
        el.notice.hidden = true;
        if (!state.timeline.length) loadData();
        audio.load();
        audio.play().catch(() => fail('play'));
      },
      scrubStart() { state.scrubbing = true; },
      scrubMove() { el.pos.textContent = clock(el.seek.value); paint(true); },
      scrubEnd() { audio.currentTime = Number(el.seek.value) / 1000; state.lastT = audio.currentTime; state.scrubbing = false; },
      finish,
    };
    layoutViews();

    // play() has to run inside the tap, before anything async, or phones block the audio.
    audio.src = `/tap/audio/${id}.m4a`;
    audio.preload = 'auto';
    const firstPlay = audio.play();
    if (firstPlay) firstPlay.catch(() => { if (!state.closed) showPausedStart(); });
    await loadData();
  }

  /* ---------- Navigation ---------- */

  // A single audio element, unlocked by the tap that starts a session.
  const audioEl = new Audio();
  audioEl.setAttribute('playsinline', '');

  const push = (screen, extra) => history.pushState({ screen, ...extra }, '');
  const replace = (screen, extra) => history.replaceState({ screen, ...extra }, '');

  function show(state) {
    if (current && current.handlers) current.handlers.close();
    current = null;
    const name = state && state.screen;
    if (name === 'feeling') renderFeeling(state.id);
    else if (name === 'start' || name === 'player') renderStart(state.id);
    else renderHome();
    toTop();
  }

  root.addEventListener('click', (ev) => {
    const t = ev.target.closest('button,a');
    if (!t) return;
    const d = t.dataset;
    if (d.optout !== undefined) { store.off = true; saveStore(); t.textContent = 'Measuring is off'; return; }
    if (d.back !== undefined) { history.back(); return; }
    if (d.home !== undefined) { current = null; replace('home'); renderHome(); toTop(); return; }
    if (d.feeling) { track('pick', { feeling: d.feeling }); push('feeling', { id: d.feeling }); show({ screen: 'feeling', id: d.feeling }); return; }
    if (d.all !== undefined) { push('feeling', { id: null }); show({ screen: 'feeling', id: null }); return; }
    if (d.session) { push('start', { id: d.session }); show({ screen: 'start', id: d.session }); return; }
    if (d.app) { track('app_click', { where: d.app }); return; }
    if (d.rate !== undefined) {
      const val = Number(d.rate);
      const kind = t.parentElement.dataset.scale;
      if (kind === 'before') { push('player', { id: startId }); startSession(startId, val, audioEl); }
      else if (current && current.onAfter) current.onAfter(val);
      return;
    }
    if (d.skipRate !== undefined) { push('player', { id: startId }); startSession(startId, null, audioEl); return; }
    if (d.skipAfter !== undefined) { if (current && current.onAfter) current.onAfter(null); return; }
    if (d.again !== undefined) { const id = current && current.doneFor; replace('start', { id }); show({ screen: 'start', id }); return; }
    if (!current || !current.handlers) return;
    if (d.close !== undefined) { history.back(); return; }
    if (t.id === 'pp') { current.handlers.toggle(); return; }
    if (d.skip) { current.handlers.skip(Number(d.skip)); return; }
    if (d.retry !== undefined) current.handlers.retry();
  });
  root.addEventListener('input', (ev) => {
    if (ev.target.id === 'seek' && current && current.handlers) { if (!current.scrubbing) current.handlers.scrubStart(); current.handlers.scrubMove(); }
  });
  root.addEventListener('change', (ev) => {
    if (ev.target.id === 'seek' && current && current.handlers) current.handlers.scrubEnd();
  });
  // A homepage link like #faq also fires popstate, with no state. That isn't navigation inside the player.
  window.addEventListener('popstate', (ev) => { if (ev.state) show(ev.state); });

  /* ---------- Boot ---------- */

  store.visits = (store.visits || 0) + 1;
  saveStore();
  const pathId = location.pathname.replace(/^\/tap\/?/, '').replace(/\/$/, '');
  const entry = pathId && byId[pathId] ? pathId : '';
  if (embedded) {
    // On the homepage, only people who actually reach the player count as visitors to it.
    const seen = new IntersectionObserver((items) => {
      if (items.some((i) => i.isIntersecting)) {
        seen.disconnect();
        track('visit', { device, ref: refHost, entry: 'home', n: store.visits });
      }
    }, { threshold: 0.4 });
    seen.observe(root);
  } else {
    track('visit', { device, ref: refHost, entry, n: store.visits });
  }
  if (entry) { replace('start', { id: entry }); renderStart(entry); }
  else { replace('home'); renderHome(); }
})();
