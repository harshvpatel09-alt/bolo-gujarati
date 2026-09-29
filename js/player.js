/* Bolo — the exercise player: runs a session of steps in a focused full-screen view. */

const Player = (() => {
  let S = null;
  const PRAISE = [['શાબાશ!', 'Well done!'], ['સરસ!', 'Nice!'], ['બરાબર!', 'Exactly right!'], ['વાહ!', 'Wow!'], ['એકદમ સાચું!', 'Spot on!']];
  const INFO = new Set(['intro', 'grammar', 'letter']);

  /* token → transliteration, learned from aligned sentences */
  const TOKTR = {};
  Object.values(Course.items).forEach((it) => {
    [[it.guG || it.gu, it.tr]].forEach(([g, t]) => {
      ['m', 'f'].forEach((k) => {
        const gg = typeof g === 'object' ? g[k] : g, tt = typeof t === 'object' ? t[k] : t;
        const a = GU.tokens(gg), b = String(tt || '').replace(/[?.!,]/g, ' ').trim().split(/\s+/);
        if (a.length === b.length) a.forEach((w, i) => { if (!TOKTR[w]) TOKTR[w] = b[i]; });
      });
    });
  });

  /* ── lifecycle ── */
  function start(cfg) {
    if (!cfg.steps || !cfg.steps.length) { toast('Nothing to practice here yet — finish a lesson first.'); return; }
    S = Object.assign({ queue: cfg.steps.slice(), i: 0, results: [], spoken: 0, t0: Date.now(), state: 'answer', retries: 0 }, cfg);
    mount();
    next();
  }
  function mount() {
    let p = $('#player');
    if (!p) {
      p = document.createElement('div');
      p.id = 'player'; p.className = 'player'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true');
      p.innerHTML = `
        <header class="p-head"><button class="icon-btn p-close" type="button" aria-label="Quit">${icon('x')}</button><div class="p-prog"></div><div class="p-count"></div></header>
        <main class="p-body"><div class="p-step"></div></main>
        <footer class="p-foot"><div class="p-sheet" aria-live="polite"></div><div class="p-foot-in"><div class="p-foot-left"></div><button class="btn btn-primary p-go" type="button"></button></div></footer>
        <div class="p-confirm" hidden><div class="p-confirm-card"><h3>Leave this session?</h3><p>Your answers so far still count toward your review, but you won’t earn XP for an unfinished session.</p><div class="row"><button class="btn btn-ghost" data-act="stay" type="button">Keep going</button><button class="btn btn-danger" data-act="quit" type="button">Leave</button></div></div></div>`;
      document.body.appendChild(p);
      p.querySelector('.p-go').addEventListener('click', primary);
      p.querySelector('.p-close').addEventListener('click', () => { if (S && S.done) return close(); p.querySelector('.p-confirm').hidden = false; });
      p.querySelector('.p-confirm').addEventListener('click', (e) => {
        const a = e.target.closest('[data-act]'); if (!a) return;
        p.querySelector('.p-confirm').hidden = true;
        if (a.dataset.act === 'quit') { Store.save(); close(); S && S.onQuit && S.onQuit(); }
      });
      document.addEventListener('keydown', onKey);
    }
    p.hidden = false;
    document.body.classList.add('in-player');
  }
  function close() {
    Speech.stop();
    const p = $('#player'); if (p) p.hidden = true;
    document.body.classList.remove('in-player');
    const cb = S && S.done && S.onDone; S = null;
    if (cb) cb(); else App.render();
  }
  function onKey(e) {
    if (!S || $('#player').hidden) return;
    if (e.target.matches('input, textarea')) { if (e.key === 'Enter') { e.preventDefault(); primary(); } return; }
    if (e.key === 'Enter') { e.preventDefault(); primary(); }
    if (S.state === 'answer' && /^[1-6]$/.test(e.key)) { const b = $$('.p-step .opt:not([disabled])')[+e.key - 1]; b && b.click(); }
  }

  /* ── flow ── */
  function next() {
    if (S.i >= S.queue.length) return finish();
    S.step = S.queue[S.i];
    S.state = INFO.has(S.step.t) ? 'info' : 'answer';
    S.eval = null;
    if (S.step.t === 'speak' && Store.s.settings.quietUntil > Date.now()) { S.step = Object.assign({}, S.step, { t: 'listen', mode: 'build', bank: Engine.shuffle(GU.tokens(Course.gu(S.step.item))), skill: 'listening', swapped: true }); }
    const p = $('#player');
    p.querySelector('.p-sheet').innerHTML = ''; p.querySelector('.p-foot').className = 'p-foot';
    const done = S.results.length, total = Math.max(S.queue.filter((x) => !INFO.has(x.t)).length, 1);
    p.querySelector('.p-prog').innerHTML = bar(Math.min(1, S.i / S.queue.length), 'bar-lg');
    p.querySelector('.p-count').textContent = `${Math.min(done + 1, total)} / ${total}`;
    const box = p.querySelector('.p-step');
    box.className = 'p-step step-' + S.step.t;
    // A fresh inner node per step, so event listeners never leak into later steps.
    box.innerHTML = `<div class="p-in">${(RENDER[S.step.t] || RENDER.unknown)(S.step)}</div>`;
    box.scrollTop = 0; p.querySelector('.p-body').scrollTop = 0;
    foot(S.state === 'info' ? { label: 'Continue', on: true } : { label: S.step.t === 'speak' ? 'Continue' : 'Check', on: false });
    (AFTER[S.step.t] || (() => {}))(S.step, box.firstElementChild);
    box.classList.remove('enter'); void box.offsetWidth; box.classList.add('enter');
  }
  function foot({ label, on, left }) {
    const p = $('#player');
    const b = p.querySelector('.p-go');
    b.textContent = label; b.disabled = !on;
    p.querySelector('.p-foot-left').innerHTML = left != null ? left : S.state === 'answer' && !S.quick ? `<button class="btn btn-ghost btn-sm" data-skip type="button">Skip</button>` : '';
    const sk = p.querySelector('[data-skip]');
    if (sk) sk.onclick = () => feedback({ ok: false, skipped: true, given: '—', expected: expectedOf(S.step) });
  }
  const ready = (on) => { if (S && S.state === 'answer') $('#player .p-go').disabled = !on; };
  function primary() {
    if (!S) return;
    const b = $('#player .p-go'); if (b.disabled) return;
    if (S.state === 'answer' && S.eval) { const r = S.eval(); if (r) feedback(r); return; }
    if (S.state === 'summary') { S.done = true; return close(); }
    if (S.after) { const f = S.after; S.after = null; return f(); }
    S.i++; next();
  }

  function expectedOf(st) {
    if (st.answer) return st.answer;
    if (st.item) return Course.gu(st.item);
    if (st.d) return st.d.t === 'fill' ? st.d.a : st.d.o[st.d.a];
    return '';
  }

  /* Record + show feedback */
  function record(st, res) {
    const scored = !res.skipped;
    S.results.push({ ok: res.ok, skill: res.skipped ? null : st.skill, t: st.t });
    if (scored && st.skill) Store.skillHit(st.skill, res.ok);
    const id = st.item && st.item.id;
    if (id && !S.noSrs && scored) Store.srsUpdate(id, res.ok, res.q == null ? 1 : res.q);
    if (res.ok && id) Store.fixMistakes(id);
    if (res.ok && st.mistakeRef && !st.mistakeRef.fixed) { Store.s.mistakes.filter((m) => m.expected === st.mistakeRef.expected && !m.fixed).forEach((m) => { m.fixed = true; Store.s.stats.fixed++; }); }
    if (!res.ok && !res.skipped && !S.placement) {
      Store.addMistake({ item: id, ex: st.t, skill: st.skill, prompt: res.prompt || (st.item ? st.item.en : ''), given: res.given, expected: res.expected || expectedOf(st), tag: res.tag || GU.diagnose(res.given, res.expected || expectedOf(st), st.d && st.d.tag), why: res.why || '' });
      if (!st.retry && !S.noRetry && !['read', 'talk', 'match', 'speak'].includes(st.t) && S.retries < 4) {
        const again = Object.assign({}, st, { retry: true });
        if (again.opts) again.opts = Engine.shuffle(again.opts);
        if (again.bank) again.bank = Engine.shuffle(again.bank);
        S.queue.push(again); S.retries++;
      }
    }
    Store.save();
  }
  function feedback(res) {
    const st = S.step;
    record(st, res);
    if (S.onAnswer) S.onAnswer(st, res, S);
    S.state = 'feedback';
    $$('.p-step .opt, .p-step .tile, .p-step input').forEach((x) => (x.disabled = true));
    if (S.quick) { S.i++; return next(); }
    const p = $('#player');
    const sheet = p.querySelector('.p-sheet');
    const exp = res.expected || expectedOf(st);
    if (res.ok) {
      const [g, e] = PRAISE[(Math.random() * PRAISE.length) | 0];
      Sfx.good();
      sheet.innerHTML = `<div class="fb fb-ok"><div class="fb-head"><span class="fb-badge">${icon('check')}</span><div><div class="fb-title" lang="gu">${g}</div><div class="fb-sub">${e}</div></div></div>
        ${res.note ? `<p class="fb-note">${esc(res.note)}</p>` : ''}
        ${st.item && st.t !== 'intro' ? `<div class="fb-line"><button class="say-btn sm" data-say="${esc(Course.gu(st.item))}" type="button" aria-label="Play">${icon('speaker')}</button><span lang="gu" class="gu-inline">${esc(Course.gu(st.item))}</span><span class="fb-en">${esc(st.item.en)}</span></div>` : ''}</div>`;
      p.querySelector('.p-foot').className = 'p-foot is-ok';
    } else {
      Sfx.bad();
      const tag = res.tag || GU.diagnose(res.given, exp, st.d && st.d.tag);
      const T = GU.TAGS[tag] || GU.TAGS.vocabulary;
      const why = res.why || (st.d && st.d.why) || T.why;
      sheet.innerHTML = `<div class="fb fb-bad"><div class="fb-head"><span class="fb-badge">${icon('x')}</span><div><div class="fb-title">${res.skipped ? 'Skipped' : 'Not quite'}</div><div class="fb-sub">${esc(T.label)}</div></div></div>
        <dl class="fb-grid">
          ${res.skipped ? '' : `<dt>You said</dt><dd lang="gu" class="given">${esc(res.given || '—')}</dd>`}
          <dt>Correct</dt><dd><button class="say-btn sm" data-say="${esc(st.item && /[=—]/.test(exp) ? Course.gu(st.item) : exp)}" type="button" aria-label="Play">${icon('speaker')}</button><span lang="gu" class="gu-inline">${esc(exp)}</span>${st.item && st.item.en && exp === Course.gu(st.item) ? `<span class="fb-en">${esc(st.item.en)}</span>` : ''}</dd>
          <dt>Why</dt><dd>${esc(why)}</dd>
          <dt>Remember</dt><dd>${esc(T.remember)}</dd>
        </dl>
        ${AI.ready() && !res.skipped ? `<button class="btn btn-ghost btn-sm ask-ai" type="button">${icon('spark')} Ask the tutor to explain</button><div class="ai-out"></div>` : ''}
        <p class="fb-foot">Added to <b>My mistakes</b> — you’ll see this again.</p></div>`;
      const ask = sheet.querySelector('.ask-ai');
      if (ask) ask.onclick = async () => {
        ask.disabled = true; const out = sheet.querySelector('.ai-out'); out.innerHTML = '<span class="spinner"></span> Thinking…';
        try { out.innerHTML = `<p>${esc(await AI.explain({ prompt: st.item ? st.item.en : '', given: res.given, expected: exp, tag: T.label }))}</p>`; }
        catch (e) { out.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
      };
      p.querySelector('.p-foot').className = 'p-foot is-bad';
    }
    foot({ label: 'Continue', on: true, left: '' });
    if (res.then) S.after = res.then;
  }

  /* ── finish ── */
  function finish() {
    const scored = S.results.filter((r) => r.skill);
    const ok = scored.filter((r) => r.ok).length;
    const acc = scored.length ? ok / scored.length : 1;
    const mins = Math.max(1, Math.round((Date.now() - S.t0) / 60000));
    let xp = 0;
    const extra = S.onFinish ? S.onFinish({ acc, ok, total: scored.length, spoken: S.spoken }) || {} : {};
    if (!S.placement) {
      xp = extra.xp != null ? extra.xp : Math.round((S.xpBase || 8) + acc * 5 + Math.min(S.spoken, 5));
      Store.addXP(xp);
      Store.s.stats.sessions++;
    }
    Store.save();
    const newAch = Store.checkAch();
    if (extra.skipSummary) { S.done = true; close(); return; }
    Sfx.done();
    const mistakes = S.results.filter((r) => !r.ok).length;
    const pct = Store.goalPct();
    const box = $('#player .p-step');
    box.className = 'p-step step-summary enter';
    $('#player .p-prog').innerHTML = bar(1, 'bar-lg');
    $('#player .p-count').textContent = '';
    $('#player .p-sheet').innerHTML = '';
    $('#player .p-foot').className = 'p-foot';
    box.innerHTML = `<div class="summary">
      <div class="sum-burst">${diya(1, 'diya-xl flicker')}</div>
      <h2 class="display" lang="gu">${acc >= 0.9 ? 'શાબાશ!' : acc >= 0.7 ? 'સરસ!' : 'ચાલો, આગળ!'}</h2>
      <p class="sum-sub">${esc(extra.title || S.title || 'Session complete')}</p>
      <div class="sum-stats">
        ${S.placement ? '' : `<div><b>+${xp}</b><span>XP</span></div>`}
        <div><b>${Math.round(acc * 100)}%</b><span>accuracy</span></div>
        <div><b>${S.spoken}</b><span>lines spoken</span></div>
        <div><b>${mins}</b><span>min</span></div>
      </div>
      ${extra.html || ''}
      ${S.lesson && S.lesson.can ? `<div class="sum-can">${icon('check')}<div><span>You can now</span><b>${esc(S.lesson.can)}</b></div></div>` : ''}
      ${!S.placement ? `<div class="sum-goal"><div class="row between"><span>Today’s goal</span><span>${Store.todayXP()} / ${Store.s.profile.goal} XP</span></div>${dots(pct, 12, 'dots-lg')}<div class="sum-streak">${diya(1)}<span><b>${Store.streakNow()}</b> day streak</span></div></div>` : ''}
      ${mistakes ? `<p class="sum-mist">${icon('refresh')} ${plural(mistakes, 'mistake')} saved to review — they’ll come back at the right time.</p>` : ''}
    </div>`;
    S.state = 'summary';
    foot({ label: extra.cta || 'Continue', on: true, left: '' });
    achToast(newAch);
  }

  /* ── renderers ── */
  const optBtn = (label, i, gu) => `<button class="opt ${gu ? 'opt-gu' : ''}" data-i="${i}" type="button"><kbd>${i + 1}</kbd><span ${gu ? 'lang="gu"' : ''}>${esc(label)}</span></button>`;
  const prompt = (txt) => `<h2 class="p-prompt">${txt}</h2>`;
  const tile = (w, i, where) => { const t = TOKTR[w]; const show = S && S.step && S.step.item && trMode(S.step.item) === 'show' && t; return `<button class="tile" data-i="${i}" data-where="${where}" type="button"><span lang="gu">${esc(w)}</span>${show ? `<small>${esc(t)}</small>` : ''}</button>`; };
  const playBig = (gu) => `<div class="play-row"><button class="play-big" data-say="${esc(gu)}" type="button" aria-label="Play audio">${icon('speaker')}</button><button class="play-slow" data-say="${esc(gu)}" data-slow="1" type="button" aria-label="Play slowly">${icon('slow')}<span>Slow</span></button></div>`;

  const RENDER = {
    unknown: () => '<p>…</p>',
    intro: (st) => {
      const it = st.item;
      return `<div class="intro-card">
        <span class="chip chip-new">${icon('spark')} New ${it.kind === 'w' ? 'word' : 'phrase'}</span>
        ${guBlock(Course.gu(it), Course.tr(it), { size: 'xl', trMode: 'show', item: it })}
        <div class="intro-meaning">${esc(it.en)}</div>
        ${it.say ? `<div class="intro-say"><span>Say it like</span><b>${esc(it.say)}</b></div>` : ''}
        ${it.note ? `<p class="intro-note">${esc(it.note)}</p>` : ''}
        ${GU.soundTips(Course.gu(it)).slice(0, 1).map((t) => `<p class="intro-tip">${icon('ear')} ${esc(t)}</p>`).join('')}
      </div>`;
    },
    grammar: (st) => {
      const g = st.g;
      const kinds = { grammar: 'Grammar', sound: 'Pronunciation', culture: 'Culture', register: 'Register' };
      const rows = g.table ? `<div class="g-table">${g.table.map((r) => `<div class="g-row"><span lang="gu" class="g-a">${esc(r[0])}</span><span class="g-b">${esc(r[1])}</span><span class="g-c">${esc(r[2])}</span>${r[3] ? `<span lang="gu" class="g-d">${esc(r[3])}</span>` : ''}</div>`).join('')}</div>` : '';
      const ex = g.examples ? `<ul class="g-ex">${g.examples.map((e) => `<li><button class="say-btn sm" data-say="${esc(e[0].replace(/\|/g, ''))}" type="button" aria-label="Play">${icon('speaker')}</button><div><span lang="gu" class="gu-inline">${esc(e[0])}</span><span class="tr">${esc(e[1])}</span><span class="en">${esc(e[2])}</span></div></li>`).join('')}</ul>` : '';
      return `<div class="g-card g-${g.kind}"><span class="chip">${kinds[g.kind] || 'Grammar'}</span><h2>${esc(g.title)}</h2><p class="g-body">${esc(g.body)}</p>${rows}${ex}${g.tip ? `<p class="g-tip">${icon('spark')} ${esc(g.tip)}</p>` : ''}</div>`;
    },
    mcq: (st) => {
      const it = st.item;
      if (st.mode === 'gu2en') return `${prompt(st.noTr ? 'Read it — what does it mean?' : 'What does this mean?')}${guBlock(Course.gu(it), Course.tr(it), { size: 'lg', noTr: st.noTr, item: it })}<div class="opts">${st.opts.map((o, i) => optBtn(o, i)).join('')}</div>`;
      return `${prompt('Which is the Gujarati for…')}<div class="en-prompt">${esc(it.en)}</div><div class="opts opts-gu">${st.opts.map((o, i) => optBtn(o, i, true)).join('')}</div>`;
    },
    listen: (st) => {
      const g = Course.gu(st.item);
      if (st.mode === 'pick') return `${prompt('Listen. What did you hear?')}${playBig(g)}<div class="opts">${st.opts.map((o, i) => optBtn(o, i)).join('')}</div>`;
      return `${prompt(st.swapped ? 'Speaking is paused — listen and build it instead' : 'Listen, then build what you hear')}${playBig(g)}<div class="answer-line" aria-label="Your answer"></div><div class="bank">${st.bank.map((w, i) => tile(w, i, 'bank')).join('')}</div>`;
    },
    build: (st) => `${prompt('Say this in Gujarati')}<div class="en-prompt">${esc(st.item.en)}</div><div class="answer-line" aria-label="Your answer"></div><div class="bank">${st.bank.map((w, i) => tile(w, i, 'bank')).join('')}</div>`,
    fill: (st) => `${prompt('Fill in the blank')}<div class="fill-sent" lang="gu">${st.toks.map((t, i) => (i === st.idx ? '<span class="blank">&nbsp;</span>' : esc(t))).join(' ')}</div><div class="en-sub">${esc(st.item.en)}</div><div class="opts opts-row">${st.opts.map((o, i) => optBtn(o, i, true)).join('')}</div>`,
    'drill-fill': (st) => `${prompt('Fill in the blank')}<div class="fill-sent" lang="gu">${esc(st.d.gu).replace('___', '<span class="blank">&nbsp;</span>')}</div>${trMode(null) === 'show' ? `<div class="tr center">${esc(st.d.tr)}</div>` : ''}<div class="en-sub">${esc(st.d.en)}</div><div class="opts opts-row">${st.d.o.map((o, i) => optBtn(o, i, true)).join('')}</div>`,
    'drill-pick': (st) => `${prompt(esc(st.d.q))}<div class="opts ${/[઀-૿]/.test(st.d.o[0]) ? 'opts-gu' : ''}">${st.d.o.map((o, i) => optBtn(o, i, /[઀-૿]/.test(o))).join('')}</div>`,
    match: (st) => {
      const left = Engine.shuffle(st.pairs), right = Engine.shuffle(st.pairs);
      st._l = left; st._r = right;
      return `${prompt('Tap the matching pairs')}<div class="match"><div class="m-col">${left.map((it, i) => `<button class="opt m-l" data-i="${i}" type="button"><span lang="gu">${esc(Course.gu(it))}</span></button>`).join('')}</div><div class="m-col">${right.map((it, i) => `<button class="opt m-r" data-i="${i}" type="button"><span>${esc(it.en)}</span></button>`).join('')}</div></div>`;
    },
    speak: (st) => {
      const it = st.item, g = Course.gu(it);
      const hintOpen = st.from === 'gu' || ['new', 'learning', 'review'].includes(Store.itemState(it.id));
      const head = st.from === 'gu'
        ? `${prompt('Read this out loud')}${guBlock(g, Course.tr(it), { size: 'lg', item: it, en: it.en })}`
        : `${prompt('Say this in Gujarati')}<div class="en-prompt">${esc(it.en)}</div>
           <details class="hint" ${hintOpen ? 'open' : ''}><summary>${hintOpen ? 'Gujarati' : 'Need a hint?'}</summary>${guBlock(g, Course.tr(it), { size: 'md', item: it })}</details>`;
      return `${head}
        <div class="speak-zone">
          <button class="mic" type="button" aria-label="Tap and speak">${icon('mic')}<span class="mic-ring"></span></button>
          <div class="mic-label">${Speech.canListen ? 'Tap, then say it' : Recorder.supported() ? 'Tap to record yourself' : 'Say it out loud, then rate yourself'}</div>
          <div class="heard" aria-live="polite"></div>
        </div>
        <div class="speak-result"></div>
        <p class="speak-honest">${Speech.canListen ? 'Checks which words were recognized — not your accent. A family member is still the best judge.' : 'Speech recognition isn’t available in this browser (Chrome supports it). Recording and comparing still trains your mouth and ear.'}
          <button class="linkish" data-quiet type="button">Can’t speak now</button></p>`;
    },
    type: (st) => {
      const it = st.item;
      return `${prompt('Write this in Gujarati')}<div class="en-prompt">${esc(it.en)}</div>
        <div class="type-modes" role="tablist"><button class="seg on" data-mode="ph" type="button">Phonetic</button><button class="seg" data-mode="kb" type="button">ગુજરાતી keys</button></div>
        <div class="type-box"><input class="type-in" id="type-in" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type how it sounds, e.g. kem chho" aria-label="Your answer"><div class="type-preview" lang="gu" aria-live="polite"></div></div>
        <p class="type-help">Phonetic: <b>aa ee oo</b> for long vowels · <b>M</b> for the nasal dot (huM → હું) · <b>T D N L</b> for curled-back sounds.</p>
        <div class="gkb" hidden></div>`;
    },
    read: (st) => {
      const r = st.read; st.qi = st.qi || 0;
      const q = r.qs[st.qi];
      return `<div class="read-card"><h3>${esc(r.title)}</h3>${r.lines.map((l) => `<div class="read-line"><button class="say-btn sm" data-say="${esc(l[0])}" type="button" aria-label="Play">${icon('speaker')}</button><div><p lang="gu" class="gu-inline">${esc(l[0])}</p>${Store.skill('reading').ema < 0.7 || Store.s.settings.translit === 'full' ? `<p class="tr">${esc(l[1])}</p>` : `<button class="tr tr-tap" data-reveal="${esc(l[1])}" type="button">${icon('eye')}<span>Pronunciation</span></button>`}<details><summary>English</summary><p class="en">${esc(l[2])}</p></details></div></div>`).join('')}</div>
        ${prompt(`${st.qi + 1}/${r.qs.length} · ${esc(q.q)}`)}<div class="opts">${q.o.map((o, i) => optBtn(o, i)).join('')}</div>`;
    },
    talk: (st) => {
      const k = st.talk;
      return `<div class="talk">
        <div class="talk-who">${avatar(k.who, 64)}<div><b>${esc(CHARACTERS[k.who].name)}</b><span>${esc(k.ctx)}</span></div></div>
        <div class="bubble npc"><button class="say-btn sm" data-say="${esc(R(k.gu))}" type="button" aria-label="Play">${icon('speaker')}</button><div><p lang="gu" class="gu-inline">${esc(R(k.gu))}</p>${trMode(null) !== 'none' ? `<p class="tr">${esc(R(k.tr))}</p>` : ''}<details><summary>English</summary><p class="en">${esc(k.en)}</p></details></div></div>
        ${prompt('Choose your reply')}
        <div class="opts opts-reply">${(st._o = st._o || Engine.shuffle(k.o)).map((o, i) => `<button class="opt opt-reply" data-i="${i}" type="button"><kbd>${i + 1}</kbd><span><span lang="gu" class="gu-inline">${esc(R(o[0]))}</span><small>${esc(R(o[1]))}</small></span></button>`).join('')}</div></div>`;
    },
    register: (st) => {
      const h = st.h;
      st._o = st._o || Engine.shuffle([['t', h.t], ['n', h.n], ['c', h.c]].filter((x, i, a) => a.findIndex((y) => R(y[1][0]) === R(x[1][0])) === i));
      return `${prompt('Which would family actually say at home?')}<div class="en-prompt">${esc(h.en)}</div><div class="opts opts-reply">${st._o.map(([k, v], i) => `<button class="opt opt-reply" data-i="${i}" type="button"><kbd>${i + 1}</kbd><span><span lang="gu" class="gu-inline">${esc(R(v[0]))}</span><small>${esc(R(v[1]))}</small></span></button>`).join('')}</div>`;
    },
    letter: (st) => {
      const [g, snd, wgu, wtr, wen] = st.l;
      return `<div class="letter-card"><span class="chip">${esc(st.unit.title)}</span><div class="glyph" lang="gu">${esc(g)}</div><div class="glyph-sound">${esc(snd)}</div>
        <div class="letter-ex"><button class="say-btn" data-say="${esc(wgu)}" type="button" aria-label="Play">${icon('speaker')}</button><div><span lang="gu" class="gu-inline">${esc(wgu)}</span><span class="tr">${esc(wtr)}</span><span class="en">${esc(wen)}</span></div></div></div>`;
    },
    glyph: (st) => {
      const [g, snd, wgu, wtr] = st.l;
      if (st.mode === 'sound2glyph') return `${prompt('Which letter makes this sound?')}<div class="en-prompt">${esc(snd)}</div><div class="opts opts-glyph">${st.opts.map((o, i) => optBtn(o, i, true)).join('')}</div>`;
      if (st.mode === 'glyph2sound') return `${prompt('What sound does this make?')}<div class="glyph glyph-md" lang="gu">${esc(g)}</div><div class="opts">${st.opts.map((o, i) => optBtn(o, i)).join('')}</div>`;
      return `${prompt('Read this word — what does it mean?')}${guBlock(wgu, wtr, { size: 'lg', trMode: Store.s.settings.translit === 'full' ? 'show' : 'tap' })}<div class="opts">${st.opts.map((o, i) => optBtn(o, i)).join('')}</div>`;
    },
    spell: (st) => `${prompt('Spell it with letters')}<div class="en-prompt">${esc(st.l[4])} <span class="tr">· ${esc(st.l[3])}</span></div>${playBig(st.l[2])}<div class="answer-line" aria-label="Your answer"></div><div class="bank">${st.bank.map((w, i) => `<button class="tile" data-i="${i}" data-where="bank" type="button"><span lang="gu">${esc(w)}</span></button>`).join('')}</div>`,
    place: (st) => `${prompt(esc(st.p.q || 'Choose'))}${st.p.type === 'listen' ? playBig(st.p.audio) : st.p.prompt && /[઀-૿]/.test(st.p.prompt) ? guBlock(st.p.prompt, st.p.tr || '', { size: 'lg', noTr: st.p.noTr || !st.p.tr, audio: true }) : `<div class="en-prompt">${esc(st.p.prompt)}</div>`}<div class="opts ${/[઀-૿]/.test(st.p.o[0]) ? 'opts-gu' : ''}">${st.p.o.map((o, i) => optBtn(o, i, /[઀-૿]/.test(o))).join('')}</div><button class="btn btn-ghost idk" type="button">I don’t know this yet</button>`,
    'place-speak': (st) => `${prompt('Say this out loud')}${guBlock('તમે કેમ છો?', 'tame kem chho?', { size: 'lg', en: 'How are you?' })}<div class="speak-zone"><button class="mic" type="button" aria-label="Tap and speak">${icon('mic')}<span class="mic-ring"></span></button><div class="mic-label">${Speech.canListen ? 'Tap, then say it' : 'Say it aloud, then rate yourself'}</div><div class="heard"></div></div><div class="speak-result"></div><button class="btn btn-ghost idk" type="button">Skip speaking for now</button>`,
  };

  /* ── behaviours after render ── */
  function bindOpts(box, onPick) {
    let sel = null;
    box.addEventListener('click', (e) => {
      const b = e.target.closest('.opt'); if (!b || b.disabled || S.state !== 'answer') return;
      $$('.opt', box).forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel'); sel = +b.dataset.i; Sfx.tap();
      onPick && onPick(sel, b);
      ready(true);
    });
    return () => sel;
  }
  function markOpts(box, correctIdx, pickedIdx) {
    $$('.opt', box).forEach((b) => { const i = +b.dataset.i; if (i === correctIdx) b.classList.add('right'); else if (i === pickedIdx) b.classList.add('wrong'); });
  }
  function bindTiles(box, bank, onChange) {
    const sel = [];
    const line = $('.answer-line', box), bk = $('.bank', box);
    const draw = () => {
      line.innerHTML = sel.map((i) => bank[i]).map((w, j) => tile(w, sel[j], 'line')).join('') || '<span class="line-hint">Tap the words below</span>';
      $$('.tile', bk).forEach((t) => t.classList.toggle('used', sel.includes(+t.dataset.i)));
      onChange && onChange(sel.length);
    };
    box.addEventListener('click', (e) => {
      const t = e.target.closest('.tile'); if (!t || S.state !== 'answer') return;
      const i = +t.dataset.i;
      if (t.dataset.where === 'bank') { if (!sel.includes(i)) { sel.push(i); Sfx.tap(); const g = bank[i]; if (TOKTR[g] !== undefined || GU.hasGu(g)) Speech.say(g); } }
      else sel.splice(sel.indexOf(i), 1);
      draw();
    });
    draw();
    return () => sel.map((i) => bank[i]).join(' ');
  }

  const AFTER = {
    intro: (st) => { setTimeout(() => Speech.say(Course.gu(st.item)), 250); },
    mcq(st, box) {
      if (st.mode === 'gu2en') setTimeout(() => Speech.say(Course.gu(st.item)), 250);
      const get = bindOpts(box, st.mode === 'en2gu' ? (i) => Speech.say(st.opts[i]) : null);
      S.eval = () => { const i = get(); const ok = st.opts[i] === st.answer; markOpts(box, st.opts.indexOf(st.answer), i);
        return { ok, given: st.opts[i], expected: st.mode === 'gu2en' ? `${Course.gu(st.item)} = ${st.answer}` : st.answer, tag: st.noTr ? 'reading' : 'vocabulary', why: ok ? '' : st.mode === 'gu2en' ? `${Course.gu(st.item)} (${Course.tr(st.item)}) means “${st.item.en}”.` : `“${st.item.en}” is ${Course.gu(st.item)} (${Course.tr(st.item)}).` }; };
    },
    listen(st, box) {
      setTimeout(() => Speech.say(Course.gu(st.item)), 300);
      if (st.mode === 'pick') {
        const get = bindOpts(box);
        S.eval = () => { const i = get(); const ok = st.opts[i] === st.answer; markOpts(box, st.opts.indexOf(st.answer), i);
          return { ok, given: st.opts[i], expected: `${Course.gu(st.item)} — ${st.answer}`, tag: 'listening', why: ok ? '' : `You heard ${Course.gu(st.item)} (${Course.tr(st.item)}).` }; };
      } else {
        const get = bindTiles(box, st.bank, (n) => ready(n > 0));
        S.eval = () => { const g = get(); const r = GU.check(g, [Course.gu(st.item), ...(st.item.alts || [])]); return { ok: r.ok, given: g, expected: Course.gu(st.item), tag: r.ok ? null : 'listening' }; };
      }
    },
    build(st, box) {
      const get = bindTiles(box, st.bank, (n) => ready(n > 0));
      S.eval = () => { const g = get(); const r = GU.check(g, [Course.gu(st.item), ...(st.item.alts || [])]); return { ok: r.ok, given: g, expected: Course.gu(st.item), prompt: st.item.en }; };
    },
    fill(st, box) {
      const get = bindOpts(box, (i) => { $('.blank', box).textContent = st.opts[i]; });
      S.eval = () => { const i = get(); const ok = st.opts[i] === st.answer; markOpts(box, st.opts.indexOf(st.answer), i);
        const given = st.toks.map((t, j) => (j === st.idx ? st.opts[i] : t)).join(' ');
        return { ok, given, expected: Course.gu(st.item) }; };
    },
    'drill-fill'(st, box) {
      const get = bindOpts(box, (i) => { $('.blank', box).textContent = st.d.o[i]; });
      S.eval = () => { const i = get(); const ok = st.d.o[i] === st.d.a; markOpts(box, st.d.o.indexOf(st.d.a), i);
        return { ok, given: st.d.gu.replace('___', st.d.o[i]), expected: st.d.gu.replace('___', st.d.a), tag: st.d.tag, why: st.d.why }; };
    },
    'drill-pick'(st, box) {
      const get = bindOpts(box, (i) => { if (/[઀-૿]/.test(st.d.o[i])) Speech.say(st.d.o[i]); });
      S.eval = () => { const i = get(); const ok = i === st.d.a; markOpts(box, st.d.a, i);
        return { ok, given: st.d.o[i], expected: st.d.o[st.d.a], tag: st.d.tag, why: st.d.why }; };
    },
    match(st, box) {
      let l = null, r = null, done = 0, miss = 0;
      box.addEventListener('click', (e) => {
        const b = e.target.closest('.opt'); if (!b || b.disabled) return;
        const side = b.classList.contains('m-l') ? 'l' : 'r';
        $$(side === 'l' ? '.m-l' : '.m-r', box).forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        if (side === 'l') { l = b; Speech.say(Course.gu(st._l[+b.dataset.i])); } else r = b;
        if (l && r) {
          const a = st._l[+l.dataset.i], c = st._r[+r.dataset.i];
          if (a === c) { [l, r].forEach((x) => { x.classList.remove('sel'); x.classList.add('right'); x.disabled = true; }); done++; Sfx.good(); Store.srsUpdate(a.id, true, 0.8); }
          else { miss++; const L = l, Rr = r; [L, Rr].forEach((x) => x.classList.add('shake', 'wrong')); Sfx.bad(); setTimeout(() => [L, Rr].forEach((x) => x.classList.remove('shake', 'wrong', 'sel')), 450); Store.addMistake({ item: a.id, ex: 'match', skill: 'vocab', prompt: 'Match', given: `${Course.gu(a)} = ${c.en}`, expected: `${Course.gu(a)} = ${a.en}`, tag: 'vocabulary' }); }
          l = r = null;
          if (done === st.pairs.length) { S.results.push({ ok: miss <= 1, skill: 'vocab' }); Store.skillHit('vocab', miss <= 1); S.state = 'feedback'; foot({ label: 'Continue', on: true, left: '' }); $('#player .p-foot').className = 'p-foot is-ok'; }
        }
      });
    },
    speak(st, box) { speakFlow(st, box, Course.gu(st.item), false); },
    'place-speak'(st, box) {
      $('.idk', box).onclick = () => feedback({ ok: false, skipped: true, given: '' });
      speakFlow(st, box, 'તમે કેમ છો?', true);
    },
    type(st, box) {
      const inp = $('.type-in', box), prev = $('.type-preview', box), kb = $('.gkb', box);
      let mode = 'ph';
      const val = () => (mode === 'ph' ? GU.phonetic(inp.value) : inp.value);
      const upd = () => { prev.textContent = mode === 'ph' && inp.value ? GU.phonetic(inp.value) : ''; ready(inp.value.trim().length > 0); };
      inp.addEventListener('input', upd);
      kb.innerHTML = [GU.KEYS.vowels, GU.KEYS.matras, ...GU.KEYS.cons].map((row, ri) => `<div class="gkb-row">${row.map((k) => `<button class="gk ${ri === 1 ? 'gk-m' : ''}" data-k="${k}" type="button" lang="gu">${ri === 1 ? '◌' + k : k}</button>`).join('')}</div>`).join('') + `<div class="gkb-row"><button class="gk gk-wide" data-k=" " type="button">space</button><button class="gk gk-wide" data-k="⌫" type="button" aria-label="Delete">⌫</button></div>`;
      kb.addEventListener('click', (e) => { const k = e.target.closest('.gk'); if (!k) return; const c = k.dataset.k; inp.value = c === '⌫' ? [...inp.value].slice(0, -1).join('') : inp.value + c; upd(); Sfx.tap(); });
      $$('.seg', box).forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.mode; $$('.seg', box).forEach((x) => x.classList.toggle('on', x === b));
        kb.hidden = mode !== 'kb'; inp.value = ''; inp.placeholder = mode === 'ph' ? 'Type how it sounds, e.g. kem chho' : 'Use the keys below (or a Gujarati keyboard)';
        inp.setAttribute('inputmode', mode === 'kb' ? 'none' : 'text'); upd(); inp.focus();
      }));
      setTimeout(() => inp.focus(), 100);
      S.eval = () => {
        const g = val(), ans = [Course.gu(st.item), ...(st.item.alts || [])];
        const r = GU.check(g, ans);
        if (r.ok) return { ok: true, given: g, q: r.exact ? 1 : 0.8, note: r.exact ? '' : `Small spelling fix: ${r.spelling}` };
        if (GU.checkLatin(inp.value, [Course.tr(st.item)])) return { ok: true, given: g, q: 0.6, note: 'The sounds are right! The script spelling was a little off — compare with the Gujarati below.' };
        return { ok: false, given: g || inp.value, expected: Course.gu(st.item), tag: GU.loose(g) && GU.sim(GU.loose(g), GU.loose(ans[0])) > 0.7 ? 'spelling' : null };
      };
    },
    read(st, box) {
      const q = st.read.qs[st.qi];
      const get = bindOpts(box);
      S.eval = () => {
        const i = get(); const ok = i === q.a; markOpts(box, q.a, i);
        const res = { ok, given: q.o[i], expected: q.o[q.a], tag: 'reading', why: 'Re-read the passage line by line — tap a line to hear it.' };
        if (st.qi < st.read.qs.length - 1) res.then = () => { st.qi++; next(); };
        return res;
      };
    },
    talk(st, box) {
      setTimeout(() => Speech.say(R(st.talk.gu)), 300);
      const get = bindOpts(box, (i) => Speech.say(R(st._o[i][0])));
      S.eval = () => {
        const i = get(); const o = st._o[i]; const ok = !!o[3];
        const firstOk = st._o.findIndex((x) => x[3]);
        markOpts(box, ok ? i : firstOk, i);
        const res = { ok, given: R(o[0]), expected: R(st._o[firstOk][0]), why: o[4], note: ok ? o[4] : '' };
        const target = ok ? o : st._o[firstOk];
        const spk = { t: 'speak', from: 'gu', skill: 'speaking', item: { id: null, gu: R(target[0]), tr: R(target[1]), en: target[2] } };
        S.queue.splice(S.i + 1, 0, spk);
        return res;
      };
    },
    register(st, box) {
      const get = bindOpts(box, (i) => Speech.say(R(st._o[i][1][0])));
      S.eval = () => {
        const i = get(); const k = st._o[i][0]; const ok = k !== 't';
        const h = st.h;
        Store.s.home[h.id] = (Store.s.home[h.id] || 0) + 1;
        $$('.opt', box).forEach((b) => { const kk = st._o[+b.dataset.i][0]; b.insertAdjacentHTML('beforeend', `<em class="reg reg-${kk}">${{ t: 'Textbook', n: 'Natural', c: 'Very casual' }[kk]}</em>`); b.classList.add(kk === 't' ? 'dim' : 'right'); });
        return { ok, given: R(st._o[i][1][0]), expected: R(h.n[0]), tag: 'vocabulary', why: `Textbook: ${R(h.t[0])} · Natural: ${R(h.n[0])} · Casual: ${R(h.c[0])}. ${h.note}`, note: `${k === 'c' ? 'Very casual — great with siblings and friends. ' : ''}${h.note}` };
      };
    },
    letter: (st) => setTimeout(() => Speech.say(st.l[2]), 250),
    glyph(st, box) {
      if (st.mode === 'word') setTimeout(() => Speech.say(st.l[2]), 250);
      const get = bindOpts(box);
      S.eval = () => { const i = get(); const ok = st.opts[i] === st.answer; markOpts(box, st.opts.indexOf(st.answer), i);
        return { ok, given: st.opts[i], expected: st.answer, tag: 'reading', why: `${st.l[0]} = ${st.l[1]}, as in ${st.l[2]} (${st.l[3]}, “${st.l[4]}”).` }; };
    },
    spell(st, box) {
      setTimeout(() => Speech.say(st.l[2]), 250);
      const get = bindTiles(box, st.bank, (n) => ready(n > 0));
      S.eval = () => { const g = get().replace(/ /g, ''); const ok = g === st.l[2]; return { ok, given: g, expected: st.l[2], tag: 'spelling' }; };
    },
    place(st, box) {
      if (st.p.type === 'listen') setTimeout(() => Speech.say(st.p.audio), 300);
      const get = bindOpts(box);
      $('.idk', box).onclick = () => feedback({ ok: false, given: '' });
      S.eval = () => { const i = get(); return { ok: i === st.p.a, given: st.p.o[i] }; };
    },
  };

  /* ── speaking flow (recognition → score, or record → self-rate) ── */
  function speakFlow(st, box, target, placement) {
    const mic = $('.mic', box), label = $('.mic-label', box), heard = $('.heard', box), out = $('.speak-result', box);
    const q = $('[data-quiet]', box);
    if (q) q.onclick = () => { Store.s.settings.quietUntil = Date.now() + 15 * 60000; Store.save(); toast('Speaking paused for 15 minutes — you’ll get listening practice instead.'); feedback({ ok: true, skipped: true, q: 0.5 }); };
    if (!placement && st.from === 'gu') setTimeout(() => Speech.say(target), 300);
    let best = null, busy = false, attempts = 0;
    const finishWith = (res) => {
      if (!S || S.step !== st || S.state !== 'answer') return;
      S.spoken++; Store.s.stats.spoken++;
      record(st, res);
      S.state = 'feedback';
      foot({ label: 'Continue', on: true, left: `<button class="btn btn-ghost btn-sm" data-again type="button">${icon('refresh')} Try again</button>` });
      $('#player .p-foot').className = 'p-foot ' + (res.ok ? 'is-ok' : 'is-bad');
      const ag = $('#player [data-again]');
      if (ag) ag.onclick = () => { S.state = 'answer'; S.results.pop(); out.innerHTML = ''; heard.textContent = ''; foot({ label: 'Check', on: false, left: '' }); $('#player .p-foot').className = 'p-foot'; };
    };
    const selfRate = (audioUrl) => {
      out.innerHTML = `<div class="self-rate"><div class="compare">
          <button class="btn btn-ghost btn-sm" data-say="${esc(target)}" type="button">${icon('speaker')} Model</button>
          ${audioUrl ? `<button class="btn btn-ghost btn-sm" data-mine type="button">${icon('play')} You</button>` : ''}</div>
        <p>How close were you?</p>
        <div class="row rate"><button class="btn btn-ok" data-r="1" type="button">Nailed it</button><button class="btn btn-mid" data-r="0.6" type="button">Close</button><button class="btn btn-bad" data-r="0" type="button">Not yet</button></div></div>`;
      if (audioUrl) { const a = new Audio(audioUrl); out.querySelector('[data-mine]').onclick = () => a.play(); }
      out.querySelector('.rate').onclick = (e) => {
        const b = e.target.closest('[data-r]'); if (!b) return;
        const r = +b.dataset.r;
        finishWith({ ok: r > 0, q: r || 0, given: '(self-rated)', expected: target, tag: 'pronunciation', why: 'You rated this one “not yet”. Listen to the model slowly, then shadow it.' });
      };
    };
    mic.addEventListener('click', async () => {
      if (busy || S.state !== 'answer') return;
      busy = true; attempts++;
      if (Speech.canListen) {
        mic.classList.add('live'); label.textContent = 'Listening… speak now'; heard.textContent = '';
        const r = await Speech.listen({ onInterim: (t) => (heard.textContent = t) });
        mic.classList.remove('live'); busy = false;
        if (!S || S.step !== st) return;
        if (r.error) {
          const msg = { 'not-allowed': 'Microphone access was blocked. Allow the mic in your browser, or rate yourself below.', 'no-speech': 'Didn’t hear anything — tap and try again.', network: 'Speech recognition needs an internet connection. Rate yourself below instead.', 'language-not-supported': 'This browser can’t recognize Gujarati. Rate yourself below instead.' }[r.error] || 'Recognition didn’t work this time. Rate yourself below instead.';
          label.textContent = msg;
          if (r.error !== 'no-speech') selfRate(null);
          return;
        }
        const sc = GU.scoreSpeech(target, r.alts);
        best = !best || sc.score > best.score ? sc : best;
        const lvl = sc.score >= 75 ? 'ok' : sc.score >= 45 ? 'mid' : 'bad';
        const missed = sc.words.filter((w) => w.st !== 'ok');
        const tips = [...new Set(missed.flatMap((w) => GU.soundTips(w.w)))].slice(0, 2);
        label.textContent = lvl === 'ok' ? 'Clearly understood!' : lvl === 'mid' ? 'Close — some words weren’t caught' : 'The recognizer didn’t catch most of it';
        out.innerHTML = `<div class="sp-res sp-${lvl}">
          <div class="sp-score"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15.5" class="trk"/><circle cx="18" cy="18" r="15.5" class="val" style="stroke-dasharray:${sc.score * 0.974} 100"/></svg><b>${sc.score}</b></div>
          <div class="sp-body"><div class="sp-words" lang="gu">${sc.words.map((w) => `<span class="w-${w.st}">${esc(w.w)}</span>`).join(' ')}</div>
          <p class="sp-heard">Heard: <span lang="gu">${esc(sc.heard || '…')}</span>${sc.latin ? ' <em>(heard as English — try again a bit slower)</em>' : ''}</p>
          ${tips.map((t) => `<p class="sp-tip">${icon('ear')} ${esc(t)}</p>`).join('')}</div></div>`;
        if (placement) { S.placeSpeak = sc.score; }
        finishWith({ ok: sc.score >= 45, q: sc.score >= 75 ? 1 : 0.6, given: sc.heard, expected: target, tag: 'pronunciation', why: missed.length ? `Words not caught: ${missed.map((w) => w.w).join(', ')}.` : '' });
      } else if (Recorder.supported()) {
        if (!mic.classList.contains('live')) {
          try { await Recorder.start(); mic.classList.add('live'); label.textContent = 'Recording… tap again to stop'; busy = false; }
          catch (e) { busy = false; label.textContent = 'Microphone not available. Say it out loud, then rate yourself.'; selfRate(null); }
        } else {
          const url = await Recorder.stop(); mic.classList.remove('live'); busy = false;
          label.textContent = 'Compare your recording with the model'; selfRate(url);
        }
      } else { busy = false; selfRate(null); }
    });
  }

  return { start, close, get S() { return S; } };
})();
