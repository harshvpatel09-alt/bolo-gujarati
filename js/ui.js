/* Bolo — UI helpers: escaping, icons, avatars, Gujarati text blocks, meters, toasts. */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const ICONS = {
  home: '<path d="M3.5 10.5 12 4l8.5 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-4v-6h-6v6H5A1.5 1.5 0 0 1 3.5 19z"/>',
  path: '<circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="6" r="2.2"/><path d="M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8"/>',
  practice: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="1.6"/>',
  talk: '<path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/>',
  me: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.9-3.8 3.9-6 7.5-6s6.6 2.2 7.5 6"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  slow: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 10.5a2 2 0 0 1 0 3"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  ear: '<path d="M7 15.5c0 3 2 5 4.5 5s3.5-2 3.5-3.5 2.5-3 2.5-6.5a5.8 5.8 0 0 0-11.5-1"/><path d="M10 11a2 2 0 0 1 4 0c0 1.5-2 2-2 3.5"/>',
  keyboard: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M10 10h.01M13 10h.01M16 10h.01M7 14h10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2 1.2M17.8 15.3l2 1.2M4.2 16.5l2-1.2M17.8 8.7l2-1.2"/>',
  star: '<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  refresh: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1L20 9.5M19.5 12a7.5 7.5 0 0 1-13 5.1L4 14.5"/><path d="M20 4.5v5h-5M4 19.5v-5h5"/>',
  spark: '<path d="M12 3.5 13.8 10 20.5 12l-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2z"/>',
  alert: '<path d="M12 4 21 19.5H3z"/><path d="M12 10v4.5M12 17.2h.01"/>',
  words: '<path d="M4 6h10M4 12h16M4 18h7"/>',
  script: '<path d="M5 18c2-7 4-11 7-11 2.2 0 2.8 2 1.6 4.2-1.4 2.6-4.2 4.8-4.2 4.8M13.5 16.5c1.4 1.2 3.4 1.6 5.5.5"/>',
  heart: '<path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  eye: '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ''}</svg>`;

/* The diya: streak / lesson node lamp. lit = 0..1 */
function diya(lit = 1, cls = '') {
  return `<svg class="diya ${cls}" viewBox="0 0 48 48" aria-hidden="true">
    <g class="diya-flame" style="opacity:${lit ? 1 : 0}"><path d="M24 6c5 7 6 11 6 14a6 6 0 0 1-12 0c0-3 1-7 6-14z" fill="var(--flame)"/><path d="M24 13c2.5 4 3 6 3 7.5a3 3 0 0 1-6 0c0-1.5.5-3.5 3-7.5z" fill="var(--marigold)"/></g>
    <path d="M6 28h36c0 8-8 14-18 14S6 36 6 28z" fill="${lit ? 'var(--diya)' : 'var(--diya-off)'}"/>
    <path d="M6 28h36" stroke="${lit ? 'var(--diya-rim)' : 'var(--line-strong)'}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="16" cy="34" r="1.6" fill="var(--bg)" opacity=".7"/><circle cx="24" cy="36" r="1.6" fill="var(--bg)" opacity=".7"/><circle cx="32" cy="34" r="1.6" fill="var(--bg)" opacity=".7"/>
  </svg>`;
}

/* Illustrated conversation partners */
function avatar(key, size = 56) {
  const c = CHARACTERS[key] || CHARACTERS.friend;
  const hair = {
    bun: `<circle cx="32" cy="12.5" r="5.5" fill="${c.hair}"/><path d="M18.6 28c-.6-9.5 5.7-15.4 13.4-15.4S46 18.5 45.4 28c-2.3-5.8-7.2-8.4-13.4-8.4S20.9 22.2 18.6 28z" fill="${c.hair}"/>`,
    bald: `<path d="M19.4 29c-.8-3 0-5.5 1.6-7M44.6 29c.8-3 0-5.5-1.6-7" stroke="${c.hair}" stroke-width="3" stroke-linecap="round" fill="none"/>`,
    short: `<path d="M18.8 27c-.4-9 5.8-14.4 13.2-14.4S45.6 18 45.2 27c-2.4-4.6-6.6-6.6-13.2-6.6S21.2 22.4 18.8 27z" fill="${c.hair}"/>`,
    spiky: `<path d="M18.8 27c-.6-6 1-9 3-11l1.5 2.5 2-4.5 2.2 3.5 2.3-5 2.2 4.5 2.6-4 1.8 4.4 2.6-3 1.2 3.6c2.6 2.4 3.6 5.8 3.2 9-2.4-4.6-6.6-6.6-13.2-6.6S21.2 22.4 18.8 27z" fill="${c.hair}"/>`,
    long: `<path d="M17.5 44c-2-9-1.5-18 1.5-23 2.6-5 7.4-8.4 13-8.4s10.4 3.4 13 8.4c3 5 3.5 14 1.5 23l-3.5-1.5c1-6 1-11.5-.8-15.5-2.4-4.3-6-6-10.2-6s-7.8 1.7-10.2 6c-1.8 4-1.8 9.5-.8 15.5z" fill="${c.hair}"/>`,
    pony: `<path d="M44 20c5 2 6 9 3.5 15-1-4-2.5-7-5-8.5z" fill="${c.hair}"/><path d="M18.8 27c-.4-9 5.8-14.4 13.2-14.4S45.6 18 45.2 27c-2.4-4.6-6.6-6.6-13.2-6.6S21.2 22.4 18.8 27z" fill="${c.hair}"/>`,
  }[c.style] || '';
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="${esc(c.name)}">
    <circle cx="32" cy="32" r="32" fill="var(--avatar-bg)"/>
    <clipPath id="clip-${key}"><circle cx="32" cy="32" r="32"/></clipPath>
    <g clip-path="url(#clip-${key})">
      <path d="M8 66c2-12.5 11.5-19 24-19s22 6.5 24 19z" fill="${c.cloth}"/>
      <rect x="28" y="38" width="8" height="10" rx="3" fill="${c.skin}"/>
      ${c.style === 'long' ? hair : ''}
      <circle cx="32" cy="29" r="13.2" fill="${c.skin}"/>
      ${c.style !== 'long' ? hair : `<path d="M18.8 27c-.4-9 5.8-14.4 13.2-14.4S45.6 18 45.2 27c-2.4-4.6-6.6-6.6-13.2-6.6S21.2 22.4 18.8 27z" fill="${c.hair}"/>`}
      ${c.topi ? `<path d="M19.5 20.5c1.5-5 6.5-8 12.5-8s11 3 12.5 8c-4-1.5-8-2-12.5-2s-8.5.5-12.5 2z" fill="#F7F4EC" stroke="#D9D2C2" stroke-width="1"/>` : ''}
      <circle cx="27" cy="30" r="1.5" fill="#2A1D17"/><circle cx="37" cy="30" r="1.5" fill="#2A1D17"/>
      ${c.glasses ? `<g fill="none" stroke="#3B2F2A" stroke-width="1.3"><circle cx="27" cy="30" r="3.8"/><circle cx="37" cy="30" r="3.8"/><path d="M30.8 30h2.4"/></g>` : ''}
      ${c.bindi ? `<circle cx="32" cy="23.3" r="1.35" fill="#D2344A"/>` : ''}
      ${c.mustache ? `<path d="M27.5 35.2c1.6-1.3 3.2-1.3 4.5-.3 1.3-1 2.9-1 4.5.3-1.5.4-3 .5-4.5-.1-1.5.6-3 .5-4.5.1z" fill="${c.hair === '#EDEBE6' ? '#CFCAC0' : c.hair}"/>` : ''}
      <path d="M28.5 36.8c2.2 1.8 4.8 1.8 7 0" stroke="#6B3A2E" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </g>
  </svg>`;
}

