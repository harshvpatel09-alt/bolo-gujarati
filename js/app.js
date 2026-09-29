/* Bolo — app shell and router. */

const App = (() => {
  const NAV = [['home', 'Home', 'home', 'ઘર'], ['path', 'Learn', 'path', 'પાઠ'], ['practice', 'Practice', 'practice', 'મહાવરો'], ['talk', 'Talk', 'talk', 'વાત'], ['me', 'Me', 'me', 'હું']];
  const MORE = [['home-gujarati', 'Home Gujarati', 'heart'], ['script', 'Script', 'script'], ['words', 'Words', 'words'], ['mistakes', 'Mistakes', 'target'], ['settings', 'Settings', 'gear']];

  function applyTheme() {
    const t = Store.s.settings.theme;
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  function shell(active, inner) {
    const streak = Store.streakNow();
    return `<div class="app">
      <nav class="rail" aria-label="Main">
        <a class="brand" href="#/home"><span class="wordmark sm" lang="gu">બોલો</span><span class="brand-en">Bolo</span></a>
        <div class="rail-streak">${diya(streak ? 1 : 0, streak ? 'flicker' : '')}<b>${streak}</b><span>day streak</span></div>
        <ul>${NAV.map(([k, t, ic, g]) => `<li><a class="nav ${active === k ? 'on' : ''}" href="#/${k}" ${active === k ? 'aria-current="page"' : ''}>${icon(ic)}<span>${t}</span><small lang="gu">${g}</small></a></li>`).join('')}</ul>
        <ul class="rail-more">${MORE.map(([k, t, ic]) => `<li><a class="nav sm ${active === k ? 'on' : ''}" href="#/${k}">${icon(ic)}<span>${t}</span></a></li>`).join('')}</ul>
      </nav>
      <main class="view" id="view" tabindex="-1">${inner}</main>
      <nav class="tabbar" aria-label="Main">${NAV.map(([k, t, ic]) => `<a class="tab ${active === k || (k === 'practice' && ['home-gujarati', 'script', 'words', 'mistakes'].includes(active)) || (k === 'me' && active === 'settings') ? 'on' : ''}" href="#/${k}">${icon(ic)}<span>${t}</span></a>`).join('')}</nav>
    </div>`;
  }

  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'home';
    const [page, arg] = h.split('/');
    return { page: page.split('#')[0], arg };
  }

  function render() {
    applyTheme();
    const root = $('#root');
    let { page, arg } = route();
    if (!Store.s.profile.onboarded && page !== 'lesson') page = 'welcome';
    if (page === 'welcome') {
      if (Store.s.profile.onboarded) { location.hash = '#/home'; return; }
      root.innerHTML = Views.onboarding();
      if (EMBEDDED) root.firstElementChild.insertAdjacentHTML('afterbegin', `<div class="ob-help">${audioHelp()}</div>`);
      Views.bindOnboarding(root.firstElementChild);
      return;
    }
    const V = {
      home: [Views.home, Views.bindQuick, 'home'],
      path: [Views.path, Views.bindPath, 'path'],
      lesson: [() => Views.lesson(arg), Views.bindLesson, 'path'],
      practice: [Views.practice, Views.bindQuick, 'practice'],
      talk: arg ? [() => Views.talkScene(arg), Views.bindScene, 'talk'] : [Views.talkList, null, 'talk'],
      'home-gujarati': [Views.homeGujarati, Views.bindHomeG, 'home-gujarati'],
      script: [Views.script, Views.bindScript, 'script'],
      words: [Views.words, Views.bindWords, 'words'],
      mistakes: [Views.mistakes, Views.bindMistakes, 'mistakes'],
      me: [Views.me, null, 'me'],
      settings: [Views.settings, Views.bindSettings, 'settings'],
    }[page] || [Views.home, Views.bindQuick, 'home'];
    const prevScroll = App._page === page + (arg || '') ? window.scrollY : 0;
    root.innerHTML = shell(V[2], `<div class="view-in">${EMBEDDED || Speech.stalled ? audioHelp() : ''}${V[0]()}</div>`);
    const view = $('#view');
    if (V[1]) V[1](view);
    Store.s.last.route = location.hash; Store.save();
    if (App._page !== page + (arg || '')) { window.scrollTo(0, 0); const anchor = location.hash.split('#')[2]; if (anchor) { const el = document.getElementById(anchor); el && el.scrollIntoView(); } }
    else window.scrollTo(0, prevScroll);
    App._page = page + (arg || '');
  }

  /* Ask the local server (if any) to pre-make audio for every phrase, so playback is instant. */
  function warmAudio() { Speech.warm(Course.audioTexts()); }

  window.addEventListener('hashchange', () => { if (Player.S) return; render(); });
  Speech.onVoices(() => { if (route().page === 'settings') render(); });

  document.addEventListener('DOMContentLoaded', () => {
    if (Store.s.profile.onboarded && (!location.hash || location.hash === '#/' || location.hash === '#/welcome')) location.hash = '#/home';
    render();
    warmAudio();
    const nudge = Store.checkAch();
    if (nudge.length) achToast(nudge);
  });

  return { render, applyTheme };
})();
