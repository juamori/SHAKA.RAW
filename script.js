/* ==========================================================================
   SHAKA.RAW — SHAKA OS runtime
   You normally don't need to edit this file: content lives in config.js.
   All configurable text is inserted with textContent / createElement,
   never as raw HTML, so config values can't inject markup or scripts.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Config & environment ---------- */
  const C = window.SHAKA_CONFIG || {};
  const SITE = Object.assign({ name: 'SHAKA.RAW', os: 'SHAKA OS', tagline: 'no algorithm, just me', established: 2001 }, C.site);
  const ID = Object.assign({ displayName: 'Shaka', username: 'shaka', nickname: 'Ko', nicknameNote: 'short for koala', prompt: 'ko@shaka:~$' }, C.identity);
  const P = C.profile || {};
  const M = C.music || {};
  const KEY = 'shaka.raw:';
  const THEMES = ['purple', 'blue', 'amber'];
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wideLayout = window.matchMedia('(min-width: 1180px)');
  const startedAt = Date.now();

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const list = (v) => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
  const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const store = {
    get(k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* storage unavailable */ } },
  };

  /* ---------- Safe DOM helpers ---------- */
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false || kid === '') continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const SVGNS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs) {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // External links: absolute http(s) or mailto only.
  function safeUrl(u) {
    const v = str(u);
    if (!v) return null;
    try {
      const x = new URL(v);
      return ['http:', 'https:', 'mailto:'].includes(x.protocol) ? x.href : null;
    } catch (e) { return null; }
  }
  // Media (images/audio): relative paths allowed; script-like schemes refused.
  function safeMedia(u) {
    const v = str(u);
    if (!v) return null;
    if (/^\s*(javascript:|vbscript:|data:(?!image\/|audio\/))/i.test(v)) return null;
    return v;
  }
  function extLink(url, label, cls) {
    return h('a', { href: url, class: cls, target: '_blank', rel: 'noopener noreferrer' },
      label,
      h('span', { class: 'sr' }, ' (opens in a new tab)'));
  }
  function hostOf(url) {
    try { const x = new URL(url); return x.protocol === 'mailto:' ? x.pathname : x.host.replace(/^www\./, ''); } catch (e) { return ''; }
  }
  function empty(title, sub) {
    return h('div', { class: 'empty' }, h('p', { class: 'empty-t' }, title), sub && h('p', { class: 'empty-s' }, sub));
  }
  function pane(label, meta, ...body) {
    return h('section', { class: 'pane' },
      h('p', { class: 'pane-h' }, h('span', null, label), meta != null && h('b', null, meta)),
      ...body);
  }

  /* ---------- Data (validated once) ---------- */
  const LINKS = list(C.links).filter((l) => str(l.label) && safeUrl(l.url));
  const PROJECTS = list(C.projects).filter((p) => str(p.name));
  /* Archive: a tree of folders, each with optional items (images) and subfolders.
     Only items with a usable file path are listed: nothing is shown that isn't configured. */
  const slugify = (v) => str(v).toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  const IMG_SEG = /^img-(\d+)$/;
  function normItem(i) {
    const file = safeMedia(i.file);
    if (!file) return null;
    const meta = [];
    if (i.meta && typeof i.meta === 'object') {
      for (const [k, v] of Object.entries(i.meta)) { if (str(k) && str(v)) meta.push([str(k), str(v)]); }
    }
    const display = safeMedia(i.display) || file;
    return {
      file, display, thumb: safeMedia(i.thumb) || display,
      title: str(i.title), date: str(i.date), description: str(i.description),
      alt: str(i.alt) || str(i.title), meta, source: safeUrl(i.source),
      width: Number(i.width || i.w) > 0 ? Number(i.width || i.w) : null,
      height: Number(i.height || i.h) > 0 ? Number(i.height || i.h) : null,
    };
  }
  /* Images found on disk by tools/build_archive.py (archive-manifest.js), keyed by folder path.
     Details written in config.js (title, date, alt, meta…) are matched to them by file path. */
  const MANIFEST_FOLDERS = (window.SHAKA_ARCHIVE_MANIFEST && typeof window.SHAKA_ARCHIVE_MANIFEST.folders === 'object')
    ? window.SHAKA_ARCHIVE_MANIFEST.folders : {};
  function mergeItems(path, configured) {
    const auto = list(MANIFEST_FOLDERS[path]);
    const byFile = new Map(configured.filter((c) => str(c.file)).map((c) => [str(c.file), c]));
    const merged = auto.map((a) => Object.assign({}, a, byFile.get(str(a.file)) || {}));
    const autoFiles = new Set(auto.map((a) => str(a.file)));
    configured.forEach((c) => { if (!autoFiles.has(str(c.file))) merged.push(c); }); // entries not on disk (e.g. external URLs)
    return merged.filter((x) => !x.hidden).map(normItem).filter(Boolean);
  }
  // Videos: { file, poster?, title?, description?, date?, width?, height?, duration?, meta? }
  function normVideo(v) {
    const file = safeMedia(v.file);
    if (!file || v.hidden) return null;
    const meta = [];
    if (v.meta && typeof v.meta === 'object') {
      for (const [k, val] of Object.entries(v.meta)) { if (str(k) && str(val)) meta.push([str(k), str(val)]); }
    }
    return {
      file, poster: safeMedia(v.poster), title: str(v.title), description: str(v.description),
      date: str(v.date), duration: str(v.duration), meta,
      width: Number(v.width) > 0 ? Number(v.width) : null, height: Number(v.height) > 0 ? Number(v.height) : null,
    };
  }

  function normFolder(f, parent) {
    const id = slugify(f.id || f.name);
    if (!id || IMG_SEG.test(id)) return null;
    const path = parent ? `${parent.path}/${id}` : id;
    const folder = { id, path, parent: parent || null, description: str(f.description), items: [], videos: [], folders: [] };
    folder.items = mergeItems(path, list(f.items));
    folder.videos = list(f.videos).map(normVideo).filter(Boolean);
    folder.folders = list(f.folders).map((sf) => normFolder(sf, folder)).filter(Boolean);
    return folder;
  }
  const ARCHIVE_ROOT = (() => {
    const cfg = C.archive;
    // Older config shape (a flat list) is still accepted: those entries land in unsorted/.
    const folders = Array.isArray(cfg) ? [{ id: 'unsorted', items: cfg }] : list(cfg && cfg.folders);
    const seen = new Set();
    return folders.map((f) => normFolder(f, null)).filter((f) => f && !seen.has(f.id) && seen.add(f.id));
  })();
  // Folders that exist on disk but aren't listed in config.js still appear (appended at the end).
  (function addDiskFolders() {
    const find = (folders, id) => folders.find((x) => x.id === id);
    Object.keys(MANIFEST_FOLDERS).sort().forEach((path) => {
      let level = ARCHIVE_ROOT;
      let parent = null;
      path.split('/').forEach((seg) => {
        const id = slugify(seg);
        if (!id) return;
        let f = find(level, id);
        if (!f) {
          f = { id, path: parent ? `${parent.path}/${id}` : id, parent, description: '', items: [], videos: [], folders: [] };
          f.items = mergeItems(f.path, []);
          level.push(f);
        }
        parent = f;
        level = f.folders;
      });
    });
  })();
  const ARCHIVE_INDEX = new Map();
  const ARCHIVE = []; // every item, flattened: { item, folder, n }
  (function index(folders) {
    folders.forEach((f) => {
      ARCHIVE_INDEX.set(f.path, f);
      f.items.forEach((item, i) => ARCHIVE.push({ item, folder: f, n: i + 1 }));
      index(f.folders);
    });
  })(ARCHIVE_ROOT);
  const folderTotal = (f) => f.items.length + f.videos.length + f.folders.reduce((n, sf) => n + folderTotal(sf), 0);
  const VIDEO_COUNT = ARCHIVE_ROOT.reduce(function count(n, f) { return n + f.videos.length + f.folders.reduce(count, 0); }, 0);
  const itemHash = (e) => `#archive/${e.folder.path}/img-${e.n}`;
  const INTERESTS = list(C.interests)
    .map((c) => ({
      folder: str(c.folder) || str(c.category).toLowerCase().replace(/\s+/g, '_'),
      category: str(c.category),
      description: str(c.description),
      items: list(c.items).filter((i) => str(i.title)),
    }))
    .filter((c) => c.folder && (c.items.length || c.description));
  const ARTISTS = list(M.artists).filter((x) => str(x.title));
  const ALBUMS = list(M.albums).filter((x) => str(x.title));
  const TRACKS = list(M.tracks).filter((x) => str(x.title));
  const PLAYLISTS = list(M.playlists).filter((x) => str(x.title) && safeUrl(x.url));
  const WISH_STATES = ['want', 'hunting', 'acquired'];
  const WISHLIST = list(M.wishlist).filter((x) => str(x.title)).map((x) => {
    const st = str(x.status).toLowerCase();
    return Object.assign({}, x, { status: WISH_STATES.includes(st) ? st : 'want' });
  });
  const KO = Object.assign({ messages: ['ko.exe is running. probably.'], notFound: '404: koala wandered off.' }, C.ko);
  const KO_MSGS = (Array.isArray(KO.messages) ? KO.messages : []).map(str).filter(Boolean);
  const FORTUNES = ((C.terminal && Array.isArray(C.terminal.fortunes)) ? C.terminal.fortunes : []).map(str).filter(Boolean);
  function wishCounts() {
    const c = { want: 0, hunting: 0, acquired: 0 };
    WISHLIST.forEach((w) => { c[w.status] += 1; });
    return c;
  }
  const PLAYABLE = TRACKS.filter((t) => safeMedia(t.src));
  const NOW = M.nowListening && str(M.nowListening.title) ? M.nowListening : null;
  const BIO = (Array.isArray(C.bio) ? C.bio : [C.bio]).map(str).filter(Boolean);

  const PROFILE_FIELDS = [
    ['name', 'name'], ['occupation', 'occupation'], ['location', 'location'],
    ['currentlyInto', 'currently into'], ['status', 'status'], ['funFact', 'fun fact'],
  ].filter(([k]) => str(P[k]));

  const SECTIONS = [
    { id: 'home', file: 'home.sys', label: 'Home', desc: 'start here', dir: false },
    { id: 'about', file: 'about.txt', label: 'About me', desc: 'profile and bio', dir: false },
    { id: 'music', file: 'music.lib', label: 'Music', desc: 'favorites, playlists, wishlist', dir: false },
    { id: 'interests', file: 'interests/', label: 'Interests', desc: 'things I like', dir: true },
    { id: 'lab', file: 'lab/', label: 'Lab', desc: 'projects and experiments', dir: true },
    { id: 'links', file: 'links.url', label: 'Links', desc: 'elsewhere on the internet', dir: false },
    { id: 'archive', file: 'archive.raw', label: 'Archive', desc: 'collected fragments', dir: false },
  ];
  const SEC = Object.fromEntries(SECTIONS.map((x, i) => [x.id, Object.assign({ addr: '0x' + i.toString(16).padStart(2, '0') }, x)]));

  function countFor(id) {
    switch (id) {
      case 'home': return null;
      case 'about': return PROFILE_FIELDS.length + (BIO.length ? 1 : 0);
      case 'music': return ARTISTS.length + ALBUMS.length + TRACKS.length + PLAYLISTS.length + WISHLIST.length + (NOW ? 1 : 0);
      case 'interests': return INTERESTS.reduce((n, c) => n + c.items.length, 0);
      case 'lab': return PROJECTS.length;
      case 'links': return LINKS.length;
      case 'archive': return ARCHIVE.length;
      default: return 0;
    }
  }

  /* ---------- Copy with a little personality ---------- */
  const SYS_MSGS = [
    { t: 'all systems nominal.', lang: 'en' },
    { t: '現在、システムは正常です。', lang: 'ja', title: 'Japanese: the system is currently operating normally.' },
    { t: '시스템 정상 작동 중.', lang: 'ko', title: 'Korean: system operating normally.' },
    { t: 'sistema funcionando normalmente.', lang: 'pt-BR' },
    { t: 'algorithm: not found. as intended.', lang: 'en' },
    { t: 'vinyl cleaning in progress. please hold.', lang: 'en' },
  ];
  const WELCOMES = [
    { t: '> welcome, wanderer.', lang: 'en' },
    { t: '> you found it. most people scroll past.', lang: 'en' },
    { t: '> bem-vindo. fique à vontade.', lang: 'pt-BR' },
    { t: '> ようこそ。welcome in.', lang: 'ja' },
    { t: '> pull up a chair. mind the vinyl.', lang: 'en' },
  ];

  /* ---------- Pixel koala (avatar placeholder, drawn from a grid) ---------- */
  const KOALA = [
    '.EEE......EEE.',
    'EEeeE....EeeEE',
    'EeeeEGGGGEeeeE',
    'EEeGGGGGGGGeEE',
    '.EGGGGGGGGGGE.',
    '..GGkGGGGkGG..',
    '..GGGGNNGGGG..',
    '..GGGNNNNGGG..',
    '..GGGNNNNGGG..',
    '...GGGNNGGG...',
    '....GGGGGG....',
    '.....GGGG.....',
  ];
  function pixelKoala() {
    const svg = s('svg', { viewBox: `0 0 ${KOALA[0].length} ${KOALA.length}`, role: 'img', 'aria-label': 'Pixel koala, avatar placeholder' });
    KOALA.forEach((row, y) => [...row].forEach((c, x) => {
      if (c !== '.') svg.append(s('rect', { x, y, width: 1.02, height: 1.02, class: 'px-' + c }));
    }));
    return svg;
  }
  function avatar() {
    const a = C.avatar || {};
    const src = safeMedia(a.src);
    const box = h('div', { class: 'avatar' });
    if (src) {
      const img = h('img', { src, alt: str(a.alt) || `${ID.displayName}'s avatar`, width: 104, height: 104 });
      img.addEventListener('error', () => { img.remove(); box.append(pixelKoala()); }, { once: true });
      box.append(img);
    } else {
      box.append(pixelKoala());
    }
    return box;
  }

  /* ---------- Sections ---------- */
  function sectionShell(id, ...content) {
    return h('section', { class: 'sec', id: 'sec-' + id, 'aria-labelledby': 'h-' + id, hidden: true }, ...content);
  }
  function head(id, title, sub) {
    return h('header', { class: 'sec-head' },
      h('h2', { id: 'h-' + id, tabindex: '-1' }, title),
      sub && h('p', null, sub));
  }

  function renderHome() {
    const dot = SITE.name.lastIndexOf('.');
    const main = dot > 0 ? SITE.name.slice(0, dot) : SITE.name;
    const ext = dot > 0 ? SITE.name.slice(dot) : '';
    const w = pick(WELCOMES);

    const frame = h('div', { class: 'frame pane' },
      ['tl', 'tr', 'bl', 'br'].map((c) => h('span', { class: 'cm ' + c, 'aria-hidden': 'true' })),
      h('p', { class: 'welcome', lang: w.lang }, w.t),
      h('h1', { class: 'wordmark', id: 'h-home', tabindex: '-1' }, main, ext && h('span', { class: 'ext' }, ext)),
      h('p', { class: 'tagline' }, SITE.tagline),
      h('p', { class: 'est' }, 'PERSONAL DIRECTORY // ', h('span', null, `EST. ${SITE.established}`)),
      BIO[1] && h('p', { class: 'intro' }, BIO[1]));

    const exifRows = [
      ['file', `${ID.username}.raw`],
      ['owner', `${ID.nickname.toLowerCase()} (${ID.nicknameNote})`],
      ['user since', String(SITE.established)],
      ['location', str(P.location)],
      ['algorithm', 'none'],
      ['processing', 'unedited, unfiltered'],
    ].filter((r) => r[1]);
    const sidecar = pane(`${ID.username}.raw.xmp`, 'sidecar',
      h('dl', { class: 'exif' }, exifRows.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v)))));

    const wc = wishCounts();
    const wishText = WISHLIST.length
      ? [wc.want && `${wc.want} wanted`, wc.hunting && `${wc.hunting} hunting`, wc.acquired && `${wc.acquired} acquired`].filter(Boolean).join(', ')
      : '';
    const statusItems = [
      ['status', str(P.status), true],
      ['currently into', str(P.currentlyInto)],
      ['fun fact', str(P.funFact)],
      ['vinyl wishlist', wishText && h('a', { href: '#music', class: 'wish-link' }, `${WISHLIST.length} records: ${wishText}`)],
    ].filter((r) => r[1]);
    const status = pane('status.now', 'live',
      h('div', { class: 'pane-b idcard' },
        h('figure', { class: 'ko-fig' }, avatar(), KO_MSGS.length > 0 && h('figcaption', null, pick(KO_MSGS))),
        h('dl', { class: 'status-list' }, statusItems.map(([k, v, live]) => [
          h('dt', null, k),
          h('dd', null, live && h('span', { class: 'live-dot', 'aria-hidden': 'true' }), v),
        ]))));

    const rows = SECTIONS.filter((x) => x.id !== 'home').map((x) => {
      const n = countFor(x.id);
      return h('a', { class: 'ls-row', href: '#' + x.id },
        h('span', { class: 'ls-perm' }, x.dir ? 'drwxr-xr-x' : '-rw-r--r--'),
        h('span', { class: 'ls-size' }, n ? `${n} item${n === 1 ? '' : 's'}` : 'empty'),
        h('span', { class: 'ls-name' }, x.file, h('small', null, x.desc)));
    });
    const ls = pane('ls -l ~/shaka', `${rows.length} entries`, h('div', { class: 'ls' }, rows));

    let ms = 4;
    const t = () => {
      ms += 9 + Math.floor(Math.random() * 30);
      return `[${String(Math.floor(ms / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}]`;
    };
    const log = h('pre', { class: 'syslog' });
    const lines = [
      [`${SITE.os} booted. personal directory est. ${SITE.established}.`, 'ok'],
      ['profile loaded: 1 human, 1 koala alias.', 'ok'],
      P.status && [`status: ${str(P.status).toLowerCase()}.`],
      WISHLIST.length && [`vinyl.wishlist indexed: ${WISHLIST.length} records.`, 'ok'],
      ['recommendation engine: not installed (on purpose).', 'ok'],
      P.funFact && [`warning: ${str(P.funFact).replace(/\.$/, '').toLowerCase()}.`, 'warn'],
    ].filter(Boolean);
    lines.forEach(([txt, cls]) => {
      log.append(h('span', { class: 'dim' }, t() + ' '), h('span', { class: cls || '' }, txt), '\n');
    });
    const syslog = pane('system.log', 'this session', log);
    syslog.classList.add('span-2');

    // Recently added archive items: only when real entries exist (newest = last in config).
    let recent = null;
    if (ARCHIVE.length) {
      // Dated items first (newest), then the first items listed in each folder.
      const ranked = ARCHIVE.slice().sort((a, b) => (b.item.date || '').localeCompare(a.item.date || ''));
      recent = pane('archive.raw // recent', `${Math.min(3, ARCHIVE.length)} of ${ARCHIVE.length}`,
        h('ul', { class: 'items' }, ranked.slice(0, 3).map((e) => h('li', null,
          h('a', { class: 'it-t', href: itemHash(e) }, e.item.title || `${e.folder.id}/ image ${e.n}`),
          h('span', { class: 'it-s' }, [`${e.folder.path}/`, e.item.date].filter(Boolean).join(' / '))))));
      recent.classList.add('span-2');
    }

    return sectionShell('home',
      h('div', { class: 'hero' }, frame, sidecar),
      h('div', { class: 'home-grid' }, status, ls, recent, syslog));
  }

  function renderAbout() {
    const profile = pane('about.txt', `${PROFILE_FIELDS.length} fields`,
      h('dl', { class: 'profile' }, PROFILE_FIELDS.map(([k, label]) => h('div', null, h('dt', null, label), h('dd', null, str(P[k]))))));
    const bio = pane('bio.txt', 'provisional',
      h('div', { class: 'pane-b bio' }, BIO.map((p) => h('p', null, p))));
    return sectionShell('about',
      head('about', 'About me', `${ID.displayName}, or ${ID.nickname} if we're friends. User since ${SITE.established}.`),
      h('div', { class: 'about-grid' }, profile, bio));
  }

  function renderPlayer() {
    const wrap = h('div', { class: 'player' });
    const titleEl = h('p', { class: 'player-title' });
    const subEl = h('p', { class: 'player-sub' });
    const eq = h('div', { class: 'eq', 'aria-hidden': 'true' }, Array.from({ length: 16 }, () => h('i')));
    wrap.append(h('div', { class: 'player-screen', 'aria-live': 'polite' }, titleEl, subEl));

    if (!PLAYABLE.length) {
      titleEl.textContent = 'no source loaded';
      subEl.textContent = 'player unconfigured. nothing is playing.';
      wrap.append(h('div', { class: 'player-row' },
        h('button', { type: 'button', class: 'pbtn pbtn--main', disabled: true, 'aria-label': 'Play (no audio configured)' }, '▶'),
        eq));
      return wrap;
    }

    const audio = new Audio();
    audio.preload = 'metadata';
    let i = 0;
    const fmt = (sec) => (isFinite(sec) ? `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}` : '0:00');
    const playBtn = h('button', { type: 'button', class: 'pbtn pbtn--main', 'aria-label': 'Play' }, '▶');
    const prevBtn = h('button', { type: 'button', class: 'pbtn', 'aria-label': 'Previous track' }, '⏮');
    const nextBtn = h('button', { type: 'button', class: 'pbtn', 'aria-label': 'Next track' }, '⏭');
    const seek = h('input', { type: 'range', class: 'seek', min: 0, max: 1000, value: 0, step: 1, 'aria-label': 'Seek' });
    const time = h('span', { class: 'ptime' }, '0:00 / 0:00');

    function load(n, autoplay) {
      i = (n + PLAYABLE.length) % PLAYABLE.length;
      const t = PLAYABLE[i];
      audio.src = safeMedia(t.src);
      titleEl.textContent = str(t.title);
      subEl.textContent = [str(t.artist), `track ${i + 1}/${PLAYABLE.length}`, 'stopped'].filter(Boolean).join(' / ');
      seek.value = 0;
      if (autoplay) audio.play().catch(() => { subEl.textContent = 'playback blocked by the browser. press play.'; });
    }
    function setSub(state) {
      const t = PLAYABLE[i];
      subEl.textContent = [str(t.artist), `track ${i + 1}/${PLAYABLE.length}`, state].filter(Boolean).join(' / ');
    }
    playBtn.addEventListener('click', () => {
      if (audio.paused) audio.play().catch(() => { subEl.textContent = 'could not start playback.'; });
      else audio.pause();
    });
    prevBtn.addEventListener('click', () => load(i - 1, !audio.paused));
    nextBtn.addEventListener('click', () => load(i + 1, !audio.paused));
    seek.addEventListener('input', () => { if (isFinite(audio.duration)) audio.currentTime = (seek.value / 1000) * audio.duration; });
    audio.addEventListener('play', () => { wrap.classList.add('is-playing'); playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', 'Pause'); setSub('playing'); });
    audio.addEventListener('pause', () => { wrap.classList.remove('is-playing'); playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play'); setSub('paused'); });
    audio.addEventListener('timeupdate', () => {
      time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
      if (isFinite(audio.duration) && audio.duration > 0) seek.value = Math.round((audio.currentTime / audio.duration) * 1000);
    });
    audio.addEventListener('loadedmetadata', () => { time.textContent = `0:00 / ${fmt(audio.duration)}`; });
    audio.addEventListener('ended', () => { if (i < PLAYABLE.length - 1) load(i + 1, true); else setSub('end of list'); });
    audio.addEventListener('error', () => { wrap.classList.remove('is-playing'); subEl.textContent = `could not load "${str(PLAYABLE[i].src)}". check the file path in config.js.`; });

    load(0, false);
    wrap.append(h('div', { class: 'player-row' }, prevBtn, playBtn, nextBtn, eq), h('div', { class: 'player-row' }, seek, time));
    return wrap;
  }

  function itemList(items, subFn) {
    return h('ul', { class: 'items' }, items.map((it) => {
      const url = safeUrl(it.url);
      const cover = safeMedia(it.cover);
      const title = url ? extLink(url, str(it.title)) : str(it.title);
      const sub = subFn ? subFn(it) : str(it.note);
      return h('li', { class: cover ? 'has-cover' : '' },
        cover && h('img', { class: 'cover', src: cover, alt: '', loading: 'lazy', width: 56, height: 56 }),
        h('div', null, h('span', { class: 'it-t' }, title), sub && h('span', { class: 'it-s' }, ' ', sub)));
    }));
  }

  // Record sleeve: a CSS vinyl placeholder, replaced by real artwork when a cover is configured.
  function sleeve(cover, cls) {
    const box = h('div', { class: 'sleeve ' + (cls || ''), 'aria-hidden': 'true' }, h('span', { class: 'disc' }));
    const src = safeMedia(cover);
    if (src) {
      const img = h('img', { src, alt: '', loading: 'lazy' });
      img.addEventListener('error', () => img.remove(), { once: true });
      box.append(img);
    }
    return box;
  }

  // Playlist artwork: asks Spotify's public oEmbed endpoint for the cover image.
  // No credentials involved; if it fails, the placeholder cover simply stays.
  const SPOTIFY_IMG = /^https:\/\/([a-z0-9-]+\.)*(scdn\.co|spotifycdn\.com)\//i;
  function loadPlaylistArt(url, box) {
    if (M.fetchPlaylistArtwork === false || !window.fetch) return;
    fetch('https://open.spotify.com/oembed?url=' + encodeURIComponent(url))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('oembed ' + r.status))))
      .then((d) => {
        const src = d && typeof d.thumbnail_url === 'string' ? d.thumbnail_url : '';
        if (!SPOTIFY_IMG.test(src)) return;
        const img = h('img', { src, alt: '', loading: 'lazy' });
        img.addEventListener('load', () => box.classList.add('has-art'), { once: true });
        img.addEventListener('error', () => img.remove(), { once: true });
        box.append(img);
      })
      .catch(() => { /* placeholder stays */ });
  }

  function renderMusic() {
    const blocks = [];

    if (NOW) blocks.push(pane('now_listening', null, itemList([NOW], (x) => str(x.artist))));

    if (ARTISTS.length) {
      blocks.push(pane('favorite_artists/', `${ARTISTS.length} artists & bands`,
        h('ul', { class: 'namegrid' }, ARTISTS.map((a) => {
          const url = safeUrl(a.url);
          return h('li', null, url ? extLink(url, str(a.title)) : str(a.title));
        }))));
    }

    if (ALBUMS.length) {
      blocks.push(pane('essential_albums/', `${ALBUMS.length} records`,
        h('ul', { class: 'albums' }, ALBUMS.map((a) => h('li', { class: 'album' },
          sleeve(a.cover),
          h('div', { class: 'album-b' },
            h('h3', null, str(a.title)),
            str(a.artist) && h('p', { class: 'album-artist' }, str(a.artist)),
            str(a.note) && h('p', { class: 'album-note' }, str(a.note))))))));
    }

    if (PLAYLISTS.length) {
      blocks.push(pane(str(M.playlistsHeading) || 'public.playlists', `${PLAYLISTS.length} on Spotify`,
        h('div', { class: 'pane-b pl-wrap' },
          str(M.playlistsSubtitle) && h('p', { class: 'pl-sub' }, str(M.playlistsSubtitle)),
          h('ul', { class: 'playlists' }, PLAYLISTS.map((pl, n) => {
            const url = safeUrl(pl.url);
            const art = h('div', { class: 'pl-art pl-art--' + (n % 4), 'aria-hidden': 'true' },
              h('span', { class: 'pl-art-t' }, `playlist_${String(n + 1).padStart(2, '0')}.m3u`));
            const cover = safeMedia(pl.cover);
            if (cover) {
              const img = h('img', { src: cover, alt: '', loading: 'lazy' });
              img.addEventListener('error', () => img.remove(), { once: true });
              art.append(img);
            } else if (/^https:\/\/open\.spotify\.com\//.test(url)) {
              loadPlaylistArt(url, art);
            }
            const tags = Array.isArray(pl.tags) ? pl.tags.map(str).filter(Boolean) : [];
            return h('li', null, h('a', { class: 'pl-card', href: url, target: '_blank', rel: 'noopener noreferrer' },
              art,
              h('span', { class: 'pl-b' },
                h('span', { class: 'pl-t' }, str(pl.title)),
                tags.length > 0 && h('span', { class: 'pl-tags' }, tags.join(' / ')),
                h('span', { class: 'pl-x', 'aria-hidden': 'true' }, 'open on Spotify ↗')),
              h('span', { class: 'sr' }, ' (Spotify playlist, opens in a new tab)')));
          })))));
    }

    if (WISHLIST.length) {
      const wc = wishCounts();
      blocks.push(pane('vinyl.wishlist', `want ${wc.want} / hunting ${wc.hunting} / acquired ${wc.acquired}`,
        h('ul', { class: 'wishlist' }, WISHLIST.map((w) => h('li', { class: 'wish wish--' + w.status },
          sleeve(w.cover, 'sleeve--sm'),
          h('div', { class: 'wish-b' },
            h('p', { class: 'wish-t' }, str(w.title)),
            str(w.artist) && h('p', { class: 'wish-a' }, str(w.artist)),
            h('p', { class: 'wish-s' }, h('span', { class: 'sr' }, 'status: '), w.status.toUpperCase())))))));
    }

    const hasLibrary = NOW || ARTISTS.length || ALBUMS.length || TRACKS.length || PLAYLISTS.length || WISHLIST.length;
    if (!hasLibrary) blocks.push(empty('music.lib is not indexed yet.', 'artists, albums and playlists will show up here once they are added.'));
    if (TRACKS.length) blocks.push(pane('tracks/', TRACKS.length, itemList(TRACKS, (x) => str(x.artist))));

    blocks.push(pane('player.exe', PLAYABLE.length ? `${PLAYABLE.length} local file${PLAYABLE.length === 1 ? '' : 's'}` : 'idle', renderPlayer()));
    if (str(M.notes)) blocks.push(pane('liner_notes.txt', null, h('p', { class: 'pane-b' }, str(M.notes))));

    return sectionShell('music',
      head('music', 'Music', 'What is spinning, what was spinning, and what should be.'),
      h('div', { class: 'music-stack' }, blocks));
  }

  function renderInterests() {
    return sectionShell('interests',
      head('interests', 'Interests', 'Folders of things that live rent-free in my head.'),
      INTERESTS.length
        ? h('div', { class: 'folders' }, INTERESTS.map((c) => pane(c.folder + '/', c.items.length ? `${c.items.length} item${c.items.length === 1 ? '' : 's'}` : null,
          (c.category || c.description) && h('div', { class: 'pane-b folder-b' },
            c.category && h('h3', { class: 'folder-t' }, c.category),
            c.description && h('p', { class: 'folder-d' }, c.description)),
          c.items.length > 0 && itemList(c.items))))
        : empty('no folders here yet.', 'interests are still being sorted.'));
  }

  function renderLab() {
    const content = PROJECTS.length
      ? h('div', { class: 'projects' }, PROJECTS.map((p) => {
        const url = safeUrl(p.url);
        const thumb = safeMedia(p.thumbnail);
        const tech = Array.isArray(p.tech) ? p.tech.map(str).filter(Boolean) : [];
        return h('article', { class: 'pane proj' },
          thumb ? h('img', { class: 'proj-thumb', src: thumb, alt: '', loading: 'lazy' }) : h('p', { class: 'pane-h' }, h('span', null, str(p.category) || 'experiment'), str(p.status) && h('b', null, str(p.status))),
          h('div', { class: 'proj-b' },
            h('h3', null, url ? extLink(url, str(p.name)) : str(p.name)),
            thumb && (str(p.category) || str(p.status)) && h('p', null, [str(p.category), str(p.status)].filter(Boolean).join(' / ')),
            str(p.description) && h('p', null, str(p.description)),
            tech.length > 0 && h('ul', { class: 'tags', 'aria-label': 'Technologies' }, tech.map((t) => h('li', null, t))),
            url && h('a', { class: 'proj-open', href: url, target: '_blank', rel: 'noopener noreferrer' },
              'open project', h('span', { 'aria-hidden': 'true' }, ' ↗'), h('span', { class: 'sr' }, `: ${str(p.name)} (opens in a new tab)`))));
      }))
      : empty('the lab is quiet. no experiments logged yet.', 'projects, prototypes and half-finished ideas will land here.');
    return sectionShell('lab', head('lab', 'Lab', 'Things I make, break, and occasionally finish.'), content);
  }

  function renderLinks() {
    const content = LINKS.length
      ? pane('links.url', `${LINKS.length} external`,
        h('ul', { class: 'linkdir' }, LINKS.map((l) => {
          const url = safeUrl(l.url);
          return h('li', null, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' },
            h('span', { class: 'lk-l' }, str(l.label)),
            h('span', { class: 'lk-h' }, [str(l.handle) || hostOf(url), str(l.note) && str(l.note) !== str(l.handle) ? str(l.note) : ''].filter(Boolean).join(' // ')),
            h('span', { class: 'lk-x', 'aria-hidden': 'true' }, 'external ↗'),
            h('span', { class: 'sr' }, ' (opens in a new tab)')));
        })))
      : empty('no links configured yet.', 'this directory will point elsewhere on the internet soon.');
    return sectionShell('links', head('links', 'Links', 'Where else to find me. Each one leaves this site.'), content);
  }

  function renderArchive() {
    return sectionShell('archive',
      head('archive', 'Archive', 'Collected fragments: photos, finds, notes and references.'),
      h('p', { class: 'lang-note' }, h('span', { lang: 'ja' }, 'アーカイブ'), ' / ', h('span', { lang: 'ko' }, '아카이브'), ' / arquivo'),
      h('div', { id: 'archive-view', class: 'archive-view' }));
  }

  const emptySlots = (count) => h('div', { class: 'slots', 'aria-hidden': 'true' },
    Array.from({ length: count }, (_, n) => h('div', { class: 'slot' }, `slot_${String(n + 1).padStart(2, '0')}.raw  --  empty`)));

  function folderRows(folders) {
    return h('div', { class: 'ls' }, folders.map((f) => {
      const n = folderTotal(f);
      const subs = f.folders.length;
      return h('a', { class: 'ls-row', href: `#archive/${f.path}` },
        h('span', { class: 'ls-perm' }, 'drwxr-xr-x'),
        h('span', { class: 'ls-size' }, n ? `${n} file${n === 1 ? '' : 's'}` : 'empty'),
        h('span', { class: 'ls-name' }, f.id + '/',
          (f.description || subs > 0) && h('small', null, f.description || `${subs} folders`)));
    }));
  }

  function crumbs(folder) {
    const chain = [];
    for (let f = folder; f; f = f.parent) chain.unshift(f);
    return h('nav', { class: 'crumbs', 'aria-label': 'Archive path' },
      h('a', { href: '#archive' }, 'archive.raw'),
      chain.map((f, i) => [h('span', { class: 'crumb-sep', 'aria-hidden': 'true' }, ' / '),
        i === chain.length - 1 ? h('span', { 'aria-current': 'page' }, f.id + '/') : h('a', { href: `#archive/${f.path}` }, f.id + '/')]));
  }

  function tile(e) {
    const { item, folder, n } = e;
    const label = item.title || `image ${n}`;
    const img = h('img', { class: 'tile-img', src: item.thumb, alt: '', loading: 'lazy', decoding: 'async', width: item.width, height: item.height });
    img.addEventListener('error', () => {
      img.replaceWith(h('div', { class: 'tile-none' }, 'file missing'));
    }, { once: true });
    return h('li', { class: 'pane tile' },
      h('a', { class: 'tile-link', href: `#archive/${folder.path}/img-${n}`, 'aria-label': `${label}${item.date ? ', ' + item.date : ''}. Open image.` },
        img,
        (item.title || item.date) && h('span', { class: 'tile-b' },
          item.date && h('span', { class: 'tile-meta' }, item.date),
          item.title && h('span', { class: 'tile-t' }, item.title))));
  }

  function archiveRootView() {
    const total = ARCHIVE.length + VIDEO_COUNT;
    return [
      total === 0 && empty('No files indexed yet.', 'directory awaiting new fragments.'),
      pane('ls ~/archive.raw', `${ARCHIVE_ROOT.length} folders / ${total} file${total === 1 ? '' : 's'}`, folderRows(ARCHIVE_ROOT)),
      total === 0 && emptySlots(6),
    ];
  }

  function archiveFolderView(folder) {
    const items = folder.items.map((item, i) => ({ item, folder, n: i + 1 }));
    const parentHref = folder.parent ? `#archive/${folder.parent.path}` : '#archive';
    return [
      crumbs(folder),
      h('header', { class: 'folder-head' },
        h('h3', { id: 'archive-here', tabindex: '-1' }, folder.id + '/'),
        folder.description && h('p', null, folder.description)),
      folder.folders.length > 0 && pane('subfolders', `${folder.folders.length}`, folderRows(folder.folders)),
      items.length > 0 && pane(`${folder.id}/`, `${items.length} file${items.length === 1 ? '' : 's'}`,
        h('ul', { class: 'tiles gallery' }, items.map(tile))),
      folder.videos.length > 0 && pane(`${folder.id}/ // video`, `${folder.videos.length} video${folder.videos.length === 1 ? '' : 's'}`,
        h('ul', { class: 'videos' }, folder.videos.map(videoCard))),
      items.length === 0 && folder.videos.length === 0 && folder.folders.length === 0 && [
        empty(`${folder.id}/ is empty.`, 'nothing has been filed here yet.'),
        emptySlots(3),
      ],
      h('a', { class: 'back-link', href: parentHref }, h('span', { 'aria-hidden': 'true' }, '↩ '), folder.parent ? `back to ${folder.parent.id}/` : 'back to archive.raw'),
    ];
  }

  // One native player per video: play/pause, volume, timeline and fullscreen come from the browser.
  // preload="metadata" + poster: nothing heavy downloads until play is pressed. Never autoplays.
  const VIDEO_TYPES = { mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm' };
  function videoCard(v) {
    const name = v.file.split('/').pop();
    const label = v.title || name;
    const video = h('video', {
      class: 'av-player', controls: true, preload: 'metadata', playsinline: true,
      poster: v.poster, width: v.width, height: v.height, 'aria-label': `Video: ${label}`,
    },
      h('source', { src: v.file, type: VIDEO_TYPES[(name.split('.').pop() || '').toLowerCase()] || null }),
      h('p', { class: 'av-fallback' }, 'Your browser can\'t play this video here. ', h('a', { href: v.file }, 'Download it instead.')));
    // If the browser can't play it (missing file or unsupported codec), say so honestly and offer the file.
    video.addEventListener('error', () => {
      video.replaceWith(h('div', { class: 'lb-missing' },
        'this video can\'t be played in this browser. ', h('a', { href: v.file }, 'open the file directly')));
    }, true);
    // Only one video plays at a time.
    video.addEventListener('play', () => { $$('video.av-player').forEach((o) => { if (o !== video) o.pause(); }); });
    const details = [v.date && ['date', v.date], v.duration && ['length', v.duration], ...v.meta].filter(Boolean);
    return h('li', { class: 'av-card' },
      h('figure', { class: 'av-fig' },
        h('div', { class: 'av-stage' }, video),
        h('figcaption', { class: 'av-cap' },
          h('p', { class: 'av-file' }, name),
          v.title && h('h4', { class: 'av-title' }, v.title),
          v.description && h('p', { class: 'av-desc' }, v.description),
          details.length > 0 && h('dl', { class: 'exif' }, details.map(([k, val]) => h('div', null, h('dt', null, k), h('dd', null, val)))))));
  }

  function lightbox(folder, n) {
    const item = folder.items[n - 1];
    const total = folder.items.length;
    const base = `#archive/${folder.path}`;
    const title = item.title || `image ${n}`;
    const img = h('img', { class: 'lb-img', src: item.display, alt: item.alt || title, decoding: 'async', width: item.width, height: item.height });
    img.addEventListener('error', () => {
      img.replaceWith(h('div', { class: 'lb-missing' }, 'file missing. check this entry\'s file path in config.js.'));
    }, { once: true });
    const details = [
      item.date && ['date', item.date],
      ...item.meta,
    ].filter(Boolean);
    const box = h('div', { class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'lb-title' },
      h('div', { class: 'lb-inner pane' },
        h('div', { class: 'pane-h' },
          h('span', null, `${folder.path}/ img-${n}`),
          h('span', { class: 'lb-count' }, `${n} of ${total}`),
          h('a', { class: 'lb-close', href: base, 'aria-label': 'Close image and return to folder' }, '×')),
        h('figure', { class: 'lb-fig' },
          h('div', { class: 'lb-stage' }, img),
          h('figcaption', { class: 'lb-cap' },
            h('h3', { id: 'lb-title' }, title),
            item.description && h('p', null, item.description),
            details.length > 0 && h('dl', { class: 'exif' }, details.map(([k, v]) => h('div', null, h('dt', null, k), h('dd', null, v)))),
            item.source && h('p', null, extLink(item.source, 'original source')),
            item.display !== item.file && h('p', { class: 'lb-full' }, extLink(item.file, 'open full size')))),
        total > 1 && h('div', { class: 'lb-nav' },
          n > 1 ? h('a', { href: `${base}/img-${n - 1}`, 'data-dir': 'prev' }, '← previous') : h('span'),
          n < total ? h('a', { href: `${base}/img-${n + 1}`, 'data-dir': 'next' }, 'next →') : h('span'))));
    box.addEventListener('click', (e) => { if (e.target === box) location.hash = base.slice(1); });
    return box;
  }

  // Renders the archive view for a path like ['crash_romance', 'members'] or ['forza_horizon', 'img-2'].
  // Returns null when the path doesn't exist (the router then shows the 404 page).
  function renderArchiveView(parts) {
    const view = $('#archive-view');
    let folder = null;
    let imgN = null;
    if (parts.length) {
      const last = parts[parts.length - 1].match(IMG_SEG);
      const folderPath = (last ? parts.slice(0, -1) : parts).join('/');
      folder = ARCHIVE_INDEX.get(folderPath);
      if (!folder) return null;
      if (last) {
        imgN = Number(last[1]);
        if (!folder.items[imgN - 1]) return null;
      }
    }
    view.replaceChildren(...[folder ? archiveFolderView(folder) : archiveRootView()].flat(Infinity).filter(Boolean));
    if (imgN) view.append(lightbox(folder, imgN));
    root.classList.toggle('lb-open', !!imgN);
    const path = folder ? `${folder.path}/` + (imgN ? `img-${imgN}` : '') : '';
    return { folder, imgN, path };
  }

  function render404() {
    return h('section', { class: 'sec', id: 'sec-404', 'aria-labelledby': 'h-404', hidden: true },
      h('div', { class: 'lost' },
        h('div', { class: 'avatar' }, pixelKoala()),
        h('div', { class: 'sec-head' },
          h('h2', { id: 'h-404', tabindex: '-1' }, KO.notFound),
          h('p', null, 'This file does not exist, or Ko took it somewhere.'),
          h('p', null, h('a', { href: '#home' }, 'Go back to home.sys')))));
  }

  /* ---------- Theme, effects, toast ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function setTheme(name, announce) {
    if (!THEMES.includes(name)) return false;
    root.dataset.theme = name;
    store.set('theme', name);
    $$('[data-theme-btn]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeBtn === name)));
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#080810');
    if (announce) toast(`theme set: ${name}`);
    return true;
  }
  function setFx(on, announce) {
    root.dataset.fx = on ? 'on' : 'off';
    store.set('fx', root.dataset.fx);
    const b = $('#fx-btn');
    b.setAttribute('aria-pressed', String(on));
    b.textContent = on ? 'fx on' : 'fx off';
    if (announce) toast(`visual effects ${on ? 'on' : 'off'}`);
  }

  /* ---------- Router ---------- */
  let current = null;
  let focusOnRoute = false;
  const NOT_FOUND = { id: '404', file: '', addr: '0x??' };
  let lastKey = null;
  let lastDir = null; // remembers prev/next so focus stays put while browsing images
  function route() {
    let key;
    try { key = decodeURIComponent((location.hash || '#home').slice(1)); } catch (e) { key = '?'; }
    key = key.toLowerCase().replace(/\/+$/, '') || 'home';
    const [base, ...rest] = key.split('/');
    let sec = SEC[base];
    let arc = null;
    if (sec && rest.length && sec.id !== 'archive') sec = null; // deep paths only exist in the archive
    if (sec && sec.id === 'archive' && current !== key) {
      arc = renderArchiveView(rest);
      if (!arc) sec = null;
    }
    if (!sec) {
      // Unknown address: Ko's 404 page (any text from the URL is shown as plain text only).
      sec = Object.assign({}, NOT_FOUND, { file: key.slice(0, 40) || '?' });
      current = null;
    }
    if (current === key) return;
    if (sec.id !== 'archive') root.classList.remove('lb-open');
    const prevKey = lastKey;
    lastKey = key;
    current = sec.id === '404' ? null : key;
    $$('.sec').forEach((el) => { el.hidden = el.id !== 'sec-' + sec.id; });
    $$('.dir-link').forEach((a) => { if (a.dataset.id === sec.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const file = arc && arc.path ? `${sec.file}/${arc.path}` : sec.file;
    $('#win-addr').textContent = sec.addr;
    $('#win-path').textContent = sec.id === '404' ? `~/${ID.username}/${sec.file}: no such file` : `~/${ID.username}/${file}`;
    document.title = sec.id === 'home' ? `${SITE.name} — ${SITE.tagline}` : sec.id === '404' ? `404 — ${SITE.name}` : `${file} — ${SITE.name}`;

    if (arc && arc.imgN) {
      // Image view is a dialog: move focus into it.
      const keep = lastDir && $(`.lb-nav a[data-dir="${lastDir}"]`);
      (keep || $('.lb-close')).focus({ preventScroll: true });
    } else if (arc && prevKey && prevKey.startsWith(key + '/img-')) {
      // Closing an image: return focus to its tile.
      const t = $(`.tile-link[href="#${CSS.escape(prevKey)}"]`);
      if (t) t.focus({ preventScroll: false });
    } else if (focusOnRoute) {
      const heading = (arc && arc.folder && $('#archive-here')) || $('#h-' + sec.id);
      if (heading) heading.focus({ preventScroll: true });
      $('#main').scrollIntoView({ block: 'start' });
      window.scrollBy(0, -60);
    }
    lastDir = null;
    focusOnRoute = false;
  }
  function go(id, opts = {}) {
    if (!SEC[id.split('/')[0]]) return false;
    if (!opts.keepFocus) focusOnRoute = true;
    if (location.hash === '#' + id) { current = null; route(); }
    else location.hash = id;
    if (opts.keepFocus && !wideLayout.matches) $('#main').scrollIntoView({ block: 'start' });
    return true;
  }

  /* ---------- Terminal ---------- */
  const out = $('#term-out');
  const input = $('#term-input');
  const history = [];
  let hIndex = 0;

  function line(...parts) {
    const el = h('div', { class: 'tl' }, ...parts);
    out.append(el);
    out.scrollTop = out.scrollHeight;
    return el;
  }
  const dim = (t) => h('span', { class: 'dim' }, t);
  const acc = (t) => h('span', { class: 'acc' }, t);
  const acc2 = (t) => h('span', { class: 'acc2' }, t);
  const goBtn = (id, label) => h('button', { type: 'button', class: 'tlink', onclick: () => go(id, { keepFocus: true }) }, label || SEC[id].file);
  function uptime() {
    const sec = Math.floor((Date.now() - startedAt) / 1000);
    return `${Math.floor(sec / 60)}m ${sec % 60}s`;
  }
  const slugPath = (v) => str(v).toLowerCase().replace(/^~?\/?(shaka\/)?(archive(\.raw)?\/?)?/, '').split('/').map(slugify).filter(Boolean).join('/');
  const archBtn = (f) => h('button', { type: 'button', class: 'tlink', onclick: () => go('archive/' + f.path, { keepFocus: true }) }, f.id + '/');
  function opening(id) {
    go(id, { keepFocus: true });
    line(dim('opening '), acc(`~/${ID.username}/${SEC[id].file}`), dim(' ...'));
  }

  let lastKo = -1;
  function koSays() {
    if (!KO_MSGS.length) return '';
    let n = Math.floor(Math.random() * KO_MSGS.length);
    if (KO_MSGS.length > 1 && n === lastKo) n = (n + 1) % KO_MSGS.length;
    lastKo = n;
    return KO_MSGS[n];
  }
  function koLine(msg) {
    const ko = h('span', { class: 'term-ko' }, pixelKoala());
    line(h('div', { class: 'term-ko-row' }, ko, h('span', { class: 'acc2' }, msg)));
  }

  const CMDS = {
    help: { d: 'show this list', run() {
      line(acc2(`${SITE.os} terminal`), dim(' — simulated, nothing here touches your computer.'));
      Object.entries(CMDS).filter(([, c]) => !c.hidden).forEach(([name, c]) => line(acc(name.padEnd(10)), dim(c.d)));
      line(dim('tip: ↑/↓ browse history, Tab completes. some commands are not listed.'));
    } },
    ls: { d: 'list directories', run() {
      SECTIONS.forEach((x) => {
        const n = countFor(x.id);
        line(dim((x.dir ? 'drwxr-xr-x ' : '-rw-r--r-- ') + (n == null ? '-' : String(n)).padStart(3) + '  '), goBtn(x.id));
      });
    } },
    cd: { d: 'open a section, e.g. cd music', run(args) {
      const raw = (args[0] || '~').toLowerCase();
      if (['~', '..', '/', '-', '~/'].includes(raw)) { opening('home'); return; }
      const clean = raw.replace(/^~\/(shaka\/)?/, '').replace(/\/$/, '');
      if (/^archive(\.raw)?\/./.test(clean)) { CMDS.archive.run([clean]); return; }
      const hit = SECTIONS.find((x) => x.id === clean || x.file.replace(/\/$/, '') === clean || x.label.toLowerCase() === clean);
      if (hit) opening(hit.id);
      else line(`cd: no such directory: ${args[0]}. try `, acc('ls'), '.');
    } },
    whoami: { d: 'who runs this place', run() {
      line(acc(ID.displayName), dim(` (${ID.username}) — a.k.a. `), acc2(ID.nickname), dim(`, ${ID.nicknameNote}.`));
      line(dim(`user since ${SITE.established}. ${SITE.tagline}.`));
    } },
    about: { d: 'print the public profile', run() {
      PROFILE_FIELDS.forEach(([k, label]) => line(dim(label.padEnd(15)), str(P[k])));
      line(dim('full file: '), goBtn('about'));
    } },
    music: { d: 'open music.lib', run() {
      opening('music');
      line(dim('artists '), acc(String(ARTISTS.length)), dim('  albums '), acc(String(ALBUMS.length)), dim('  playlists '), acc(String(PLAYLISTS.length)), dim('  wishlist '), acc(String(WISHLIST.length)));
      if (!PLAYABLE.length) line(dim('player: unconfigured. no audio source, nothing playing.'));
    } },
    vinyl: { d: 'vinyl wishlist status', run() {
      if (!WISHLIST.length) { line(dim('vinyl.wishlist is empty.')); return; }
      const c = wishCounts();
      line(acc2('vinyl.wishlist'), dim(` — ${WISHLIST.length} records: want ${c.want} / hunting ${c.hunting} / acquired ${c.acquired}`));
      WISHLIST.forEach((w) => line(dim(`[${w.status.toUpperCase()}]`.padEnd(11)), str(w.title), dim(str(w.artist) ? ` — ${str(w.artist)}` : '')));
      if (str(P.status)) line(dim(`collection status: ${str(P.status).toLowerCase()}.`));
      line(dim('full list: '), goBtn('music'));
    } },
    interests: { d: 'open interests/', run() {
      opening('interests');
      INTERESTS.forEach((c) => line(acc(c.folder + '/'), dim(c.category ? '  ' + c.category : '')));
    } },
    lab: { d: 'open the lab', run() {
      opening('lab');
      if (!PROJECTS.length) { line(dim('lab is quiet for now.')); return; }
      PROJECTS.forEach((p) => {
        const url = safeUrl(p.url);
        line(dim('→ '), url ? extLink(url, str(p.name)) : str(p.name), dim(str(p.status) ? `  [${str(p.status)}]` : ''));
      });
    } },
    links: { d: 'show external links', run() {
      opening('links');
      if (!LINKS.length) { line(dim('no links configured yet.')); return; }
      LINKS.forEach((l) => line(dim('→ '), extLink(safeUrl(l.url), str(l.label)), dim('  ' + (str(l.handle) || hostOf(safeUrl(l.url))))));
    } },
    archive: { d: 'list folders, or: archive <folder>', run(args) {
      const target = slugPath(args[0]);
      if (target) {
        const f = ARCHIVE_INDEX.get(target);
        if (!f) { line(`archive: no such folder: ${args[0]}. try `, acc('archive'), '.'); return; }
        go('archive/' + f.path, { keepFocus: true });
        line(dim('opening '), acc(`~/${ID.username}/archive.raw/${f.path}/`), dim(' ...'));
        if (f.folders.length) f.folders.forEach((sf) => line(dim('  '), archBtn(sf), dim(`  ${folderTotal(sf) || 'empty'}`)));
        if (f.videos.length) f.videos.forEach((v) => line(dim('  ▶ '), acc(v.file.split('/').pop()), dim(v.title ? `  ${v.title}` : '')));
        const here = f.items.length + f.videos.length;
        line(dim(here ? `${here} file(s) here.` : (f.folders.length ? 'no files at this level.' : 'empty. nothing filed here yet.')));
        return;
      }
      opening('archive');
      ARCHIVE_ROOT.forEach((f) => { const n = folderTotal(f); line(dim('  '), archBtn(f), dim(`  ${n ? n + ' file' + (n === 1 ? '' : 's') : 'empty'}`)); });
      const all = ARCHIVE.length + VIDEO_COUNT;
      line(dim(all ? `${all} file(s) across ${ARCHIVE_INDEX.size} folders${VIDEO_COUNT ? ` (${VIDEO_COUNT} video${VIDEO_COUNT === 1 ? '' : 's'})` : ''}.` : 'no files indexed yet.'));
    } },
    random: { d: 'pull a random archive item', run() {
      if (!ARCHIVE.length) { line(dim('archive.raw is empty. nothing to retrieve yet, and ko refuses to make something up.')); return; }
      const e = pick(ARCHIVE);
      line(dim('retrieved: '), acc(e.item.title || `image ${e.n}`), dim(`  ${e.folder.path}/` + (e.item.date ? `  ${e.item.date}` : '')));
      if (e.item.description) line(dim(e.item.description));
      go(itemHash(e).slice(1), { keepFocus: true });
    } },
    ko: { d: 'check on ko', run() { koLine(koSays() || 'ko is here.'); } },
    theme: { d: 'theme [purple|blue|amber]', run(args) {
      if (!args[0]) {
        line(dim('themes: '), ...THEMES.map((t) => (t === root.dataset.theme ? acc2(t + '* ') : t + ' ')));
        line(dim('usage: theme <name>'));
        return;
      }
      if (setTheme(args[0].toLowerCase(), true)) line(dim('theme set: '), acc2(args[0].toLowerCase()));
      else line(`theme: unknown theme "${args[0]}". try: ${THEMES.join(', ')}`);
    } },
    fx: { d: 'fx [on|off] visual effects', run(args) {
      const want = args[0] ? args[0] === 'on' : root.dataset.fx !== 'on';
      if (args[0] && !['on', 'off'].includes(args[0])) { line('usage: fx on | fx off'); return; }
      setFx(want, true);
      line(dim('visual effects: '), acc(want ? 'on' : 'off'), reduceMotion.matches ? dim(' (animations stay off: reduced motion is on)') : '');
    } },
    date: { d: 'local date and time', run() { line(new Date().toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'medium' })); } },
    neofetch: { d: 'system summary', run() {
      const logo = h('pre', null, '   ____  \n  / ___| \n  \\___ \\ \n   ___) |\n  |____/ ');
      const info = h('div', null,
        h('div', null, acc2(`${ID.nickname.toLowerCase()}@${ID.username}`)),
        h('div', { class: 'dim' }, '-----------'),
        ...[
          ['OS', SITE.os],
          ['USER', ID.nickname.toLowerCase()],
          ['SHELL', 'terminal.sh'],
          ['THEME', root.dataset.theme],
          ['ALGORITHM', 'not found'],
          ['KOALA', 'online'],
          ['UPTIME', uptime() + ' (this visit)'],
        ].map(([k, v]) => h('div', null, acc(k + ': '), v)),
        h('div', { class: 'swatches', 'aria-hidden': 'true' }, ['--bg', '--panel-2', '--line', '--muted', '--a1', '--a2', '--text'].map((v) => h('i', { style: `background:var(${v})` }))));
      line(h('div', { class: 'neo' }, logo, info));
    } },
    fortune: { d: 'a small prediction', run() { line(acc2('fortune: '), FORTUNES.length ? pick(FORTUNES) : 'the future is unwritten. so is this list.'); } },
    history: { d: 'commands you typed', run() { history.forEach((c, n) => line(dim(String(n + 1).padStart(3) + '  '), c)); } },
    clear: { d: 'clear the screen', run() { out.replaceChildren(); } },


    /* --- less discoverable --- */
    projects: { hidden: true, run(args) { CMDS.lab.run(args); } },
    open: { hidden: true, run(args) { CMDS.cd.run(args); } },
    cat: { hidden: true, run(args) {
      const f = (args[0] || '').toLowerCase();
      if (f === 'about.txt' || f === 'about') CMDS.about.run();
      else if (f === 'bio.txt' || f === 'bio') BIO.forEach((p) => line(p));
      else if (!f) line('cat: what should I read? try: cat about.txt');
      else line(`cat: ${args[0]}: no such file (or it's a directory)`);
    } },
    echo: { hidden: true, run(args) { line(args.join(' ')); } },
    koala: { hidden: true, run() {
      koLine('hi, I am Ko.');
      line(acc('コアラ'), dim(' (koara, Japanese)   '), acc('코알라'), dim(' (koalla, Korean)   '), acc('coala'), dim(' (Portuguese)'));
      line(dim('koalas sleep up to ~20 hours a day. relatable.'));
    } },
    sudo: { hidden: true, run(args) {
      if (args.join(' ').toLowerCase() === 'make me productive') line('permission denied: ko is currently unavailable.');
      else line('ko is not in the sudoers file. this incident will be reported to the koala.');
    } },
    coffee: { hidden: true, run() { line('ERROR: caffeine module not detected. productivity may be affected.'); } },
    rm: { hidden: true, run(args) {
      // Purely a joke: nothing is ever deleted.
      if (args.join(' ').toLowerCase() === '-rf bad_vibes') line('nice try. this terminal is decorative, not dangerous.');
      else line('rm: permission denied. this corner of the internet is protected.');
    } },
    konami: { hidden: true, run() { konami(); } },
    arm: { hidden: true, run() { line(dim('arm.status: '), acc2('still hurts.'), dim(' have you tried stretching? (asking for ko)')); } },
    exit: { hidden: true, run() { line(dim('there is no exit. only home.')); go('home', { keepFocus: true }); } },
    hello: { hidden: true, run() { line('hi. ', h('span', { lang: 'ko' }, '안녕'), ' / ', h('span', { lang: 'ja' }, 'こんにちは'), ' / oi.'); } },
  };
  CMDS.hi = CMDS.hello;
  CMDS.oi = CMDS.hello;

  // ↑ ↑ ↓ ↓ ← → ← → B A  (or type "konami"): Ko waves. That's the whole easter egg.
  function konami() {
    koLine('↑↑↓↓←→←→BA accepted. ko waves. that is the entire secret.');
    toast('ko.exe says hi');
  }

  function run(raw) {
    const text = raw.trim();
    line(h('b', null, ID.prompt), ' ', text).classList.add('cmd');
    if (!text) return;
    history.push(text);
    hIndex = history.length;
    const [name, ...args] = text.split(/\s+/);
    const cmd = CMDS[name.toLowerCase()];
    if (!cmd) {
      line(`command not found: ${name}. type `, acc('help'), ' for the list.');
      return;
    }
    try { cmd.run(args); } catch (e) { line(`${name}: something went wrong. the koala has been notified.`); }
  }

  function initTerminal() {
    $('#term-prompt').textContent = ID.prompt;
    line(acc2(`${SITE.os}`), dim(` // ${ID.prompt.replace(/\$$/, '')} // personal directory est. ${SITE.established}`));
    line(dim('last login: just now, from '), acc(str(P.location) || 'somewhere'), dim('.'));
    line(dim('type '), acc('help'), dim(' to see what is here.'));

    $('#term-form').addEventListener('submit', (e) => {
      e.preventDefault();
      run(input.value);
      input.value = '';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        if (!history.length) return;
        e.preventDefault();
        hIndex = Math.max(0, hIndex - 1);
        input.value = history[hIndex] || '';
      } else if (e.key === 'ArrowDown') {
        if (!history.length) return;
        e.preventDefault();
        hIndex = Math.min(history.length, hIndex + 1);
        input.value = history[hIndex] || '';
      } else if (e.key === 'Tab') {
        const val = input.value;
        if (!val) return; // let Tab move focus when the line is empty
        const parts = val.split(/\s+/);
        const pool = parts.length > 1 && parts[0] === 'archive' ? [...ARCHIVE_INDEX.keys()]
          : parts.length > 1 && ['cd', 'open'].includes(parts[0]) ? SECTIONS.map((x) => x.id)
          : parts.length > 1 && parts[0] === 'theme' ? THEMES
            : parts.length === 1 ? Object.keys(CMDS).filter((k) => !CMDS[k].hidden) : [];
        const last = parts[parts.length - 1].toLowerCase();
        const matches = pool.filter((p) => p.startsWith(last));
        e.preventDefault();
        if (matches.length === 1) { parts[parts.length - 1] = matches[0]; input.value = parts.join(' ') + ' '; }
        else if (matches.length > 1) {
          let lcp = matches[0];
          matches.forEach((m) => { while (!m.startsWith(lcp)) lcp = lcp.slice(0, -1); });
          if (lcp.length > last.length) { parts[parts.length - 1] = lcp; input.value = parts.join(' '); }
          else line(dim(matches.join('  ')));
        }
      }
    });
    out.addEventListener('click', (e) => {
      if (e.target.closest('a, button') || String(window.getSelection())) return;
      input.focus({ preventScroll: true });
    });
  }

  /* ---------- Boot sequence (short, skippable, once per session) ---------- */
  function boot() {
    let seen = null;
    try { seen = sessionStorage.getItem(KEY + 'booted'); sessionStorage.setItem(KEY + 'booted', '1'); } catch (e) { seen = '1'; }
    if (seen || reduceMotion.matches || root.dataset.fx !== 'on') return;
    const log = h('pre', { class: 'boot-log' });
    const ov = h('div', { class: 'boot', 'aria-hidden': 'true' }, log, h('p', { class: 'boot-skip' }, 'press any key or tap to skip'));
    document.body.append(ov);
    const lines = [
      `${SITE.os} // personal directory est. ${SITE.established}`,
      `mounting ~/${ID.username} ............ ok`,
      'loading profile: 1 human ...... ok',
      'checking for algorithm ........ none found',
      'システム正常 / 시스템 정상',
      'welcome.',
    ];
    let n = 0;
    let finished = false;
    const timer = setInterval(() => {
      log.textContent += lines[n++] + '\n';
      if (n >= lines.length) { clearInterval(timer); setTimeout(done, 420); }
    }, 160);
    function done() {
      if (finished) return;
      finished = true;
      clearInterval(timer);
      window.removeEventListener('keydown', done);
      ov.classList.add('out');
      setTimeout(() => ov.remove(), 320);
    }
    window.addEventListener('keydown', done);
    ov.addEventListener('click', done);
    setTimeout(done, 3000); // hard ceiling: never block the site
  }

  /* ---------- Status bar details ---------- */
  function initClock() {
    const el = $('#clock');
    const tick = () => {
      const d = new Date();
      el.textContent = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      el.setAttribute('datetime', d.toISOString());
    };
    tick();
    setInterval(tick, 10000);
  }
  function initSysMsg() {
    const el = $('#sysmsg');
    let n = 0;
    const show = (m) => {
      el.textContent = m.t;
      el.setAttribute('lang', m.lang);
      if (m.title) el.setAttribute('title', m.title); else el.removeAttribute('title');
    };
    show(SYS_MSGS[0]);
    if (reduceMotion.matches) return;
    setInterval(() => {
      if (document.hidden) return;
      el.classList.add('is-fading');
      setTimeout(() => { n = (n + 1) % SYS_MSGS.length; show(SYS_MSGS[n]); el.classList.remove('is-fading'); }, 350);
    }, 7000);
  }

  /* ---------- Init ---------- */
  function init() {
    // Branding from config
    $('#brand-os').textContent = SITE.os;

    // Navigation
    const nav = $('#nav-list');
    SECTIONS.forEach((x) => nav.append(h('li', null,
      h('a', { class: 'dir-link', href: '#' + x.id, 'data-id': x.id },
        h('span', { class: 'ico', 'aria-hidden': 'true' }, x.dir ? '▸' : '·'),
        h('span', { class: 'f' }, x.file),
        h('span', { class: 'l' }, x.label)))));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) focusOnRoute = true; });
    $('#view').addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (a) focusOnRoute = true; });
    const filled = SECTIONS.filter((x) => countFor(x.id)).length;
    $('#dir-foot').textContent = `${SECTIONS.length} files // ${filled} with content\n0 bytes of algorithm`;

    // Sections
    const view = $('#view');
    view.append(renderHome(), renderAbout(), renderMusic(), renderInterests(), renderLab(), renderLinks(), renderArchive(), render404());

    // Footer
    $('#sysfoot').append(
      h('span', null, `${SITE.name} // EST. ${SITE.established} // ${SITE.tagline}`),
      h('span', null, 'hand-built. no trackers. ', h('span', { lang: 'ko' }, '시스템 정상'), '.'));

    // Theme & effects
    const savedTheme = store.get('theme');
    const savedFx = store.get('fx');
    const cfgTheme = (C.theme && C.theme.default) || 'purple';
    setTheme(THEMES.includes(savedTheme) ? savedTheme : (THEMES.includes(cfgTheme) ? cfgTheme : 'purple'), false);
    setFx(savedFx ? savedFx === 'on' : !(C.theme && C.theme.effects === false), false);
    $$('[data-theme-btn]').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.themeBtn, true)));
    $('#fx-btn').addEventListener('click', () => setFx(root.dataset.fx !== 'on', true));

    initClock();
    initSysMsg();
    initTerminal();

    const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
    let kPos = 0;
    document.addEventListener('keydown', (e) => {
      if (e.target && /^(input|textarea|select)$/i.test(e.target.tagName)) return;
      const k = (e.key || '').toLowerCase();
      kPos = k === KONAMI[kPos] ? kPos + 1 : (k === KONAMI[0] ? 1 : 0);
      if (kPos === KONAMI.length) { kPos = 0; konami(); }
    });
    document.addEventListener('keydown', (e) => {
      const box = $('.lightbox');
      if (!box || $('#sec-archive').hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); $('.lb-close').click(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (e.target && /^(input|textarea)$/i.test(e.target.tagName)) return;
        const dir = e.key === 'ArrowLeft' ? 'prev' : 'next';
        const a = $(`.lb-nav a[data-dir="${dir}"]`);
        if (a) { e.preventDefault(); lastDir = dir; a.click(); }
      } else if (e.key === 'Tab') {
        const f = $$('a[href], button, [tabindex="0"]', box);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        else if (!box.contains(document.activeElement)) { e.preventDefault(); f[0].focus(); }
      }
    });
    $('#view').addEventListener('click', (e) => { const a = e.target.closest('.lb-nav a'); if (a) lastDir = a.dataset.dir; });
    window.addEventListener('hashchange', route);
    route();
    boot();

    // A small note for the curious.
    try { console.log('%cSHAKA.RAW', 'font:700 20px monospace;color:#a970ff', `\nno algorithm, just me. hi from ${ID.nickname}. try the terminal: type "koala".`); } catch (e) { /* noop */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