/* Transliteration visibility: fades as reading ability grows. */
function trMode(item) {
  const set = Store.s.settings.translit;
  if (set === 'full') return 'show';
  if (set === 'off') return 'tap';
  if (set === 'hint') return 'tap';
  if (!item || !item.id) return 'show';
  const st = Store.itemState(item.id);
  const rd = Store.skill('reading');
  if (st === 'mastered' && rd.a >= 20 && rd.ema >= 0.75) return 'tap';
  if ((st === 'familiar' || st === 'mastered') && rd.a >= 12 && rd.ema >= 0.62) return 'tap';
  return 'show';
}

/* Big Gujarati text with transliteration + meaning. opts: {size, en, noTr, audio, item} */
function guBlock(gu, tr, opts = {}) {
  const mode = opts.noTr ? 'none' : opts.trMode || trMode(opts.item);
  const trHtml = mode === 'none' ? '' : mode === 'show'
    ? `<div class="tr">${esc(tr)}</div>`
    : `<button class="tr tr-tap" data-reveal="${esc(tr)}" type="button">${icon('eye')}<span>Show pronunciation</span></button>`;
  return `<div class="gu-block ${opts.size ? 'gu-' + opts.size : ''}">
    <div class="gu-row">${opts.audio !== false ? `<button class="say-btn" data-say="${esc(gu)}" type="button" aria-label="Play audio">${icon('speaker')}</button>` : ''}<div class="gu" lang="gu">${esc(gu)}</div></div>
    ${trHtml}
    ${opts.en ? `<div class="en">${esc(opts.en)}</div>` : ''}
  </div>`;
}

/* Bandhani-dot meter */
function dots(pct, n = 10, cls = '') {
  const on = Math.round(Math.max(0, Math.min(1, pct)) * n);
  return `<span class="dots ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}">${Array.from({ length: n }, (_, i) => `<i class="${i < on ? 'on' : ''}"></i>`).join('')}</span>`;
}
function bar(pct, cls = '') {
  return `<span class="bar ${cls}" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct * 100)}"><i style="width:${Math.max(0, Math.min(100, pct * 100))}%"></i></span>`;
}

function toast(html, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = html;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('in'));
  setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 400); }, 3200);
}

function achToast(ids) {
  ids.forEach((id, i) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) setTimeout(() => toast(`${icon('trophy')}<div><b lang="gu">${esc(a.title)}</b><span>${esc(a.en)} unlocked</span></div>`, 'ach'), i * 900);
  });
}

/* Global click delegation for audio + reveal buttons */
document.addEventListener('click', (e) => {
  const sb = e.target.closest('[data-say]');
  if (sb) {
    e.preventDefault();
    sb.classList.add('playing');
    Speech.say(sb.dataset.say, { slow: sb.dataset.slow === '1' }).then((ok) => {
      sb.classList.remove('playing');
      if (!ok && Speech.mode === 'none') toast('No voice is available on this device. Check Settings → Voice.');
    });
    return;
  }
  const rv = e.target.closest('[data-reveal]');
  if (rv) { rv.outerHTML = `<div class="tr revealed">${esc(rv.dataset.reveal)}</div>`; }
});

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

/* Embedded browsers (like the Claude app's preview pane) can block audio and the microphone. */
const EMBEDDED = / Claude\/|Electron\//.test(navigator.userAgent);
function audioHelp() {
  const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  const url = local ? 'http://localhost:5173' : location.origin;
  const msg = Speech.stalled ? `<b>Audio isn’t playing here.</b> Open Bolo in Chrome at <code>${esc(url)}</code>${local ? ' (with <code>python3 serve.py</code> running)' : ''} to hear Gujarati.`
    : `<b>The microphone doesn’t work in this built-in browser.</b> For speaking practice, open Bolo in Chrome at <code>${esc(url)}</code>.`;
  return `<div class="audio-help" role="status">${icon('alert')}<div>${msg}</div><button class="btn btn-ghost btn-sm" data-copy-url type="button">Copy link</button></div>`;
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-copy-url]')) return;
  const url = location.origin + '/';
  (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast('Link copied — paste it into Chrome.'), () => toast(url));
});
Speech.onStall(() => {
  toast(Speech.server ? 'Audio didn’t play. Check your volume and that serve.py is still running.' : Speech.pack ? 'Audio didn’t play. Check your volume, then tap the speaker again.' : 'Audio isn’t playing. Check your volume, or try Chrome.');
  const old = $('.audio-help'); if (old) old.remove();
  const v = $('.view-in'); if (v) v.insertAdjacentHTML('afterbegin', audioHelp());
});
